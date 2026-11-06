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

/** Foto de uma pessoa do elenco (a API manda só o caminho do arquivo). */
export function profileUrl(path, size = 'w185') {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : null
}

// Escolhe o melhor vídeo para mostrar: trailer antes de teaser, e português antes de inglês.
function pickTrailer(videos = []) {
  const youtube = videos.filter((video) => video.site === 'YouTube')
  const score = (video) =>
    (video.type === 'Trailer' ? 4 : video.type === 'Teaser' ? 2 : 0) +
    (video.iso_639_1 === 'pt' ? 2 : video.iso_639_1 === 'en' ? 1 : 0) +
    (video.official ? 0.5 : 0)
  const best = [...youtube].sort((a, b) => score(b) - score(a))[0]
  return best && (best.type === 'Trailer' || best.type === 'Teaser') ? { key: best.key, name: best.name } : null
}

/**
 * Trailer e elenco de um filme. Não guardamos isso no nosso banco: buscamos no TMDB
 * toda vez que a janela do filme abre (é uma chamada só, com "append_to_response").
 */
export async function getMovieExtras(tmdbId) {
  const data = await request(`/movie/${tmdbId}`, {
    append_to_response: 'videos,credits',
    include_video_language: 'pt,en,null', // sem isso, a busca em pt-BR esconde os trailers em inglês
  })

  return {
    trailer: pickTrailer(data.videos?.results),
    cast: (data.credits?.cast ?? []).slice(0, 12).map((person) => ({
      id: person.id,
      name: person.name,
      character: person.character || null,
      photo: profileUrl(person.profile_path),
    })),
  }
}
