import { supabase } from '../lib/supabase'

// Tempo total que cada pessoa já ficou ao vivo (tabela live_time; veja supabase/migracao-tempo-de-live.sql).

/** { [userId]: segundos } de todo mundo. Se a migração ainda não foi rodada, devolve vazio. */
export async function listLiveTimes() {
  const { data, error } = await supabase.from('live_time').select('user_id, seconds')
  if (error) {
    console.warn('Tempo de live indisponível:', error.message)
    return {}
  }
  return Object.fromEntries(data.map((row) => [row.user_id, Number(row.seconds)]))
}

/** Soma segundos ao tempo de live de quem está logado (o banco limita cada soma a 2 minutos). */
export async function addLiveTime(seconds) {
  const { error } = await supabase.rpc('add_live_time', { seconds_to_add: Math.round(seconds) })
  if (error) console.warn('Não consegui salvar o tempo de live:', error.message)
}

/** Quem mais ficou ao vivo: [{ user_id, seconds, profile: { display_name, avatar_url } }], do maior para o menor. */
export async function listLiveRanking(limit = 5) {
  const { data, error } = await supabase
    .from('live_time')
    .select('user_id, seconds, profile:profiles(display_name, avatar_url)')
    .gt('seconds', 0)
    .order('seconds', { ascending: false })
    .limit(limit)
  if (error) {
    console.warn('Ranking de lives indisponível:', error.message)
    return []
  }
  return data
}
