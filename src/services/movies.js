import { supabase } from '../lib/supabase'

/** Lista os filmes já com todas as avaliações e a média. */
export async function listMovies() {
  const { data, error } = await supabase
    .from('movies')
    .select(
      `id, tmdb_id, imdb_id, title, poster_path, release_year, overview, created_at, added_by,
       ratings ( id, user_id, score, comment, watched_at, user:profiles ( display_name, avatar_url ) )`,
    )
    .order('created_at', { ascending: false })

  if (error) throw error

  return data.map((movie) => ({
    ...movie,
    average: movie.ratings.length
      ? movie.ratings.reduce((sum, rating) => sum + rating.score, 0) / movie.ratings.length
      : null,
  }))
}

/**
 * Garante que o filme existe na nossa tabela e devolve o id dele.
 * Se outro amigo já cadastrou, reaproveita. Senão, cria.
 */
async function ensureMovie(movie, userId) {
  const { data: existing, error: findError } = await supabase
    .from('movies')
    .select('id')
    .eq('tmdb_id', movie.tmdb_id)
    .maybeSingle()

  if (findError) throw findError
  if (existing) return existing.id

  const { data, error } = await supabase
    .from('movies')
    .insert({
      tmdb_id: movie.tmdb_id,
      imdb_id: movie.imdb_id ?? null,
      title: movie.title,
      poster_path: movie.poster_path,
      release_year: movie.release_year,
      overview: movie.overview,
      added_by: userId,
    })
    .select('id')
    .single()

  if (error) throw error
  return data.id
}

/** Cria ou atualiza a nota do usuário para o filme. */
export async function saveRating({ movie, score, comment, watchedAt, userId }) {
  const movieId = await ensureMovie(movie, userId)

  const { error } = await supabase.from('ratings').upsert(
    {
      movie_id: movieId,
      user_id: userId,
      score,
      comment: comment.trim() || null,
      watched_at: watchedAt || null,
    },
    // Já existe uma nota deste usuário para este filme? Então atualiza.
    { onConflict: 'movie_id,user_id' },
  )

  if (error) throw error
}

/**
 * Apaga um filme que você cadastrou. As notas e os comentários dele somem junto (cascata no banco).
 * Se o banco não deixar (regra de exclusão ainda não criada), o Supabase NÃO dá erro: só apaga 0 linhas.
 * Por isso pedimos as linhas apagadas de volta (.select) e conferimos.
 */
export async function deleteMovie(movieId) {
  const { data, error } = await supabase.from('movies').delete().eq('id', movieId).select('id')
  if (error) throw error
  if (!data?.length) {
    throw new Error(
      'Não foi possível apagar este filme. Só quem o cadastrou pode apagar, e é preciso rodar o arquivo migracao-excluir-filmes.sql no Supabase.',
    )
  }
}

export async function deleteRating(ratingId) {
  const { error } = await supabase.from('ratings').delete().eq('id', ratingId)
  if (error) throw error
}
