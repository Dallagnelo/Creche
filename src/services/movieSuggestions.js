import { supabase } from '../lib/supabase'
import { getRecommendations } from '../lib/tmdb'

// Sugestões de filmes para a turma: o TMDB recomenda filmes a partir de cada filme da lista; quem é recomendado
// por vários filmes que a turma curtiu (nota alta) sobe. A conta usa só os filmes da lista, então é igual
// para todo mundo. O "Não quero mais ver" fica no banco e vale para a turma toda.

export const SUGGESTIONS_HINT = 'Para o "Não quero mais ver" valer para a turma toda, rode o arquivo supabase/migracao-filmes-sugestoes.sql no Supabase.'
const isMissingTable = (error) => error?.code === 'PGRST205' || error?.code === '42P01'
const LOCAL_KEY = 'filmes-sugestoes-escondidas' // sem a migração, esconde só neste aparelho

const MAX_SOURCES = 40 // no máximo 40 filmes da lista entram na conta (os de nota mais alta)
const CACHE_KEY = 'filmes-sugestoes-cache'
const CACHE_MS = 12 * 3600 * 1000

const readLocal = () => {
  try {
    const list = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '[]')
    return Array.isArray(list) ? list.filter(Number.isFinite) : []
  } catch {
    return []
  }
}

/** ids do TMDB que a turma não quer mais ver. `shared` = false quando a migração não foi rodada. */
export async function listHidden() {
  const { data, error } = await supabase.from('movie_suggestions_hidden').select('tmdb_id')
  if (error) {
    if (isMissingTable(error)) return { ids: new Set(readLocal()), shared: false }
    throw error
  }
  return { ids: new Set([...data.map((row) => row.tmdb_id), ...readLocal()]), shared: true }
}

export async function hideSuggestion(movie, shared) {
  if (shared) {
    const { error } = await supabase.from('movie_suggestions_hidden').upsert({ tmdb_id: movie.tmdb_id, title: movie.title }, { onConflict: 'tmdb_id', ignoreDuplicates: true })
    if (!error) return
    if (!isMissingTable(error)) throw error
  }
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify([...new Set([...readLocal(), movie.tmdb_id])]))
  } catch {
    // sem armazenamento
  }
}

// peso de um filme da lista: nota 5 vale muito, nota baixa quase nada (sem nota conta como 3)
const weightOf = (movie) => ((movie.average ?? 3) / 5) ** 2

/** Filmes que serão a base da conta (os de nota mais alta, depois os mais recentes). */
function sourcesOf(movies) {
  return movies
    .filter((m) => m.tmdb_id)
    .sort((a, b) => (b.average ?? 3) - (a.average ?? 3) || String(b.created_at).localeCompare(String(a.created_at)))
    .slice(0, MAX_SOURCES)
}

async function recommendationsFor(sources) {
  const ids = sources.map((m) => m.tmdb_id)
  let cache = {}
  try {
    cache = JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}') ?? {}
  } catch {
    cache = {}
  }
  const now = Date.now()
  const out = new Map()
  const missing = []
  for (const id of ids) {
    const hit = cache[id]
    if (hit && now - hit.at < CACHE_MS) out.set(id, hit.list)
    else missing.push(id)
  }
  // busca as que faltam, 6 de cada vez
  for (let i = 0; i < missing.length; i += 6) {
    const chunk = missing.slice(i, i + 6)
    const results = await Promise.all(chunk.map((id) => getRecommendations(id).catch(() => null)))
    chunk.forEach((id, k) => {
      if (!results[k]) return
      out.set(id, results[k])
      cache[id] = { at: now, list: results[k] }
    })
  }
  try {
    // guarda só o que ainda é usado (não deixa o cache crescer para sempre)
    const keep = Object.fromEntries(ids.filter((id) => cache[id]).map((id) => [id, cache[id]]))
    localStorage.setItem(CACHE_KEY, JSON.stringify(keep))
  } catch {
    // sem armazenamento ou cheio: tudo bem, só busca de novo na próxima
  }
  return out
}

/**
 * Lista ordenada de sugestões: [{ tmdb_id, title, poster_path, release_year, overview, vote_average, because: [títulos] }].
 * Tira o que já está na lista da turma. Os escondidos são filtrados na tela.
 */
export async function buildSuggestions(movies) {
  const sources = sourcesOf(movies)
  const recs = await recommendationsFor(sources)
  const have = new Set(movies.map((m) => m.tmdb_id).filter(Boolean))
  const scores = new Map()
  for (const source of sources) {
    const list = recs.get(source.tmdb_id) ?? []
    const w = weightOf(source)
    list.forEach((rec, rank) => {
      if (have.has(rec.tmdb_id) || !rec.poster_path) return
      const points = w * (1 - rank / (list.length + 5))
      const entry = scores.get(rec.tmdb_id) ?? { ...rec, score: 0, from: [] }
      entry.score += points
      entry.from.push({ title: source.title, points })
      scores.set(rec.tmdb_id, entry)
    })
  }
  return [...scores.values()]
    .map((entry) => ({
      ...entry,
      // nota do TMDB ajuda a desempatar e tira os muito ruins do topo
      score: entry.score * (0.6 + Math.min(entry.vote_average ?? 5, 10) / 25) + Math.min(entry.vote_count, 5000) / 50000,
      because: entry.from.sort((a, b) => b.points - a.points).slice(0, 2).map((f) => f.title),
    }))
    .sort((a, b) => b.score - a.score || a.tmdb_id - b.tmdb_id)
}
