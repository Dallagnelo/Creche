import { useEffect, useRef, useState } from 'react'
import { AVATAR_H, avatarSprite } from '../lib/avatar'

// Plateia do Cine turma: overlay pequeno por cima do vídeo (estilo Twitch) quando você senta numa poltrona.
// Mostra quem está sentado nas poltronas do cinema, de costas para a tela, com o nome em cima,
// os emotes subindo da cabeça de quem mandou e o que cada um escreveu num balão.
// Embaixo, no canto, dá para reagir e escrever no chat sem levantar. É só na tela de quem assiste.

const EMOTES = ['👋', '😂', '❤️', '🎉', '😮', '👍']
const SCALE = 3 // bonequinho 16 px → 48 px
const MAX_SEATS = 14
const CHAIRS = ['#c83a4a', '#2b2f3c', '#3a6db4', '#a066d0', '#e8915a', '#38a85a', '#e86aa0', '#e8b83a']
const chairOf = (id) => CHAIRS[[...String(id)].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) % CHAIRS.length]
// emote (só emoji, sem letras): sobe flutuando; texto: vira balão em cima da pessoa
const isReaction = (text) => !/[\p{L}\p{N}]/u.test(text) && [...text].length <= 4

function SeatAvatar({ look }) {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    // sentado e de costas (olhando para o telão)
    ctx.drawImage(avatarSprite(look, { dir: 'up', pose: 'sit', withFace: false }), 0, 0, 16 * SCALE, AVATAR_H * SCALE)
  }, [look])
  return <canvas ref={ref} className="cine-avatar" width={16 * SCALE} height={AVATAR_H * SCALE} aria-hidden="true" />
}

export default function CinemaAudience({ getPeople, meId, onReact, onChat }) {
  const [people, setPeople] = useState([])
  const [floats, setFloats] = useState([]) // emotes subindo
  const [text, setText] = useState('')
  const seen = useRef(new Map()) // último balão visto de cada pessoa (para não repetir o mesmo emote)
  const inputRef = useRef(null)

  // lê quem está sentado de tempos em tempos (os dados ficam na cena da sala)
  useEffect(() => {
    const read = () => {
      const list = [...(getPeople() ?? [])]
      list.sort((a, b) => (a.id === meId ? -1 : b.id === meId ? 1 : a.name.localeCompare(b.name, 'pt-BR')))
      const fresh = []
      list.forEach((p) => {
        const last = seen.current.get(p.id)
        if (p.bubble && p.bubble !== last && isReaction(p.bubble)) {
          fresh.push({ key: `${p.id}-${Date.now()}-${Math.random()}`, id: p.id, text: p.bubble, drift: Math.round((Math.random() - 0.5) * 30) })
        }
        seen.current.set(p.id, p.bubble)
      })
      if (fresh.length) {
        setFloats((current) => [...current, ...fresh].slice(-30))
        fresh.forEach((f) => setTimeout(() => setFloats((current) => current.filter((x) => x.key !== f.key)), 2600))
      }
      setPeople(list)
    }
    read()
    const timer = setInterval(read, 300)
    return () => clearInterval(timer)
  }, [getPeople, meId])

  // ENTER (fora de um campo) abre o chat da plateia em vez do chat da sala, que fica escondido atrás do vídeo
  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== 'Enter' || event.target.closest?.('input, textarea, select, button')) return
      event.preventDefault()
      event.stopImmediatePropagation()
      inputRef.current?.focus()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])

  const send = (event) => {
    event.preventDefault()
    const clean = text.trim()
    if (!clean) {
      inputRef.current?.blur()
      return
    }
    if (onChat?.(clean) !== false) {
      setText('')
      inputRef.current?.blur() // mandou: sai do campo (ENTER de novo para escrever)
    }
  }

  const shown = people.slice(0, MAX_SEATS)
  const extra = people.length - shown.length
  // você no meio da fileira
  const middle = Math.floor(shown.length / 2)
  const row = shown.length > 1 ? [...shown.slice(1, middle + 1), shown[0], ...shown.slice(middle + 1)] : shown

  return (
    <div className="cine-overlay">
      <div className="cine-row" aria-label={`Plateia: ${people.length} ${people.length === 1 ? 'pessoa sentada' : 'pessoas sentadas'}`}>
        {row.map((p) => (
          <div key={p.id} className={`cine-seat${p.id === meId ? ' is-me' : ''}`} title={p.name}>
            {floats
              .filter((f) => f.id === p.id)
              .map((f) => (
                <span key={f.key} className="cine-float" aria-hidden="true" style={{ '--drift': `${f.drift}px` }}>
                  {f.text}
                </span>
              ))}
            {p.bubble && !isReaction(p.bubble) && <span className="cine-bubble">{p.bubble}</span>}
            <span className="cine-name">{p.name.split(' ')[0]}</span>
            <SeatAvatar look={p.look} />
            <span className="cine-chair" style={{ '--chair': chairOf(p.id) }} aria-hidden="true" />
          </div>
        ))}
        {extra > 0 && <div className="cine-more">+{extra}</div>}
      </div>

      <div className="cine-controls">
        <form className="cine-chat" onSubmit={send}>
          <input
            ref={inputRef}
            value={text}
            maxLength={80}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => event.key === 'Escape' && (event.stopPropagation(), event.currentTarget.blur())}
            placeholder="Falar com a plateia (ENTER)"
            aria-label="Mensagem para a plateia"
          />
          <button type="submit">Falar</button>
        </form>
        <div className="cine-react" role="group" aria-label="Reagir">
          {EMOTES.map((emote) => (
            <button key={emote} type="button" onClick={() => onReact?.(emote)} aria-label={`Reagir com ${emote}`}>
              {emote}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
