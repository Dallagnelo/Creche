import { useEffect, useState } from 'react'
import { isTmdbConfigured, posterUrl, searchMovies } from '../lib/tmdb'
import { ErrorBox } from './Feedback'

/**
 * Campo de busca de filmes com "debounce": só consulta o TMDB quando a pessoa
 * para de digitar por 400 ms, evitando uma requisição a cada tecla.
 */
export default function MovieSearch({ onSelect, busy }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const term = query.trim()
    if (term.length < 2) {
      setResults([])
      setError(null)
      setLoading(false)
      return
    }

    let ignore = false // se o usuário digitou de novo, descartamos a resposta antiga
    const timer = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const found = await searchMovies(term)
        if (!ignore) setResults(found)
      } catch (err) {
        if (!ignore) setError(err)
      } finally {
        if (!ignore) setLoading(false)
      }
    }, 400)

    // Limpeza: roda antes da próxima execução do efeito.
    return () => {
      ignore = true
      clearTimeout(timer)
    }
  }, [query])

  function handlePick(movie) {
    onSelect(movie)
    setQuery('')
    setResults([])
  }

  if (!isTmdbConfigured) {
    return (
      <div className="card">
        <p>
          Para buscar filmes, coloque sua chave do TMDB em <code>VITE_TMDB_API_KEY</code> no arquivo{' '}
          <code>.env</code> e reinicie o servidor.
        </p>
      </div>
    )
  }

  return (
    <div className="card panel movie-search">
      <h2>Buscar filme</h2>
      <label className="field">
        <span>Nome do filme</span>
        <input
          type="search"
          placeholder="Ex.: Interestelar"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          disabled={busy}
        />
      </label>

      {loading && <p className="muted">Buscando...</p>}
      {error && <ErrorBox error={error} />}

      {results.length > 0 && (
        <ul className="search-results">
          {results.map((movie) => (
            <li key={movie.tmdb_id}>
              <button type="button" className="search-item" onClick={() => handlePick(movie)}>
                {movie.poster_path ? (
                  <img src={posterUrl(movie.poster_path, 'w92')} alt="" width="40" height="60" />
                ) : (
                  <span className="search-item-empty">🎬</span>
                )}
                <span>
                  <strong>{movie.title}</strong>
                  {movie.release_year && <span className="muted"> ({movie.release_year})</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!loading && !error && query.trim().length >= 2 && results.length === 0 && (
        <p className="muted">Nenhum filme encontrado.</p>
      )}
    </div>
  )
}
