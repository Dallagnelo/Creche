import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Avatar from './Avatar'
import { GoingButton, TypeTag } from './EventBits'
import FormModal from './FormModal'
import { categoryColor, dateParts, formatTime, longDate, relativeLabel } from '../lib/events'

function EventMap({ address }) {
  const q = encodeURIComponent(address)
  return (
    <section aria-label="Mapa" className="evd-map">
      <p className="evd-address">{address}</p>
      <iframe
        title={`Mapa: ${address}`}
        src={`https://www.google.com/maps?q=${q}&output=embed`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
      <div className="evd-map-links">
        <a className="btn btn-ghost" href={`https://www.google.com/maps/search/?api=1&query=${q}`} target="_blank" rel="noopener noreferrer">
          Abrir no Google Maps
        </a>
        <a className="btn btn-ghost" href={`https://www.google.com/maps/dir/?api=1&destination=${q}`} target="_blank" rel="noopener noreferrer">
          Como chegar
        </a>
      </div>
    </section>
  )
}

/** Janela com os detalhes de um evento (abre por cima da página). */
export default function EventDetailModal({ event, userId, onToggle, onEdit, onDelete, onClose, showCalendarLink = true }) {
  const { isAdmin } = useAuth()
  const canManage = event.created_by === userId || isAdmin
  const going = event.attendees.some((item) => item.user_id === userId)
  const parts = dateParts(event.event_date)

  return (
    <FormModal label={`Evento: ${event.title}`} onClose={onClose} className="modal-event">
      <div className="evd" style={{ '--cat': categoryColor(event.category) }}>
        <header className="evd-head">
          <div className="home-event-date" aria-hidden="true">
            <span>{parts.weekday}</span>
            <strong>{parts.day}</strong>
            <span>{parts.month}</span>
          </div>
          <div className="evd-title">
            <p className="home-event-when">{relativeLabel(event.event_date)}</p>
            <h2>{event.title}</h2>
            <TypeTag category={event.category} />
          </div>
        </header>

        <div className={`evd-body${event.address ? ' has-map' : ''}`}>
          <div className="evd-col">
            <dl className="evd-info">
              <div>
            <dt>Quando</dt>
            <dd>
              {longDate(event.event_date)}
              {event.event_time ? ` · ${formatTime(event.event_time)}` : ''}
            </dd>
          </div>
          {event.place && (
            <div>
              <dt>Onde</dt>
              <dd>{event.place}</dd>
            </div>
          )}
          {event.creator?.display_name && (
            <div>
              <dt>Criado por</dt>
              <dd>{event.creator.display_name}</dd>
            </div>
          )}
        </dl>

        {event.notes && <p className="evd-notes">{event.notes}</p>}

        <section aria-label="Quem vai">
          <h3 className="evd-sub">Quem vai ({event.attendees.length})</h3>
          {event.attendees.length === 0 ? (
            <p className="muted">Ninguém confirmou ainda.</p>
          ) : (
            <ul className="evd-people">
              {event.attendees.map((item) => (
                <li key={item.user_id}>
                  <Avatar name={item.person?.display_name} src={item.person?.avatar_url} size={32} />
                  <span>{item.person?.display_name ?? 'Alguém'}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

          </div>
          {event.address && <EventMap address={event.address} />}
        </div>

        <div className="modal-actions">
          {showCalendarLink && (
            <Link to="/eventos" className="btn btn-ghost" onClick={onClose}>
              Ver no calendário
            </Link>
          )}
          <span className="spacer" />
          {onDelete && canManage && (
            <button type="button" className="btn btn-ghost evd-delete" onClick={() => onDelete(event)}>
              Apagar
            </button>
          )}
          {onEdit && canManage && (
            <button type="button" className="btn btn-ghost" onClick={() => onEdit(event)}>
              Editar
            </button>
          )}
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Fechar
          </button>
          <GoingButton event={event} going={going} onToggle={onToggle} />
        </div>
      </div>
    </FormModal>
  )
}
