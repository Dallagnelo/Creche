import { useMemo, useState } from 'react'
import { matchesQuery } from '../lib/search'
import { getCollection, posterUrl, searchCollections } from '../lib/tmdb'
import { deleteCollection, saveCollection } from '../services/collections'
import { ErrorBox, Spinner } from './Feedback'
import FormModal from './FormModal'
import Icon from './Icon'

// Criar ou editar uma coleção de filmes: nome, capa (pôster do TMDB) e quais filmes da turma entram, em que ordem.
export default function CollectionForm({ collection, movies, onClose, onSaved, onDeleted }) {
  const byId = useMemo(() => new Map(movies.map((movie) => [movie.id, movie])), [movies])
  const [name, setName] = useState(collection?.name ?? '')
  const [poster, setPoster] = useState(collection?.poster_path ?? null)
  const [tmdbId, setTmdbId] = useState(collection?.tmdb_collection_id ?? null)
  const [chosen, setChosen] = useState(() => (collection?.movieIds ?? []).filter((id) => byId.has(id)))
  const [movieFilter, setMovieFilter] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  // busca de capas nas coleções do TMDB
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [searching, setSearching] = useState(false)
  const [suggest, setSuggest] = useState(null) // { name, ids } filmes da coleção do TMDB que a turma já viu

  const others = movies.filter((movie) => !chosen.includes(movie.id) && matchesQuery(movieFilter, movie.title, movie.release_year))
  const chosenPosters = chosen.map((id) => byId.get(id)).filter((movie) => movie?.poster_path)

  async function runSearch(event) {
    event?.preventDefault()
    const term = (query || name).trim()
    if (!term) return
    setQuery(term)
    setSearching(true)
    setError(null)
    try {
      setResults(await searchCollections(term))
    } catch (err) {
      setError(err)
    } finally {
      setSearching(false)
    }
  }

  async function pickTmdb(item) {
    setPoster(item.poster_path)
    setTmdbId(item.id)
    if (!name.trim()) setName(item.name.slice(0, 60))
    try {
      const full = await getCollection(item.id)
      const tmdbIds = new Set(full.parts.map((part) => part.tmdb_id))
      const seen = movies
        .filter((movie) => tmdbIds.has(movie.tmdb_id) && !chosen.includes(movie.id))
        .sort((a, b) => (a.release_year ?? 9999) - (b.release_year ?? 9999))
      setSuggest(seen.length ? { name: full.name, ids: seen.map((movie) => movie.id) } : null)
    } catch {
      setSuggest(null)
    }
  }

  function move(index, step) {
    const next = [...chosen]
    const target = index + step
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setChosen(next)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!name.trim()) {
      setError(new Error('Dê um nome para a coleção.'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      const fallback = poster ?? chosenPosters[0]?.poster_path ?? null
      const id = await saveCollection({ collection, name, posterPath: fallback, tmdbCollectionId: poster ? tmdbId : null, movieIds: chosen })
      onSaved(id)
    } catch (err) {
      setError(err)
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Apagar a coleção "${collection.name}"?\n\nOs filmes, notas e comentários continuam na lista.`)) return
    setBusy(true)
    setError(null)
    try {
      await deleteCollection(collection.id)
      onDeleted()
    } catch (err) {
      setError(err)
      setBusy(false)
    }
  }

  const posterButton = (path, label, onPick, key) => (
    <button
      key={key}
      type="button"
      className={`coll-poster-pick${poster === path ? ' is-on' : ''}`}
      onClick={onPick}
      title={label}
      aria-label={`Usar capa: ${label}`}
      aria-pressed={poster === path}
    >
      <img src={posterUrl(path, 'w185')} alt="" loading="lazy" />
    </button>
  )

  return (
    <FormModal label={collection ? 'Editar coleção' : 'Nova coleção'} onClose={onClose} className="coll-form-modal">
      <form className="stack coll-form" onSubmit={handleSubmit}>
        <h2>{collection ? 'Editar coleção' : 'Nova coleção'}</h2>

        <label className="field">
          <span>Nome</span>
          <input value={name} maxLength={60} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Coleção Marvel" required />
        </label>

        <fieldset className="coll-section">
          <legend>Capa</legend>
          <div className="coll-cover-row">
            <span className="coll-cover-now">
              {poster ? <img src={posterUrl(poster, 'w185')} alt="Capa escolhida" /> : <Icon name="movies" />}
            </span>
            <div className="coll-cover-search">
              <p className="muted">Procure a coleção no TMDB para usar o pôster oficial (ex.: Vingadores, Harry Potter).</p>
              <div className="coll-search-line">
                <input
                  type="search"
                  value={query}
                  placeholder={name || 'Nome da coleção no TMDB'}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && runSearch(event)}
                  aria-label="Procurar coleção no TMDB"
                />
                <button type="button" className="btn btn-ghost" onClick={runSearch} disabled={searching}>
                  Procurar
                </button>
              </div>
            </div>
          </div>
          {searching && <Spinner label="Procurando coleções..." />}
          {results && !searching && results.length === 0 && <p className="muted">Nenhuma coleção encontrada no TMDB.</p>}
          {results?.length > 0 && (
            <div className="coll-poster-grid">
              {results.map((item) => (
                <div key={item.id} className="coll-poster-item">
                  {posterButton(item.poster_path, item.name, () => pickTmdb(item), item.id)}
                  <small>{item.name}</small>
                </div>
              ))}
            </div>
          )}
          {chosenPosters.length > 0 && (
            <>
              <p className="muted">Ou use o pôster de um dos filmes:</p>
              <div className="coll-poster-grid is-small">
                {chosenPosters.map((movie) =>
                  posterButton(movie.poster_path, movie.title, () => {
                    setPoster(movie.poster_path)
                    setTmdbId(null)
                  }, movie.id),
                )}
              </div>
            </>
          )}
        </fieldset>

        {suggest && (
          <div className="coll-suggest">
            <span>
              A turma já viu {suggest.ids.length} {suggest.ids.length === 1 ? 'filme' : 'filmes'} de <b>{suggest.name}</b>.
            </span>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setChosen((list) => [...list, ...suggest.ids.filter((id) => !list.includes(id))])
                setSuggest(null)
              }}
            >
              Adicionar {suggest.ids.length === 1 ? 'ele' : 'todos'}
            </button>
          </div>
        )}

        <fieldset className="coll-section">
          <legend>Filmes da coleção ({chosen.length})</legend>
          {chosen.length === 0 && <p className="muted">Nenhum filme ainda. Escolha abaixo entre os filmes que a turma já viu.</p>}
          <ol className="coll-chosen">
            {chosen.map((id, index) => {
              const movie = byId.get(id)
              return (
                <li key={id}>
                  <span className="coll-thumb">{movie.poster_path && <img src={posterUrl(movie.poster_path, 'w92')} alt="" />}</span>
                  <span className="coll-title">
                    {movie.title}
                    {movie.release_year && <span className="muted"> ({movie.release_year})</span>}
                  </span>
                  <span className="coll-row-actions">
                    <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Subir ${movie.title}`}>
                      ↑
                    </button>
                    <button type="button" onClick={() => move(index, 1)} disabled={index === chosen.length - 1} aria-label={`Descer ${movie.title}`}>
                      ↓
                    </button>
                    <button type="button" onClick={() => setChosen(chosen.filter((item) => item !== id))} aria-label={`Tirar ${movie.title}`}>
                      ✕
                    </button>
                  </span>
                </li>
              )
            })}
          </ol>
        </fieldset>

        <fieldset className="coll-section">
          <legend>Adicionar filmes da turma</legend>
          <input type="search" value={movieFilter} onChange={(event) => setMovieFilter(event.target.value)} placeholder="Filtrar por nome ou ano" aria-label="Filtrar filmes da turma" />
          <ul className="coll-pool">
            {others.map((movie) => (
              <li key={movie.id}>
                <button type="button" onClick={() => setChosen([...chosen, movie.id])}>
                  <span className="coll-thumb">{movie.poster_path && <img src={posterUrl(movie.poster_path, 'w92')} alt="" loading="lazy" />}</span>
                  <span className="coll-title">
                    {movie.title}
                    {movie.release_year && <span className="muted"> ({movie.release_year})</span>}
                  </span>
                  <span className="coll-add" aria-hidden="true">+</span>
                </button>
              </li>
            ))}
            {others.length === 0 && <li className="muted">Nenhum filme {movieFilter.trim() ? 'encontrado' : 'sobrando'}.</li>}
          </ul>
        </fieldset>

        {error && <ErrorBox error={error} />}

        <div className="modal-actions">
          {collection && (
            <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={busy}>
              Apagar
            </button>
          )}
          <span className="spacer" />
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </FormModal>
  )
}
