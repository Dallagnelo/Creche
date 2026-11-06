import { useEffect, useState } from 'react'
import { formatDate } from '../lib/format'
import AdjustPanel from './AdjustPanel'
import Avatar from './Avatar'
import Icon from './Icon'

// Janela com as fotos em tamanho grande, legenda e (para o dono) o botão de apagar.
// Com várias fotos, dá para navegar pelas setas, pelo teclado (← →) ou pelas miniaturas.
export default function PostModal({ post, isOwner, onClose, onDelete, onAdjust }) {
  const name = post.author?.display_name ?? 'Alguém'
  const images = post.images
  const [index, setIndex] = useState(0)
  const [adjusting, setAdjusting] = useState(false)
  const current = images[index]
  const many = images.length > 1

  const previous = () => setIndex((i) => (i - 1 + images.length) % images.length)
  const next = () => setIndex((i) => (i + 1) % images.length)

  // Teclado: Esc fecha, setas trocam de foto. A função de limpeza remove o "ouvinte" quando a janela fecha.
  useEffect(() => {
    function handleKey(event) {
      if (event.key === 'Escape') onClose()
      if (images.length > 1 && event.key === 'ArrowLeft') setIndex((i) => (i - 1 + images.length) % images.length)
      if (images.length > 1 && event.key === 'ArrowRight') setIndex((i) => (i + 1) % images.length)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose, images.length])

  return (
    // Clicar no fundo escuro fecha; clicar dentro da janela não (stopPropagation).
    <div className="modal-backdrop" onClick={onClose}>
      <article
        className="card modal modal-wide post"
        role="dialog"
        aria-modal="true"
        aria-label={`Fotos de ${name}`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="post-header">
          <Avatar name={name} src={post.author?.avatar_url} />
          <div className="post-meta">
            <strong>{name}</strong>
            <time className="muted" dateTime={post.created_at}>
              {formatDate(post.created_at)}
            </time>
          </div>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Fechar
          </button>
        </header>

        {current && (
          <div className="viewer">
            <img
              className="post-image post-image-full"
              src={current.url}
              alt={post.caption || `Foto ${index + 1} de ${name}`}
            />
            {many && (
              <>
                <button type="button" className="viewer-nav viewer-prev" onClick={previous} aria-label="Foto anterior">
                  <Icon name="chevron-left" />
                </button>
                <button type="button" className="viewer-nav viewer-next" onClick={next} aria-label="Próxima foto">
                  <Icon name="chevron-right" />
                </button>
                <span className="viewer-counter" aria-live="polite">
                  {index + 1} / {images.length}
                </span>
              </>
            )}
          </div>
        )}

        {many && (
          <ul className="viewer-thumbs">
            {images.map((image, i) => (
              <li key={image.path}>
                <button
                  type="button"
                  className={`viewer-thumb ${i === index ? 'active' : ''}`}
                  onClick={() => setIndex(i)}
                  aria-label={`Ver foto ${i + 1}`}
                  aria-current={i === index}
                >
                  <img src={image.url} alt="" loading="lazy" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {post.caption && <p className="post-caption">{post.caption}</p>}

        {isOwner && adjusting && (
          <AdjustPanel
            title="Escolher a parte da miniatura"
            src={images[0].url}
            initialValue={post.imageCrop}
            onCancel={() => setAdjusting(false)}
            onSave={async (value) => {
              await onAdjust(post, value)
              setAdjusting(false)
            }}
          />
        )}

        {isOwner && (
          <div className="modal-actions">
            {onAdjust && images[0] && (
              <button type="button" className="btn btn-ghost" onClick={() => setAdjusting((v) => !v)} aria-expanded={adjusting}>
                Ajustar miniatura
              </button>
            )}
            <span className="spacer" />
            <button type="button" className="btn btn-danger-ghost" onClick={() => onDelete(post)}>
              {many ? 'Apagar lembrança e fotos' : 'Apagar lembrança'}
            </button>
          </div>
        )}
      </article>
    </div>
  )
}
