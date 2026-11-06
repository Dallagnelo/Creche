import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { formatDate } from '../lib/format'
import { addGameComment, deleteGameComment, listGameComments } from '../services/gameComments'
import Avatar from './Avatar'
import { ErrorBox, Spinner } from './Feedback'
import Icon from './Icon'

/**
 * Detalhe de um jogo: capa, plataforma, quem adicionou, anotações e uma conversa (comentários).
 * onDelete é opcional: só passamos quando a página quer mostrar o botão "Apagar jogo" ao dono.
 */
export default function GameModal({ game, isOwner, onClose, onDelete }) {
  const { user } = useAuth()
  const authorName = game.author?.display_name ?? 'alguém'

  // useCallback mantém a MESMA função entre renders; sem isso o useAsyncData buscaria de novo sem parar.
  const fetchComments = useCallback(() => listGameComments(game.id), [game.id])
  const { data: comments, loading, error, reload } = useAsyncData(fetchComments)

  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [actionError, setActionError] = useState(null)

  // Fecha com a tecla Esc.
  useEffect(() => {
    function handleKey(event) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Se a migração dos comentários ainda não foi rodada, a tabela não existe: avisamos com clareza.
  const missingTable = /game_comments/i.test(error?.message ?? '')

  async function handleSubmit(event) {
    event.preventDefault()
    if (!body.trim()) return

    setSending(true)
    setActionError(null)
    try {
      await addGameComment({ gameId: game.id, userId: user.id, body })
      setBody('')
      reload()
    } catch (err) {
      setActionError(err)
    } finally {
      setSending(false)
    }
  }

  async function handleDeleteComment(comment) {
    if (!window.confirm('Apagar este comentário?')) return
    setActionError(null)
    try {
      await deleteGameComment(comment.id)
      reload()
    } catch (err) {
      setActionError(err)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <article
        className="card modal modal-wide movie-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="movie-hero">
          {game.coverUrl ? (
            <img className="movie-hero-poster game-hero-cover" src={game.coverUrl} alt={`Capa de ${game.name}`} />
          ) : (
            <div className="movie-hero-poster game-hero-cover movie-hero-empty" aria-hidden="true">
              <Icon name="games" />
            </div>
          )}

          <div className="movie-hero-body">
            <div className="movie-hero-top">
              <h2 id="game-modal-title">{game.name}</h2>
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Fechar
              </button>
            </div>

            <p className="game-hero-meta">
              <span className="game-hero-platform">{game.platform || 'Sem plataforma'}</span>
              <span className="muted">
                adicionado por <strong>{authorName}</strong> em {formatDate(game.created_at)}
              </span>
            </p>

            {game.notes ? <p className="movie-overview">{game.notes}</p> : <p className="muted">Sem anotações.</p>}

            {isOwner && onDelete && (
              <div className="movie-actions">
                <button type="button" className="btn btn-danger-ghost" onClick={() => onDelete(game)}>
                  Apagar jogo
                </button>
              </div>
            )}
          </div>
        </header>

        <section className="modal-section" aria-labelledby="game-comments">
          <h3 id="game-comments">Comentários</h3>

          {missingTable ? (
            <p className="muted">
              Os comentários dos jogos ainda não foram ativados. Rode o arquivo{' '}
              <code>migracao-comentarios-jogos.sql</code> no Supabase.
            </p>
          ) : (
            <>
              {error && <ErrorBox error={error} onRetry={reload} />}
              {loading && !comments && <Spinner label="Carregando comentários..." />}
              {comments?.length === 0 && <p className="muted">Nenhum comentário ainda. Puxe a conversa!</p>}

              {comments?.length > 0 && (
                <ul className="comments">
                  {comments.map((comment) => {
                    const name = comment.author?.display_name ?? 'Alguém'
                    return (
                      <li key={comment.id} className="comment">
                        <Avatar name={name} src={comment.author?.avatar_url} size={30} />
                        <div className="comment-body">
                          <div className="comment-head">
                            <strong>{name}</strong>
                            <time className="muted" dateTime={comment.created_at}>
                              {formatDate(comment.created_at)}
                            </time>
                            {comment.user_id === user.id && (
                              <button
                                type="button"
                                className="btn btn-danger-ghost comment-delete"
                                onClick={() => handleDeleteComment(comment)}
                              >
                                Apagar
                              </button>
                            )}
                          </div>
                          <p className="comment-text">{comment.body}</p>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}

              {actionError && <ErrorBox error={actionError} />}

              <form className="comment-form" onSubmit={handleSubmit}>
                <label className="sr-only" htmlFor="new-game-comment">
                  Escreva um comentário
                </label>
                <textarea
                  id="new-game-comment"
                  rows={2}
                  maxLength={1000}
                  placeholder="Escreva um comentário sobre o jogo..."
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                />
                <button type="submit" className="btn btn-primary" disabled={!body.trim() || sending}>
                  {sending ? 'Enviando...' : 'Comentar'}
                </button>
              </form>
            </>
          )}
        </section>
      </article>
    </div>
  )
}
