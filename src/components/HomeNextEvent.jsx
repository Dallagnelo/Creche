import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import EventDetailModal from './EventDetailModal'
import { People, TypeTag } from './EventBits'
import { ErrorBox, Spinner } from './Feedback'
import { useAsyncData } from '../hooks/useAsyncData'
import { categoryColor, dateParts, daysUntil, formatTime, relativeLabel, shortDate } from '../lib/events'
import { listEvents, setAttendance } from '../services/events'

/** Painel da Home: os 2 próximos eventos do calendário. Clicar abre os detalhes numa janela. */
export default function HomeNextEvent() {
  const { user } = useAuth()
  const events = useAsyncData(listEvents)
  const [selectedId, setSelectedId] = useState(null)
  const [actionError, setActionError] = useState(null)

  const upcoming = useMemo(
    () =>
      (events.data ?? [])
        .filter((event) => daysUntil(event.event_date) >= 0)
        .sort((a, b) => `${a.event_date} ${a.event_time ?? ''}`.localeCompare(`${b.event_date} ${b.event_time ?? ''}`))
        .slice(0, 2),
    [events.data]
  )
  // Procura na lista inteira (assim a janela continua certa depois de "Eu vou!").
  const selected = events.data?.find((event) => event.id === selectedId) ?? null

  async function handleToggle(event, going) {
    setActionError(null)
    try {
      await setAttendance({ eventId: event.id, userId: user.id, going })
      events.reload()
    } catch (err) {
      setActionError(err)
    }
  }

  return (
    <section className="card panel home-event" aria-labelledby="panel-next-events">
      <div className="panel-head">
        <h2 id="panel-next-events">Próximos eventos</h2>
        <Link to="/eventos" className="panel-link">
          Ver eventos
        </Link>
      </div>
      {events.error && <ErrorBox error={events.error} onRetry={events.reload} />}
      {actionError && <ErrorBox error={actionError} />}
      {events.loading && !events.data && <Spinner />}
      {events.data && upcoming.length === 0 && <p className="muted">Nenhum evento marcado. Que tal combinar algo?</p>}
      {upcoming.length > 0 && (
        <ul className="home-event-list">
          {upcoming.map((event) => {
            const parts = dateParts(event.event_date)
            return (
              <li key={event.id}>
                <button
                  type="button"
                  className="home-event-card"
                  style={{ '--cat': categoryColor(event.category) }}
                  onClick={() => setSelectedId(event.id)}
                  aria-label={`Ver detalhes: ${event.title}`}
                >
                  <span className="home-event-date" aria-hidden="true">
                    <span>{parts.weekday}</span>
                    <strong>{parts.day}</strong>
                    <span>{parts.month}</span>
                  </span>
                  <span className="home-event-info">
                    <span className="home-event-when">{relativeLabel(event.event_date)}</span>
                    <strong className="home-event-title">{event.title}</strong>
                    <span className="muted home-event-meta">
                      {shortDate(event.event_date)}
                      {event.event_time ? ` · ${formatTime(event.event_time)}` : ''}
                      {event.place ? ` · ${event.place}` : ''}
                    </span>
                  </span>
                  <span className="home-event-side">
                    <TypeTag category={event.category} />
                    <People event={event} />
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {selected && (
        <EventDetailModal event={selected} userId={user.id} onToggle={handleToggle} onClose={() => setSelectedId(null)} />
      )}
    </section>
  )
}
