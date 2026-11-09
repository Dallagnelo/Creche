import { useEffect, useMemo, useState } from 'react'
import { categoryColor, categoryOf, countdownTo, dateParts, daysUntil, formatTime, relativeLabel, shortDate } from '../lib/events'
import { GoingButton, People, OpenTitle, openOnClick } from './EventBits'

// Contagem regressiva do destaque; atualiza sozinha.
function Countdown({ event }) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30000)
    return () => clearInterval(id)
  }, [])
  const left = countdownTo(event.event_date, event.event_time)

  if (!left) {
    return <div className="evh-count evh-count-now">{daysUntil(event.event_date) === 0 ? 'É HOJE!' : 'EM BREVE'}</div>
  }
  return (
    <div className="evh-count" role="timer" aria-label={`Faltam ${left.days} dias, ${left.hours} horas e ${left.minutes} minutos`}>
      {[
        [left.days, 'DIAS'],
        [left.hours, 'HORAS'],
        [left.minutes, 'MIN'],
      ].map(([value, label]) => (
        <div key={label}>
          <strong>{String(value).padStart(2, '0')}</strong>
          <small>{label}</small>
        </div>
      ))}
    </div>
  )
}

function Hero({ event, userId, onToggle, onOpen }) {
  const time = formatTime(event.event_time)
  const going = event.attendees.some((item) => item.user_id === userId)
  return (
    <article className="evh-hero is-clickable" {...openOnClick(onOpen, event)} style={{ '--cat': categoryColor(event.category) }}>
      <div className="evh-hero-main">
        <p className="evh-kicker">Próximo evento · {categoryOf(event.category).label}</p>
        <h2>
          <OpenTitle event={event} onOpen={onOpen} />
        </h2>
        <p className="evh-hero-meta">
          <span>{shortDate(event.event_date)}</span>
          {time && <span>{time}</span>}
          {event.place && <span>{event.place}</span>}
        </p>
        <div className="evh-hero-actions">
          <GoingButton event={event} going={going} onToggle={onToggle} />
          <People event={event} />
        </div>
      </div>
      <Countdown event={event} />
    </article>
  )
}

function Tile({ event, userId, past, onToggle, onOpen }) {
  const parts = dateParts(event.event_date)
  const time = formatTime(event.event_time)
  const going = event.attendees.some((item) => item.user_id === userId)
  return (
    <article className={`evh-tile is-clickable ${past ? 'is-past' : ''}`} {...openOnClick(onOpen, event)} style={{ '--cat': categoryColor(event.category) }}>
      <header className="evh-tile-head">
        <span>{categoryOf(event.category).label}</span>
        <span>{relativeLabel(event.event_date)}</span>
      </header>
      <div className="evh-tile-body">
        <div className="evh-tile-date" aria-hidden="true">
          <strong>{parts.day}</strong>
          <small>{parts.month}</small>
        </div>
        <div className="evh-tile-text">
          <div className="event-top">
            <h3>
              <OpenTitle event={event} onOpen={onOpen} />
            </h3>
          </div>
          <p className="muted">
            {parts.weekday}
            {time ? ` · ${time}` : ''}
            {event.place && (
              <>
                <br />
                {event.place}
              </>
            )}
          </p>
        </div>
      </div>
      <footer className="evh-tile-foot">
        <People event={event} />
        {!past && <GoingButton event={event} going={going} onToggle={onToggle} />}
      </footer>
    </article>
  )
}

// Linha de evento do celular: data, título, local e hora, quantos confirmaram e o botão "Vou".
function PhoneRow({ event, userId, past, onToggle, onOpen }) {
  const parts = dateParts(event.event_date)
  const time = formatTime(event.event_time)
  const going = event.attendees.some((item) => item.user_id === userId)
  const count = event.attendees.length
  return (
    <article className={`evp-row is-clickable ${past ? 'is-past' : ''}`} {...openOnClick(onOpen, event)}>
      <div className="evp-date" aria-hidden="true">
        <small>{parts.month}</small>
        <strong>{parts.day}</strong>
      </div>
      <div className="evp-text">
        <h3>{event.title}</h3>
        <span>{[event.place, time].filter(Boolean).join(' · ') || relativeLabel(event.event_date)}</span>
        <span>
          {count} {count === 1 ? 'confirmado' : 'confirmados'}
        </span>
      </div>
      {!past && <GoingButton event={event} going={going} onToggle={onToggle} labels={{ off: 'Vou', on: 'Confirmado' }} />}
    </article>
  )
}

// Visual "Cards": o próximo evento em destaque e os demais em cards coloridos, com filtros.
export default function EventsCardsView({ events, userId, onToggle, onOpen }) {
  const [showPast, setShowPast] = useState(false)

  const { upcoming, past } = useMemo(
    () => ({
      upcoming: events.filter((item) => daysUntil(item.event_date) >= 0),
      past: events.filter((item) => daysUntil(item.event_date) < 0).reverse(),
    }),
    [events],
  )

  const hero = upcoming[0]
  const list = upcoming.slice(1)

  return (
    <div className="stack evh">
      <div className="evp-list phone-only-block">
        {upcoming.map((item) => (
          <PhoneRow key={item.id} event={item} userId={userId} onToggle={onToggle} onOpen={onOpen} />
        ))}
        {showPast && past.map((item) => <PhoneRow key={item.id} event={item} userId={userId} past onToggle={onToggle} onOpen={onOpen} />)}
        {past.length > 0 && (
          <button type="button" className="evh-past-toggle" aria-expanded={showPast} onClick={() => setShowPast((v) => !v)}>
            {showPast ? 'Esconder' : 'Ver'} eventos que já passaram ({past.length})
          </button>
        )}
      </div>
      <div className="stack desk-only-block">
      {hero && <Hero event={hero} userId={userId} onToggle={onToggle} onOpen={onOpen} />}

      {list.length > 0 && (
        <div className="evh-grid">
          {list.map((item) => (
            <Tile key={item.id} event={item} userId={userId} onToggle={onToggle} onOpen={onOpen} />
          ))}
        </div>
      )}

      {past.length > 0 && (
        <>
          <button type="button" className="evh-past-toggle" aria-expanded={showPast} onClick={() => setShowPast((v) => !v)}>
            {showPast ? 'Esconder' : 'Ver'} eventos que já passaram ({past.length})
          </button>
          {showPast && (
            <div className="evh-grid">
              {past.map((item) => (
                <Tile key={item.id} event={item} userId={userId} past onToggle={onToggle} onOpen={onOpen} />
              ))}
            </div>
          )}
        </>
      )}
      </div>
    </div>
  )
}
