import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { DEFAULT_CROP } from '../lib/imageCrop'
import { createPost, MAX_PHOTOS_PER_POST } from '../services/posts'
import { ErrorBox } from './Feedback'
import Icon from './Icon'
import ImageCropper from './ImageCropper'

// Formulário "controlado": o React guarda o valor de cada campo em um state.
// Aqui cada item de `items` é uma foto escolhida: { id, file, url da miniatura }.
export default function PostForm({ onCreated }) {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [caption, setCaption] = useState('')
  const [crop, setCrop] = useState(DEFAULT_CROP) // recorte da miniatura (1ª foto)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  // Guarda sempre a lista mais recente para liberar a memória das miniaturas ao sair da página.
  const itemsRef = useRef(items)
  itemsRef.current = items
  useEffect(() => () => itemsRef.current.forEach((item) => URL.revokeObjectURL(item.url)), [])

  /** Adiciona as fotos escolhidas às que já estavam na lista (até o limite). */
  function handleChoose(event) {
    const chosen = Array.from(event.target.files ?? []).filter((file) => file.type.startsWith('image/'))
    event.target.value = '' // permite escolher a mesma foto de novo depois

    const room = MAX_PHOTOS_PER_POST - items.length
    const added = chosen.slice(0, Math.max(room, 0)).map((file) => ({
      id: crypto.randomUUID(),
      file,
      url: URL.createObjectURL(file),
    }))

    setError(
      chosen.length > room
        ? new Error(`Cada lembrança pode ter no máximo ${MAX_PHOTOS_PER_POST} fotos.`)
        : null,
    )
    setItems((current) => [...current, ...added])
  }

  function handleRemove(id) {
    const item = items.find((entry) => entry.id === id)
    if (item) URL.revokeObjectURL(item.url)
    if (items[0]?.id === id) setCrop(DEFAULT_CROP)
    setItems((current) => current.filter((entry) => entry.id !== id))
  }

  async function handleSubmit(event) {
    event.preventDefault() // impede o navegador de recarregar a página
    if (items.length === 0) return

    setSaving(true)
    setError(null)
    try {
      await createPost({ files: items.map((item) => item.file), caption, imageCrop: crop, userId: user.id })
      items.forEach((item) => URL.revokeObjectURL(item.url))
      setItems([])
      setCaption('')
      setCrop(DEFAULT_CROP)
      onCreated()
    } catch (err) {
      setError(err)
    } finally {
      setSaving(false)
    }
  }

  const hasItems = items.length > 0
  const full = items.length >= MAX_PHOTOS_PER_POST

  return (
    <form className="card form panel" onSubmit={handleSubmit}>
      <h2>Nova lembrança</h2>

      {/* O input de arquivo fica escondido; os <label> abaixo funcionam como botões. */}
      <input
        ref={fileInputRef}
        id="post-files"
        className="sr-only"
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleChoose}
      />

      {!hasItems && (
        <label htmlFor="post-files" className="dropzone">
          <Icon name="camera" />
          <strong>Escolher fotos</strong>
          <span className="muted">
            Dá para escolher várias de uma vez (até {MAX_PHOTOS_PER_POST}). JPG, PNG, WEBP ou GIF, até 10 MB cada.
          </span>
        </label>
      )}

      {hasItems && (
        <div className="picked">
          <p className="muted picked-count">
            {items.length} {items.length === 1 ? 'foto escolhida' : 'fotos escolhidas'}
            {items.length > 1 && ' · a primeira é a capa'}
          </p>
          <ul className="picked-grid">
            {items.map((item, index) => (
              <li key={item.id} className="picked-item">
                <img src={item.url} alt={`Foto ${index + 1} escolhida`} />
                <button
                  type="button"
                  className="picked-remove"
                  onClick={() => handleRemove(item.id)}
                  aria-label={`Remover foto ${index + 1}`}
                  disabled={saving}
                >
                  <Icon name="close" />
                </button>
              </li>
            ))}
            {!full && (
              <li>
                <label htmlFor="post-files" className="picked-add" title="Adicionar mais fotos">
                  <Icon name="plus" />
                  <span className="sr-only">Adicionar mais fotos</span>
                </label>
              </li>
            )}
          </ul>
        </div>
      )}

      {hasItems && (
        <div className="field">
          <span>Escolha a parte que aparece na miniatura</span>
          <ImageCropper key={items[0].id} src={items[0].url} value={crop} onChange={setCrop} />
        </div>
      )}

      <label className="field">
        <span>Legenda (opcional)</span>
        <textarea
          rows={2}
          maxLength={500}
          placeholder="Conta o que rolou nessas fotos..."
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
        />
      </label>

      {error && <ErrorBox error={error} />}

      <button type="submit" className="btn btn-primary" disabled={!hasItems || saving}>
        {saving
          ? 'Enviando...'
          : items.length > 1
            ? `Postar ${items.length} fotos`
            : 'Postar'}
      </button>
    </form>
  )
}
