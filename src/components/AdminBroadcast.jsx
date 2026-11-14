import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { sendAdminBroadcast } from '../services/notifications'

const PAGES = [
  { to: '/', label: 'Início' },
  { to: '/mural', label: 'Mural' },
  { to: '/filmes', label: 'Filmes' },
  { to: '/jogos', label: 'Jogos' },
  { to: '/eventos', label: 'Eventos' },
  { to: '/votacoes', label: 'Votações' },
  { to: '/ao-vivo', label: 'Ao vivo' },
  { to: '/turma', label: 'Turma' },
  { to: '/patch-notes', label: 'Patch notes' },
]
const MAX_TITLE = 80
const MAX_BODY = 300

/** Só para admin: escrever um aviso que chega para a turma toda (sininho + push). */
export default function AdminBroadcast() {
  const { isAdmin } = useAuth()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [link, setLink] = useState('/')
  const [confirming, setConfirming] = useState(false)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null) // { ok, text }

  if (!isAdmin) return null

  async function send() {
    setSending(true)
    setResult(null)
    try {
      const count = await sendAdminBroadcast({ title: title.trim(), body: body.trim(), link })
      setResult({ ok: true, text: `Aviso enviado para ${count} ${count === 1 ? 'pessoa' : 'pessoas'}! 📢` })
      setTitle('')
      setBody('')
      setLink('/')
    } catch (error) {
      setResult({ ok: false, text: error.message })
    } finally {
      setSending(false)
      setConfirming(false)
    }
  }

  const ready = title.trim().length > 0

  return (
    <section className="card panel settings-group admin-broadcast" aria-labelledby="settings-broadcast">
      <div className="panel-head">
        <h2 id="settings-broadcast">📢 Mandar aviso para a turma</h2>
        <span className="admin-tag">Só admin</span>
      </div>
      <p className="muted settings-note">Chega para todo mundo no sininho 🔔 e no celular/computador de quem ligou as notificações.</p>

      <form
        className="broadcast-form"
        onSubmit={(event) => {
          event.preventDefault()
          if (ready) setConfirming(true)
        }}
      >
        <label className="field">
          <span>Título</span>
          <input
            type="text"
            value={title}
            maxLength={MAX_TITLE}
            placeholder="Ex.: Churrasco confirmado!"
            onChange={(event) => {
              setTitle(event.target.value)
              setConfirming(false)
            }}
          />
          <small className="muted broadcast-count">
            {title.length}/{MAX_TITLE}
          </small>
        </label>
        <label className="field">
          <span>Mensagem (opcional)</span>
          <textarea
            rows={3}
            value={body}
            maxLength={MAX_BODY}
            placeholder="Ex.: Sábado às 20h na casa do Vitor. Cada um leva uma coisa!"
            onChange={(event) => {
              setBody(event.target.value)
              setConfirming(false)
            }}
          />
          <small className="muted broadcast-count">
            {body.length}/{MAX_BODY}
          </small>
        </label>
        <label className="field">
          <span>Ao tocar no aviso, abrir</span>
          <select value={link} onChange={(event) => setLink(event.target.value)}>
            {PAGES.map((page) => (
              <option key={page.to} value={page.to}>
                {page.label}
              </option>
            ))}
          </select>
        </label>

        {ready && (
          <div className="broadcast-preview" aria-label="Como vai aparecer">
            <span className="broadcast-preview-label">Prévia</span>
            <strong>📢 {title.trim()}</strong>
            {body.trim() && <span>{body.trim()}</span>}
          </div>
        )}

        {result && (
          <p className={result.ok ? 'notify-msg' : 'broadcast-error'} role="status">
            {result.text}
          </p>
        )}

        <div className="form-actions">
          {confirming ? (
            <>
              <span className="broadcast-confirm">Mandar para a turma toda?</span>
              <button type="button" className="btn btn-ghost" onClick={() => setConfirming(false)} disabled={sending}>
                Cancelar
              </button>
              <button type="button" className="btn btn-primary" onClick={send} disabled={sending}>
                {sending ? 'Enviando...' : 'Sim, mandar'}
              </button>
            </>
          ) : (
            <button type="submit" className="btn btn-primary" disabled={!ready}>
              📢 Mandar aviso
            </button>
          )}
        </div>
      </form>
    </section>
  )
}
