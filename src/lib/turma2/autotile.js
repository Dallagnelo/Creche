import { T, loadImage } from './assets'

// Terrenos que se encaixam sozinhos (autotile), do modelo Godot "3x3 mínimo" do Modern Exteriors:
// cada terreno é um bloco de 12x4 quadradinhos; a borda certa é escolhida olhando os 8 vizinhos.
// Qual quadradinho serve para qual vizinhança é descoberto pelos pixels (igual ao scripts/turma2_lib.py).

const SHEET = '/limezu/me/terrenos/godot_autotiles.png'
const ASPHALT = { theme: 'city_terrains', name: 'asphalt_1_variation_16' }

// chão de fundo (o mapa inteiro começa com um deles)
export const BASES = [
  { id: 'grama', label: 'Grama', block: 13 },
  { id: 'areia', label: 'Areia', block: 6 },
  { id: 'terra', label: 'Terra', block: 0 },
  { id: 'pedra', label: 'Pedra', block: 3 },
  { id: 'tijolo', label: 'Tijolo', block: 10 },
  { id: 'asfalto', label: 'Asfalto', asphalt: true },
]

// terrenos para pintar, na ordem em que são desenhados (o de baixo da lista fica por cima)
export const TERRAINS = [
  { id: 'terra', label: 'Terra', block: 0, color: '#b08a55' },
  { id: 'pedra', label: 'Pedra', block: 3, color: '#9a9a8a' },
  { id: 'areia', label: 'Areia', block: 6, color: '#e2b45c' },
  { id: 'tijolo', label: 'Tijolo', block: 10, color: '#d0754a' },
  { id: 'calcada', label: 'Calçada branca', block: 18, color: '#e8e3da' },
  { id: 'calcada2', label: 'Calçada creme', block: 19, color: '#ddd3bf' },
  { id: 'calcada3', label: 'Calçada cinza', block: 20, color: '#b9bcc2' },
  { id: 'calcada4', label: 'Lajota cinza', block: 21, color: '#a7aab0' },
  { id: 'calcada5', label: 'Lajota escura', block: 22, color: '#8f9196' },
  { id: 'calcada6', label: 'Calçada azulada', block: 23, color: '#9fb0be' },
  { id: 'canteiro', label: 'Canteiro (grama com borda)', block: 13, color: '#4f9a4a' },
  { id: 'agua', label: 'Água (lago parado)', block: 15, color: '#2f6fb3', block_walk: true },
  { id: 'piscina', label: 'Piscina', block: 17, color: '#5cc8e8', block_walk: true },
  { id: 'cerca_viva', label: 'Cerca viva', block: 11, color: '#2f7a3a', block_walk: true },
  { id: 'cerca', label: 'Cerca', block: 16, color: '#7a5a3a', block_walk: true, oob: false },
]
export const terrainById = Object.fromEntries(TERRAINS.map((t) => [t.id, t]))

const KEYS = ['n', 's', 'w', 'e', 'nw', 'ne', 'sw', 'se']
const DIRS = { n: [0, -1], s: [0, 1], w: [-1, 0], e: [1, 0], nw: [-1, -1], ne: [1, -1], sw: [-1, 1], se: [1, 1] }
const REG = { n: [0, 3, 6, 10], s: [13, 16, 6, 10], w: [6, 10, 0, 3], e: [6, 10, 13, 16], nw: [0, 3, 0, 3], ne: [0, 3, 13, 16], sw: [13, 16, 0, 3], se: [13, 16, 13, 16] }

function reduce(f) {
  const g = { ...f }
  g.nw = g.nw && g.n && g.w
  g.ne = g.ne && g.n && g.e
  g.sw = g.sw && g.s && g.w
  g.se = g.se && g.s && g.e
  return KEYS.map((k) => (g[k] ? 1 : 0))
}
const FULL = reduce(Object.fromEntries(KEYS.map((k) => [k, true]))).join('')

let ready = null
export function loadAutotiles(asphaltAtlas) {
  if (!ready) {
    ready = loadImage(SHEET).then((img) => {
      const c = document.createElement('canvas')
      c.width = img.width
      c.height = img.height
      const cx = c.getContext('2d')
      cx.drawImage(img, 0, 0)
      const data = cx.getImageData(0, 0, img.width, img.height)
      return { img, data, tables: new Map() }
    })
  }
  return Promise.all([ready, asphaltAtlas]).then(([s, asphalt]) => ({ ...s, asphalt }))
}

function mean(data, x0, y0, y1, y2, x1, x2) {
  let r = 0, g = 0, b = 0, a = 0, n = 0
  for (let y = y0 + y1; y < y0 + y2; y += 1) {
    for (let x = x0 + x1; x < x0 + x2; x += 1) {
      const i = (y * data.width + x) * 4
      r += data.data[i]; g += data.data[i + 1]; b += data.data[i + 2]; a += data.data[i + 3]; n += 1
    }
  }
  return [r / n, g / n, b / n, a / n]
}
const dist = (p, q) => Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) + Math.abs(p[2] - q[2]) + Math.abs(p[3] - q[3])

function noise(data, x0, y0) {
  let sum = 0
  let sq = 0
  for (let y = y0; y < y0 + T; y += 1) {
    for (let x = x0; x < x0 + T; x += 1) {
      const i = (y * data.width + x) * 4
      const l = data.data[i] * 0.3 + data.data[i + 1] * 0.59 + data.data[i + 2] * 0.11
      sum += l
      sq += l * l
    }
  }
  const n = T * T
  return sq / n - (sum / n) ** 2
}

function analyze(sheet, block) {
  if (sheet.tables.has(block)) return sheet.tables.get(block)
  const tiles = []
  for (let i = 0; i < 48; i += 1) tiles.push([(i % 12) * T, block * 64 + Math.floor(i / 12) * T])
  const centers = tiles.map(([x, y]) => mean(sheet.data, x, y, 6, 10, 6, 10))
  const refIn = [0, 1, 2, 3].map((c) => {
    const v = centers.map((m) => m[c]).sort((a, b) => a - b)
    return v[Math.floor(v.length / 2)]
  })
  const samples = []
  for (const [x, y] of tiles) for (const k of KEYS) samples.push(mean(sheet.data, x, y, REG[k][0], REG[k][1], REG[k][2], REG[k][3]))
  const ds = samples.map((m) => dist(m, refIn))
  const cut = [...ds].sort((a, b) => a - b)[Math.floor(ds.length * 0.85)]
  const far = samples.filter((_, i) => ds[i] > cut)
  const refOut = [0, 1, 2, 3].map((c) => far.reduce((s, m) => s + m[c], 0) / Math.max(1, far.length))
  const table = new Map()
  tiles.forEach(([x, y], i) => {
    if (mean(sheet.data, x, y, 0, 16, 0, 16)[3] === 0) return
    const f = {}
    for (const k of KEYS) {
      const m = mean(sheet.data, x, y, REG[k][0], REG[k][1], REG[k][2], REG[k][3])
      f[k] = dist(m, refIn) < dist(m, refOut)
    }
    const key = reduce(f).join('')
    // vários quadradinhos servem para a mesma vizinhança: fica o mais "liso" (sem enfeite repetindo)
    const v = noise(sheet.data, x, y)
    if (!table.has(key) || v < table.get(key)[1]) table.set(key, [i, v])
  })
  for (const [k, [i]] of table) table.set(k, i)
  sheet.tables.set(block, table)
  return table
}

function pick(table, key) {
  const hit = table.get(key)
  if (hit !== undefined) return hit
  // sem o quadradinho exato: o mais parecido (lados pesam mais que cantos)
  let best = null
  let bestScore = Infinity
  for (const [k, i] of table) {
    let s = 0
    for (let j = 0; j < 8; j += 1) if (k[j] !== key[j]) s += j < 4 ? 3 : 1
    if (s < bestScore) {
      bestScore = s
      best = i
    }
  }
  return best ?? 0
}

function drawTile(ctx, sheet, block, i, dx, dy) {
  ctx.drawImage(sheet.img, (i % 12) * T, block * 64 + Math.floor(i / 12) * T, T, T, dx, dy, T, T)
}

// camadas de terreno guardadas como texto de "0" e "1" (uma letra por quadradinho)
export const emptyLayer = (w, h) => '0'.repeat(w * h)
export const cellOn = (layer, w, x, y) => layer?.[y * w + x] === '1'
export const setCells = (layer, w, cells, on) => {
  const arr = layer.split('')
  for (const [x, y] of cells) arr[y * w + x] = on ? '1' : '0'
  return arr.join('')
}

/** Desenha (ou redesenha) alguns quadradinhos do chão: fundo + cada terreno pintado, em ordem. */
export function paintCells(ctx, sheet, map, cells) {
  const { w, h } = map
  const base = BASES.find((b) => b.id === map.base) ?? BASES[0]
  for (const [x, y] of cells) {
    if (x < 0 || y < 0 || x >= w || y >= h) continue
    const dx = x * T
    const dy = y * T
    ctx.clearRect(dx, dy, T, T)
    if (base.asphalt && sheet.asphalt) {
      const [sx, sy] = sheet.asphalt.rect
      ctx.drawImage(sheet.asphalt.img, sx, sy, T, T, dx, dy, T, T)
    } else drawTile(ctx, sheet, base.block, pick(analyze(sheet, base.block), FULL), dx, dy)
    for (const t of TERRAINS) {
      const layer = map.terrain?.[t.id]
      if (!cellOn(layer, w, x, y)) continue
      const f = {}
      for (const k of KEYS) {
        const nx = x + DIRS[k][0]
        const ny = y + DIRS[k][1]
        f[k] = nx < 0 || ny < 0 || nx >= w || ny >= h ? t.oob !== false : cellOn(layer, w, nx, ny)
      }
      drawTile(ctx, sheet, t.block, pick(analyze(sheet, t.block), reduce(f).join('')), dx, dy)
    }
  }
}

export function allCells(map) {
  const cells = []
  for (let y = 0; y < map.h; y += 1) for (let x = 0; x < map.w; x += 1) cells.push([x, y])
  return cells
}

/** os quadradinhos que mudam de desenho quando estes mudam (eles e os vizinhos) */
export function around(cells) {
  const seen = new Set()
  const out = []
  for (const [x, y] of cells) {
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        const k = `${x + dx},${y + dy}`
        if (!seen.has(k)) {
          seen.add(k)
          out.push([x + dx, y + dy])
        }
      }
    }
  }
  return out
}

export { ASPHALT }
