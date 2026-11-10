import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { formatAverage, formatDate, formatDateOnly } from '../lib/format'
import { posterUrl } from '../lib/tmdb'
import { addComment, deleteComment, listComments } from '../services/movies'
import Avatar from './Avatar'
import { ErrorBox, Spinner } from './Feedback'
import Icon from './Icon'
import MovieExtras from './MovieExtras'
import InlineRating from './InlineRating'
import SheetTop from './SheetTop'
import StarRating from './StarRating'

/**
 * Detalhe de um filme: sinopse, a nota de cada pessoa e uma conversa (comentários).
 * A nota em si é dada/editada na janela RatingModal; aqui só abrimos ela pelo botão.
 */
export default function MovieModal({ movie, onClose, onRate, onDelete, onSaved }) {
  const { user, isAdmin } = useAuth()
  const mine = movie.ratings.find((rating) => rating.user_id === user.id)
  const poster = posterUrl(movie.poster_path, 'w342')
  const count = movie.ratings.length

  const externalUrl = movie.imdb_id
    ? `https://www.imdb.com/title/${movie.imdb_id}/`
    : `https://www.themoviedb.org/movie/${movie.tmdb_id}`

  // useCallback mantém a MESMA função entre renders. Sem isso, o useAsyncData
  // enxergaria uma função "nova" a cada render e buscaria de novo sem parar.
  const fetchComments = useCallback(() => listComments(movie.id), [movie.id])
  const { data: comments, loading, error, reload } = useAsyncData(fetchComments)

  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [actionError, setActionError] = useState(null)
  // Trailer e elenco só aparecem (e só são buscados no TMDB) se a pessoa pedir.
  const [showExtras, setShowExtras] = useState(false)

  // Fecha com a tecla Esc.
  useEffect(() => {
    function handleKey(event) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  async function handleSubmit(event) {
    event.preventDefault()
    if (!body.trim()) return

    setSending(true)
    setActionError(null)
    try {
      await addComment({ movieId: movie.id, userId: user.id, body })
      setBody('')
      reload()
    } catch (err) {
      setActionError(err)
    } finally {
      setSending(false)
    }
  }

  async function handleDelete(comment) {
    if (!window.confirm('Apagar este comentário?')) return
    setActionError(null)
    try {
      await deleteComment(comment.id)
      reload()
    } catch (err) {
      setActionError(err)
    }
  }

  const deleteButton =
    onDelete && (movie.added_by === user.id || isAdmin) ? (
      <button type="button" className="btn btn-danger" onClick={() => onDelete(movie)}>
        <Icon name="trash" />
        Apagar filme
      </button>
    ) : null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <article
        className="card modal modal-wide movie-modal sheet-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="movie-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <SheetTop title={movie.title} onClose={onClose} />
        <div className="sheet-body">
        <header className="movie-hero">
          {poster ? (
            <img className="movie-hero-poster" src={poster} alt={`Pôster de ${movie.title}`} />
          ) : (
            <div className="movie-hero-poster movie-hero-empty" aria-hidden="true">
              🎬
            </div>
          )}

          <div className="movie-hero-body">
            <div className="movie-hero-top">
              <h2 id="movie-modal-title">
                {movie.title}
                {movie.release_year && <span className="muted"> ({movie.release_year})</span>}
              </h2>
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Fechar
              </button>
            </div>

            <div className="movie-average">
              <StarRating value={movie.average ?? 0} size={20} />
              <strong>{formatAverage(movie.average)}</strong>
              <span className="muted desk-only">
                {count === 0 ? 'Sem avaliações' : `${count} ${count === 1 ? 'avaliação' : 'avaliações'}`}
              </span>
              <span className="muted phone-only movie-average-note">
                Média da turma · {count} {count === 1 ? 'nota' : 'notas'}
              </span>
            </div>
            {movie.release_year && <span className="muted phone-only movie-year">{movie.release_year}</span>}

            {movie.overview && <p className="movie-overview">{movie.overview}</p>}

            <div className="movie-actions">
              <button type="button" className="btn btn-primary" onClick={() => onRate(movie, mine)}>
                {mine ? 'Editar minha nota' : 'Dar minha nota'}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                aria-expanded={showExtras}
                aria-controls="movie-extras"
                onClick={() => setShowExtras((value) => !value)}
              >
                <Icon name="play" />
                <span className="desk-only">{showExtras ? 'Esconder trailer e elenco' : 'Ver trailer e elenco'}</span>
                <span className="phone-only">{showExtras ? 'Esconder trailer' : 'Ver trailer'}</span>
              </button>
              <a className="btn btn-ghost" href={externalUrl} target="_blank" rel="noreferrer">
                {movie.imdb_id ? 'IMDb' : 'TMDB'} ↗
              </a>
              {/* Só quem cadastrou o filme (ou o admin) pode apagá-lo; o banco também confere isso. */}
              {deleteButton && <span className="desk-only-block">{deleteButton}</span>}
            </div>
          </div>
        </header>

        {/* Trailer e elenco vêm do TMDB; ficam escondidos até clicar no botão do cartão */}
        {showExtras && (
          <div id="movie-extras">
            <MovieExtras movie={movie} />
          </div>
        )}

        <div className="phone-only-block">
          <InlineRating key={mine?.id ?? 'new'} movie={movie} existing={mine} formId="movie-inline-rating" onSaved={onSaved} />
        </div>

        <section className="modal-section" aria-labelledby="movie-ratings">
          <h3 id="movie-ratings">Notas da turma</h3>
          {count === 0 ? (
            <p className="muted">Ninguém avaliou ainda. Seja o primeiro!</p>
          ) : (
            <ul className="rating-list">
              {movie.ratings.map((rating) => {
                const name = rating.user?.display_name ?? 'Alguém'
                return (
                  <li key={rating.id} className="rating-item">
                    <Avatar name={name} src={rating.user?.avatar_url} size={30} />
                    <div className="rating-item-body">
                      <div className="rating-line">
                        <strong>{name}</strong>
                        <StarRating value={rating.score} size={14} />
                        <span className="phone-only rating-score">★ {formatAverage(rating.score)}</span>
                        {rating.watched_at && <span className="muted">viu em {formatDateOnly(rating.watched_at)}</span>}
                      </div>
                      {rating.comment && <p className="rating-comment">“{rating.comment}”</p>}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="modal-section" aria-labelledby="movie-comments">
          <h3 id="movie-comments">Comentários</h3>

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
                          <button type="button" className="btn btn-danger comment-delete" onClick={() => handleDelete(comment)}><Icon name="trash" />
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
            <label className="sr-only" htmlFor="new-comment">
              Escreva um comentário
            </label>
            <textarea
              id="new-comment"
              rows={2}
              maxLength={1000}
              placeholder="Escreva um comentário sobre o filme..."
              value={body}
              onChange={(event) => setBody(event.target.value)}
            />
            <button type="submit" className="btn btn-primary" disabled={!body.trim() || sending}>
              {sending ? 'Enviando...' : 'Comentar'}
            </button>
          </form>
        </section>
        {deleteButton && <div className="phone-only-block movie-owner-phone">{deleteButton}</div>}
        </div>
        <div className="sheet-foot">
          <button type="submit" form="movie-inline-rating" className="btn btn-primary">
            Salvar avaliação
          </button>
        </div>
      </article>
    </div>
  )
}
