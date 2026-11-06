import Avatar from './Avatar'
import Icon from './Icon'

export default function GameCard({ game, isOwner, onOpen, onDelete }) {
  const authorName = game.author?.display_name ?? 'alguém'

  return (
    <article className="card game">
      <div className="game-cover-wrap">
        {game.coverUrl ? (
          <img className="game-cover" src={game.coverUrl} alt={`Capa de ${game.name}`} loading="lazy" />
        ) : (
          <div className="game-cover game-cover-empty" aria-hidden="true">
            <Icon name="games" />
          </div>
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
            <button type="button" className="btn btn-danger-ghost game-delete" onClick={() => onDelete(game)}>
              Apagar
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
