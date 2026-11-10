// Cache de dados compartilhado entre as telas.
//
// Ideia: a tela abre na hora com o que já foi buscado (na memória ou salvo
// no aparelho) e o site confere o banco em segundo plano, trocando os dados
// só se mudou alguma coisa. Os links assinados das fotos duram 1 h, então
// nada com mais de 45 min é reaproveitado.

const STORAGE_PREFIX = 'memorias-da-turma:cache:'
const MAX_AGE_MS = 45 * 60 * 1000 // passou disso, os links das fotos podem ter vencido
export const FRESH_MS = 20 * 1000 // até aqui nem precisa buscar de novo

let scope = null // id de quem está logado: o cache nunca passa de uma conta para outra
const memory = new Map() // chave -> { data, at }
const inflight = new Map() // chave -> promise (várias telas dividem a mesma busca)
const listeners = new Map() // chave -> Set de funções
let saveTimer = null

function storageKey() {
  return scope ? `${STORAGE_PREFIX}${scope}` : null
}

function loadPersisted() {
  const key = storageKey()
  if (!key) return
  try {
    const saved = JSON.parse(localStorage.getItem(key) || '{}')
    const now = Date.now()
    Object.entries(saved).forEach(([name, entry]) => {
      if (entry && now - entry.at < MAX_AGE_MS && !memory.has(name)) memory.set(name, entry)
    })
  } catch {
    /* cache salvo corrompido: ignora */
  }
}

function persistSoon() {
  const key = storageKey()
  if (!key) return
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(key, JSON.stringify(Object.fromEntries(memory)))
    } catch {
      /* sem espaço ou sem localStorage: segue só com a memória */
    }
  }, 600)
}

function removePersisted() {
  try {
    Object.keys(localStorage)
      .filter((name) => name.startsWith(STORAGE_PREFIX))
      .forEach((name) => localStorage.removeItem(name))
  } catch {
    /* ignora */
  }
}

/** Define de quem é o cache. Chamado quando o login muda (null = saiu). */
export function setCacheScope(userId) {
  const next = userId ?? null
  if (next === scope) return
  clearTimeout(saveTimer)
  memory.clear()
  inflight.clear()
  removePersisted()
  scope = next
  if (scope) {
    try {
      const saved = localStorage.getItem(STORAGE_PREFIX + scope)
      if (saved) loadPersisted()
    } catch {
      /* ignora */
    }
  }
  // Avisa as telas abertas para soltarem os dados da conta anterior.
  listeners.forEach((set) => set.forEach((fn) => fn(null)))
}

/** Lê o que está guardado (ou null se não há, ou se já ficou velho demais). */
export function peekCache(key) {
  const entry = key ? memory.get(key) : null
  if (!entry) return null
  if (Date.now() - entry.at > MAX_AGE_MS) {
    memory.delete(key)
    return null
  }
  return entry
}

function writeCache(key, data) {
  memory.set(key, { data, at: Date.now() })
  persistSoon()
  listeners.get(key)?.forEach((fn) => fn(memory.get(key)))
}

/** Telas se inscrevem para receber dados novos de uma chave. */
export function subscribeCache(key, fn) {
  if (!listeners.has(key)) listeners.set(key, new Set())
  listeners.get(key).add(fn)
  return () => listeners.get(key)?.delete(fn)
}

/** Busca dados e guarda no cache. Buscas simultâneas da mesma chave viram uma só. */
export function fetchCached(key, fetcher, { force = false } = {}) {
  if (!force && inflight.has(key)) return inflight.get(key)
  const mine = scope
  const promise = fetcher()
    .then((data) => {
      if (scope === mine) writeCache(key, data) // trocou de conta no meio: descarta
      return data
    })
    .finally(() => {
      if (inflight.get(key) === promise) inflight.delete(key)
    })
  inflight.set(key, promise)
  return promise
}

// Chaves usadas pelas telas (cada tela passa a sua para o useAsyncData).
export const KEYS = {
  posts: 'posts',
  albums: 'albums',
  movies: 'movies',
  games: 'games',
  events: 'events',
  polls: 'polls',
  profiles: 'profiles',
  counters: 'counters',
  suggestions: 'suggestions',
  liveTimes: 'live-times',
  liveRanking: 'live-ranking',
}
