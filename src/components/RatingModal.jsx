import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { todayISO } from '../lib/format'
import { deleteRating, saveRating } from '../services/movies'
import DateField from './DateField'
import { ErrorBox } from './Feedback'
import SheetTop from './SheetTop'
import StarRating from './StarRating'

/**
 * Janela para dar (ou editar) a nota de um filme.
 *  - movie: dados do filme
 *  - existing: nota que o usuário já deu antes (se houver)
 */
export default function RatingModal({ movie, existing, onClose, onSaved }) {
  const { user } = useAuth()
  const [score, setScore] = useState(existing?.score ?? null)
  const [comment, setComment] = useState(existing?.comment ?? '')
  const [watchedAt, setWatchedAt] = useState(existing?.watched_at ?? todayISO())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Fecha com a tecla Esc.
  useEffect(() => {
    function handleKey(event) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  async function handleSubmit(event) {
    event.preventDefault()

    setSaving(true)
    setError(null)
    try {
      await saveRating({ movie, score: score ?? 0, comment, watchedAt, userId: user.id })
      onSaved()
    } catch (err) {
      setError(err)
      setSaving(false)
    }
  }

  async function handleRemove() {
    if (!window.confirm('Remover a sua nota deste filme?')) return
    setSaving(true)
    try {
      await deleteRating(existing.id)
      onSaved()
    } catch (err) {
      setError(err)
      setSaving(false)
    }
  }

  return (
    // Clicar no fundo escuro fecha; clicar dentro da janela não propaga o clique.
    <div className="modal-backdrop" onClick={onClose}>
      <form
        className="modal card rating-modal sheet-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rating-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <SheetTop title="Sua avaliação" onClose={onClose} />
        <div className="sheet-body">
        <h2 id="rating-title">
          {movie.title}
          {movie.release_year && <span className="muted"> ({movie.release_year})</span>}
        </h2>

        <section className="rate-panel" aria-label="Sua nota">
          <StarRating value={score} onChange={setScore} size={52} />
          <p className="rate-readout" aria-live="polite">
            {score == null ? (
              <span className="muted"><span className="desk-only">Clique</span><span className="phone-only">Toque</span> ou arraste nas estrelas · para dar zero, vá até a esquerda das estrelas</span>
            ) : (
              <>
                <strong>{String(score).replace('.', ',')}</strong> <span className="muted">de 5</span>
              </>
            )}
          </p>
        </section>

        <div className="field">
          <span>Quando você viu?</span>
          <DateField value={watchedAt} max={todayISO()} ariaLabel="Quando você viu?" onChange={(event) => setWatchedAt(event.target.value || todayISO())} />
        </div>

        <label className="field">
          <span>Comentário (opcional)</span>
          <textarea
            rows={3}
            maxLength={500}
            placeholder="O que você achou?"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
          />
        </label>

        {error && <ErrorBox error={error} />}

        </div>

        <div className="modal-actions sheet-foot-actions">
          {existing && (
            <button type="button" className="btn btn-danger" onClick={handleRemove} disabled={saving}>
              Remover nota
            </button>
          )}
          <span className="spacer" />
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  )
}
