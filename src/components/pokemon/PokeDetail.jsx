import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useBackClose } from '../../lib/backClose'
import { backdropClose } from '../../lib/backdrop'
import { artUrl, dexNumber, genOf, getPokemon, playCry, STATS, translatePokemon } from '../../services/pokeapi'
import { savePet, saveTeam, TEAM_MAX } from '../../services/pokemon'
import Avatar from '../Avatar'
import { ErrorBox, Spinner } from '../Feedback'
import { PokeTypes } from './PokeBits'

const fmt = (n, unit) => `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${unit}`

/** Janela com os detalhes de um Pokémon + botões de time e bichinho. */
export default function PokeDetail({ id, name, caughtBy = [], people = [], onClose }) {
  const { user, profile, refreshProfile } = useAuth()
  const [data, setData] = useState(null)
  const [pt, setPt] = useState(undefined) // undefined = traduzindo; null = sem tradução
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  useBackClose(onClose)

  useEffect(() => {
    let alive = true
    setData(null)
    setPt(undefined)
    setError(null)
    getPokemon(id)
      .then((d) => {
        if (!alive) return
        setData(d)
        translatePokemon(d).then((t) => alive && setPt(t))
      })
      .catch((err) => alive && setError(err))
    return () => {
      alive = false
    }
  }, [id])

  useEffect(() => {
    const handleKey = (event) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const team = profile?.poke_team ?? []
  const inTeam = team.includes(id)
  const isPet = profile?.poke_pet === id
  const gen = genOf(id)
  const title = data?.name ?? name ?? dexNumber(id)
  const whoNames = caughtBy.map((uid) => people.find((p) => p.id === uid)).filter(Boolean)

  async function run(fn, ok) {
    setBusy(true)
    setMsg(null)
    try {
      await fn()
      await refreshProfile?.()
      setMsg({ text: ok, good: true })
    } catch (err) {
      setMsg({ text: err.message ?? 'Deu errado.', good: false })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" {...backdropClose(onClose)}>
      <article className="card modal modal-wide" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <header className="member-head" style={{ alignItems: 'center' }}>
          <div className="member-title">
            <span className="pk-num">{dexNumber(id)}{gen ? ` · ${gen.name}` : ''}</span>
            <h2 style={{ margin: '0.2rem 0' }}>{title}</h2>
            {(pt?.genus || data?.genus) && <p className="muted" style={{ margin: 0 }}>{pt?.genus || data.genus}</p>}
          </div>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Fechar</button>
        </header>

        {error && <ErrorBox error={error} />}
        {!data && !error && <Spinner label="Abrindo a Pokédex..." />}
        {data && (
          <>
            <div className="pk-detail-top">
              <div className="pk-art">
                <img src={artUrl(id)} alt={`Arte de ${data.name}`} />
                <button type="button" className="btn btn-ghost pk-cry" onClick={() => playCry(id)} aria-label={`Ouvir o grito de ${data.name}`}>🔊</button>
              </div>
              <div>
                <PokeTypes types={data.types} />
                {(data.legendary || data.mythical) && (
                  <p className="chip" style={{ marginTop: '0.5rem', borderColor: 'var(--star)', color: 'var(--star)' }}>{data.mythical ? 'Mítico' : 'Lendário'}</p>
                )}
                {data.flavor && (
                  <p className="pk-flavor">
                    {pt?.flavor || data.flavor}
                    {data.flavorLang !== 'pt-br' && data.flavorLang !== 'pt' && (
                      <small className="muted">
                        {' '}
                        {pt === undefined ? '(traduzindo...)' : pt?.flavor ? '(tradução automática)' : '(sem tradução agora)'}
                      </small>
                    )}
                  </p>
                )}
                <dl className="pk-facts">
                  <div><dt>Altura</dt><dd>{fmt(data.height, 'm')}</dd></div>
                  <div><dt>Peso</dt><dd>{fmt(data.weight, 'kg')}</dd></div>
                  <div><dt>Total de status</dt><dd>{data.stats.reduce((s, x) => s + x.value, 0)}</dd></div>
                </dl>
              </div>
            </div>

            <section className="modal-section">
              <h3>Status base</h3>
              <div className="pk-stats">
                {data.stats.map((s) => (
                  <div key={s.key} className="pk-stat">
                    <span>{STATS[s.key] ?? s.key}</span>
                    <b>{s.value}</b>
                    <span className="pk-bar" aria-hidden="true"><i style={{ width: `${Math.min(100, (s.value / 200) * 100)}%` }} /></span>
                  </div>
                ))}
              </div>
            </section>

            <section className="modal-section">
              <h3>Quem da turma já pegou</h3>
              {whoNames.length === 0 ? (
                <p className="muted">Ninguém ainda. Acerte ele no “Quem é esse Pokémon?” para pegar!</p>
              ) : (
                <div className="pk-people">
                  {whoNames.map((p) => (
                    <span key={p.id} className="person-link" style={{ cursor: 'default' }}>
                      <Avatar name={p.display_name} src={p.avatar_url} size={24} />
                      {p.id === user?.id ? 'Você' : p.display_name}
                    </span>
                  ))}
                </div>
              )}
            </section>

            <section className="modal-section">
              <h3>Seu time</h3>
              <div className="pk-actions">
                {inTeam ? (
                  <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => run(() => saveTeam(user.id, team.filter((x) => x !== id)), `${data.name} saiu do seu time.`)}>
                    Tirar do time
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={busy || team.length >= TEAM_MAX}
                    onClick={() => run(() => saveTeam(user.id, [...team, id]), `${data.name} entrou no seu time!`)}
                  >
                    {team.length >= TEAM_MAX ? `Time cheio (${TEAM_MAX})` : `Pôr no meu time (${team.length}/${TEAM_MAX})`}
                  </button>
                )}
                {inTeam && team[0] !== id && (
                  <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => run(() => saveTeam(user.id, [id, ...team.filter((x) => x !== id)]), `${data.name} agora é o seu favorito.`)}>
                    ★ Favorito
                  </button>
                )}
                {isPet ? (
                  <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => run(() => savePet(user.id, null), 'Ele não te segue mais na Turma.')}>
                    Parar de me seguir na Turma
                  </button>
                ) : (
                  <button type="button" className="btn btn-primary" disabled={busy} onClick={() => run(() => savePet(user.id, id), `${data.name} vai te seguir na Turma!`)}>
                    Me seguir na Turma
                  </button>
                )}
              </div>
              {msg && <p role="status" style={{ marginTop: '0.5rem', color: msg.good ? 'var(--primary)' : 'var(--danger)', fontWeight: 700 }}>{msg.text}</p>}
            </section>
          </>
        )}
      </article>
    </div>
  )
}
