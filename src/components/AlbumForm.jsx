import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { DEFAULT_CROP } from '../lib/imageCrop'
import { createAlbum, MAX_ALBUM_PHOTOS, MAX_PER_UPLOAD, updateAlbum } from '../services/albums'
import { ErrorBox } from './Feedback'
import Icon from './Icon'
import ImageCropper from './ImageCropper'

// Criar um álbum novo (capa obrigatória) ou editar nome e capa de um que já existe.
export default function AlbumForm({ album, onCancel, onSaved, onDelete }) {
  const { user } = useAuth()
  const editing = Boolean(album)
  const [title, setTitle] = useState(album?.title ?? '')
  const [cover, setCover] = useState(null) // { file, url } quando escolheu uma foto nova
  const [crop, setCrop] = useState(album?.coverCrop ?? DEFAULT_CROP)
  const [extras, setExtras] = useState([]) // fotos opcionais (só ao criar)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const urlsRef = useRef([])
  urlsRef.current = [cover?.url, ...extras.map((item) => item.url)].filter(Boolean)
  useEffect(() => () => urlsRef.current.forEach((url) => URL.revokeObjectURL(url)), [])

  const coverSrc = cover?.url ?? album?.coverUrl ?? null

  function pickCover(event) {
    const file = Array.from(event.target.files ?? []).find((f) => f.type.startsWith('image/'))
    event.target.value = ''
    if (!file) return
    if (cover) URL.revokeObjectURL(cover.url)
    setCover({ file, url: URL.createObjectURL(file) })
    setCrop(DEFAULT_CROP)
  }

  function pickExtras(event) {
    const chosen = Array.from(event.target.files ?? []).filter((f) => f.type.startsWith('image/'))
    event.target.value = ''
    const room = Math.min(MAX_PER_UPLOAD, MAX_ALBUM_PHOTOS - 1) - extras.length
    setError(chosen.length > room ? new Error(`Dá para colocar até ${Math.min(MAX_PER_UPLOAD, MAX_ALBUM_PHOTOS - 1)} fotos agora. As outras entram depois, pelo álbum.`) : null)
    const added = chosen.slice(0, Math.max(room, 0)).map((file) => ({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file) }))
    setExtras((current) => [...current, ...added])
  }

  function removeExtra(id) {
    const item = extras.find((entry) => entry.id === id)
    if (item) URL.revokeObjectURL(item.url)
    setExtras((current) => current.filter((entry) => entry.id !== id))
  }

  const canSave = title.trim().length > 0 && Boolean(coverSrc) && !saving

  async function handleSubmit(event) {
    event.preventDefault()
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      if (editing) {
        await updateAlbum({ album, title, coverFile: cover?.file, coverCrop: crop, userId: user.id })
      } else {
        await createAlbum({ title, coverFile: cover.file, coverCrop: crop, files: extras.map((item) => item.file), userId: user.id })
      }
      onSaved()
    } catch (err) {
      setError(err)
      setSaving(false)
    }
  }

  return (
    <form className="album-screen" onSubmit={handleSubmit}>
      <header className="screen-head">
        <button type="button" className="screen-close" onClick={onCancel} disabled={saving} aria-label="Fechar">
          <Icon name="close" />
        </button>
        <h2>{editing ? 'Editar álbum' : 'Novo álbum'}</h2>
      </header>

      <div className="screen-body">
        <label className="field">
          <span className="screen-name-label">Nome do álbum</span>
          <input
            type="text"
            maxLength={80}
            placeholder="Ex.: Halloween da turma"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </label>

        <input id="album-cover" className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={pickCover} />
        <section className="screen-block" aria-label="Capa do álbum">
          <div className="screen-block-head">
            <span className="screen-label">Capa</span>
            <b className="album-required">Obrigatória</b>
          </div>
          {coverSrc ? (
            <>
              <div className="album-cover-frame">
                <ImageCropper key={coverSrc} src={coverSrc} value={crop} onChange={setCrop} />
                <label htmlFor="album-cover" className="album-cover-change">
                  <Icon name="photos" /> Trocar capa
                </label>
              </div>
              <p className="muted album-cover-hint">Toque e arraste a foto para escolher a parte que aparece no mural.</p>
            </>
          ) : (
            <label htmlFor="album-cover" className="dropzone">
              <Icon name="camera" />
              <strong>Escolher a capa</strong>
              <span className="muted">É a foto que aparece no mural. JPG, PNG, WEBP ou GIF, até 10 MB.</span>
            </label>
          )}
        </section>

        {!editing && (
          <section className="screen-block" aria-label="Fotos do álbum">
            <input id="album-extras" className="sr-only" type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" onChange={pickExtras} />
            <span className="screen-label">Fotos (opcional)</span>
            <ul className="picked-grid album-picked">
              {extras.map((item, index) => (
                <li key={item.id} className="picked-item">
                  <img src={item.url} alt={`Foto ${index + 1} escolhida`} />
                  <button type="button" className="picked-remove" onClick={() => removeExtra(item.id)} aria-label={`Remover foto ${index + 1}`} disabled={saving}>
                    <Icon name="close" />
                  </button>
                </li>
              ))}
              <li>
                <label htmlFor="album-extras" className="picked-add" title="Adicionar fotos">
                  <Icon name="plus" />
                  <span className="sr-only">Adicionar fotos</span>
                </label>
              </li>
            </ul>
          </section>
        )}

        {error && <ErrorBox error={error} />}

        {editing && onDelete && (
          <button type="button" className="btn btn-danger album-delete" onClick={() => onDelete(album)} disabled={saving}>
            <Icon name="trash" /> Apagar álbum inteiro
          </button>
        )}
      </div>

      <div className="screen-foot">
        <button type="submit" className="btn btn-primary screen-submit" disabled={!canSave}>
          {saving ? 'Salvando...' : editing ? 'Salvar' : 'Criar álbum'}
        </button>
        {!coverSrc && !saving && <span className="muted screen-foot-hint">Escolha a capa do álbum</span>}
      </div>
    </form>
  )
}
