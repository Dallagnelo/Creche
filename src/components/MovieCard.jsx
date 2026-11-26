import { formatAverage } from '../lib/format'
import { posterUrl } from '../lib/tmdb'
import Icon from './Icon'

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
            <Icon name="movies" />
          </span>
        )}
        {movie.tmdbScore != null ? (
          // sugestões: a nota é a do TMDB, de 0 a 10
          <span className="movie-score" title="Nota no TMDB (de 0 a 10)">
            {formatAverage(movie.tmdbScore)}
          </span>
        ) : movie.average != null && (
          <span className="movie-score">
            <span aria-hidden="true">★</span> {formatAverage(movie.average)}
          </span>
        )}
      </span>

      <span className="movie-card-title">{movie.title}</span>
      <span className="muted movie-card-meta">
        {movie.release_year ? `${movie.release_year} · ` : ''}
        {count === 0 ? 'sem avaliações' : `${count} ${count === 1 ? 'avaliação' : 'avaliações'}`}
      </span>
    </button>
  )
}
