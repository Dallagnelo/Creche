import { useMemo, useState } from 'react'
import { MONTH_NAMES, WEEKDAY_LETTERS, monthGrid, parseISO } from '../lib/dates'
import { captionDate, categoryColor, categoryOf, daysUntil, formatTime, longDate, relativeLabel } from '../lib/events'
import { todayISO } from '../lib/format'
import { GoingButton, People, TrashButton, TypeTag } from './EventBits'
import Icon from './Icon'

const MAX_DOTS = 3
const LEGEND = ['filme', 'esporte', 'jogo', 'comida', 'festa', 'passeio']

function DayDetail({ event, userId, onToggle, onDelete, kicker }) {
  const past = daysUntil(event.event_date) < 0
  const going = event.attendees.some((item) => item.user_id === userId)
  const time = formatTime(event.event_time)
  return (
    <article className={`evc-detail ${past ? 'is-past' : ''}`}>
      <div className="evc-detail-top">
        <p className="evc-caption">
          {kicker && `${kicker} · `}
          {captionDate(event.event_date)} · {relativeLabel(event.event_date)}
        </p>
        {event.created_by === userId && <TrashButton event={event} onDelete={onDelete} />}
      </div>
      <h3>{event.title}</h3>
      <div className="evc-detail-meta">
        <TypeTag category={event.category} />
        {time && <span className="muted">{time}</span>}
        {event.place && <span className="muted">{event.place}</span>}
      </div>
      {event.notes && <p className="note-box">{event.notes}</p>}
      <div className="evc-detail-foot">
        <People event={event} />
        {!past && <GoingButton event={event} going={going} onToggle={onToggle} />}
      </div>
    </article>
  )
}

// Visual "Calendário": o mês com pontinhos coloridos nos dias com evento.
// Ao tocar num dia, aparecem os eventos dele; ao lado, o que vem a seguir.
export default function EventsCalendarView({ events, userId, onToggle, onDelete, onAddOnDay }) {
  const today = todayISO()
  const [selected, setSelected] = useState(today)
  const [view, setView] = useState(() => {
    const { year, month0 } = parseISO(today)
    return { year, month0 }
  })

  const byDay = useMemo(() => {
    const map = new Map()
    events.forEach((item) => map.set(item.event_date, [...(map.get(item.event_date) ?? []), item]))
    return map
  }, [events])

  const prefix = `${view.year}-${String(view.month0 + 1).padStart(2, '0')}`

  // Só as semanas que têm dias do mês (4 a 6 linhas).
  const cells = useMemo(() => {
    const all = monthGrid(view.year, view.month0)
    const rows = []
    for (let start = 0; start < all.length; start += 7) {
      const week = all.slice(start, start + 7)
      if (week.some((iso) => iso.startsWith(prefix))) rows.push(...week)
    }
    return rows
  }, [view, prefix])

  const dayEvents = byDay.get(selected) ?? []
  const upcoming = events.filter((item) => daysUntil(item.event_date) >= 0)
  // Dia sem nada marcado: em vez de um aviso vazio, mostra o evento mais próximo de acontecer.
  const featured = dayEvents.length === 0 ? upcoming[0] : null
  const next = upcoming.filter((item) => item.event_date !== selected && item !== featured).slice(0, 3)

  function shiftMonth(amount) {
    const date = new Date(view.year, view.month0 + amount, 1)
    setView({ year: date.getFullYear(), month0: date.getMonth() })
  }

  function pickDay(iso) {
    setSelected(iso)
    const { year, month0 } = parseISO(iso)
    if (year !== view.year || month0 !== view.month0) setView({ year, month0 })
  }

  return (
    <div className="evc-layout">
      <section className="card panel evc" aria-label="Calendário de eventos">
        <div className="evc-head">
          <button type="button" className="evc-nav" aria-label="Mês anterior" onClick={() => shiftMonth(-1)}>
            <Icon name="chevron-left" />
          </button>
          <h2>
            {MONTH_NAMES[view.month0]} {view.year}
          </h2>
          <button type="button" className="evc-nav" aria-label="Próximo mês" onClick={() => shiftMonth(1)}>
            <Icon name="chevron-right" />
          </button>
        </div>

        <div className="evc-grid evc-weekdays" aria-hidden="true">
          {WEEKDAY_LETTERS.map((letter, index) => (
            <span key={index}>{letter}</span>
          ))}
        </div>

        <div className="evc-grid">
          {cells.map((iso) => {
            const list = byDay.get(iso) ?? []
            const label = `${longDate(iso)}${list.length ? `, ${list.length} ${list.length === 1 ? 'evento' : 'eventos'}` : ''}`
            return (
              <button
                key={iso}
                type="button"
                aria-label={label}
                aria-pressed={iso === selected}
                className={[
                  'evc-day',
                  !iso.startsWith(prefix) && 'is-outside',
                  iso === today && 'is-today',
                  iso === selected && 'is-selected',
                  daysUntil(iso) < 0 && 'is-past',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => pickDay(iso)}
              >
                <span className="evc-num">{parseISO(iso).day}</span>
                <span className="evc-dots" aria-hidden="true">
                  {list.slice(0, MAX_DOTS).map((item) => (
                    <i key={item.id} style={{ background: categoryColor(item.category) }} />
                  ))}
                </span>
              </button>
            )
          })}
        </div>

        <ul className="evc-legend" aria-label="Cores dos tipos">
          {LEGEND.map((id) => (
            <li key={id}>
              <i style={{ background: categoryColor(id) }} aria-hidden="true" />
              {categoryOf(id).label}
            </li>
          ))}
        </ul>
      </section>

      <div className="evc-side">
        {dayEvents.length > 0 &&
          dayEvents.map((item) => (
            <DayDetail key={item.id} event={item} userId={userId} onToggle={onToggle} onDelete={onDelete} />
          ))}

        {featured && (
          <DayDetail event={featured} userId={userId} onToggle={onToggle} onDelete={onDelete} kicker="Próximo evento" />
        )}

        {dayEvents.length === 0 && !featured && (
          <div className="evc-detail evc-empty">
            <p className="evc-caption">
              {captionDate(selected)} · {relativeLabel(selected)}
            </p>
            <p className="muted">Nada marcado neste dia.</p>
            {daysUntil(selected) >= 0 && (
              <button type="button" className="btn btn-primary" onClick={() => onAddOnDay(selected)}>
                Marcar um evento neste dia
              </button>
            )}
          </div>
        )}

        {next.length > 0 && (
          <>
            <h2 className="evc-next-title">A seguir</h2>
            <ul className="evc-next">
              {next.map((item) => {
                const { day, month0 } = parseISO(item.event_date)
                const time = formatTime(item.event_time)
                const detail = [time, item.place].filter(Boolean).join(' · ')
                return (
                  <li key={item.id}>
                    <button type="button" className="evc-next-item" onClick={() => pickDay(item.event_date)}>
                      <span className="evc-next-date">
                        <strong>{day}</strong>
                        <small>{MONTH_NAMES[month0].slice(0, 3)}</small>
                      </span>
                      <span className="evc-next-bar" style={{ background: categoryColor(item.category) }} aria-hidden="true" />
                      <span className="evc-next-text">
                        <strong>{item.title}</strong>
                        {detail && <small className="muted">{detail}</small>}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
