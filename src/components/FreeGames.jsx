import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { KEYS } from '../lib/dataCache'
import { FREE_HINT, listFreeGames, refreshFreeGamesOnce, setClaimed } from '../services/freeGames'
import { listProfiles } from '../services/profiles'
import Avatar from './Avatar'
import Icon from './Icon'
import { EmptyState, ErrorBox, Spinner } from './Feedback'
import '../styles/freeGames.css'

const KINDS = [
  { id: 'game', label: 'Jogos' },
  { id: 'extra', label: 'DLCs e itens' },
  { id: 'all', label: 'Tudo' },
]
// lojas agrupadas nos filtros
const GROUPS = [
  { id: 'Epic', stores: ['Epic'] },
  { id: 'Steam', stores: ['Steam'] },
  { id: 'GOG', stores: ['GOG'] },
  { id: 'Prime Gaming', stores: ['Prime Gaming'] },
  { id: 'itch.io', stores: ['itch.io'] },
  { id: 'Ubisoft / EA', stores: ['Ubisoft', 'EA', 'Battle.net'] },
  { id: 'Consoles', stores: ['PlayStation', 'Xbox', 'Switch'] },
  { id: 'Celular', stores: ['Android', 'iOS'] },
  { id: 'IndieGala / Humble', stores: ['IndieGala', 'Humble', 'Fanatical'] },
  { id: 'Outros', stores: ['PC', 'DRM-free'] },
]
const STORE_COLORS = {
  Epic: '#2a2a2a',
  Steam: '#1b2838',
  GOG: '#86328a',
  'Prime Gaming': '#0f79af',
  'itch.io': '#fa5c5c',
  PlayStation: '#0070d1',
  Xbox: '#107c10',
  Switch: '#e60012',
  IndieGala: '#c0392b',
  Humble: '#cb272c',
}

function timeLeft(iso, upcoming) {
  if (!iso) return upcoming ? null : 'Sem data para acabar'
  const ms = Date.parse(iso) - Date.now()
  if (ms <= 0) return 'Acabou'
  const h = Math.floor(ms / 3600000)
  if (h < 1) return `Acaba em ${Math.max(1, Math.floor(ms / 60000))} min`
  if (h < 48) return `Acaba em ${h}h`
  return `Acaba em ${Math.floor(h / 24)} dias`
}
const fmtDay = (iso) =>
  new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

function FreeCard({ game, who, people, mine, busy, onToggle }) {
  const left = timeLeft(game.ends_at, game.upcoming)
  const soon = game.ends_at && Date.parse(game.ends_at) - Date.now() < 24 * 3600000
  const faces = who.map((id) => people.find((p) => p.id === id)).filter(Boolean)
  return (
    <article className={`fg-card ${game.upcoming ? 'is-upcoming' : ''}`}>
      <div className="fg-cover">
        {game.image ? <img src={game.image} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <span aria-hidden="true">🎁</span>}
        <span className="fg-stores">
          {game.stores.map((s) => (
            <span key={s} className="fg-store" style={{ background: STORE_COLORS[s] ?? '#3b4252' }}>{s}</span>
          ))}
        </span>
        {game.kind !== 'game' && <span className="fg-kind">{game.kind === 'dlc' ? 'DLC' : game.kind === 'beta' ? 'Beta' : 'Itens'}</span>}
      </div>
      <div className="fg-body">
        <h3 className="fg-title">{game.title}</h3>
        <p className="fg-meta">
          {game.upcoming ? (
            <span className="fg-when">Grátis a partir de {fmtDay(game.starts_at)}</span>
          ) : (
            left && (
              <span className={`fg-when ${soon ? 'is-soon' : ''}`}>
                <Icon name="clock" />
                {left}
              </span>
            )
          )}
          {game.worth && <s className="muted">{game.worth}</s>}
        </p>
        {game.description && <p className="fg-desc">{game.description}</p>}
        <div className="fg-actions">
          {game.upcoming ? (
            <a className="btn btn-ghost" href={game.url} target="_blank" rel="noopener noreferrer">Ver na loja ↗</a>
          ) : (
            <a className="btn btn-primary" href={game.url} target="_blank" rel="noopener noreferrer">Resgatar ↗</a>
          )}
          {!game.upcoming && (
            <button type="button" className={`btn ${mine ? 'fg-claimed' : 'btn-ghost'}`} aria-pressed={mine} disabled={busy} onClick={onToggle}>
              {mine ? '✓ Já peguei' : 'Já peguei'}
            </button>
          )}
        </div>
        {faces.length > 0 && (
          <div className="fg-who" title={faces.map((p) => p.display_name).join(', ')}>
            <span className="fg-faces">
              {faces.slice(0, 6).map((p) => <Avatar key={p.id} name={p.display_name} src={p.avatar_url} size={22} />)}
            </span>
            <small className="muted">{faces.length === 1 ? `${faces[0].display_name} pegou` : `${faces.length} da turma pegaram`}</small>
          </div>
        )}
      </div>
    </article>
  )
}

/** Aba "Jogos grátis": promoções de Epic, Steam, GOG, Prime Gaming, itch.io, consoles e celular. */
export default function FreeGames() {
  const { user } = useAuth()
  const { data: people } = useAsyncData(listProfiles, KEYS.profiles)
  const [data, setData] = useState(undefined) // undefined = carregando, null = sem migração
  const [error, setError] = useState(null)
  const [updating, setUpdating] = useState(false)
  const [kind, setKind] = useState('game')
  const [group, setGroup] = useState('')
  const [onlyMissing, setOnlyMissing] = useState(false)
  const [busy, setBusy] = useState(null)

  const load = useCallback(async () => {
    try {
      setError(null)
      setData(await listFreeGames())
    } catch (err) {
      setError(err)
    }
  }, [])

  useEffect(() => {
    let alive = true
    load().then(async () => {
      setUpdating(true)
      const result = await refreshFreeGamesOnce()
      if (!alive) return
      setUpdating(false)
      if (result?.refreshed) load()
    })
    return () => {
      alive = false
    }
  }, [load])

  async function toggle(game) {
    const mine = (data.claimed.get(game.key) ?? []).includes(user.id)
    setBusy(game.key)
    try {
      await setClaimed(user.id, game.key, !mine)
      await load()
    } catch (err) {
      setError(err)
    } finally {
      setBusy(null)
    }
  }

  const visible = useMemo(() => {
    if (!data) return []
    const stores = GROUPS.find((g) => g.id === group)?.stores
    return data.games.filter((g) => {
      if (kind === 'game' && g.kind !== 'game') return false
      if (kind === 'extra' && g.kind === 'game') return false
      if (stores && !g.stores.some((s) => stores.includes(s))) return false
      if (onlyMissing && (data.claimed.get(g.key) ?? []).includes(user?.id)) return false
      return true
    })
  }, [data, kind, group, onlyMissing, user?.id])

  const groupsHere = useMemo(() => GROUPS.filter((g) => data?.games.some((x) => x.stores.some((s) => g.stores.includes(s)))), [data])
  const now = visible.filter((g) => !g.upcoming)
  const upcoming = visible.filter((g) => g.upcoming)

  if (data === undefined && !error) return <Spinner label="Procurando jogos grátis..." />
  if (data === null) return <p className="card muted">{FREE_HINT}</p>

  return (
    <div className="stack">
      {error && <ErrorBox error={error} onRetry={load} />}
      <div className="fg-tools">
        <div className="filter-chips" role="group" aria-label="Tipo">
          {KINDS.map((k) => (
            <button key={k.id} type="button" aria-pressed={kind === k.id} className={`filter-chip${kind === k.id ? ' is-on' : ''}`} onClick={() => setKind(k.id)}>
              {k.label}
            </button>
          ))}
        </div>
        {groupsHere.length > 1 && (
          <>
            <span className="fg-divider" aria-hidden="true" />
            <div className="filter-chips" role="group" aria-label="Loja">
              <button type="button" aria-pressed={!group} className={`filter-chip${!group ? ' is-on' : ''}`} onClick={() => setGroup('')}>
                Todas as lojas
              </button>
              {groupsHere.map((g) => (
                <button key={g.id} type="button" aria-pressed={group === g.id} className={`filter-chip${group === g.id ? ' is-on' : ''}`} onClick={() => setGroup(g.id)}>
                  {g.id}
                </button>
              ))}
            </div>
          </>
        )}
        <label className="fg-check">
          <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} />
          Só os que eu não peguei
        </label>
      </div>
      <p className="muted fg-status" aria-live="polite">
        {updating
          ? 'Conferindo as lojas…'
          : data?.refreshedAt
            ? `Atualizado ${new Date(data.refreshedAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} · dados do GamerPower e da Epic Games Store`
            : ''}
      </p>

      {data && data.games.length === 0 && !updating && (
        <EmptyState icon="🎁" title="Nenhum jogo grátis agora">Assim que aparecer um, ele surge aqui e a turma recebe um aviso.</EmptyState>
      )}
      {data && data.games.length > 0 && now.length === 0 && upcoming.length === 0 && <p className="muted">Nada com esses filtros.</p>}

      {now.length > 0 && (
        <section className="stack" aria-labelledby="fg-now">
          <h2 id="fg-now" className="sr-only">Grátis agora ({now.length})</h2>
          <div className="fg-grid">
            {now.map((g) => (
              <FreeCard key={g.key} game={g} who={data.claimed.get(g.key) ?? []} people={people ?? []} mine={(data.claimed.get(g.key) ?? []).includes(user?.id)} busy={busy === g.key} onToggle={() => toggle(g)} />
            ))}
          </div>
        </section>
      )}
      {upcoming.length > 0 && (
        <section className="stack" aria-labelledby="fg-next">
          <h2 id="fg-next" className="fg-h">Em breve <small className="muted">({upcoming.length})</small></h2>
          <div className="fg-grid">
            {upcoming.map((g) => (
              <FreeCard key={g.key} game={g} who={[]} people={[]} mine={false} busy={false} onToggle={() => {}} />
            ))}
          </div>
        </section>
      )}

      <p className="muted" style={{ fontSize: '0.8rem' }}>
        Dados: <a href="https://www.gamerpower.com" target="_blank" rel="noopener noreferrer">GamerPower</a> e Epic Games Store. Confira sempre na loja antes de resgatar; algumas promoções pedem conta ou assinatura (como o Prime Gaming).
      </p>
    </div>
  )
}
