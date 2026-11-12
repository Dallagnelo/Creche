import { useCallback, useEffect, useRef, useState } from 'react'
import { addAlbumPhotos, deleteAlbumPhoto, MAX_ALBUM_PHOTOS, MAX_PER_UPLOAD } from '../services/albums'
import { formatDate } from '../lib/format'
import Avatar from './Avatar'
import { ErrorBox } from './Feedback'
import Icon from './Icon'
import { useBackClose } from '../lib/backClose'

const isPhone = () => window.matchMedia('(max-width: 700px)').matches
const MAX_DOTS = 12

// Álbum aberto: todas as fotos num carrossel que dá para arrastar (mouse ou dedo), setas, teclado e miniaturas.
// No celular é uma tela cheia (voltar, ⋯ com as opções, barra "Adicionar fotos" fixa embaixo).
export default function AlbumModal({ album, userId, isAdmin, onClose, onEdit, onDelete, onChanged }) {
  const creator = album.author?.display_name ?? 'Alguém'
  const photos = album.photos
  const canManage = album.created_by === userId || isAdmin
  const [index, setIndex] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [sheet, setSheet] = useState(false)
  const trackRef = useRef(null)
  const fileRef = useRef(null)
  const drag = useRef(null)
  const justDragged = useRef(false)
  const [dragging, setDragging] = useState(false)

  const slides = () => Array.from(trackRef.current?.children ?? [])
  const canDeletePhoto = (photo) => Boolean(photo) && (photo.added_by === userId || canManage) && photo.path !== album.cover_path

  // Qual foto está "no ponto de parada": o centro no computador, a margem esquerda no celular.
  function nearestIndex() {
    const track = trackRef.current
    if (!track) return 0
    const phone = isPhone()
    const point = phone ? track.scrollLeft + 16 : track.scrollLeft + track.clientWidth / 2
    let best = 0
    let bestDistance = Infinity
    slides().forEach((slide, i) => {
      const at = phone ? slide.offsetLeft : slide.offsetLeft + slide.offsetWidth / 2
      const distance = Math.abs(at - point)
      if (distance < bestDistance) {
        bestDistance = distance
        best = i
      }
    })
    return best
  }

  const goTo = useCallback((target) => {
    const list = Array.from(trackRef.current?.children ?? [])
    const slide = list[Math.max(0, Math.min(list.length - 1, target))]
    if (!slide) return
    const track = trackRef.current
    const phone = isPhone()
    const left = phone ? slide.offsetLeft - 16 : slide.offsetLeft - (track.clientWidth - slide.offsetWidth) / 2
    track.scrollTo({ left, behavior: 'smooth' })
  }, [])

  // Efeito de profundidade (computador e celular): cada foto recebe a distância até o centro (--p, --a) e o CSS
  // inclina, encolhe e escurece as vizinhas. Isso roda enquanto o carrossel anda, então acompanha o mouse.
  const applyDepth = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    const phone = isPhone()
    const center = track.scrollLeft + track.clientWidth / 2
    for (const slide of track.children) {
      const width = slide.offsetWidth + 16
      // celular: a foto atual fica encostada à esquerda (16px), então a distância é medida dali
      const raw = phone ? (slide.offsetLeft - track.scrollLeft - 16) / width : (slide.offsetLeft + slide.offsetWidth / 2 - center) / width
      const p = Math.max(-1.6, Math.min(1.6, raw))
      slide.style.setProperty('--p', p.toFixed(3))
      slide.style.setProperty('--a', Math.min(1, Math.abs(p)).toFixed(3))
    }
  }, [])

  const handleScroll = () => {
    setIndex(nearestIndex())
    requestAnimationFrame(applyDepth)
  }

  useEffect(() => {
    applyDepth()
    window.addEventListener('resize', applyDepth)
    return () => window.removeEventListener('resize', applyDepth)
  }, [applyDepth, photos.length])

  // Roda do mouse: cada "clique" passa uma foto (com deslize suave).
  const wheelLock = useRef(0)
  function onWheel(event) {
    if (isPhone() || photos.length < 2) return
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
    if (Math.abs(delta) < 8) return
    event.preventDefault()
    const now = Date.now()
    if (now - wheelLock.current < 380) return
    wheelLock.current = now
    goTo(index + (delta > 0 ? 1 : -1))
  }

  // Mouse: arrastar com o botão apertado. (No celular o próprio dedo já rola o carrossel.)
  function onPointerDown(event) {
    if (event.pointerType !== 'mouse' || event.button !== 0) return
    drag.current = { x: event.clientX, left: trackRef.current.scrollLeft, active: false }
  }
  function onPointerMove(event) {
    const state = drag.current
    if (!state) return
    const dx = event.clientX - state.x
    if (!state.active && Math.abs(dx) > 5) {
      state.active = true
      setDragging(true)
      trackRef.current.setPointerCapture(event.pointerId)
    }
    if (state.active) trackRef.current.scrollLeft = state.left - dx
  }
  function endDrag() {
    const state = drag.current
    drag.current = null
    if (!state?.active) return
    justDragged.current = true
    setTimeout(() => (justDragged.current = false), 0)
    setDragging(false)
    requestAnimationFrame(() => {
      const nearest = nearestIndex()
      setIndex(nearest)
      goTo(nearest)
    })
  }

  useBackClose(onClose)

  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape') {
        if (sheet) setSheet(false)
        else onClose()
      }
      if (event.key === 'ArrowLeft') goTo(index - 1)
      if (event.key === 'ArrowRight') goTo(index + 1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, goTo, index, sheet])

  // A miniatura da foto atual fica visível na faixa de baixo.
  useEffect(() => {
    document.querySelector('.album-thumb.active')?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [index])

  async function handleAdd(event) {
    const files = Array.from(event.target.files ?? []).filter((file) => file.type.startsWith('image/'))
    event.target.value = ''
    setSheet(false)
    if (files.length === 0) return
    setBusy(true)
    setError(null)
    try {
      await addAlbumPhotos({ album, files: files.slice(0, MAX_PER_UPLOAD), userId })
      if (files.length > MAX_PER_UPLOAD) setError(new Error(`Foram enviadas ${MAX_PER_UPLOAD} fotos. Dá para enviar até ${MAX_PER_UPLOAD} de cada vez.`))
      await onChanged()
      setTimeout(() => goTo(album.photos.length), 150) // vai para a primeira foto nova
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  async function handleDeletePhoto(photo) {
    setSheet(false)
    if (!window.confirm('Apagar esta foto do álbum?')) return
    setBusy(true)
    setError(null)
    try {
      await deleteAlbumPhoto(photo)
      await onChanged()
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  const full = photos.length >= MAX_ALBUM_PHOTOS
  const current = photos[index]
  const countLabel = `${photos.length} ${photos.length === 1 ? 'foto' : 'fotos'}`

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <article
        className="card modal modal-wide album-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Álbum ${album.title}`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="album-head">
          <button type="button" className="album-back" onClick={onClose} aria-label="Voltar">
            <Icon name="chevron-left" />
          </button>
          <span className="album-head-avatar">
            <Avatar name={creator} src={album.author?.avatar_url} />
          </span>
          <div className="album-head-text">
            <strong>{album.title}</strong>
            <span className="muted sub-long">
              {creator} criou em {formatDate(album.created_at)} · {countLabel}
            </span>
            <span className="muted sub-short">
              {creator} criou · {countLabel}
            </span>
          </div>
          <button type="button" className="album-more" onClick={() => setSheet(true)} aria-label="Mais opções" aria-haspopup="dialog">
            <Icon name="more" />
          </button>
          <div className="album-head-actions">
            <button type="button" className="btn btn-primary" onClick={() => fileRef.current.click()} disabled={busy || full}>
              <Icon name="plus" /> {busy ? 'Enviando...' : 'Adicionar fotos'}
            </button>
            {canManage && (
              <button type="button" className="btn btn-ghost" onClick={() => onEdit(album)} disabled={busy}>
                Editar
              </button>
            )}
            {canManage && (
              <button type="button" className="btn btn-danger" onClick={() => onDelete(album)} disabled={busy}>
                <Icon name="trash" /> Apagar álbum
              </button>
            )}
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Fechar
            </button>
          </div>
        </header>
        <input ref={fileRef} className="sr-only" type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleAdd} />

        <div className="album-body">
          {error && <ErrorBox error={error} />}

          <div className="album-stage">
            <ul
              ref={trackRef}
              className={`album-track ${dragging ? 'is-dragging' : ''}`}
              onScroll={handleScroll}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onClickCapture={(event) => {
                if (justDragged.current) {
                  event.preventDefault()
                  event.stopPropagation()
                }
              }}
              onWheel={onWheel}
              aria-label="Fotos do álbum"
            >
              {photos.map((photo, i) => {
                const who = photo.adder?.display_name ?? 'Alguém'
                return (
                  <li key={photo.id} className={`album-slide ${i === index ? 'is-current' : ''}`} aria-label={`Foto ${i + 1} de ${photos.length}`} onClick={() => i !== index && goTo(i)}>
                    <div className="album-photo">
                      <img src={photo.url} alt={`Foto ${i + 1} de ${who}`} draggable={false} />
                    </div>
                    <div className="album-slide-foot">
                      <Avatar name={who} src={photo.adder?.avatar_url} size={28} />
                      <span>
                        Foto de <b>{who}</b>
                      </span>
                      {canDeletePhoto(photo) && (
                        <button type="button" className="btn btn-danger album-photo-delete" onClick={() => handleDeletePhoto(photo)} disabled={busy} aria-label={`Apagar a foto ${i + 1}`}>
                          <Icon name="trash" /> Apagar
                        </button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
            {photos.length > 1 && (
              <>
                <button type="button" className="viewer-nav viewer-prev" onClick={() => goTo(index - 1)} aria-label="Foto anterior" disabled={index === 0}>
                  <Icon name="chevron-left" />
                </button>
                <button type="button" className="viewer-nav viewer-next" onClick={() => goTo(index + 1)} aria-label="Próxima foto" disabled={index === photos.length - 1}>
                  <Icon name="chevron-right" />
                </button>
              </>
            )}
          </div>

          <div className="album-meta" aria-live="polite">
            <span className="album-counter">
              {index + 1} / {photos.length}
            </span>
            {photos.length > 1 && photos.length <= MAX_DOTS && (
              <span className="album-dots" aria-hidden="true">
                {photos.map((photo, i) => (
                  <i key={photo.id} className={i === index ? 'on' : ''} />
                ))}
              </span>
            )}
          </div>

          {photos.length > 1 && (
            <p className="album-drag-hint">
              <Icon name="drag" /> Arraste para o lado
            </p>
          )}

          {photos.length > 1 && (
            <ul className="viewer-thumbs">
              {photos.map((photo, i) => (
                <li key={photo.id}>
                  <button type="button" className={`viewer-thumb album-thumb ${i === index ? 'active' : ''}`} onClick={() => goTo(i)} aria-label={`Ver foto ${i + 1}`} aria-current={i === index}>
                    <img src={photo.url} alt="" loading="lazy" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="album-add-bar">
          <button type="button" className="btn btn-primary" onClick={() => fileRef.current.click()} disabled={busy || full}>
            <Icon name="plus" /> {busy ? 'Enviando...' : 'Adicionar fotos ao álbum'}
          </button>
        </div>

        {sheet && (
          <>
            <div className="album-sheet-backdrop" onClick={() => setSheet(false)} />
            <div className="album-sheet" role="dialog" aria-label="Opções do álbum">
              <span className="album-sheet-handle" aria-hidden="true" />
              {canManage && (
                <button type="button" className="album-sheet-item" onClick={() => { setSheet(false); onEdit(album) }}>
                  <Icon name="edit" /> Mudar nome e capa
                </button>
              )}
              <button type="button" className="album-sheet-item" onClick={() => fileRef.current.click()} disabled={busy || full}>
                <Icon name="plus" /> Adicionar fotos
              </button>
              {canDeletePhoto(current) && (
                <button type="button" className="album-sheet-item is-danger" onClick={() => handleDeletePhoto(current)}>
                  <Icon name="trash" /> Apagar esta foto
                </button>
              )}
              {canManage && (
                <button type="button" className="album-sheet-item is-danger" onClick={() => { setSheet(false); onDelete(album) }}>
                  <Icon name="trash" /> Apagar álbum inteiro
                </button>
              )}
              <p className="album-sheet-note">Quem criou o álbum e o admin mexem em tudo. Cada pessoa só apaga as fotos que enviou.</p>
            </div>
          </>
        )}
      </article>
    </div>
  )
}
