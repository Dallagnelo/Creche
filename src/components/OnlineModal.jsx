import { useEffect } from 'react'
import { useBackClose } from '../lib/backClose'
import Avatar from './Avatar'

// Lista de quem está online agora (foto e nome). Fecha com Esc, clicando fora ou no botão.
export default function OnlineModal({ online, meId, onClose }) {
  useBackClose(onClose)
  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="card modal form-modal online-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="online-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="online-head">
          <h2 id="online-title">
            Online agora <span className="muted">({online.length})</span>
          </h2>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Fechar
          </button>
        </div>
        {online.length === 0 ? (
          <p className="muted">Ninguém online no momento.</p>
        ) : (
          <ul className="online-list">
            {online.map((person) => (
              <li key={person.userId} className="online-item">
                <span className="online-photo">
                  <Avatar name={person.name} src={person.avatarUrl} size={44} />
                  <span className="online-dot" aria-hidden="true" />
                </span>
                <span className="online-name">
                  {person.name}
                  {person.userId === meId && <span className="muted"> (você)</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
