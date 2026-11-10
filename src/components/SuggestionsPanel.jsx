import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { formatShortDate } from '../lib/format'
import {
  createSuggestion,
  deleteSuggestion,
  listSuggestions,
  RESOLVED_TTL_HOURS,
  setSuggestionResolved,
  updateSuggestion,
} from '../services/suggestions'
import Avatar from './Avatar'
import { ErrorBox, Spinner } from './Feedback'
import FormModal from './FormModal'
import Icon from './Icon'
import { KEYS } from '../lib/dataCache'

const KINDS = [
  { id: 'melhoria', label: 'Melhoria' },
  { id: 'ferramenta', label: 'Ferramenta nova' },
]
const kindLabel = (id) => KINDS.find((item) => item.id === id)?.label ?? id

// Caixa de sugestões: qualquer pessoa da turma manda ideias de melhorias ou ferramentas e todo mundo vê a lista.
export default function SuggestionsPanel() {
  const { user, isAdmin } = useAuth()
  const { data: suggestions, loading, error, reload } = useAsyncData(listSuggestions, KEYS.suggestions)
  const [kind, setKind] = useState('melhoria')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [sent, setSent] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null) // sugestão que está sendo editada

  async function handleSubmit(event) {
    event.preventDefault()
    if (body.trim().length < 3) return
    setSending(true)
    setActionError(null)
    setSent(false)
    try {
      if (editing) {
        await updateSuggestion({ id: editing.id, kind, body })
      } else {
        await createSuggestion({ kind, body, userId: user.id })
        setSent(true)
      }
      setBody('')
      setEditing(null)
      setOpen(false)
      reload()
    } catch (err) {
      setActionError(err)
    } finally {
      setSending(false)
    }
  }

  function startEdit(item) {
    setEditing(item)
    setKind(item.kind)
    setBody(item.body)
    setActionError(null)
    setOpen(true)
  }

  function closeForm() {
    setOpen(false)
    setEditing(null)
    setBody('')
  }

  async function handleResolved(item, resolved) {
    setActionError(null)
    try {
      await setSuggestionResolved(item.id, resolved)
      reload()
    } catch (err) {
      setActionError(err)
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
            setEditing(null)
            setBody('')
            setOpen(true)
          }}
        >
          Adicionar sugestão
        </button>
      </div>
      {sent && <p className="suggest-ok" role="status">Sugestão enviada, obrigado!</p>}
      {actionError && !open && <ErrorBox error={actionError} />}

      {open && (
        <FormModal label={editing ? 'Editar sugestão' : 'Nova sugestão'} onClose={closeForm}>
          <h2>{editing ? 'Editar sugestão' : 'Nova sugestão'}</h2>
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
              <button type="button" className="btn btn-ghost" onClick={closeForm}>
                Cancelar
              </button>
              <span className="spacer" />
              <button type="submit" className="btn btn-primary" disabled={body.trim().length < 3 || sending}>
                {sending ? 'Salvando...' : editing ? 'Salvar' : 'Enviar sugestão'}
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
            const resolved = Boolean(item.resolved_at)
            const hoursLeft = resolved
              ? Math.max(1, Math.ceil((new Date(item.resolved_at).getTime() + RESOLVED_TTL_HOURS * 3600 * 1000 - Date.now()) / 3600000))
              : 0
            return (
              <li key={item.id} className={`suggest-item suggest-item-${item.kind}${resolved ? ' is-resolved' : ''}`}>
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
                {resolved && (
                  <p className="suggest-resolved" role="status">
                    ✓ Resolvido · some em {hoursLeft} h
                  </p>
                )}
                {(isAdmin || item.user_id === user.id) && (
                  <footer className="suggest-item-foot">
                    {isAdmin && (
                      <button type="button" className="btn btn-ghost" onClick={() => handleResolved(item, !resolved)}>
                        {resolved ? 'Desfazer' : 'Marcar como resolvido'}
                      </button>
                    )}
                    {(item.user_id === user.id || isAdmin) && (
                      <>
                        <button type="button" className="btn btn-ghost" onClick={() => startEdit(item)}>
                          Editar
                        </button>
                        <button type="button" className="btn btn-danger suggest-delete" onClick={() => handleDelete(item)}>
                          <Icon name="trash" />
                          Apagar
                        </button>
                      </>
                    )}
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
