import { loadImage, loadJson } from './assets'

// Personagens da Turma 2.0, montados com as peças do gerador do Modern Interiors
// (scripts/turma2-personagens.py junta tudo em public/limezu/editor/pers_*.png).
//
// Um personagem é guardado assim:
//   { corpo: 'body_03', olhos: 'eyes_02', roupa: 'outfit_05_02', cabelo: 'hairstyle_10_03', acessorio: null }
//   ou, pronto do pacote: { pronto: 'premade_character_07' }
//
// A imagem montada tem 4 fileiras de 32 px (quadros de 16 px):
//   0 parado e 1 andando: 24 quadros (direita, costas, esquerda, frente; 6 cada)
//   2 sentado: 12 quadros (direita 6, esquerda 6)
//   3 celular: 12 quadros de frente (o 4 ao 9 repetem)

export const CHAR_URL = '/limezu/editor/personagens.json'
export const LAYERS = ['corpo', 'olhos', 'roupa', 'cabelo', 'acessorio'] // ordem em que são empilhadas
export const DIR_COL = { right: 0, up: 1, left: 2, down: 3 }
export const DEFAULT_CHAR = { corpo: 'body_03', olhos: 'eyes_02', roupa: 'outfit_05_02', cabelo: 'hairstyle_10_03', acessorio: null }

export const loadCharLib = () => loadJson(CHAR_URL)

/** onde está a peça dentro da imagem da categoria */
export function partRect(lib, cat, name) {
  const c = lib.cats[cat]
  const i = c?.parts.indexOf(name) ?? -1
  if (i < 0) return null
  return { url: c.file, x: (i % lib.cols) * lib.w, y: Math.floor(i / lib.cols) * lib.h }
}

/** separa "hairstyle_10_03" em estilo "hairstyle_10" e cor "03" (e agrupa as variações) */
export const styleOf = (name) => name.replace(/_\d+$/, '')
export function groups(lib, cat) {
  const out = new Map()
  for (const n of lib.cats[cat].parts) {
    const s = styleOf(n)
    if (!out.has(s)) out.set(s, [])
    out.get(s).push(n)
  }
  return out
}

export function normalizeChar(c, lib) {
  if (!c || typeof c !== 'object') return null
  if (c.pronto) return lib && !lib.cats.pronto.parts.includes(c.pronto) ? null : { pronto: c.pronto }
  const out = {}
  for (const k of LAYERS) {
    const v = c[k] ?? null
    out[k] = v && (!lib || lib.cats[k].parts.includes(v)) ? v : null
  }
  if (!out.corpo) out.corpo = DEFAULT_CHAR.corpo
  if (!out.olhos) out.olhos = DEFAULT_CHAR.olhos
  if (c.classe) {
    // classe escolhida (veja lib/turma2/classes.js) e a evolução (a ou b)
    out.classe = String(c.classe)
    out.evo = c.evo === 'a' || c.evo === 'b' ? c.evo : null
  }
  return out
}

export function randomChar(lib) {
  const pick = (cat) => {
    const list = lib.cats[cat].parts
    return list[Math.floor(Math.random() * list.length)]
  }
  return { corpo: pick('corpo'), olhos: pick('olhos'), roupa: pick('roupa'), cabelo: Math.random() < 0.92 ? pick('cabelo') : null, acessorio: Math.random() < 0.35 ? pick('acessorio') : null }
}

const cache = new Map()
/** monta o personagem numa imagem só (guardada: o mesmo visual não é montado duas vezes) */
export function composeChar(char) {
  const c = char ?? DEFAULT_CHAR
  const key = JSON.stringify(c)
  if (!cache.has(key)) {
    cache.set(
      key,
      loadCharLib().then(async (lib) => {
        const layers = c.pronto ? [['pronto', c.pronto]] : LAYERS.map((k) => [k, c[k]]).filter(([, v]) => v)
        const rects = layers.map(([cat, n]) => partRect(lib, cat, n)).filter(Boolean)
        const imgs = await Promise.all(rects.map((r) => loadImage(r.url)))
        const canvas = document.createElement('canvas')
        canvas.width = lib.w
        canvas.height = lib.h
        const ctx = canvas.getContext('2d')
        rects.forEach((r, i) => ctx.drawImage(imgs[i], r.x, r.y, lib.w, lib.h, 0, 0, lib.w, lib.h))
        return canvas
      }),
    )
    cache.get(key).catch(() => cache.delete(key))
    // guarda só os últimos (cada visual montado ocupa ~200 KB de memória)
    if (cache.size > 48) cache.delete(cache.keys().next().value)
  }
  return cache.get(key)
}

/** desenha um quadro do personagem (pose: parado, anda, senta, celular) com o pé em (x, y+32) */
export function drawChar(ctx, img, pose, dir, t, x, y) {
  let col
  let row
  if (pose === 'senta') {
    row = 2
    col = (dir === 'left' ? 6 : 0) + (Math.floor(t * 4) % 6)
  } else if (pose === 'celular') {
    row = 3
    const f = Math.floor(t * 6)
    col = f < 4 ? f : 4 + ((f - 4) % 6)
  } else {
    row = pose === 'anda' ? 1 : 0
    col = DIR_COL[dir] * 6 + (Math.floor(t * (pose === 'anda' ? 10 : 6)) % 6)
  }
  ctx.drawImage(img, col * 16, row * 32, 16, 32, Math.round(x), Math.round(y), 16, 32)
}

// Retratos (Modern User Interface): o rosto do personagem, 32x32, 10 quadros por fileira
// (0 falando, 1 concordando, 2 negando). Personagem pronto do pacote não tem retrato.
export const PORTRAIT_URL = '/limezu/editor/retratos.json'
const PORTRAIT_LAYERS = ['corpo', 'olhos', 'cabelo', 'acessorio']
const portraits = new Map()
export function composePortrait(char) {
  const c = char ?? DEFAULT_CHAR
  if (c.pronto) return Promise.resolve(null)
  const key = JSON.stringify(c)
  if (!portraits.has(key)) {
    portraits.set(
      key,
      loadJson(PORTRAIT_URL).then(async (lib) => {
        const rects = PORTRAIT_LAYERS.map((k) => c[k] && partRect(lib, k, c[k])).filter(Boolean) // acessório sem retrato: fica de fora
        const imgs = await Promise.all(rects.map((r) => loadImage(r.url)))
        const canvas = document.createElement('canvas')
        canvas.width = lib.w
        canvas.height = lib.h
        const ctx = canvas.getContext('2d')
        rects.forEach((r, i) => ctx.drawImage(imgs[i], r.x, r.y, lib.w, lib.h, 0, 0, lib.w, lib.h))
        return canvas
      }),
    )
    portraits.get(key).catch(() => portraits.delete(key))
    if (portraits.size > 48) portraits.delete(portraits.keys().next().value)
  }
  return portraits.get(key)
}

/** um quadro do retrato: talking = mexendo a boca; senão, parado no primeiro quadro */
export function drawPortrait(ctx, img, x, y, t, talking = true, row = 0, size = 32) {
  const f = talking ? Math.floor(t * 10) % 10 : 0
  ctx.drawImage(img, f * 32, row * 32, 32, 32, Math.round(x), Math.round(y), size, size)
}
