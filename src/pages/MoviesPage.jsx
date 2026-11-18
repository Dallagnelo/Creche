import { useMemo, useState } from 'react'
import { EmptyState, ErrorBox, Spinner } from '../components/Feedback'
import FormModal from '../components/FormModal'
import ListSearch from '../components/ListSearch'
import ListSort, { useListSort } from '../components/ListSort'
import CollectionForm from '../components/CollectionForm'
import { CollectionDetail, CollectionsGrid, collectionMovies } from '../components/CollectionsView'
import { listCollections } from '../services/collections'
import { usePhone } from '../hooks/useMediaQuery'
import MovieCard from '../components/MovieCard'
import MovieModal from '../components/MovieModal'
import MovieSearch from '../components/MovieSearch'
import RatingModal from '../components/RatingModal'
import { useAuth } from '../contexts/AuthContext'
import { useSettings } from '../contexts/SettingsContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { matchesQuery } from '../lib/search'
import { sortList } from '../lib/listSort'
import { getMovieDetails } from '../lib/tmdb'
import { deleteMovie, listMovies } from '../services/movies'
import { KEYS } from '../lib/dataCache'
import Icon from '../components/Icon'

export default function MoviesPage() {
  const { user, isAdmin } = useAuth()
  const { data: movies, loading, error, reload } = useAsyncData(listMovies, KEYS.movies)
  const collectionsData = useAsyncData(listCollections, KEYS.movieCollections)
  const collections = collectionsData.data

  // "Todos" (lista de filmes) ou "Coleções"; fica lembrado neste aparelho.
  const [view, setViewState] = useState(() => {
    try {
      return localStorage.getItem('vista:filmes') === 'colecoes' ? 'colecoes' : 'todos'
    } catch {
      return 'todos'
    }
  })
  function setView(value) {
    setViewState(value)
    setOpenCollectionId(null)
    setFilter('')
    try {
      localStorage.setItem('vista:filmes', value)
    } catch {
      /* sem armazenamento */
    }
  }
  const [openCollectionId, setOpenCollectionId] = useState(null)
  const [collForm, setCollForm] = useState(null) // { collection } (editar) ou { collection: null } (nova)
  const byId = useMemo(() => new Map((movies ?? []).map((movie) => [movie.id, movie])), [movies])
  const openCollection = collections?.find((item) => item.id === openCollectionId) ?? null
  const canEditCollection = (collection) => collection && (collection.created_by === user?.id || isAdmin)

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
  const [sort, setSort] = useListSort('filmes')
  const phone = usePhone()
  const visible = useMemo(
    () => sortList((movies ?? []).filter((movie) => matchesQuery(filter, movie.title, movie.release_year)), sort, user?.id),
    [movies, filter, sort, user?.id]
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
          <p className="page-sub">{movies?.length ? `${movies.length} filmes que a turma já viu e avaliou.` : 'Os filmes que a turma já viu.'}</p>
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
            <Icon name="plus" />
            Adicionar filme
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
          <div className="page-toolbar">
            <div className="movies-views" role="tablist" aria-label="Como ver os filmes">
              <button type="button" role="tab" aria-selected={view === 'todos'} className={view === 'todos' ? 'is-on' : ''} onClick={() => setView('todos')}>
                Todos <small>{movies.length}</small>
              </button>
              <button type="button" role="tab" aria-selected={view === 'colecoes'} className={view === 'colecoes' ? 'is-on' : ''} onClick={() => setView('colecoes')}>
                Coleções{collections?.length ? <small> {collections.length}</small> : null}
              </button>
            </div>
            {view === 'todos' && (
              <>
                <ListSearch
                  value={filter}
                  onChange={setFilter}
                  label="Pesquisar nos filmes da lista"
                  placeholder={phone ? 'Buscar filme da turma' : 'Pesquisar na lista (nome ou ano)'}
                />
                <ListSort value={sort} onChange={setSort} />
              </>
            )}
            {view === 'colecoes' && !openCollection && (
              <>
                <ListSearch value={filter} onChange={setFilter} label="Pesquisar coleções" placeholder="Pesquisar coleção" />
                {collections !== null && (
                  <button type="button" className="btn btn-primary" onClick={() => setCollForm({ collection: null })}>
                    Nova coleção
                  </button>
                )}
              </>
            )}
          </div>
        )}
        {view === 'colecoes' && movies?.length > 0 && (
          <section aria-label="Coleções de filmes">
            {collectionsData.error && <ErrorBox error={collectionsData.error} onRetry={collectionsData.reload} />}
            {collectionsData.loading && collections == null && <Spinner />}
            {openCollection ? (
              <CollectionDetail
                collection={openCollection}
                movies={collectionMovies(openCollection, byId)}
                userId={user?.id}
                canEdit={canEditCollection(openCollection)}
                onBack={() => setOpenCollectionId(null)}
                onEdit={() => setCollForm({ collection: openCollection })}
                onOpenMovie={(m) => setSelectedId(m.id)}
              />
            ) : (
              !collectionsData.loading || collections != null ? (
                <CollectionsGrid
                  collections={collections}
                  byId={byId}
                  filter={filter}
                  onOpen={(item) => setOpenCollectionId(item.id)}
                  onCreate={() => setCollForm({ collection: null })}
                />
              ) : null
            )}
          </section>
        )}
        <section aria-label="Filmes da turma" hidden={view === 'colecoes' && movies?.length > 0}>
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
          onSaved={reload}
        />
      )}

      {collForm && movies && (
        <CollectionForm
          collection={collForm.collection}
          movies={movies}
          onClose={() => setCollForm(null)}
          onSaved={(id) => {
            setCollForm(null)
            setOpenCollectionId(id)
            collectionsData.reload()
          }}
          onDeleted={() => {
            setCollForm(null)
            setOpenCollectionId(null)
            collectionsData.reload()
          }}
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
