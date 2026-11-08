import { useState } from 'react'
import EventModal from '../components/EventModal'
import EventsCalendarView from '../components/EventsCalendarView'
import EventsCardsView from '../components/EventsCardsView'
import { EmptyState, ErrorBox, Spinner } from '../components/Feedback'
import { useAuth } from '../contexts/AuthContext'
import { useSettings } from '../contexts/SettingsContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { deleteEvent, listEvents, setAttendance } from '../services/events'

export default function EventsPage() {
  const { user } = useAuth()
  const { settings } = useSettings()
  const { data: events, loading, error, reload } = useAsyncData(listEvents)
  const [actionError, setActionError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [presetDate, setPresetDate] = useState(null)

  const asCards = settings.eventsView === 'cards'

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

  // "Marcar neste dia" (no calendário) abre o formulário já com a data escolhida.
  const handleAddOnDay = (iso) => {
    setPresetDate(iso)
    setShowForm(true)
  }

  return (
    <section className="stack">
      <div className="page-head">
        <div>
          <h1>Eventos</h1>
          <p className="muted">{asCards ? 'O que vem por aí na turma.' : 'Toque num dia para ver o que está marcado.'}</p>
        </div>
        <button
          type="button"
          className="btn btn-new"
          aria-haspopup="dialog"
          onClick={() => {
            setPresetDate(null)
            setShowForm(true)
          }}
        >
          Adicionar Evento
        </button>
      </div>

      {showForm && (
        <EventModal
          presetDate={presetDate}
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false)
            reload()
          }}
        />
      )}

      {actionError && <ErrorBox error={actionError} />}
      {error && <ErrorBox error={error} onRetry={reload} />}
      {loading && !events && <Spinner />}

      {events && events.length === 0 && (
        <EmptyState icon="📅" title="Nenhum evento marcado">
          Crie o próximo: ver um filme, jogar vôlei, um churrasco...
        </EmptyState>
      )}

      {events && events.length > 0 && asCards && (
        <EventsCardsView events={events} userId={user.id} onToggle={handleToggle} onDelete={handleDelete} />
      )}
      {events && events.length > 0 && !asCards && (
        <EventsCalendarView
          events={events}
          userId={user.id}
          onToggle={handleToggle}
          onDelete={handleDelete}
          onAddOnDay={handleAddOnDay}
        />
      )}
    </section>
  )
}
