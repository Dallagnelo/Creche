import { formatAverage } from '../lib/format'
import AdjImg from './AdjImg'
import Avatar from './Avatar'
import Icon from './Icon'

export default function GameCard({ game, isOwner, onOpen, onDelete }) {
  const authorName = game.author?.display_name ?? 'alguém'
  const count = game.ratings?.length ?? 0

  return (
    <article className="card game">
      <div className="game-cover-wrap">
        {game.coverUrl ? (
          <AdjImg className="game-cover" src={game.coverUrl} alt={`Capa de ${game.name}`} crop={game.coverCrop} loading="lazy" />
        ) : (
          <div className="game-cover game-cover-empty" aria-hidden="true">
            <Icon name="games" />
          </div>
        )}
        {game.average != null && (
          <span className="game-score" title={`${count} ${count === 1 ? 'avaliação' : 'avaliações'}`}>
            <span aria-hidden="true">★</span> {formatAverage(game.average)}
          </span>
        )}
        {game.platform && (
          <span className="game-badge" title={game.platform}>
            {game.platform}
          </span>
        )}
      </div>

      <div className="game-body">
        {/* title: mostra o nome completo ao passar o mouse, mesmo quando o texto é cortado */}
        <h3 className="game-name" title={game.name}>
          {/* O botão ocupa o card inteiro (veja .game-open::after no CSS): clicar em qualquer lugar abre o jogo. */}
          <button type="button" className="game-open" onClick={() => onOpen(game)}>
            {game.name}
          </button>
        </h3>
        {game.notes && <p className="game-notes">{game.notes}</p>}

        <div className="game-foot">
          <span className="game-author" title={authorName}>
            <Avatar name={authorName} src={game.author?.avatar_url} size={24} />
            <span className="game-author-name">{authorName}</span>
          </span>
          {isOwner && (
            <button
              type="button"
              className="btn-trash game-delete"
              onClick={() => onDelete(game)}
              title="Apagar jogo"
              aria-label={`Apagar ${game.name}`}
            >
              <Icon name="trash" />
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
