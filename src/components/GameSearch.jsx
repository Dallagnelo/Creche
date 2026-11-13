import { useEffect, useState } from 'react'
import { searchIgdbGames } from '../services/igdb'
import { ErrorBox } from './Feedback'
import GameCover from './GameCover'
import Icon from './Icon'

/**
 * Busca de jogos no IGDB, com "debounce" (só consulta quando a pessoa
 * para de digitar por 400 ms), igual à busca de filmes.
 */
export default function GameSearch({ onSelect, disabled, label = 'Buscar jogo', autoFocus = false }) {
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

    let ignore = false // se a pessoa digitou de novo, descartamos a resposta antiga
    const timer = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const found = await searchIgdbGames(term)
        if (!ignore) setResults(found)
      } catch (err) {
        if (!ignore) setError(err)
      } finally {
        if (!ignore) setLoading(false)
      }
    }, 400)

    return () => {
      ignore = true
      clearTimeout(timer)
    }
  }, [query])

  function handlePick(game) {
    onSelect(game)
    setQuery('')
    setResults([])
  }

  return (
    <div className="game-search">
      <label className="field">
        <span>{label}</span>
        <input
          type="search"
          placeholder="Ex.: Mario Kart"
          value={query}
          disabled={disabled}
          autoFocus={autoFocus}
          onChange={(event) => setQuery(event.target.value)}
          // Enter não pode enviar o formulário principal.
          onKeyDown={(event) => event.key === 'Enter' && event.preventDefault()}
        />
      </label>

      {loading && <p className="muted">Buscando...</p>}
      {error && <ErrorBox error={error} />}

      {results.length > 0 && (
        <ul className="search-results">
          {results.map((game) => (
            <li key={game.id}>
              <button type="button" className="search-item" onClick={() => handlePick(game)}>
                {game.coverUrl ? (
                  <GameCover url={game.coverUrl} size="thumb" width="40" height="53" />
                ) : (
                  <span className="search-item-empty">
                    <Icon name="games" />
                  </span>
                )}
                <span className="search-item-text">
                  <strong>{game.name}</strong>
                  {game.year && <span className="muted"> ({game.year})</span>}
                  {game.platforms.length > 0 && (
                    <span className="muted search-item-sub">{game.platforms.slice(0, 3).join(' · ')}</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!loading && !error && query.trim().length >= 2 && results.length === 0 && (
        <p className="muted">Nenhum jogo encontrado.</p>
      )}

    </div>
  )
}
