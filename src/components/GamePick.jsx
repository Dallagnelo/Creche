import { shortPlatform } from '../services/igdb'
import GameCover from './GameCover'
import Icon from './Icon'

/**
 * Resumo do jogo escolhido na busca (capa, nome, ano, plataformas, gêneros e sinopse),
 * para a pessoa conferir antes de adicionar. "Trocar" volta para a busca.
 */
export default function GamePick({ game, onChange, translating = false, changeLabel = 'Trocar jogo' }) {
  const platforms = [...new Set((game.platforms ?? []).map(shortPlatform))]

  return (
    <div className="game-pick">
      <div className="game-pick-cover">
        {game.coverUrl ? (
          <GameCover url={game.coverUrl} size="pick" alt={`Capa de ${game.name}`} />
        ) : (
          <Icon name="games" />
        )}
      </div>
      <div className="game-pick-body">
        <strong className="game-pick-name">
          {game.name}
          {game.year && <span className="muted"> ({game.year})</span>}
        </strong>
        {platforms.length > 0 && <span className="muted game-pick-line">{platforms.slice(0, 5).join(' · ')}</span>}
        {game.genres?.length > 0 && <span className="muted game-pick-line">{game.genres.join(', ')}</span>}
        {translating ? (
          <p className="muted game-pick-summary">Traduzindo a sinopse...</p>
        ) : (
          game.summary && <p className="game-pick-summary">{game.summary}</p>
        )}
        <button type="button" className="btn btn-ghost game-pick-change" onClick={onChange}>
          {changeLabel}
        </button>
      </div>
    </div>
  )
}
