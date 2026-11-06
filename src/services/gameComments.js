import { supabase } from '../lib/supabase'

// Comentários dos jogos (tabela game_comments; veja supabase/migracao-comentarios-jogos.sql).
// Mesmo formato dos comentários de filmes, em um arquivo separado.

/** Comentários de um jogo, do mais antigo para o mais novo (como numa conversa). */
export async function listGameComments(gameId) {
  const { data, error } = await supabase
    .from('game_comments')
    .select('id, body, created_at, user_id, author:profiles(display_name, avatar_url)')
    .eq('game_id', gameId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

export async function addGameComment({ gameId, userId, body }) {
  const { error } = await supabase
    .from('game_comments')
    .insert({ game_id: gameId, user_id: userId, body: body.trim() })

  if (error) throw error
}

export async function deleteGameComment(commentId) {
  const { error } = await supabase.from('game_comments').delete().eq('id', commentId)
  if (error) throw error
}
