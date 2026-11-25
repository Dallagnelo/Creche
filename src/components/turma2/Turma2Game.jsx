import { useEffect, useRef, useState } from 'react'
import DATA from '../../lib/turma2Rooms.json'
import { composeChar, composePortrait, drawChar, drawPortrait } from '../../lib/turma2/character'
import { compileMap } from '../../lib/turma2/compile'
import { listMaps } from '../../services/turma2Maps'

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

const n7pose = (n) => (n.modo === 'senta' ? 'senta' : n.modo === 'celular' ? 'celular' : n.next ? 'anda' : 'parado')

/** balão com o nome (se tiver) e a fala, quebrando as linhas; a ponta fica em (cx, bottom) */
// face: retrato do personagem (mexe a boca enquanto talking)
function bubble(ctx, cx, bottom, name, text, face = null, t = 0, talking = false) {
  ctx.font = '7px sans-serif'
  const words = String(text).split(/\s+/)
  const lines = []
  let line = ''
  for (const w of words) {
    const tryLine = line ? `${line} ${w}` : w
    if (ctx.measureText(tryLine).width > 112 && line) {
      lines.push(line)
      line = w
    } else line = tryLine
  }
  if (line) lines.push(line)
  const shown = lines.slice(0, 6)
  const head = name ? 1 : 0
  const pad = face ? 36 : 0
  const w = Math.min(120, Math.max(...shown.map((l) => ctx.measureText(l).width), name ? ctx.measureText(name).width + 4 : 0)) + 8 + pad
  const h = Math.max(face ? 38 : 0, (shown.length + head) * 8 + 5)
  const x = Math.round(cx - w / 2)
  const y = Math.round(bottom - h - 3)
  ctx.fillStyle = 'rgba(6, 11, 20, 0.55)'
  ctx.fillRect(x + 1, y + 1, w, h)
  ctx.fillStyle = '#fffaf0'
  ctx.fillRect(x, y, w, h)
  ctx.beginPath()
  ctx.moveTo(cx - 3, y + h)
  ctx.lineTo(cx + 3, y + h)
  ctx.lineTo(cx, y + h + 3)
  ctx.fill()
  if (face) {
    ctx.fillStyle = '#d9efe9'
    ctx.fillRect(x + 3, y + 3, 32, 32)
    drawPortrait(ctx, face, x + 3, y + 3, t, talking)
  }
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  if (name) {
    ctx.font = 'bold 7px sans-serif'
    ctx.fillStyle = '#0b6b5c'
    ctx.fillText(name, x + 4 + pad, y + 3)
    ctx.font = '7px sans-serif'
  }
  ctx.fillStyle = '#060b14'
  shown.forEach((l, i) => ctx.fillText(l, x + 4 + pad, y + 3 + (i + head) * 8))
  ctx.textBaseline = 'alphabetic'
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

// extraRows: mapas do editor (se não vier, busca os do banco); startCode: em qual mapa começar
// character: o personagem de quem joga (montado em "Meu personagem"); sem ele, o boneco padrão
export default function Turma2Game({ extraRows = null, startCode = null, character = null }) {
  const charKey = JSON.stringify(character)
  const [code, setCode] = useState(startCode ?? DATA.rooms.find((r) => !r.hidden).code)
  const [rows, setRows] = useState(extraRows ?? [])
  const [compiled, setCompiled] = useState({}) // mapas do editor já montados para o jogo
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
  const builtin = DATA.rooms.find((r) => r.code === code)
  const room = builtin ?? compiled[code] ?? null

  useEffect(() => {
    if (extraRows) return undefined
    let alive = true
    listMaps().then((list) => alive && setRows(list))
    return () => {
      alive = false
    }
  }, [extraRows])

  // mapa feito no editor: monta o chão e o resto na primeira vez que alguém entra nele
  useEffect(() => {
    if (builtin || compiled[code]) return undefined
    const row = rows.find((r) => r.code === code)
    if (!row) return undefined
    let alive = true
    setReady(false)
    compileMap(row)
      .then((r) => alive && setCompiled((c) => ({ ...c, [code]: r })))
      .catch((error) => alive && setMissing(error.message))
    return () => {
      alive = false
    }
  }, [builtin, code, compiled, rows])

  useEffect(() => {
    if (!room) return undefined
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
    const atl = new Map() // mapas do editor: uma imagem por tema de peças
    const sheets = new Map() // folhas dos animados (do pacote, em /limezu/me; do editor, caminho completo)
    const sheetFiles = [...new Set([...(room.anims ?? []).map((a) => a[2]), ...(room.boats ?? []).map((b) => b[0]), ...(room.patrols ?? []).flatMap((p) => [p[0], p[1]])])]
    const waters = room.water ?? []
    const atlasKeys = Object.keys(room.atlases ?? {})
    Promise.all([
      room.floorCanvas ?? loadImage(`${room.code}_chao`),
      room.atlases ? true : loadImage(room.atlas ?? `${room.code}_obj`),
      character ? composeChar(character) : loadImage(DATA.character),
      room.sea ? loadImage(room.sea.file) : null,
      ...waters.map((w) => w.img ?? loadImage(w.file)),
      ...sheetFiles.map((f) => loadImage(f.startsWith('/') ? f : `/limezu/me/${f.replace(/\.png$/, '')}.png`)),
      ...atlasKeys.map((k) => loadImage(room.atlases[k])),
    ])
      .then(([a, b, c, d, ...rest]) => {
        if (!alive) return
        floor = a
        objs = b
        hero = c
        sea = d
        waters.forEach((w, i) => (w.img = rest[i]))
        sheetFiles.forEach((f, i) => sheets.set(f, rest[waters.length + i]))
        atlasKeys.forEach((k, i) => atl.set(k, rest[waters.length + sheetFiles.length + i]))
        setReady(true)
      })
      .catch((error) => alive && setMissing(error.message))

    // o que anda sozinho: carros na rua (freiam e buzinam se você estiver na frente) e barcos no mar
    const cars = (room.movers ?? []).map(([name, fy, speed, x0]) => ({ name, fy, speed, x: x0, honk: 0 }))
    const boats = (room.boats ?? []).map(([file, fy, speed, fw, fh, frames, x0]) => ({ file, fy, speed, fw, fh, frames, x: x0 }))
    // vai e volta entre dois pontos (o barco do lago): folha para a direita e para a esquerda
    // (mapas do editor: rx, ry, lx, ly dizem onde fica a fita de quadros dentro da folha)
    const patrols = (room.patrols ?? []).map(([right, left, fw, fh, frames, x0, x1, fy, speed, rx = 0, ry = 0, lx = 0, ly = 0]) => ({ right, left, fw, fh, frames, x0, x1, fy, speed, rx, ry, lx, ly, x: x0, dirR: true }))
    // personagens do mapa (NPCs): parados, passeando, sentados ou no celular; falam quando você chega perto
    const npcs = (room.npcs ?? []).map((n) => ({ ...n, hx: n.x, hy: n.y, fx: n.x, fy: n.y, next: null, wait: 1 + Math.random() * 2, img: null, dir: n.dir ?? 'down', talk: false }))
    npcs.forEach((n) => {
      composeChar(n.c).then((img) => (n.img = img)).catch(() => {})
      composePortrait(n.c).then((face) => (n.face = face)).catch(() => {})
    })
    const occupied = (x, y, self) => npcs.some((n) => n !== self && ((n.x === x && n.y === y) || (n.next && n.next.x === x && n.next.y === y)))
    const canStep = (x, y) => free(room, x, y) && !occupied(x, y)
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
          if (canStep(me.x + key[0], me.y + key[1])) me.next = { x: me.x + key[0], y: me.y + key[1] }
        } else if (me.path.length) {
          const step = me.path.shift()
          me.dir = dirOf(step.x - me.x, step.y - me.y)
          if (canStep(step.x, step.y)) me.next = step
          else me.path = [] // tem alguém no caminho
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
      for (const n of npcs) {
        n.talk = !!n.fala && Math.abs(n.fx - me.fx) <= 1.6 && Math.abs(n.fy - me.fy) <= 1.6
        n.talkT = n.talk ? (n.talkT ?? 0) + dt : 0 // tempo de conversa: a boca mexe no começo
        const stand = n.modo !== 'senta' && n.modo !== 'celular'
        if (n.next) {
          const dx = n.next.x - n.fx
          const dy = n.next.y - n.fy
          const d = Math.hypot(dx, dy)
          const mv = 2.2 * dt
          if (d <= mv) {
            n.fx = n.x = n.next.x
            n.fy = n.y = n.next.y
            n.next = null
            n.wait = 1 + Math.random() * 2.5
          } else {
            n.fx += (dx / d) * mv
            n.fy += (dy / d) * mv
          }
        } else if (n.talk && stand) {
          const dx = me.fx - n.fx
          const dy = me.fy - n.fy
          n.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up'
        } else if (n.modo === 'passeia') {
          n.wait -= dt
          if (n.wait <= 0) {
            n.wait = 0.6
            const [sx, sy] = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(Math.random() * 4)]
            const tx = n.x + sx
            const ty = n.y + sy
            const r = n.raio ?? 3
            const meBusy = (me.x === tx && me.y === ty) || (me.next && me.next.x === tx && me.next.y === ty)
            if (Math.abs(tx - n.hx) <= r && Math.abs(ty - n.hy) <= r && free(room, tx, ty) && !occupied(tx, ty, n) && !meBusy) {
              n.next = { x: tx, y: ty }
              n.dir = dirOf(sx, sy)
            }
          }
        }
      }

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
        for (const n of npcs) if (n.img) list.push([(n.fy + 1) * T, 7, n])
        list.push([meFoot + 0.5, 4, null])
        list.sort((p, q) => p[0] - q[0])
        for (const [, kind, it] of list) {
          if (kind === 0) {
            const [x, y, w, h, sx, sy, key, flip] = it
            const img = key ? atl.get(key) : objs
            if (!img) continue
            if (flip) {
              ctx.save()
              ctx.translate(x + w, y)
              ctx.scale(-1, 1)
              ctx.drawImage(img, sx, sy, w, h, 0, 0, w, h)
              ctx.restore()
            } else ctx.drawImage(img, sx, sy, w, h, x, y, w, h)
          } else if (kind === 1) {
            const [x, y, file, fw, fh, frames, fps, , , ax = 0, ay = 0] = it
            const img = sheets.get(file)
            if (img) ctx.drawImage(img, ax + (Math.floor(time * fps + x * 0.37) % frames) * fw, ay, fw, fh, x, y, fw, fh)
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
            const fx = (Math.floor(time * 8) % it.frames) * it.fw
            // mesma folha para os dois lados: espelha quando volta
            const mirror = !it.dirR && it.right === it.left && it.rx === it.lx && it.ry === it.ly
            if (img && mirror) {
              ctx.save()
              ctx.translate(Math.round(it.x) + it.fw, it.fy - it.fh)
              ctx.scale(-1, 1)
              ctx.drawImage(img, it.lx + fx, it.ly, it.fw, it.fh, 0, 0, it.fw, it.fh)
              ctx.restore()
            } else if (img) ctx.drawImage(img, (it.dirR ? it.rx : it.lx) + fx, it.dirR ? it.ry : it.ly, it.fw, it.fh, Math.round(it.x), it.fy - it.fh, it.fw, it.fh)
          } else if (kind === 6) {
            ctx.drawImage(objs, it.sx, it.sy, it.w, it.h, it.x, it.y, it.w, it.h)
          } else if (kind === 3) {
            const img = sheets.get(it.file)
            if (img) ctx.drawImage(img, (Math.floor(time * 8) % it.frames) * it.fw, 0, it.fw, it.fh, Math.round(it.x), it.fy - it.fh, it.fw, it.fh)
          } else if (kind === 7) {
            const pose = n7pose(it)
            drawChar(ctx, it.img, pose, pose === 'senta' && it.dir !== 'left' ? 'right' : it.dir, time + it.hx * 0.37, it.fx * T, it.fy * T - T)
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
        // balão de fala de quem está perto
        for (const n of npcs) if (n.talk && n.img) bubble(ctx, n.fx * T + T / 2, n.fy * T - T - 2, n.nome, n.fala, n.face, time, n.talkT < Math.min(4, 0.9 + String(n.fala).length * 0.045))
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, charKey])

  const hidden = builtin?.hidden
  const label = room?.label ?? rows.find((r) => r.code === code)?.name ?? code
  return (
    <div className="t2">
      <div className="t2-bar">
        <label className="t2-pick">
          <span>Mapa</span>
          <select value={hidden ? '' : code} onChange={(event) => event.target.value && setCode(event.target.value)}>
            {hidden && <option value="">{label}</option>}
            {DATA.rooms.filter((r) => !r.hidden).map((r) => (
              <option key={r.code} value={r.code}>
                {r.label}
              </option>
            ))}
            {rows.length > 0 && (
              <optgroup label="Feitos no editor">
                {rows.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.name}
                    {r.published ? '' : ' (rascunho)'}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </label>
        {room?.outdoor && (
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
      <div ref={boxRef} className="t2-stage" tabIndex={0} aria-label={`${label}: ande com as setas ou WASD, ou clique no chão`}>
        <canvas ref={canvasRef} />
        {!ready && (
          <p className="t2-loading">
            {missing ? (
              <span>
                Não achei a imagem <code>{missing}</code>.<br />
                Confira se a pasta <code>public/limezu/t2</code> subiu com os PNGs.
              </span>
            ) : (
              'Carregando o mapa…'
            )}
          </p>
        )}
      </div>
      <p className="muted t2-hint">Setas ou WASD para andar · clique no chão para ir até lá</p>
    </div>
  )
}
