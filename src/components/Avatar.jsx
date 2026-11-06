import { useEffect, useState } from 'react'

// Foto de perfil. Se a pessoa não tem foto (ou ela não carrega), mostramos um
// círculo com a inicial do nome. A cor é calculada a partir do nome,
// então cada amigo sempre aparece com a mesma cor.
// size="fill" faz o avatar ocupar toda a largura do espaço (quadrado), usado nos cartões da turma.
export default function Avatar({ name = '?', src, size = 36 }) {
  const [failed, setFailed] = useState(false)

  // Se a foto mudar, tenta carregar de novo.
  useEffect(() => setFailed(false), [src])

  const fill = size === 'fill'
  const box = fill ? { width: '100%', height: '100%' } : { width: size, height: size }

  if (src && !failed) {
    return <img className="avatar avatar-photo" src={src} alt="" aria-hidden="true" style={box} onError={() => setFailed(true)} />
  }

  const initial = name.trim().charAt(0).toUpperCase() || '?'
  const hue = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360

  return (
    <span
      className="avatar"
      aria-hidden="true"
      style={{ ...box, fontSize: fill ? '4.5rem' : size * 0.42, background: `hsl(${hue} 55% 42%)` }}
    >
      {initial}
    </span>
  )
}
