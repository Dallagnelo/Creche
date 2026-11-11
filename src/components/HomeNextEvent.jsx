import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import EventDetailModal from './EventDetailModal'
import EventModal from './EventModal'
import { People, TypeTag } from './EventBits'
import { ErrorBox, Spinner } from './Feedback'
import { categoryColor, dateParts, formatTime, hasEnded, longDate, relativeLabel, shortDate } from '../lib/events'
import { deleteEvent, setAttendance } from '../services/events'

/** Eventos que ainda vão acontecer (a data e hora ainda não chegaram), os 2 mais próximos primeiro. */
export function nextEvents(list) {
  return (list ?? [])
    .filter((event) => !hasEnded(event))
    .sort((a, b) => `${a.event_date} ${a.event_time ?? ''}`.localeCompare(`${b.event_date} ${b.event_time ?? ''}`))
    .slice(0, 2)
}

/** Painel da Home: os 2 próximos eventos do calendário. Clicar abre os detalhes numa janela.
 *  Recebe o resultado de useAsyncData(listEvents) da Home (que esconde o painel quando não há eventos). */
export default function HomeNextEvent({ events, limit = 2 }) {
  const { user } = useAuth()
  const [selectedId, setSelectedId] = useState(null)
  const [editing, setEditing] = useState(null)
  const [actionError, setActionError] = useState(null)

  const upcoming = useMemo(() => nextEvents(events.data).slice(0, limit), [events.data, limit])
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

  async function handleDelete(event) {
    if (!window.confirm(`Apagar o evento "${event.title}" de ${longDate(event.event_date)}${event.attendees?.length ? ` (${event.attendees.length} confirmado${event.attendees.length === 1 ? '' : 's'})` : ''}?\n\nIsso tira o evento para todo mundo.`)) return
    setSelectedId(null)
    setActionError(null)
    try {
      await deleteEvent(event.id)
      events.reload()
    } catch (err) {
      setActionError(err)
    }
  }

  return (
    <section className="card panel home-event" aria-labelledby="panel-next-events">
      <div className="panel-head">
        <h2 id="panel-next-events">
          <span className="desk-only">Próximos eventos</span>
          <span className="phone-only">Próximo evento</span>
        </h2>
        <Link to="/eventos" className="panel-link">
          <span className="desk-only">Ver eventos</span>
          <span className="phone-only">Ver tudo</span>
        </Link>
      </div>
      {events.error && <ErrorBox error={events.error} onRetry={events.reload} />}
      {actionError && <ErrorBox error={actionError} />}
      {events.loading && !events.data && <Spinner />}
      {events.data && upcoming.length === 0 && <p className="muted">Nenhum evento marcado. Que tal combinar algo?</p>}
      {upcoming.length > 0 && (
        <ul className={`home-event-list${upcoming.length === 1 ? ' is-single' : ''}`}>
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
                    <span className="muted home-event-meta desk-only">
                      {shortDate(event.event_date)}
                      {event.event_time ? ` · ${formatTime(event.event_time)}` : ''}
                      {event.place ? ` · ${event.place}` : ''}
                    </span>
                    <span className="muted home-event-meta phone-only">
                      {[event.place, event.event_time ? formatTime(event.event_time) : null, `${event.attendees?.length ?? 0} ${(event.attendees?.length ?? 0) === 1 ? 'confirmado' : 'confirmados'}`]
                        .filter(Boolean)
                        .join(' · ')}
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
        <EventDetailModal event={selected} userId={user.id} onToggle={handleToggle} onDelete={handleDelete} onEdit={(event) => { setSelectedId(null); setEditing(event) }} onClose={() => setSelectedId(null)} />
      )}

      {editing && (
        <EventModal
          event={editing}
          onClose={() => setEditing(null)}
          onCreated={() => {
            setEditing(null)
            events.reload()
          }}
        />
      )}
    </section>
  )
}
