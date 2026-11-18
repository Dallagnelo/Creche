import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ErrorBox, Spinner } from '../components/Feedback'
import RpgIcon from '../components/rpg/RpgIcon'
import { useAuth } from '../contexts/AuthContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { createCampaign, deleteCampaign, listCampaigns, RPG_HINT } from '../services/rpg'
import '../styles/rpg.css'

const fmtDate = (iso) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })

/** Campanhas de RPG da turma (mestre e jogadores). */
export default function RpgPage() {
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()
  const { data: campaigns, loading, error, reload } = useAsyncData(listCampaigns, 'rpg-campaigns')
  const [name, setName] = useState('')
  const [days, setDays] = useState(3)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState(null)

  async function handleDelete(c) {
    if (!window.confirm(`Excluir a campanha "${c.name}"? Personagens, rodadas e rolagens somem junto. Não dá para desfazer.`)) return
    try {
      await deleteCampaign(c.id)
      reload()
    } catch (err) {
      setFormError(err)
    }
  }

  async function handleCreate(event) {
    event.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    setFormError(null)
    try {
      const id = await createCampaign({ name, roundDays: days })
      navigate(`/rpg/${id}`)
    } catch (err) {
      setFormError(err)
      setBusy(false)
    }
  }

  return (
    <section className="stack">
      <div className="rpg">
        <header className="rpg-split">
          <div>
            <span className="rpg-kicker">RPG de mesa da turma</span>
            <h1>Campanhas</h1>
            <p className="rpg-soft rpg-italic">Cada um joga quando puder: a rodada fecha quando todos jogaram ou o prazo acaba.</p>
          </div>
          <RpgIcon name="dice-twenty-faces-twenty" style={{ width: 64, height: 64, color: '#c9a227' }} />
        </header>

        {error && <ErrorBox error={error} onRetry={reload} />}
        {loading && !campaigns && <Spinner />}
        {campaigns === null && !loading && <p className="rpg-panel rpg-empty">{RPG_HINT}</p>}

        {campaigns?.length === 0 && (
          <p className="rpg-panel rpg-empty">Nenhuma campanha ainda. {isAdmin ? 'Crie a primeira abaixo.' : 'Quando o admin abrir uma sala, ela aparece aqui.'}</p>
        )}

        {campaigns?.length > 0 && (
          <ul className="rpg-list">
            {campaigns.map((c) => {
              const mine = c.master_id === user?.id
              const open = c.current?.status === 'aberta'
              const lobby = c.status === 'lobby'
              const inside = mine || c.members.some((m) => m.user_id === user?.id)
              return (
                <li key={c.id} className="rpg-row" style={{ flexWrap: 'nowrap', alignItems: 'stretch' }}>
                  <Link to={`/rpg/${c.id}`} className="rpg-card" style={{ textDecoration: 'none', flex: 1, minWidth: 0 }}>
                    <span className="rpg-split">
                      <b style={{ fontSize: 20, color: 'var(--ink)' }}>{c.name}</b>
                      <span className="rpg-chip" style={{ color: 'var(--ink)', background: lobby ? 'rgba(184,134,11,.25)' : 'rgba(79,154,60,.2)' }}>
                        {lobby ? 'Sala de espera' : 'Em jogo'}
                      </span>
                    </span>
                    <span className="rpg-ink-soft rpg-italic">{mine ? 'Você é o mestre' : `Mestre: ${c.master?.display_name ?? '—'}`}</span>
                    <span className="rpg-ink-soft">
                      {lobby
                        ? `${c.members.length} ${c.members.length === 1 ? 'pessoa' : 'pessoas'} na sala · ${inside ? 'você está dentro' : 'toque para entrar'}`
                        : `${c.members.length} ${c.members.length === 1 ? 'jogador' : 'jogadores'}${
                            c.current ? ` · Rodada ${c.current.number} ${open ? `aberta até ${fmtDate(c.current.closes_at)}` : 'resolvida'}` : ' · ainda não começou'
                          }`}
                    </span>
                  </Link>
                  {isAdmin && (
                    <button type="button" className="rpg-btn-dark" onClick={() => handleDelete(c)} aria-label={`Excluir ${c.name}`} title="Excluir campanha">
                      Excluir
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        {isAdmin && campaigns !== null && (
          <form className="rpg-panel" onSubmit={handleCreate}>
            <h2>Nova campanha</h2>
            <div className="rpg-row" style={{ alignItems: 'flex-end' }}>
              <label className="rpg-field" style={{ flex: '1 1 240px' }}>
                Nome
                <input className="rpg-input" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="Ex.: A Coroa de Lata" required />
              </label>
              <label className="rpg-field" style={{ width: 150 }}>
                Dias por rodada
                <select className="rpg-input" value={days} onChange={(e) => setDays(Number(e.target.value))}>
                  {[1, 2, 3, 4, 5, 7].map((d) => (
                    <option key={d} value={d}>
                      {d} {d === 1 ? 'dia' : 'dias'}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className="rpg-btn" disabled={busy}>
                {busy ? 'Criando...' : 'Abrir sala de espera'}
              </button>
            </div>
            {formError && <ErrorBox error={formError} />}
          </form>
        )}
      </div>
    </section>
  )
}
