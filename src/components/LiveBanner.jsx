import { Link } from 'react-router-dom'
import { useLive } from '../contexts/LiveContext'

/** Aviso na Home quando alguém da turma está transmitindo. */
export default function LiveBanner() {
  const { host, viewers } = useLive()
  if (!host) return null
  return (
    <Link to="/ao-vivo" className="live-banner">
      <span className="live-tag">
        <span className="live-dot live-dot-static" aria-hidden="true" /> AO VIVO
      </span>
      <span className="live-banner-text">
        <strong>{host.name}</strong> está transmitindo · {viewers.length} assistindo
      </span>
      <span className="live-banner-cta">Assistir &gt;</span>
    </Link>
  )
}
