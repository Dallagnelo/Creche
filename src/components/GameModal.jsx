import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { formatAverage, formatDate } from '../lib/format'
import { addGameComment, deleteGameComment, listGameComments } from '../services/gameComments'
import Avatar from './Avatar'
import GameCover from './GameCover'
import GamePhotos from './GamePhotos'
import { ErrorBox, Spinner } from './Feedback'
import Icon from './Icon'
import SheetTop from './SheetTop'
import StarRating from './StarRating'
import { useBackClose } from '../lib/backClose'
import { gamePlatforms, splitList } from '../lib/gameInfo'

// Diz se o texto está sendo cortado pela caixa em que ele está (para mostrar o "Ler mais" só quando precisa).
function useClipped(ref, open, text) {
  const [clipped, setClipped] = useState(false)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || open) return undefined
    const check = () => setClipped(el.scrollHeight > el.clientHeight + 1)
    check()
    const observer = new ResizeObserver(check)
    observer.observe(el)
  return () => observer.disconnect()
  }, [ref, open, text])
  return clipped
}

/**
 * Detalhe de um jogo, no mesmo formato da janela de filmes: capa, nota da turma, sinopse e informações
 * (tudo vindo do IGDB), mais as fotos, as notas e os comentários da turma.
 * onDelete é opcional: só passamos quando a página quer mostrar o botão "Apagar jogo" ao dono.
 */
export default function GameModal({ game, isOwner, onClose, onDelete, onRate }) {
  const { user, isAdmin } = useAuth()
  const ratings = game.ratings ?? []
  const mine = ratings.find((rating) => rating.user_id === user.id)
  const count = ratings.length
  const authorName = game.author?.display_name ?? 'alguém'
  const genres = splitList(game.genres)
  const platforms = gamePlatforms(game)

  // useCallback mantém a MESMA função entre renders; sem isso o useAsyncData buscaria de novo sem parar.
  const fetchComments = useCallback(() => listGameComments(game.id), [game.id])
  const { data: comments, loading, error, reload } = useAsyncData(fetchComments)

  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [summaryOpen, setSummaryOpen] = useState(false) // "Ler mais" da sinopse
  const deskSummaryRef = useRef(null)
  const phoneSummaryRef = useRef(null)
  const deskClipped = useClipped(deskSummaryRef, summaryOpen, game.summary)
  const phoneClipped = useClipped(phoneSummaryRef, summaryOpen, game.summary)
  const [actionError, setActionError] = useState(null)
  const [photoCtl, setPhotoCtl] = useState(null) // botão 'Adicionar foto' controlado pela galeria

  // Fecha com a tecla Esc.
  useBackClose(onClose)

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

  const ownerButtons = isOwner ? (
    <>
      {onDelete && (
        <button type="button" className="btn btn-danger" onClick={() => onDelete(game)}>
          <Icon name="trash" />
          <span>Apagar</span>
        </button>
      )}
    </>
  ) : null
  const addPhotoButton = photoCtl && !photoCtl.disabled && (
    <button
      type="button"
      className="btn btn-ghost"
      disabled={photoCtl.busy || photoCtl.full}
      title={photoCtl.full ? 'Você chegou ao limite de fotos neste jogo' : undefined}
      onClick={photoCtl.open}
    >
      <Icon name="plus" />
      {photoCtl.busy ? (
        'Enviando...'
      ) : (
        <>
          <span>Foto</span>
        </>
      )}
    </button>
  )
  const facts = (game.publisher || platforms.length > 0 || genres.length > 0) && (
    <div className="game-facts">
      {game.publisher && <span className="game-fact-text">{game.publisher}</span>}
      {platforms.length > 0 && (
        <span className="game-fact-chips">
          {platforms.map((name) => (
            <span key={name} className="game-chip">{name}</span>
          ))}
        </span>
      )}
      {genres.length > 0 && <span className="game-fact-text">{genres.slice(0, 4).join(', ')}</span>}
    </div>
  )

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <article
        className="card modal modal-wide movie-modal sheet-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <SheetTop title={game.name} onClose={onClose} />
        <div className="sheet-body">
        <header className="movie-hero">
          <div className={`movie-hero-poster game-poster ${game.coverUrl ? '' : 'movie-hero-empty'}`}>
            {game.coverUrl ? (
              <GameCover url={game.coverUrl} size="hero" alt={`Capa de ${game.name}`} />
            ) : (
              <span aria-hidden="true">🎮</span>
            )}
          </div>

          <div className={`movie-hero-body game-hero-text ${summaryOpen ? '' : 'is-collapsed'}`}>
            <div className="movie-hero-top">
              <div className="game-title-block">
                <h2 id="game-modal-title">
                  {game.name}
                  {game.release_year && <span className="muted"> ({game.release_year})</span>}
                </h2>
                <div className="desk-only-block">{facts}</div>
              </div>
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Fechar
              </button>
            </div>

            <div className="phone-only-block">{facts}</div>

            <div className="movie-average">
              <StarRating value={game.average ?? 0} size={20} />
              <strong>{formatAverage(game.average)}</strong>
              <span className="muted desk-only">
                {count === 0 ? 'Sem avaliações' : `${count} ${count === 1 ? 'avaliação' : 'avaliações'}`}
              </span>
              <span className="muted phone-only movie-average-note">
                Média da turma · {count} {count === 1 ? 'nota' : 'notas'}
              </span>
            </div>
            {game.release_year && <span className="muted phone-only movie-year">{game.release_year}</span>}

            {game.summary && (
              <>
                <div
                  ref={deskSummaryRef}
                  className={`game-summary-box ${deskClipped && !summaryOpen ? 'is-clipped' : ''}`}
                >
                  <p className="movie-overview">{game.summary}</p>
                </div>
                {(deskClipped || summaryOpen) && (
                  <button
                    type="button"
                    className="btn btn-ghost game-more desk-only-block"
                    aria-expanded={summaryOpen}
                    onClick={() => setSummaryOpen((value) => !value)}
                  >
                    {summaryOpen ? 'Ler menos' : 'Ler mais'}
                  </button>
                )}
              </>
            )}

            <div className="movie-actions movie-actions-wrap">
              {onRate && (
                <button type="button" className="btn btn-primary" onClick={() => onRate(game, mine)}>
                  {mine ? 'Editar minha nota' : 'Dar minha nota'}
                </button>
              )}
              {game.igdb_url && (
                <a className="btn btn-ghost" href={game.igdb_url} target="_blank" rel="noreferrer">
                  IGDB ↗
                </a>
              )}
              <span className="desk-only-block">
                {addPhotoButton}
                {ownerButtons}
              </span>
            </div>
          </div>
        </header>

        <div className="phone-only-block movie-owner-phone">
          {onRate && (
            <button type="button" className="btn btn-primary movie-rate-phone" onClick={() => onRate(game, mine)}>
              {mine ? 'Editar minha nota' : 'Avaliar este jogo'}
            </button>
          )}
          {addPhotoButton}
          {ownerButtons}
          {game.igdb_url && (
            <a className="btn btn-ghost" href={game.igdb_url} target="_blank" rel="noreferrer">
              IGDB ↗
            </a>
          )}
        </div>

        <p className="muted game-added">
          <Avatar name={authorName} src={game.author?.avatar_url} size={20} />
          <span>
            Adicionado por {authorName} em {formatDate(game.created_at)}
          </span>
        </p>

        {game.summary && (
          <section className="modal-section phone-only-block" aria-label="Sinopse">
            <h3>Sinopse</h3>
            <p ref={phoneSummaryRef} className={`game-summary ${summaryOpen ? '' : 'is-lines'}`}>
              {game.summary}
            </p>
            {(phoneClipped || summaryOpen) && (
              <button
                type="button"
                className="btn btn-ghost game-more"
                aria-expanded={summaryOpen}
                onClick={() => setSummaryOpen((value) => !value)}
              >
                {summaryOpen ? 'Ler menos' : 'Ler mais'}
              </button>
            )}
          </section>
        )}

        {game.notes && (
          <section className="modal-section" aria-label="Anotações">
            <h3>Anotações</h3>
            <p className="note-box">{game.notes}</p>
          </section>
        )}

        <GamePhotos gameId={game.id} onControl={setPhotoCtl} />

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
                        <span className="phone-only rating-score">★ {formatAverage(rating.score)}</span>
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
                            {(comment.user_id === user.id || isAdmin) && (
                              <button
                                type="button"
                                className="btn btn-danger comment-delete"
                                onClick={() => handleDeleteComment(comment)}
                              ><Icon name="trash" />
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
        </div>
      </article>
    </div>
  )
}
