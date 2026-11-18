import { iconUrl, spriteUrl } from '../services/pokeapi'

/*
 * Pokémon que segue o boneco na Turma. Usa os ícones pequenos de pixel art da PokéAPI (40×30, do #1 ao #809),
 * que já têm o tamanho certo para a sala; os mais novos usam o sprite normal reduzido pela metade.
 * A imagem é recortada no desenho (sem as bordas vazias) para os pés ficarem no chão.
 */
const cache = new Map() // número -> { canvas, w, h } | 'loading' | 'failed'

function trimmed(img, scale) {
  const c = document.createElement('canvas')
  c.width = img.naturalWidth
  c.height = img.naturalHeight
  const ctx = c.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(img, 0, 0)
  let box = { x0: 0, y0: 0, x1: c.width, y1: c.height }
  try {
    const { data } = ctx.getImageData(0, 0, c.width, c.height)
    let x0 = c.width
    let y0 = c.height
    let x1 = -1
    let y1 = -1
    for (let y = 0; y < c.height; y += 1) {
      for (let x = 0; x < c.width; x += 1) {
        if (data[(y * c.width + x) * 4 + 3] > 20) {
          if (x < x0) x0 = x
          if (x > x1) x1 = x
          if (y < y0) y0 = y
          if (y > y1) y1 = y
        }
      }
    }
    if (x1 >= x0) box = { x0, y0, x1: x1 + 1, y1: y1 + 1 }
  } catch {
    // imagem sem permissão de leitura (CORS): usa inteira
  }
  const w = Math.max(1, Math.round((box.x1 - box.x0) * scale))
  const h = Math.max(1, Math.round((box.y1 - box.y0) * scale))
  const out = document.createElement('canvas')
  out.width = w
  out.height = h
  const octx = out.getContext('2d')
  octx.imageSmoothingEnabled = false
  octx.drawImage(c, box.x0, box.y0, box.x1 - box.x0, box.y1 - box.y0, 0, 0, w, h)
  return { canvas: out, w, h }
}

/** Devolve o desenho pronto do Pokémon, ou null enquanto carrega (começa a baixar na primeira chamada). */
export function petImage(id) {
  if (!Number.isInteger(id) || id < 1 || id > 1025) return null
  const hit = cache.get(id)
  if (hit && typeof hit === 'object') return hit
  if (hit) return null
  cache.set(id, 'loading')
  const icon = iconUrl(id)
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => cache.set(id, trimmed(img, icon ? 1 : 0.5))
  img.onerror = () => cache.set(id, 'failed')
  img.src = icon ?? spriteUrl(id)
  return null
}

const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }

/** Move o bichinho atrás da pessoa (andando) ou ao lado dela (parada, sentada ou dormindo). */
export function followStep(p, dt) {
  if (!Number.isFinite(p.petX) || !Number.isFinite(p.petY) || Math.hypot(p.petX - p.x, p.petY - p.y) > 6) {
    p.petX = p.x + 0.9
    p.petY = p.y
  }
  let tx
  let ty
  if (p.pose) {
    tx = (p.standX ?? p.x) + 0.9
    ty = p.standY ?? p.y
  } else if (p.path.length) {
    const [dx, dy] = DIRS[p.dir] ?? [0, 1]
    tx = p.x - dx * 0.95
    ty = p.y - dy * 0.95
  } else {
    // parada: chega para o lado dela (do lado em que já estava), para não ficar escondido atrás do nome
    tx = p.x + (p.petX >= p.x ? 0.9 : -0.9)
    ty = p.y
  }
  // aproxima rápido quando está longe e com velocidade mínima no fim, para chegar de vez
  const dist = Math.hypot(tx - p.petX, ty - p.petY)
  const step = dist < 0.01 ? dist : Math.min(dist, Math.max(dist * dt * 5, 1.5 * dt))
  const vx = dist ? ((tx - p.petX) / dist) * step : 0
  const vy = dist ? ((ty - p.petY) / dist) * step : 0
  p.petX += vx
  p.petY += vy
  p.petMoving = Math.hypot(vx, vy) > dt * 0.4
  if (vx > dt * 0.3) p.petFlip = true
  else if (vx < -dt * 0.3) p.petFlip = false
}
