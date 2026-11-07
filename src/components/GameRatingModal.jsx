import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { deleteGameRating, saveGameRating } from '../services/gameRatings'
import { ErrorBox } from './Feedback'
import StarRating from './StarRating'

/**
 * Janela para dar (ou editar) a nota de um jogo.
 *  - game: dados do jogo
 *  - existing: nota que o usuário já deu antes (se houver)
 */
export default function GameRatingModal({ game, existing, onClose, onSaved }) {
  const { user } = useAuth()
  const [score, setScore] = useState(existing?.score ?? null)
  const [comment, setComment] = useState(existing?.comment ?? '')
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
    if (score == null) {
      setError(new Error('Escolha a nota: arraste sobre as estrelas ou toque no 0.'))
      return
    }

    setSaving(true)
    setError(null)
    try {
      await saveGameRating({ gameId: game.id, score, comment, userId: user.id })
      onSaved()
    } catch (err) {
      setError(err)
      setSaving(false)
    }
  }

  async function handleRemove() {
    if (!window.confirm('Remover a sua nota deste jogo?')) return
    setSaving(true)
    try {
      await deleteGameRating(existing.id)
      onSaved()
    } catch (err) {
      setError(err)
      setSaving(false)
    }
  }

  // Se a migração das notas ainda não foi rodada, a tabela não existe: avisamos com clareza.
  const missingTable = /game_ratings/i.test(error?.message ?? '')

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form
        className="modal card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-rating-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <h2 id="game-rating-title">
          {game.name}
          {game.platform && <span className="muted"> ({game.platform})</span>}
        </h2>

        <div className="field">
          <span>Sua nota</span>
          <StarRating value={score} onChange={setScore} size={34} />
          <small className="muted">
            {score == null ? 'Clique ou arraste sobre as estrelas (o 0 dá nota zero)' : `${String(score).replace('.', ',')} de 5`}
          </small>
        </div>

        <label className="field">
          <span>Comentário (opcional)</span>
          <textarea
            rows={3}
            maxLength={500}
            placeholder="O que você achou do jogo?"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
          />
        </label>

        {missingTable ? (
          <p className="muted">
            As notas dos jogos ainda não foram ativadas. Rode o arquivo <code>migracao-notas-jogos.sql</code> no Supabase.
          </p>
        ) : (
          error && <ErrorBox error={error} />
        )}

        <div className="modal-actions">
          {existing && (
            <button type="button" className="btn btn-danger-ghost" onClick={handleRemove} disabled={saving}>
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
