import { supabase } from '../lib/supabase'

// Números do "placar" no topo do site: fotos, filmes, jogos e a nota média.
// Usamos count + head para o banco só contar, sem trazer as linhas.
async function countRows(table) {
  const { count, error } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
  if (error) throw error
  return count ?? 0
}

export async function getCounters() {
  const [photos, movies, games, ratings] = await Promise.all([
    // Conta todas as fotos (post_images); sem a migração, conta os posts.
    countRows('post_images').catch(() => countRows('posts')),
    countRows('movies'),
    countRows('games'),
    supabase.from('ratings').select('score'),
  ])

  if (ratings.error) throw ratings.error

  const scores = ratings.data.map((row) => row.score)
  const average = scores.length
    ? scores.reduce((sum, score) => sum + score, 0) / scores.length
    : null

  return { photos, movies, games, average }
}
