import { useEffect, useRef, useState } from 'react'
import DATA from '../../lib/turma2Rooms.json'

// Turma 2.0 (teste): as salas prontas do museu do LimeZu, desenhadas só com os sprites do pacote.
// Camadas: chão e paredes → objetos atrás do boneco → boneco → objetos na frente dele
// (cada objeto tem a "linha do pé": se o pé do boneco está mais embaixo, ele passa na frente).
// Anda com as setas / WASD ou clicando no chão. Por enquanto é só você na sala (modo de teste).

const T = 16
const SPEED = 4.5 // quadradinhos por segundo
const DIRS = { right: 0, up: 1, left: 2, down: 3 } // ordem das colunas na folha do boneco
const KEYS = {
  ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1],
  ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0],
}
const BASE = '/limezu/t2/'

const images = new Map()
const loadImage = (name) => {
  if (!images.has(name)) {
    images.set(
      name,
      new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => {
          images.delete(name) // deixa tentar de novo depois
          reject(new Error(name.startsWith('/') ? name : `${BASE}${name}.png`))
        }
        img.src = name.startsWith('/') ? name : `${BASE}${name}.png`
      }),
    )
  }
  return images.get(name)
}

const free = (room, x, y) => y >= 0 && x >= 0 && y < room.walk.length && x < room.walk[0].length && room.walk[y][x] === '.'
const dirOf = (dx, dy) => (dx > 0 ? 'right' : dx < 0 ? 'left' : dy < 0 ? 'up' : 'down')

// caminho até o quadradinho clicado (ou até o mais perto dele que dá para chegar)
function findPath(room, from, to) {
  const w = room.walk[0].length
  const key = (x, y) => y * w + x
  const prev = new Map([[key(from.x, from.y), null]])
  const queue = [from]
  let best = from
  let bestD = Math.abs(from.x - to.x) + Math.abs(from.y - to.y)
  while (queue.length) {
    const cur = queue.shift()
    const d = Math.abs(cur.x - to.x) + Math.abs(cur.y - to.y)
    if (d < bestD) {
      best = cur
      bestD = d
    }
    if (d === 0) break
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cur.x + dx
      const ny = cur.y + dy
      if (!free(room, nx, ny) || prev.has(key(nx, ny))) continue
      prev.set(key(nx, ny), cur)
      queue.push({ x: nx, y: ny })
    }
  }
  const path = []
  for (let p = best; p && (p.x !== from.x || p.y !== from.y); p = prev.get(key(p.x, p.y))) path.unshift(p)
  return path
}

export default function Turma2Game() {
  const [code, setCode] = useState(DATA.rooms.find((r) => !r.hidden).code)
  const arriveRef = useRef(null) // ao passar por uma porta: onde o boneco aparece no outro lugar
  const [showGrid, setShowGrid] = useState(false)
  const [sky, setSky] = useState('dia') // lugares ao ar livre: dia, fim de tarde ou noite (as luzes acendem)
  const skyRef = useRef(sky)
  skyRef.current = sky
  const [ready, setReady] = useState(false)
  const [missing, setMissing] = useState(null) // imagem que não carregou (arquivo faltando?)
  const boxRef = useRef(null)
  const canvasRef = useRef(null)
  const gridRef = useRef(showGrid)
  gridRef.current = showGrid
  const room = DATA.rooms.find((r) => r.code === code)

  useEffect(() => {
    let alive = true
    let raf = 0
    setReady(false)
    setMissing(null)
    const canvas = canvasRef.current
    const box = boxRef.current
    const ctx = canvas.getContext('2d')
    const start = arriveRef.current ?? room.spawn
    arriveRef.current = null
    const me = { x: start[0], y: start[1], fx: start[0], fy: start[1], dir: 'up', next: null, path: [], anim: 0 }
    if (window.__ROOM_TEST__) window.__t2 = { me, room, go: (x, y) => (me.path = findPath(room, { x: me.x, y: me.y }, { x, y })) } // só nos testes
    let fade = 1 // escurecido ao chegar: clareia; ao entrar numa porta: escurece e troca de lugar
    let leaving = null
    const held = []
    let view = { zoom: 3, ox: 0, oy: 0 }

    const resize = () => {
      const rect = box.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.round(rect.width * dpr)
      canvas.height = Math.round(rect.height * dpr)
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      // zoom inteiro (pixel art sem borrar), o maior que cabe: a sala ocupa a caixa toda na largura
      // ou na altura (o resto a câmera mostra andando); no mínimo 2x, no máximo 6x
      const fitW = canvas.width / room.w
      const fitH = canvas.height / room.h
      view.zoom = Math.max(2, Math.min(6, Math.floor(Math.max(Math.min(fitW, fitH * 1.6), Math.min(fitW, fitH)))))
    }
    const observer = new ResizeObserver(resize)
    observer.observe(box)
    resize()

    const onKey = (event) => {
      const step = KEYS[event.code]
      if (!step) return
      event.preventDefault()
      const i = held.findIndex((s) => s === step)
      if (event.type === 'keydown') {
        if (i < 0) held.push(step)
        me.path = []
      } else if (i >= 0) held.splice(i, 1)
    }
    const onBlur = () => (held.length = 0)
    const onPointer = (event) => {
      box.focus({ preventScroll: true })
      const rect = canvas.getBoundingClientRect()
      const dpr = canvas.width / rect.width
      const px = ((event.clientX - rect.left) * dpr - view.ox) / view.zoom
      const py = ((event.clientY - rect.top) * dpr - view.oy) / view.zoom
      const target = { x: Math.floor(px / T), y: Math.floor(py / T) }
      const start = me.next ?? { x: me.x, y: me.y }
      me.path = findPath(room, start, target)
    }
    box.addEventListener('keydown', onKey)
    box.addEventListener('keyup', onKey)
    box.addEventListener('blur', onBlur)
    canvas.addEventListener('pointerdown', onPointer)

    let floor = null
    let objs = null
    let hero = null
    let sea = null
    const sheets = new Map() // folhas dos animados (do pacote, em /limezu/me)
    const sheetFiles = [...new Set([...(room.anims ?? []).map((a) => a[2]), ...(room.boats ?? []).map((b) => b[0]), ...(room.patrols ?? []).flatMap((p) => [p[0], p[1]])])]
    const waters = room.water ?? []
    Promise.all([
      loadImage(`${room.code}_chao`),
      loadImage(room.atlas ?? `${room.code}_obj`),
      loadImage(DATA.character),
      room.sea ? loadImage(room.sea.file) : null,
      ...waters.map((w) => loadImage(w.file)),
      ...sheetFiles.map((f) => loadImage(`/limezu/me/${f.replace(/\.png$/, '')}.png`)),
    ])
      .then(([a, b, c, d, ...rest]) => {
        if (!alive) return
        floor = a
        objs = b
        hero = c
        sea = d
        waters.forEach((w, i) => (w.img = rest[i]))
        sheetFiles.forEach((f, i) => sheets.set(f, rest[waters.length + i]))
        setReady(true)
      })
      .catch((error) => alive && setMissing(error.message))

    // o que anda sozinho: carros na rua (freiam e buzinam se você estiver na frente) e barcos no mar
    const cars = (room.movers ?? []).map(([name, fy, speed, x0]) => ({ name, fy, speed, x: x0, honk: 0 }))
    const boats = (room.boats ?? []).map(([file, fy, speed, fw, fh, frames, x0]) => ({ file, fy, speed, fw, fh, frames, x: x0 }))
    // vai e volta entre dois pontos (o barco do lago): folha para a direita e para a esquerda
    const patrols = (room.patrols ?? []).map(([right, left, fw, fh, frames, x0, x1, fy, speed]) => ({ right, left, fw, fh, frames, x0, x1, fy, speed, x: x0, dirR: true }))
    const shade = document.createElement('canvas') // a escuridão da noite, com "buracos" onde tem luz

    let last = performance.now()
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      // andar: de quadradinho em quadradinho, deslizando
      if (!me.next && !leaving) {
        const key = held[held.length - 1]
        if (key) {
          me.dir = dirOf(key[0], key[1])
          if (free(room, me.x + key[0], me.y + key[1])) me.next = { x: me.x + key[0], y: me.y + key[1] }
        } else if (me.path.length) {
          const step = me.path.shift()
          me.dir = dirOf(step.x - me.x, step.y - me.y)
          me.next = step
        }
      }
      if (me.next) {
        const dx = me.next.x - me.fx
        const dy = me.next.y - me.fy
        const dist = Math.hypot(dx, dy)
        const move = SPEED * dt
        if (dist <= move) {
          me.fx = me.x = me.next.x
          me.fy = me.y = me.next.y
          me.next = null
          // pisou numa porta: escurece e vai para o outro lugar
          const door = (room.doors ?? []).find((d) => d.x === me.x && d.y === me.y)
          if (door && !leaving) {
            leaving = door
            me.path = []
            held.length = 0
          }
        } else {
          me.fx += (dx / dist) * move
          me.fy += (dy / dist) * move
        }
      }
      const walking = !!me.next
      if (leaving) {
        fade = Math.min(1, fade + dt * 3)
        if (fade >= 1 && alive) {
          arriveRef.current = leaving.spawn
          const to = leaving.to
          leaving = null
          setCode(to)
        }
      } else fade = Math.max(0, fade - dt * 2.5)
      me.anim += dt * (walking ? 10 : 6)

      // câmera: segue o boneco sem sair da sala (sala menor que a tela fica no meio)
      const z = view.zoom
      const fit = (screen, size, focus) => (size * z <= screen ? Math.round((screen - size * z) / 2) : Math.round(Math.min(0, Math.max(screen - size * z, screen / 2 - focus * z))))
      view.ox = fit(canvas.width, room.w, me.fx * T + T / 2)
      view.oy = fit(canvas.height, room.h, me.fy * T)

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height) // fora da sala: o fundo da página aparece
      if (floor && objs && hero) {
        ctx.imageSmoothingEnabled = false
        ctx.setTransform(z, 0, 0, z, view.ox, view.oy)
        // sombra suave em volta da sala, para ela "flutuar" sobre o fundo
        ctx.shadowColor = 'rgba(0, 0, 0, 0.55)'
        ctx.shadowBlur = 24 * z
        ctx.shadowOffsetY = 6 * z
        ctx.drawImage(floor, 0, 0)
        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
        ctx.shadowOffsetY = 0
        const time = now / 1000
        if (sea && room.sea) {
          const f = Math.floor(time * room.sea.fps) % room.sea.frames
          ctx.drawImage(sea, 0, f * room.sea.h, room.w, room.sea.h, 0, room.sea.y, room.w, room.sea.h)
        }
        for (const w of waters) {
          if (!w.img) continue
          const f = Math.floor(time * w.fps) % w.frames
          ctx.drawImage(w.img, 0, f * w.h, w.w, w.h, w.x, w.y, w.w, w.h)
        }
        for (const p of patrols) {
          p.x += (p.dirR ? 1 : -1) * p.speed * dt
          if (p.x > p.x1) p.dirR = false
          if (p.x < p.x0) p.dirR = true
        }
        // carros e barcos andam; o carro para se você estiver logo na frente dele
        const meFoot = (me.fy + 1) * T
        const meX = me.fx * T + T / 2
        for (const car of cars) {
          const spr = room.sprites[car.name]
          const ahead = car.speed > 0 ? meX - (car.x + spr[2]) : car.x - meX
          const blocked = Math.abs(meFoot - car.fy) < 14 && ahead > -6 && ahead < 26
          if (blocked) car.honk = 1.2
          // fila: não encosta no carro da frente (mesma faixa)
          const queued = cars.some((other) => {
            if (other === car || other.fy !== car.fy) return false
            const ow = room.sprites[other.name][2]
            const gap = car.speed > 0 ? other.x - (car.x + spr[2]) : car.x - (other.x + ow)
            return gap > -spr[2] / 2 && gap < 10
          })
          if (!blocked && !queued) car.x += car.speed * dt
          car.honk = Math.max(0, car.honk - dt)
          const span = room.w + 240
          if (car.x > room.w + 120) car.x -= span
          if (car.x < -120 - spr[2]) car.x += span
        }
        for (const boat of boats) {
          boat.x += boat.speed * dt
          if (boat.x > room.w + 60) boat.x = -boat.fw - 60
          if (boat.x < -boat.fw - 60) boat.x = room.w + 60
        }
        // tudo que fica de pé é desenhado de cima para baixo (quem está mais embaixo fica na frente)
        const list = []
        for (const o of room.objects) list.push([o[1] + o[3], 0, o])
        const isNight = room.outdoor && skyRef.current === 'noite'
        for (const a of room.anims ?? []) {
          if (a[8] === 'n' && !isNight) continue // fantasmas: só à noite
          if (a[8] === 'd' && isNight) continue // corvos: só de dia
          list.push([a[1] + a[4], 1, a])
        }
        for (const p of patrols) list.push([p.fy, 5, p])
        for (const d of room.doorSprites ?? []) {
          // a porta abre quando você chega perto
          if (Math.abs(me.fx - d.near[0]) <= 1.5 && Math.abs(me.fy - d.near[1]) <= 1.5) list.push([d.y + d.h + 0.1, 6, d])
        }
        for (const car of cars) list.push([car.fy, 2, car])
        for (const boat of boats) list.push([boat.fy, 3, boat])
        list.push([meFoot + 0.5, 4, null])
        list.sort((p, q) => p[0] - q[0])
        for (const [, kind, it] of list) {
          if (kind === 0) {
            const [x, y, w, h, sx, sy] = it
            ctx.drawImage(objs, sx, sy, w, h, x, y, w, h)
          } else if (kind === 1) {
            const [x, y, file, fw, fh, frames, fps] = it
            const img = sheets.get(file)
            if (img) ctx.drawImage(img, (Math.floor(time * fps + x * 0.37) % frames) * fw, 0, fw, fh, x, y, fw, fh)
          } else if (kind === 2) {
            const [sx, sy, w, h] = room.sprites[it.name]
            ctx.drawImage(objs, sx, sy, w, h, Math.round(it.x), it.fy - h, w, h)
            if (it.honk > 0) {
              ctx.font = 'bold 8px sans-serif'
              ctx.textAlign = 'center'
              const bx = Math.round(it.x + w / 2)
              ctx.fillStyle = '#fffaf0'
              ctx.fillRect(bx - 18, it.fy - h - 14, 36, 11)
              ctx.fillStyle = '#060b14'
              ctx.fillText('bi-bi!', bx, it.fy - h - 5)
            }
          } else if (kind === 5) {
            const img = sheets.get(it.dirR ? it.right : it.left)
            if (img) ctx.drawImage(img, (Math.floor(time * 8) % it.frames) * it.fw, 0, it.fw, it.fh, Math.round(it.x), it.fy - it.fh, it.fw, it.fh)
          } else if (kind === 6) {
            ctx.drawImage(objs, it.sx, it.sy, it.w, it.h, it.x, it.y, it.w, it.h)
          } else if (kind === 3) {
            const img = sheets.get(it.file)
            if (img) ctx.drawImage(img, (Math.floor(time * 8) % it.frames) * it.fw, 0, it.fw, it.fh, Math.round(it.x), it.fy - it.fh, it.fw, it.fh)
          } else {
            // boneco: 16x32, o pé no fundo do quadradinho
            const frame = DIRS[me.dir] * 6 + (Math.floor(me.anim) % 6)
            ctx.drawImage(hero, frame * T, walking ? 32 : 0, T, 32, Math.round(me.fx * T), Math.round(me.fy * T - T), T, 32)
          }
        }
        // susto: à noite, chegar perto de um fantasma
        if (isNight) {
          for (const a of room.anims ?? []) {
            if (a[8] !== 'n') continue
            const gx = a[0] + a[3] / 2
            const gy = a[1] + a[4]
            if (Math.abs(gx - meX) < 30 && Math.abs(gy - meFoot) < 30) {
              ctx.font = 'bold 9px sans-serif'
              ctx.textAlign = 'center'
              ctx.fillStyle = '#e8fff8'
              ctx.fillRect(gx - 24, a[1] - 4, 48, 13)
              ctx.fillStyle = '#063'
              ctx.fillText('BUUU!', gx, a[1] + 6)
            }
          }
        }
        // fim de tarde e noite: escurece e acende as luzes (postes, quiosques, palco e o farol girando)
        const mode = room.outdoor ? skyRef.current : 'dia'
        if (mode !== 'dia') {
          const night = mode === 'noite'
          if (shade.width !== canvas.width || shade.height !== canvas.height) {
            shade.width = canvas.width
            shade.height = canvas.height
          }
          const sctx = shade.getContext('2d')
          sctx.setTransform(1, 0, 0, 1, 0, 0)
          sctx.globalCompositeOperation = 'source-over'
          sctx.clearRect(0, 0, shade.width, shade.height)
          sctx.fillStyle = night ? 'rgba(6, 10, 38, 0.8)' : 'rgba(150, 60, 30, 0.3)'
          sctx.fillRect(0, 0, shade.width, shade.height)
          sctx.setTransform(z, 0, 0, z, view.ox, view.oy)
          sctx.globalCompositeOperation = 'destination-out'
          for (const [lx, ly, r] of room.lights ?? []) {
            const flick = 1 + Math.sin(time * 3 + lx) * 0.04
            const g = sctx.createRadialGradient(lx, ly, 0, lx, ly, r * flick)
            g.addColorStop(0, `rgba(0,0,0,${night ? 0.95 : 0.6})`)
            g.addColorStop(1, 'rgba(0,0,0,0)')
            sctx.fillStyle = g
            sctx.fillRect(lx - r, ly - r, r * 2, r * 2)
          }
          ctx.setTransform(1, 0, 0, 1, 0, 0)
          ctx.drawImage(shade, 0, 0)
          ctx.setTransform(z, 0, 0, z, view.ox, view.oy)
          ctx.globalCompositeOperation = 'lighter'
          for (const [lx, ly, r, color] of room.lights ?? []) {
            const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, r * 0.7)
            g.addColorStop(0, `rgba(${color},${night ? 0.32 : 0.14})`)
            g.addColorStop(1, `rgba(${color},0)`)
            ctx.fillStyle = g
            ctx.fillRect(lx - r, ly - r, r * 2, r * 2)
          }
          if (night && room.beacon) {
            // o farol varrendo o mar
            const [bx, by] = room.beacon
            const ang = time * 0.9
            ctx.save()
            ctx.translate(bx, by)
            ctx.rotate(ang)
            const g = ctx.createLinearGradient(0, 0, 420, 0)
            g.addColorStop(0, 'rgba(255,240,180,0.35)')
            g.addColorStop(1, 'rgba(255,240,180,0)')
            ctx.fillStyle = g
            ctx.beginPath()
            ctx.moveTo(0, 0)
            ctx.lineTo(420, -46)
            ctx.lineTo(420, 46)
            ctx.closePath()
            ctx.fill()
            ctx.restore()
          }
          ctx.globalCompositeOperation = 'source-over'
        }
        if (fade > 0) {
          ctx.setTransform(1, 0, 0, 1, 0, 0)
          ctx.fillStyle = `rgba(5, 8, 16, ${fade})`
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          ctx.setTransform(z, 0, 0, z, view.ox, view.oy)
        }
        if (gridRef.current) {
          ctx.globalAlpha = 0.35
          room.walk.forEach((line, y) => {
            for (let x = 0; x < line.length; x += 1) {
              ctx.fillStyle = line[x] === '.' ? '#3ddc84' : '#ff4d4d'
              ctx.fillRect(x * T + 1, y * T + 1, T - 2, T - 2)
            }
          })
          ctx.globalAlpha = 1
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    box.focus({ preventScroll: true })

    return () => {
      alive = false
      cancelAnimationFrame(raf)
      observer.disconnect()
      box.removeEventListener('keydown', onKey)
      box.removeEventListener('keyup', onKey)
      box.removeEventListener('blur', onBlur)
      canvas.removeEventListener('pointerdown', onPointer)
    }
  }, [room])

  return (
    <div className="t2">
      <div className="t2-bar">
        <label className="t2-pick">
          <span>Mapa</span>
          <select value={room.hidden ? '' : code} onChange={(event) => event.target.value && setCode(event.target.value)}>
            {room.hidden && <option value="">{room.label}</option>}
            {DATA.rooms.filter((r) => !r.hidden).map((r) => (
              <option key={r.code} value={r.code}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        {room.outdoor && (
          <div className="t2-rooms" role="group" aria-label="Hora do dia">
            {[['dia', '☀️ Dia'], ['tarde', '🌇 Fim de tarde'], ['noite', '🌙 Noite']].map(([k, label]) => (
              <button key={k} type="button" aria-pressed={sky === k} className={sky === k ? 'is-on' : ''} onClick={() => setSky(k)}>
                {label}
              </button>
            ))}
          </div>
        )}
        <button type="button" className={`t2-grid-toggle${showGrid ? ' is-on' : ''}`} aria-pressed={showGrid} onClick={() => setShowGrid(!showGrid)}>
          {showGrid ? 'Esconder grade' : 'Mostrar onde dá para andar'}
        </button>
      </div>
      <div ref={boxRef} className="t2-stage" tabIndex={0} aria-label={`${room.label}: ande com as setas ou WASD, ou clique no chão`}>
        <canvas ref={canvasRef} />
        {!ready && (
          <p className="t2-loading">
            {missing ? (
              <span>
                Não achei a imagem <code>{missing}</code>.<br />
                Confira se a pasta <code>public/limezu/t2</code> subiu com os PNGs.
              </span>
            ) : (
              'Carregando a sala…'
            )}
          </p>
        )}
      </div>
      <p className="muted t2-hint">Setas ou WASD para andar · clique no chão para ir até lá</p>
    </div>
  )
}
