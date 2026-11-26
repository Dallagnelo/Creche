import { T, animAtlasUrl, atlasUrl, loadImage, loadLibrary } from './assets'
import { ASPHALT, allCells, cellOn, loadAutotiles, paintCells, terrainById } from './autotile'
import { actTypeOf, fruitOf } from './economy'

// Transforma um mapa feito no editor (o que fica salvo no banco) no formato que o jogo desenha.
//
// O mapa salvo (data):
//   { v: 1, w, h,                      tamanho em quadradinhos de 16 px
//     base,                            chão de fundo (grama, areia, terra, pedra, tijolo, asfalto)
//     terrain: { terra: "0101…", … }   camadas pintadas (uma letra por quadradinho)
//     water: [{ x, y, w, h, kind }]    lagos e mar animados (retângulos, em quadradinhos)
//     objects: [{ id, src, t, n, x, y, d, f, l, chao, porta }]   peças (src: pecas | moveis; t: tema; n: nome;
//                                      x, y: canto de cima em px; d: fileiras que bloqueiam; f: espelhado;
//                                      l: luz [raio, cor, dx, dy] (dx, dy: deslocamento a partir do meio da peça);
//                                      chao: fica sempre por baixo de quem passa; porta: só aparece quando alguém chega perto;
//                                      at: atividade ('' = automática pelo nome da peça, 'nada', ou loja | cozinha | correio |
//                                      caixa_correio | conserto; veja ACT_TYPES em economy.js)
//     anims: [{ id, n, x, y, fw, fr, fps, d, w, l }]  animados (w: '' sempre, 'n' só de noite, 'd' só de dia)
//     patrols: [{ id, r, l, x0, x1, y, speed }]       vai e volta (r/l: animado para a direita/esquerda; y: pé)
//     dentro: true = é um lugar fechado (casa): o céu não escurece
//     lights: [{ id, x, y, r, c, giro }]   luzes da noite (giro: farol, um facho girando)
//     traffic: [{ id, src, t, n | a, x, y, speed, fw }]   trânsito: peça (carro) ou animado "a" (barco) que atravessa
//                                      o mapa sem parar; x, y: canto de cima onde começa; speed em px/s (negativo = esquerda)
//     doors: [{ id, x, y, to, sx, sy }]   porta: pisou em (x, y) → vai para o mapa "to", aparece em (sx, sy)
//     block: { "x,y": 1 | 0 }          ajuste manual de onde dá para andar (1 bloqueia, 0 libera)
//     items: [{ id, tipo, src, t, n, x, y, nome, valor, desc }]  para pegar (tipo: moeda | objeto; x, y em quadradinhos)
//     npcs: [{ id, x, y, c, nome, fala, modo, dir, raio, bicho, falaAmigo, gosta, odeia, rotina }]
//                                      personagens (c: visual; modo: parado | passeia | senta | celular; bicho: id em bichos.json;
//                                      falaAmigo: fala com 3+ corações; gosta/odeia: itens; rotina: [[hora, x, y, some?], …])
//     spawn: [x, y], sky }

export function newMap(w = 40, h = 30, base = 'grama') {
  return { v: 1, w, h, base, terrain: {}, water: [], objects: [], anims: [], patrols: [], traffic: [], lights: [], doors: [], npcs: [], items: [], block: {}, spawn: [Math.floor(w / 2), Math.floor(h / 2)], sky: 'dia' }
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
    return { img: await loadImage(atlasUrl('pecas', ASPHALT.theme)), rect, rects: lib.pecas[ASPHALT.theme] }
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
    const top = Math.max(y, y + oh - rows * T) // nunca acima da própria peça
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
    if (r && !o.chao && !o.porta) footprint(o.x, o.y, r[2], r[3], o.d ?? 1)
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
  const doorSprites = []
  const lights = (map.lights ?? []).map((l) => [l.x, l.y, l.r, l.c])
  const lightAt = (x, y, w, h, l) => [x + w / 2 + (l[2] ?? 0), y + h / 2 + (l[3] ?? 0), l[0], l[1]]
  const beacon = (map.lights ?? []).find((l) => l.giro)
  for (const o of map.objects ?? []) {
    const src = o.src ?? 'pecas'
    const r = lib[src]?.[o.t]?.[o.n]
    if (!r) continue
    const key = `${src}/${o.t}`
    atlases[key] = atlasUrl(src, o.t)
    if (o.l) lights.push(lightAt(o.x, o.y, r[2], r[3], o.l))
    if (o.porta) {
      // porta abrindo: só aparece quando alguém está no quadradinho logo abaixo dela
      doorSprites.push({ sx: r[0], sy: r[1], w: r[2], h: r[3], x: o.x, y: o.y, key, near: [Math.floor((o.x + r[2] / 2) / T), Math.floor((o.y + r[3]) / T)] })
      continue
    }
    // árvore frutífera: guarda também o desenho "sem fruta" (para quem já colheu) e o id (o[10])
    const fr = src === 'pecas' ? fruitOf(o.t, o.n) : null
    const alt = fr && lib.pecas[o.t]?.[fr.vazia]
    objects.push([o.x, o.y, r[2], r[3], r[0], r[1], key, o.f ? 1 : 0, o.chao ? 1 : 0, alt ? [alt[0], alt[1]] : null, o.id])
  }
  objects.sort((a, b) => (a[8] ? a[1] : a[1] + a[3]) - (b[8] ? b[1] : b[1] + b[3]))
  // trânsito: carros (peças) viram "movers"; barcos (animados) viram "boats"
  const sprites = {}
  const movers = []
  const boats = []
  for (const c of map.traffic ?? []) {
    if (c.a) {
      const r = lib.anims[c.a]
      if (!r) continue
      const fw = c.fw ?? r[3]
      boats.push([animAtlasUrl(r[0]), c.y + r[4], c.speed ?? 20, fw, r[4], c.fr ?? r[5], c.x, r[1], r[2]])
    } else {
      const src = c.src ?? 'pecas'
      const r = lib[src]?.[c.t]?.[c.n]
      if (!r) continue
      const key = `${src}/${c.t}`
      atlases[key] = atlasUrl(src, c.t)
      sprites[c.id] = [r[0], r[1], r[2], r[3], key]
      movers.push([c.id, c.y + r[3], c.speed ?? 60, c.x])
    }
  }
  const anims = []
  for (const a of map.anims ?? []) {
    const r = lib.anims[a.n]
    if (!r) continue
    const fw = a.fw ?? r[3]
    const frames = a.fr ?? r[5]
    anims.push([a.x, a.y, animAtlasUrl(r[0]), fw, r[4], frames, a.fps ?? 8, a.d ?? 0, a.w ?? '', r[1], r[2], a.id])
    if (a.l) lights.push(lightAt(a.x, a.y, fw, r[4], a.l))
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
  // atividades: peças que servem para algo (loja, cozinhar, correio, conserto) e fantasmas (coragem, à noite)
  const acts = []
  for (const o of map.objects ?? []) {
    const r = lib[o.src ?? 'pecas']?.[o.t]?.[o.n]
    const fruit = (o.src ?? 'pecas') === 'pecas' && o.at !== 'nada' ? fruitOf(o.t, o.n) : null
    const tipo = o.at === 'nada' ? null : o.at || (o.src === 'moveis' ? null : fruit ? 'fruta' : actTypeOf(o.t, o.n))
    if (!r || !tipo) continue
    const y = Math.floor((o.y + r[3] - 1) / T)
    const cells = []
    for (let x = Math.floor((o.x + 3) / T); x <= Math.floor((o.x + r[2] - 4) / T); x += 1) cells.push([x, y])
    acts.push({ id: o.id, tipo, cells, cx: o.x + r[2] / 2, top: o.y, fruta: fruit?.fruta })
  }
  for (const a of map.anims ?? []) {
    const r = lib.anims[a.n]
    const tipo = a.w === 'n' ? 'coragem' : /campfire/.test(a.n) ? 'cozinha' : null
    if (!r || !tipo) continue
    const fw = a.fw ?? r[3]
    acts.push({ id: a.id, tipo, cells: [[Math.floor((a.x + fw / 2) / T), Math.floor((a.y + r[4] - 1) / T)]], cx: a.x + fw / 2, top: a.y, anim: tipo === 'coragem' })
  }
  const walk = walkGrid(map, lib)
  // horta: quadradinhos pintados com o chão "Horta"
  const horta = []
  const hl = map.terrain?.horta
  if (hl) for (let y = 0; y < map.h; y += 1) for (let x = 0; x < map.w; x += 1) if (cellOn(hl, map.w, x, y)) horta.push([x, y])
  // pesca: de onde dá para jogar a linha (quadradinho livre encostado na água)
  const wet = new Set()
  for (const r of map.water ?? []) for (let y = r.y; y < r.y + r.h; y += 1) for (let x = r.x; x < r.x + r.w; x += 1) wet.add(`${x},${y}`)
  const al = map.terrain?.agua
  if (al) for (let y = 0; y < map.h; y += 1) for (let x = 0; x < map.w; x += 1) if (cellOn(al, map.w, x, y)) wet.add(`${x},${y}`)
  const fish = new Set()
  if (wet.size) {
    for (let y = 0; y < map.h; y += 1) {
      for (let x = 0; x < map.w; x += 1) {
        if (walk[y][x] !== '.') continue
        if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => wet.has(`${x + dx},${y + dy}`))) fish.add(`${x},${y}`)
      }
    }
  }
  return {
    code: row.code,
    label: row.name,
    custom: true,
    published: row.published,
    w: map.w * T,
    h: map.h * T,
    walk,
    acts,
    horta,
    fish,
    wet,
    spawn: map.spawn ?? [0, 0],
    objects,
    atlases,
    floorCanvas: canvas,
    sprites,
    movers,
    boats,
    doorSprites,
    beacon: beacon ? [beacon.x, beacon.y] : undefined,
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
    outdoor: !map.dentro, // dentro de casa: sem noite (a luz é a da casa)
    sky: map.sky ?? 'dia',
  }
}
