import { useEffect, useRef, useState } from 'react'
import { DEFAULT_CROP } from '../lib/imageCrop'
import { ErrorBox } from './Feedback'
import ImageCropper from './ImageCropper'

/**
 * Edição de um jogo (só o dono vê). Nome, plataforma e anotações; a capa só muda se escolher uma imagem nova
 * (para só mexer no enquadramento da capa atual, existe o "Ajustar capa").
 *  - onSave({ name, platform, notes, file, coverCrop }) devolve uma Promise; erros aparecem aqui.
 */
export default function GameEditForm({ game, onSave, onCancel }) {
  const [name, setName] = useState(game.name)
  const [platform, setPlatform] = useState(game.platform ?? '')
  const [notes, setNotes] = useState(game.notes ?? '')
  const [file, setFile] = useState(null)
  const [crop, setCrop] = useState(DEFAULT_CROP)
  const [preview, setPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (!file) {
      setPreview(null)
      return undefined
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  function handleChoose(event) {
    setFile(event.target.files?.[0] ?? null)
    setCrop(DEFAULT_CROP)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await onSave({ name, platform, notes, file, coverCrop: crop })
    } catch (err) {
      setError(err)
      setSaving(false)
    }
  }

  return (
    <form className="form game-edit" onSubmit={handleSubmit}>
      <h3>Editar jogo</h3>

      <div className="form-row">
        <label className="field">
          <span>Nome do jogo</span>
          <input type="text" required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="field">
          <span>Plataforma (opcional)</span>
          <input type="text" maxLength={50} value={platform} onChange={(event) => setPlatform(event.target.value)} />
        </label>
      </div>

      <label className="field">
        <span>Anotações (opcional)</span>
        <textarea rows={3} maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} />
      </label>

      <div className="field">
        <span>Capa</span>
        {preview && <ImageCropper src={preview} value={crop} onChange={setCrop} />}
        <label className="btn btn-ghost adjuster-change">
          {preview ? 'Escolher outra imagem' : game.coverUrl ? 'Trocar a capa' : 'Adicionar capa'}
          <input
            ref={fileInputRef}
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            aria-label="Escolher nova capa do jogo"
            onChange={handleChoose}
          />
        </label>
      </div>

      {error && <ErrorBox error={error} />}

      <div className="modal-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>
          Cancelar
        </button>
        <span className="spacer" />
        <button type="submit" className="btn btn-primary" disabled={!name.trim() || saving}>
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </div>
    </form>
  )
}
