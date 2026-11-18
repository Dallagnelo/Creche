import { useState } from 'react'
import { spriteUrl, TYPES } from '../../services/pokeapi'

/** Sprite pequeno (pixel art) com troca para um "?" se a imagem não carregar. */
export function PokeSprite({ id, alt = '', size = 96, className = '', src }) {
  const [failed, setFailed] = useState(false)
  if (failed || !id) {
    return (
      <span className={`pk-pixel ${className}`} style={{ width: size, height: size, display: 'grid', placeItems: 'center', fontSize: size / 3, opacity: 0.4 }} aria-hidden={!alt}>
        ?
      </span>
    )
  }
  return <img src={src ?? spriteUrl(id)} alt={alt} width={size} height={size} loading="lazy" decoding="async" className={`pk-pixel ${className}`} onError={() => setFailed(true)} />
}

export function PokeTypes({ types }) {
  return (
    <span className="pk-types">
      {types.map((t) => (
        <span key={t} className="pk-type" style={{ background: TYPES[t]?.color ?? '#999' }}>
          {TYPES[t]?.name ?? t}
        </span>
      ))}
    </span>
  )
}
