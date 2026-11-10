import { useEffect, useMemo, useState } from 'react'
import EventDetailModal from '../components/EventDetailModal'
import EventModal from '../components/EventModal'
import EventsCalendarView from '../components/EventsCalendarView'
import EventsCardsView from '../components/EventsCardsView'
import { EmptyState, ErrorBox, Spinner } from '../components/Feedback'
import { useAuth } from '../contexts/AuthContext'
import { useSettings } from '../contexts/SettingsContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { isExpired } from '../lib/events'
import { deleteEvent, listEvents, purgeExpiredEvents, setAttendance } from '../services/events'
import { KEYS } from '../lib/dataCache'

export default function EventsPage() {
  const { user } = useAuth()
  const { settings, updateSetting } = useSettings()
  const { data: allEvents, loading, error, reload } = useAsyncData(listEvents, KEYS.events)

  // Passou o horário: o evento vai para "Já aconteceram" e, 48 h depois, some. O relógio roda a cada minuto.
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(id)
  }, [])
  const events = useMemo(() => allEvents?.filter((item) => !isExpired(item, now)), [allEvents, now])

  // Apaga de verdade no banco os que já passaram de 48 h (precisa de supabase/migracao-eventos-expiram.sql).
  useEffect(() => {
    purgeExpiredEvents().then((removed) => removed > 0 && reload())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [actionError, setActionError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null) // evento que está sendo editado
  const [selectedId, setSelectedId] = useState(null) // evento aberto nos detalhes
  const selected = events?.find((item) => item.id === selectedId) ?? null
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
    setSelectedId(null)
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

      <div className="seg" role="group" aria-label="Como ver os eventos">
        <button type="button" className={`seg-item ${asCards ? 'is-on' : ''}`} aria-pressed={asCards} onClick={() => updateSetting('eventsView', 'cards')}>
          Cartões
        </button>
        <button type="button" className={`seg-item ${!asCards ? 'is-on' : ''}`} aria-pressed={!asCards} onClick={() => updateSetting('eventsView', 'calendar')}>
          Calendário
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

      {selected && !editing && (
        <EventDetailModal
          event={selected}
          userId={user.id}
          showCalendarLink={false}
          onToggle={handleToggle}
          onDelete={handleDelete}
          onEdit={(item) => {
            setSelectedId(null)
            setEditing(item)
          }}
          onClose={() => setSelectedId(null)}
        />
      )}

      {editing && (
        <EventModal
          event={editing}
          onClose={() => setEditing(null)}
          onCreated={() => {
            setEditing(null)
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
        <EventsCardsView events={events} userId={user.id} onToggle={handleToggle}
          onOpen={(item) => setSelectedId(item.id)} />
      )}
      {events && events.length > 0 && !asCards && (
        <EventsCalendarView
          events={events}
          userId={user.id}
          onToggle={handleToggle}
          onOpen={(item) => setSelectedId(item.id)}
          onAddOnDay={handleAddOnDay}
        />
      )}
    </section>
  )
}
