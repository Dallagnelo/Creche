import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { formatDate } from '../lib/format'
import { addGamePhoto, deleteGamePhoto, listGamePhotos, MAX_PHOTOS_PER_PERSON } from '../services/gamePhotos'
import Avatar from './Avatar'
import { ErrorBox, Spinner } from './Feedback'
import Icon from './Icon'
import { useBackClose } from '../lib/backClose'
import { backdropClose } from '../lib/backdrop'

// A foto não oferece download: sem link para salvar, sem arrastar e sem menu do botão direito.
// (Quem quiser mesmo ainda consegue tirar um print, como em qualquer site.)
const blockSave = (event) => event.preventDefault()
const VISIBLE_PHOTOS = 3 // quantas miniaturas aparecem de início, lado a lado

function Lightbox({ photo, canDelete, onDelete, onClose }) {
  useBackClose(onClose)
  useEffect(() => {
    // Esc fecha só a foto (capture + stopImmediatePropagation impedem que o Esc feche também a janela do jogo).
    function handleKey(event) {
      if (event.key !== 'Escape') return
      event.stopImmediatePropagation()
      onClose()
    }
    window.addEventListener('keydown', handleKey, true)
    return () => window.removeEventListener('keydown', handleKey, true)
  }, [onClose])

  const name = photo.author?.display_name ?? 'Alguém'
  return (
    <div className="photo-lightbox" role="dialog" aria-modal="true" aria-label="Foto em tamanho real" {...backdropClose(onClose)}>
      <figure className="photo-lightbox-box" onClick={(event) => event.stopPropagation()}>
        <img src={photo.url} alt={`Foto de ${name}`} draggable={false} onContextMenu={blockSave} />
        <figcaption>
          <Avatar name={name} src={photo.author?.avatar_url} size={24} />
          <span>
            {name} <span className="muted">· {formatDate(photo.created_at)}</span>
          </span>
          <span className="photo-lightbox-actions">
            {canDelete && (
              <button type="button" className="btn btn-danger" onClick={() => onDelete(photo)}>
                <Icon name="trash" />
                Apagar
              </button>
            )}
            <button type="button" className="btn" onClick={onClose}>
              Fechar
            </button>
          </span>
        </figcaption>
      </figure>
    </div>
  )
}

/** Galeria de fotos de um jogo: miniaturas quadradas; clicar abre a foto em tamanho real. */
export default function GamePhotos({ gameId, onControl }) {
  const { user, isAdmin } = useAuth()
  const fetchPhotos = useCallback(() => listGamePhotos(gameId), [gameId])
  const { data: photos, loading, error, reload } = useAsyncData(fetchPhotos)
  const [opened, setOpened] = useState(null)
  const [showAll, setShowAll] = useState(false)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState(null)
  const fileRef = useRef(null)

  const missingTable = /game_photos/i.test(error?.message ?? '')
  const mineCount = photos?.filter((photo) => photo.user_id === user.id).length ?? 0
  const full = mineCount >= MAX_PHOTOS_PER_PERSON
  const hasPhotos = (photos?.length ?? 0) > 0
  const openedPhoto = photos?.find((photo) => photo.id === opened) ?? null

  // Entrega ao detalhe do jogo o botão "Adicionar foto" (fica na mesma linha dos outros botões).
  useEffect(() => {
    onControl?.({ open: () => fileRef.current?.click(), busy, full, disabled: missingTable })
  }, [onControl, busy, full, missingTable])

  async function handleFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setBusy(true)
    setActionError(null)
    try {
      await addGamePhoto({ gameId, userId: user.id, file })
      await reload()
    } catch (err) {
      setActionError(err)
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(photo) {
    if (!window.confirm('Apagar esta foto?')) return
    setActionError(null)
    try {
      await deleteGamePhoto(photo)
      setOpened(null)
      await reload()
    } catch (err) {
      setActionError(err)
    }
  }

  // Sem nenhuma foto, a galeria não ocupa espaço nenhum: só o campo escondido que o botão "Adicionar foto" usa.
  if (!hasPhotos && !missingTable) {
    return (
      <>
        <input ref={fileRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Escolher foto" onChange={handleFile} />
        {error && <ErrorBox error={error} onRetry={reload} />}
        {actionError && <ErrorBox error={actionError} />}
      </>
    )
  }

  return (
    <section className="modal-section" aria-labelledby="game-photos">
      <div className="photos-head">
        <h3 id="game-photos">Fotos</h3>
        {!missingTable && (
          <>
            <input
              ref={fileRef}
              className="sr-only"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-label="Escolher foto"
              onChange={handleFile}
            />
          </>
        )}
      </div>

      {missingTable ? (
        <p className="muted">
          As fotos dos jogos ainda não foram ativadas. Rode o arquivo <code>migracao-fotos-jogos.sql</code> no Supabase.
        </p>
      ) : (
        <>
          {error && <ErrorBox error={error} onRetry={reload} />}
          {loading && !photos && <Spinner label="Carregando fotos..." />}
          {photos?.length === 0 && <p className="muted">Nenhuma foto ainda. Que tal deixar um print de recordação?</p>}

          {photos?.length > 0 && (
            <ul className="game-photos">
              {(showAll ? photos : photos.slice(0, VISIBLE_PHOTOS)).map((photo) => (
                <li key={photo.id}>
                  <button
                    type="button"
                    className="game-photo"
                    aria-label={`Abrir foto de ${photo.author?.display_name ?? 'alguém'}`}
                    onClick={() => setOpened(photo.id)}
                  >
                    {photo.thumbUrl && (
                      <img src={photo.thumbUrl} alt="" loading="lazy" draggable={false} onContextMenu={blockSave} />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {photos?.length > VISIBLE_PHOTOS && (
            <button type="button" className="btn photos-more" aria-expanded={showAll} onClick={() => setShowAll((value) => !value)}>
              {showAll ? 'Mostrar menos' : `Ver mais ${photos.length - VISIBLE_PHOTOS} ${photos.length - VISIBLE_PHOTOS === 1 ? 'foto' : 'fotos'}`}
            </button>
          )}

          {actionError && <ErrorBox error={actionError} />}
        </>
      )}

      {openedPhoto && (
        <Lightbox
          photo={openedPhoto}
          canDelete={openedPhoto.user_id === user.id || isAdmin}
          onDelete={handleDelete}
          onClose={() => setOpened(null)}
        />
      )}
    </section>
  )
}
