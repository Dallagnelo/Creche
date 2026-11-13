// Os ambientes da página Turma: a sala da turma, o corredor dos quartos e o quarto de cada pessoa.
// Cada ambiente vira uma "cena": tamanho, parede, chão e a lista de móveis já posicionados.
import { buildItem, catalogEntry, FLOORS, WALLS } from './roomCatalog'
import { COLS, ROWS, TILE, WALL_ROWS, wallSpan } from './room'

export const ROOM_COLS = 24 // mesma proporção da sala da turma, para ocupar a largura toda
export const ROOM_ROWS = 11
export const MAX_ITEMS = 80
export const MAX_PETS = 6
const EXIT_X = 1 // a porta do quarto (volta para o corredor) fica sempre aqui

export const roomOwner = (key) => (key?.startsWith('quarto:') ? key.slice(7) : null)
const wallOf = (id) => WALLS.find((w) => w.id === id) ?? WALLS[0]
const floorOf = (id) => FLOORS.find((f) => f.id === id) ?? FLOORS[0]

const door = (id, x, target, label, plate, extra = {}) => ({
  ...buildItem('door', x, 0, id),
  act: 'door', door: target, label, plate, fixed: true, ...extra,
})

// Sala da turma: cada canto tem um centro e os móveis se alinham a ele.
// Lareira (x=64) · lounge da TV (x=208) · palco e jogos (x=336) · café (x=424).
// Cada linha: [chave do catálogo, x, y, id, extras]
const HALL = [
  // ---- parede
  ['clock', 0, 0, 'clock-hall', { py: 6 }],
  ['frame:0', 1, 0, 'frame-1'],
  ['calendar', 5, 0, 'calendar'],
  ['window', 7, 0, 'window-1'],
  ['poster:2', 9, 0, 'poster-movie'],
  ['sign', 11, 0, 'sign'],
  ['poster:0', 16, 0, 'poster-game'],
  ['window', 18, 0, 'window-2'],
  ['neon:1', 20, 0, 'neon-gg'],
  ['door', 24, 0, 'door-rooms', { act: 'door', door: 'corredor', label: 'Ir para os quartos', plate: 'Quartos' }],
  ['board', 26, 0, 'board', { py: 2 }],
  ['clock', 28, 0, 'clock-cafe', { py: 4 }],
  ['frame:1', 29, 0, 'frame-2'],
  // ---- chão (tapetes e palco)
  ['rug:a066d0:4:3', 2, 4, 'rug-fire'],
  ['rug:38a85a:4:3', 11, 3, 'rug-tv'],
  ['stage', 19, 2, 'stage'],
  ['rug:e8915a:3:6', 25, 5, 'rug-cafe'],
  ['rug:3a6db4:6:3', 10, 10, 'dance'],
  // ---- cantinho da lareira
  ['bookshelf', 0, 2, 'bookshelf'],
  ['fireplace', 3, 2, 'fireplace'],
  ['bookshelflow', 6, 2, 'bookshelf-low'],
  ['beanbag:a066d0', 2, 5, 'beanbag-1'],
  ['beanbag:e86aa0', 5, 5, 'beanbag-2'],
  ['plant:1', 0, 8, 'plant-1'],
  ['aquarium', 1, 12, 'aquarium'],
  ['plant:3', 0, 13, 'plant-2'],
  // ---- lounge da TV
  ['lamp', 10, 2, 'lamp-1'],
  ['tv', 11, 2, 'tv', { w: 4 }],
  ['lamp', 15, 2, 'lamp-2'],
  ['coffee', 12, 4, 'coffee'],
  ['armchair:e8915a', 10, 5, 'armchair-1'],
  ['armchair:38a85a', 15, 5, 'armchair-2'],
  ['sofa:3a6db4', 11, 7, 'sofa'],
  ['plant:0', 10, 7, 'plant-3'],
  ['plant:0', 15, 7, 'plant-4'],
  // ---- palco e jogos
  ['speaker', 19, 2, 'speaker-1'],
  ['drums', 20, 2, 'drums'],
  ['speaker', 22, 2, 'speaker-2'],
  ['guitar', 20, 3, 'guitar'],
  ['mic', 21, 3, 'mic'],
  ['jukebox', 23, 2, 'jukebox'],
  ['arcade', 17, 6, 'arcade-1'],
  ['arcade', 18, 6, 'arcade-2'],
  ['beanbag:3a6db4', 19, 6, 'beanbag-3'],
  ['pooltable', 18, 9, 'pool'],
  // ---- café
  ['fridge', 25, 2, 'fridge'],
  ['kitchenette', 26, 2, 'kitchen'],
  ['microwave', 28, 2, 'microwave'],
  ['plant:2', 29, 2, 'plant-5'],
  ['chair:l', 25, 6, 'chair-1'],
  ['table', 26, 6, 'table-1'],
  ['chair:r', 27, 6, 'chair-2'],
  ['chair:l', 25, 9, 'chair-3'],
  ['table', 26, 9, 'table-2'],
  ['chair:r', 27, 9, 'chair-4'],
  ['ballot', 29, 7, 'ballot'],
  ['plant:1', 29, 12, 'plant-6'],
  ['plant:0', 22, 13, 'plant-7'],
  // o gato da sala, que passeia pela sala toda
  ['pet:gato:e8915a', 8, 9, 'pet-pixel', { range: 14, name: 'Pixel' }],
]

/** A sala da turma: o ponto de encontro de todo mundo. */
export function hallScene() {
  const furniture = HALL.map(([key, x, y, id, extra = {}]) => {
    const { w, py, range, ...rest } = extra
    const item = buildItem(key, x, y, id, { ...(w ? { w } : {}), ...(py !== undefined ? { py } : {}), ...(range ? { range } : {}) })
    return item && { ...item, ...rest, fixed: true }
  }).filter(Boolean)
  // em dezembro aparece a árvore de Natal
  if (new Date().getMonth() === 11) furniture.push({ ...buildItem('xmastree', 9, 8, 'xmas'), fixed: true })
  return { key: 'turma', name: 'Sala da turma', cols: COLS, rows: ROWS, wall: wallOf('creme'), floor: floorOf('madeira'), furniture, hall: true }
}

/** Corredor com uma porta para o quarto de cada membro (a sua vem primeiro).
 *  Tem o mesmo tamanho dos quartos (24x11); só cresce, mantendo a proporção, se as portas não couberem. */
export function corridorScene(members, meId) {
  const list = [...members].sort((a, b) => (a.id === meId ? -1 : b.id === meId ? 1 : a.name.localeCompare(b.name, 'pt-BR')))
  const cols = Math.max(ROOM_COLS, list.length * 2 + 6)
  const rows = Math.max(ROOM_ROWS, Math.round((cols * ROOM_ROWS) / ROOM_COLS))
  const item = (key, x, y, id, override) => buildItem(key, x, y, id, override)
  const furniture = [door('door-hall', 1, 'turma', 'Voltar para a sala da turma', 'Sala da turma')]
  list.forEach((member, i) => {
    furniture.push(door(`door-${member.id}`, 4 + i * 2, `quarto:${member.id}`, `Quarto de ${member.name}`, member.name, { mine: member.id === meId }))
  })
  // plantinhas entre as portas e o tapete vermelho que passa na frente delas
  for (let x = 5; x < cols - 1; x += 4) furniture.push(item('plant:0', x, 2, `plant-${x}`))
  furniture.push(item('plant:1', 0, 2, 'plant-a'), item('plant:1', cols - 1, 2, 'plant-b'))
  furniture.push(item(`rug:e05252:${cols - 2}:1`, 1, 4, 'runner'))
  for (let x = 3; x < cols - 1; x += 4) furniture.push(item('lamp', x, 6, `lamp-${x}`))

  // cantinho de espera no meio: tapete, sofá, poltronas e mesinha
  const c = Math.floor(cols / 2) - 4
  furniture.push(
    item('rug:a066d0:7:3', c, 7, 'rug-lounge'),
    item('sofafront:3a6db4', c + 2, 7, 'sofa'),
    item('armchair:e8915a', c + 1, 8, 'armchair-1'),
    item('armchair:38a85a', c + 5, 8, 'armchair-2'),
    item('sidetable', c + 3, 9, 'side'),
  )
  // canto esquerdo: leitura · canto direito: jogos e música
  furniture.push(
    item('bookshelflow', 1, 7, 'books'),
    item('beanbag:e86aa0', 1, 9, 'beanbag-1'),
    item('beanbag:e8b83a', 2, 9, 'beanbag-2'),
    item('plant:3', 0, rows - 1, 'plant-c'),
    item('arcade', cols - 3, 7, 'arcade'),
    item('vinyl', cols - 2, 7, 'vinyl'),
    item('aquarium', cols - 3, 9, 'aquarium'),
    item('plant:2', cols - 1, rows - 1, 'plant-d'),
  )
  // um cachorro que fica passeando pelo corredor
  furniture.push(item('pet:cachorro:c8904a', c + 4, rows - 1, 'pet-corredor', { range: 10 }))
  return {
    key: 'corredor',
    name: 'Corredor dos quartos',
    cols,
    rows,
    wall: wallOf('azul'),
    floor: floorOf('escura'),
    furniture: furniture.filter(Boolean).map((f) => ({ ...f, fixed: true })),
  }
}

/** Quarto de uma pessoa, a partir do que ela salvou (ou vazio). */
export function personalScene(ownerId, ownerName, layout, { hide = -1 } = {}) {
  const furniture = [door('door-exit', EXIT_X, 'corredor', 'Voltar para o corredor', 'Corredor')]
  ;(layout?.items ?? []).forEach(([key, x, y], index) => {
    if (index === hide) return // móvel sendo arrastado no modo decorar
    const item = buildItem(key, x, y, `i${index}`)
    if (item) furniture.push({ ...item, index })
  })
  return {
    key: `quarto:${ownerId}`,
    name: ownerName ? `Quarto de ${ownerName}` : 'Quarto',
    cols: ROOM_COLS,
    rows: ROOM_ROWS,
    wall: wallOf(layout?.wall),
    floor: floorOf(layout?.floor),
    furniture,
    personal: true,
  }
}

export const emptyLayout = () => ({ wall: 'creme', floor: 'madeira', items: [] })

/** Dá para colocar este móvel aqui? (sem sair da sala, sem ficar em cima de outro, sem tampar a porta) */
export function canPlace(scene, key, x, y, ignoreIndex = -1) {
  const entry = catalogEntry(key)
  if (!entry) return false
  const others = scene.furniture.filter((item) => item.index !== ignoreIndex || ignoreIndex < 0)
  if (entry.wall) {
    if (x < 0 || x + entry.w > scene.cols) return false
    return !others.some((item) => {
      if (!item.wall) return false
      const [a, b] = wallSpan(item)
      return x <= b && x + entry.w - 1 >= a
    })
  }
  const h = entry.h ?? 1
  if (entry.pet && others.filter((item) => item.pet).length >= MAX_PETS) return false
  if (x < 0 || y < WALL_ROWS || x + entry.w > scene.cols || y + h > scene.rows) return false
  const overlaps = (item) => x < item.x + item.w && x + entry.w > item.x && y < item.y + item.h && y + h > item.y
  if (entry.floor) return !others.some((item) => item.floor && overlaps(item))
  // não pode tampar a frente das portas
  const doorFronts = others.filter((item) => item.act === 'door').map((item) => wallSpan(item)[0])
  if (doorFronts.some((dx) => dx >= x && dx < x + entry.w && y === WALL_ROWS)) return false
  return !others.some((item) => item.solid && !item.wall && overlaps(item))
}

/** Posição (quadradinho) onde o móvel ficaria com o mouse em (lx, ly) pixels da sala. */
export function placeAt(key, lx, ly) {
  const entry = catalogEntry(key)
  if (!entry) return null
  const x = Math.round(lx / TILE - entry.w / 2)
  if (entry.wall) return { x, y: 0 }
  return { x, y: Math.round(ly / TILE - (entry.h ?? 1) / 2) }
}
