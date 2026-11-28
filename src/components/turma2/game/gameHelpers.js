// Números e funções de apoio do jogo (velocidades, teclas, caminho até um ponto, imagens).
export const T = 16
export const ACT_ORDER = ['telao', 'pipoca', 'refri', 'portal', 'oficina', 'classes', 'venda', 'bau', 'cama', 'fruta', 'feno', 'correio', 'loja', 'cozinha', 'conserto', 'coragem'] // perto de duas coisas: vale a primeira
export const ghostGone = new Map() // fantasmas enfrentados há pouco ("mapa:id" → quando)
export const SPEED = 4.2 // quadradinhos por segundo, andando
export const RUN = 6.4 // correndo (segurando Shift)
export const DIRV = { right: [1, 0], up: [0, -1], left: [-1, 0], down: [0, 1] }
export const REACH = 1 // até onde a ferramenta alcança (quadradinhos em volta do boneco)
export const TOOL_KEYS = ['Space', 'KeyC'] // usar a ferramenta / item da barra (como o clique no Stardew)
export const DIRS = { right: 0, up: 1, left: 2, down: 3 } // ordem das colunas na folha do boneco
export const KEYS = {
  ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1],
  ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0],
}
export const BASE = '/limezu/t2/'

export const images = new Map()
export const loadImage = (name) => {
  if (!images.has(name)) {
    images.set(
      name,
      new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => {
          images.delete(name) // deixa tentar de novo depois
          reject(new Error(name.startsWith('/') ? name : `${BASE}${name}.png`))
        }
        img.src = name.startsWith('/') ? name : `${BASE}${name}.png`
      }),
    )
  }
  return images.get(name)
}

export const n7pose = (n) => (n.modo === 'senta' ? 'senta' : n.modo === 'celular' ? 'celular' : n.next ? 'anda' : 'parado')

/** balão com o nome (se tiver) e a fala, quebrando as linhas; a ponta fica em (cx, bottom) */
export const free = (room, x, y) => y >= 0 && x >= 0 && y < room.walk.length && x < room.walk[0].length && room.walk[y][x] === '.'
export const dirOf = (dx, dy) => (dx > 0 ? 'right' : dx < 0 ? 'left' : dy < 0 ? 'up' : 'down')

// caminho até o quadradinho clicado (ou até o mais perto dele que dá para chegar)
export function findPath(room, from, to) {
  const w = room.walk[0].length
  const key = (x, y) => y * w + x
  const prev = new Map([[key(from.x, from.y), null]])
  const queue = [from]
  let best = from
  let bestD = Math.abs(from.x - to.x) + Math.abs(from.y - to.y)
  while (queue.length) {
    const cur = queue.shift()
    const d = Math.abs(cur.x - to.x) + Math.abs(cur.y - to.y)
    if (d < bestD) {
      best = cur
      bestD = d
    }
    if (d === 0) break
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cur.x + dx
      const ny = cur.y + dy
      if (!free(room, nx, ny) || prev.has(key(nx, ny))) continue
      prev.set(key(nx, ny), cur)
      queue.push({ x: nx, y: ny })
    }
  }
  const path = []
  for (let p = best; p && (p.x !== from.x || p.y !== from.y); p = prev.get(key(p.x, p.y))) path.unshift(p)
  return path
}
