import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLive } from '../contexts/LiveContext'
import { openChannel, releaseChannel } from '../lib/realtimeChannel'
import { TURMA_SO_ADMIN } from '../lib/features'
import { LATEST_VERSION, PATCH_NOTES } from '../lib/patchNotes'
import { birthdayWhen, upcomingBirthdays } from '../lib/birthdays'
import { categoryColor, categoryOf, countdownTo, dateParts, eventStart, formatTime, hasEnded, relativeLabel } from '../lib/events'
import { formatAverage } from '../lib/format'
import { posterUrl } from '../lib/tmdb'
import { brasiliaToday, hallScene, HALL_THEMES } from '../lib/rooms'
import { itemRect } from '../lib/room'
import { paintBackground, spriteOf } from '../lib/roomDraw'
import { sendCongrats } from '../services/notifications'
import AdjImg from './AdjImg'
import Avatar from './Avatar'
import HomePolls from './HomePolls'
import Icon from './Icon'

/* ---------------------------------------------------------------------
   Faixa "Agora": o que está acontecendo ou vai acontecer logo
   (ao vivo, votações abertas, evento chegando, aniversário).
   --------------------------------------------------------------------- */

const congratsKey = (userId, toId) => `parabens:${userId}:${toId}:${new Date().getFullYear()}`

function CongratsButton({ toId, className = '' }) {
  const { user } = useAuth()
  const [state, setState] = useState(() => {
    try {
      return localStorage.getItem(congratsKey(user.id, toId)) ? 'sent' : 'idle'
    } catch {
      return 'idle'
    }
  })
  const [error, setError] = useState('')
  if (toId === user.id) return <span className={`btn ${className}`} aria-disabled="true">🎉 É o seu dia!</span>
  async function send(event) {
    event.stopPropagation()
    setState('busy')
    setError('')
    try {
      await sendCongrats(toId)
      try {
        localStorage.setItem(congratsKey(user.id, toId), '1')
      } catch {
        /* só não lembra */
      }
      setState('sent')
    } catch (err) {
      setError(err.message)
      setState('idle')
    }
  }
  return (
    <>
      <button type="button" className={`btn ${className}`} onClick={send} disabled={state !== 'idle'} title={error || undefined}>
        {state === 'sent' ? '✓ Parabéns enviado' : state === 'busy' ? 'Enviando...' : 'Mandar parabéns'}
      </button>
      {error && <small className="now-error">{error}</small>}
    </>
  )
}

export function HomeNow({ events, profiles, onOpenEvent, onToggleEvent }) {
  const { user } = useAuth()
  const { hosts, viewersOf } = useLive()

  // evento: o próximo, se for nos próximos 14 dias
  const nextEvent = useMemo(() => {
    const list = (events ?? []).filter((event) => !hasEnded(event)).sort((a, b) => eventStart(a) - eventStart(b))
    const first = list[0]
    return first && eventStart(first) - Date.now() < 14 * 86400000 ? first : null
  }, [events])
  // aniversário: hoje ou nos próximos 3 dias
  const birthdays = useMemo(() => upcomingBirthdays(profiles, { withinDays: 3 }), [profiles])

  const cards = []
  if (hosts.length > 0) {
    const [first] = hosts
    cards.push(
      <Link key="live" to="/ao-vivo" className="now-card is-live">
        <span className="now-tag">
          <span className="live-dot live-dot-static" aria-hidden="true" /> AO VIVO
        </span>
        <b className="now-title">{hosts.length === 1 ? `${first.name} está ao vivo` : `${hosts.length} transmissões no ar`}</b>
        <span className="now-text">
          {hosts.length === 1 ? `${viewersOf(first.userId).length} assistindo` : hosts.map((meta) => meta.name).join(', ')}
        </span>
        <span className="btn now-btn">Assistir</span>
      </Link>,
    )
  }
  const going = nextEvent?.attendees?.some((person) => person.user_id === user.id)
  // contagem regressiva do evento (atualiza a cada 30 s)
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!nextEvent) return undefined
    const id = setInterval(() => setTick((value) => value + 1), 30000)
    return () => clearInterval(id)
  }, [nextEvent])
  const countdown = nextEvent ? countdownTo(nextEvent.event_date, nextEvent.event_time) : null
  if (nextEvent) {
    cards.push(
      <article key="event" className="now-card is-event" onClick={() => onOpenEvent(nextEvent)} style={{ '--cat': categoryColor(nextEvent.category) }}>
        <span className="now-tag">
          {relativeLabel(nextEvent.event_date).toUpperCase()} · {categoryOf(nextEvent.category).label.toUpperCase()}
        </span>
        <b className="now-title">{nextEvent.title}</b>
        <span className="now-text">
          {[
            `${dateParts(nextEvent.event_date).weekday}, ${nextEvent.event_date.slice(8, 10)}/${nextEvent.event_date.slice(5, 7)}`,
            nextEvent.event_time ? formatTime(nextEvent.event_time) : null,
            nextEvent.place,
          ]
            .filter(Boolean)
            .join(' · ')}
        </span>
        <span className="now-row">
          <button
            type="button"
            className={`btn now-btn${going ? ' is-going' : ''}`}
            onClick={(event) => {
              event.stopPropagation()
              onToggleEvent(nextEvent, !going)
            }}
          >
            {going ? '✓ Você vai' : 'Eu vou!'}
          </button>
          {nextEvent.attendees?.length > 0 && (
            <span className="now-faces" title={`${nextEvent.attendees.length} confirmados`}>
              {nextEvent.attendees.slice(0, 4).map((item) => (
                <Avatar key={item.user_id} name={item.person?.display_name} src={item.person?.avatar_url} size={26} />
              ))}
              {nextEvent.attendees.length > 4 && <small>+{nextEvent.attendees.length - 4}</small>}
            </span>
          )}
        </span>
        {countdown && (
          <span className="now-count" aria-label="Quanto falta">
            {[
              [countdown.days, 'DIAS'],
              [countdown.hours, 'HORAS'],
              [countdown.minutes, 'MIN'],
            ].map(([value, label]) => (
              <span key={label}>
                <b>{String(value).padStart(2, '0')}</b>
                <small>{label}</small>
              </span>
            ))}
          </span>
        )}
      </article>,
    )
  }
  birthdays.slice(0, 2).forEach((item) => {
    cards.push(
      <article key={`bd-${item.profile.id}`} className="now-card is-birthday">
        <span className="now-tag">ANIVERSÁRIO 🎂</span>
        <b className="now-title">
          {item.profile.id === user.id ? 'Você' : item.profile.display_name.split(' ')[0]} {item.profile.id === user.id ? 'faz' : 'faz'} {item.age}
        </b>
        <span className="now-text">
          {item.isToday ? 'hoje! 🎉' : birthdayWhen(item)}
          {!item.isToday && `, ${String(item.date.getDate()).padStart(2, '0')}/${String(item.date.getMonth() + 1).padStart(2, '0')}`}
        </span>
        <CongratsButton toId={item.profile.id} className="now-btn" />
      </article>,
    )
  })

  return (
    <HomeNowRow>
      {hosts.length > 0 && cards[0]}
      <HomePolls variant="now" />
      {cards.slice(hosts.length > 0 ? 1 : 0)}
    </HomeNowRow>
  )
}

// Some sozinha quando não há nenhum cartão dentro (as votações vêm de outro componente).
function HomeNowRow({ children }) {
  const ref = useRef(null)
  const [empty, setEmpty] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const check = () => setEmpty(el.querySelectorAll('.now-card').length === 0)
    check()
    const observer = new MutationObserver(check)
    observer.observe(el, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])
  return (
    <section ref={ref} className={`home-now${empty ? ' is-empty' : ''}`} aria-label="Agora">
      {children}
    </section>
  )
}

/* ---------------------------------------------------------------------
   Ranking com abas (Filmes / Jogos)
   --------------------------------------------------------------------- */
const RANK_COLORS = ['var(--star)', 'var(--primary)', 'var(--accent)', 'var(--muted)', 'var(--muted)']

export function HomeRanking({ movies, games, onOpenMovie, onOpenGame }) {
  const [tab, setTab] = useState('movies')
  const list = useMemo(() => {
    const source = tab === 'movies' ? movies ?? [] : games ?? []
    return source
      .filter((item) => item.average != null)
      .sort((a, b) => b.average - a.average || b.ratings.length - a.ratings.length)
      .slice(0, 5)
  }, [tab, movies, games])
  return (
    <section className="card panel home-ranking" aria-labelledby="panel-ranking">
      <div className="panel-head">
        <h2 id="panel-ranking">Ranking</h2>
        <Link to={tab === 'movies' ? '/filmes' : '/jogos'} className="panel-link">
          Ver tudo
        </Link>
      </div>
      <div className="home-tabs" role="tablist" aria-label="Ranking de">
        {[
          ['movies', 'Filmes'],
          ['games', 'Jogos'],
        ].map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} className={tab === key ? 'is-on' : ''} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <p className="muted">{tab === 'movies' ? 'Avalie um filme para ele aparecer aqui.' : 'Avalie um jogo para ele aparecer aqui.'}</p>
      ) : (
        <ol className="home-rank">
          {list.map((item, index) => (
            <li key={item.id}>
              <button type="button" onClick={() => (tab === 'movies' ? onOpenMovie(item) : onOpenGame(item))}>
                <span className="home-rank-pos" style={{ color: RANK_COLORS[index] }}>
                  {index + 1}
                </span>
                <span className="home-rank-cover">
                  {tab === 'movies' ? (
                    item.poster_path ? <img src={posterUrl(item.poster_path, 'w185')} alt="" loading="lazy" /> : <Icon name="movies" />
                  ) : item.coverUrl ? (
                    <AdjImg src={item.coverUrl} crop={item.coverCrop} loading="lazy" />
                  ) : (
                    <Icon name="games" />
                  )}
                </span>
                <span className="home-rank-name">
                  <strong>{tab === 'movies' ? item.title : item.name}</strong>
                  <small className="muted">
                    {item.ratings.length} {item.ratings.length === 1 ? 'avaliação' : 'avaliações'}
                  </small>
                </span>
                <span className="home-rank-score">★ {formatAverage(item.average)}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

/* ---------------------------------------------------------------------
   Sala de hoje (Turma): miniatura da sala do dia, quem está lá e o telão
   --------------------------------------------------------------------- */
const isDecor = (item) => item.floor || (item.wall && !item.act && !item.screen)

function RoomThumb({ day }) {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    try {
      const scene = hallScene(day)
      const bg = paintBackground(scene, scene.furniture.filter(isDecor))
      canvas.width = bg.width
      canvas.height = bg.height
      const ctx = canvas.getContext('2d')
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(bg, 0, 0)
      ctx.translate(0, bg.height - scene.rows * 16)
      scene.furniture
        .filter((item) => !isDecor(item))
        .map((item) => ({ item, sprite: spriteOf(item) }))
        .filter(({ sprite }) => sprite)
        .sort((a, b) => (a.item.wall ? -1 : a.item.y + a.item.h) - (b.item.wall ? -1 : b.item.y + b.item.h))
        .forEach(({ item, sprite }) => {
          const r = itemRect(item, sprite)
          ctx.drawImage(sprite, r.x, r.y)
        })
    } catch {
      /* miniatura é só enfeite */
    }
  }, [day])
  return <canvas ref={ref} className="home-room-thumb" aria-hidden="true" />
}

/** Quem está na sala da turma agora (só olha, não entra: não aparece para os outros). */
function useRoomPeek(enabled) {
  const { user } = useAuth()
  const [state, setState] = useState({ people: [], yt: null })
  useEffect(() => {
    if (!enabled || !user?.id) return undefined
    let alive = true
    let channel = null
    // espera o canal da sala (se você acabou de sair dela) terminar de fechar antes de espiar
    openChannel('turma-room', { config: { presence: { key: `espiar-${user.id}` } } }).then((ch) => {
      if (!alive) {
        releaseChannel(ch)
        return
      }
      channel = ch
      ch.on('presence', { event: 'sync' }, () => {
        const people = []
        let yt = null
        Object.entries(ch.presenceState()).forEach(([id, metas]) => {
          const meta = metas[metas.length - 1]
          if (!meta || id.startsWith('espiar-')) return
          people.push({ id, name: meta.name ?? 'Alguém', avatarUrl: meta.avatarUrl ?? null })
          if (meta.items?.yt) yt = meta.items.yt
        })
        setState({ people, yt })
      }).subscribe()
    })
    return () => {
      alive = false
      if (channel) releaseChannel(channel)
    }
  }, [enabled, user?.id])
  return state
}

export function HomeRoomToday() {
  const { isAdmin } = useAuth()
  const canSee = !TURMA_SO_ADMIN || isAdmin
  const { people, yt } = useRoomPeek(canSee)
  const navigate = useNavigate()
  if (!canSee) return null
  const today = brasiliaToday()
  const theme = HALL_THEMES[today.weekday]
  return (
    <section className="card panel home-room" aria-labelledby="panel-room">
      <div className="panel-head">
        <h2 id="panel-room">Sala de hoje</h2>
        <Link to="/turma" className="panel-link">
          Entrar
        </Link>
      </div>
      <button type="button" className="home-room-view" onClick={() => navigate('/turma')} aria-label={`Entrar na sala de hoje: ${theme.name}`}>
        <RoomThumb day={today.weekday} />
      </button>
      <div className="home-room-who">
        {people.length > 0 && (
          <span className="home-room-faces" aria-hidden="true">
            {people.slice(0, 4).map((person) => (
              <Avatar key={person.id} name={person.name} src={person.avatarUrl} size={26} />
            ))}
          </span>
        )}
        <b>
          {people.length === 0 ? `Ninguém na ${theme.name} agora` : `${people.length} na ${theme.name}`}
        </b>
      </div>
      {yt && (
        <small className="muted home-room-tv">
          📺 Telão {yt.type === 'live' ? `passando a live de ${yt.name ?? 'alguém'}` : 'tocando um vídeo'}
          {yt.by ? ` · DJ ${yt.by}` : ''}
        </small>
      )}
    </section>
  )
}

/* ---------------------------------------------------------------------
   Próximos eventos (lista compacta com "Vou")
   --------------------------------------------------------------------- */
export function HomeEvents({ events, onOpenEvent, onToggleEvent }) {
  const { user } = useAuth()
  const list = useMemo(
    () => (events ?? []).filter((event) => !hasEnded(event)).sort((a, b) => eventStart(a) - eventStart(b)).slice(0, 2),
    [events],
  )
  return (
    <section className="card panel home-events" aria-labelledby="panel-events">
      <div className="panel-head">
        <h2 id="panel-events">Próximos eventos</h2>
        <Link to="/eventos" className="panel-link">
          Ver tudo
        </Link>
      </div>
      {list.length === 0 ? (
        <p className="muted">Nenhum evento marcado. Que tal combinar algo?</p>
      ) : (
        <ul className="home-events-list">
          {list.map((event) => {
            const going = event.attendees?.some((person) => person.user_id === user.id)
            const count = event.attendees?.length ?? 0
            const parts = dateParts(event.event_date)
            return (
              <li key={event.id} onClick={() => onOpenEvent(event)}>
                <span className="home-cal" style={{ '--cat': categoryColor(event.category) }} aria-hidden="true">
                  <small>{parts.month}</small>
                  <b>{parts.day}</b>
                </span>
                <span className="home-events-text">
                  <button type="button" className="home-events-title" onClick={(e) => { e.stopPropagation(); onOpenEvent(event) }}>
                    {event.title}
                  </button>
                  <small className="muted">
                    {[parts.weekday, event.event_time ? formatTime(event.event_time) : null, `${count} ${count === 1 ? 'vai' : 'vão'}`].filter(Boolean).join(' · ')}
                  </small>
                </span>
                <button
                  type="button"
                  className={`btn ${going ? 'btn-ghost' : 'btn-primary'} home-events-go`}
                  aria-pressed={going}
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleEvent(event, !going)
                  }}
                >
                  {going ? '✓' : 'Vou'}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

/* ---------------------------------------------------------------------
   Aniversários (próximos 30 dias)
   --------------------------------------------------------------------- */
export function HomeBirthdays({ profiles }) {
  const list = useMemo(() => upcomingBirthdays(profiles, { withinDays: 30 }).slice(0, 4), [profiles])
  if (!list.length) return null
  return (
    <section className="card panel home-bdays" aria-labelledby="panel-bdays">
      <div className="panel-head">
        <h2 id="panel-bdays">Aniversários 🎂</h2>
      </div>
      <ul className="home-bdays-list">
        {list.map((item) => (
          <li key={item.profile.id} className={item.isToday ? 'is-today' : ''}>
            <Avatar name={item.profile.display_name} src={item.profile.avatar_url} size={28} />
            <b>{item.profile.display_name}</b>
            <small>
              {birthdayWhen(item)}
              {item.days > 1 && item.days < 7 ? ` ${String(item.date.getDate()).padStart(2, '0')}/${String(item.date.getMonth() + 1).padStart(2, '0')}` : ''}
            </small>
          </li>
        ))}
      </ul>
    </section>
  )
}

/* ---------------------------------------------------------------------
   Neste dia: o que a turma fez nesta mesma data em anos anteriores
   --------------------------------------------------------------------- */
const sameDay = (date, now, slack = 3) => {
  if (date.getFullYear() >= now.getFullYear()) return false
  const a = new Date(now.getFullYear(), date.getMonth(), date.getDate())
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.abs(a - b) <= slack * 86400000
}

export function HomeThisDay({ posts, events, onOpenPost, onOpenEvent }) {
  const memory = useMemo(() => {
    const now = new Date()
    const items = [
      ...(posts ?? [])
        .filter((post) => sameDay(new Date(post.created_at), now))
        .map((post) => ({ kind: 'post', at: new Date(post.created_at), post, title: post.caption || 'Fotos da turma', extra: `${post.images.length} ${post.images.length === 1 ? 'foto' : 'fotos'}` })),
      ...(events ?? [])
        .filter((event) => sameDay(eventStart(event), now))
        .map((event) => ({ kind: 'event', at: eventStart(event), event, title: event.title, extra: event.place ?? '' })),
    ]
    items.sort((a, b) => b.at - a.at)
    return items[0] ?? null
  }, [posts, events])
  if (!memory) return null
  const years = new Date().getFullYear() - memory.at.getFullYear()
  const open = () => (memory.kind === 'post' ? onOpenPost(memory.post) : onOpenEvent(memory.event))
  return (
    <section className="card panel home-thisday" aria-labelledby="panel-thisday">
      <div className="panel-head">
        <h2 id="panel-thisday">Neste dia</h2>
      </div>
      <button type="button" className="home-thisday-item" onClick={open}>
        <span className="home-thisday-thumb">
          {memory.kind === 'post' && memory.post.imageUrl ? <AdjImg src={memory.post.imageUrl} crop={memory.post.imageCrop} loading="lazy" /> : <Icon name={memory.kind === 'post' ? 'photos' : 'calendar'} />}
        </span>
        <span>
          <b>
            Há {years} {years === 1 ? 'ano' : 'anos'}: {memory.title}
          </b>
          <small className="muted">
            {memory.at.toLocaleDateString('pt-BR')}
            {memory.extra ? ` · ${memory.extra}` : ''}
          </small>
        </span>
      </button>
    </section>
  )
}

/* ---------------------------------------------------------------------
   Novidades (última versão dos patch notes)
   --------------------------------------------------------------------- */
export function HomeNews() {
  const latest = PATCH_NOTES[0]
  if (!latest) return null
  const first = latest.changes?.[0]?.text ?? latest.title
  return (
    <section className="card panel home-news" aria-labelledby="panel-news">
      <div className="panel-head">
        <h2 id="panel-news">Novidades</h2>
        <Link to="/patch-notes" className="panel-link">
          Ver
        </Link>
      </div>
      <Link to="/patch-notes" className="home-news-item">
        <span className="home-news-tag">v{LATEST_VERSION}</span>
        <span>
          <b>{latest.title}</b>
          {first && first !== latest.title && <small className="muted">{first}</small>}
        </span>
      </Link>
    </section>
  )
}
