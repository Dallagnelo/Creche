// Bonecos da Turma (nova): gerador de personagens do pacote Modern Interiors (LimeZu).
// Cada pedaço é uma folha em public/limezu/char/<parte>/<nome>.png com quadros de 16x32:
//   linha 0 parado · 1 parado (respirando) · 2 andando · 3 dormindo (só a cabeça) · 4 e 5 sentado (de lado)
//   em cada linha: 6 quadros por direção, na ordem direita, costas, esquerda, frente.
// Desenho na ordem: corpo → olhos → roupa → cabelo → acessório.
import DATA from './limezuCatalog.json'

export const LZ_PARTS = DATA.chars ?? { body: [], eyes: [], outfit: [], hair: [], acc: [] }
export const LZ_W = 16
export const LZ_H = 32
const ORDER = ['body', 'eyes', 'outfit', 'hair', 'acc']
const DIRS = { right: 0, up: 1, left: 2, down: 3 }

// grupos "estilo" → cores (Outfit_05_02 = roupa 5, cor 2)
function groupsOf(list) {
  const map = new Map()
  list.forEach((stem) => {
    const style = stem.replace(/_\d+$/, '')
    if (!map.has(style)) map.set(style, [])
    map.get(style).push(stem)
  })
  return [...map.entries()].map(([style, stems]) => ({ style, stems }))
}
export const LZ_STYLES = {
  body: LZ_PARTS.body.map((stem) => ({ style: stem, stems: [stem] })),
  eyes: LZ_PARTS.eyes.map((stem) => ({ style: stem, stems: [stem] })),
  outfit: groupsOf(LZ_PARTS.outfit),
  hair: groupsOf(LZ_PARTS.hair),
  acc: groupsOf(LZ_PARTS.acc),
}

const pickFrom = (list, n) => list[Math.abs(n) % list.length]
const hashOf = (id) => [...String(id ?? '')].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7)

/** Boneco padrão de quem ainda não montou o seu (sorteado pelo id, sempre o mesmo). */
export function defaultLzLook(id) {
  const h = hashOf(id)
  return {
    body: pickFrom(LZ_PARTS.body, h),
    eyes: pickFrom(LZ_PARTS.eyes, h >> 3),
    outfit: pickFrom(LZ_PARTS.outfit, h >> 5),
    hair: pickFrom(LZ_PARTS.hair, h >> 9),
    acc: null,
  }
}

/** Confere se as partes existem (pedaço apagado do pacote vira o padrão). */
export function normalizeLzLook(look, id) {
  const base = defaultLzLook(id)
  if (!look || typeof look !== 'object') return base
  const ok = (kind, value) => (value && LZ_PARTS[kind]?.includes(value) ? value : null)
  return {
    body: ok('body', look.body) ?? base.body,
    eyes: ok('eyes', look.eyes) ?? base.eyes,
    outfit: ok('outfit', look.outfit) ?? (look.outfit === null ? null : base.outfit),
    hair: ok('hair', look.hair) ?? (look.hair === null ? null : base.hair),
    acc: ok('acc', look.acc),
  }
}

export function randomLzLook() {
  const any = (list) => list[Math.floor(Math.random() * list.length)]
  return { body: any(LZ_PARTS.body), eyes: any(LZ_PARTS.eyes), outfit: any(LZ_PARTS.outfit), hair: any(LZ_PARTS.hair), acc: Math.random() < 0.3 ? any(LZ_PARTS.acc) : null }
}

// ---------------------------------------------------------------- imagens das partes
const images = new Map() // "hair/Hairstyle_01_01" → { img, ready }
const listeners = new Set()
export function onLzAvatarLoad(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
function part(kind, stem) {
  const key = `${kind}/${stem}`
  let entry = images.get(key)
  if (!entry && typeof Image !== 'undefined') {
    const img = new Image()
    entry = { img, ready: false, failed: false }
    images.set(key, entry)
    img.onload = () => {
      entry.ready = true
      listeners.forEach((fn) => fn())
    }
    img.onerror = () => {
      entry.failed = true
    }
    img.src = `/limezu/char/${kind}/${stem}.png`
  }
  return entry
}

const frames = new Map()
/** Quadro 16x32 do boneco (null enquanto as partes carregam). */
export function lzFrame(look, row, col) {
  const key = `${look.body}|${look.eyes}|${look.outfit}|${look.hair}|${look.acc}|${row}|${col}`
  if (frames.has(key)) return frames.get(key)
  const layers = ORDER.map((kind) => (look[kind] ? part(kind, look[kind]) : null)).filter(Boolean)
  if (layers.some((layer) => !layer.ready && !layer.failed)) return null
  const canvas = document.createElement('canvas')
  canvas.width = LZ_W
  canvas.height = LZ_H
  const ctx = canvas.getContext('2d')
  layers.forEach((layer) => layer.ready && ctx.drawImage(layer.img, col * LZ_W, row * LZ_H, LZ_W, LZ_H, 0, 0, LZ_W, LZ_H))
  frames.set(key, canvas)
  return canvas
}

/**
 * Quadro certo para o momento:
 *   pose null → andando (walkFrame) ou parado respirando; 'sit' → sentado de lado (ou parado de frente/costas);
 *   pose que começa com 'sleep' → só a cabeça deitada.
 */
export function lzAvatarSprite(look, { dir = 'down', pose = null, moving = false, walk = 0, time = 0 } = {}) {
  const d = DIRS[dir] ?? 3
  const tick6 = (speed) => Math.floor(time * speed) % 6
  if (typeof pose === 'string' && pose.startsWith('sleep')) return lzFrame(look, 3, tick6(2))
  if (pose === 'sit' && (dir === 'right' || dir === 'left')) return lzFrame(look, 4, (dir === 'right' ? 0 : 6) + tick6(3))
  if (moving) return lzFrame(look, 2, d * 6 + (Math.floor(walk * 10) % 6))
  return lzFrame(look, 1, d * 6 + tick6(5))
}
