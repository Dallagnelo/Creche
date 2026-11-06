import { formatAverage } from '../lib/format'
import { posterUrl } from '../lib/tmdb'

// Cartão de pôster na grade de filmes. Clicar abre o detalhe (MovieModal).
export default function MovieCard({ movie, onOpen }) {
  const poster = posterUrl(movie.poster_path, 'w500')
  const count = movie.ratings.length

  return (
    <button type="button" className="movie-card" onClick={() => onOpen(movie)}>
      <span className="movie-card-poster">
        {poster ? (
          <img src={poster} alt={`Pôster de ${movie.title}`} loading="lazy" />
        ) : (
          <span className="movie-card-empty" aria-hidden="true">
            🎬
          </span>
        )}
        {movie.average != null && (
          <span className="movie-score">
            <span aria-hidden="true">★</span> {formatAverage(movie.average)}
          </span>
        )}
      </span>

      <span className="movie-card-title">
        {movie.title}
        {movie.release_year && <span className="muted"> ({movie.release_year})</span>}
      </span>
      <span className="muted movie-card-meta">
        {count === 0 ? 'Sem avaliações' : `${count} ${count === 1 ? 'avaliação' : 'avaliações'}`}
      </span>
    </button>
  )
}
