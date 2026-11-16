// Girar móveis no modo decorar.
// A rotação fica na própria chave do móvel:
//   "sofafront:e05252@1" = sofá girado 90° (sentido horário); @2 = 180°; @3 = 270°.
//   "plant:0@m"         = espelhado (móveis "redondos", enfeites de parede e coisas sem frente).
//   paredes e portas trocam de peça: "wallh:creme" ↔ "wallv:creme".
// Tipos de giro (definidos no roomCatalog para cada móvel):
//   família  → desenhos feitos à mão de lado/de costas (sofás, camas, cadeiras, mesas)
//   box      → móveis "caixa" (estantes, geladeira, TV...): costas e lados gerados a partir do desenho de frente
//   floor    → coisas do chão (tapetes, pistas): o desenho gira de verdade
//   mirror   → espelha (vira para o outro lado)
import { box, DARK, getSprite, OUT, setRotatedSprites, shadeHex, sprite } from './roomSprites'

const ORDER = ['down', 'left', 'up', 'right'] // horário, visto de cima
const hex = (color) => `#${color}`

const FAMILIES = {
  sofa: { kind: 'sofa', faces: 'up', len: 4, color: '3a6db4' },
  sofafront: { kind: 'sofa', faces: 'down', len: 3, color: 'e05252' },
  loveseat: { kind: 'sofa', faces: 'down', len: 2, color: '3a6db4' },
  armchair: { kind: 'sofa', faces: 'down', len: 1, color: 'e8915a' },
  gamerchair: { kind: 'gamer', faces: 'down', color: 'e05252' },
  bed: { kind: 'bed', faces: 'down', size: 2, color: '4d7fc6' },
  bedsingle: { kind: 'bed', faces: 'down', size: 1, color: 'e86aa0' },
  tv: { kind: 'tv', faces: 'down' },
  tablelong: { kind: 'table', steps: 2 },
  coffee: { kind: 'coffee', steps: 2 },
}
export function hasFamily(base) {
  return !!FAMILIES[base]
}

// peças que viram outra peça ao girar (mantém cor/estilo)
const SWAPS = {
  'chair:l': 'chair:d', 'chair:d': 'chair:r', 'chair:r': 'chair:u', 'chair:u': 'chair:l',
}
const PIECE_SWAPS = {
  wallh: 'wallv', wallv: 'wallh', wallh2: 'wallv2', wallv2: 'wallh2', wallh3: 'wallv3', wallv3: 'wallh3', wallh4: 'wallv4', wallv4: 'wallh4',
  archway: 'archwayv', archwayv: 'archway', doorin: 'doorinv', doorinv: 'doorin', doorclosed: 'doorclosedv', doorclosedv: 'doorclosed', beads: 'beadsv', beadsv: 'beads',
}

// tipo de giro de cada chave do catálogo (preenchido pelo roomCatalog)
const KINDS = new Map()
export function registerRotation(key, info) {
  KINDS.set(key, info)
}
export const rotationInfo = (key) => KINDS.get(parseRot(key).key) ?? null

/** "sofa:3a6db4@2" → { key: "sofa:3a6db4", base: "sofa", args: ["3a6db4"], r: 2 }  ("@m" → r: 'm') */
export function parseRot(key) {
  const [main, rot] = String(key).split('@')
  const [base, ...args] = main.split(':')
  return { key: main, base, args, r: rot === 'm' ? 'm' : Number(rot) || 0 }
}

const familyOf = (key) => FAMILIES[parseRot(key).base] ?? null
const facingOf = (family, r) => ORDER[(ORDER.indexOf(family.faces) + r) % 4]

/** Chave do móvel girado mais 90° (ou null se ele não gira). */
export function rotatedKey(key) {
  if (SWAPS[key]) return SWAPS[key]
  const { key: main, base, args, r } = parseRot(key)
  if (PIECE_SWAPS[base]) return [PIECE_SWAPS[base], ...args].join(':')
  const family = familyOf(key)
  if (family) {
    const next = (r + 1) % (family.steps ?? 4)
    return next ? `${main}@${next}` : main
  }
  const info = KINDS.get(main)
  if (!info) return null
  if (info.kind === 'mirror') return r === 'm' ? main : `${main}@m`
  const next = ((r || 0) + 1) % 4
  return next ? `${main}@${next}` : main
}

/** Troca a parte de baixo (sem rotação) e mantém o giro. */
export function keepRotation(fromKey, toKey) {
  const { r } = parseRot(fromKey)
  return r ? `${parseRot(toKey).key}@${r}` : toKey
}

// pontos de sentar espalhados ao longo de um sofá de L quadradinhos
const spread = (len) => {
  if (len === 1) return [0]
  const count = Math.min(3, len)
  return Array.from({ length: count }, (_, j) => 0.125 + (j * (len - 1.25)) / (count - 1))
}

const mirrorSeat = (w) => (seat) => ({ ...seat, dx: w - 1 - seat.dx, dir: seat.dir === 'left' ? 'right' : seat.dir === 'right' ? 'left' : seat.dir })

/** Ajusta o item do catálogo para a rotação pedida (tamanho, lugares, tela, luz). null = essa chave não existe. */
export function rotateEntry(entry, key) {
  const { key: main, r } = parseRot(key)
  if (!r) return null
  const family = FAMILIES[entry.group]
  if (family) return familyEntry(entry, key, family, r)
  const info = KINDS.get(main)
  if (!info) return null
  const out = { ...entry, key, rotation: r }
  const base = getSprite(main)
  const sw = base?.width ?? entry.w * 16
  const sh = base?.height ?? (entry.h ?? 1) * 16
  if (r === 'm') {
    if (info.kind !== 'mirror') return null
    if (entry.screen) out.screen = { ...entry.screen, dx: sw - entry.screen.dx - entry.screen.w }
    if (entry.glow) out.glow = { ...entry.glow, dx: sw - entry.glow.dx }
    if (entry.seats) out.seats = entry.seats.map(mirrorSeat(entry.w))
    return out
  }
  if (info.kind !== 'floor' && info.kind !== 'box') return null
  const odd = r % 2 === 1
  const w = odd ? entry.h ?? 1 : entry.w
  const h = odd ? entry.w : entry.h ?? 1
  Object.assign(out, { w, h })
  delete out.seats
  if (info.kind === 'floor') {
    // tela que cobre o chão inteiro (pista de dança) gira junto; as outras somem
    const full = entry.screen && entry.screen.dx === 0 && entry.screen.dy === 0 && entry.screen.w >= sw && entry.screen.h >= sh
    if (full) out.screen = { ...entry.screen, w: odd ? entry.screen.h : entry.screen.w, h: odd ? entry.screen.w : entry.screen.h }
    else delete out.screen
    return out
  }
  // box: de costas ou de lado a tela não aparece; a luz fica no meio do móvel
  delete out.screen
  if (entry.seats?.length) {
    // bancos e poltronas "caixa": quem senta acompanha o giro
    const baseFacing = entry.seats[0].dir === 'up' ? 'up' : 'down'
    const facing = ORDER[(ORDER.indexOf(baseFacing) + r) % 4]
    if (odd) {
      out.seats = entry.seats.map((seat) => ({
        pose: seat.pose, dx: facing === 'left' ? -0.1 : 0.1, dy: Math.min(h - 1, Math.max(0, Math.round(seat.dx))) - 0.15, dir: facing, over: true,
      }))
    } else {
      out.seats = entry.seats.map((seat) => ({ pose: seat.pose, dx: entry.w - 1 - seat.dx, dy: facing === 'up' ? -0.7 : 0.05, dir: facing === 'up' ? 'up' : undefined }))
    }
  }
  if (entry.glow) {
    const spr = getSprite(key)
    out.glow = { ...entry.glow, dx: Math.round((spr?.width ?? w * 16) / 2), dy: entry.glow.dy }
  }
  return out
}

function familyEntry(entry, key, family, r) {
  if (r === 'm' || r < 1 || r >= (family.steps ?? 4)) return null
  const out = { ...entry, key, rotation: r }
  delete out.screen
  delete out.glow
  if (family.kind === 'table' || family.kind === 'coffee') return { ...out, w: entry.h ?? 1, h: entry.w }
  if (family.kind === 'tv') return r % 2 ? { ...out, w: 1, h: entry.w } : out

  const facing = facingOf(family, r)
  const side = facing === 'left' || facing === 'right'
  if (family.kind === 'bed') {
    const s = family.size
    if (side) {
      // cabeceira do lado oposto para onde o corpo "olha"
      const pose = facing === 'left' ? 'sleepr' : 'sleepl'
      const dx = facing === 'left' ? 0.9 : 0.1
      return { ...out, w: 2, h: s, seats: [{ dx, dy: s === 2 ? 0.75 : 0.3, pose }] }
    }
    return { ...out, w: s, h: 2, seats: [{ dx: s === 2 ? 0.5 : 0.05, dy: 1.15, pose: 'sleepu', bw: s === 2 ? 28 : 14 }] }
  }

  const len = family.kind === 'sofa' ? family.len : 1
  if (side) {
    return {
      ...out, w: 1, h: len,
      seats: Array.from({ length: len }, (_, i) => ({ dx: family.kind === 'sofa' ? (facing === 'left' ? -0.15 : 0.15) : facing === 'left' ? -0.05 : 0.05, dy: i - 0.15, pose: 'sit', dir: facing, over: true })),
    }
  }
  if (facing === 'up') return { ...out, w: len, h: 1, seats: spread(len).map((dx) => ({ dx, dy: -0.75, pose: 'sit', dir: 'up' })) }
  return { ...out, w: len, h: 1, seats: spread(len).map((dx) => ({ dx, dy: 0.05, pose: 'sit' })) }
}

// ---------------------------------------------------------------- desenhos

// sofá de frente (pessoa olhando para a câmera)
function sofaFront(len, c) {
  const W = len * 16 + (len === 1 ? 2 : 0)
  const dark = shadeHex(c, -0.28)
  const light = shadeHex(c, 0.25)
  const arm = len === 1 ? 5 : 7
  return sprite(W, 26, (r) => {
    box(r, 3, 0, W - 6, 14, c, light, dark)
    box(r, 0, 8, arm, 15, shadeHex(c, -0.1), light, dark)
    box(r, W - arm, 8, arm, 15, shadeHex(c, -0.1), light, dark)
    box(r, arm - 2, 12, W - (arm - 2) * 2, 10, c, light, dark)
    for (let i = 1; i < len; i += 1) {
      r(i * 16, 2, 1, 10, dark)
      r(i * 16, 13, 1, 8, dark)
    }
    r(2, 23, 3, 3, OUT)
    r(W - 5, 23, 3, 3, OUT)
  })
}

// sofá de costas (pessoa olhando para a parede do fundo)
function sofaBack(len, c) {
  const W = len * 16 + (len === 1 ? 2 : 0)
  const arm = len === 1 ? 4 : 9
  const armc = shadeHex(c, -0.12)
  return sprite(W, 24, (r) => {
    box(r, 0, 4, arm, 18, armc, shadeHex(c, 0.15), shadeHex(c, -0.35))
    box(r, W - arm, 4, arm, 18, armc, shadeHex(c, 0.15), shadeHex(c, -0.35))
    box(r, arm - 3, 0, W - (arm - 3) * 2, 21, c, shadeHex(c, 0.3), shadeHex(c, -0.25))
    r(arm - 2, 2, W - (arm - 2) * 2, 2, shadeHex(c, 0.12))
    for (let i = 1; i < len; i += 1) r(i * 16, 3, 1, 16, shadeHex(c, -0.25))
    // botões do estofado e a barra de baixo
    for (let i = 0; i < len; i += 1) {
      const cx = i * 16 + (len === 1 ? 9 : 8)
      r(cx - 4, 8, 2, 2, shadeHex(c, -0.3))
      r(cx + 2, 8, 2, 2, shadeHex(c, -0.3))
      r(cx - 1, 12, 2, 2, shadeHex(c, -0.3))
    }
    r(arm - 2, 17, W - (arm - 2) * 2, 3, shadeHex(c, -0.18))
    r(3, 22, 3, 2, OUT)
    r(W - 6, 22, 3, 2, OUT)
  })
}

// sofá de lado: comprido para baixo (1 x len). Visto de cima/de frente: assento largo,
// encosto alto do lado de trás e um braço em cada ponta (o de baixo mostra a frente).
function sofaSide(len, c, facing) {
  const W = 22
  const H = len * 16 + (len === 1 ? 14 : 12)
  const at = len === 1 ? 7 : 9 // altura do braço de cima
  const ab = len === 1 ? 9 : 11 // e do de baixo
  const dark = shadeHex(c, -0.3)
  const mid = shadeHex(c, -0.15)
  const light = shadeHex(c, 0.22)
  const top = shadeHex(c, 0.38)
  const flip = facing === 'right'
  return sprite(W, H, (r0) => {
    const r = (x, y, w, h, color) => r0(flip ? W - x - w : x, y, w, h, color)
    // pés
    r(2, H - 3, 3, 3, OUT)
    r(W - 5, H - 3, 3, 3, OUT)
    // encosto (atrás): parede alta com o topo claro
    // começa na mesma altura do braço de cima: sem ponta sobrando
    r(14, 4, 8, H - 7, OUT)
    r(15, 5, 6, H - 9, mid)
    r(15, 5, 6, 3, top)
    r(15, 8, 1, H - 13, light)
    // assento
    r(1, 9, 15, H - 13, OUT)
    r(2, 10, 13, H - 15, c)
    r(2, 10, 13, 2, light)
    for (let i = 1; i < len; i += 1) {
      r(2, 10 + i * 16 - 3, 13, 1, dark)
      r(2, 10 + i * 16 - 2, 13, 1, light)
    }
    r(14, 10, 1, H - 15, dark) // sombra do encosto no assento
    // almofada encostada
    r(9, 13, 5, 7, OUT)
    r(10, 14, 3, 5, '#f6f1e6')
    r(10, 14, 3, 1, '#ffffff')
    // braço de cima
    r(0, 4, 16, at, OUT)
    r(1, 5, 14, at - 2, mid)
    r(1, 5, 14, 3, top)
    // braço de baixo (com a frente aparecendo)
    r(0, H - 3 - ab, 16, ab, OUT)
    r(1, H - 2 - ab, 14, 3, top)
    r(1, H + 1 - ab, 14, ab - 5, mid)
    r(1, H - 5, 14, 1, dark)
  })
}

function gamerBack(c) {
  return sprite(16, 26, (r) => {
    r(7, 18, 2, 5, '#4a5060')
    r(2, 23, 12, 1, '#4a5060')
    r(1, 24, 2, 2, DARK)
    r(7, 24, 2, 2, DARK)
    r(13, 24, 2, 2, DARK)
    box(r, 1, 12, 14, 6, '#1b1f2b', '#2b2f3c', null, DARK)
    box(r, 2, 0, 12, 16, '#1b1f2b', '#2b2f3c', null, DARK)
    r(4, 2, 8, 2, c)
    r(7, 5, 2, 8, c)
    r(5, 13, 6, 1, '#3a4156')
  })
}

function gamerSide(c, facing) {
  const flip = facing === 'right'
  return sprite(16, 26, (r0) => {
    const r = (x, y, w, h, color) => r0(flip ? 16 - x - w : x, y, w, h, color)
    r(7, 18, 2, 5, '#4a5060')
    r(2, 23, 12, 1, '#4a5060')
    r(1, 24, 2, 2, DARK)
    r(13, 24, 2, 2, DARK)
    // encosto alto atrás
    box(r, 10, 0, 5, 18, '#1b1f2b', '#2b2f3c', null, DARK)
    r(11, 2, 3, 12, c)
    // assento e braço
    box(r, 1, 12, 13, 6, '#1b1f2b', '#2b2f3c', null, DARK)
    r(2, 13, 10, 1, c)
    r(3, 9, 7, 2, '#2b2f3c')
  })
}

// cama com a cabeceira embaixo (pessoa deitada olhando para cima)
function bedUp(size, c) {
  const W = size === 2 ? 32 : 18
  return sprite(W, 34, (r) => {
    box(r, 0, 0, W, 6, '#8a5a34', '#b4804c', '#6a4226')
    box(r, 1, 3, W - 2, 26, '#e8eef2', '#ffffff', '#c0c8d0')
    box(r, 1, 3, W - 2, 15, c, shadeHex(c, 0.3), shadeHex(c, -0.3))
    r(1, 15, W - 2, 3, '#f6f1e6')
    ;(size === 2 ? [6, 14, 22] : [7]).forEach((x) => r(x, 7, 4, 4, shadeHex(c, 0.15)))
    box(r, size === 2 ? 5 : 3, 19, size === 2 ? 22 : 12, 7, '#ffffff', null, '#d8e0e8', '#9aa6b2')
    // cabeceira (na frente)
    box(r, 0, 25, W, 9, '#8a5a34', '#b4804c', '#6a4226')
    r(3, 28, W - 6, 1, '#a06a3c')
  })
}

// cama de lado: cabeceira à esquerda (head 'l') ou à direita (head 'r')
function bedSide(size, c, head) {
  const H = size === 2 ? 34 : 22
  const flip = head === 'r'
  return sprite(32, H, (r0) => {
    const r = (x, y, w, h, color) => r0(flip ? 32 - x - w : x, y, w, h, color)
    // colchão e lençol
    box(r, 3, 6, 28, H - 8, '#e8eef2', '#ffffff', '#c0c8d0')
    // travesseiro(s) junto da cabeceira
    if (size === 2) {
      box(r, 6, 8, 8, 10, '#ffffff', null, '#d8e0e8', '#9aa6b2')
      box(r, 6, 19, 8, 10, '#ffffff', null, '#d8e0e8', '#9aa6b2')
    } else box(r, 6, 8, 8, 9, '#ffffff', null, '#d8e0e8', '#9aa6b2')
    // cobertor
    box(r, 15, 6, 16, H - 8, c, shadeHex(c, 0.3), shadeHex(c, -0.3))
    r(15, 6, 3, H - 8, '#f6f1e6')
    r(18, 6, 1, H - 8, '#d8d0c0')
    r(23, 9, 4, 4, shadeHex(c, 0.15))
    if (size === 2) r(23, 20, 4, 4, shadeHex(c, 0.15))
    // cabeceira (alta) e pezeira (baixa)
    box(r, 0, 0, 5, H - 1, '#8a5a34', '#b4804c', '#6a4226')
    r(2, 3, 1, H - 7, '#a06a3c')
    box(r, 29, 4, 3, H - 5, '#8a5a34', '#b4804c', '#6a4226')
  })
}

// TV no rack, de costas
function tvBack() {
  return sprite(48, 34, (r) => {
    box(r, 0, 18, 48, 15, '#6a4226', '#8a5a34', '#4a2c18')
    r(1, 25, 46, 1, '#4a2c18')
    r(2, 33, 3, 1, OUT)
    r(43, 33, 3, 1, OUT)
    r(22, 16, 4, 3, '#1b1f2b')
    r(18, 18, 12, 1, '#1b1f2b')
    box(r, 6, 0, 36, 18, '#2b3040', '#3a4156', '#1b1f2b', '#0c0e15')
    box(r, 16, 4, 16, 9, '#232838', '#2f3546', null, '#0c0e15')
    for (let x = 18; x < 30; x += 3) r(x, 6, 1, 5, '#151924')
  })
}
// TV no rack, de lado: rack comprido para o fundo e a TV fininha em pé no meio
function tvSide(facing) {
  const flip = facing === 'right'
  return sprite(16, 66, (r0) => {
    const r = (x, y, w, h, color) => r0(flip ? 16 - x - w : x, y, w, h, color)
    // tampo do rack (vai para o fundo) e a lateral
    r(0, 18, 16, 33, OUT)
    r(1, 19, 14, 31, '#b4804c')
    r(1, 19, 14, 1, '#d8a46a')
    r(1, 49, 14, 1, '#7a4c2a')
    box(r, 0, 50, 16, 15, '#8a5a34', '#b4804c', '#6a4226')
    r(2, 56, 12, 1, '#6a4226')
    r(1, 65, 3, 1, OUT)
    r(12, 65, 3, 1, OUT)
    // TV fininha em pé no meio do rack (a tela fica do lado para onde ela olha)
    r(6, 37, 4, 3, '#1b1f2b')
    r(4, 39, 8, 2, '#1b1f2b')
    r(5, 12, 6, 27, '#0c0e15')
    r(6, 13, 4, 25, '#3a4156')
    r(6, 13, 1, 25, '#121a26')
    r(9, 13, 1, 25, '#262b3a')
  })
}

function tableTall(kind) {
  if (kind === 'coffee') {
    return sprite(16, 30, (r) => {
      box(r, 0, 0, 16, 24, '#a06a3c', '#c48a54', '#7a4c2a')
      r(2, 2, 1, 20, '#d29a62')
      box(r, 5, 4, 5, 5, '#e8eef2', '#ffffff', '#c0c8d0', DARK)
      box(r, 5, 13, 4, 8, '#2b2f3c', '#3f4456', null, DARK)
      r(6, 15, 1, 1, '#e05252')
      r(6, 17, 1, 1, '#38d27a')
      r(2, 24, 2, 6, OUT)
      r(12, 24, 2, 6, OUT)
    })
  }
  return sprite(18, 38, (r) => {
    box(r, 0, 0, 18, 28, '#c08a52', '#d8a46a', '#9a6a40')
    r(2, 2, 1, 24, '#d8a46a')
    r(5, 4, 8, 5, '#f6f1e6')
    r(7, 12, 4, 4, '#e8915a')
    r(8, 11, 2, 1, '#38a85a')
    r(5, 19, 8, 5, '#f6f1e6')
    r(2, 28, 2, 10, OUT)
    r(14, 28, 2, 10, OUT)
  })
}

/** Desenho do móvel girado (chamado por getSprite quando a chave tem "@"). */
export function rotatedSprite(base, args, r, mainKey) {
  const family = FAMILIES[base]
  if (family) return familySprite(family, args, r, mainKey)
  const info = KINDS.get(mainKey)
  const front = getSprite(mainKey)
  if (!info || !front || !r) return null
  if (r === 'm') return mirrorCanvas(front)
  if (info.kind === 'floor') return rotateCanvas(front, r)
  if (info.kind === 'box') return r === 2 ? backView(front) : sideView(front, r === 1 ? 'left' : 'right', info.w, info.h)
  return null
}

function familySprite(family, args, r, mainKey) {
  if (!r || r === 'm') return null
  const color = hex(args[0] || family.color || 'e05252')
  if (family.kind === 'table' || family.kind === 'coffee') return tableTall(family.kind)
  const facing = facingOf(family, r)
  if (family.kind === 'tv') return facing === 'up' ? tvBack() : tvSide(facing)
  if (family.kind === 'bed') {
    if (facing === 'up') return bedUp(family.size, color)
    return bedSide(family.size, color, facing === 'left' ? 'r' : 'l')
  }
  if (family.kind === 'gamer') {
    if (facing === 'up') return gamerBack(color)
    return gamerSide(color, facing)
  }
  if (facing === 'left' || facing === 'right') return sofaSide(family.len, color, facing)
  return facing === 'up' ? sofaBack(family.len, color) : sofaFront(family.len, color)
}

// ---------------------------------------------------------------- geradores (a partir do desenho de frente)

function blank(w, h) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  return canvas
}

function flipVertical(src) {
  const out = blank(src.width, src.height)
  const ctx = out.getContext('2d')
  ctx.translate(0, src.height)
  ctx.scale(1, -1)
  ctx.drawImage(src, 0, 0)
  return out
}

function mirrorCanvas(src) {
  const out = blank(src.width, src.height)
  const ctx = out.getContext('2d')
  ctx.translate(src.width, 0)
  ctx.scale(-1, 1)
  ctx.drawImage(src, 0, 0)
  return out
}

function rotateCanvas(src, r) {
  const odd = r % 2 === 1
  const out = blank(odd ? src.height : src.width, odd ? src.width : src.height)
  const ctx = out.getContext('2d')
  ctx.imageSmoothingEnabled = false
  ctx.translate(out.width / 2, out.height / 2)
  ctx.rotate((r * Math.PI) / 2)
  ctx.drawImage(src, -src.width / 2, -src.height / 2)
  return out
}

// pixels como números 0xRRGGBB (−1 = transparente)
function pixels(src) {
  const { width: w, height: h } = src
  const data = src.getContext('2d').getImageData(0, 0, w, h).data
  const px = new Int32Array(w * h)
  for (let i = 0; i < w * h; i += 1) px[i] = data[i * 4 + 3] < 128 ? -1 : (data[i * 4] << 16) | (data[i * 4 + 1] << 8) | data[i * 4 + 2]
  return { w, h, px }
}
const luma = (c) => ((c >> 16) & 255) * 0.3 + ((c >> 8) & 255) * 0.59 + (c & 255) * 0.11
const tone = (c, k) => {
  const f = (v) => Math.max(0, Math.min(255, Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k))))
  return (f((c >> 16) & 255) << 16) | (f((c >> 8) & 255) << 8) | f(c & 255)
}
const OUT_C = parseInt(OUT.slice(1), 16)
const isLine = (c) => c >= 0 && luma(c) < 72

// tira os detalhes pequenos (puxadores, botões, letras): cada pixel vira a cor mais comum à volta
function simplify({ w, h, px }) {
  let cur = px
  for (let pass = 0; pass < 2; pass += 1) {
    const next = new Int32Array(cur)
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const c = cur[y * w + x]
        if (c < 0 || isLine(c)) continue
        const count = new Map()
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            const xx = x + dx
            const yy = y + dy
            if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue
            const n = cur[yy * w + xx]
            if (n < 0 || isLine(n)) continue
            count.set(n, (count.get(n) ?? 0) + 1)
          }
        }
        let best = c
        let most = 0
        count.forEach((v, k) => {
          if (v > most) {
            most = v
            best = k
          }
        })
        next[y * w + x] = best
      }
    }
    cur = next
  }
  return { w, h, px: cur }
}

// contorno escuro em volta de tudo e brilho no topo de cada coluna
function finish({ w, h, px }) {
  const out = new Int32Array(px)
  const empty = (x, y) => x < 0 || y < 0 || x >= w || y >= h || px[y * w + x] < 0
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (px[y * w + x] < 0) continue
      if (empty(x - 1, y) || empty(x + 1, y) || empty(x, y - 1) || empty(x, y + 1)) out[y * w + x] = OUT_C
    }
  }
  for (let x = 0; x < w; x += 1) {
    for (let y = 0; y < h; y += 1) {
      const c = out[y * w + x]
      if (c < 0 || c === OUT_C) continue
      out[y * w + x] = tone(c, 0.22)
      break
    }
  }
  return { w, h, px: out }
}

function toCanvas({ w, h, px }) {
  const out = blank(w, h)
  const ctx = out.getContext('2d')
  const img = ctx.createImageData(w, h)
  for (let i = 0; i < w * h; i += 1) {
    const c = px[i]
    if (c < 0) continue
    img.data[i * 4] = (c >> 16) & 255
    img.data[i * 4 + 1] = (c >> 8) & 255
    img.data[i * 4 + 2] = c & 255
    img.data[i * 4 + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
  return out
}

// de costas: mesma silhueta (espelhada), cada faixa com a cor que mais aparece nela (some puxador, tela, botão...),
// um pouco mais escura e com frisos de painel
// cor de cada linha do desenho, tirada da borda (a "moldura" do móvel: madeira da estante, branco da geladeira...)
// −1 = linha só de contorno
function rowBands({ w, h, px }) {
  const bands = new Int32Array(h).fill(-1)
  const at = (x, y) => (x < w ? px[y * w + x] : -1)
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const c = at(x, y)
      if (c < 0 || isLine(c)) continue
      const n = at(x + 1, y)
      const ok = (v) => v >= 0 && !isLine(v)
      // contorno mais claro que o normal (ex.: borda cinza da geladeira): pula
      if (ok(n) && luma(c) + 40 < luma(n)) continue
      // brilho de 1px na borda: usa a cor de dentro
      bands[y] = ok(n) && luma(c) > luma(n) + 25 ? n : c
      break
    }
  }
  return bands
}

function backView(front) {
  const { w, h, px } = pixels(front)
  const bands = rowBands({ w, h, px })
  const out = new Int32Array(w * h).fill(-1)
  for (let y = 0; y < h; y += 1) {
    const band = bands[y]
    for (let x = 0; x < w; x += 1) {
      const c = px[y * w + (w - 1 - x)]
      if (c < 0) continue
      out[y * w + x] = isLine(c) || band < 0 ? OUT_C : tone(band, y % 8 === 7 ? -0.32 : -0.18)
    }
  }
  return toCanvas(finish({ w, h, px: out }))
}

// de lado: a lateral (mais estreita quando o móvel é quadrado) e, em cima, o tampo que vai para o fundo
function sideView(front, facing, wTiles, hTiles) {
  const raw = pixels(front)
  const bands = rowBands(raw)
  const src = simplify(raw)
  const lift = Math.max(0, (wTiles - hTiles) * 16)
  const FW = wTiles === hTiles ? Math.max(8, Math.round(src.w * 0.7)) : Math.min(src.w, hTiles * 16)
  const W = FW
  const H = src.h + lift
  const out = new Int32Array(W * H).fill(-1)
  for (let x = 0; x < W; x += 1) {
    const sx = Math.min(src.w - 1, Math.floor(((x + 0.5) * src.w) / FW))
    let top = -1
    for (let y = 0; y < src.h; y += 1) {
      const c = src.px[y * src.w + sx]
      if (c < 0) continue
      if (top < 0) top = y
      // a lateral é lisa: cada linha com a cor principal daquela altura (sem portas, livros, botões)
      out[(y + lift) * W + x] = isLine(c) || bands[y] < 0 ? OUT_C : tone(bands[y], y % 8 === 7 ? -0.22 : -0.08)
    }
    if (top >= 0 && lift) {
      // tampo: a cor de cima da lateral, mais clara, subindo até o fundo
      let c = -1
      for (let y = top; y < src.h && c < 0; y += 1) {
        const v = src.px[y * src.w + sx]
        if (v >= 0 && !isLine(v)) c = v
      }
      if (c < 0) c = 0x8a5a34
      for (let y = top; y < top + lift; y += 1) out[y * W + x] = tone(c, 0.12)
      out[(top + lift) * W + x] = tone(c, -0.25) // quina entre o tampo e a lateral
    }
  }
  // a quina da frente (o lado para onde o móvel olha) fica mais clara
  const edge = facing === 'left' ? 1 : W - 2
  for (let y = 0; y < H; y += 1) {
    const c = out[y * W + edge]
    if (c >= 0 && c !== OUT_C) out[y * W + edge] = tone(c, 0.15)
  }
  return toCanvas(finish({ w: W, h: H, px: out }))
}

setRotatedSprites((name) => {
  const { key, base, args, r } = parseRot(name)
  return rotatedSprite(base, args, r, key)
})
