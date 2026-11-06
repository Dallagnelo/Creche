import { categoryOf, dateParts, formatTime, relativeLabel } from '../lib/events'
import Avatar from './Avatar'
import Icon from './Icon'

const MAX_FACES = 6

export default function EventCard({ event, userId, past, onToggle, onDelete }) {
  const parts = dateParts(event.event_date)
  const category = categoryOf(event.category)
  const going = event.attendees.some((item) => item.user_id === userId)
  const isOwner = event.created_by === userId
  const time = formatTime(event.event_time)
  const faces = event.attendees.slice(0, MAX_FACES)
  const extra = event.attendees.length - faces.length

  return (
    <article className={`card event-card ${past ? 'is-past' : ''}`}>
      <div className="event-date" aria-hidden="true">
        <span className="event-date-week">{parts.weekday}</span>
        <strong>{parts.day}</strong>
        <span className="event-date-month">{parts.month}</span>
      </div>

      <div className="event-body">
        <div className="event-top">
          <h3>{event.title}</h3>
          {isOwner && (
            <button
              type="button"
              className="btn-trash"
              aria-label={`Apagar evento ${event.title}`}
              title="Apagar evento"
              onClick={() => onDelete(event)}
            >
              <Icon name="trash" />
            </button>
          )}
        </div>

        <div className="chips">
          <span className="chip chip-platform">
            {category.emoji} {category.label}
          </span>
          <span className="chip">
            {relativeLabel(event.event_date)}
            {time ? ` · ${time}` : ''}
          </span>
          {event.place && <span className="chip">📍 {event.place}</span>}
        </div>

        {event.notes && <p className="note-box">{event.notes}</p>}

        <div className="event-foot">
          <div className="event-people">
            {faces.length > 0 ? (
              <>
                <ul className="event-faces" aria-label="Quem vai">
                  {faces.map((item) => (
                    <li key={item.user_id} title={item.person?.display_name}>
                      <Avatar name={item.person?.display_name} src={item.person?.avatar_url} size={28} />
                    </li>
                  ))}
                </ul>
                <span className="muted">
                  {extra > 0 ? `+${extra} · ` : ''}
                  {event.attendees.length} {past ? (event.attendees.length === 1 ? 'foi' : 'foram') : (event.attendees.length === 1 ? 'vai' : 'vão')}
                </span>
              </>
            ) : (
              <span className="muted">Ninguém confirmou ainda</span>
            )}
          </div>

          {!past && (
            <button
              type="button"
              className={`btn ${going ? 'btn-ghost' : 'btn-primary'}`}
              aria-pressed={going}
              onClick={() => onToggle(event, !going)}
            >
              {going ? '✓ Eu vou (sair)' : 'Eu vou!'}
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
