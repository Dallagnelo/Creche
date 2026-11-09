import AdjImg from './AdjImg'
import Avatar from './Avatar'
import Icon from './Icon'

// Álbum na grade do mural: ocupa o espaço de uma foto só, com "páginas" empilhadas atrás.
export default function AlbumCard({ album, onOpen }) {
  const name = album.author?.display_name ?? 'Alguém'
  const count = album.photos.length
  const people = new Set(album.photos.map((photo) => photo.added_by)).size
  const photosLabel = `${count} ${count === 1 ? 'foto' : 'fotos'}`

  return (
    <button
      type="button"
      className="album-tile photo-button"
      onClick={() => onOpen(album)}
      aria-label={`Abrir o álbum ${album.title}, ${photosLabel}`}
    >
      <div className="album-stack" aria-hidden="true" />
      <div className="album-front">
        <div className="tile-media">
          {album.coverUrl && <AdjImg src={album.coverUrl} alt="" crop={album.coverCrop} loading="lazy" />}
          <small className="album-badge">
            <Icon name="album" />
            <span className="badge-short">{count}</span>
            <span className="badge-long">Álbum · {photosLabel}</span>
          </small>
          <div className="album-title">
            <strong>{album.title}</strong>
            <em>{name}</em>
          </div>
        </div>
        <div className="card-foot">
          <Avatar name={name} src={album.author?.avatar_url} size={36} />
          <div className="card-foot-text">
            <strong>{album.title}</strong>
            <small>
              {name} criou · {people} {people === 1 ? 'pessoa postou' : 'pessoas postaram'}
            </small>
          </div>
        </div>
      </div>
    </button>
  )
}
