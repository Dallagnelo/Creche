// Móveis do pacote "Modern Interiors" (LimeZu, licença paga: crédito em Configurações → Créditos),
// usados na "Turma (nova)". Importados por scripts/limezu-import.py:
//   public/limezu/<tema>.png   → todos os desenhos de um tema numa imagem (carregada só quando alguém usa)
//   src/lib/limezuCatalog.json → temas e grupos (mesmo móvel em várias cores)
// Chave de cada móvel no quarto: "lz:<tema>:<número>" (ex.: "lz:B:145" = Quarto, desenho 145).
import DATA from './limezuCatalog.json'

export const LZ_THEMES = Object.entries(DATA.themes).map(([code, theme]) => ({ code, ...theme }))

// ---------------------------------------------------------------- comportamento dos móveis
// O pacote só tem desenhos numerados. Cada móvel tem um "jeito" (config), que vem daqui (padrões que eu marquei)
// ou do admin (botão ⚙ Ajustar no modo decorar, tabela turma_lab_items — vale mais que o padrão):
//   kind: 'solid' (móvel comum) · 'floor' (tapete: dá para pisar) · 'wall' (vai na parede) · 'pass' (atravessável)
//         'seat' (dá para sentar; dir = para onde a pessoa olha) · 'bed' (dá para deitar; dir = lado da cabeceira)
//   h: fundura no chão (quadradinhos) · name: nome no catálogo
const RULES = [
  // tapetes, capachos, escadas e pisos
  ['B', 354, 386, { kind: 'floor' }], ['B', 452, 453, { kind: 'floor' }], ['CO', 1, 70, { kind: 'floor' }],
  ...[15, 20, 29, 40, 55, 65, 104, 185, 195, 196, 197, 14, 83].map((n) => ['GE', n, n, { kind: 'floor' }]),
  ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => ['JP', n, n, { kind: 'floor' }]),
  // coisas de parede
  ['B', 421, 428, { kind: 'wall' }], ['B', 462, 465, { kind: 'wall' }], ['B', 433, 433, { kind: 'wall' }], ['L', 12, 12, { kind: 'wall' }],
  ...[7, 10, 11, 25, 26, 27, 37, 38, 62, 63, 67, 68, 69, 70, 91, 105, 106, 107, 113, 114, 115, 116, 117, 120, 144, 145, 146, 149, 171, 172, 184, 190, 191].map((n) => ['GE', n, n, { kind: 'wall' }]),
  ...[31, 32, 33, 36, 37, 38].map((n) => ['C', n, n, { kind: 'wall' }]),
  ...[17, 105, 106, 107].map((n) => ['JP', n, n, { kind: 'wall' }]),
  // camas: de frente (cabeceira em cima), de lado (cabeceira à direita / à esquerda), beliches e futons
  ['B', 140, 195, { kind: 'bed', dir: 'up', h: 2, name: 'Cama de solteiro' }],
  ['B', 217, 272, { kind: 'bed', dir: 'up', h: 2, name: 'Cama de casal' }],
  ['B', 1, 56, { kind: 'bed', dir: 'right', name: 'Cama de solteiro (de lado)' }],
  ['B', 63, 118, { kind: 'bed', dir: 'left', name: 'Cama de solteiro (de lado)' }],
  ['B', 125, 139, { kind: 'bed', dir: 'up', h: 2, name: 'Beliche' }],
  ['JP', 77, 79, { kind: 'bed', dir: 'up', name: 'Futon' }],
  // assentos
  ['L', 92, 93, { kind: 'seat', dir: 'down', name: 'Cadeira' }],
  ['GE', 35, 35, { kind: 'seat', dir: 'down', name: 'Sofá' }],
  ['GE', 19, 19, { kind: 'seat', dir: 'down', name: 'Banquinho' }], ['GE', 45, 45, { kind: 'seat', dir: 'down', name: 'Banquinho' }],
  ['GE', 33, 34, { kind: 'seat', dir: 'right', name: 'Cadeira (de lado)' }],
  ...[125, 129, 137, 141].map((n) => ['GE', n, n, { kind: 'seat', dir: 'left', name: 'Cadeira (de lado)' }]),
  ['C', 1, 2, { kind: 'seat', dir: 'down', name: 'Cadeira da escola' }], ['C', 3, 3, { kind: 'seat', dir: 'right', name: 'Cadeira da escola (de lado)' }],
  ['C', 4, 4, { kind: 'seat', dir: 'left', name: 'Cadeira da escola (de lado)' }],
  ['CH', 37, 40, { kind: 'seat', dir: 'down', name: 'Cadeira' }],
  ['JP', 118, 120, { kind: 'seat', dir: 'down', name: 'Almofada' }],
]
const ruleFor = (code, n) => RULES.find(([c, a, b]) => c === code && n >= a && n <= b)?.[3] ?? null

// lugares para sentar/deitar a partir do jeito do móvel
function seatsFor(config, w, h) {
  const dir = config.dir ?? 'down'
  if (config.kind === 'bed') {
    if (dir === 'left') return [{ dx: 0.1, dy: h === 2 ? 0.75 : 0.3, pose: 'sleepl' }]
    if (dir === 'right') return [{ dx: w - 1.1, dy: h === 2 ? 0.75 : 0.3, pose: 'sleepr' }]
    if (dir === 'down') return [{ dx: (w - 1) / 2, dy: h - 0.85, pose: 'sleepu', bw: w * 16 - 4 }]
    return [{ dx: (w - 1) / 2, dy: 0.3, pose: 'sleep', bw: w * 16 - 4 }]
  }
  if (dir === 'left' || dir === 'right') {
    return Array.from({ length: h }, (_, i) => ({ dx: dir === 'left' ? -0.05 : 0.05, dy: i - 0.05, pose: 'sit', dir, over: true }))
  }
  const count = Math.max(1, w)
  return Array.from({ length: count }, (_, i) => ({ dx: i, dy: dir === 'up' ? -0.6 : 0.05, pose: 'sit', dir: dir === 'up' ? 'up' : undefined }))
}

/** Aplica o jeito do móvel nos itens do catálogo (todas as cores do mesmo móvel). */
function applyConfig(group, config) {
  const { code, n, pw, ph } = group.base
  const c = config ?? {}
  const kind = c.kind ?? 'solid'
  const w = Math.max(1, Math.round(pw / 16))
  const h = kind === 'floor' ? Math.max(1, Math.round(ph / 16)) : Math.max(1, Math.min(4, c.h ?? 1))
  const label = c.name || group.defaultLabel
  group.label = label
  group.entries.forEach((entry) => {
    Object.assign(entry, { label, groupLabel: label, w, h, config: c })
    delete entry.floor
    delete entry.wall
    delete entry.passable
    delete entry.act
    delete entry.seats
    delete entry.py
    if (kind === 'floor') entry.floor = true
    if (kind === 'wall') Object.assign(entry, { wall: true, py: c.py ?? 4 })
    if (kind === 'pass') entry.passable = true
    if (kind === 'seat' || kind === 'bed') {
      entry.act = kind === 'bed' ? 'bed' : 'sit'
      entry.seats = seatsFor(c, w, h)
    }
  })
}

// ---------------------------------------------------------------- catálogo
const ENTRIES = new Map() // "lz:B:145" → item do catálogo
export const LZ_GROUPS = [] // { group, label, cat, entries }
const GROUP_OF = new Map() // chave do grupo → grupo
{
  const count = {}
  DATA.groups.forEach(([code, variants]) => {
    const theme = DATA.themes[code]
    count[code] = (count[code] ?? 0) + 1
    const [first] = variants
    const [n, , , pw, ph] = first
    const defaultLabel = `${theme.label} ${count[code]}`
    const group = { group: `lz:${code}:${n}`, label: defaultLabel, defaultLabel, cat: `lz-${code}`, entries: [], base: { code, n, pw, ph } }
    variants.forEach(([vn, x, y, vw, vh, color]) => {
      const entry = {
        key: `lz:${code}:${vn}`, label: defaultLabel, cat: group.cat, group: group.group, groupLabel: defaultLabel,
        color: variants.length > 1 ? color : undefined, lz: { code, rect: [x, y, vw, vh] },
      }
      ENTRIES.set(entry.key, entry)
      group.entries.push(entry)
    })
    applyConfig(group, ruleFor(code, n))
    LZ_GROUPS.push(group)
    GROUP_OF.set(group.group, group)
  })
}

// ajustes do admin (carregados quando a Turma nova abre)
let adminConfigs = {}
const configListeners = new Set()
/** Avisa quando os ajustes dos móveis mudam (o catálogo e a sala precisam se refazer). */
export function onLzConfig(fn) {
  configListeners.add(fn)
  return () => configListeners.delete(fn)
}
/** Coloca os ajustes do admin por cima dos padrões. */
export function setLzConfigs(map) {
  const touched = new Set([...Object.keys(adminConfigs), ...Object.keys(map ?? {})])
  adminConfigs = { ...(map ?? {}) }
  touched.forEach((key) => {
    const group = GROUP_OF.get(key)
    if (group) applyConfig(group, adminConfigs[key] ?? ruleFor(group.base.code, group.base.n))
  })
  configListeners.forEach((fn) => fn([...touched]))
  listeners.forEach((fn) => fn('config'))
}
/** Jeito atual de um móvel (para o painel ⚙ Ajustar). */
export function lzConfigOf(key) {
  const entry = ENTRIES.get(String(key).split('@')[0])
  const group = entry && GROUP_OF.get(entry.group)
  if (!group) return null
  return { group: group.group, defaultLabel: group.defaultLabel, config: adminConfigs[group.group] ?? ruleFor(group.base.code, group.base.n) ?? {}, custom: !!adminConfigs[group.group] }
}

// objetos animados (aba "Animados"): uma tira de quadros por objeto
;(DATA.anims ?? []).forEach(([n, x, y, fw, fh, frames, ms, name]) => {
  const key = `lz:AN:${n}`
  const durations = Array.isArray(ms) ? ms : Array(frames).fill(ms)
  const entry = {
    key, label: name, cat: 'lz-AN', w: Math.max(1, Math.round(fw / 16)), h: 1, group: key, groupLabel: name,
    lz: { code: 'AN', rect: [x, y, fw, fh] }, anim: { frames, durations, total: durations.reduce((a, b) => a + b, 0) },
  }
  ENTRIES.set(key, entry)
  const group = { group: key, label: name, defaultLabel: name, cat: 'lz-AN', entries: [entry], base: { code: 'AN', n, pw: fw, ph: fh } }
  LZ_GROUPS.push(group)
  GROUP_OF.set(key, group)
})
export const LZ_CATEGORIES = LZ_THEMES.map((theme) => ({ id: `lz-${theme.code}`, label: theme.label }))
export const lzEntry = (key) => ENTRIES.get(key) ?? null
export const isLz = (key) => String(key).startsWith('lz:')
export const allLzEntries = () => [...ENTRIES.values()]

// ---------------------------------------------------------------- paredes e pisos (blocos de 48x32 px)
export const LZ_SHEETS = { walls: [512, 640], floors: [240, 640] }
export const LZ_WALLS = (DATA.walls ?? []).map(([x, y, color], i) => ({ id: `lzw:${i}`, label: `Parede ${i + 1}`, lz: { sheet: 'walls', x, y }, swatch: color, base: color }))
export const LZ_FLOORS = (DATA.floors ?? []).map(([x, y, color, , , t = 0], i) => ({ id: `lzf:${i}`, label: `Piso ${i + 1}`, lz: { sheet: 'floors', x, y, tx: x + (t % 3) * 16, ty: y + Math.floor(t / 3) * 16 }, swatch: color, tones: [color] }))
// padrão da Turma nova: parede clarinha e piso de madeira
export const LZ_DEFAULT_WALL = LZ_WALLS[9]?.id ?? LZ_WALLS[0]?.id ?? 'creme'
export const LZ_DEFAULT_FLOOR = LZ_FLOORS[20]?.id ?? LZ_FLOORS[0]?.id ?? 'madeira'
export const lzWall = (id) => LZ_WALLS.find((w) => w.id === id) ?? null
export const lzFloor = (id) => LZ_FLOORS.find((f) => f.id === id) ?? null

/** Imagem das paredes ou dos pisos (null enquanto carrega). */
export function lzSheet(sheet) {
  const entry = themeImage(sheet)
  return entry?.ready ? entry.img : null
}

// ---------------------------------------------------------------- imagens (uma por tema, carregadas quando precisa)
const images = new Map() // código → { img, ready }
const listeners = new Set()
/** Chamado quando a imagem de algum tema termina de carregar (para redesenhar). Devolve "desinscrever". */
export function onLimezuReady(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function themeImage(code) {
  let entry = images.get(code)
  if (!entry && typeof Image !== 'undefined') {
    const img = new Image()
    entry = { img, ready: false }
    images.set(code, entry)
    img.onload = () => {
      entry.ready = true
      listeners.forEach((fn) => fn(code))
    }
    img.src = `/limezu/${code}.png`
  }
  return entry
}

const animFrames = new Map()
/** Quadro atual de um objeto animado (null enquanto a imagem carrega). */
export function limezuAnimFrame(key, nowMs) {
  const entry = ENTRIES.get(String(key).split('@')[0])
  if (!entry?.anim) return null
  const theme = themeImage('AN')
  if (!theme?.ready) return null
  if (!animFrames.has(entry.key)) {
    const [x, y, w, h] = entry.lz.rect
    animFrames.set(
      entry.key,
      Array.from({ length: entry.anim.frames }, (_, i) => {
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        canvas.getContext('2d').drawImage(theme.img, x + i * w, y, w, h, 0, 0, w, h)
        return canvas
      }),
    )
  }
  const { durations, total } = entry.anim
  let t = nowMs % total
  let i = 0
  while (i < durations.length - 1 && t >= durations[i]) t -= durations[i++]
  return animFrames.get(entry.key)[i]
}

/** Desenho de um móvel "lz:..." (null enquanto a imagem do tema carrega; undefined se não é do pacote). */
export function limezuSprite(key) {
  const entry = ENTRIES.get(String(key).split('@')[0])
  if (!entry) return undefined
  const theme = themeImage(entry.lz.code)
  if (!theme?.ready) return null
  const [x, y, w, h] = entry.lz.rect
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d').drawImage(theme.img, x, y, w, h, 0, 0, w, h)
  return canvas
}

// ---------------------------------------------------------------- balões de emoção (public/limezu/emotes.png)
// cada um: 2 quadros de 16x16 lado a lado (x, y do primeiro). Usados nos botões de emote da Turma (nova).
export const LZ_EMOTES = [
  { id: 'oi', label: 'Oi!', x: 0, y: 64 },
  { id: 'amor', label: 'Amei', x: 64, y: 80 },
  { id: 'musica', label: 'Música', x: 96, y: 96 },
  { id: 'duvida', label: 'Hã?', x: 32, y: 80 },
  { id: 'ideia', label: 'Brilhou', x: 64, y: 96 },
  { id: 'sono', label: 'Sono', x: 96, y: 80 },
  { id: 'sol', label: 'Que dia!', x: 32, y: 128 },
  { id: 'grana', label: 'Dinheiro', x: 32, y: 64 },
]
export const lzEmote = (text) => (String(text).startsWith(':lz:') ? LZ_EMOTES.find((e) => e.id === String(text).slice(4)) ?? null : null)
