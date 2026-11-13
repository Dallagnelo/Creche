// Base das salas: tamanho dos quadradinhos, caminhos e posições. Os ambientes ficam em rooms.js.
export const TILE = 16
// faixa extra de parede acima da cena (em px da sala): dá espaço para o topo das portas e as plaquinhas de nome
export const WALL_TOP = 12
export const COLS = 30 // sala da turma
export const ROWS = 14
export const WALL_ROWS = 2
/** Retângulo (em pixels da cena) onde o móvel aparece, para saber em qual móvel a pessoa tocou. */
export function itemRect(item, sprite) {
  if (item.px !== undefined) return { x: item.px, y: item.py, w: sprite?.width ?? 16, h: sprite?.height ?? 16 }
  if (item.sprite) {
    const w = sprite?.width ?? item.w * TILE
    const h = sprite?.height ?? item.h * TILE
    const bottom = (item.y + item.h) * TILE
    return { x: item.x * TILE + Math.round((item.w * TILE - w) / 2), y: bottom - h, w, h }
  }
  return { x: item.x * TILE, y: item.y * TILE, w: item.w * TILE, h: item.h * TILE }
}

const dims = (blocked) => ({ rows: blocked.length, cols: blocked[0]?.length ?? 0 })

/** Colunas da parede ocupadas por um enfeite de parede. */
export function wallSpan(item) {
  // móveis do catálogo guardam a coluna (x); os enfeites fixos da sala da turma só têm a posição em pixels
  if (item.x !== undefined || item.px === undefined) return [item.x ?? 0, (item.x ?? 0) + (item.w ?? 1) - 1]
  return [Math.floor((item.px + 2) / TILE), Math.floor((item.px + (item.w ?? 1) * TILE - 3) / TILE)]
}

/** Quadradinho livre ao lado do móvel, o mais perto de quem vai até ele. */
export function besideItem(blocked, item, from) {
  const { rows, cols } = dims(blocked)
  const cells = []
  if (item.wall) {
    const [x0, x1] = wallSpan(item)
    for (let x = x0; x <= x1; x += 1) cells.push({ x, y: WALL_ROWS })
    for (let x = x0 - 1; x <= x1 + 1; x += 1) cells.push({ x, y: WALL_ROWS + 1 })
  } else {
    for (let y = item.y - 1; y <= item.y + item.h; y += 1) {
      for (let x = item.x - 1; x <= item.x + item.w; x += 1) {
        const inside = x >= item.x && x < item.x + item.w && y >= item.y && y < item.y + item.h
        if (!inside) cells.push({ x, y })
      }
    }
  }
  const free = cells.filter((c) => c.x >= 0 && c.y >= 0 && c.x < cols && c.y < rows && !blocked[c.y][c.x])
  if (!free.length) return nearestFree(blocked, { x: item.x ?? 0, y: WALL_ROWS })
  free.sort((a, b) => (a.x - from.x) ** 2 + (a.y - from.y) ** 2 - ((b.x - from.x) ** 2 + (b.y - from.y) ** 2))
  return free[0]
}

/** Quadradinhos bloqueados (parede + móveis sólidos). */
export function buildBlocked(furniture = [], cols = COLS, rows = ROWS) {
  const blocked = Array.from({ length: rows }, (_, y) => Array.from({ length: cols }, () => y < WALL_ROWS))
  furniture.forEach((item) => {
    if (!item.solid || item.wall) return
    for (let j = 0; j < item.h; j += 1) for (let i = 0; i < item.w; i += 1) {
      if (blocked[item.y + j]?.[item.x + i] !== undefined) blocked[item.y + j][item.x + i] = true
    }
  })
  return blocked
}

/** Menor caminho (4 direções) entre dois quadradinhos; devolve a lista de passos sem o ponto de partida. */
export function findPath(blocked, from, to) {
  const { rows, cols } = dims(blocked)
  const key = (x, y) => y * cols + x
  const goal = nearestFree(blocked, to)
  if (!goal) return []
  const start = { x: from.x, y: from.y }
  if (start.x === goal.x && start.y === goal.y) return []
  const prev = new Map([[key(start.x, start.y), null]])
  const queue = [start]
  for (let head = 0; head < queue.length; head += 1) {
    const cur = queue[head]
    if (cur.x === goal.x && cur.y === goal.y) break
    ;[[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
      const nx = cur.x + dx
      const ny = cur.y + dy
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || blocked[ny][nx] || prev.has(key(nx, ny))) return
      prev.set(key(nx, ny), cur)
      queue.push({ x: nx, y: ny })
    })
  }
  if (!prev.has(key(goal.x, goal.y))) return []
  const path = []
  for (let cur = goal; cur && !(cur.x === start.x && cur.y === start.y); cur = prev.get(key(cur.x, cur.y))) path.unshift(cur)
  return path
}

/** Se o quadradinho clicado está bloqueado, usa o livre mais perto. */
export function nearestFree(blocked, to) {
  const { rows, cols } = dims(blocked)
  const x = Math.max(0, Math.min(cols - 1, to.x))
  const y = Math.max(0, Math.min(rows - 1, to.y))
  if (!blocked[y][x]) return { x, y }
  let best = null
  let bestDist = Infinity
  for (let j = 0; j < rows; j += 1) for (let i = 0; i < cols; i += 1) {
    if (blocked[j][i]) continue
    const dist = (i - x) ** 2 + (j - y) ** 2
    if (dist < bestDist) { bestDist = dist; best = { x: i, y: j } }
  }
  return best
}

/** Ponto de entrada na sala, espalhado para não nascer todo mundo no mesmo lugar. */
export function spawnPoint(blocked, userId) {
  const { rows, cols } = dims(blocked)
  const seed = [...String(userId)].reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
  const free = []
  for (let y = WALL_ROWS; y < rows; y += 1) for (let x = 0; x < cols; x += 1) if (!blocked[y][x]) free.push({ x, y })
  return free[seed % free.length] ?? { x: 0, y: WALL_ROWS }
}
