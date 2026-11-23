import { supabase } from '../lib/supabase'

// Números do Cine turma (tabela cinema_stats; veja supabase/migracao-cine-turma.sql).
// Sem a migração rodada, tudo devolve vazio e o cinema funciona normalmente.

/** { [userId]: { seconds, sessions, popcorn_thrown, popcorn_received } } de todo mundo. */
export async function listCinemaStats() {
  const { data, error } = await supabase.from('cinema_stats').select('user_id, seconds, sessions, popcorn_thrown, popcorn_received')
  if (error) {
    console.warn('Números do cinema indisponíveis:', error.message)
    return {}
  }
  return Object.fromEntries(
    data.map((row) => [
      row.user_id,
      { seconds: Number(row.seconds), sessions: row.sessions, popcorn_thrown: row.popcorn_thrown, popcorn_received: row.popcorn_received },
    ]),
  )
}

/** Soma ao seu placar do cinema (o banco limita cada soma). */
export async function addCinemaStats({ seconds = 0, session = false, thrown = 0, received = 0 }) {
  if (!seconds && !session && !thrown && !received) return
  const { error } = await supabase.rpc('add_cinema_stats', {
    seconds_to_add: Math.round(seconds),
    new_session: session,
    thrown_to_add: thrown,
    received_to_add: received,
  })
  if (error) console.warn('Não consegui salvar os números do cinema:', error.message)
}

/** Ranking do cinema: [{ user_id, seconds, sessions, popcorn_thrown, profile }], ordenado pela coluna pedida. */
export async function listCinemaRanking(column = 'seconds', limit = 5) {
  const { data, error } = await supabase
    .from('cinema_stats')
    .select('user_id, seconds, sessions, popcorn_thrown, popcorn_received, profile:profiles(display_name, avatar_url)')
    .gt(column, 0)
    .order(column, { ascending: false })
    .limit(limit)
  if (error) {
    console.warn('Ranking do cinema indisponível:', error.message)
    return []
  }
  return data
}
