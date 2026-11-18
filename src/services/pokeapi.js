// PokéAPI (https://pokeapi.co): dados públicos e gratuitos, sem chave.
// A política de uso pede para guardar as respostas em cache, então tudo aqui fica salvo no navegador.
// As imagens vêm do repositório de sprites da PokéAPI no GitHub (não contam como chamadas da API).

const API = 'https://pokeapi.co/api/v2'
const SPRITES = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon'
export const POKE_MAX = 1025
const CACHE_VERSION = 2
const LIST_TTL = 30 * 24 * 3600 * 1000

// ------------------------------------------------------------------ imagens e som
export const spriteUrl = (id) => `${SPRITES}/${id}.png`
export const artUrl = (id) => `${SPRITES}/other/official-artwork/${id}.png`
/** Ícone pequeno (40×30, estilo da caixa do PC): existe do #1 ao #809. */
export const iconUrl = (id) => (id >= 1 && id <= 809 ? `${SPRITES}/versions/generation-vii/icons/${id}.png` : null)
export const cryUrl = (id) => `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${id}.ogg`

export const dexNumber = (id) => `#${String(id).padStart(4, '0')}`

// ------------------------------------------------------------------ tipos, gerações e status em português
export const TYPES = {
  normal: { name: 'Normal', color: '#a8a77a' },
  fire: { name: 'Fogo', color: '#ee8130' },
  water: { name: 'Água', color: '#6390f0' },
  electric: { name: 'Elétrico', color: '#f7d02c' },
  grass: { name: 'Planta', color: '#7ac74c' },
  ice: { name: 'Gelo', color: '#96d9d6' },
  fighting: { name: 'Lutador', color: '#c22e28' },
  poison: { name: 'Veneno', color: '#a33ea1' },
  ground: { name: 'Terra', color: '#e2bf65' },
  flying: { name: 'Voador', color: '#a98ff3' },
  psychic: { name: 'Psíquico', color: '#f95587' },
  bug: { name: 'Inseto', color: '#a6b91a' },
  rock: { name: 'Pedra', color: '#b6a136' },
  ghost: { name: 'Fantasma', color: '#735797' },
  dragon: { name: 'Dragão', color: '#6f35fc' },
  dark: { name: 'Sombrio', color: '#705746' },
  steel: { name: 'Aço', color: '#b7b7ce' },
  fairy: { name: 'Fada', color: '#d685ad' },
}

export const GENERATIONS = [
  { id: 1, name: 'Kanto', from: 1, to: 151 },
  { id: 2, name: 'Johto', from: 152, to: 251 },
  { id: 3, name: 'Hoenn', from: 252, to: 386 },
  { id: 4, name: 'Sinnoh', from: 387, to: 493 },
  { id: 5, name: 'Unova', from: 494, to: 649 },
  { id: 6, name: 'Kalos', from: 650, to: 721 },
  { id: 7, name: 'Alola', from: 722, to: 809 },
  { id: 8, name: 'Galar', from: 810, to: 905 },
  { id: 9, name: 'Paldea', from: 906, to: 1025 },
]
export const genOf = (id) => GENERATIONS.find((g) => id >= g.from && id <= g.to) ?? null

export const STATS = {
  hp: 'PS',
  attack: 'Ataque',
  defense: 'Defesa',
  'special-attack': 'Ataque esp.',
  'special-defense': 'Defesa esp.',
  speed: 'Velocidade',
}

// ------------------------------------------------------------------ nomes
const SPECIAL_NAMES = {
  'nidoran-f': 'Nidoran♀',
  'nidoran-m': 'Nidoran♂',
  'mr-mime': 'Mr. Mime',
  'mime-jr': 'Mime Jr.',
  'mr-rime': 'Mr. Rime',
  farfetchd: "Farfetch'd",
  sirfetchd: "Sirfetch'd",
  'type-null': 'Type: Null',
  'ho-oh': 'Ho-Oh',
  'porygon-z': 'Porygon-Z',
  'jangmo-o': 'Jangmo-o',
  'hakamo-o': 'Hakamo-o',
  'kommo-o': 'Kommo-o',
  flabebe: 'Flabébé',
}
export function prettyName(slug) {
  if (SPECIAL_NAMES[slug]) return SPECIAL_NAMES[slug]
  if (slug.startsWith('tapu-')) return `Tapu ${cap(slug.slice(5))}`
  return slug.split('-').map(cap).join(' ')
}
const cap = (word) => (word ? word[0].toUpperCase() + word.slice(1) : word)

/** Para comparar palpites e buscas sem acento, maiúscula, espaço ou pontuação. */
export const plain = (text) =>
  String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9♀♂]/g, '')

// ------------------------------------------------------------------ cache
const memory = new Map()
const storeKey = (key) => `pokeapi:v${CACHE_VERSION}:${key}`
function readStore(key, ttl) {
  try {
    const raw = localStorage.getItem(storeKey(key))
    if (!raw) return null
    const { at, data } = JSON.parse(raw)
    if (ttl && Date.now() - at > ttl) return null
    return data
  } catch {
    return null
  }
}
function writeStore(key, data) {
  try {
    localStorage.setItem(storeKey(key), JSON.stringify({ at: Date.now(), data }))
  } catch {
    // armazenamento cheio ou bloqueado: fica só na memória
  }
}
async function getJson(path) {
  const res = await fetch(`${API}${path}`)
  if (!res.ok) throw new Error(res.status === 404 ? 'Pokémon não encontrado.' : 'Não deu para falar com a PokéAPI agora. Tente de novo em instantes.')
  return res.json()
}
/** Busca uma vez e guarda (memória + navegador). Chamadas iguais ao mesmo tempo dividem a mesma busca. */
function cached(key, loader, ttl = 0) {
  if (memory.has(key)) return memory.get(key)
  const saved = readStore(key, ttl)
  if (saved) {
    const done = Promise.resolve(saved)
    memory.set(key, done)
    return done
  }
  const promise = loader().then((data) => {
    writeStore(key, data)
    return data
  })
  promise.catch(() => memory.delete(key))
  memory.set(key, promise)
  return promise
}

// ------------------------------------------------------------------ consultas
/** Todos os Pokémon (número e nome), em ordem da Pokédex. */
export function listPokemon() {
  return cached(
    'list',
    async () => {
      const data = await getJson(`/pokemon-species?limit=${POKE_MAX}`)
      return data.results
        .map((r) => ({ id: Number(r.url.match(/\/(\d+)\/?$/)?.[1]), name: prettyName(r.name) }))
        .filter((p) => p.id >= 1 && p.id <= POKE_MAX)
        .sort((a, b) => a.id - b.id)
    },
    LIST_TTL,
  )
}

// Português quando existe; senão inglês (é o que o tradutor automático traduz melhor); por último espanhol.
const pickText = (entries, field) => {
  for (const lang of ['pt-br', 'pt', 'en', 'es']) {
    const hit = entries?.find((e) => e.language?.name === lang)
    if (hit) return { text: String(hit[field]).replace(/[\f\n\r­]+/g, ' ').replace(/\s+/g, ' ').trim(), lang }
  }
  return null
}

/** Detalhes de um Pokémon: tipos, status, altura, peso, categoria e descrição (em português quando existir). */
export function getPokemon(id) {
  return cached(`p:${id}`, async () => {
    const [poke, species] = await Promise.all([getJson(`/pokemon/${id}`), getJson(`/pokemon-species/${id}`).catch(() => null)])
    const flavors = species?.flavor_text_entries ?? []
    // a descrição mais recente no idioma preferido
    const flavor = pickText([...flavors].reverse(), 'flavor_text')
    return {
      id,
      name: prettyName(species?.name ?? poke.name),
      types: poke.types.sort((a, b) => a.slot - b.slot).map((t) => t.type.name),
      stats: poke.stats.map((s) => ({ key: s.stat.name, value: s.base_stat })),
      height: poke.height / 10, // metros
      weight: poke.weight / 10, // kg
      genus: pickText(species?.genera, 'genus')?.text ?? null,
      genusLang: pickText(species?.genera, 'genus')?.lang ?? null,
      flavor: flavor?.text ?? null,
      flavorLang: flavor?.lang ?? null,
      legendary: !!species?.is_legendary,
      mythical: !!species?.is_mythical,
    }
  })
}

/**
 * Descrição e categoria em português. A PokéAPI quase nunca tem português, então traduz do inglês
 * com o mesmo tradutor da sinopse dos jogos (função "igdb-search") e guarda no navegador: cada Pokémon é traduzido uma vez só.
 * Se a tradução falhar, devolve null e a janela mostra o texto original.
 */
export function translatePokemon(poke) {
  const needFlavor = poke.flavor && poke.flavorLang !== 'pt-br' && poke.flavorLang !== 'pt'
  const needGenus = poke.genus && poke.genusLang !== 'pt-br' && poke.genusLang !== 'pt'
  if (!needFlavor && !needGenus) return Promise.resolve(null)
  const key = `pt:${poke.id}`
  const job = cached(key, async () => {
    const { translateSummary } = await import('./igdb')
    const [flavor, genus] = await Promise.all([needFlavor ? translateSummary(poke.flavor) : null, needGenus ? translateSummary(poke.genus) : null])
    if (needFlavor && !flavor) throw new Error('sem tradução') // não guarda falha: tenta de novo na próxima vez
    return { flavor: flavor ?? null, genus: genus || null }
  })
  return job.catch(() => null)
}

/** Números dos Pokémon de um tipo (para o filtro da Pokédex). */
export function pokemonOfType(type) {
  return cached(
    `type:${type}`,
    async () => {
      const data = await getJson(`/type/${type}`)
      return data.pokemon.map((p) => Number(p.pokemon.url.match(/\/(\d+)\/?$/)?.[1])).filter((id) => id >= 1 && id <= POKE_MAX)
    },
    LIST_TTL,
  )
}

/** Toca o grito do Pokémon (alguns navegadores, como o Safari, não tocam .ogg: aí fica em silêncio). */
export function playCry(id, volume = 0.35) {
  try {
    const audio = new Audio(cryUrl(id))
    audio.volume = volume
    audio.play().catch(() => {})
    return audio
  } catch {
    return null
  }
}
