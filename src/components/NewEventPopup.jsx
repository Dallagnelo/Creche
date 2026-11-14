import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { KEYS } from '../lib/dataCache'
import { formatTime, hasEnded, longDate, relativeLabel } from '../lib/events'
import { listEvents } from '../services/events'

const SHOW_MS = 10_000
const FIRST_LOOK_DAYS = 3 // primeira vez neste aparelho: mostra eventos criados nos últimos 3 dias

/**
 * Ao entrar no site, se alguém marcou um evento novo desde a sua última visita, aparece um aviso
 * no canto da tela por 10 segundos. Cada evento só aparece uma vez (lembrado neste aparelho).
 */
export default function NewEventPopup() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const events = useAsyncData(listEvents, KEYS.events)
  const [popup, setPopup] = useState(null) // { event, more }
  const [leaving, setLeaving] = useState(false)
  const checked = useRef(false)
  const userId = user?.id

  useEffect(() => {
    if (!userId || !events.data || checked.current) return
    checked.current = true
    const key = `eventos-vistos:${userId}`
    let since = null
    try {
      since = localStorage.getItem(key)
      localStorage.setItem(key, new Date().toISOString())
    } catch {
      /* sem localStorage: mostra só os bem recentes */
    }
    const baseline = since ? new Date(since).getTime() : Date.now() - FIRST_LOOK_DAYS * 86_400_000
    const fresh = events.data
      .filter((event) => event.created_at && new Date(event.created_at).getTime() > baseline)
      .filter((event) => event.created_by !== userId && !hasEnded(event))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
    if (fresh.length) setPopup({ event: fresh[0], more: fresh.length - 1 })
  }, [userId, events.data])

  // some sozinho depois de 10 s (com uma animação de saída)
  useEffect(() => {
    if (!popup) return undefined
    setLeaving(false)
    const out = setTimeout(() => setLeaving(true), SHOW_MS)
    const gone = setTimeout(() => setPopup(null), SHOW_MS + 350)
    return () => {
      clearTimeout(out)
      clearTimeout(gone)
    }
  }, [popup])

  if (!popup) return null
  const { event, more } = popup
  const close = () => {
    setLeaving(true)
    setTimeout(() => setPopup(null), 300)
  }
  const when = `${relativeLabel(event.event_date)} · ${longDate(event.event_date)}${event.event_time ? ` às ${formatTime(event.event_time)}` : ''}`

  return (
    <div className={`new-event-pop${leaving ? ' is-leaving' : ''}`} role="status" aria-live="polite">
      <div className="new-event-pop-head">
        <span className="new-event-pop-tag">📅 Evento novo marcado!</span>
        <button type="button" className="new-event-pop-close" onClick={close} aria-label="Fechar aviso">
          ×
        </button>
      </div>
      <strong className="new-event-pop-title">{event.title}</strong>
      <span className="new-event-pop-when">{when}</span>
      {event.place && <span className="new-event-pop-place">📍 {event.place}</span>}
      {event.creator?.display_name && <span className="new-event-pop-by">Marcado por {event.creator.display_name.split(' ')[0]}</span>}
      <div className="new-event-pop-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            close()
            navigate('/eventos')
          }}
        >
          Ver evento{more > 0 ? ` (+${more} ${more === 1 ? 'outro' : 'outros'})` : ''}
        </button>
      </div>
      <span className="new-event-pop-timer" aria-hidden="true" style={{ animationDuration: `${SHOW_MS}ms` }} />
    </div>
  )
}
