import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { todayISO } from '../lib/format'
import { saveRating } from '../services/movies'
import { ErrorBox } from './Feedback'
import StarRating from './StarRating'

// Sua nota direto no detalhe do filme (celular): estrelas, comentário e o botão "Salvar avaliação" fixo embaixo.
export default function InlineRating({ movie, existing, formId, onSaved }) {
  const { user } = useAuth()
  const [score, setScore] = useState(existing?.score ?? null)
  const [comment, setComment] = useState(existing?.comment ?? '')
  const [error, setError] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    if (score == null) {
      setError(new Error('Escolha a nota: toque ou arraste sobre as estrelas.'))
      return
    }
    setError(null)
    try {
      await saveRating({ movie, score, comment, watchedAt: existing?.watched_at ?? todayISO(), userId: user.id })
      onSaved?.()
    } catch (err) {
      setError(err)
    }
  }

  return (
    <form id={formId} className="inline-rating" onSubmit={handleSubmit}>
      <section aria-label="Sua nota">
        <span className="screen-label">Sua nota</span>
        <div className="inline-stars">
          <StarRating value={score} onChange={setScore} size={40} />
        </div>
      </section>
      <label className="field">
        <span className="screen-name-label">Seu comentário</span>
        <textarea rows={3} maxLength={500} placeholder="O que você achou?" value={comment} onChange={(event) => setComment(event.target.value)} />
      </label>
      {error && <ErrorBox error={error} />}
    </form>
  )
}
