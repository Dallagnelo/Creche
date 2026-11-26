import { useEffect, useMemo, useRef, useState } from 'react'
import { EmptyState, ErrorBox, Spinner } from './Feedback'
import MovieCard from './MovieCard'
import MovieModal from './MovieModal'
import { isTmdbConfigured } from '../lib/tmdb'
import { buildSuggestions, hideSuggestion, listHidden, SUGGESTIONS_HINT } from '../services/movieSuggestions'

const PAGE = 5
const asMovie = (m) => ({ ...m, id: `tmdb-${m.tmdb_id}`, imdb_id: null, ratings: [], average: m.vote_average ? m.vote_average / 2 : null })

// Aba "Sugestões" de Filmes: 5 filmes que a turma ainda não viu, parecidos com os que ela curtiu.
// A ordem é a mesma para todo mundo; "Outras sugestões" mostra as próximas 5 (e volta ao começo no fim).
export default function MovieSuggestions({ movies }) {
  const [all, setAll] = useState(null)
  const [hidden, setHidden] = useState({ ids: new Set(), shared: true })
  const [error, setError] = useState(null)
  const [page, setPage] = useState(0)
  const [busy, setBusy] = useState(null)
  const [hideError, setHideError] = useState(null)
  const [opened, setOpened] = useState(null) // sugestão aberta na janela do filme
  const listRef = useRef(null)
  // só recalcula quando muda a lista de filmes ou as notas
  const signature = useMemo(() => movies.map((m) => `${m.tmdb_id}:${m.average ?? ''}`).join(','), [movies])

  useEffect(() => {
    if (!isTmdbConfigured) return undefined
    let alive = true
    setError(null)
    Promise.all([buildSuggestions(movies), listHidden()])
      .then(([list, hid]) => {
        if (!alive) return
        setAll(list)
        setHidden(hid)
      })
      .catch((err) => alive && setError(err))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature])

  const visible = useMemo(() => (all ?? []).filter((m) => !hidden.ids.has(m.tmdb_id)), [all, hidden])
  const pages = Math.max(1, Math.ceil(visible.length / PAGE))
  const current = page % pages
  // no mesmo formato dos filmes da turma: nota do TMDB (0 a 10) vira 0 a 5, sem avaliações da turma
  const shown = visible.slice(current * PAGE, current * PAGE + PAGE).map(asMovie)
  const open = opened ? asMovie(opened) : null
  const setOpen = (movie) => setOpened(movie ? visible.find((m) => m.tmdb_id === movie.tmdb_id) ?? null : null)

  async function hide(movie) {
    setBusy(movie.tmdb_id)
    setHideError(null)
    try {
      await hideSuggestion(movie, hidden.shared)
      setHidden((h) => ({ ...h, ids: new Set([...h.ids, movie.tmdb_id]) }))
      return true
    } catch (err) {
      setHideError(err)
      return false
    } finally {
      setBusy(null)
    }
  }

  if (!isTmdbConfigured) {
    return <p className="muted">Para ver sugestões, coloque a chave do TMDB em <code>VITE_TMDB_API_KEY</code>.</p>
  }
  if (error) return <ErrorBox error={error} />
  if (all === null) return <Spinner label="Procurando filmes parecidos com os da turma..." />
  if (!visible.length) {
    return (
      <EmptyState icon="🍿" title="Sem sugestões por enquanto">
        Avaliem mais filmes para as sugestões aparecerem.
      </EmptyState>
    )
  }

  return (
    <section className="msug" aria-label="Sugestões de filmes">
      <div className="msug-head">
        <p className="muted">Filmes que a turma ainda não viu, parecidos com os que vocês curtiram. A lista é a mesma para todo mundo.</p>
        {pages > 1 && (
          <button
            type="button"
            className="btn btn-ghost msug-more"
            onClick={() => {
              setPage((p) => (p + 1) % pages)
              listRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
            }}
          >
            <span aria-hidden="true">↻</span> Outras sugestões
          </button>
        )}
      </div>
      {!hidden.shared && <p className="muted msug-hint">{SUGGESTIONS_HINT}</p>}
      {hideError && <ErrorBox error={hideError} />}
      {/* mesmo cartão da lista de filmes; clicar abre a mesma janela do filme, só que sem dar nota */}
      <ul className="movie-grid" ref={listRef}>
        {shown.map((movie) => (
          <li key={movie.tmdb_id}>
            <MovieCard movie={movie} onOpen={() => setOpen(movie)} />
          </li>
        ))}
      </ul>
      {pages > 1 && (
        <p className="muted msug-count">
          {current + 1} de {pages}
        </p>
      )}
      {open && (
        <MovieModal
          movie={open}
          suggestion
          hiding={busy === open.tmdb_id}
          onClose={() => setOpen(null)}
          onHide={async (movie) => {
            if (await hide(movie)) setOpen(null)
          }}
        />
      )}
    </section>
  )
}
