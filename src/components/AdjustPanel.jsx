import { useState } from 'react'
import ImageCropper from './ImageCropper'
import { ErrorBox } from './Feedback'

// Painel "Ajustar imagem" para quem já postou: mostra o recorte e salva a escolha.
export default function AdjustPanel({ title, src, initialValue, onSave, onCancel }) {
  const [value, setValue] = useState(initialValue)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      await onSave(value)
    } catch (err) {
      setError(err)
      setSaving(false)
    }
  }

  return (
    <section className="modal-section adjust-panel" aria-label={title}>
      <h3>{title}</h3>
      <ImageCropper src={src} value={value} onChange={setValue} />
      {error && <ErrorBox error={error} />}
      <div className="adjuster-actions">
        <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar recorte'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>
          Cancelar
        </button>
      </div>
    </section>
  )
}
