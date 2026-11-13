import { formatAverage } from '../lib/format'
import GameCover from './GameCover'
import Icon from './Icon'

// Cartão de capa na grade de jogos, igual ao dos filmes: capa e nome. Clicar abre o detalhe (GameModal).
export default function GameCard({ game, onOpen }) {
  const count = game.ratings?.length ?? 0

  return (
    <button type="button" className="movie-card" onClick={() => onOpen(game)}>
      <span className="movie-card-poster">
        {game.coverUrl ? (
          <GameCover url={game.coverUrl} size="card" alt={`Capa de ${game.name}`} loading="lazy" />
        ) : (
          <span className="movie-card-empty" aria-hidden="true">
            <Icon name="games" />
          </span>
        )}
        {game.average != null && (
          <span className="movie-score">
            <span aria-hidden="true">★</span> {formatAverage(game.average)}
          </span>
        )}
      </span>

      <span className="movie-card-title">
        {game.name}
        {game.release_year && <span className="muted"> ({game.release_year})</span>}
      </span>
      <span className="muted movie-card-meta">
        {count === 0 ? 'Sem avaliações' : `${count} ${count === 1 ? 'avaliação' : 'avaliações'}`}
      </span>
    </button>
  )
}
