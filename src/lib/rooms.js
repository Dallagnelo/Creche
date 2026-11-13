// Os ambientes da página Turma: a sala da turma, o corredor dos quartos e o quarto de cada pessoa.
// Cada ambiente vira uma "cena": tamanho, parede, chão e a lista de móveis já posicionados.
import { buildItem, catalogEntry, FLOORS, WALLS } from './roomCatalog'
import { COLS, ROWS, TILE, WALL_ROWS, wallSpan } from './room'

export const ROOM_COLS = 24 // mesma proporção da sala da turma, para ocupar a largura toda
export const ROOM_ROWS = 11
export const MAX_ITEMS = 120 // paredes internas ocupam vários itens
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
  ['teletv', 10, 0, 'telao', { shift: 9 }], // telão em cima do lounge (centro x=208)
  ['poster:0', 16, 0, 'poster-game'],
  ['sign', 19, 0, 'sign'], // letreiro em cima do palco (centro x=336)
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
  ['console', 12, 2, 'console'], // videogame e rádio embaixo do telão
  ['radio', 13, 2, 'radio'],
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

// ---------- a sala da turma muda a cada dia da semana (pelo horário de Brasília, igual para todo mundo)
const DOOR_ROOMS = { act: 'door', door: 'corredor', label: 'Ir para os quartos', plate: 'Quartos' }
const seatsRow = (key, x0, x1, y, prefix) => Array.from({ length: x1 - x0 + 1 }, (_, i) => [key, x0 + i, y, `${prefix}-${x0 + i}`])
const cafeSet = (x, y, n) => [['chair:l', x, y, `cl-${n}`], ['table', x + 1, y, `ct-${n}`], ['chair:r', x + 2, y, `cr-${n}`]]

// Regras de arrumação (todas as salas): cada grupo de móveis fica centralizado embaixo do que está na parede,
// pares iguais ficam espelhados em relação ao centro do grupo e o espaço entre grupos é sempre o mesmo.

// Segunda: cafeteria — balcão à esquerda, mesas no centro (alinhadas ao letreiro), leitura à direita
const CAFE = [
  // parede: janelas e plantas espelhadas em volta do letreiro
  ['clock', 0, 0, 'clock'], ['chalkboard', 2, 0, 'menu'], ['teletv', 5, 0, 'telao'],
  ['sign', 12, 0, 'sign'], ['window', 18, 0, 'win-3'], ['hangingplant', 20, 0, 'hang-2'], ['window', 22, 0, 'win-4'],
  ['door', 24, 0, 'door-rooms', DOOR_ROOMS], ['board', 26, 0, 'board', { py: 2 }], ['frame:1', 29, 0, 'frame-2'],
  // balcão
  ['fridge', 0, 2, 'fridge'], ['cafecounter', 1, 2, 'counter'], ['pastrycase', 4, 2, 'pastry'], ['plant:1', 6, 2, 'plant-1'],
  // salão: 2 colunas x 3 fileiras de mesinhas, espelhadas no centro do letreiro
  ['rug:e8915a:12:9', 8, 4, 'rug-cafe'],
  ...cafeSet(9, 5, 1), ...cafeSet(16, 5, 2), ...cafeSet(9, 8, 3), ...cafeSet(16, 8, 4), ...cafeSet(9, 11, 5), ...cafeSet(16, 11, 6),
  ['plant:0', 13, 8, 'plant-center'],
  // cantinho de leitura
  ['rug:a066d0:5:5', 22, 5, 'rug-read'], ['sofafront:3a6db4', 23, 6, 'sofa-read'],
  ['armchair:e8915a', 22, 8, 'arm-1'], ['sidetable', 24, 8, 'side'], ['armchair:38a85a', 26, 8, 'arm-2'],
  ['lamp', 27, 2, 'lamp'], ['bookshelf', 28, 2, 'books'],
  // mesa comunitária
  ['tablelong', 2, 11, 'long-1'], ['tablelong', 4, 11, 'long-2'], ...seatsRow('stool', 2, 5, 10, 'st-a'), ...seatsRow('stool', 2, 5, 12, 'st-b'),
  ['plant:0', 0, 6, 'plant-2'], ['monstera', 0, 12, 'plant-3'], ['plant:3', 27, 12, 'plant-4'], ['vinyl', 28, 12, 'vinyl'], ['ballot', 29, 12, 'ballot'],
  ['pet:gato:6a7280', 14, 12, 'pet-cat', { range: 12, name: 'Café' }],
]

// Terça: cinema — tudo espelhado no centro da sala (corredor do tapete vermelho)
const CINEMA = [
  ['sign', 1, 0, 'sign'], ['sconce', 7, 0, 'sconce-1'], ['poster:2', 9, 0, 'poster-1'], ['teletvcine', 11, 0, 'telao'],
  ['poster:0', 20, 0, 'poster-2'], ['sconce', 22, 0, 'sconce-2'], ['door', 24, 0, 'door-rooms', DOOR_ROOMS], ['board', 26, 0, 'board', { py: 2 }],
  ['clock', 29, 0, 'clock'],
  ['speaker', 9, 2, 'speaker-1'], ['speaker', 20, 2, 'speaker-2'],
  ['rug:e05252:2:10', 14, 4, 'aisle'],
  ...seatsRow('cinemaseat:c83a4a', 10, 13, 5, 'r1a'), ...seatsRow('cinemaseat:c83a4a', 16, 19, 5, 'r1b'),
  ...seatsRow('cinemaseat:c83a4a', 10, 13, 7, 'r2a'), ...seatsRow('cinemaseat:c83a4a', 16, 19, 7, 'r2b'),
  ...seatsRow('cinemaseat:c83a4a', 10, 13, 9, 'r3a'), ...seatsRow('cinemaseat:c83a4a', 16, 19, 9, 'r3b'),
  ...seatsRow('cinemaseat:a066d0', 10, 13, 11, 'r4a'), ...seatsRow('cinemaseat:a066d0', 16, 19, 11, 'r4b'),
  // saguão (embaixo do letreiro)
  ['popcorn', 1, 3, 'popcorn'], ['candycounter', 2, 3, 'candy'], ['popcorn', 4, 3, 'popcorn-2'],
  ['ticketbooth', 2, 7, 'tickets'], ['rug:e05252:4:2', 1, 10, 'rug-lobby'], ['plant:1', 0, 12, 'plant-1'], ['plant:1', 5, 12, 'plant-2'],
  // espera (embaixo do mural)
  ['vending', 26, 3, 'vending'], ['claw', 27, 3, 'claw'], ['bench', 26, 6, 'bench-1'], ['bench', 26, 9, 'bench-2'],
  ['plant:1', 24, 12, 'plant-3'], ['ballot', 29, 12, 'ballot'],
  ['pet:gato:1f1a1a', 6, 9, 'pet-cat', { range: 6, name: 'Pipoca' }],
]

// Quarta: fliperama — máquinas embaixo dos neons, jogos de mesa numa fileira com espaços iguais
const ARCADE = [
  ['neon:1', 0, 0, 'neon-1'], ['neon:4', 3, 0, 'neon-2'], ['sign', 6, 0, 'sign'], ['neon:0', 11, 0, 'neon-3'], ['scoreboard', 14, 0, 'score'],
  ['teletv', 18, 0, 'telao', { shift: 8 }], ['door', 24, 0, 'door-rooms', DOOR_ROOMS], ['board', 26, 0, 'board', { py: 2 }], ['neon:2', 28, 0, 'neon-5'],
  ...seatsRow('arcade', 0, 4, 2, 'arc-a'), ['claw', 6, 2, 'claw-1'], ['claw', 7, 2, 'claw-2'], ['vending', 8, 2, 'vend-1'], ['vending', 9, 2, 'vend-2'],
  ...seatsRow('arcade', 13, 17, 2, 'arc-b'), ['prizecounter', 26, 3, 'prizes'],
  ['pooltable', 2, 6, 'pool'], ['foosball', 8, 6, 'foos'], ['airhockey', 13, 6, 'hockey'], ['pingpong', 19, 6, 'ping'],
  ['jukebox', 22, 9, 'jukebox'], ['dancefloor:5:3', 20, 10, 'dance'], ['speaker', 19, 10, 'speaker-1'], ['speaker', 25, 10, 'speaker-2'],
  ['console', 2, 10, 'console'], ['beanbag:a066d0', 1, 11, 'bag-1'], ['beanbag:3a6db4', 3, 11, 'bag-3'], ['beanbag:e86aa0', 2, 12, 'bag-2'],
  ['trophies', 8, 11, 'trophies'], ['ballot', 29, 8, 'ballot'], ['plant:2', 29, 13, 'plant-1'], ['plant:2', 0, 8, 'plant-2'],
  ['pet:robo:2b2f3c', 13, 10, 'pet-robo', { range: 12, name: 'Bip' }],
]

// Quinta: luau — a fogueira no centro da sala e tudo espelhado em volta dela
const BEACH = [
  ...[0, 3, 6, 9, 12, 15].map((x) => ['fairylights', x, 0, `lights-${x}`]), ['teletvwood', 18, 0, 'telao', { shift: 8 }],
  ['sign', 13, 0, 'sign', { py: 6 }], ['door', 24, 0, 'door-rooms', DOOR_ROOMS], ['board', 26, 0, 'board', { py: 2 }],
  ['palm', 1, 3, 'palm-1'], ['surfboard', 6, 2, 'surf'], ['surfboard', 23, 2, 'surf-2'], ['palm', 28, 3, 'palm-4'],
  ['campfire', 14, 7, 'fire'], ['log', 14, 5, 'log-1'], ['log', 14, 9, 'log-2'], ['log', 11, 7, 'log-3'], ['log', 17, 7, 'log-4'],
  ['parasol:e05252', 3, 6, 'parasol-1'], ['beachtowel:e86aa0', 3, 7, 'towel-1'], ['beachtowel:f2c14e', 4, 7, 'towel-2'],
  ['parasol:3a6db4', 25, 6, 'parasol-2'], ['beachtowel:5eead4', 25, 7, 'towel-3'], ['beachtowel:3a6db4', 26, 7, 'towel-4'],
  ['cooler', 12, 11, 'cooler'], ['guitar', 17, 11, 'guitar'], ['radio', 9, 12, 'radio'], ['sandcastle', 20, 12, 'castle'],
  ['juicestand', 2, 11, 'juice'], ['palm', 24, 11, 'palm-5'], ['hammock', 25, 11, 'hammock'], ['palm', 27, 11, 'palm-6'],
  ['ballot', 29, 8, 'ballot'],
  ['pet:caranguejo:e05252', 7, 9, 'crab-1', { range: 5, name: 'Siri' }], ['pet:caranguejo:e05252', 22, 9, 'crab-2', { range: 5, name: 'Sirigueijo' }],
  ['pet:cachorro:c8904a', 15, 12, 'pet-dog', { range: 9, name: 'Caramelo' }],
]

// Sexta: balada — DJ e pista no centro; bar (embaixo do letreiro) e VIP (embaixo do mural) espelhados
const PARTY = [
  ['sign', 1, 0, 'sign'], ['neon:0', 6, 0, 'neon-1'], ['discoball', 9, 0, 'disco-1'], ['teletv', 12, 0, 'telao', { shift: 8 }], ['discoball', 20, 0, 'disco-2'],
  ['neon:1', 22, 0, 'neon-2'], ['door', 24, 0, 'door-rooms', DOOR_ROOMS], ['board', 26, 0, 'board', { py: 2 }],
  ['speaker', 11, 3, 'speaker-1'], ['djbooth', 13, 3, 'dj'], ['speaker', 18, 3, 'speaker-2'], ['mic', 15, 4, 'mic'],
  ['dancefloor:5:3', 10, 6, 'dance-1'], ['dancefloor:5:3', 15, 6, 'dance-2'],
  ['fridge', 0, 3, 'fridge'], ['bar', 1, 3, 'bar-1'], ['bar', 3, 3, 'bar-2'], ...seatsRow('stool', 1, 4, 5, 'stool'),
  ['vending', 26, 3, 'vending'], ['claw', 27, 3, 'claw'], ['lavalamp', 28, 3, 'lava'],
  ['rug:a066d0:5:5', 24, 8, 'rug-vip'], ['sofafront:a066d0', 25, 8, 'sofa-1'], ['armchair:e86aa0', 24, 10, 'arm-1'],
  ['sidetable', 26, 10, 'side'], ['armchair:e86aa0', 28, 10, 'arm-2'], ['sofafront:e86aa0', 25, 12, 'sofa-2'],
  ['beanbag:a066d0', 2, 10, 'bag-1'], ['beanbag:3a6db4', 4, 10, 'bag-2'], ['lamparc', 3, 9, 'lamp'],
  ['ballot', 0, 12, 'ballot'], ['plant:2', 29, 13, 'plant-1'],
  ['pet:robo:e8eef2', 8, 11, 'pet-robo', { range: 8, name: 'DJ Bip' }],
]

// Domingo: jardim — piquenique no centro (embaixo do letreiro), árvore e horta à esquerda, lago à direita
const GARDEN = [
  ...[0, 3, 6, 9, 12, 15].map((x) => ['garland', x, 0, `flags-${x}`]), ['teletvwood', 18, 0, 'telao', { shift: 8 }],
  ['sign', 13, 0, 'sign', { py: 6 }], ['door', 24, 0, 'door-rooms', DOOR_ROOMS], ['board', 26, 0, 'board', { py: 2 }],
  ['sunflower', 11, 2, 'sun-1'], ['sunflower', 18, 2, 'sun-2'],
  ['tree', 3, 4, 'tree-1'], ['swing', 6, 4, 'swing'], ['veggies', 1, 11, 'veggies-1'], ['veggies', 5, 11, 'veggies-2'],
  ['picnic', 13, 5, 'picnic'], ['picnicbasket', 14, 6, 'basket'], ['bench', 11, 10, 'bench-1'], ['bench', 17, 10, 'bench-2'],
  ['pond', 21, 5, 'pond'], ['plant:3', 20, 9, 'flowers-1'], ['plant:3', 26, 9, 'flowers-2'], ['planter', 20, 2, 'planter'],
  ['grill', 27, 3, 'grill'], ['cooler', 28, 3, 'cooler'], ['tree', 27, 12, 'tree-2'], ['ballot', 29, 6, 'ballot'],
  ['pet:pato:f2c14e', 19, 11, 'duck-1', { range: 5, name: 'Patinho' }], ['pet:pato:f6f1e6', 23, 11, 'duck-2', { range: 5 }],
  ['pet:coelho:f6f1e6', 8, 8, 'bunny', { range: 6, name: 'Pipoca' }], ['pet:cachorro:c8904a', 15, 12, 'pet-dog', { range: 9, name: 'Caramelo' }],
]

// tema de cada dia (0 = domingo ... 6 = sábado, como no JavaScript)
export const HALL_THEMES = [
  { day: 0, dayName: 'Domingo', name: 'Piquenique no jardim', layout: GARDEN, wall: 'jardim', floor: 'grama', xmas: [7, 3], dj: [15, 3] },
  { day: 1, dayName: 'Segunda', name: 'Cafeteria', layout: CAFE, wall: 'menta', floor: 'clara', xmas: [7, 3], dj: [14, 3] },
  { day: 2, dayName: 'Terça', name: 'Cine turma', layout: CINEMA, wall: 'vinho', floor: 'carpete-vinho', xmas: [6, 6], dj: [16, 3] },
  { day: 3, dayName: 'Quarta', name: 'Fliperama', layout: ARCADE, wall: 'neon', floor: 'arcade', xmas: [8, 10], dj: [20, 3] },
  { day: 4, dayName: 'Quinta', name: 'Luau na praia', layout: BEACH, wall: 'praia', floor: 'areia', xmas: [6, 4], dj: [16, 3] },
  { day: 5, dayName: 'Sexta', name: 'Sextou', layout: PARTY, wall: 'neon', floor: 'balada', xmas: [7, 4], party: { x: 15 * 16, y: 7.5 * 16, rx: 64, ry: 18, always: true }, dj: [13, 4] },
  { day: 6, dayName: 'Sábado', name: 'Sala da turma', layout: HALL, wall: 'creme', floor: 'madeira', xmas: [9, 8], classic: true, dj: [17, 3] },
]

/** Dia da semana (0-6) e data (AAAA-MM-DD) agora no horário de Brasília. */
export function brasiliaToday(date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  )
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday)
  return { weekday, key: `${parts.year}-${parts.month}-${parts.day}`, month: Number(parts.month) }
}

/** A sala da turma do dia (ou do dia escolhido pelo admin para conferir). */
export function hallScene(day = brasiliaToday().weekday) {
  const theme = HALL_THEMES[day] ?? HALL_THEMES[6]
  const furniture = theme.layout.map(([key, x, y, id, extra = {}]) => {
    const { w, py, range, shift, ...rest } = extra
    const item = buildItem(key, x, y, id, { ...(w ? { w } : {}), ...(py !== undefined ? { py } : {}), ...(range ? { range } : {}) })
    // enfeite de parede empurrado alguns pixels (para centralizar o que não cabe certinho nos quadradinhos)
    if (item && shift) {
      item.px += shift
      if (item.screen) item.screen.x += shift
      if (item.glow) item.glow.x += shift
    }
    return item && { ...item, ...rest, fixed: true }
  }).filter(Boolean)
  // o DJ que coloca vídeos do YouTube no telão
  if (theme.dj) furniture.push({ ...buildItem('djnpc', theme.dj[0], theme.dj[1], 'dj-npc'), fixed: true })
  // em dezembro aparece a árvore de Natal
  if (brasiliaToday().month === 12) furniture.push({ ...buildItem('xmastree', theme.xmas[0], theme.xmas[1], 'xmas'), fixed: true })
  return {
    key: 'turma',
    name: theme.classic ? 'Sala da turma' : `Sala da turma · ${theme.name}`,
    cols: COLS,
    rows: ROWS,
    wall: wallOf(theme.wall),
    floor: floorOf(theme.floor),
    furniture,
    hall: true,
    classic: !!theme.classic,
    party: theme.party ?? null,
    day: theme.day,
  }
}

/** Corredor dos quartos: a "Estação Creche", um corredor de nave espacial.
 *  Janelão para o espaço, portas de nave com a luz na cor de cada pessoa, escotilhas entre as portas,
 *  esteira rolante, teletransportes (para a sala da turma e para o seu quarto), holograma de planeta,
 *  poltronas-ovo e um alienzinho de estimação. Tem o tamanho dos quartos (24x11) e cresce se faltar porta. */
const MAT_COLORS = ['e05252', '3a6db4', '38a85a', 'a066d0', 'e8b83a', 'e86aa0', 'e8915a', '6a7280']
const colorFor = (id) => MAT_COLORS[[...String(id)].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) % MAT_COLORS.length]
const sciDoor = (id, x, target, label, plate, color, extra = {}) => ({
  ...buildItem(`doorsci:${color}`, x, 0, id),
  act: 'door', door: target, label, plate, plateColor: `#${color}`, fixed: true, ...extra,
})

export function corridorScene(members, meId) {
  const list = [...members].sort((a, b) => (a.id === meId ? -1 : b.id === meId ? 1 : a.name.localeCompare(b.name, 'pt-BR')))
  const cols = Math.max(ROOM_COLS, list.length * 2 + 6)
  const rows = Math.max(ROOM_ROWS, Math.round((cols * ROOM_ROWS) / ROOM_COLS))
  const item = (key, x, y, id, override) => buildItem(key, x, y, id, override)
  const furniture = [sciDoor('door-hall', 1, 'turma', 'Voltar para a sala da turma', 'Sala da turma', '5eead4')]
  const lastDoor = 4 + (list.length - 1) * 2

  // ---- portas de nave (luz na cor de cada pessoa); a parede inteira já é uma janela para o espaço
  list.forEach((member, i) => {
    const x = 4 + i * 2
    furniture.push(sciDoor(`door-${member.id}`, x, `quarto:${member.id}`, `Quarto de ${member.name}`, member.name, colorFor(member.id), { mine: member.id === meId }))
  })
  // mural depois da última porta
  const boardX = Math.min(cols - 2, (list.length ? lastDoor : 2) + 3)
  furniture.push(item('board', boardX, 0, 'board', { py: 2 }))
  // barras de luz no teto
  for (let x = 0; x + 3 <= cols; x += 3) furniture.push(item('lightbar', x, 0, `bar-${x}`))

  // ---- esteira rolante na frente das portas
  const belt = cols - 2
  furniture.push({ ...item('conveyor:4', 1, 4, 'belt'), ...beltOverride(belt) })
  furniture.push(item('alienplant', 0, 2, 'plant-a'), item('alienplant', cols - 1, 2, 'plant-b'))

  // ---- teletransportes (esquerda): para a sala da turma e para o seu quarto, com o foguete no meio
  furniture.push(
    { ...item('teleport:a066d0', 1, 7, 'tp-hall'), target: 'turma', plate: 'Sala da turma', plateColor: '#a066d0', plateIcon: '✨', label: 'Teletransporte: sala da turma' },
    { ...item('teleport:5eead4', 4, 7, 'tp-room'), target: 'mine', plate: 'Meu quarto', plateColor: '#5eead4', plateIcon: '✨', label: 'Teletransporte: meu quarto' },
    item('rocket', 3, 9, 'rocket'),
    item('spacesuit', 0, 9, 'suit'),
    item('alienplant', 6, 9, 'plant-c'),
  )

  // ---- holograma no centro, com poltronas-ovo espelhadas em volta
  const c = Math.floor(cols / 2) // coluna do centro do holograma
  furniture.push(
    item('ruground:a066d0:3', c - 1, 6, 'rug-holo'),
    item('hologram', c - 1, 7, 'holo'),
    item('podchair:e86aa0', c - 3, 7, 'pod-1'),
    item('podchair:5eead4', c + 3, 7, 'pod-2'),
    item('podchair:f2c14e', c - 2, 9, 'pod-3'),
    item('podchair:a066d0', c + 2, 9, 'pod-4'),
  )

  // ---- lanchonete espacial (direita)
  const rx = cols - 4
  furniture.push(
    item('foodcapsule', rx - 1, 6, 'food-1'),
    item('foodcapsule', rx, 6, 'food-2'),
    item('bar', rx + 1, 6, 'bar'),
    ...[rx - 1, rx, rx + 1, rx + 2].map((x, i) => item('stool', x, 8, `stool-${i}`)),
    item('alienplant', cols - 1, rows - 1, 'plant-d'),
  )

  // ---- quem mora na estação
  furniture.push(item('pet:et:38d27a', c, rows - 1, 'pet-et', { range: 9 }))
  furniture.push(item('pet:robo:e8eef2', 8, 5, 'pet-robo', { range: 12 }))

  return {
    key: 'corredor',
    name: 'Estação Creche · corredor dos quartos',
    cols,
    rows,
    wall: wallOf('estacao'),
    floor: floorOf('metal'),
    furniture: furniture.filter(Boolean).map((f) => ({ ...f, fixed: true })),
  }
}

// a esteira do catálogo tem 4 quadradinhos; no corredor ela atravessa tudo
function beltOverride(w) {
  const sprite = `conveyor:${w}`
  return { w, sprite, screen: { dx: 0, dy: 4, w: w * 16, h: 8, kind: 'conveyor', x: 16, y: 4 * 16 + 4 } }
}

/** Quarto de uma pessoa, a partir do que ela salvou (ou vazio). */
export function personalScene(ownerId, ownerName, layout, { hide = -1 } = {}) {
  const furniture = [door('door-exit', EXIT_X, 'corredor', 'Voltar para o corredor', 'Corredor')]
  ;(layout?.items ?? []).forEach(([key, x, y], index) => {
    if (index === hide) return // móvel sendo arrastado no modo decorar
    const item = buildItem(key, x, y, `i${index}`)
    if (item) furniture.push({ ...item, index })
  })
  joinWalls(furniture)
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

/** Emenda as paredes internas para não sobrar buraco nos cantos:
 *  - parede em pé com outra parede (em pé ou deitada) logo abaixo: perde a "frente" e emenda nela;
 *  - parede em pé que termina bem no canto de uma parede deitada: desce um quadradinho e fecha o canto
 *    (esse quadradinho passa a bloquear a passagem também);
 *  - parede deitada encostada numa parede em pé: estica 4px até encostar nela. */
const isVertical = (item) => /^wallv3?:/.test(item.key ?? '')
const isHorizontal = (item) => /^wallh[24]?:/.test(item.key ?? '')
const isWallLine = (item) => isHorizontal(item) || /^(archway|doorin|doorclosed)(:|$)/.test(item.key ?? '') || item.key === 'beads'
const covers = (item, x, y) => x >= item.x && x < item.x + item.w && y >= item.y && y < item.y + item.h

function joinWalls(furniture) {
  const vertical = furniture.filter(isVertical)
  const lines = furniture.filter(isWallLine)
  const solidAt = (x, y) => furniture.some((item) => (item.solid || item.passable) && !item.wall && covers(item, x, y))
  vertical.forEach((item) => {
    const bx = item.x
    const by = item.y + item.h // linha logo abaixo da parede
    if (vertical.some((o) => o !== item && covers(o, bx, by)) || lines.some((o) => covers(o, bx, by))) {
      item.sprite = `${item.key}:j`
      return
    }
    const besideLine = lines.some((o) => covers(o, bx - 1, by) || covers(o, bx + 1, by))
    if (besideLine && !solidAt(bx, by)) {
      item.h += 1
      item.sprite = `${item.key}::e`
    }
  })
  furniture.filter(isHorizontal).forEach((item) => {
    const left = vertical.some((v) => covers(v, item.x - 1, item.y))
    const right = vertical.some((v) => covers(v, item.x + item.w, item.y))
    if (left || right) item.sprite = `${item.key}:${left ? 'L' : ''}${right ? 'R' : ''}`
  })
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
  return !others.some((item) => (item.solid || item.passable) && !item.wall && overlaps(item))
}

/** Posição (quadradinho) onde o móvel ficaria com o mouse em (lx, ly) pixels da sala. */
export function placeAt(key, lx, ly) {
  const entry = catalogEntry(key)
  if (!entry) return null
  const x = Math.round(lx / TILE - entry.w / 2)
  if (entry.wall) return { x, y: 0 }
  return { x, y: Math.round(ly / TILE - (entry.h ?? 1) / 2) }
}
