// Catálogo de móveis do "modo decorar". Cada móvel tem uma chave ("sofa:e05252" = sofá vermelho),
// o tamanho no chão (w x h quadradinhos) e o que acontece ao tocar nele (act).
// Telas, luzes e lugares para sentar são relativos ao próprio móvel; buildItem converte para a posição na sala.
import { TILE, WALL_TOP } from './room'
import { PETS } from './roomPets'
import { getSprite } from './roomSprites'

export const CATEGORIES = [
  { id: 'sala', label: 'Sala' },
  { id: 'quarto', label: 'Quarto' },
  { id: 'cozinha', label: 'Cozinha e banho' },
  { id: 'diversao', label: 'Diversão' },
  { id: 'bichos', label: 'Bichinhos' },
  { id: 'plantas', label: 'Plantas' },
  { id: 'parede', label: 'Parede' },
  { id: 'tapetes', label: 'Tapetes' },
]

const COLORS = { vermelho: 'e05252', azul: '3a6db4', verde: '38a85a', roxo: 'a066d0', amarelo: 'e8b83a', rosa: 'e86aa0', cinza: '6a7280', laranja: 'e8915a' }
const PET_COLORS = { e8915a: 'laranja', '6a7280': 'cinza', '1f1a1a': 'preto', f6f1e6: 'branco', c8904a: 'caramelo', '8a5a34': 'marrom', e8b070: 'dourado', f2c14e: 'amarelo' }
const colorNames = Object.fromEntries(Object.entries(COLORS).map(([name, value]) => [value, name]))

const SIT_BACK = (dxs, dy) => dxs.map((dx) => ({ dx, dy, pose: 'sit', dir: 'up' }))
const SIT = (dxs, dy = 0.05) => dxs.map((dx) => ({ dx, dy, pose: 'sit' }))
const SLEEP = (dx, dy) => [{ dx, dy, pose: 'sleep' }]

// Móveis básicos (sem cor). act "say" mostra um dos balões em `says`.
const BASE = {
  // sala
  sofa: { label: 'Sofá (de costas)', cat: 'sala', w: 4, h: 1, act: 'sit', seats: SIT_BACK([0.375, 1.5, 2.625], -0.8), colors: true },
  sofafront: { label: 'Sofá', cat: 'sala', w: 3, h: 1, act: 'sit', seats: SIT([0.125, 1, 1.875]), colors: true },
  armchair: { label: 'Poltrona', cat: 'sala', w: 1, h: 1, act: 'sit', seats: SIT([0]), colors: true },
  beanbag: { label: 'Pufe', cat: 'sala', w: 1, h: 1, act: 'sit', seats: SIT([0], 0.1), colors: true },
  coffee: { label: 'Mesinha de centro', cat: 'sala', w: 2, h: 1, act: 'say', says: ['Que café bom ☕', 'Um lanchinho 🍪', 'Cadê o controle?'] },
  sidetable: { label: 'Mesinha lateral', cat: 'sala', w: 1, h: 1, act: 'say', says: ['Que vaso bonito'] },
  tv: { label: 'TV grande', cat: 'sala', w: 3, h: 1, act: 'tv', screen: { dx: 9, dy: 3, w: 30, h: 12, kind: 'tv' } },
  crt: { label: 'TV antiga', cat: 'sala', w: 1, h: 1, act: 'tv', screen: { dx: 2, dy: 3, w: 13, h: 11, kind: 'tv' } },
  console: { label: 'Videogame', cat: 'sala', w: 1, h: 1, act: 'say', says: ['Jogando videogame 🎮', 'Só mais uma partida!', 'Ganhei! 🏆'] },
  bookshelf: { label: 'Estante alta', cat: 'sala', w: 2, h: 2, act: 'books' },
  bookshelflow: { label: 'Estante baixa', cat: 'sala', w: 2, h: 1, act: 'books' },
  lamp: { label: 'Luminária de chão', cat: 'sala', w: 1, h: 1, act: 'lamp', glow: { dx: 6, dy: 4 } },
  fireplace: { label: 'Lareira', cat: 'sala', w: 2, h: 1, act: 'fire', screen: { dx: 8, dy: 20, w: 18, h: 12, kind: 'fire' }, glow: { dx: 17, dy: 28, color: 'rgba(255,150,60,0.4)', size: 46 } },
  aquarium: { label: 'Aquário', cat: 'sala', w: 2, h: 1, act: 'say', says: ['Olha o peixinho 🐟', 'Hora de alimentar os peixes'], screen: { dx: 1, dy: 3, w: 30, h: 11, kind: 'fish' } },
  // quarto
  bed: { label: 'Cama de casal', cat: 'quarto', w: 2, h: 2, act: 'bed', seats: SLEEP(0.5, 0.3), colors: true },
  bedsingle: { label: 'Cama de solteiro', cat: 'quarto', w: 1, h: 2, act: 'bed', seats: SLEEP(0.05, 0.3), colors: true },
  bunk: { label: 'Beliche', cat: 'quarto', w: 2, h: 2, act: 'bed', seats: SLEEP(0, 0.75), colors: true },
  nightstand: { label: 'Criado-mudo', cat: 'quarto', w: 1, h: 1, act: 'lamp', glow: { dx: 7, dy: 3, size: 26 } },
  wardrobe: { label: 'Guarda-roupa', cat: 'quarto', w: 2, h: 1, act: 'wardrobe' },
  dresser: { label: 'Cômoda', cat: 'quarto', w: 2, h: 1, act: 'wardrobe' },
  vanity: { label: 'Penteadeira', cat: 'quarto', w: 2, h: 1, act: 'wardrobe' },
  mirror: { label: 'Espelho de pé', cat: 'quarto', w: 1, h: 1, act: 'mirror' },
  desk: { label: 'Escrivaninha', cat: 'quarto', w: 2, h: 1, act: 'say', says: ['Estudando 📚', 'Fazendo a lição', 'Que preguiça...'] },
  deskpc: { label: 'PC gamer', cat: 'quarto', w: 2, h: 1, act: 'pc', screen: { dx: 6, dy: 2, w: 18, h: 10, kind: 'pc' } },
  gamerchair: { label: 'Cadeira gamer', cat: 'quarto', w: 1, h: 1, act: 'sit', seats: SIT([0]), colors: true },
  teddy: { label: 'Ursinho', cat: 'quarto', w: 1, h: 1, act: 'say', says: ['Abraço de urso 🧸', 'Que fofo!'] },
  boxes: { label: 'Caixas', cat: 'quarto', w: 1, h: 1, act: 'say', says: ['Ainda não desempacotei 📦', 'O que tem aqui?'] },
  // cozinha e banheiro
  fridge: { label: 'Geladeira', cat: 'cozinha', w: 1, h: 1, act: 'fridge' },
  counter: { label: 'Cozinha completa', cat: 'cozinha', w: 5, h: 1, act: 'cook' },
  kitchenette: { label: 'Pia e fogão', cat: 'cozinha', w: 2, h: 1, act: 'cook' },
  microwave: { label: 'Micro-ondas', cat: 'cozinha', w: 1, h: 1, act: 'say', says: ['Esquentando a pizza 🍕', 'Pipoca! 🍿'] },
  table: { label: 'Mesa redonda', cat: 'cozinha', w: 1, h: 1, act: 'coffee' },
  tablelong: { label: 'Mesa de jantar', cat: 'cozinha', w: 2, h: 1, act: 'coffee' },
  'chair:l': { label: 'Cadeira (virada →)', cat: 'cozinha', w: 1, h: 1, act: 'sit', seats: SIT([0]) },
  'chair:r': { label: 'Cadeira (virada ←)', cat: 'cozinha', w: 1, h: 1, act: 'sit', seats: SIT([0]) },
  stool: { label: 'Banquinho', cat: 'cozinha', w: 1, h: 1, act: 'sit', seats: SIT([0]) },
  bathtub: { label: 'Banheira', cat: 'cozinha', w: 2, h: 1, act: 'say', says: ['Banho de espuma 🛁', 'Cantando no banho 🎤'] },
  toilet: { label: 'Vaso sanitário', cat: 'cozinha', w: 1, h: 1, act: 'say', says: ['Ocupado! 🚽', 'Já volto...'] },
  sink: { label: 'Pia do banheiro', cat: 'cozinha', w: 1, h: 1, act: 'say', says: ['Escovando os dentes 🪥', 'Lavando as mãos 🧼'] },
  // diversão
  arcade: { label: 'Fliperama', cat: 'diversao', w: 1, h: 1, act: 'arcade', screen: { dx: 3, dy: 7, w: 10, h: 8, kind: 'arcade' } },
  piano: { label: 'Piano', cat: 'diversao', w: 2, h: 2, act: 'piano' },
  guitar: { label: 'Violão', cat: 'diversao', w: 1, h: 1, act: 'guitar' },
  drums: { label: 'Bateria', cat: 'diversao', w: 2, h: 1, act: 'drums' },
  vinyl: { label: 'Vitrola', cat: 'diversao', w: 1, h: 1, act: 'music' },
  speaker: { label: 'Caixa de som', cat: 'diversao', w: 1, h: 2, act: 'music' },
  pooltable: { label: 'Sinuca', cat: 'diversao', w: 3, h: 2, act: 'say', says: ['Bola 8 na caçapa 🎱', 'Errei a tacada...', 'Sinuca de bico!'] },
  weights: { label: 'Halteres', cat: 'diversao', w: 1, h: 1, act: 'say', says: ['Treinando 💪', 'Só mais uma série!'] },
  xmastree: { label: 'Árvore de Natal', cat: 'diversao', w: 1, h: 1, act: 'say', says: ['Feliz Natal! 🎄', 'Cadê meu presente? 🎁'], screen: { dx: 0, dy: 0, w: 20, h: 28, kind: 'xmas' } },
  // plantas e bichos
  'plant:0': { label: 'Planta', cat: 'plantas', w: 1, h: 1, act: 'plant' },
  'plant:1': { label: 'Planta alta', cat: 'plantas', w: 1, h: 1, act: 'plant' },
  'plant:2': { label: 'Cacto', cat: 'plantas', w: 1, h: 1, act: 'plant' },
  'plant:3': { label: 'Flores', cat: 'plantas', w: 1, h: 1, act: 'plant' },
  cat: { label: 'Gato dormindo', cat: 'bichos', w: 1, h: 1, act: 'say', says: ['Miau! 🐱', 'Purrr...', 'O gato me ignorou'], colors: ['e8915a', '6a7280', '1f1a1a', 'f6f1e6'] },
  dogbed: { label: 'Cachorro na caminha', cat: 'bichos', w: 1, h: 1, act: 'say', says: ['Au au! 🐶', 'Quem é o bom garoto?', 'Zzz... (o cachorro dorme)'] },
  trash: { label: 'Lixeira', cat: 'plantas', w: 1, h: 1, act: 'say', says: ['Joguei o lixo fora 🗑️'] },
  // parede
  window: { label: 'Janela', cat: 'parede', wall: true, w: 1, py: 5 },
  'frame:0': { label: 'Quadrinho (paisagem)', cat: 'parede', wall: true, w: 1, py: 6 },
  'frame:1': { label: 'Quadrinho (noite)', cat: 'parede', wall: true, w: 1, py: 6 },
  'frame:2': { label: 'Quadrinho (arte)', cat: 'parede', wall: true, w: 1, py: 6 },
  'poster:0': { label: 'Pôster de jogo', cat: 'parede', wall: true, w: 1, py: 4 },
  'poster:1': { label: 'Pôster de banda', cat: 'parede', wall: true, w: 1, py: 4 },
  'poster:2': { label: 'Pôster de filme', cat: 'parede', wall: true, w: 1, py: 4 },
  'poster:3': { label: 'Pôster smile', cat: 'parede', wall: true, w: 1, py: 4 },
  'neon:0': { label: 'Neon coração', cat: 'parede', wall: true, w: 2, py: 6, act: 'lamp', glow: { dx: 12, dy: 7, color: 'rgba(232,106,160,0.4)', size: 26 } },
  'neon:1': { label: 'Neon GG', cat: 'parede', wall: true, w: 2, py: 6, act: 'lamp', glow: { dx: 12, dy: 7, color: 'rgba(94,234,212,0.4)', size: 26 } },
  'neon:2': { label: 'Neon estrela', cat: 'parede', wall: true, w: 2, py: 6, act: 'lamp', glow: { dx: 12, dy: 7, color: 'rgba(242,193,78,0.4)', size: 26 } },
  walltv: { label: 'TV de parede', cat: 'parede', wall: true, w: 3, py: 4, act: 'tv', screen: { dx: 2, dy: 2, w: 34, h: 17, kind: 'tv' } },
  clock: { label: 'Relógio', cat: 'parede', wall: true, w: 1, py: 4, act: 'clock' },
  calendar: { label: 'Calendário', cat: 'parede', wall: true, w: 1, py: 6, act: 'calendar' },
  board: { label: 'Mural de fotos', cat: 'parede', wall: true, w: 2, py: 4, act: 'board' },
  wallshelf: { label: 'Prateleira', cat: 'parede', wall: true, w: 2, py: 12 },
  garland: { label: 'Bandeirinhas', cat: 'parede', wall: true, w: 3, py: 2 },
  mirrorround: { label: 'Espelho redondo', cat: 'parede', wall: true, w: 1, py: 6, act: 'mirror' },
  door: { label: 'Porta', cat: 'parede', wall: true, w: 1, py: 2, hidden: true },
  // mais decoração
  cushion: { label: 'Almofadão', cat: 'sala', w: 1, h: 1, act: 'sit', seats: SIT([0], 0.15), colors: true },
  hammock: { label: 'Rede', cat: 'quarto', w: 2, h: 1, act: 'bed', seats: SLEEP(0.5, -0.1) },
  teepee: { label: 'Cabana', cat: 'quarto', w: 2, h: 1, act: 'say', says: ['Esconderijo secreto ⛺', 'Ninguém me acha aqui!'] },
  basket: { label: 'Cesto de roupa', cat: 'quarto', w: 1, h: 1, act: 'say', says: ['Roupa pra lavar... 🧺', 'Depois eu dobro'] },
  coatrack: { label: 'Cabideiro', cat: 'quarto', w: 1, h: 1, act: 'wardrobe' },
  globe: { label: 'Globo', cat: 'quarto', w: 1, h: 1, act: 'say', says: ['Pra onde a gente viaja? 🌎', 'Girando o globo...'] },
  telescope: { label: 'Telescópio', cat: 'quarto', w: 1, h: 1, act: 'say', says: ['Olhando as estrelas 🔭', 'Vi um disco voador!'] },
  lavalamp: { label: 'Luminária de lava', cat: 'quarto', w: 1, h: 1, act: 'lamp', screen: { dx: 3, dy: 3, w: 4, h: 11, kind: 'lava' }, glow: { dx: 5, dy: 8, color: 'rgba(160,102,208,0.35)', size: 24 } },
  fan: { label: 'Ventilador', cat: 'quarto', w: 1, h: 1, act: 'fan', screen: { dx: 4, dy: 1, w: 10, h: 10, kind: 'fan' } },
  trophies: { label: 'Estante de troféus', cat: 'diversao', w: 2, h: 1, act: 'say', says: ['Campeão! 🏆', 'Esse foi suado'] },
  ballpit: { label: 'Piscina de bolinhas', cat: 'diversao', w: 2, h: 1, act: 'say', says: ['Pulando nas bolinhas! 🎈', 'Achei uma meia aqui dentro'] },
  cattree: { label: 'Arranhador', cat: 'bichos', w: 1, h: 1, act: 'say', says: ['O gato ama isso 🐾'] },
  'ruground:e86aa0:2': { label: 'Tapete redondo rosa', cat: 'tapetes', w: 2, h: 2, floor: true },
  'ruground:3a6db4:2': { label: 'Tapete redondo azul', cat: 'tapetes', w: 2, h: 2, floor: true },
  'ruground:e8b83a:2': { label: 'Tapete redondo amarelo', cat: 'tapetes', w: 2, h: 2, floor: true },
  'ruground:38a85a:3': { label: 'Tapete redondo verde grande', cat: 'tapetes', w: 3, h: 3, floor: true },
  'ruground:a066d0:3': { label: 'Tapete redondo roxo grande', cat: 'tapetes', w: 3, h: 3, floor: true },
  hangingplant: { label: 'Planta pendurada', cat: 'parede', wall: true, w: 1, py: 0, act: 'plant' },
  photos: { label: 'Varal de fotos', cat: 'parede', wall: true, w: 3, py: 3 },
  fairylights: { label: 'Pisca-pisca', cat: 'parede', wall: true, w: 3, py: 1, screen: { dx: 0, dy: 0, w: 48, h: 10, kind: 'fairy' } },
  worldmap: { label: 'Mapa-múndi', cat: 'parede', wall: true, w: 2, py: 4 },
  flag: { label: 'Bandeira do Brasil', cat: 'parede', wall: true, w: 2, py: 4 },
  glowstars: { label: 'Estrelas que brilham', cat: 'parede', wall: true, w: 3, py: 1, act: 'lamp', glow: { dx: 20, dy: 8, color: 'rgba(216,240,150,0.25)', size: 30 } },
  jukebox: { label: 'Jukebox', cat: 'diversao', w: 1, h: 1, act: 'music', screen: { dx: 4, dy: 7, w: 10, h: 7, kind: 'jukebox' } },
  mic: { label: 'Microfone', cat: 'diversao', w: 1, h: 1, act: 'live' },
  stage: { label: 'Palco', cat: 'tapetes', w: 4, h: 2, floor: true },
  ballot: { label: 'Urna de votação', cat: 'diversao', w: 1, h: 1, act: 'vote', hidden: true },
  sign: { label: 'Letreiro da turma', cat: 'parede', wall: true, w: 4, py: 1, act: 'lamp', hidden: true, glow: { dx: 31, dy: 9, color: 'rgba(255,138,192,0.3)', size: 60 } },
}

const RUG_SIZES = [[2, 1], [2, 2], [3, 2], [4, 2], [4, 3]]
const RUG_COLORS = ['e05252', '3a6db4', '38a85a', 'a066d0', 'e8b83a', 'e86aa0', 'e8915a', '6a7280']

/** Todas as opções do catálogo (com as variações de cor), na ordem em que aparecem. */
export const CATALOG = (() => {
  const list = []
  Object.entries(BASE).forEach(([key, spec]) => {
    const colors = spec.colors === true ? Object.values(COLORS) : spec.colors
    if (colors) {
      colors.forEach((color) =>
        list.push({
          ...spec, key: `${key}:${color}`, label: `${spec.label} ${colorNames[color] ?? PET_COLORS[color] ?? ''}`.trim(),
          color: `#${color}`, group: key, groupLabel: spec.label,
        }),
      )
    } else list.push({ ...spec, key, group: key, groupLabel: spec.label })
  })
  // bichinhos que passeiam (um por cor)
  Object.entries(PETS).forEach(([kind, pet]) =>
    pet.colors.forEach((color) =>
      list.push({
        key: `pet:${kind}:${color}`, label: pet.colors.length > 1 ? `${pet.label} ${colorNames[color] ?? PET_COLORS[color] ?? ''}`.trim() : pet.label,
        cat: 'bichos', w: 1, h: 1, act: 'pet', pet: { kind, color }, says: pet.says, color: `#${color}`, group: `pet:${kind}`, groupLabel: pet.label,
      }),
    ),
  )
  RUG_SIZES.forEach(([w, h]) =>
    RUG_COLORS.forEach((color) =>
      list.push({
        key: `rug:${color}:${w}:${h}`, label: `Tapete ${w}x${h} ${colorNames[color] ?? ''}`.trim(), cat: 'tapetes', w, h, floor: true,
        color: `#${color}`, group: `rug:${w}:${h}`, groupLabel: `Tapete ${w}x${h}`,
      }),
    ),
  )
  return list
})()

/** O catálogo agrupado: um cartão por móvel, com as cores como variações. */
export const GROUPS = (() => {
  const map = new Map()
  CATALOG.forEach((entry) => {
    if (entry.hidden) return
    if (!map.has(entry.group)) map.set(entry.group, { group: entry.group, label: entry.groupLabel ?? entry.label, cat: entry.cat, entries: [] })
    map.get(entry.group).entries.push(entry)
  })
  return [...map.values()]
})()

/** Próxima cor do mesmo móvel (ou null se ele só tem uma). */
export function nextVariant(key) {
  const entry = catalogEntry(key)
  const group = entry && GROUPS.find((g) => g.group === entry.group)
  if (!group || group.entries.length < 2) return null
  const i = group.entries.findIndex((e) => e.key === key)
  return group.entries[(i + 1) % group.entries.length].key
}
/** Versão virada para o outro lado (só para o que tem dois lados). */
const FLIPS = { 'chair:l': 'chair:r', 'chair:r': 'chair:l' }
export const flipped = (key) => FLIPS[key] ?? null

const BY_KEY = new Map(CATALOG.map((entry) => [entry.key, entry]))
export const catalogEntry = (key) => {
  if (BY_KEY.has(key)) return BY_KEY.get(key)
  // tapetes de qualquer tamanho (ex.: a passadeira do corredor)
  const [base, color, w, h] = String(key).split(':')
  if (base === 'rug' && Number(w) > 0 && Number(h) > 0) return { key, label: 'Tapete', cat: 'tapetes', w: Number(w), h: Number(h), floor: true, color: `#${color}` }
  return null
}

/** Paredes e chãos que a pessoa pode escolher para o quarto. */
export const WALLS = [
  { id: 'creme', label: 'Creme', base: '#e9dcc0', stripe: '#e0cfae' },
  { id: 'azul', label: 'Azul', base: '#bcd4ea', stripe: '#aec8e0' },
  { id: 'rosa', label: 'Rosa', base: '#f2cfdc', stripe: '#e8bfce' },
  { id: 'verde', label: 'Verde', base: '#cfe6c8', stripe: '#c0dab8' },
  { id: 'lilas', label: 'Lilás', base: '#d8cfee', stripe: '#cbc0e4' },
  { id: 'cinza', label: 'Cinza', base: '#cfd3da', stripe: '#c2c7d0' },
  { id: 'escuro', label: 'Escuro', base: '#3a4156', stripe: '#333a4e' },
  { id: 'amarelo', label: 'Amarelo', base: '#f2e2a8', stripe: '#e8d694' },
]
export const FLOORS = [
  { id: 'madeira', label: 'Madeira', tones: ['#c4925e', '#bc8a56', '#c99a64', '#b88552'], seam: '#9a6a40' },
  { id: 'escura', label: 'Madeira escura', tones: ['#7a4c2a', '#724626', '#80522e', '#6e4424'], seam: '#4a2c18' },
  { id: 'clara', label: 'Madeira clara', tones: ['#e2c08e', '#dab886', '#e6c694', '#d6b482'], seam: '#b8945e' },
  { id: 'piso', label: 'Piso branco', tile: true, tones: ['#e8eef2', '#dde4ea'], seam: '#b9c3cc' },
  { id: 'xadrez', label: 'Xadrez', tile: true, tones: ['#f6f1e6', '#2b2f3c'], seam: '#1a1424' },
  { id: 'carpete', label: 'Carpete azul', carpet: true, tones: ['#4d6fa0', '#4a6a9a'], seam: '#3f5e8a' },
  { id: 'carpete-rosa', label: 'Carpete rosa', carpet: true, tones: ['#d88aa8', '#d284a2'], seam: '#c07090' },
]

/** Monta um móvel pronto para a cena a partir da chave do catálogo e da posição. */
// A parede ganhou uma faixa extra em cima (WALL_TOP). Os enfeites sobem junto para ficarem no meio do papel de parede
// e longe do topo dos móveis; os que ficam pendurados (bandeirinhas, pisca-pisca...) sobem até o teto. A porta não muda.
const HANGING = ['garland', 'fairylights', 'hangingplant', 'glowstars', 'photos']
function wallLift(key, entry) {
  if (key === 'door') return 0
  return HANGING.includes(key) ? WALL_TOP : Math.round(WALL_TOP / 2)
}

export function buildItem(key, x, y, id, override = {}) {
  const found = catalogEntry(key)
  if (!found) return null
  const entry = { ...found, ...override }
  const sprite = getSprite(key)
  const sw = sprite?.width ?? entry.w * TILE
  const sh = sprite?.height ?? entry.h * TILE
  const item = {
    id, key, sprite: key, label: entry.label, act: entry.act, says: entry.says, w: entry.w, h: entry.h ?? 1, x, y,
    solid: !entry.floor && !entry.wall && !entry.pet, floor: !!entry.floor, wall: !!entry.wall,
  }
  if (entry.pet) item.pet = entry.pet
  if (entry.wall) {
    item.px = x * TILE + Math.round((entry.w * TILE - sw) / 2)
    item.py = (entry.py ?? 4) - wallLift(key, entry)
  }
  const left = entry.wall ? item.px : x * TILE + Math.round((entry.w * TILE - sw) / 2)
  const top = entry.wall ? item.py : (y + item.h) * TILE - sh
  if (entry.seats) item.seats = entry.seats.map((seat) => ({ ...seat, x: x + seat.dx, y: y + seat.dy }))
  if (entry.screen) item.screen = { ...entry.screen, x: left + entry.screen.dx, y: top + entry.screen.dy }
  if (entry.glow) item.glow = { ...entry.glow, x: left + entry.glow.dx, y: top + entry.glow.dy }
  if (override.range) item.range = override.range
  return item
}

/** Miniatura do móvel (para os botões do catálogo). */
const thumbs = new Map()
export function catalogThumb(key) {
  if (!thumbs.has(key)) {
    const sprite = getSprite(key)
    thumbs.set(key, sprite ? sprite.toDataURL() : '')
  }
  return thumbs.get(key)
}
