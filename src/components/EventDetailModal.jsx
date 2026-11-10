import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Avatar from './Avatar'
import { GoingButton, TypeTag } from './EventBits'
import FormModal from './FormModal'
import Icon from './Icon'
import SheetTop from './SheetTop'
import { categoryColor, dateParts, formatTime, hasEnded, longDate, relativeLabel } from '../lib/events'

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
    <FormModal label={`Evento: ${event.title}`} onClose={onClose} className="modal-event sheet-modal">
      <SheetTop title={event.title} onClose={onClose} />
      <div className="sheet-body evd-phone">
        {event.address ? (
          <iframe
            className="evd-phone-map"
            title={`Mapa: ${event.address}`}
            src={`https://www.google.com/maps?q=${encodeURIComponent(event.address)}&output=embed`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : (
          <div className="evd-phone-map evd-phone-map-empty" aria-hidden="true">
            <Icon name="calendar" />
          </div>
        )}
        <div className="evd-phone-when">
          <b>
            {longDate(event.event_date)}
            {event.event_time ? ` · ${formatTime(event.event_time)}` : ''}
          </b>
          {(event.address || event.place) && <span className="muted">{event.address || event.place}</span>}
        </div>
        {event.address && (
          <div className="evd-phone-links">
            <a className="btn btn-ghost" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address)}`} target="_blank" rel="noopener noreferrer">
              Abrir no mapa
            </a>
            <a className="btn btn-ghost" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(event.address)}`} target="_blank" rel="noopener noreferrer">
              Como chegar
            </a>
          </div>
        )}
        {event.notes && <p className="evd-notes">{event.notes}</p>}
        <section aria-label="Quem vai">
          <span className="screen-label">Quem vai · {event.attendees.length}</span>
          {event.attendees.length > 0 && (
            <ul className="evd-phone-faces">
              {event.attendees.map((item) => (
                <li key={item.user_id} title={item.person?.display_name}>
                  <Avatar name={item.person?.display_name} src={item.person?.avatar_url} size={44} />
                </li>
              ))}
            </ul>
          )}
        </section>
        {canManage && (onEdit || onDelete) && (
          <div className="evd-phone-manage">
            {onEdit && (
              <button type="button" className="btn btn-ghost" onClick={() => onEdit(event)}>
                Editar
              </button>
            )}
            {onDelete && (
              <button type="button" className="btn btn-danger evd-delete" onClick={() => onDelete(event)}><Icon name="trash" />
                Apagar
              </button>
            )}
          </div>
        )}
      </div>
      <div className="sheet-foot evd-phone-foot">
        {!hasEnded(event) && <GoingButton event={event} going={going} onToggle={onToggle} labels={{ off: 'Vou nesse evento', on: 'Confirmado · toque para sair' }} />}
      </div>
      <div className="evd desk-only-block" style={{ '--cat': categoryColor(event.category) }}>
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
            <button type="button" className="btn btn-danger evd-delete" onClick={() => onDelete(event)}><Icon name="trash" />
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
          {!hasEnded(event) && <GoingButton event={event} going={going} onToggle={onToggle} />}
        </div>
      </div>
    </FormModal>
  )
}
