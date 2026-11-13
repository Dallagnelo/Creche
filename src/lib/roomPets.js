// Bichinhos que passeiam pelo quarto (e o gato da sala da turma).
// O passeio é calculado a partir do relógio e da arrumação do ambiente, então todo mundo que está
// no mesmo lugar vê o bicho no mesmo ponto, sem mandar nada pela internet.
import { outline } from './avatar'
import { findPath, WALL_ROWS } from './room'

const DARK = '#1a1424'
const shade = (hex, amount) => {
  const n = parseInt(hex.slice(1), 16)
  const ch = (shift) => Math.max(0, Math.min(255, Math.round(((n >> shift) & 255) * (1 + amount))))
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`
}

// frame: 0 parado · 1 e 2 andando · 3 descansando. Todos olham para a direita (a cena espelha).
const DRAW = {
  gato: (r, c, f) => {
    const light = shade(c, 0.25)
    if (f === 3) {
      r(3, 9, 11, 4, c)
      r(4, 12, 9, 1, light)
      r(11, 6, 6, 5, c)
      r(11, 4, 2, 2, c)
      r(15, 4, 2, 2, c)
      r(13, 8, 2, 1, DARK)
      r(0, 11, 4, 2, c)
      return
    }
    r(4, 7, 9, 4, c)
    r(5, 10, 7, 1, light)
    r(10, 3, 6, 5, c)
    r(10, 1, 2, 2, c)
    r(14, 1, 2, 2, c)
    r(14, 5, 1, 1, DARK)
    r(15, 6, 1, 1, '#e86aa0')
    r(2, 3 + (f === 1 ? 1 : 0), 2, 5, c)
    const legs = f === 1 ? [[4, 3], [11, 2]] : f === 2 ? [[6, 2], [9, 3]] : [[5, 3], [11, 3]]
    legs.forEach(([x, h]) => r(x, 11, 2, h, c))
  },
  cachorro: (r, c, f) => {
    const light = shade(c, 0.3)
    const dark = shade(c, -0.3)
    if (f === 3) {
      r(2, 9, 12, 4, c)
      r(11, 6, 6, 6, c)
      r(15, 9, 2, 2, light)
      r(11, 7, 2, 4, dark)
      r(14, 8, 2, 1, DARK)
      r(0, 10, 3, 2, c)
      return
    }
    r(3, 6, 10, 5, c)
    r(4, 9, 8, 2, light)
    r(11, 2, 6, 6, c)
    r(15, 5, 2, 2, light)
    r(11, 3, 2, 4, dark)
    r(14, 4, 1, 1, DARK)
    r(16, 5, 1, 1, DARK)
    r(1, f === 2 ? 2 : 3, 2, 4, c)
    const legs = f === 1 ? [[3, 3], [11, 2]] : f === 2 ? [[5, 2], [9, 3]] : [[4, 3], [11, 3]]
    legs.forEach(([x, h]) => r(x, 11, 2, h, c))
  },
  coelho: (r, c, f) => {
    if (f === 3) {
      r(3, 8, 10, 6, c)
      r(10, 5, 6, 5, c)
      r(10, 1, 2, 5, c)
      r(13, 2, 2, 4, c)
      r(14, 7, 1, 1, DARK)
      r(2, 9, 2, 2, '#ffffff')
      return
    }
    r(4, 7, 8, 6, c)
    r(10, 4, 6, 5, c)
    r(11, 0, 2, 5, c)
    r(13, 0, 2, 5, c)
    r(12, 1, 1, 3, '#f2b0c0')
    r(14, 6, 1, 1, DARK)
    r(15, 7, 1, 1, '#e86aa0')
    r(3, 8, 2, 2, '#ffffff')
    r(5, 13, 3, 1, c)
    r(9, 13, 3, 1, c)
  },
  hamster: (r, c, f) => {
    r(4, 8 + (f === 3 ? 1 : 0), 10, f === 3 ? 5 : 6, c)
    r(6, 12, 6, 1, '#f6f1e6')
    r(11, 6, 2, 2, c)
    r(13, 9, 1, 1, DARK)
    r(14, 10, 1, 1, '#e86aa0')
    if (f !== 3) {
      r(5 + (f === 1 ? 1 : 0), 14, 2, 1, '#f2b0c0')
      r(10 - (f === 2 ? 1 : 0), 14, 2, 1, '#f2b0c0')
    }
  },
  pato: (r, c, f) => {
    r(4, 8, 9, 5, c)
    r(2, 8, 2, 2, c)
    r(10, 3, 5, 5, c)
    r(15, 5, 3, 2, '#e8915a')
    r(13, 4, 1, 1, DARK)
    r(6, 9, 4, 2, shade(c, -0.2))
    if (f !== 3) {
      r(7, 13, 1, 2 - (f === 1 ? 1 : 0), '#e8915a')
      r(10, 13, 1, 2 - (f === 2 ? 1 : 0), '#e8915a')
      r(6, 14, 2, 1, '#e8915a')
      r(10, 14, 2, 1, '#e8915a')
    }
  },
  tartaruga: (r, c, f) => {
    r(4, 7, 10, 5, c)
    r(5, 6, 8, 1, c)
    r(6, 8, 2, 2, shade(c, 0.3))
    r(10, 8, 2, 2, shade(c, 0.3))
    r(8, 7, 2, 1, shade(c, 0.3))
    r(4, 11, 10, 1, '#c8b060')
    if (f !== 3) {
      r(14, 8, 3, 3, '#8ac070')
      r(15, 9, 1, 1, DARK)
      r(5 + (f === 1 ? 1 : 0), 12, 2, 2, '#8ac070')
      r(11 - (f === 2 ? 1 : 0), 12, 2, 2, '#8ac070')
    }
  },
  pinguim: (r, c, f) => {
    r(5, 3, 7, 11, '#1f1a1a')
    r(7, 5, 4, 8, '#f6f1e6')
    r(10, 5, 1, 1, '#ffffff')
    r(12, 6, 2, 1, '#e8915a')
    if (f === 3) {
      r(4, 8, 1, 4, '#1f1a1a')
      r(6, 14, 5, 1, '#e8915a')
      return
    }
    r(4, 7 - (f === 1 ? 1 : 0), 1, 4, '#1f1a1a')
    r(12, 7 - (f === 2 ? 1 : 0), 1, 4, '#1f1a1a')
    r(6, 14, 2, 1, '#e8915a')
    r(9, 14, 2, 1, '#e8915a')
  },
  // alienzinho: bolinha verde com antenas e um olhão
  et: (r, c, f) => {
    const light = shade(c, 0.3)
    const squash = f === 1 ? 1 : 0
    r(4, 6 + squash, 10, 8 - squash, c)
    r(5, 5 + squash, 8, 1, c)
    r(5, 7 + squash, 8, 2, light)
    r(7, 8, 4, 4, '#ffffff')
    r(9, 9, 2, 2, DARK)
    r(5, 1 + squash, 1, 4, c)
    r(12, 1 + squash, 1, 4, c)
    r(4, 0 + squash, 3, 2, '#f2c14e')
    r(11, 0 + squash, 3, 2, '#f2c14e')
    if (f !== 3) {
      r(5, 14, 2, 1, c)
      r(11, 14, 2, 1, c)
    }
  },
  // caranguejo: anda de lado, com as garrinhas para cima
  caranguejo: (r, c, f) => {
    const light = shade(c, 0.3)
    r(4, 9, 10, 4, c)
    r(5, 9, 8, 1, light)
    r(6, 7, 1, 2, c)
    r(11, 7, 1, 2, c)
    r(6, 6, 1, 1, DARK)
    r(11, 6, 1, 1, DARK)
    const up = f === 1 ? 1 : 0
    r(1, 6 - up, 3, 3, c)
    r(14, 6 - (f === 2 ? 1 : 0), 3, 3, c)
    r(2, 6 - up, 1, 1, light)
    if (f !== 3) {
      ;[3, 6, 11, 14].forEach((x, i) => r(x + (i % 2 === f % 2 ? 0 : 1), 13, 1, 2, c))
    }
  },
  // robô aspirador: disquinho com luz que pisca e escovinhas girando
  robo: (r, c, f) => {
    const light = shade(c, 0.35)
    r(4, 9, 10, 1, c)
    r(3, 10, 12, 4, c)
    r(4, 14, 10, 1, c)
    r(4, 10, 10, 1, light)
    r(7, 11, 4, 2, shade(c, -0.25))
    r(8, 11, 2, 1, f === 3 ? '#f2c14e' : f === 1 ? '#38d27a' : '#5eead4')
    if (f !== 3) {
      r(f === 1 ? 2 : 1, 13, 2, 1, '#9aa6b2')
      r(f === 1 ? 15 : 14, 13, 2, 1, '#9aa6b2')
    }
  },
  porquinho: (r, c, f) => {
    const pink = '#f2a6b8'
    if (f === 3) {
      r(2, 9, 12, 5, pink)
      r(11, 7, 6, 6, pink)
      r(16, 9, 2, 2, '#e8889c')
      r(13, 9, 2, 1, DARK)
      return
    }
    r(3, 6, 11, 6, pink)
    r(12, 4, 5, 6, pink)
    r(16, 6, 2, 3, '#e8889c')
    r(12, 3, 2, 2, pink)
    r(14, 5, 1, 1, DARK)
    r(1, 6, 2, 2, pink)
    const legs = f === 1 ? [[4, 3], [11, 2]] : f === 2 ? [[5, 2], [10, 3]] : [[4, 3], [11, 3]]
    legs.forEach(([x, h]) => r(x, 12, 2, h, pink))
  },
}

export const PETS = {
  gato: { label: 'Gato', colors: ['e8915a', '6a7280', '1f1a1a', 'f6f1e6'], speed: 1.6, says: ['Miau! 🐱', 'Purrr...', 'Miaaau?'] },
  cachorro: { label: 'Cachorro', colors: ['c8904a', '1f1a1a', 'f6f1e6'], speed: 2, says: ['Au au! 🐶', 'Quem é o bom garoto?', '*abana o rabo*'] },
  coelho: { label: 'Coelho', colors: ['f6f1e6', '8a5a34'], speed: 1.4, hop: true, says: ['*fareja* 🐰', 'Cenoura?'] },
  hamster: { label: 'Hamster', colors: ['e8b070', 'f6f1e6'], speed: 2.4, says: ['Squeak! 🐹', '*enche as bochechas*'] },
  pato: { label: 'Pato', colors: ['f2c14e', 'f6f1e6'], speed: 1.2, says: ['Quack! 🦆', 'Quack quack!'] },
  tartaruga: { label: 'Tartaruga', colors: ['38a85a'], speed: 0.45, says: ['... 🐢', '*bem devagar*'] },
  pinguim: { label: 'Pinguim', colors: ['1f1a1a'], speed: 0.9, says: ['Kwah! 🐧', '*escorrega*'] },
  et: { label: 'Alienzinho', colors: ['38d27a', 'a066d0'], speed: 1.3, hop: true, says: ['Blip blop! 👽', 'Leve-me ao seu líder', '*flutua um pouquinho*'] },
  caranguejo: { label: 'Caranguejo', colors: ['e05252'], speed: 0.9, says: ['Clec clec! 🦀', '*anda de lado*'] },
  robo: { label: 'Robô aspirador', colors: ['2b2f3c', 'e8eef2'], speed: 1.1, says: ['Bip bup 🤖', 'Aspirando... vrrrr', 'Achei uma meia perdida!'] },
  porquinho: { label: 'Porquinho', colors: ['f2a6b8'], speed: 1.1, says: ['Oinc! 🐷', 'Oinc oinc!'] },
}

const cache = new Map()
/** Desenho do bicho num quadro da animação (guardado para não redesenhar). */
export function petSprite(kind, color, frame = 0) {
  const key = `${kind}:${color}:${frame}`
  if (!cache.has(key)) {
    const canvas = document.createElement('canvas')
    canvas.width = 18
    canvas.height = 16
    const ctx = canvas.getContext('2d')
    const r = (x, y, w, h, fill) => {
      ctx.fillStyle = fill
      ctx.fillRect(x, y, w, h)
    }
    ;(DRAW[kind] ?? DRAW.gato)(r, `#${color}`, frame)
    outline(canvas)
    cache.set(key, canvas)
  }
  return cache.get(key)
}

// ---------- passeio sincronizado
const hash = (text) => [...String(text)].reduce((h, ch) => (Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0), 2166136261)
function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const plans = new WeakMap()
/** Roteiro do passeio: alguns pontos perto de onde o bicho foi colocado, com pausas entre eles. */
function planFor(scene, blocked, item) {
  let byScene = plans.get(scene)
  if (!byScene) {
    byScene = new Map()
    plans.set(scene, byScene)
  }
  if (byScene.has(item.id)) return byScene.get(item.id)
  const random = rng(hash(`${scene.key}:${item.id}`))
  const range = item.range ?? 4
  const home = { x: item.x, y: item.y }
  const spots = []
  for (let y = WALL_ROWS; y < blocked.length; y += 1) {
    for (let x = 0; x < blocked[0].length; x += 1) {
      if (!blocked[y][x] && Math.abs(x - home.x) <= range && Math.abs(y - home.y) <= range) spots.push({ x, y })
    }
  }
  const points = [home]
  for (let i = 0; i < 5 && spots.length; i += 1) points.push(spots.splice(Math.floor(random() * spots.length), 1)[0])
  const speed = PETS[item.pet.kind]?.speed ?? 1.5
  const segments = []
  points.forEach((from, i) => {
    const to = points[(i + 1) % points.length]
    const path = from.x === to.x && from.y === to.y ? [] : findPath(blocked, from, to)
    segments.push({ from, path, rest: 2 + random() * 5, walk: path.length / speed })
  })
  const plan = { segments, speed, cycle: segments.reduce((sum, s) => sum + s.rest + s.walk, 0), offset: random() * 100 }
  byScene.set(item.id, plan)
  return plan
}

/** Onde o bicho está agora (x, y em quadradinhos), se está andando e para que lado. */
export function petSpot(scene, blocked, item, nowSeconds) {
  const plan = planFor(scene, blocked, item)
  if (!plan.cycle) return { x: item.x, y: item.y, moving: false, rest: true, flip: false }
  let t = (nowSeconds + plan.offset) % plan.cycle
  for (const seg of plan.segments) {
    if (t < seg.rest) return { x: seg.from.x, y: seg.from.y, moving: false, rest: t > 1.2, flip: false, keep: true }
    t -= seg.rest
    if (t < seg.walk) {
      const progress = t * plan.speed
      const index = Math.floor(progress)
      const prev = index === 0 ? seg.from : seg.path[index - 1]
      const next = seg.path[Math.min(index, seg.path.length - 1)]
      const k = progress - index
      return { x: prev.x + (next.x - prev.x) * k, y: prev.y + (next.y - prev.y) * k, moving: true, rest: false, flip: next.x < prev.x, turn: next.x !== prev.x }
    }
    t -= seg.walk
  }
  return { x: item.x, y: item.y, moving: false, rest: true, flip: false }
}
