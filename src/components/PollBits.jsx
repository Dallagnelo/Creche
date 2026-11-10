import { clockBoxes } from '../lib/polls'
import { posterUrl } from '../lib/tmdb'
import Icon from './Icon'

// Pedaços compartilhados das votações: pôster, selo e relógio.

export function Poster({ movie, size = 'w342', className = '' }) {
  const src = posterUrl(movie?.poster_path, size)
  return (
    <span className={`pl-poster ${className}`}>
      {src ? <img src={src} alt="" loading="lazy" /> : <Icon name="movies" />}
    </span>
  )
}

/** Selo pequeno: tone = pink | mint | muted | star, solid = preenchido. */
export function Tag({ icon, tone = 'pink', solid = false, children }) {
  return (
    <span className={`pl-tag is-${tone}${solid ? ' is-solid' : ''}`}>
      {icon && <Icon name={icon} />}
      {children}
    </span>
  )
}

/** Três quadros grandes (HORAS · MIN · SEG). `small` na lista. */
export function Clock({ ms, small = false }) {
  return (
    <div className={`pl-clock${small ? ' is-small' : ''}`} role="timer" aria-label="Tempo restante">
      {clockBoxes(ms).map((box) => (
        <div key={box.l} className="pl-clock-box">
          <b>{box.v}</b>
          <span>{box.l}</span>
        </div>
      ))}
    </div>
  )
}
