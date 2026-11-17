import { useMemo, useState } from 'react'
import { formatAverage } from '../lib/format'
import { sortList } from '../lib/listSort'
import { posterUrl } from '../lib/tmdb'
import { COLLECTIONS_HINT } from '../services/collections'
import { EmptyState } from './Feedback'
import Icon from './Icon'
import MovieCard from './MovieCard'

// Nota da turma numa coleção: média de todas as notas de todos os filmes dela.
function collectionStats(list) {
  const scores = list.flatMap((movie) => movie.ratings.map((rating) => rating.score))
  return { count: list.length, average: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null }
}

export function collectionMovies(collection, byId) {
  return collection.movieIds.map((id) => byId.get(id)).filter(Boolean)
}

/** Cartão de uma coleção (mesmo formato dos pôsteres de filme). */
export function CollectionCard({ collection, movies, onOpen }) {
  const poster = posterUrl(collection.poster_path, 'w500')
  const { count, average } = collectionStats(movies)
  return (
    <button type="button" className="movie-card coll-card" onClick={() => onOpen(collection)}>
      <span className="movie-card-poster">
        {poster ? (
          <img src={poster} alt={`Capa de ${collection.name}`} loading="lazy" />
        ) : (
          <span className="movie-card-empty" aria-hidden="true">
            <Icon name="movies" />
          </span>
        )}
        {average != null && (
          <span className="movie-score">
            <span aria-hidden="true">★</span> {formatAverage(average)}
          </span>
        )}
        <span className="coll-badge">{count} {count === 1 ? 'filme' : 'filmes'}</span>
      </span>
      <span className="movie-card-title">{collection.name}</span>
      <span className="muted movie-card-meta">Coleção · {count} {count === 1 ? 'filme' : 'filmes'}</span>
    </button>
  )
}

const ORDERS = [
  { id: 'own', label: 'Ordem da coleção' },
  { id: 'classic', label: 'Lançamento (mais antigo)' },
  { id: 'newest', label: 'Lançamento (mais novo)' },
  { id: 'best', label: 'Maior nota da turma' },
  { id: 'mine', label: 'Minha nota' },
]

/** Coleção aberta: cabeçalho com capa, nome e média, e os filmes dela com as notas da turma. */
export function CollectionDetail({ collection, movies, userId, canEdit, onBack, onEdit, onOpenMovie }) {
  const [order, setOrder] = useState('own')
  const list = useMemo(() => (order === 'own' ? movies : sortList(movies, order, userId)), [movies, order, userId])
  const { count, average } = collectionStats(movies)
  const poster = posterUrl(collection.poster_path, 'w185')

  return (
    <div className="stack coll-detail">
      <div className="coll-head">
        <button type="button" className="btn btn-ghost coll-back" onClick={onBack}>
          ← Coleções
        </button>
        <div className="coll-head-main">
          {poster && <img className="coll-head-poster" src={poster} alt="" />}
          <div>
            <h2>{collection.name}</h2>
            <p className="muted">
              {count} {count === 1 ? 'filme' : 'filmes'}
              {average != null && (
                <>
                  {' · '}
                  <span className="coll-avg">★ {formatAverage(average)}</span> média da turma
                </>
              )}
            </p>
          </div>
        </div>
        <div className="coll-head-actions">
          <label className="list-sort">
            <span className="list-sort-label">Ordenar</span>
            <select value={order} onChange={(event) => setOrder(event.target.value)}>
              {ORDERS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          {canEdit && (
            <button type="button" className="btn btn-ghost" onClick={onEdit}>
              Editar
            </button>
          )}
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState icon="🎬" title="Coleção vazia">
          {canEdit ? 'Toque em "Editar" para colocar filmes nela.' : 'Ainda não tem filmes nesta coleção.'}
        </EmptyState>
      ) : (
        <ul className="movie-grid">
          {list.map((movie) => (
            <li key={movie.id}>
              <MovieCard movie={movie} onOpen={onOpenMovie} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Grade de coleções (ou o aviso de migração / lista vazia). */
export function CollectionsGrid({ collections, byId, filter, onOpen, onCreate }) {
  if (collections === null) return <p className="muted list-empty">{COLLECTIONS_HINT}</p>
  const visible = collections.filter((collection) => collection.name.toLowerCase().includes(filter.trim().toLowerCase()))
  if (collections.length === 0) {
    return (
      <EmptyState icon="🗂️" title="Nenhuma coleção ainda">
        Junte filmes que a turma já viu, como a Coleção Marvel.{' '}
        <button type="button" className="btn btn-primary coll-empty-btn" onClick={onCreate}>
          Criar coleção
        </button>
      </EmptyState>
    )
  }
  if (visible.length === 0) return <p className="muted list-empty">Nenhuma coleção encontrada para “{filter.trim()}”.</p>
  return (
    <ul className="movie-grid">
      {visible.map((collection) => (
        <li key={collection.id}>
          <CollectionCard collection={collection} movies={collectionMovies(collection, byId)} onOpen={onOpen} />
        </li>
      ))}
    </ul>
  )
}
