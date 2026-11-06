// Cliente da API do TMDB (The Movie Database).
// Documentação: https://developer.themoviedb.org/reference/intro/getting-started

const BASE_URL = 'https://api.themoviedb.org/3'
const API_KEY = import.meta.env.VITE_TMDB_API_KEY

export const isTmdbConfigured = Boolean(API_KEY)

/** Monta a URL de um pôster. Tamanhos comuns: w185, w342, w500. */
export function posterUrl(path, size = 'w342') {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : null
}

/** Função base: todas as chamadas passam por aqui. */
async function request(endpoint, params = {}) {
  if (!isTmdbConfigured) {
    throw new Error('Chave do TMDB não configurada. Veja o arquivo .env.example.')
  }

  const query = new URLSearchParams({ api_key: API_KEY, language: 'pt-BR', ...params })
  const response = await fetch(`${BASE_URL}${endpoint}?${query}`)

  if (!response.ok) {
    throw new Error(`O TMDB respondeu com erro ${response.status}.`)
  }
  return response.json()
}

/** Converte o formato do TMDB para o formato que usamos no nosso banco. */
function toMovie(raw) {
  return {
    tmdb_id: raw.id,
    title: raw.title,
    poster_path: raw.poster_path ?? null,
    release_year: raw.release_date ? Number(raw.release_date.slice(0, 4)) : null,
    overview: raw.overview || null,
  }
}

/** Busca filmes pelo nome. Devolve no máximo 8 resultados. */
export async function searchMovies(text) {
  const term = text.trim()
  if (!term) return []

  const data = await request('/search/movie', { query: term, include_adult: 'false' })
  return data.results.slice(0, 8).map(toMovie)
}

/** Detalhes de um filme. A busca não traz o imdb_id, só esta chamada traz. */
export async function getMovieDetails(tmdbId) {
  const data = await request(`/movie/${tmdbId}`)
  return { ...toMovie(data), imdb_id: data.imdb_id || null }
}
