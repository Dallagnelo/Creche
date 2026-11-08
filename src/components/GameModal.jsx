import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { formatAverage, formatDate } from '../lib/format'
import { addGameComment, deleteGameComment, listGameComments } from '../services/gameComments'
import AdjImg from './AdjImg'
import AdjustPanel from './AdjustPanel'
import Avatar from './Avatar'
import GameEditForm from './GameEditForm'
import { ErrorBox, Spinner } from './Feedback'
import Icon from './Icon'
import StarRating from './StarRating'

/**
 * Detalhe de um jogo: capa, plataforma, quem adicionou, anotações e uma conversa (comentários).
 * onDelete é opcional: só passamos quando a página quer mostrar o botão "Apagar jogo" ao dono.
 */
export default function GameModal({ game, isOwner, onClose, onDelete, onAdjust, onEdit, onRate }) {
  const { user } = useAuth()
  const ratings = game.ratings ?? []
  const mine = ratings.find((rating) => rating.user_id === user.id)
  const count = ratings.length
  const authorName = game.author?.display_name ?? 'alguém'

  // useCallback mantém a MESMA função entre renders; sem isso o useAsyncData buscaria de novo sem parar.
  const fetchComments = useCallback(() => listGameComments(game.id), [game.id])
  const { data: comments, loading, error, reload } = useAsyncData(fetchComments)

  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [adjusting, setAdjusting] = useState(false)
  const [editing, setEditing] = useState(false)
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
        <header className="game-hero">
          {game.coverUrl ? (
            <span className="game-hero-cover">
              <AdjImg src={game.coverUrl} alt={`Capa de ${game.name}`} crop={game.coverCrop} />
            </span>
          ) : (
            <div className="game-hero-cover game-hero-empty" aria-hidden="true">
              <Icon name="games" />
            </div>
          )}

          <div className="game-hero-body">
            <div className="movie-hero-top">
              <h2 id="game-modal-title">{game.name}</h2>
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Fechar
              </button>
            </div>

            <ul className="chips" aria-label="Informações do jogo">
              <li className="chip chip-platform">{game.platform || 'Sem plataforma'}</li>
              <li className="chip">
                <Avatar name={authorName} src={game.author?.avatar_url} size={20} />
                {authorName}
              </li>
              <li className="chip">{formatDate(game.created_at)}</li>
            </ul>

            <div className="movie-average">
              <StarRating value={game.average ?? 0} size={20} />
              <strong>{formatAverage(game.average)}</strong>
              <span className="muted">
                {count === 0 ? 'Sem avaliações' : `${count} ${count === 1 ? 'avaliação' : 'avaliações'}`}
              </span>
              {onRate && (
                <button type="button" className="btn btn-primary game-rate-btn" onClick={() => onRate(game, mine)}>
                  {mine ? 'Editar minha nota' : 'Dar minha nota'}
                </button>
              )}
            </div>

            {game.notes ? <p className="note-box">{game.notes}</p> : <p className="muted">Sem anotações.</p>}


            {isOwner && (onDelete || onEdit || (onAdjust && game.coverUrl)) && (
              <div className="movie-actions">
                {onEdit && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      setEditing((v) => !v)
                      setAdjusting(false)
                    }}
                    aria-expanded={editing}
                  >
                    <Icon name="edit" />
                    Editar jogo
                  </button>
                )}
                {onAdjust && game.coverUrl && (
                  <button type="button" className="btn btn-ghost" onClick={() => {
                      setAdjusting((v) => !v)
                      setEditing(false)
                    }}
                    aria-expanded={adjusting}>
                    <Icon name="photos" />
                    Ajustar capa
                  </button>
                )}
                {onDelete && (
                  <button type="button" className="btn btn-danger" onClick={() => onDelete(game)}>
                    <Icon name="trash" />
                    Apagar jogo
                  </button>
                )}
              </div>
            )}
          </div>
        </header>

        {editing && (
          <section className="modal-section" aria-label="Editar jogo">
            <GameEditForm
              game={game}
              onCancel={() => setEditing(false)}
              onSave={async (values) => {
                await onEdit(game, values)
                setEditing(false)
              }}
            />
          </section>
        )}

        {adjusting && (
          <AdjustPanel
            title="Escolher a parte da capa"
            src={game.coverUrl}
            initialValue={game.coverCrop}
            onCancel={() => setAdjusting(false)}
            onSave={async (value) => {
              await onAdjust(game, value)
              setAdjusting(false)
            }}
          />
        )}

        <section className="modal-section" aria-labelledby="game-ratings">
          <h3 id="game-ratings">Notas da turma</h3>
          {count === 0 ? (
            <p className="muted">Ninguém avaliou ainda. Seja o primeiro!</p>
          ) : (
            <ul className="rating-list">
              {ratings.map((rating) => {
                const name = rating.user?.display_name ?? 'Alguém'
                return (
                  <li key={rating.id} className="rating-item">
                    <Avatar name={name} src={rating.user?.avatar_url} size={30} />
                    <div className="rating-item-body">
                      <div className="rating-line">
                        <strong>{name}</strong>
                        <StarRating value={rating.score} size={14} />
                      </div>
                      {rating.comment && <p className="rating-comment">“{rating.comment}”</p>}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

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
