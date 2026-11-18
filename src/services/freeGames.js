import { supabase } from '../lib/supabase'

// Jogos grátis (tabela free_games, preenchida pela função "free-games"; veja supabase/migracao-jogos-gratis.sql)
export const FREE_HINT = 'Falta rodar a migração "migracao-jogos-gratis.sql" e publicar a função "free-games" no Supabase (veja o LEIA-ME da função).'
const missing = (error) => /free_game|42P01|PGRST205|42703/i.test(`${error?.code ?? ''} ${error?.message ?? ''}`)

/** Lista atual (grátis agora + os que vão ficar grátis) e quem já pegou cada um. null = sem migração. */
export async function listFreeGames() {
  const [games, claims, state] = await Promise.all([
    supabase.from('free_games').select('*').eq('active', true).order('upcoming').order('ends_at', { ascending: true, nullsFirst: false }),
    supabase.from('free_game_claims').select('user_id, game_key'),
    supabase.from('free_games_state').select('refreshed_at').maybeSingle(),
  ])
  const error = games.error ?? claims.error
  if (error) {
    if (missing(error)) return null
    throw error
  }
  const claimed = new Map()
  for (const c of claims.data ?? []) claimed.set(c.game_key, [...(claimed.get(c.game_key) ?? []), c.user_id])
  // o que já acabou mas ainda não saiu da lista some daqui
  const now = Date.now()
  const list = (games.data ?? []).filter((g) => !g.ends_at || Date.parse(g.ends_at) > now)
  return { games: list, claimed, refreshedAt: state.data?.refreshed_at ?? null }
}

/**
 * Pede para a função atualizar a lista (ela só busca de novo se tiver mais de 1 hora).
 * Devolve true se trouxe coisa nova. Nunca lança erro: se a função não existir, a aba mostra o que já tem.
 */
export async function refreshFreeGames() {
  try {
    const { data, error } = await supabase.functions.invoke('free-games', { body: {} })
    if (error) return { refreshed: false, error: error.message }
    return data ?? { refreshed: false }
  } catch (err) {
    return { refreshed: false, error: err.message }
  }
}

/** Uma vez por sessão (Home e a aba chamam): mantém a lista em dia e dispara os avisos de jogo novo. */
let session = null
export function refreshFreeGamesOnce() {
  if (!session) session = refreshFreeGames()
  return session
}

export async function setClaimed(userId, gameKey, on) {
  const query = on
    ? supabase.from('free_game_claims').insert({ user_id: userId, game_key: gameKey })
    : supabase.from('free_game_claims').delete().eq('user_id', userId).eq('game_key', gameKey)
  const { error } = await query
  if (error && error.code !== '23505') throw error
}
