import { T, animAtlasUrl, atlasUrl, loadImage, loadLibrary } from './assets'
import { ASPHALT, allCells, cellOn, loadAutotiles, paintCells, terrainById } from './autotile'

// Transforma um mapa feito no editor (o que fica salvo no banco) no formato que o jogo desenha.
//
// O mapa salvo (data):
//   { v: 1, w, h,                      tamanho em quadradinhos de 16 px
//     base,                            chão de fundo (grama, areia, terra, pedra, tijolo, asfalto)
//     terrain: { terra: "0101…", … }   camadas pintadas (uma letra por quadradinho)
//     water: [{ x, y, w, h, kind }]    lagos e mar animados (retângulos, em quadradinhos)
//     objects: [{ id, src, t, n, x, y, d, f, l }]   peças (src: pecas | moveis; t: tema; n: nome;
//                                      x, y: canto de cima em px; d: fileiras que bloqueiam; f: espelhado; l: luz [raio, cor])
//     anims: [{ id, n, x, y, fw, fr, fps, d, w, l }]  animados (w: '' sempre, 'n' só de noite, 'd' só de dia)
//     patrols: [{ id, r, l, x0, x1, y, speed }]       vai e volta (r/l: animado para a direita/esquerda; y: pé)
//     lights: [{ id, x, y, r, c }]     luzes da noite
//     doors: [{ id, x, y, to, sx, sy }]   porta: pisou em (x, y) → vai para o mapa "to", aparece em (sx, sy)
//     block: { "x,y": 1 | 0 }          ajuste manual de onde dá para andar (1 bloqueia, 0 libera)
//     items: [{ id, tipo, src, t, n, x, y, nome, valor, desc }]  para pegar (tipo: moeda | objeto; x, y em quadradinhos)
//     npcs: [{ id, x, y, c, nome, fala, modo, dir, raio }]  personagens (c: visual; modo: parado | passeia | senta | celular)
//     spawn: [x, y], sky }

export function newMap(w = 40, h = 30, base = 'grama') {
  return { v: 1, w, h, base, terrain: {}, water: [], objects: [], anims: [], patrols: [], lights: [], doors: [], npcs: [], items: [], block: {}, spawn: [Math.floor(w / 2), Math.floor(h / 2)], sky: 'dia' }
}

/** mapa salvo por uma versão mais velha do editor: completa o que faltar */
export const normalizeMap = (m) => ({ ...newMap(m.w, m.h, m.base), ...m })

const SEA = '/limezu/me/terrenos/sea_water_tileset_basic.png'
const LAKE = '/limezu/me/terrenos/water_tileset.png'

/** água animada: 8 quadros, um embaixo do outro, num canvas */
export async function waterFrames(rect) {
  const sea = rect.kind === 'mar'
  const sheet = await loadImage(sea ? SEA : LAKE)
  const W = rect.w * T
  const H = rect.h * T
  const c = document.createElement('canvas')
  c.width = W
  c.height = H * 8
  const ctx = c.getContext('2d')
  for (let f = 0; f < 8; f += 1) {
    for (let r = 0; r < rect.h; r += 1) {
      for (let col = 0; col < rect.w; col += 1) {
        let tr, tc
        if (sea) {
          // mar: só a beira de cima tem areia; o resto é água (alternando para não ficar repetido)
          tr = r === 0 ? 0 : 1 + (r % 2)
          tc = 1 + (col % 2)
          ctx.drawImage(sheet, f * 64 + tc * T, tr * T, T, T, col * T, f * H + r * T, T, T)
        } else {
          tr = r === 0 ? 0 : r === rect.h - 1 ? 2 : 1
          tc = col === 0 ? 0 : col === rect.w - 1 ? 2 : 1
          ctx.drawImage(sheet, f * 48 + tc * T, tr * T, T, T, col * T, f * H + r * T, T, T)
        }
      }
    }
  }
  return c
}

export async function floorCanvas(map, lib) {
  const asphalt = (async () => {
    const rect = lib.pecas[ASPHALT.theme]?.[ASPHALT.name]
    if (!rect) return null
    return { img: await loadImage(atlasUrl('pecas', ASPHALT.theme)), rect }
  })()
  const sheet = await loadAutotiles(asphalt)
  const c = document.createElement('canvas')
  c.width = map.w * T
  c.height = map.h * T
  paintCells(c.getContext('2d'), sheet, map, allCells(map))
  return { canvas: c, sheet }
}

/** onde dá para andar: terreno, água, pé dos objetos e os ajustes manuais */
export function walkGrid(map, lib) {
  const { w, h } = map
  const grid = Array.from({ length: h }, () => Array(w).fill('.'))
  for (const t of Object.values(terrainById)) {
    if (!t.block_walk) continue
    const layer = map.terrain?.[t.id]
    if (!layer) continue
    for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) if (cellOn(layer, w, x, y)) grid[y][x] = '#'
  }
  for (const r of map.water ?? []) for (let y = r.y; y < r.y + r.h; y += 1) for (let x = r.x; x < r.x + r.w; x += 1) if (grid[y]?.[x]) grid[y][x] = '#'
  const footprint = (x, y, ow, oh, rows) => {
    if (!rows) return
    const top = y + oh - rows * T
    for (let ty = Math.floor(top / T); ty <= Math.floor((y + oh - 1) / T); ty += 1) {
      for (let tx = Math.floor((x + 3) / T); tx <= Math.floor((x + ow - 4) / T); tx += 1) {
        // só bloqueia se o objeto cobre um bom pedaço do quadradinho
        const cover = Math.min(x + ow, (tx + 1) * T) - Math.max(x, tx * T)
        const coverY = Math.min(y + oh, (ty + 1) * T) - Math.max(top, ty * T)
        if (cover >= 6 && coverY >= 6 && grid[ty]?.[tx]) grid[ty][tx] = '#'
      }
    }
  }
  for (const o of map.objects ?? []) {
    const r = lib[o.src ?? 'pecas']?.[o.t]?.[o.n]
    if (r) footprint(o.x, o.y, r[2], r[3], o.d ?? 1)
  }
  for (const a of map.anims ?? []) {
    const r = lib.anims[a.n]
    if (r) footprint(a.x, a.y, a.fw ?? r[3], r[4], a.d ?? 0)
  }
  for (const [k, v] of Object.entries(map.block ?? {})) {
    const [x, y] = k.split(',').map(Number)
    if (grid[y]?.[x]) grid[y][x] = v ? '#' : '.'
  }
  for (const d of map.doors ?? []) if (grid[d.y]?.[d.x]) grid[d.y][d.x] = '.'
  return grid.map((r) => r.join(''))
}

/** o mapa salvo → a sala que o jogo desenha (com o chão já pronto num canvas) */
export async function compileMap(row) {
  const lib = await loadLibrary()
  const map = row.data
  const { canvas } = await floorCanvas(map, lib)
  const atlases = {}
  const objects = []
  const lights = (map.lights ?? []).map((l) => [l.x, l.y, l.r, l.c])
  for (const o of map.objects ?? []) {
    const src = o.src ?? 'pecas'
    const r = lib[src]?.[o.t]?.[o.n]
    if (!r) continue
    const key = `${src}/${o.t}`
    atlases[key] = atlasUrl(src, o.t)
    objects.push([o.x, o.y, r[2], r[3], r[0], r[1], key, o.f ? 1 : 0])
    if (o.l) lights.push([o.x + r[2] / 2, o.y + r[3] / 2, o.l[0], o.l[1]])
  }
  objects.sort((a, b) => a[1] + a[3] - (b[1] + b[3]))
  const anims = []
  for (const a of map.anims ?? []) {
    const r = lib.anims[a.n]
    if (!r) continue
    const fw = a.fw ?? r[3]
    const frames = a.fr ?? r[5]
    anims.push([a.x, a.y, animAtlasUrl(r[0]), fw, r[4], frames, a.fps ?? 8, a.d ?? 0, a.w ?? '', r[1], r[2]])
    if (a.l) lights.push([a.x + fw / 2, a.y + r[4] / 2, a.l[0], a.l[1]])
  }
  const patrols = []
  for (const p of map.patrols ?? []) {
    const R = lib.anims[p.r]
    const L = lib.anims[p.l] ?? R
    if (!R) continue
    patrols.push([animAtlasUrl(R[0]), animAtlasUrl(L[0]), R[3], R[4], R[5], p.x0, p.x1, p.y, p.speed ?? 14, R[1], R[2], L[1], L[2]])
  }
  const water = await Promise.all(
    (map.water ?? []).map(async (r) => ({ x: r.x * T, y: r.y * T, w: r.w * T, h: r.h * T, frames: 8, fps: r.kind === 'mar' ? 6 : 5, img: await waterFrames(r) })),
  )
  return {
    code: row.code,
    label: row.name,
    custom: true,
    published: row.published,
    w: map.w * T,
    h: map.h * T,
    walk: walkGrid(map, lib),
    spawn: map.spawn ?? [0, 0],
    objects,
    atlases,
    floorCanvas: canvas,
    sprites: {},
    anims,
    patrols,
    water,
    lights,
    npcs: (map.npcs ?? []).map((n) => ({ ...n })),
    items: (map.items ?? []).flatMap((it) => {
      if (it.tipo === 'moeda') return [{ ...it }]
      const src = it.src ?? 'pecas'
      const r = lib[src]?.[it.t]?.[it.n]
      if (!r) return []
      const key = `${src}/${it.t}`
      atlases[key] = atlasUrl(src, it.t)
      return [{ ...it, src, key, rect: r }]
    }),
    doors: (map.doors ?? []).map((d) => ({ x: d.x, y: d.y, to: d.to, spawn: [d.sx ?? 0, d.sy ?? 0] })),
    outdoor: true,
    sky: map.sky ?? 'dia',
  }
}
