import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePhone } from '../hooks/useMediaQuery'
import { formatTime, shortDate } from '../lib/events'
import { isPollDue, isPollOpen, msLeft, tally, winnersOf } from '../lib/polls'
import { Clock, Poster, Tag } from './PollBits'
import Icon from './Icon'

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

function eventLine(poll) {
  if (!poll.event_date) return ''
  return [shortDate(poll.event_date), formatTime(poll.event_time), poll.event_place].filter(Boolean).join(' · ')
}

// Votação aberta: cartas grandes. No computador clica na carta; no celular desliza e usa "Votar neste".
function Deck({ poll, userId, now, onVote, onUnvote, busy }) {
  const phone = usePhone()
  const { options, total } = tally(poll)
  const mine = poll.votes.find((vote) => vote.user_id === userId)?.option_id ?? null
  const [focus, setFocus] = useState(mine ?? options[0]?.id)
  const deckRef = useRef(null)
  const frame = useRef(0)
  const open = isPollOpen(poll, now)
  const showCounts = Boolean(mine)

  // Celular: a carta mais perto do centro é a "da vez".
  function handleScroll() {
    if (!phone) return
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      const deck = deckRef.current
      if (!deck) return
      const center = deck.scrollLeft + deck.clientWidth / 2
      let best = null
      Array.from(deck.children).forEach((card) => {
        const distance = Math.abs(card.offsetLeft + card.offsetWidth / 2 - center)
        if (!best || distance < best.distance) best = { id: card.dataset.id, distance }
      })
      if (best && best.id !== focus) setFocus(best.id)
    })
  }
  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  // Centraliza a carta inicial no celular (depois que a janela terminou de abrir).
  useEffect(() => {
    if (!phone || !deckRef.current) return undefined
    const id = requestAnimationFrame(() => {
      const card = deckRef.current?.querySelector(`[data-id="${focus}"]`)
      card?.scrollIntoView({ inline: 'center', block: 'nearest' })
    })
    return () => cancelAnimationFrame(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone])

  function skip() {
    const index = options.findIndex((option) => option.id === focus)
    const next = options[(index + 1) % options.length]
    const card = deckRef.current?.querySelector(`[data-id="${next.id}"]`)
    if (card) deckRef.current.scrollTo({ left: card.offsetLeft - (deckRef.current.clientWidth - card.offsetWidth) / 2, behavior: 'smooth' })
    setFocus(next.id)
  }

  const focused = options.find((option) => option.id === focus) ?? options[0]
  const isMine = focused?.id === mine
  const label = isMine ? 'Tirar meu voto' : mine ? `Mudar voto para ${focused.movie.title}` : `Votar em ${focused.movie.title}`
  const shortLabel = isMine ? 'Tirar voto' : mine ? 'Mudar para este' : 'Votar neste'

  return (
    <>
      <div className="pl-deck" ref={deckRef} onScroll={handleScroll} role="listbox" aria-label="Filmes da votação">
        {options.map((option) => {
          const on = option.id === focus
          return (
            <button
              key={option.id}
              type="button"
              role="option"
              aria-selected={on}
              data-id={option.id}
              aria-label={option.movie.title}
              title={option.movie.title}
              className={`pl-card${on ? ' is-focus' : ''}${option.id === mine ? ' is-mine' : ''}`}
              onClick={() => open && setFocus(option.id)}
            >
              <span className="pl-card-art">
                <Poster movie={option.movie} size="w500" />
                {option.id === mine && <span className="pl-stamp">SEU VOTO</span>}
                {showCounts && <span className="pl-count">{plural(option.votes, 'voto', 'votos')}</span>}
              </span>
            </button>
          )
        })}
      </div>

      <div className="pl-dots phone-only-block" aria-hidden="true">
        {options.map((option) => (
          <span key={option.id} className={option.id === focus ? 'is-on' : ''} />
        ))}
      </div>

      {!showCounts && total > 0 && <p className="muted pl-hint">O placar aparece depois do seu voto.</p>}

      {open && (
        <div className="pl-actions">
          <button type="button" className="btn btn-ghost phone-only-flex" onClick={skip} disabled={options.length < 2}>
            Passar
          </button>
          <button type="button" className={`btn ${isMine ? 'btn-ghost' : 'btn-primary'}`} disabled={busy} onClick={() => (isMine ? onUnvote() : onVote(focused.id))}>
            <span className="desk-only">{label}</span>
            <span className="phone-only">{shortLabel}</span>
          </button>
        </div>
      )}
    </>
  )
}

// Encerrada: pódio (ou "VS" no empate) e o card do evento.
function Result({ poll }) {
  const { ranking, total } = tally(poll)
  const winners = winnersOf(poll)
  const tie = winners.length > 1
  const line = eventLine(poll)

  return (
    <>
      {total === 0 ? (
        <p className="pl-empty">Ninguém votou nesta votação.</p>
      ) : tie ? (
        <div className="pl-vs">
          <div className="pl-vs-row">
            {winners.map((option, index) => (
              <div key={option.id} className="pl-vs-item">
                {index > 0 && <span className="pl-vs-mark" aria-hidden="true">VS</span>}
                <Poster movie={option.movie} size="w500" className="is-tie" />
                <b>{option.movie.title}</b>
              </div>
            ))}
          </div>
          <Tag icon="trophy" tone="pink" solid>
            EMPATE · {plural(winners[0].votes, 'VOTO', 'VOTOS')} CADA
          </Tag>
        </div>
      ) : (
        <div className="pl-podium" aria-label="Pódio">
          {[1, 0, 2]
            .filter((index) => ranking[index] && ranking[index].votes > 0)
            .map((index) => {
              const option = ranking[index]
              return (
                <div key={option.id} className={`pl-pod pl-pod-${index + 1}`}>
                  <Poster movie={option.movie} size="w342" />
                  <b>{option.movie.title}</b>
                  <span className="pl-pod-step">
                    {index === 0 && <Icon name="trophy" />}
                    {index + 1}º
                  </span>
                  <small>{plural(option.votes, 'voto', 'votos')}</small>
                </div>
              )
            })}
        </div>
      )}

      {poll.event_id && (
        <div className="pl-event">
          <Icon name="calendar" />
          <div>
            <strong>{tie ? 'Virou evento com os filmes empatados' : 'Virou evento!'}</strong>
            <span>{line}</span>
          </div>
          <Link to="/eventos" className="btn btn-primary">Ver</Link>
        </div>
      )}
      {!poll.event_id && poll.make_event && total === 0 && (
        <p className="muted pl-hint">Como ninguém votou, o evento não foi criado.</p>
      )}
    </>
  )
}

export default function PollDetail({ poll, userId, now, busy, canManage, onVote, onUnvote, onCloseNow, onDelete }) {
  const open = isPollOpen(poll, now)
  const due = isPollDue(poll, now)
  const left = msLeft(poll, now)
  const { total } = tally(poll)
  const line = eventLine(poll)

  return (
    <div className="pl-detail">
      <div className="pl-detail-head">
        <div>
          <h2>{poll.title}</h2>
          <p className="muted">
            Aberta por {poll.creator?.display_name ?? 'alguém'} · {plural(total, 'voto', 'votos')}
          </p>
        </div>
        {poll.status === 'closed' && <Tag icon="check" tone="muted">Encerrada</Tag>}
        {due && <Tag icon="clock" tone="pink">Encerrando…</Tag>}
        {open && left == null && <Tag icon="clock" tone="mint">Sem prazo</Tag>}
      </div>

      {open && left != null && <Clock ms={left} />}

      {open && poll.make_event && (
        <p className="muted pl-hint">
          Ao encerrar, vira evento: {line}. Em caso de empate, os filmes empatados entram juntos.
        </p>
      )}

      {poll.status === 'closed' ? (
        <Result poll={poll} />
      ) : (
        <Deck key={poll.id + (open ? 'o' : 'c')} poll={poll} userId={userId} now={now} busy={busy} onVote={onVote} onUnvote={onUnvote} />
      )}

      {canManage && (
        <div className="pl-manage">
          {poll.status === 'open' && (
            <button type="button" className="btn btn-ghost" onClick={() => onCloseNow(poll)} disabled={busy}>
              Encerrar agora
            </button>
          )}
          <button type="button" className="btn btn-danger" onClick={() => onDelete(poll)} disabled={busy}>
            <Icon name="trash" />
            Apagar votação
          </button>
        </div>
      )}
    </div>
  )
}
