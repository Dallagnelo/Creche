import { useEffect } from 'react'
import { formatAge, formatBirthday, formatDate } from '../lib/format'
import Avatar from './Avatar'

/** Perfil de uma pessoa da turma, só para leitura. */
export default function ProfileModal({ profile, onClose }) {
  // Fecha com a tecla Esc.
  useEffect(() => {
    function handleKey(event) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const age = formatAge(profile.birth_date)

  // Só mostra os campos que a pessoa preencheu.
  const facts = [
    { label: 'Aniversário', value: formatBirthday(profile.birth_date) },
    { label: 'Jogo favorito', value: profile.favorite_game },
    { label: 'Filme favorito', value: profile.favorite_movie },
  ].filter((fact) => fact.value)

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <article
        className="card modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="profile-hero">
          <Avatar name={profile.display_name} src={profile.avatar_url} size={104} />
          <h2 id="profile-modal-title">{profile.display_name}</h2>
          <p className="muted">
            {[age, profile.city].filter(Boolean).join(' · ') || 'Ainda não preencheu o perfil'}
          </p>
        </header>

        {profile.bio && <p className="profile-bio">{profile.bio}</p>}

        {facts.length > 0 && (
          <dl className="facts">
            {facts.map((fact) => (
              <div key={fact.label}>
                <dt className="muted">{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
        )}

        <p className="muted hint">Na turma desde {formatDate(profile.created_at)}</p>

        <div className="modal-actions">
          <span className="spacer" />
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Fechar
          </button>
        </div>
      </article>
    </div>
  )
}
