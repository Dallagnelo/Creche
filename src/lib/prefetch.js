import { fetchCached, peekCache, FRESH_MS, KEYS } from './dataCache'
import { listPosts } from '../services/posts'
import { listMovies } from '../services/movies'
import { listGames } from '../services/games'
import { listEvents } from '../services/events'
import { listProfiles } from '../services/profiles'
import { getCounters } from '../services/summary'

// Tudo o que as telas principais precisam, buscado logo depois do login,
// em segundo plano. Quando a pessoa abre uma tela, os dados já estão aqui.
const JOBS = [
  [KEYS.counters, getCounters],
  [KEYS.posts, listPosts],
  [KEYS.events, listEvents],
  [KEYS.movies, listMovies],
  [KEYS.games, listGames],
  [KEYS.profiles, listProfiles],
]

export function prefetchAll() {
  JOBS.forEach(([key, fetcher]) => {
    const entry = peekCache(key)
    if (entry && Date.now() - entry.at < FRESH_MS) return
    fetchCached(key, fetcher).catch(() => {
      /* falhou em segundo plano: a tela tenta de novo quando abrir */
    })
  })
}
