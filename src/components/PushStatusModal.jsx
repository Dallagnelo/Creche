import { useEffect, useState } from 'react'
import { useBackClose } from '../lib/backClose'
import { backdropClose } from '../lib/backdrop'
import { listPushStatus } from '../services/notifications'
import Avatar from './Avatar'
import { Spinner } from './Feedback'

function since(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

/** Só admin: quem já ligou as notificações no aparelho (e em quantos aparelhos). */
export default function PushStatusModal({ onClose }) {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  useBackClose(onClose)
  useEffect(() => {
    listPushStatus().then(setRows, (err) => setError(err.message))
    const onKey = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const on = (rows ?? []).filter((row) => row.devices > 0)
  const off = (rows ?? []).filter((row) => row.devices === 0)

  return (
    <div className="modal-backdrop" {...backdropClose(onClose)}>
      <div className="card modal form-modal online-modal push-status-modal" role="dialog" aria-modal="true" aria-labelledby="push-status-title" onClick={(event) => event.stopPropagation()}>
        <div className="online-head">
          <h2 id="push-status-title">📲 Quem recebe no aparelho</h2>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Fechar
          </button>
        </div>
        {error ? (
          <p className="broadcast-error">{error}</p>
        ) : !rows ? (
          <Spinner label="Carregando..." />
        ) : (
          <>
            <p className="push-status-sum">
              <strong>{on.length}</strong> de <strong>{rows.length}</strong> pessoas ligaram as notificações.
            </p>
            <ul className="online-list push-status-list">
              {[...on, ...off].map((row) => (
                <li key={row.user_id} className={`online-item${row.devices ? '' : ' is-off'}`}>
                  <span className="online-photo">
                    <Avatar name={row.display_name} src={row.avatar_url} size={40} />
                  </span>
                  <span className="online-name">
                    {row.display_name}
                    <small className="muted push-status-detail">
                      {row.devices
                        ? `${row.devices} ${row.devices === 1 ? 'aparelho' : 'aparelhos'} · desde ${since(row.last_on)}`
                        : 'Só vê no sininho do site'}
                    </small>
                  </span>
                  <span className="push-status-mark" aria-label={row.devices ? 'Ligado' : 'Ainda não ligou'}>
                    {row.devices ? '✅' : '⏳'}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
