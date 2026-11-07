import { useMemo, useState } from 'react'
import { EmptyState, ErrorBox, Spinner } from '../components/Feedback'
import FormModal from '../components/FormModal'
import ListSearch from '../components/ListSearch'
import MovieCard from '../components/MovieCard'
import MovieModal from '../components/MovieModal'
import MovieSearch from '../components/MovieSearch'
import RatingModal from '../components/RatingModal'
import { useAuth } from '../contexts/AuthContext'
import { useSettings } from '../contexts/SettingsContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { matchesQuery } from '../lib/search'
import { getMovieDetails } from '../lib/tmdb'
import { deleteMovie, listMovies } from '../services/movies'

export default function MoviesPage() {
  const { user } = useAuth()
  const { data: movies, loading, error, reload } = useAsyncData(listMovies)

  // Guardamos só o ID do filme aberto e procuramos os dados na lista atual.
  // Assim, depois de dar uma nota e recarregar, a janela já mostra os dados novos.
  const [selectedId, setSelectedId] = useState(null)
  const selected = movies?.find((movie) => movie.id === selectedId) ?? null

  // Qual filme está sendo avaliado agora? { movie, existing } ou null.
  const [rating, setRating] = useState(null)
  const { settings } = useSettings()
  const asModal = settings.modalForms
  const [showSearch, setShowSearch] = useState(false)
  const [picking, setPicking] = useState(false)
  const [pickError, setPickError] = useState(null)
  const [filter, setFilter] = useState('')
  const visible = useMemo(
    () => (movies ?? []).filter((movie) => matchesQuery(filter, movie.title, movie.release_year)),
    [movies, filter]
  )

  // Esc/fundo fecham o detalhe, exceto quando a janela de nota está aberta por cima.
  function closeMovie() {
    if (!rating) setSelectedId(null)
  }

  // Escolheu um filme na busca: se já está na lista, abre o detalhe;
  // senão busca os detalhes (imdb_id) e abre a janela de nota.
  async function handlePickFromSearch(found) {
    setPickError(null)

    const known = movies?.find((movie) => movie.tmdb_id === found.tmdb_id)
    if (known) {
      setShowSearch(false)
      setSelectedId(known.id)
      return
    }

    setPicking(true)
    try {
      const details = await getMovieDetails(found.tmdb_id)
      setShowSearch(false)
      setRating({ movie: details, existing: undefined })
    } catch (err) {
      setPickError(err)
    } finally {
      setPicking(false)
    }
  }

  const [deleteError, setDeleteError] = useState(null)

  // Apagar leva junto as notas e os comentários da turma, então avisamos antes.
  async function handleDelete(movie) {
    const others = movie.ratings.filter((rating) => rating.user_id !== user.id).length
    const warning = others
      ? `\n\nIsso também apaga as notas de ${others} ${others === 1 ? 'amigo' : 'amigos'} e todos os comentários sobre o filme.`
      : '\n\nAs suas notas e os comentários sobre ele também serão apagados.'
    if (!window.confirm(`Apagar "${movie.title}" da lista?${warning}\n\nNão dá para desfazer.`)) return

    setDeleteError(null)
    try {
      await deleteMovie(movie.id)
      setSelectedId(null)
      reload()
    } catch (err) {
      setDeleteError(err)
    }
  }

  function handleSaved() {
    setRating(null)
    reload()
  }

  return (
    <section className="stack">
      <div className="page-head">
        <div>
          <h1>Filmes</h1>
          <p className="muted">
            {movies
              ? filter.trim()
                ? `${visible.length} de ${movies.length} ${movies.length === 1 ? 'filme' : 'filmes'}`
                : `${movies.length} ${movies.length === 1 ? 'filme na lista' : 'filmes na lista'}`
              : 'Carregando...'}
          </p>
        </div>
        {asModal ? (
          <button
            type="button"
            className="btn btn-new"
            aria-haspopup="dialog"
            onClick={() => {
              setPickError(null)
              setShowSearch(true)
            }}
          >
            + Buscar filme
          </button>
        ) : (
          <a className="btn btn-primary page-head-action" href="#buscar-filme">
            Buscar filme
          </a>
        )}
      </div>

      <div className={asModal ? undefined : 'split'}>
        <div className="stack">
        {movies?.length > 0 && (
          <ListSearch
            value={filter}
            onChange={setFilter}
            label="Pesquisar nos filmes da lista"
            placeholder="Pesquisar filme da lista (nome ou ano)"
          />
        )}
        <section className="card panel" aria-labelledby="panel-movies">
          <div className="panel-head">
          </div>

          {error && <ErrorBox error={error} onRetry={reload} />}
          {deleteError && <ErrorBox error={deleteError} />}
          {loading && !movies && <Spinner />}

          {movies && movies.length === 0 && (
            <EmptyState icon="🎬" title="Nenhum filme ainda">
              {asModal ? 'Toque em "Buscar filme" e dê a primeira nota.' : 'Busque um filme ao lado e dê a primeira nota.'}
            </EmptyState>
          )}

          {movies?.length > 0 && visible.length === 0 && (
            <p className="muted list-empty">Nenhum filme encontrado para “{filter.trim()}”.</p>
          )}

          {visible.length > 0 && (
            <ul className="movie-grid">
              {visible.map((movie) => (
                <li key={movie.id}>
                  <MovieCard movie={movie} onOpen={(m) => setSelectedId(m.id)} />
                </li>
              ))}
            </ul>
          )}
        </section>
        </div>

        {!asModal && (
          <aside className="side">
            <div id="buscar-filme">
              <MovieSearch onSelect={handlePickFromSearch} busy={picking} />
            </div>
            {picking && <Spinner label="Carregando filme..." />}
            {pickError && <ErrorBox error={pickError} />}
          </aside>
        )}
      </div>

      {asModal && showSearch && (
        <FormModal label="Buscar filme" onClose={() => setShowSearch(false)}>
          <MovieSearch bare onSelect={handlePickFromSearch} busy={picking} />
          {picking && <Spinner label="Carregando filme..." />}
          {pickError && <ErrorBox error={pickError} />}
          <div className="modal-actions">
            <span className="spacer" />
            <button type="button" className="btn btn-ghost" onClick={() => setShowSearch(false)}>
              Cancelar
            </button>
          </div>
        </FormModal>
      )}

      {selected && (
        <MovieModal
          movie={selected}
          onClose={closeMovie}
          onRate={(movie, existing) => setRating({ movie, existing })}
          onDelete={handleDelete}
        />
      )}

      {rating && (
        <RatingModal
          movie={rating.movie}
          existing={rating.existing}
          onClose={() => setRating(null)}
          onSaved={handleSaved}
        />
      )}
    </section>
  )
}
