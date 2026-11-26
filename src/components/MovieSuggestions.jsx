import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { EmptyState, ErrorBox, Spinner } from './Feedback'
import MovieCard from './MovieCard'
import MovieModal from './MovieModal'
import { isTmdbConfigured } from '../lib/tmdb'
import { buildSuggestions, hideSuggestion, listHidden, SUGGESTIONS_HINT } from '../services/movieSuggestions'

const PAGE = 5
const TOP = 40 // o sorteio é sempre entre as 40 mais bem pontuadas

// número "sorteado" que é sempre o mesmo para a mesma semente (mulberry32)
const seeded = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
// embaralha dando a cada filme um número sorteado a partir da semente e do id: tirar um filme da lista
// ("Não quero mais ver") não muda a posição dos outros, só o próximo sobe
const shuffleWith = (list, seed) =>
  list
    .map((m) => ({ m, k: seeded((seed * 31 + m.tmdb_id) | 0)() }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.m)
// dia de Brasília (UTC−3): vira à meia-noite para todo mundo ao mesmo tempo
const todaySeed = () => Math.floor((Date.now() - 3 * 3600 * 1000) / 86400000)
const asMovie = (m) => ({ ...m, id: `tmdb-${m.tmdb_id}`, imdb_id: null, ratings: [], average: null, tmdbScore: m.vote_average || null })

// Aba "Sugestões" de Filmes: 5 filmes que a turma ainda não viu, parecidos com os que ela curtiu.
// A ordem é a mesma para todo mundo; "Outras sugestões" mostra as próximas 5 (e volta ao começo no fim).
// toolbar: elemento da barra de cima da página (ao lado das abas) onde fica o botão "Outras sugestões"
export default function MovieSuggestions({ movies, toolbar = null }) {
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

  // Ordem: as 5 "do dia" (sorteadas entre as melhores, iguais para todo mundo no mesmo dia) e depois,
  // em "Outras sugestões", as outras melhores embaralhadas a cada visita (cada um vê numa ordem).
  const visitSeed = useRef(Math.floor(Math.random() * 2 ** 31)).current
  const visible = useMemo(() => {
    const ok = (all ?? []).filter((m) => !hidden.ids.has(m.tmdb_id))
    const top = ok.slice(0, TOP)
    const daily = shuffleWith(top, todaySeed()).slice(0, PAGE)
    const picked = new Set(daily.map((m) => m.tmdb_id))
    const rest = shuffleWith(top.filter((m) => !picked.has(m.tmdb_id)), visitSeed)
    return [...daily, ...rest, ...ok.slice(TOP)]
  }, [all, hidden, visitSeed])
  const pages = Math.max(1, Math.ceil(visible.length / PAGE))
  const current = page % pages
  // no mesmo formato dos filmes da turma, sem avaliações da turma; a nota mostrada é a do TMDB (0 a 10)
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
      {pages > 1 && (() => {
        const more = (
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
        )
        // vai para a barra de cima (mesma linha das abas); sem ela, fica acima dos cartões
        return toolbar ? createPortal(more, toolbar) : <div className="msug-head">{more}</div>
      })()}
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
