import { Link } from 'react-router-dom'
import { useLive } from '../contexts/LiveContext'

/** Aviso na Home quando alguém da turma está transmitindo. */
export default function LiveBanner() {
  const { hosts, viewersOf } = useLive()
  if (hosts.length === 0) return null
  const [first] = hosts
  return (
    <Link to="/ao-vivo" className="live-banner">
      <span className="live-tag">
        <span className="live-dot live-dot-static" aria-hidden="true" /> AO VIVO
      </span>
      <span className="live-banner-text">
        {hosts.length === 1 ? (
          <>
            <strong>{first.name}</strong> está transmitindo · {viewersOf(first.userId).length} assistindo
          </>
        ) : (
          <>
            <strong>{hosts.length} transmissões</strong> no ar · {hosts.map((meta) => meta.name).join(', ')}
          </>
        )}
      </span>
      <span className="live-banner-cta">Assistir &gt;</span>
    </Link>
  )
}
