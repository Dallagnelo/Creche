import { supabase } from '../lib/supabase'

// Coleções de filmes da turma (ex.: "Coleção Marvel").
// A coleção só guarda quais filmes estão nela e em que ordem; notas e comentários vêm do próprio filme.

export const COLLECTIONS_HINT = 'As coleções ainda não foram ativadas. Rode o arquivo supabase/migracao-colecoes.sql no Supabase.'

const isMissingTable = (error) => error?.code === 'PGRST205' || error?.code === '42P01'

/** Lista as coleções com os ids dos filmes (na ordem da coleção). Sem a migração, devolve null. */
export async function listCollections() {
  const { data, error } = await supabase
    .from('movie_collections')
    .select('id, name, poster_path, tmdb_collection_id, created_by, created_at, items:movie_collection_items ( movie_id, position )')
    .order('created_at', { ascending: false })
  if (error) {
    if (isMissingTable(error)) return null
    throw error
  }
  return data.map((collection) => ({
    ...collection,
    movieIds: [...(collection.items ?? [])].sort((a, b) => a.position - b.position).map((item) => item.movie_id),
  }))
}

/** Cria ou edita uma coleção e deixa os filmes dela exatamente como "movieIds" (nessa ordem). */
export async function saveCollection({ collection, name, posterPath, tmdbCollectionId, movieIds }) {
  const row = {
    name: name.trim(),
    poster_path: posterPath ?? null,
    tmdb_collection_id: tmdbCollectionId ?? null,
  }
  let id = collection?.id
  if (id) {
    const { error } = await supabase.from('movie_collections').update(row).eq('id', id)
    if (error) throw error
  } else {
    const { data, error } = await supabase.from('movie_collections').insert(row).select('id').single()
    if (error) throw isMissingTable(error) ? new Error(COLLECTIONS_HINT) : error
    id = data.id
  }

  const removed = (collection?.movieIds ?? []).filter((movieId) => !movieIds.includes(movieId))
  if (removed.length) {
    const { error } = await supabase.from('movie_collection_items').delete().eq('collection_id', id).in('movie_id', removed)
    if (error) throw error
  }
  await setCollectionOrder(id, movieIds)
  return id
}

/** Grava a ordem dos filmes (também coloca os que ainda não estavam). */
export async function setCollectionOrder(collectionId, movieIds) {
  if (!movieIds.length) return
  const rows = movieIds.map((movieId, index) => ({ collection_id: collectionId, movie_id: movieId, position: index }))
  const { error } = await supabase.from('movie_collection_items').upsert(rows, { onConflict: 'collection_id,movie_id' })
  if (error) throw error
}

/** Apaga a coleção (os filmes, notas e comentários continuam na lista). */
export async function deleteCollection(collectionId) {
  const { data, error } = await supabase.from('movie_collections').delete().eq('id', collectionId).select('id')
  if (error) throw error
  if (!data?.length) throw new Error('Não foi possível apagar a coleção. Só quem criou (ou o admin) pode apagar.')
}
