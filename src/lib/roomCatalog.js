// Catálogo de móveis do "modo decorar". Cada móvel tem uma chave ("sofa:e05252" = sofá vermelho),
// o tamanho no chão (w x h quadradinhos) e o que acontece ao tocar nele (act).
// Telas, luzes e lugares para sentar são relativos ao próprio móvel; buildItem converte para a posição na sala.
import { TILE, WALL_TOP } from './room'
import { PETS } from './roomPets'
import { getSprite } from './roomSprites'
import { WALL_STYLES } from './roomSprites3'

export const CATEGORIES = [
  { id: 'sala', label: 'Sala' },
  { id: 'quarto', label: 'Quarto' },
  { id: 'cozinha', label: 'Cozinha e banho' },
  { id: 'diversao', label: 'Diversão' },
  { id: 'bichos', label: 'Bichinhos' },
  { id: 'plantas', label: 'Plantas' },
  { id: 'parede', label: 'Parede' },
  { id: 'tapetes', label: 'Tapetes' },
  { id: 'divisorias', label: 'Paredes e portas' },
]

const COLORS = { vermelho: 'e05252', azul: '3a6db4', verde: '38a85a', roxo: 'a066d0', amarelo: 'e8b83a', rosa: 'e86aa0', cinza: '6a7280', laranja: 'e8915a' }
const PET_COLORS = { e8915a: 'laranja', '6a7280': 'cinza', '1f1a1a': 'preto', f6f1e6: 'branco', c8904a: 'caramelo', '8a5a34': 'marrom', e8b070: 'dourado', f2c14e: 'amarelo', '2b2f3c': 'preto', e8eef2: 'branco' }
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
  // ---- temas da sala da turma (um por dia da semana); também dá para usar no quarto
  cafecounter: { label: 'Balcão de café', cat: 'cozinha', w: 3, h: 1, act: 'cook' },
  pastrycase: { label: 'Vitrine de doces', cat: 'cozinha', w: 2, h: 1, act: 'say', says: ['Peguei um brigadeiro 🍫', 'Um pedaço de bolo, por favor 🍰', 'Esse croissant tá quentinho 🥐'] },
  chalkboard: { label: 'Quadro de giz', cat: 'parede', wall: true, w: 2, py: 4, act: 'menu' },
  cinemascreen: { label: 'Telão de cinema', cat: 'parede', wall: true, w: 8, py: 0, act: 'tv', on: true, screen: { dx: 16, dy: 5, w: 96, h: 22, kind: 'tv' } },
  cinemaseat: { label: 'Poltrona de cinema', cat: 'sala', w: 1, h: 1, act: 'sit', seats: SIT_BACK([0], -0.7), colors: ['c83a4a', '3a6db4', 'a066d0', '2b2f3c'] },
  popcorn: { label: 'Máquina de pipoca', cat: 'cozinha', w: 1, h: 1, act: 'say', says: ['Pipoca quentinha 🍿', 'Com bastante manteiga!', 'Pipoca doce ou salgada?'], screen: { dx: 1, dy: 5, w: 16, h: 13, kind: 'popcorn' } },
  ticketbooth: { label: 'Bilheteria', cat: 'diversao', w: 2, h: 1, act: 'say', says: ['Um ingresso pra sessão das 8 🎟️', 'Meia-entrada, por favor', 'Sessão esgotada! 😱'] },
  candycounter: { label: 'Bomboniere', cat: 'cozinha', w: 2, h: 1, act: 'say', says: ['Comprei umas balinhas 🍬', 'Chocolate pro filme 🍫'] },
  sconce: { label: 'Arandela', cat: 'parede', wall: true, w: 1, py: 6, act: 'lamp', glow: { dx: 5, dy: 3, color: 'rgba(255,210,130,0.35)', size: 22 } },
  scoreboard: { label: 'Painel de recordes', cat: 'parede', wall: true, w: 3, py: 2, act: 'say', says: ['Bati o recorde! 🏆', 'Meu nome tá no TOP 3!', 'Um dia eu chego lá...'] },
  airhockey: { label: 'Air hockey', cat: 'diversao', w: 3, h: 1, act: 'say', says: ['Gol! 🏒', 'Defendi!', 'Esse disco é muito rápido'] },
  prizecounter: { label: 'Troca de prêmios', cat: 'diversao', w: 3, h: 1, act: 'say', says: ['Troquei 500 fichas por um chaveiro 🔑', 'Quero aquele urso gigante!', 'Faltam 2000 fichas...'] },
  palm: { label: 'Coqueiro', cat: 'plantas', w: 1, h: 1, act: 'say', says: ['Caiu um coco! 🥥', 'Sombra boa'] },
  campfire: { label: 'Fogueira', cat: 'diversao', w: 2, h: 1, act: 'fire', screen: { dx: 8, dy: 3, w: 16, h: 13, kind: 'fire' }, glow: { dx: 16, dy: 12, color: 'rgba(255,150,60,0.45)', size: 56 } },
  log: { label: 'Tronco para sentar', cat: 'sala', w: 2, h: 1, act: 'sit', seats: SIT([0.05, 0.95], 0.2) },
  parasol: { label: 'Guarda-sol', cat: 'diversao', w: 2, h: 1, colors: ['e05252', '3a6db4', 'f2c14e', '38a85a'] },
  beachtowel: { label: 'Canga', cat: 'tapetes', w: 1, h: 2, floor: true, colors: ['e86aa0', '5eead4', 'f2c14e', '3a6db4'] },
  juicestand: { label: 'Quiosque de sucos', cat: 'cozinha', w: 3, h: 1, act: 'say', says: ['Um suco de maracujá 🥤', 'Água de coco geladinha 🥥', 'Açaí com granola! 🍇'] },
  cooler: { label: 'Cooler', cat: 'cozinha', w: 1, h: 1, act: 'say', says: ['Peguei um refri gelado 🥤', 'Só tem gelo aqui...'] },
  sandcastle: { label: 'Castelo de areia', cat: 'diversao', w: 1, h: 1, act: 'say', says: ['Meu castelo! 🏰', 'Não pisa!'] },
  surfboard: { label: 'Prancha de surfe', cat: 'diversao', w: 1, h: 1, act: 'say', says: ['Bora pegar onda 🏄', 'O mar tá flat hoje'] },
  ledwall: { label: 'Telão de LED', cat: 'parede', wall: true, w: 6, py: 2, act: 'music', screen: { dx: 2, dy: 2, w: 92, h: 22, kind: 'eq' } },
  djbooth: { label: 'Cabine de DJ', cat: 'diversao', w: 4, h: 1, act: 'music' },
  discoball: { label: 'Globo espelhado', cat: 'parede', wall: true, w: 1, py: 0, screen: { dx: 2, dy: 6, w: 12, h: 14, kind: 'disco' } },
  tree: { label: 'Árvore grande', cat: 'plantas', w: 2, h: 1, act: 'say', says: ['Que sombra gostosa 🌳', 'Tem um passarinho ali!'] },
  swing: { label: 'Balanço', cat: 'diversao', w: 1, h: 1, act: 'sit', seats: SIT([0], -0.15) },
  picnic: { label: 'Toalha de piquenique', cat: 'tapetes', w: 4, h: 3, floor: true },
  picnicbasket: { label: 'Cesta de piquenique', cat: 'cozinha', w: 1, h: 1, act: 'say', says: ['Sanduíche de queijo 🥪', 'Quem trouxe o suco? 🧃', 'Tem bolo de cenoura! 🥕'] },
  pond: { label: 'Laguinho', cat: 'plantas', w: 5, h: 3, act: 'say', says: ['Os patos estão nadando 🦆', 'Olha o reflexo!', 'Joguei uma pedrinha'], screen: { dx: 4, dy: 2, w: 72, h: 44, kind: 'pond' } },
  veggies: { label: 'Horta', cat: 'plantas', w: 3, h: 1, act: 'plant' },
  grill: { label: 'Churrasqueira', cat: 'cozinha', w: 1, h: 1, act: 'cook' },
  // ---- coleção grande de decoração do quarto
  sakura: { label: 'Cerejeira', cat: 'plantas', w: 1, h: 1, act: 'plant' },
  kotatsu: { label: 'Kotatsu', cat: 'sala', w: 2, h: 1, act: 'say', says: ['Quentinho debaixo do kotatsu ♨️', 'Uma tangerina? 🍊', 'Daqui eu não saio mais'] },
  lanternpaper: { label: 'Lanterna de papel', cat: 'parede', wall: true, w: 1, py: 0, act: 'lamp', colors: ['e05252', 'f2c14e', 'e86aa0'], glow: { dx: 7, dy: 13, color: 'rgba(255,190,120,0.35)', size: 22 } },
  racingsim: { label: 'Simulador de corrida', cat: 'diversao', w: 2, h: 1, act: 'say', says: ['Vrummm! 🏎️', 'Ultrapassagem na curva!', 'Bati no muro 😵'], screen: { dx: 1, dy: 1, w: 34, h: 8, kind: 'race' } },
  streamsetup: { label: 'Setup de streamer', cat: 'diversao', w: 2, h: 1, act: 'live', on: true, glow: { dx: 6, dy: 6, color: 'rgba(255,246,208,0.4)', size: 22 } },
  robotbuddy: { label: 'Robozinho', cat: 'quarto', w: 1, h: 1, act: 'say', says: ['Bip bop! Olá, humano 🤖', 'Calculando... 42', 'Quer jogar xadrez?'], screen: { dx: 4, dy: 5, w: 8, h: 5, kind: 'robot' } },
  rockinghorse: { label: 'Cavalinho de balanço', cat: 'quarto', w: 1, h: 1, act: 'sit', seats: SIT([0], -0.2) },
  slide: { label: 'Escorregador', cat: 'diversao', w: 2, h: 1, act: 'say', says: ['Weee! 🛝', 'De novo, de novo!'] },
  toybox: { label: 'Baú de brinquedos', cat: 'quarto', w: 1, h: 1, act: 'say', says: ['Achei meu carrinho! 🚗', 'Quanta bagunça...', 'Um ioiô! 🪀'] },
  balloons: { label: 'Balões', cat: 'diversao', w: 1, h: 1, act: 'say', says: ['Balões! 🎈', 'Não solta!', 'É festa? 🎉'], screen: { dx: 0, dy: 13, w: 20, h: 12, kind: 'balloon' } },
  blocks: { label: 'Blocos de montar', cat: 'quarto', w: 1, h: 1, act: 'say', says: ['A, B, C... 🔤', 'Construí uma torre!'] },
  amp: { label: 'Amplificador', cat: 'diversao', w: 1, h: 1, act: 'guitar' },
  recordshelf: { label: 'Estante de discos', cat: 'sala', w: 2, h: 1, act: 'music' },
  saguaro: { label: 'Cacto gigante', cat: 'plantas', w: 1, h: 1, act: 'plant' },
  terrarium: { label: 'Terrário', cat: 'plantas', w: 1, h: 1, act: 'plant' },
  fountain: { label: 'Chafariz', cat: 'plantas', w: 2, h: 1, act: 'say', says: ['Fiz um pedido 🪙', 'Que barulhinho bom de água'], screen: { dx: 4, dy: 0, w: 24, h: 18, kind: 'fountain' } },
  labbench: { label: 'Bancada de experimentos', cat: 'quarto', w: 2, h: 1, act: 'say', says: ['Eureka! 🧪', 'Ops, ficou verde...', 'Experimento em andamento ⚗️'], screen: { dx: 0, dy: -6, w: 32, h: 12, kind: 'bubbles' } },
  grandclock: { label: 'Relógio de pêndulo', cat: 'sala', w: 1, h: 1, act: 'clock', screen: { dx: 4, dy: 17, w: 8, h: 19, kind: 'pendulum' } },
  moonlamp: { label: 'Luminária de lua', cat: 'parede', wall: true, w: 1, py: 4, act: 'lamp', glow: { dx: 8, dy: 8, color: 'rgba(255,240,180,0.35)', size: 24 } },
  dreamcatcher: { label: 'Filtro dos sonhos', cat: 'parede', wall: true, w: 1, py: 2 },
  jerseyframe: { label: 'Camisa emoldurada', cat: 'parede', wall: true, w: 1, py: 4 },
  controllerswall: { label: 'Controles na parede', cat: 'parede', wall: true, w: 2, py: 6, act: 'say', says: ['Quem joga comigo? 🎮', 'Esse é o controle da sorte'] },
  skatewall: { label: 'Skates na parede', cat: 'parede', wall: true, w: 2, py: 0 },
  plantwall: { label: 'Jardim vertical', cat: 'parede', wall: true, w: 2, py: 2, act: 'plant' },
  recordswall: { label: 'Discos na parede', cat: 'parede', wall: true, w: 2, py: 6, act: 'music' },
  'neon:5': { label: 'Neon controle', cat: 'parede', wall: true, w: 2, py: 6, act: 'lamp', glow: { dx: 12, dy: 7, color: 'rgba(56,210,122,0.4)', size: 26 } },
  'neon:6': { label: 'Neon nota musical', cat: 'parede', wall: true, w: 2, py: 6, act: 'lamp', glow: { dx: 12, dy: 7, color: 'rgba(255,138,192,0.4)', size: 26 } },
  rugheart: { label: 'Tapete coração', cat: 'tapetes', w: 2, h: 2, floor: true, colors: ['e86aa0', 'e05252', 'a066d0'] },
  rugstar: { label: 'Tapete estrela', cat: 'tapetes', w: 3, h: 3, floor: true, colors: ['f2c14e', '5eead4'] },
  rugcat: { label: 'Tapete gatinho', cat: 'tapetes', w: 3, h: 2, floor: true },
  teletv: { label: 'Telão', cat: 'parede', wall: true, w: 5, py: -5, act: 'dj', hidden: true, screen: { dx: 3, dy: 3, w: 62, h: 35, kind: 'teletv' } },
  teletvwood: { label: 'Telão', cat: 'parede', wall: true, w: 5, py: -5, act: 'dj', hidden: true, screen: { dx: 3, dy: 3, w: 62, h: 35, kind: 'teletv' } },
  teletvcine: { label: 'Telão', cat: 'parede', wall: true, w: 8, py: -5, act: 'dj', hidden: true, screen: { dx: 33, dy: 3, w: 62, h: 35, kind: 'teletv' } },
  djnpc: { label: 'DJ Creche', cat: 'diversao', w: 1, h: 1, act: 'dj', hidden: true },
  // ---- estação espacial (corredor)
  doorsci: { label: 'Porta de nave', cat: 'parede', wall: true, w: 1, py: 2, hidden: true, colors: ['5eead4', 'e05252', '3a6db4', '38a85a', 'a066d0', 'e8b83a', 'e86aa0', 'e8915a', '6a7280'] },
  'porthole:0': { label: 'Escotilha (planeta laranja)', cat: 'parede', wall: true, w: 1, py: 4 },
  'porthole:1': { label: 'Escotilha (Terra)', cat: 'parede', wall: true, w: 1, py: 4 },
  'porthole:2': { label: 'Escotilha (lua roxa)', cat: 'parede', wall: true, w: 1, py: 4 },
  'porthole:3': { label: 'Escotilha (nebulosa)', cat: 'parede', wall: true, w: 1, py: 4 },
  lightbar: { label: 'Barra de luz', cat: 'parede', wall: true, w: 3, py: 0, on: true, glow: { dx: 24, dy: 6, color: 'rgba(160,248,240,0.35)', size: 34 } },
  'conveyor:4': { label: 'Esteira rolante', cat: 'tapetes', w: 4, h: 1, floor: true, screen: { dx: 0, dy: 4, w: 64, h: 8, kind: 'conveyor' } },
  teleport: { label: 'Teletransporte', cat: 'diversao', w: 2, h: 1, passable: true, act: 'teleport', colors: ['a066d0', '5eead4', 'e86aa0'], screen: { dx: 4, dy: -14, w: 24, h: 24, kind: 'teleport' }, glow: { dx: 16, dy: 6, color: 'rgba(160,248,240,0.3)', size: 30 } },
  hologram: { label: 'Holograma', cat: 'diversao', w: 3, h: 1, act: 'say', says: ['Planeta Creche, a 3 anos-luz daqui 🪐', 'Mapa estelar carregado ✨', 'Detectei vida inteligente... acho'], on: true, screen: { dx: 8, dy: 0, w: 32, h: 22, kind: 'hologram' }, glow: { dx: 24, dy: 12, color: 'rgba(94,234,212,0.3)', size: 36 } },
  podchair: { label: 'Poltrona-ovo', cat: 'sala', w: 1, h: 1, act: 'sit', seats: SIT([0], 0.05), colors: ['e86aa0', '5eead4', 'f2c14e', 'a066d0'] },
  spacesuit: { label: 'Traje de astronauta', cat: 'quarto', w: 1, h: 1, act: 'say', says: ['Um pequeno passo... 🧑‍🚀', 'Cabe em mim?', 'O capacete tá embaçado'] },
  rocket: { label: 'Foguete', cat: 'diversao', w: 1, h: 1, act: 'say', says: ['3, 2, 1... decolar! 🚀', 'Próxima parada: Lua 🌙'] },
  alienplant: { label: 'Planta alienígena', cat: 'plantas', w: 1, h: 1, act: 'plant' },
  foodcapsule: { label: 'Comida de astronauta', cat: 'cozinha', w: 1, h: 1, act: 'say', says: ['Sorvete liofilizado! 🍦', 'Pizza em cápsula 🍕', 'Tem gosto de... espaço'] },
  // ---- corredor divertido
  vending: { label: 'Máquina de refri', cat: 'cozinha', w: 1, h: 1, act: 'vending', glow: { dx: 9, dy: 16, color: 'rgba(255,120,120,0.22)', size: 26 } },
  claw: { label: 'Máquina de pelúcia', cat: 'diversao', w: 1, h: 1, act: 'claw', screen: { dx: 1, dy: 9, w: 18, h: 12, kind: 'claw' }, glow: { dx: 10, dy: 4, color: 'rgba(232,106,160,0.3)', size: 24 } },
  photobooth: { label: 'Cabine de fotos', cat: 'diversao', w: 2, h: 1, act: 'photo' },
  mailboxes: { label: 'Caixas de correio', cat: 'sala', w: 2, h: 1, act: 'say', says: ['Chegou uma carta pra você 💌', 'Só propaganda...', 'Um bilhete: "valeu pela resenha!"'] },
  lostfound: { label: 'Achados e perdidos', cat: 'quarto', w: 1, h: 1, act: 'say', says: ['Achei uma meia sem par 🧦', 'Um controle remoto?!', 'Isso é de quem? 🤔', 'Um ingresso de cinema velho 🎟️'] },
  bench: { label: 'Banco de praça', cat: 'sala', w: 2, h: 1, act: 'sit', seats: SIT([0.05, 0.95]) },
  doormat: { label: 'Capacho', cat: 'tapetes', w: 1, h: 1, floor: true, colors: true },
  hopscotch: { label: 'Amarelinha', cat: 'tapetes', w: 2, h: 3, floor: true },
  'dancefloor:5:3': { label: 'Pista de dança', cat: 'diversao', w: 5, h: 3, floor: true, screen: { dx: 0, dy: 0, w: 80, h: 48, kind: 'dance' } },
  'dancefloor:3:2': { label: 'Pista de dança pequena', cat: 'diversao', w: 3, h: 2, floor: true, screen: { dx: 0, dy: 0, w: 48, h: 32, kind: 'dance' } },
  // ---- paredes internas e portas (para fazer banheiro, closet, cozinha separada...)
  wallh: { label: 'Parede (1)', cat: 'divisorias', w: 1, h: 1, styles: true },
  wallh2: { label: 'Parede (2)', cat: 'divisorias', w: 2, h: 1, styles: true },
  wallh4: { label: 'Parede (4)', cat: 'divisorias', w: 4, h: 1, styles: true },
  wallv: { label: 'Parede em pé (1)', cat: 'divisorias', w: 1, h: 1, styles: true },
  wallv3: { label: 'Parede em pé (3)', cat: 'divisorias', w: 1, h: 3, styles: true },
  doorin: { label: 'Porta aberta', cat: 'divisorias', w: 1, h: 1, passable: true, colors: ['8a5a34', 'f6f1e6', '3a6db4', 'e05252', '38a85a', '2b2f3c'] },
  doorclosed: { label: 'Porta', cat: 'divisorias', w: 1, h: 1, passable: true, act: 'say', says: ['Toc toc! 🚪', 'Tem alguém aí?'], colors: ['8a5a34', 'f6f1e6', '3a6db4', 'e05252', '38a85a', '2b2f3c'] },
  archway: { label: 'Vão aberto', cat: 'divisorias', w: 1, h: 1, passable: true, styles: true },
  beads: { label: 'Cortina de miçangas', cat: 'divisorias', w: 1, h: 1, passable: true },
  'tilepatch:eef3f6:2:2': { label: 'Piso de azulejo 2x2', cat: 'divisorias', w: 2, h: 2, floor: true },
  'tilepatch:eef3f6:3:3': { label: 'Piso de azulejo 3x3', cat: 'divisorias', w: 3, h: 3, floor: true },
  'tilepatch:eef3f6:4:3': { label: 'Piso de azulejo 4x3', cat: 'divisorias', w: 4, h: 3, floor: true },
  'tilepatch:bcd4ea:3:3': { label: 'Piso azul 3x3', cat: 'divisorias', w: 3, h: 3, floor: true },
  'tilepatch:3a3f4c:3:3': { label: 'Piso escuro 3x3', cat: 'divisorias', w: 3, h: 3, floor: true },
  // ---- lote 3 de decoração
  loveseat: { label: 'Namoradeira', cat: 'sala', w: 2, h: 1, act: 'sit', seats: SIT([0.05, 0.95]), colors: true },
  rocker: { label: 'Cadeira de balanço', cat: 'sala', w: 1, h: 1, act: 'sit', seats: SIT([0]) },
  lamparc: { label: 'Luminária de arco', cat: 'sala', w: 1, h: 1, act: 'lamp', glow: { dx: 6, dy: 6, size: 30 } },
  shelfcube: { label: 'Estante de nichos', cat: 'sala', w: 2, h: 1, act: 'books' },
  bookstack: { label: 'Pilha de livros', cat: 'sala', w: 1, h: 1, act: 'books' },
  radio: { label: 'Rádio antigo', cat: 'sala', w: 1, h: 1, act: 'music' },
  vase: { label: 'Vaso decorativo', cat: 'sala', w: 1, h: 1, act: 'say', says: ['Que vaso chique ✨', 'Cuidado pra não derrubar!'] },
  bedcanopy: { label: 'Cama com dossel', cat: 'quarto', w: 2, h: 2, act: 'bed', seats: SLEEP(0.5, 0.45), colors: true },
  futon: { label: 'Futon', cat: 'quarto', w: 2, h: 1, act: 'bed', seats: SLEEP(0.5, -0.25), colors: true },
  easel: { label: 'Cavalete de pintura', cat: 'quarto', w: 1, h: 1, act: 'say', says: ['Pintando uma obra-prima 🎨', 'Faltou tinta azul...', 'Ficou lindo!'] },
  dino: { label: 'Dinossauro de pelúcia', cat: 'quarto', w: 1, h: 1, act: 'say', says: ['RAWR! 🦖', 'Abraço de dinossauro'] },
  skate: { label: 'Skate', cat: 'quarto', w: 1, h: 1, act: 'say', says: ['Bora andar de skate 🛹', 'Quase acertei o kickflip'] },
  bike: { label: 'Bicicleta', cat: 'quarto', w: 2, h: 1, act: 'say', says: ['Partiu pedalar 🚲', 'Pneu murcho de novo...'] },
  fishbowl: { label: 'Aquário de peixinho', cat: 'bichos', w: 1, h: 1, act: 'say', says: ['Blub blub 🐠', 'O peixinho deu uma voltinha'] },
  hamster: { label: 'Gaiola de hamster', cat: 'bichos', w: 1, h: 1, act: 'say', says: ['O hamster tá correndo na rodinha 🐹', 'Que bochechudo!'] },
  birdcage: { label: 'Gaiola de passarinho', cat: 'bichos', w: 1, h: 1, act: 'say', says: ['Piu piu! 🐦', 'Ele assobiou uma música'] },
  coffeemaker: { label: 'Cafeteira', cat: 'cozinha', w: 1, h: 1, act: 'cook' },
  bar: { label: 'Balcão de bar', cat: 'cozinha', w: 2, h: 1, act: 'coffee' },
  washer: { label: 'Máquina de lavar', cat: 'cozinha', w: 1, h: 1, act: 'say', says: ['Lavando roupa 🧺', 'Centrifugando... vrrrr'] },
  shower: { label: 'Box com chuveiro', cat: 'cozinha', w: 1, h: 1, act: 'say', says: ['Banho quentinho 🚿', 'Cantando no chuveiro 🎤'] },
  watercooler: { label: 'Bebedouro', cat: 'cozinha', w: 1, h: 1, act: 'say', says: ['Hidratando 💧', 'Água geladinha!'] },
  keyboard: { label: 'Teclado musical', cat: 'diversao', w: 2, h: 1, act: 'piano' },
  foosball: { label: 'Pebolim', cat: 'diversao', w: 2, h: 1, act: 'say', says: ['Gooool! ⚽', 'Não vale girar!', 'Frango!'] },
  pingpong: { label: 'Pingue-pongue', cat: 'diversao', w: 3, h: 1, act: 'say', says: ['Ping... pong! 🏓', 'Saque mortal!', 'Bateu na rede'] },
  dartboard: { label: 'Alvo de dardos', cat: 'parede', wall: true, w: 1, py: 4, act: 'say', says: ['Na mosca! 🎯', 'Errei feio...'] },
  hoop: { label: 'Cesta de basquete', cat: 'parede', wall: true, w: 1, py: 2, act: 'say', says: ['Cesta de três! 🏀', 'Bateu no aro...'] },
  tapestry: { label: 'Tapeçaria', cat: 'parede', wall: true, w: 2, py: 2 },
  guitarwall: { label: 'Guitarra na parede', cat: 'parede', wall: true, w: 1, py: 0, act: 'guitar' },
  shelfplants: { label: 'Prateleira com plantas', cat: 'parede', wall: true, w: 2, py: 2, act: 'plant' },
  'neon:3': { label: 'Neon lua', cat: 'parede', wall: true, w: 2, py: 6, act: 'lamp', glow: { dx: 12, dy: 7, color: 'rgba(200,180,255,0.4)', size: 26 } },
  'neon:4': { label: 'Neon raio', cat: 'parede', wall: true, w: 2, py: 6, act: 'lamp', glow: { dx: 12, dy: 7, color: 'rgba(242,193,78,0.45)', size: 26 } },
  monstera: { label: 'Costela-de-adão', cat: 'plantas', w: 1, h: 1, act: 'plant' },
  bonsai: { label: 'Bonsai', cat: 'plantas', w: 1, h: 1, act: 'plant' },
  sunflower: { label: 'Girassol', cat: 'plantas', w: 1, h: 1, act: 'plant' },
  planter: { label: 'Floreira', cat: 'plantas', w: 2, h: 1, act: 'plant' },
  'rugcheck:e05252:3:2': { label: 'Tapete xadrez vermelho', cat: 'tapetes', w: 3, h: 2, floor: true },
  'rugcheck:38a85a:3:2': { label: 'Tapete xadrez verde', cat: 'tapetes', w: 3, h: 2, floor: true },
  'rugcheck:2b2f3c:4:3': { label: 'Tapete xadrez preto grande', cat: 'tapetes', w: 4, h: 3, floor: true },
  'rugstripe:3a6db4:3:2': { label: 'Tapete listrado azul', cat: 'tapetes', w: 3, h: 2, floor: true },
  'rugstripe:e86aa0:3:2': { label: 'Tapete listrado rosa', cat: 'tapetes', w: 3, h: 2, floor: true },
  'rugstripe:e8915a:4:3': { label: 'Tapete listrado laranja grande', cat: 'tapetes', w: 4, h: 3, floor: true },
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
    if (spec.styles) {
      Object.entries(WALL_STYLES).forEach(([id, style]) =>
        list.push({ ...spec, key: `${key}:${id}`, label: `${spec.label} ${style.label}`, color: style.swatch, group: key, groupLabel: spec.label }),
      )
      return
    }
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
  { id: 'menta', label: 'Menta', base: '#cfe9df', stripe: '#c0dfd3' },
  { id: 'vinho', label: 'Vinho', base: '#4a2030', stripe: '#552838' },
  { id: 'neon', label: 'Noite neon', base: '#1e1a34', stripe: '#252040' },
  { id: 'praia', label: 'Praia (pôr do sol)', base: '#f2905a', stripe: '#f2905a', scenery: 'beach' },
  { id: 'jardim', label: 'Jardim (céu e cerca)', base: '#9fd4f2', stripe: '#9fd4f2', scenery: 'garden' },
  { id: 'estacao', label: 'Estação espacial', base: '#2b3346', stripe: '#2b3346', scenery: 'station' },
  { id: 'tijolos', label: 'Tijolinho', base: '#b4583a', stripe: '#d8a080', scenery: 'brick' },
  { id: 'lambri', label: 'Madeira', base: '#a87a52', stripe: '#a87a52', scenery: 'planks' },
  { id: 'estrelado', label: 'Céu estrelado', base: '#1e2a5a', stripe: '#28356a', pattern: 'stars' },
  { id: 'bolinhas', label: 'Bolinhas', base: '#f6d6e2', stripe: '#ffffff', pattern: 'dots' },
  { id: 'vichy', label: 'Xadrez vichy', base: '#dbe8f6', stripe: '#c4d8f0', pattern: 'gingham' },
  { id: 'arco-iris', label: 'Arco-íris', base: '#f6f1e6', stripe: '#f6f1e6', pattern: 'rainbow' },
  { id: 'cidade', label: 'Cidade à noite', base: '#1b1f3a', stripe: '#1b1f3a', scenery: 'city' },
  { id: 'floresta', label: 'Floresta', base: '#bfe3f2', stripe: '#bfe3f2', scenery: 'forest' },
  { id: 'oceano', label: 'Fundo do mar', base: '#3a92cc', stripe: '#3a92cc', scenery: 'ocean' },
]
export const FLOORS = [
  { id: 'madeira', label: 'Madeira', tones: ['#c4925e', '#bc8a56', '#c99a64', '#b88552'], seam: '#9a6a40' },
  { id: 'escura', label: 'Madeira escura', tones: ['#7a4c2a', '#724626', '#80522e', '#6e4424'], seam: '#4a2c18' },
  { id: 'clara', label: 'Madeira clara', tones: ['#e2c08e', '#dab886', '#e6c694', '#d6b482'], seam: '#b8945e' },
  { id: 'piso', label: 'Piso branco', tile: true, tones: ['#e8eef2', '#dde4ea'], seam: '#b9c3cc' },
  { id: 'xadrez', label: 'Xadrez', tile: true, tones: ['#f6f1e6', '#2b2f3c'], seam: '#1a1424' },
  { id: 'xadrez-lilas', label: 'Xadrez lilás', tile: true, tones: ['#efe6f6', '#d6c6ea'], seam: '#c2b0da' },
  { id: 'arcade', label: 'Xadrez fliperama', tile: true, tones: ['#2b2f3c', '#4a3a78'], seam: '#1a1424' },
  { id: 'balada', label: 'Piso de balada', tile: true, tones: ['#24243a', '#1c1c2e'], seam: '#4a3a78' },
  { id: 'carpete-vinho', label: 'Carpete vinho', carpet: true, tones: ['#7a2232', '#74202f'], seam: '#5a1826' },
  { id: 'areia', label: 'Areia', sand: true, tones: ['#ecd49c', '#e4ca90'], seam: '#d2b47a' },
  { id: 'metal', label: 'Metal', tile: true, tones: ['#59647a', '#535e73'], seam: '#3e475a' },
  { id: 'tacos', label: 'Tacos de madeira', pattern: 'parquet', tones: ['#c4925e', '#d2a06a'], seam: '#8a5a34' },
  { id: 'marmore', label: 'Mármore', pattern: 'marble', tones: ['#eef0f2', '#c8ced6'], seam: '#d4d9e0' },
  { id: 'hidraulico', label: 'Ladrilho hidráulico', pattern: 'mosaic', tones: ['#f6f1e6', '#4d7fc6', '#e8915a'], seam: '#d8d0c0' },
  { id: 'tatame', label: 'Tatame', pattern: 'tatami', tones: ['#cfd8a0', '#c4ce94'], seam: '#6a7a3a' },
  { id: 'deck', label: 'Deck de madeira', pattern: 'deck', tones: ['#a87a52', '#9c6e48'], seam: '#6a4426' },
  { id: 'carpete-cinza', label: 'Carpete cinza', carpet: true, tones: ['#8a909c', '#848a96'], seam: '#6a707c' },
  { id: 'grama', label: 'Grama', grass: true, tones: ['#7cc06a', '#74b862'], seam: '#5ea050' },
  { id: 'carpete', label: 'Carpete azul', carpet: true, tones: ['#4d6fa0', '#4a6a9a'], seam: '#3f5e8a' },
  { id: 'carpete-rosa', label: 'Carpete rosa', carpet: true, tones: ['#d88aa8', '#d284a2'], seam: '#c07090' },
]

/** Monta um móvel pronto para a cena a partir da chave do catálogo e da posição. */
// A parede ganhou uma faixa extra em cima (WALL_TOP). Os enfeites sobem junto para ficarem no meio do papel de parede
// e longe do topo dos móveis; os que ficam pendurados (bandeirinhas, pisca-pisca...) sobem até o teto. A porta não muda.
const HANGING = ['garland', 'fairylights', 'hangingplant', 'glowstars', 'photos', 'discoball', 'lightbar', 'lanternpaper', 'skatewall']
function wallLift(key, entry) {
  if (key === 'door' || key.startsWith('doorsci')) return 0
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
    solid: !entry.floor && !entry.wall && !entry.pet && !entry.passable, floor: !!entry.floor, wall: !!entry.wall,
  }
  if (entry.passable) item.passable = true
  if (entry.on) item.on = true
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
