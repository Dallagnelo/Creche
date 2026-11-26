import { T, loadImage } from './assets'

// Terrenos que se encaixam sozinhos (autotile), do modelo Godot "3x3 mínimo" do Modern Exteriors
// (blocos 0 a 25) e do Modern Farm (26 em diante; a imagem junta os dois: scripts/turma2-fazenda.py):
// cada terreno é um bloco de 12x4 quadradinhos; a borda certa é escolhida olhando os 8 vizinhos.
// Qual quadradinho serve para qual vizinhança é descoberto pelos pixels (igual ao scripts/turma2_lib.py).

const SHEET = '/limezu/editor/autotiles.png'
const FZ = 26 // primeiro bloco da fazenda
const ASPHALT = { theme: 'city_terrains', name: 'asphalt_1_variation_16' }

// chão de fundo (o mapa inteiro começa com um deles)
export const BASES = [
  { id: 'grama', label: 'Grama', block: 13 },
  { id: 'areia', label: 'Areia', block: 6 },
  { id: 'terra', label: 'Terra', block: 0 },
  { id: 'pedra', label: 'Pedra', block: 3 },
  { id: 'tijolo', label: 'Tijolo', block: 10 },
  { id: 'asfalto', label: 'Asfalto', asphalt: true },
  // pisos de dentro de casa (Modern Interiors: public/limezu/floors.png, desenho de 3x2 quadradinhos que se repete)
  { id: 'madeira', label: 'Piso de madeira (casa)', tex: { file: 'floors', x: 0, y: 192 } },
  { id: 'madeira_escura', label: 'Piso de madeira escura (casa)', tex: { file: 'floors', x: 192, y: 416 } },
  { id: 'taco', label: 'Taco (casa)', tex: { file: 'floors', x: 64, y: 352 } },
  { id: 'xadrez', label: 'Piso xadrez (casa)', tex: { file: 'floors', x: 64, y: 320 } },
]

// terrenos para pintar, na ordem em que são desenhados (o de baixo da lista fica por cima).
// Os de "tiles" são peças fixas do pacote (asfalto e faixas da rua): não têm borda, cada quadradinho é uma peça.
const ASPHALT_TILES = [16, 17, 18, 19, 20, 21, 22, 23].map((k) => `asphalt_1_variation_${k}`)
export const TERRAINS = [
  { id: 'asfalto', label: 'Asfalto', tiles: ASPHALT_TILES, color: '#4a4d55' },
  { id: 'piso_madeira', label: 'Piso de madeira (casa)', tex: { file: 'floors', x: 0, y: 192 }, color: '#c8a050' },
  { id: 'tapete', label: 'Tapete (casa)', tex: { file: 'floors', x: 128, y: 288 }, color: '#8c8cd0' },
  { id: 'faixa', label: 'Faixa da rua (—)', tiles: ['asphalt_1_variation_14'], color: '#e8d27a' },
  { id: 'faixa_v', label: 'Faixa da rua (|)', tiles: ['asphalt_1_variation_15'], color: '#d8c26a' },
  { id: 'vaga', label: 'Faixa de vaga', tiles: ['asphalt_1_variation_4'], color: '#c9c9c9' },
  { id: 'terra', label: 'Terra', block: 0, color: '#b08a55' },
  { id: 'trilha', label: 'Trilha de terra (fazenda)', block: FZ + 0, color: '#a98b5c' },
  { id: 'horta', label: 'Horta (dá para arar e plantar)', block: FZ + 12, color: '#7a5230' },
  { id: 'terra_escura', label: 'Terra escura (fazenda)', block: FZ + 10, color: '#5a3a2e' },
  { id: 'areia_fz', label: 'Areia (fazenda)', block: FZ + 4, color: '#e9b860' },
  { id: 'pedra', label: 'Pedra', block: 3, color: '#9a9a8a' },
  { id: 'areia', label: 'Areia', block: 6, color: '#e2b45c' },
  { id: 'calcada', label: 'Calçada branca', block: 18, color: '#e8e3da' },
  { id: 'calcada2', label: 'Calçada creme', block: 19, color: '#ddd3bf' },
  { id: 'calcada3', label: 'Calçada cinza', block: 20, color: '#b9bcc2' },
  { id: 'calcada4', label: 'Lajota cinza', block: 21, color: '#a7aab0' },
  { id: 'calcada5', label: 'Lajota escura', block: 22, color: '#8f9196' },
  { id: 'calcada6', label: 'Calçada azulada', block: 23, color: '#9fb0be' },
  { id: 'canteiro', label: 'Canteiro (grama com borda)', block: 13, color: '#4f9a4a' },
  { id: 'tijolo', label: 'Tijolo', block: 10, color: '#d0754a' },
  { id: 'agua', label: 'Água (lago parado)', block: 15, color: '#2f6fb3', block_walk: true },
  { id: 'piscina', label: 'Piscina', block: 17, color: '#5cc8e8', block_walk: true },
  { id: 'cerca_viva', label: 'Cerca viva', block: 11, color: '#2f7a3a', block_walk: true },
  { id: 'cerca', label: 'Cerca', block: 16, color: '#7a5a3a', block_walk: true, oob: false },
  // paredes de dentro de casa (public/limezu/walls.png): 2 quadradinhos de altura (o de cima com o acabamento)
  { id: 'parede_madeira', label: 'Parede de madeira (casa)', wall: { x: 176, y: 0 }, color: '#a0703a', block_walk: true },
  { id: 'parede_creme', label: 'Parede creme (casa)', wall: { x: 0, y: 96 }, color: '#efe6cf', block_walk: true },
  { id: 'parede_tijolo', label: 'Parede de tijolinho (casa)', wall: { x: 0, y: 256 }, color: '#e6d2a8', block_walk: true },
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
/** piso que se repete a cada 3x2 quadradinhos */
function drawTex(ctx, sheet, tex, x, y) {
  const img = sheet[tex.file]
  if (img) ctx.drawImage(img, tex.x + (x % 3) * T, tex.y + (y % 2) * T, T, T, x * T, y * T, T, T)
}

export function loadAutotiles(asphaltAtlas) {
  if (!ready) {
    const extra = Promise.all([loadImage('/limezu/floors.png').catch(() => null), loadImage('/limezu/walls.png').catch(() => null)])
    ready = Promise.all([loadImage(SHEET), extra]).then(([img, [floors, walls]]) => {
      const c = document.createElement('canvas')
      c.width = img.width
      c.height = img.height
      const cx = c.getContext('2d')
      cx.drawImage(img, 0, 0)
      const data = cx.getImageData(0, 0, img.width, img.height)
      return { img, data, tables: new Map(), floors, walls }
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
  // (os quadradinhos vazios do modelo não contam: senão o "fora" vira transparente e nada tem borda)
  for (const [x, y] of tiles) {
    if (mean(sheet.data, x, y, 0, 16, 0, 16)[3] === 0) continue
    for (const k of KEYS) {
      const m = mean(sheet.data, x, y, REG[k][0], REG[k][1], REG[k][2], REG[k][3])
      if (m[3] > 0) samples.push(m)
    }
  }
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
    } else if (base.tex) drawTex(ctx, sheet, base.tex, x, y)
    else drawTile(ctx, sheet, base.block, pick(analyze(sheet, base.block), FULL), dx, dy)
    for (const t of TERRAINS) {
      const layer = map.terrain?.[t.id]
      if (!cellOn(layer, w, x, y)) continue
      if (t.tex) {
        drawTex(ctx, sheet, t.tex, x, y)
        continue
      }
      if (t.wall) {
        // parede: o quadradinho de cima (sem parede acima dele) leva o acabamento; os de baixo, o rodapé
        const img = sheet.walls
        const top = !cellOn(layer, w, x, y - 1)
        if (img) ctx.drawImage(img, t.wall.x + (x % 3) * T, t.wall.y + (top ? 0 : T), T, T, dx, dy, T, T)
        continue
      }
      if (t.tiles) {
        // peça fixa (asfalto, faixa): uma das variações, sempre a mesma para o mesmo quadradinho
        const rect = sheet.asphalt?.rects?.[t.tiles[(x * 7 + y * 13 + ((x * y) % 5)) % t.tiles.length]]
        if (rect) ctx.drawImage(sheet.asphalt.img, rect[0], rect[1], T, T, dx, dy, T, T)
        continue
      }
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

// terra arada da horta (muda durante o jogo, por isso é desenhada à parte, por cima do chão)
// (o bloco "sem fundo" tem o mesmo desenho do bloco "na grama": a borda certa é descoberta no da grama,
// que dá para ler pelos pixels, e desenhada do sem fundo, que encaixa em cima de qualquer chão)
const TILLED = FZ + 9
const TILLED_REF = FZ + 8
/** desenha um quadradinho de terra arada; on(x, y) diz se o vizinho também está arado; molhada = mais escura */
export function drawTilled(ctx, sheet, on, x, y, wet) {
  // como no Stardew, cada quadradinho arado é um quadrado inteiro (só a borda de baixo muda quando não tem vizinho)
  const f = Object.fromEntries(KEYS.map((k) => [k, true]))
  f.s = on(x, y + 1)
  f.sw = f.s
  f.se = f.s
  const i = pick(analyze(sheet, TILLED_REF), reduce(f).join(''))
  if (wet) {
    if (!sheet.wet) {
      // a mesma imagem, mais escura (terra molhada)
      const c = document.createElement('canvas')
      c.width = sheet.img.width
      c.height = sheet.img.height
      const cx = c.getContext('2d')
      cx.drawImage(sheet.img, 0, 0)
      cx.globalCompositeOperation = 'source-atop'
      cx.fillStyle = 'rgba(28, 14, 6, 0.45)'
      cx.fillRect(0, 0, c.width, c.height)
      sheet.wet = { img: c }
    }
    drawTile(ctx, sheet.wet, TILLED, i, x * T, y * T)
  } else drawTile(ctx, sheet, TILLED, i, x * T, y * T)
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
