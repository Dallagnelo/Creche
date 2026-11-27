import { loadImage, loadJson } from './assets'

// Animações das ferramentas no boneco (Modern Farm). scripts/turma2-ferramentas.py separa da folha
// do pacote só a ferramenta e o braço; aqui eles vão por cima do boneco montado (roupa e cabelo
// continuam os do jogador). Quadros de 48x64 com o boneco 16x32 em (16, 32).
//   segurando na barra: anda_<ferramenta> (parado usa o 1º quadro)
//   usando: <ferramenta> uma vez (vara: lança, fica esperando e recolhe no fim da pesca)

const URL = '/limezu/editor/ferramentas.json'
const DIRS = { right: 0, up: 1, left: 2, down: 3 }

/** ferramenta da barra → animação de segurar e de usar (fps: quadros por segundo) */
export const TOOL_ANIMS = {
  enxada: { anda: 'anda_enxada', usa: 'enxada', fps: 16 },
  regador: { anda: 'anda_regador', usa: 'regador', fps: 14 },
  machado: { anda: 'anda_machado', usa: 'machado', fps: 16 },
  vara: { anda: 'anda_vara', usa: 'vara', fps: 12 },
  colher: { usa: 'colher', fps: 16 },
}
// pesca: lança (0 a 6), linha na água (7 a 20, repete) e recolhe (21 a 31)
export const FISH = { lanca: 7, espera: [7, 21], recolhe: [21, 32] }

let meta = null
let tools = null
let armBase = null
export function loadToolAnims() {
  return Promise.all([loadJson(URL), loadImage('/limezu/editor/ferramentas.png'), loadImage('/limezu/editor/ferramentas_braco.png')]).then(([m, t, a]) => {
    meta = m
    tools = t
    armBase = a
    return m
  })
}

/** quanto dura usar a ferramenta (segundos), ou 0 se ela não tem animação */
export function useTime(id) {
  const a = TOOL_ANIMS[id]
  if (!a?.usa) return 0
  const n = meta?.anims[a.usa]?.n ?? 9
  return (id === 'vara' ? FISH.lanca : n) / a.fps
}

const hex = (r, g, b) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')
const arms = new Map()
/** braço na cor da pele do boneco: troca as cores do corpo do pacote pelas do corpo escolhido */
function armFor(skin) {
  if (!armBase) return null
  if (!skin) return armBase
  if (!arms.has(skin.key)) {
    const c = document.createElement('canvas')
    c.width = armBase.width
    c.height = armBase.height
    const g = c.getContext('2d')
    g.drawImage(armBase, 0, 0)
    const data = g.getImageData(0, 0, c.width, c.height)
    const map = new Map(meta.pele.map((from, i) => [from, skin.cores[i] ?? from]))
    const px = data.data
    for (let i = 0; i < px.length; i += 4) {
      if (!px[i + 3]) continue
      const to = map.get(hex(px[i], px[i + 1], px[i + 2]))
      if (!to) continue
      px[i] = parseInt(to.slice(1, 3), 16)
      px[i + 1] = parseInt(to.slice(3, 5), 16)
      px[i + 2] = parseInt(to.slice(5, 7), 16)
    }
    g.putImageData(data, 0, 0)
    arms.set(skin.key, c)
  }
  return arms.get(skin.key)
}

/** cores da pele do boneco (as da peça de corpo, da mais usada para a menos usada, sem contorno) */
const skins = new Map()
export function skinOf(char) {
  const key = char?.corpo
  if (!key || char.pronto || !meta) return null
  if (!skins.has(key)) {
    // lê a peça de corpo direto da imagem das peças (o boneco montado já vem com roupa)
    skins.set(key, null)
    loadJson('/limezu/editor/personagens.json')
      .then(async (lib) => {
        const c = lib.cats.corpo
        const i = c.parts.indexOf(key)
        if (i < 0) return
        const src = await loadImage(c.file)
        const cv = document.createElement('canvas')
        cv.width = lib.w
        cv.height = 64
        const g = cv.getContext('2d')
        g.drawImage(src, (i % lib.cols) * lib.w, Math.floor(i / lib.cols) * lib.h, lib.w, 64, 0, 0, lib.w, 64)
        const px = g.getImageData(0, 0, lib.w, 64).data
        const count = new Map()
        for (let p = 0; p < px.length; p += 4) {
          if (!px[p + 3]) continue
          const h = hex(px[p], px[p + 1], px[p + 2])
          count.set(h, (count.get(h) ?? 0) + 1)
        }
        const cores = [...count.entries()].sort((a, b) => b[1] - a[1]).map(([h]) => h).filter((h) => !meta.contorno.includes(h))
        skins.set(key, { key, cores })
      })
      .catch(() => {})
  }
  return skins.get(key)
}

const cellOf = (name, k) => {
  const a = meta.anims[name]
  const i = a.start + k
  return { sx: (i % meta.cols) * meta.cw, sy: Math.floor(i / meta.cols) * meta.ch, off: a.off[k] }
}

/**
 * desenha o boneco (16x32, canto em x, y) com a ferramenta.
 * s: { dir, walking, frame (0 a 5), held (ferramenta na mão), use: { id, t (segundos), from? } , skin }
 * devolve false se não tem animação para isso (aí quem chama desenha do jeito normal)
 */
export function drawWithTool(ctx, hero, s, x, y) {
  if (!meta || !tools) return false
  const d = DIRS[s.dir] ?? 3
  const arm = armFor(s.skin)
  const overlay = (name, k, bx, by) => {
    const c = cellOf(name, k)
    if (arm) ctx.drawImage(arm, c.sx, c.sy, meta.cw, meta.ch, bx - meta.bx, by - meta.by, meta.cw, meta.ch)
    ctx.drawImage(tools, c.sx, c.sy, meta.cw, meta.ch, bx - meta.bx, by - meta.by, meta.cw, meta.ch)
    return c
  }
  const use = s.use && TOOL_ANIMS[s.use.id]?.usa ? s.use : null
  if (use) {
    const a = TOOL_ANIMS[use.id]
    const n = meta.anims[a.usa].n
    let f = Math.floor(use.t * a.fps)
    if (use.id === 'vara') {
      const [w0, w1] = FISH.espera
      const [r0, r1] = FISH.recolhe
      if (use.recolhe) f = Math.min(r1 - 1, r0 + f)
      else if (f >= w0) f = w0 + ((f - w0) % (w1 - w0))
    } else f = Math.min(n - 1, f)
    const { off } = cellOf(a.usa, d * n + f)
    const [dx, dy] = off
    // parado, abaixando quando agacha (o pé não passa do chão)
    ctx.drawImage(hero, d * 6 * 16 + (s.frame % 6) * 16, 0, 16, 32 - dy, Math.round(x + dx), Math.round(y + dy), 16, 32 - dy)
    overlay(a.usa, d * n + f, Math.round(x), Math.round(y))
    return true
  }
  const held = TOOL_ANIMS[s.held]?.anda
  if (!held) return false
  ctx.drawImage(hero, (d * 6 + (s.frame % 6)) * 16, s.walking ? 32 : 0, 16, 32, Math.round(x), Math.round(y), 16, 32)
  overlay(held, d * 6 + (s.walking ? s.frame % 6 : 0), Math.round(x), Math.round(y))
  return true
}
