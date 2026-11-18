import { useState } from 'react'
import { addMember, joinLobby, removeMember, setMaster, setWants, startCampaign } from '../../services/rpg'
import RpgIcon from './RpgIcon'

const WANTS = [
  { id: 'jogar', label: 'Quero jogar' },
  { id: 'mestrar', label: 'Quero mestrar' },
  { id: 'tanto_faz', label: 'Tanto faz' },
]
const wantsLabel = (id) => WANTS.find((w) => w.id === id)?.label ?? 'Quero jogar'
const WANTS_ICON = { jogar: 'crossed-swords', mestrar: 'crown', tanto_faz: 'dice-twenty-faces-twenty' }

/**
 * Sala de espera: a turma entra e diz se quer jogar ou mestrar; o admin escolhe o mestre;
 * o mestre ou o admin tiram gente, chamam gente e começam a campanha.
 */
export default function Lobby({ table, user, isAdmin, profiles, onReload }) {
  const { campaign, members } = table
  const master = campaign.master_id === user.id
  const manager = master || isAdmin
  const me = members.find((m) => m.user_id === user.id)
  const [wants, setWantsState] = useState(me?.wants ?? 'jogar')
  const [pick, setPick] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState({ text: '', bad: false })

  async function run(fn, ok) {
    setBusy(true)
    setMsg({ text: '', bad: false })
    try {
      await fn()
      if (ok) setMsg({ text: ok, bad: false })
      await onReload()
    } catch (err) {
      setMsg({ text: err.message ?? 'Deu errado.', bad: true })
    } finally {
      setBusy(false)
    }
  }

  const inRoom = new Set([campaign.master_id, ...members.map((m) => m.user_id)])
  const callable = (profiles ?? []).filter((p) => !inRoom.has(p.id))
  const masterName = master ? 'Você' : campaign.master?.display_name ?? '—'
  const wannaMaster = members.filter((m) => m.wants === 'mestrar')

  return (
    <div className="rpg-cols">
      <div className="rpg-col-main">
        <section className="rpg-panel" aria-labelledby="lobby-title">
          <div className="rpg-split">
            <h2 id="lobby-title" style={{ fontSize: 24 }}>Sala de espera</h2>
            <span className="rpg-ink-soft" style={{ fontFamily: 'var(--display)', fontWeight: 700 }}>
              {members.length} {members.length === 1 ? 'pessoa' : 'pessoas'} na sala
            </span>
          </div>
          <p className="rpg-ink-soft rpg-italic">
            Entre na sala e diga se quer jogar ou mestrar. {isAdmin ? 'Você escolhe o mestre' : 'O admin escolhe o mestre'}, e a aventura começa quando o grupo estiver pronto.
          </p>

          <div className="rpg-card" style={{ boxShadow: 'none', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <RpgIcon name="crown" style={{ width: 34, height: 34, color: '#b8860b' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <span className="rpg-ink-soft" style={{ fontFamily: 'var(--display)', fontSize: 12, fontWeight: 700, letterSpacing: 2 }}>MESTRE</span>
              <b style={{ display: 'block', fontSize: 20 }}>{masterName}</b>
            </div>
          </div>

          <h3>Na sala</h3>
          {members.length === 0 && <p className="rpg-ink-soft rpg-italic">Ninguém entrou ainda.</p>}
          <ul className="rpg-list">
            {members.map((m) => (
              <li key={m.user_id} className="rpg-split" style={{ padding: '8px 0', borderBottom: '1px solid rgba(90,58,34,.3)' }}>
                <span className="rpg-row" style={{ gap: 10, minWidth: 0 }}>
                  {m.profile?.avatar_url ? (
                    <img src={m.profile.avatar_url} alt="" width="36" height="36" style={{ borderRadius: '50%', border: '2px solid #8a6a3a', objectFit: 'cover' }} />
                  ) : (
                    <RpgIcon name={WANTS_ICON[m.wants] ?? 'crossed-swords'} style={{ width: 30, height: 30, color: m.wants === 'mestrar' ? '#b8860b' : '#5a3a22' }} />
                  )}
                  <b style={{ fontFamily: 'var(--display)' }}>{m.user_id === user.id ? 'Você' : m.profile?.display_name ?? '—'}</b>
                  <span className="rpg-chip" style={{ color: 'var(--ink)', background: m.wants === 'mestrar' ? 'rgba(184,134,11,.2)' : 'transparent' }}>{wantsLabel(m.wants)}</span>
                </span>
                {manager && (
                  <span className="rpg-row rpg-compact">
                    {isAdmin && (
                      <button type="button" className="rpg-btn-gold" disabled={busy} onClick={() => run(() => setMaster(campaign, m.user_id), `${m.profile?.display_name ?? 'Essa pessoa'} agora é o mestre.`)}>
                        Tornar mestre
                      </button>
                    )}
                    {m.user_id !== user.id && (
                      <button type="button" className="rpg-btn-ghost" disabled={busy} onClick={() => run(() => removeMember(campaign.id, m.user_id))}>
                        Tirar
                      </button>
                    )}
                  </span>
                )}
              </li>
            ))}
          </ul>
          {isAdmin && master && wannaMaster.length > 0 && (
            <p className="rpg-ink-soft rpg-italic" style={{ fontSize: 14 }}>
              {wannaMaster.map((m) => m.profile?.display_name).join(', ')} {wannaMaster.length === 1 ? 'quer' : 'querem'} mestrar. Use "Tornar mestre" para passar o posto.
            </p>
          )}
          <p className={`rpg-msg ${msg.bad ? 'is-bad' : 'is-good'}`} aria-live="polite">{msg.text}</p>
        </section>
      </div>

      <div className="rpg-col-side">
        <section className="rpg-panel-dark" aria-labelledby="me-title">
          <h2 id="me-title">Você</h2>
          {master ? (
            <p className="rpg-soft">Você é o mestre desta campanha.{isAdmin ? ' Para jogar em vez de mestrar, torne outra pessoa mestre: você volta para a sala como jogador.' : ''}</p>
          ) : (
            <>
              <label className="rpg-field">
                O que você quer
                <select
                  className="rpg-input"
                  value={me?.wants ?? wants}
                  onChange={(e) => {
                    setWantsState(e.target.value)
                    if (me) run(() => setWants(campaign.id, user.id, e.target.value))
                  }}
                >
                  {WANTS.map((w) => <option key={w.id} value={w.id}>{w.label}</option>)}
                </select>
              </label>
              {me ? (
                <button type="button" className="rpg-btn-ghost" disabled={busy} onClick={() => run(() => removeMember(campaign.id, user.id), 'Você saiu da sala.')}>Sair da sala</button>
              ) : (
                <button type="button" className="rpg-btn" disabled={busy} onClick={() => run(() => joinLobby(campaign.id, user.id, wants), 'Você entrou na sala.')}>Entrar na sala</button>
              )}
            </>
          )}
        </section>

        {manager && (
          <section className="rpg-panel" aria-labelledby="ctrl-title">
            <h2 id="ctrl-title">Preparar a mesa</h2>
            <div className="rpg-row">
              <label className="rpg-sr" htmlFor="lobby-call">Chamar alguém</label>
              <select id="lobby-call" className="rpg-input" value={pick} onChange={(e) => setPick(e.target.value)} style={{ flex: '1 1 160px', width: 'auto' }}>
                <option value="">Chamar alguém da turma…</option>
                {callable.map((p) => <option key={p.id} value={p.id}>{p.display_name}</option>)}
              </select>
              <button type="button" className="rpg-btn-ghost" disabled={busy || !pick} onClick={() => { run(() => addMember(campaign.id, pick)); setPick('') }}>Chamar</button>
            </div>
            <hr className="rpg-divider" />
            <p className="rpg-ink-soft" style={{ fontSize: 14 }}>
              Ao começar, a sala fecha: só entra quem o mestre chamar. Os jogadores criam o personagem e o mestre abre a primeira rodada.
            </p>
            <button type="button" className="rpg-btn" disabled={busy || members.length === 0} onClick={() => run(() => startCampaign(campaign.id), 'A campanha começou!')}>
              Começar a campanha
            </button>
            {members.length === 0 && <span className="rpg-ink-soft rpg-italic" style={{ fontSize: 14 }}>Precisa de pelo menos 1 jogador na sala.</span>}
          </section>
        )}
      </div>
    </div>
  )
}
