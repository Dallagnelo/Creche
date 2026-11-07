import { supabase } from '../lib/supabase'

// Notas dos jogos (tabela game_ratings; veja supabase/migracao-notas-jogos.sql).
// Mesmo formato das notas dos filmes, em um arquivo separado.

/** Cria ou atualiza a nota do usuário para o jogo. */
export async function saveGameRating({ gameId, score, comment, userId }) {
  const { error } = await supabase.from('game_ratings').upsert(
    {
      game_id: gameId,
      user_id: userId,
      score,
      comment: comment.trim() || null,
    },
    // Já existe uma nota deste usuário para este jogo? Então atualiza.
    { onConflict: 'game_id,user_id' },
  )

  if (error) throw error
}

export async function deleteGameRating(ratingId) {
  const { error } = await supabase.from('game_ratings').delete().eq('id', ratingId)
  if (error) throw error
}
