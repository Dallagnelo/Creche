import Icon from './Icon'

// Miniatura quadrada de um post na grade do mural (usa a foto de capa).
// Se o post tem várias fotos, aparece um selo com a quantidade.
// Clicar abre o post grande (PostModal).
export default function PostCard({ post, onOpen }) {
  const name = post.author?.display_name ?? 'Alguém'
  const count = post.images.length

  return (
    <button
      type="button"
      className="photo-tile photo-button"
      onClick={() => onOpen(post)}
      aria-label={count > 1 ? `Abrir ${count} fotos de ${name}` : `Abrir foto de ${name}`}
    >
      {post.imageUrl && <img src={post.imageUrl} alt={post.caption || `Foto postada por ${name}`} loading="lazy" />}
      {count > 1 && (
        <small className="photo-count">
          <Icon name="photos" />
          {count}
        </small>
      )}
      <span>{name}</span>
    </button>
  )
}
