import { formatShortDate } from '../lib/format'
import AdjImg from './AdjImg'
import Avatar from './Avatar'
import Icon from './Icon'

// Foto (ou lembrança) na grade do mural. No computador é uma miniatura quadrada; no celular vira um cartão
// grande com a legenda e quem postou embaixo. Clicar abre o post grande (PostModal).
export default function PostCard({ post, onOpen }) {
  const name = post.author?.display_name ?? 'Alguém'
  const count = post.images.length

  return (
    <button
      type="button"
      className="photo-tile photo-button post-card"
      onClick={() => onOpen(post)}
      aria-label={count > 1 ? `Abrir ${count} fotos de ${name}` : `Abrir foto de ${name}`}
    >
      <div className="tile-media">
        {post.imageUrl && (
          <AdjImg src={post.imageUrl} alt={post.caption || `Foto postada por ${name}`} crop={post.imageCrop} loading="lazy" />
        )}
        {count > 1 && (
          <small className="photo-count">
            <Icon name="photos" />
            {count}
          </small>
        )}
        <span className="tile-name">{name}</span>
      </div>
      <div className="card-foot">
        <Avatar name={name} src={post.author?.avatar_url} size={36} />
        <div className="card-foot-text">
          <strong>{post.caption || `Foto de ${name}`}</strong>
          <small>
            {name} · {formatShortDate(post.created_at)}
          </small>
        </div>
      </div>
    </button>
  )
}
