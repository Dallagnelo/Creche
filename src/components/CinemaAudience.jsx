import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AVATAR_H, avatarSprite } from '../lib/avatar'
import { MoodChart, MoodSlider } from './CinemaMood'

// Plateia do Cine turma: overlay pequeno por cima do vídeo (estilo Twitch) quando você senta numa poltrona.
// Mostra quem está sentado, de costas para a tela, com o nome em cima, o que tem na mão (pipoca/refri)
// e coroinha para quem está na primeira fila. Clicando num amigo: jogar pipoca, cutucar ou pedir silêncio.
// Com 3 pessoas ou mais dá para puxar a ola. Emotes sobem da cabeça; o chat (ENTER) vira balão.
// É só na tela de quem assiste: não entra no vídeo da transmissão.

const EMOTES = ['👋', '😂', '❤️', '🎉', '😮', '👍']
const SCALE = 3 // bonequinho 16 px → 48 px
const MAX_SEATS = 14
// emote (só emoji, sem letras): sobe flutuando; texto: vira balão em cima da pessoa
const isReaction = (text) => !/[\p{L}\p{N}]/u.test(text) && [...text].length <= 4
// primeiro nome; se não couber no encosto, abrevia ("Anchuvinha" → "Anchu.")
const shortName = (name) => {
  const first = String(name ?? '').trim().split(/\s+/)[0] || '?'
  return first.length > 6 ? `${first.slice(0, 5)}.` : first
}
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`

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

// "ir ao banheiro": o bonequinho anda devagar pela frente da fileira (passando na frente de todo mundo)
const WALK_SPEED = 70 // px por segundo
function Walker({ look, from, to, dir, line, onDone }) {
  const ref = useRef(null)
  const boxRef = useRef(null)
  const done = useRef(onDone)
  done.current = onDone
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return undefined
    const ctx = canvas.getContext('2d')
    ctx.imageSmoothingEnabled = false
    const ms = Math.max(2500, (Math.hypot(to.x - from.x, to.y - from.y) / WALK_SPEED) * 1000)
    const start = performance.now()
    let raf = 0
    let lastFrame = -1
    const tick = (now) => {
      const t = Math.min(1, (now - start) / ms)
      boxRef.current.style.transform = `translate(${from.x + (to.x - from.x) * t}px, ${from.y + (to.y - from.y) * t}px)`
      const frame = t < 1 ? 1 + (Math.floor(((now - start) / 1000) * 5) % 2) : 0 // passinhos
      if (frame !== lastFrame) {
        lastFrame = frame
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(avatarSprite(look, { dir, frame, withFace: true }), 0, 0, 16 * SCALE, AVATAR_H * SCALE)
      }
      if (t < 1) raf = requestAnimationFrame(tick)
      else done.current?.()
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [look, from, to, dir])
  return (
    <div ref={boxRef} className="cine-walker" aria-hidden="true">
      <canvas ref={ref} width={16 * SCALE} height={AVATAR_H * SCALE} />
      {line && <span className="cine-walker-line">{line}</span>}
    </div>
  )
}

// pipoca voando em arco de quem jogou até quem levou
function Flight({ from, to }) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const xm = (from.x + to.x) / 2
    const ym = Math.min(from.y, to.y) - 120
    el.style.setProperty('--x0', `${from.x}px`)
    el.style.setProperty('--y0', `${from.y}px`)
    el.style.setProperty('--xm', `${xm}px`)
    el.style.setProperty('--ym', `${ym}px`)
    el.style.setProperty('--x1', `${to.x}px`)
    el.style.setProperty('--y1', `${to.y}px`)
  }, [from, to])
  return (
    <span ref={ref} className="cine-flight" aria-hidden="true">
      🍿
    </span>
  )
}

export default function CinemaAudience({ getPeople, meId, onReact, onChat, cine, mood, title }) {
  const [people, setPeople] = useState([])
  const [floats, setFloats] = useState([]) // emotes subindo
  const [text, setText] = useState('')
  const [typing, setTyping] = useState(false) // o campo do chat só aparece depois do ENTER
  const [menuFor, setMenuFor] = useState(null) // amigo clicado (menu de brincadeiras)
  const [flights, setFlights] = useState([]) // pipocas no ar
  const [hits, setHits] = useState([]) // "ploc!" em quem levou
  const [pokes, setPokes] = useState({}) // quem está dando pulinho (cutucado)
  const [shhs, setShhs] = useState([]) // balões de "Shhh!"
  const [wave, setWave] = useState(null) // ola em andamento (chave para reiniciar a animação)
  const [toast, setToast] = useState(null)
  const [splats, setSplats] = useState([]) // pipocas grudadas na tela
  const [walkers, setWalkers] = useState([]) // quem está indo ao banheiro / voltando
  const seen = useRef(new Map()) // último balão visto de cada pessoa (para não repetir o mesmo emote)
  const inputRef = useRef(null)
  const overlayRef = useRef(null)
  const seatRefs = useRef(new Map())
  const peopleRef = useRef([])
  peopleRef.current = people
  // nota ao vivo (barrinha 😡…😍) e o gráfico da sessão: quem anota é o telão (vale para a sala toda)
  const chartOpen = mood.chartOpen
  const setChartOpen = mood.setChartOpen

  const later = (fn, ms) => setTimeout(fn, ms)
  const nameOf = (id) => (id === meId ? 'Você' : peopleRef.current.find((p) => p.id === id)?.name.split(' ')[0] ?? 'Alguém')
  const showToast = (message) => {
    const key = uid()
    setToast({ key, message })
    later(() => setToast((current) => (current?.key === key ? null : current)), 2600)
  }

  // lê quem está sentado de tempos em tempos (os dados ficam na cena da sala)
  useEffect(() => {
    const read = () => {
      const list = [...(getPeople() ?? [])]
      list.sort((a, b) => (a.id === meId ? -1 : b.id === meId ? 1 : a.name.localeCompare(b.name, 'pt-BR')))
      const fresh = []
      list.forEach((p) => {
        const last = seen.current.get(p.id)
        if (p.bubble && p.bubble !== last && isReaction(p.bubble)) {
          fresh.push({ key: uid(), id: p.id, text: p.bubble, drift: Math.round((Math.random() - 0.5) * 30) })
        }
        seen.current.set(p.id, p.bubble)
      })
      if (fresh.length) {
        setFloats((current) => [...current, ...fresh].slice(-30))
        fresh.forEach((f) => later(() => setFloats((current) => current.filter((x) => x.key !== f.key)), 2600))
      }
      setPeople(list)
    }
    read()
    const timer = setInterval(read, 300)
    return () => clearInterval(timer)
  }, [getPeople, meId])

  // centro de cada poltrona, em relação ao overlay (para a pipoca voar de um para o outro)
  const spot = (id) => {
    const box = overlayRef.current?.getBoundingClientRect()
    const el = seatRefs.current.get(id)
    if (!box) return null
    if (!el) return { x: box.width - 60, y: box.height - 40 } // quem jogou não está sentado: vem do canto
    const r = el.getBoundingClientRect()
    return { x: r.left - box.left + r.width / 2 - 14, y: r.top - box.top + 20 }
  }

  // o que os outros (e você) fazem na plateia
  useEffect(() => {
    if (!cine) return undefined
    return cine.subscribe((ev) => {
      if (ev.act === 'popcorn') {
        const from = spot(ev.from)
        const to = spot(ev.to)
        if (from && to) {
          const key = uid()
          setFlights((current) => [...current, { key, from, to }])
          later(() => {
            setFlights((current) => current.filter((f) => f.key !== key))
            setHits((current) => [...current, { key, to: ev.to }])
            setPokes((current) => ({ ...current, [ev.to]: uid() }))
            later(() => setHits((current) => current.filter((h) => h.key !== key)), 1200)
          }, 850)
        }
        if (ev.to === meId) later(() => showToast(`🍿 ${nameOf(ev.from)} jogou pipoca em você!`), 850)
      } else if (ev.act === 'screen') {
        // pipoca na tela: voa da poltrona até um ponto do vídeo, gruda e escorrega
        const box = overlayRef.current?.getBoundingClientRect()
        const from = spot(ev.from)
        if (box && from) {
          const key = uid()
          const to = { x: ev.x * box.width, y: ev.y * (box.height - 120) }
          setFlights((current) => [...current, { key, from, to }])
          later(() => {
            setFlights((current) => current.filter((f) => f.key !== key))
            setSplats((current) => [...current, { key, x: to.x, y: to.y }].slice(-40))
            later(() => setSplats((current) => current.filter((p) => p.key !== key)), 4200)
          }, 850)
        }
      } else if (ev.act === 'poke') {
        setPokes((current) => ({ ...current, [ev.to]: uid() }))
        if (ev.to === meId) showToast(`👉 ${nameOf(ev.from)} te cutucou`)
      } else if (ev.act === 'shh') {
        const key = uid()
        setShhs((current) => [...current, { key, to: ev.to, from: ev.from }])
        later(() => setShhs((current) => current.filter((s) => s.key !== key)), 2600)
        if (ev.to === meId) showToast(`🤫 ${nameOf(ev.from)} pediu silêncio`)
      } else if (ev.act === 'away') {
        // sai andando da poltrona até sumir pela direita; na volta, faz o caminho contrário e senta
        const box = overlayRef.current?.getBoundingClientRect()
        const el = seatRefs.current.get(ev.from)
        const person = peopleRef.current.find((p) => p.id === ev.from)
        if (box && el && person) {
          const r = el.getBoundingClientRect()
          const seat = { x: r.left - box.left + r.width / 2 - 8 * SCALE, y: r.top - box.top - 6 }
          const out = { x: box.width + 20, y: seat.y }
          const key = uid()
          const name = ev.from === meId ? null : person.name.split(' ')[0]
          const walker = ev.v
            ? { key, id: ev.from, look: person.look, from: seat, to: out, dir: 'right', line: 'com licença… 🙏' }
            : { key, id: ev.from, look: person.look, from: out, to: seat, dir: 'left', line: 'voltei! 😌', back: true }
          setWalkers((current) => [...current.filter((w) => w.id !== ev.from), walker])
          if (name) showToast(ev.v ? `🚽 ${name} foi ao banheiro` : `🚶 ${name} voltou do banheiro`)
        }
      } else if (ev.act === 'wave') {
        const key = uid()
        setWave(key)
        later(() => setWave((current) => (current === key ? null : current)), MAX_SEATS * 140 + 1000)
        showToast(`🌊 ${nameOf(ev.from)} puxou a ola!`)
      }
    })
  }, [cine, meId])

  // ENTER (fora de um campo) abre o chat da plateia em vez do chat da sala, que fica escondido atrás do vídeo
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape' && menuFor) {
        event.stopImmediatePropagation()
        setMenuFor(null)
        return
      }
      if (event.key !== 'Enter' || event.target.closest?.('input, textarea, select, button')) return
      event.preventDefault()
      event.stopImmediatePropagation()
      setTyping(true)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [menuFor])

  // menu aberto: fecha ao clicar fora
  useEffect(() => {
    if (!menuFor) return undefined
    const onDown = (event) => !event.target.closest?.('.cine-menu, .cine-seat') && setMenuFor(null)
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [menuFor])

  // o campo aparece já com o cursor dentro
  useEffect(() => {
    if (typing) inputRef.current?.focus()
  }, [typing])

  const send = (event) => {
    event.preventDefault()
    const clean = text.trim()
    if (!clean) {
      setTyping(false)
      return
    }
    if (onChat?.(clean) !== false) {
      setText('')
      setTyping(false) // mandou: o campo some (ENTER de novo para escrever)
    }
  }

  const play = (act, to = null) => {
    setMenuFor(null)
    if (me?.away) {
      showToast('Você está no banheiro 🚽')
      return
    }
    const result = cine?.act(act, to)
    if (result === 'empty') showToast('Sem pipoca! Levante e pegue um balde na pipoqueira 🍿')
    else if (result === 'wait') showToast('Calma! Uma de cada vez 😄')
  }

  const me = people.find((p) => p.id === meId)
  const myWalk = walkers.some((w) => w.id === meId)
  const bathroom = () => {
    setMenuFor(null)
    cine?.act('away', null, { v: !me?.away })
  }
  const myPopcorn = me?.hold?.popcorn ?? 0
  const shown = people.slice(0, MAX_SEATS)
  const extra = people.length - shown.length
  // você no meio da fileira
  const middle = Math.floor(shown.length / 2)
  const row = shown.length > 1 ? [...shown.slice(1, middle + 1), shown[0], ...shown.slice(middle + 1)] : shown

  return (
    <div className="cine-overlay" ref={overlayRef}>
      <div className="cine-row" aria-label={`Plateia: ${people.length} ${people.length === 1 ? 'pessoa sentada' : 'pessoas sentadas'}`}>
        {row.map((p, index) => {
          const isMe = p.id === meId
          const poked = pokes[p.id]
          // foi ao banheiro (ou está andando): a poltrona fica vazia
          const empty = p.away || walkers.some((w) => w.id === p.id)
          return (
            <div
              key={p.id}
              ref={(el) => (el ? seatRefs.current.set(p.id, el) : seatRefs.current.delete(p.id))}
              className={`cine-seat${isMe ? ' is-me' : ' is-friend'}${empty ? ' is-empty' : ''}`}
              title={p.away ? `${p.name} foi ao banheiro` : p.name}
            >
              {floats
                .filter((f) => f.id === p.id)
                .map((f) => (
                  <span key={f.key} className="cine-float" aria-hidden="true" style={{ '--drift': `${f.drift}px` }}>
                    {f.text}
                  </span>
                ))}
              {hits
                .filter((h) => h.to === p.id)
                .map((h) => (
                  <span key={h.key} className="cine-hit" aria-hidden="true">
                    ploc!
                  </span>
                ))}
              {shhs
                .filter((s) => s.to === p.id)
                .map((s) => (
                  <span key={s.key} className="cine-bubble is-shh">
                    🤫 Shhh! <small>({nameOf(s.from)})</small>
                  </span>
                ))}
              {p.bubble && !isReaction(p.bubble) && !shhs.some((s) => s.to === p.id) && <span className="cine-bubble">{p.bubble}</span>}

              {menuFor === p.id && (
                <div className="cine-menu" role="menu" aria-label={`Brincar com ${p.name}`}>
                  <button type="button" role="menuitem" onClick={() => play('popcorn', p.id)}>
                    🍿 Jogar pipoca <small>{myPopcorn > 0 ? `(${myPopcorn})` : '(sem pipoca)'}</small>
                  </button>
                  <button type="button" role="menuitem" onClick={() => play('poke', p.id)}>
                    👉 Cutucar
                  </button>
                  <button type="button" role="menuitem" onClick={() => play('shh', p.id)}>
                    🤫 Shhh!
                  </button>
                </div>
              )}

              <button
                type="button"
                className="cine-seat-hit"
                disabled={isMe || empty}
                aria-haspopup={isMe ? undefined : 'menu'}
                aria-expanded={isMe ? undefined : menuFor === p.id}
                aria-label={isMe ? 'Você' : `${p.name}: jogar pipoca, cutucar ou pedir silêncio`}
                onClick={() => !isMe && setMenuFor((current) => (current === p.id ? null : p.id))}
              >
                <span
                  key={`${poked ?? ''}-${wave ?? ''}`}
                  className={`cine-body${poked ? ' is-poked' : ''}${wave ? ' is-wave' : ''}`}
                  style={wave ? { animationDelay: `${index * 140}ms` } : undefined}
                >
                  {!empty && <SeatAvatar look={p.look} />}
                  {wave && <span className="cine-hands" aria-hidden="true">🙌</span>}
                </span>
                {!empty && (p.hold?.popcorn > 0 || p.hold?.soda) && (
                  <span className="cine-hold" aria-label={`Tem ${p.hold?.popcorn ? `${p.hold.popcorn} punhados de pipoca` : ''}${p.hold?.soda ? ' e refri' : ''}`}>
                    {p.hold?.popcorn > 0 && <span>🍿{p.hold.popcorn}</span>}
                    {p.hold?.soda && <span>🥤</span>}
                  </span>
                )}
                {/* nome escrito no encosto da poltrona (abreviado se for grande) */}
                <span className="cine-chair" aria-hidden="true">
                  <span className="cine-chair-name">{shortName(p.name)}</span>
                  {p.away && <span className="cine-chair-away">🚽</span>}
                </span>
              </button>
            </div>
          )
        })}
        {extra > 0 && <div className="cine-more">+{extra}</div>}
      </div>

      {splats.map((p) => (
        <span key={p.key} className="cine-splat" aria-hidden="true" style={{ left: p.x, top: p.y }}>
          🍿
        </span>
      ))}

      {walkers.map((w) => (
        <Walker
          key={w.key}
          look={w.look}
          from={w.from}
          to={w.to}
          dir={w.dir}
          line={w.line}
          onDone={() => setWalkers((current) => current.filter((x) => x.key !== w.key))}
        />
      ))}

      {flights.map((f) => (
        <Flight key={f.key} from={f.from} to={f.to} />
      ))}

      <MoodSlider value={mood.mine} onChange={mood.setMine} />
      {chartOpen && <MoodChart timeline={mood.timeline} title={title} onClose={() => setChartOpen(false)} />}

      {toast && (
        <div key={toast.key} className="cine-toast" role="status">
          {toast.message}
        </div>
      )}

      <div className="cine-controls">
        {typing ? (
          <form className="cine-chat" onSubmit={send}>
            <input
              ref={inputRef}
              value={text}
              maxLength={80}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.stopPropagation()
                  setTyping(false)
                }
              }}
              onBlur={() => !text.trim() && setTyping(false)}
              placeholder="Falar com a plateia"
              aria-label="Mensagem para a plateia"
            />
            <button type="submit">Falar</button>
          </form>
        ) : (
          <button type="button" className="cine-chat-hint" onClick={() => setTyping(true)}>
            ENTER para falar · clique num amigo para brincar
          </button>
        )}
        <button
          type="button"
          className={`cine-bathroom${me?.away ? ' is-away' : ''}`}
          onClick={bathroom}
          disabled={!me || myWalk}
        >
          {me?.away ? '🚶 Voltar do banheiro' : '🚽 Ir ao banheiro'}
        </button>
        <div className="cine-react" role="group" aria-label="Reagir">
          <button
            type="button"
            onClick={() => setChartOpen((open) => !open)}
            title="Ver como a turma está sentindo o vídeo"
            aria-label="Ver o gráfico da nota ao vivo"
            aria-pressed={chartOpen}
          >
            📈
          </button>
          <button
            type="button"
            className="cine-screen-btn"
            onClick={() => play('screen')}
            title={myPopcorn > 0 ? `Jogar pipoca na tela (${myPopcorn})` : 'Sem pipoca: pegue um balde na pipoqueira'}
            aria-label="Jogar pipoca na tela"
          >
            🍿
          </button>
          <button
            type="button"
            className="cine-wave-btn"
            onClick={() => play('wave')}
            disabled={people.length < 3}
            title={people.length < 3 ? 'A ola precisa de 3 pessoas sentadas' : 'Puxar a ola'}
            aria-label="Puxar a ola"
          >
            🌊
          </button>
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
