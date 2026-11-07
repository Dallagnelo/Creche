import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { formatShortDate } from '../lib/format'
import { createSuggestion, deleteSuggestion, listSuggestions } from '../services/suggestions'
import Avatar from './Avatar'
import { ErrorBox, Spinner } from './Feedback'
import FormModal from './FormModal'

const KINDS = [
  { id: 'melhoria', label: 'Melhoria' },
  { id: 'ferramenta', label: 'Ferramenta nova' },
]
const kindLabel = (id) => KINDS.find((item) => item.id === id)?.label ?? id

// Caixa de sugestões: qualquer pessoa da turma manda ideias de melhorias ou ferramentas e todo mundo vê a lista.
export default function SuggestionsPanel() {
  const { user } = useAuth()
  const { data: suggestions, loading, error, reload } = useAsyncData(listSuggestions)
  const [kind, setKind] = useState('melhoria')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [sent, setSent] = useState(false)
  const [open, setOpen] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    if (body.trim().length < 3) return
    setSending(true)
    setActionError(null)
    setSent(false)
    try {
      await createSuggestion({ kind, body, userId: user.id })
      setBody('')
      setSent(true)
      setOpen(false)
      reload()
    } catch (err) {
      setActionError(err)
    } finally {
      setSending(false)
    }
  }

  async function handleDelete(item) {
    if (!window.confirm('Apagar esta sugestão?')) return
    setActionError(null)
    try {
      await deleteSuggestion(item.id)
      reload()
    } catch (err) {
      setActionError(err)
    }
  }

  return (
    <section className="card panel suggestions" aria-labelledby="suggestions-title">
      <div className="panel-head">
        <h2 id="suggestions-title">Sugestões</h2>
        <button
          type="button"
          className="btn btn-new"
          onClick={() => {
            setSent(false)
            setActionError(null)
            setOpen(true)
          }}
        >
          + Nova sugestão
        </button>
      </div>
      <p className="muted">Tem uma ideia de melhoria ou de uma ferramenta nova? Conta aqui para a turma.</p>
      {sent && <p className="suggest-ok" role="status">Sugestão enviada, obrigado!</p>}
      {actionError && !open && <ErrorBox error={actionError} />}

      {open && (
        <FormModal label="Nova sugestão" onClose={() => setOpen(false)}>
          <h2>Nova sugestão</h2>
          <form className="form" onSubmit={handleSubmit}>
            <div className="suggest-kinds" role="radiogroup" aria-label="Tipo de sugestão">
              {KINDS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="radio"
                  aria-checked={kind === item.id}
                  className={`suggest-kind ${kind === item.id ? 'is-on' : ''}`}
                  onClick={() => setKind(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <label className="field">
              <span className="sr-only">Sua sugestão</span>
              <textarea
                rows={4}
                maxLength={1000}
                placeholder={kind === 'melhoria' ? 'O que poderia ficar melhor no site?' : 'Que ferramenta ou recurso novo seria legal ter?'}
                value={body}
                onChange={(event) => {
                  setBody(event.target.value)
                  setSent(false)
                }}
              />
            </label>
            {actionError && <ErrorBox error={actionError} />}
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
                Cancelar
              </button>
              <span className="spacer" />
              <button type="submit" className="btn btn-primary" disabled={body.trim().length < 3 || sending}>
                {sending ? 'Enviando...' : 'Enviar sugestão'}
              </button>
            </div>
          </form>
        </FormModal>
      )}

      <h3 className="suggest-sub">Sugestões da turma</h3>
      {error && <ErrorBox error={error} onRetry={reload} />}
      {loading && !suggestions && <Spinner />}
      {suggestions?.length === 0 && <p className="muted">Ninguém mandou nada ainda. Seja o primeiro!</p>}
      {suggestions?.length > 0 && (
        <ul className="suggest-list">
          {suggestions.map((item) => {
            const name = item.author?.display_name ?? 'Alguém'
            return (
              <li key={item.id} className={`suggest-item suggest-item-${item.kind}`}>
                <header className="suggest-item-head">
                  <Avatar name={name} src={item.author?.avatar_url} size={36} />
                  <div className="suggest-who">
                    <strong>{name}</strong>
                    <time className="muted" dateTime={item.created_at}>
                      {formatShortDate(item.created_at)}
                    </time>
                  </div>
                  <span className={`suggest-tag suggest-tag-${item.kind}`}>{kindLabel(item.kind)}</span>
                </header>
                <p className="suggest-text">{item.body}</p>
                {item.user_id === user.id && (
                  <footer className="suggest-item-foot">
                    <button type="button" className="btn btn-danger-ghost comment-delete" onClick={() => handleDelete(item)}>
                      Apagar
                    </button>
                  </footer>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
