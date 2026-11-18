import { useEffect, useState } from 'react'
import { ATTRS, classOf, derived, fmtMod, proficiency } from '../../lib/rpg/data'
import RpgIcon from './RpgIcon'

export const roundState = (round, characters, actions) => {
  if (!round) return 'none'
  if (round.status === 'resolvida') return 'resolved'
  const alive = characters.filter((c) => c.status !== 'morto')
  const everyone = alive.length > 0 && alive.every((c) => actions.some((a) => a.character_id === c.id))
  if (everyone || Date.now() >= new Date(round.closes_at).getTime()) return 'closed'
  return 'open'
}

export function timeLeft(iso) {
  const ms = new Date(iso).getTime() - Date.now()
  if (ms <= 0) return 'prazo encerrado'
  const h = Math.floor(ms / 3600000)
  const d = Math.floor(h / 24)
  if (d >= 1) return `fecha em ${d} ${d === 1 ? 'dia' : 'dias'} e ${h % 24} h`
  if (h >= 1) return `fecha em ${h} h`
  return `fecha em ${Math.max(1, Math.round(ms / 60000))} min`
}

const SIDES = [4, 6, 8, 10, 12, 20, 100]

/** Mesa do jogador: a cena da rodada, a ação dele, a bandeja de dados e as últimas rolagens. */
export default function RoundPanel({ round, previous, characters, actions, rolls, myChar, members, onSaveAction, onRoll }) {
  const mine = myChar && round ? actions.find((a) => a.character_id === myChar.id) : null
  const [form, setForm] = useState({ action: '', move: '', planB: '', reaction: '' })
  const [editing, setEditing] = useState(!mine)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState({ text: '', bad: false })
  const [dice, setDice] = useState({ sides: 20, count: 1, attr: myChar ? classOf(myChar.class)?.attr ?? 'for' : 'none', prof: true, label: '' })
  const [last, setLast] = useState(null)

  useEffect(() => {
    setForm({ action: mine?.action ?? '', move: mine?.move ?? '', planB: mine?.plan_b ?? '', reaction: mine?.reaction ?? '' })
    setEditing(!mine)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round?.id, mine?.updated_at])

  const state = roundState(round, characters, actions)
  const canAct = myChar && myChar.status !== 'morto' && round && round.status === 'aberta' && Date.now() < new Date(round.closes_at).getTime()
  const nameOf = (userId) => members.find((m) => m.user_id === userId)?.profile?.display_name
  const charName = (id) => characters.find((c) => c.id === id)?.name ?? '—'

  async function send(event) {
    event.preventDefault()
    if (!form.action.trim()) return setMsg({ text: 'Escreva o que o seu personagem faz.', bad: true })
    setBusy(true)
    try {
      await onSaveAction(form)
      setMsg({ text: 'Ação enviada.', bad: false })
      setEditing(false)
    } catch (err) {
      setMsg({ text: err.message ?? 'Não deu para enviar.', bad: true })
    } finally {
      setBusy(false)
    }
  }

  const attrMod = dice.attr === 'none' || !myChar ? 0 : myChar.attrs?.[dice.attr] ?? 0
  const modifier = attrMod + (dice.prof && myChar && dice.sides === 20 ? proficiency(myChar.level) : 0)
  const attackInfo = myChar ? derived(myChar) : null

  async function doRoll(preset) {
    setBusy(true)
    try {
      const r = await onRoll(preset ?? { sides: dice.sides, count: dice.count, modifier, label: dice.label || (dice.attr !== 'none' && dice.sides === 20 ? `Teste de ${ATTRS.find((a) => a.id === dice.attr)?.name}` : '') })
      setLast(r)
    } catch (err) {
      setMsg({ text: err.message ?? 'Não deu para rolar.', bad: true })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rpg-cols">
      <div className="rpg-col-main">
        <section className="rpg-panel" aria-labelledby="scene-title">
          <div className="rpg-split">
            <h2 id="scene-title">{round ? `Rodada ${round.number} · ${round.kind === 'combate' ? 'Combate' : 'Exploração'}` : 'A aventura vai começar'}</h2>
            {round && (
              <span className="rpg-ink-soft" style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 14 }}>
                {state === 'open' ? timeLeft(round.closes_at) : state === 'closed' ? 'Fechada · o mestre está resolvendo' : 'Resolvida'}
              </span>
            )}
          </div>
          {previous?.resolution && (
            <div style={{ borderLeft: '3px solid #a8823f', paddingLeft: 12 }}>
              <span className="rpg-ink-soft" style={{ fontFamily: 'var(--display)', fontSize: 13, fontWeight: 700 }}>Na rodada anterior</span>
              <p className="rpg-italic" style={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>{previous.resolution}</p>
            </div>
          )}
          {round ? (
            <p style={{ whiteSpace: 'pre-line', lineHeight: 1.7, fontSize: 17 }}>{round.scene}</p>
          ) : (
            <p className="rpg-italic rpg-ink-soft">O mestre ainda não abriu a primeira rodada.</p>
          )}
          {round?.resolution && (
            <p className="rpg-italic" style={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>{round.resolution}</p>
          )}
          {round && (
            <div className="rpg-row" style={{ gap: 8 }}>
              {characters.filter((c) => c.status !== 'morto').map((c) => {
                const did = actions.some((a) => a.character_id === c.id)
                return (
                  <span key={c.id} className="rpg-chip" style={{ background: did ? 'rgba(47,107,42,.15)' : 'transparent', color: 'var(--ink)' }}>
                    {c.name} · {did ? 'jogou' : 'falta'}
                  </span>
                )
              })}
            </div>
          )}
        </section>

        {myChar && round && round.status === 'aberta' && (
          <section className="rpg-panel-dark" aria-labelledby="turn-title">
            <div className="rpg-split">
              <h2 id="turn-title">Sua vez · {myChar.name}</h2>
              <span className="rpg-soft" style={{ fontSize: 14 }}>
                Vida {myChar.hp}/{myChar.hp_max} · Esforço {myChar.effort}/{myChar.effort_max}
              </span>
            </div>
            {!canAct && <p className="rpg-soft rpg-italic">{myChar.status === 'morto' ? 'Seu personagem morreu. Fale com o mestre.' : 'O prazo acabou. O mestre vai resolver a rodada.'}</p>}
            {canAct && editing && (
              <form onSubmit={send} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <label className="rpg-field">
                  O que você faz?
                  <textarea className="rpg-input" rows={3} maxLength={2000} value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value })} placeholder="Ex.: Entro em Fúria e ataco o goblin mais perto." />
                </label>
                <div className="rpg-row" style={{ alignItems: 'stretch' }}>
                  <label className="rpg-field" style={{ flex: '1 1 200px' }}>
                    Movimento
                    <input className="rpg-input" value={form.move} maxLength={200} onChange={(e) => setForm({ ...form, move: e.target.value })} placeholder="Para onde vai" />
                  </label>
                  <label className="rpg-field" style={{ flex: '1 1 200px' }}>
                    Plano B
                    <input className="rpg-input" value={form.planB} maxLength={300} onChange={(e) => setForm({ ...form, planB: e.target.value })} placeholder="Se o alvo já tiver caído..." />
                  </label>
                  {round.kind === 'combate' && (
                    <label className="rpg-field" style={{ flex: '1 1 200px' }}>
                      Reação (opcional)
                      <input className="rpg-input" value={form.reaction} maxLength={300} onChange={(e) => setForm({ ...form, reaction: e.target.value })} placeholder="Se atacarem a maga, entro na frente" />
                    </label>
                  )}
                </div>
                <div className="rpg-row" style={{ justifyContent: 'flex-end' }}>
                  {mine && <button type="button" className="rpg-btn-ghost" onClick={() => setEditing(false)}>Cancelar</button>}
                  <button type="submit" className="rpg-btn" disabled={busy}>{mine ? 'Salvar ação' : 'Enviar ação'}</button>
                </div>
              </form>
            )}
            {canAct && !editing && mine && (
              <div className="rpg-split">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                  <b style={{ fontFamily: 'var(--display)', color: '#b6e39a' }}>Ação enviada</b>
                  <span className="rpg-italic">{mine.action}</span>
                  {mine.plan_b && <span className="rpg-soft" style={{ fontSize: 14 }}>Plano B: {mine.plan_b}</span>}
                </div>
                <button type="button" className="rpg-btn-ghost" onClick={() => setEditing(true)}>Editar até fechar</button>
              </div>
            )}
            <p className={`rpg-msg ${msg.bad ? 'is-bad' : 'is-good'}`}>{msg.text}</p>
          </section>
        )}
      </div>

      <div className="rpg-col-side">
        {myChar && (
          <section className="rpg-panel-stone" aria-labelledby="dice-title">
            <h2 id="dice-title" className="rpg-row" style={{ gap: 8 }}><RpgIcon name="dice-twenty-faces-twenty" />Dados</h2>
            <p className="rpg-soft" style={{ fontSize: 14 }}>O dado é sorteado no servidor e todo mundo vê o resultado.</p>
            {attackInfo && (
              <button type="button" className="rpg-btn" disabled={busy} onClick={() => doRoll({ sides: 20, count: 1, modifier: attackInfo.attack, label: 'Ataque' })}>
                Rolar ataque ({fmtMod(attackInfo.attack)})
              </button>
            )}
            <div className="rpg-dice" role="radiogroup" aria-label="Dado">
              {SIDES.map((s) => (
                <button key={s} type="button" role="radio" aria-checked={dice.sides === s} className={dice.sides === s ? 'rpg-btn-gold' : 'rpg-btn-dark'} onClick={() => setDice({ ...dice, sides: s })}>
                  d{s}
                </button>
              ))}
            </div>
            <div className="rpg-row" style={{ alignItems: 'flex-end' }}>
              <label className="rpg-field" style={{ width: 80 }}>
                Quantos
                <input className="rpg-input" type="number" min={1} max={20} value={dice.count} onChange={(e) => setDice({ ...dice, count: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })} />
              </label>
              <label className="rpg-field" style={{ flex: '1 1 140px' }}>
                Somar
                <select className="rpg-input" value={dice.attr} onChange={(e) => setDice({ ...dice, attr: e.target.value })}>
                  <option value="none">Nada</option>
                  {ATTRS.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} ({fmtMod(myChar.attrs?.[a.id] ?? 0)})</option>
                  ))}
                </select>
              </label>
            </div>
            {dice.sides === 20 && (
              <label className="rpg-row" style={{ gap: 8, fontSize: 15 }}>
                <input type="checkbox" checked={dice.prof} onChange={(e) => setDice({ ...dice, prof: e.target.checked })} />
                Somar proficiência ({fmtMod(proficiency(myChar.level))}): a classe sabe fazer isso
              </label>
            )}
            <label className="rpg-field">
              Para quê (opcional)
              <input className="rpg-input" value={dice.label} maxLength={80} onChange={(e) => setDice({ ...dice, label: e.target.value })} placeholder="Ex.: Abrir a fechadura" />
            </label>
            <button type="button" className="rpg-btn-gold" disabled={busy} onClick={() => doRoll()}>
              Rolar {dice.count}d{dice.sides}{modifier ? ` ${fmtMod(modifier)}` : ''}
            </button>
            {last && (
              <div className="rpg-result" aria-live="polite">
                <span className="rpg-die">{last.results.length === 1 ? last.results[0] : '∑'}</span>
                <span>
                  {last.results.join(' + ')}{last.modifier ? ` ${fmtMod(last.modifier)}` : ''} = <b style={{ fontSize: 22, color: 'var(--gold-hi)' }}>{last.total}</b>
                  {last.dice === '1d20' && last.results[0] === 20 && <b style={{ display: 'block', color: '#b6e39a' }}>20 natural! Crítico.</b>}
                  {last.dice === '1d20' && last.results[0] === 1 && <b style={{ display: 'block', color: '#ff9b85' }}>1 natural: falha com complicação.</b>}
                </span>
              </div>
            )}
          </section>
        )}

        <section className="rpg-panel-dark" aria-labelledby="rolls-title">
          <h2 id="rolls-title">Últimas rolagens</h2>
          {rolls.length === 0 ? (
            <p className="rpg-soft rpg-italic">Ninguém rolou nada ainda.</p>
          ) : (
            <ul className="rpg-list">
              {rolls.slice(0, 12).map((r) => (
                <li key={r.id} className="rpg-roll">
                  <span style={{ minWidth: 0 }}>
                    <b>{r.character_id ? charName(r.character_id) : nameOf(r.user_id) ?? 'Mestre'}</b>
                    <span className="rpg-soft"> · {r.label || r.dice}{r.secret ? ' (escondida)' : ''}</span>
                  </span>
                  <span style={{ whiteSpace: 'nowrap' }}>
                    {r.dice} {r.modifier ? fmtMod(r.modifier) : ''} = <b style={{ color: r.dice === '1d20' && r.results[0] === 20 ? '#b6e39a' : r.dice === '1d20' && r.results[0] === 1 ? '#ff9b85' : 'var(--gold-hi)' }}>{r.total}</b>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
