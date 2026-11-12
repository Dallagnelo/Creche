import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { formatAverage, formatDateOnly } from '../lib/format'
import { posterUrl } from '../lib/tmdb'
import Avatar from './Avatar'
import Icon from './Icon'
import MovieExtras from './MovieExtras'
import SheetTop from './SheetTop'
import StarRating from './StarRating'
import { useBackClose } from '../lib/backClose'

/**
 * Detalhe de um filme: sinopse, a nota de cada pessoa .
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

  // Trailer e elenco só aparecem (e só são buscados no TMDB) se a pessoa pedir.
  const [showExtras, setShowExtras] = useState(false)

  // Fecha com a tecla Esc.
  useBackClose(onClose)

  useEffect(() => {
    function handleKey(event) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

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
          <div className={`movie-hero-poster ${poster ? '' : 'movie-hero-empty'}`}>
            {poster ? <img src={poster} alt={`Pôster de ${movie.title}`} /> : <span aria-hidden="true">🎬</span>}
          </div>

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


        <div className="phone-only-block movie-owner-phone">
          {onRate && (
            <button type="button" className="btn btn-primary movie-rate-phone" onClick={() => onRate(movie, mine)}>
              {mine ? 'Editar minha nota' : 'Avaliar este filme'}
            </button>
          )}
          {deleteButton}
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

        </div>
      </article>
    </div>
  )
}
