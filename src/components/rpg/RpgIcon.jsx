import { iconUrl } from '../../lib/rpg/data'

/** Ícone do game-icons.net pintado com a cor do texto (decorativo, a não ser que receba label). */
export default function RpgIcon({ name, label, className = '', style }) {
  return (
    <span
      className={`rpg-ico ${className}`}
      style={{ '--ico': `url(${iconUrl(name)})`, ...style }}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  )
}
