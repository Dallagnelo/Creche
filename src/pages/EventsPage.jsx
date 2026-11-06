import { useMemo, useState } from 'react'
import EventCard from '../components/EventCard'
import EventForm from '../components/EventForm'
import { EmptyState, ErrorBox, Spinner } from '../components/Feedback'
import { useAuth } from '../contexts/AuthContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { daysUntil } from '../lib/events'
import { deleteEvent, listEvents, setAttendance } from '../services/events'

export default function EventsPage() {
  const { user } = useAuth()
  const { data: events, loading, error, reload } = useAsyncData(listEvents)
  const [actionError, setActionError] = useState(null)
  const [showPast, setShowPast] = useState(false)

  // Próximos: do mais perto para o mais longe. Passados: do mais recente para o mais antigo.
  const { upcoming, past } = useMemo(() => {
    const list = events ?? []
    return {
      upcoming: list.filter((item) => daysUntil(item.event_date) >= 0),
      past: list.filter((item) => daysUntil(item.event_date) < 0).reverse(),
    }
  }, [events])

  async function run(action) {
    setActionError(null)
    try {
      await action()
      reload()
    } catch (err) {
      setActionError(err)
    }
  }

  const handleToggle = (event, going) => run(() => setAttendance({ eventId: event.id, userId: user.id, going }))

  const handleDelete = (event) => {
    if (!window.confirm(`Apagar o evento "${event.title}"?`)) return
    run(() => deleteEvent(event.id))
  }

  return (
    <section className="stack">
      <div className="page-head">
        <div>
          <h1>Eventos</h1>
          <p className="muted">
            {events
              ? `${upcoming.length} ${upcoming.length === 1 ? 'evento marcado' : 'eventos marcados'}`
              : 'Carregando...'}
          </p>
        </div>
        <a className="btn btn-primary page-head-action" href="#novo-evento">
          Novo evento
        </a>
      </div>

      <div className="split">
        <div className="stack">
          {actionError && <ErrorBox error={actionError} />}
          {error && <ErrorBox error={error} onRetry={reload} />}
          {loading && !events && <Spinner />}

          {events && upcoming.length === 0 && (
            <EmptyState icon="📅" title="Nenhum evento marcado">
              Crie o próximo: ver um filme, jogar vôlei, um churrasco...
            </EmptyState>
          )}

          {upcoming.map((event) => (
            <EventCard key={event.id} event={event} userId={user.id} onToggle={handleToggle} onDelete={handleDelete} />
          ))}

          {past.length > 0 && (
            <>
              <button type="button" className="btn btn-ghost" aria-expanded={showPast} onClick={() => setShowPast((v) => !v)}>
                {showPast ? 'Esconder' : 'Ver'} eventos que já passaram ({past.length})
              </button>
              {showPast &&
                past.map((event) => (
                  <EventCard key={event.id} event={event} userId={user.id} past onToggle={handleToggle} onDelete={handleDelete} />
                ))}
            </>
          )}
        </div>

        <aside className="side">
          <div id="novo-evento">
            <EventForm onCreated={reload} />
          </div>
        </aside>
      </div>
    </section>
  )
}
