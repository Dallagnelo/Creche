import { supabase } from '../lib/supabase'

// Sugestões da turma (tabela suggestions; veja supabase/migracao-sugestoes.sql).

function friendlyError(error) {
  if (error?.code === 'PGRST205' || (/suggestion/i.test(error?.message ?? '') && /schema cache|does not exist/i.test(error?.message ?? ''))) {
    return new Error('A tabela de sugestões ainda não existe. Rode o arquivo migracao-sugestoes.sql no SQL Editor do Supabase.')
  }
  return error
}

export const RESOLVED_TTL_HOURS = 48

export async function listSuggestions() {
  // Apaga as resolvidas há mais de 48 h (se a migração ainda não foi rodada, ignora o erro).
  await supabase.rpc('cleanup_resolved_suggestions')

  const query = (columns) =>
    supabase
      .from('suggestions')
      .select(`id, kind, body, created_at, user_id, ${columns}author:profiles(display_name, avatar_url)`)
      .order('created_at', { ascending: false })
      .limit(50)

  let { data, error } = await query('resolved_at, ')
  // Sem a coluna resolved_at (migração não rodada), a lista continua funcionando.
  if (error && /resolved_at/i.test(error.message ?? '')) ({ data, error } = await query(''))
  if (error) throw friendlyError(error)

  // Esconde as que já passaram de 48 h resolvidas, mesmo antes de o banco apagar.
  const limit = Date.now() - RESOLVED_TTL_HOURS * 3600 * 1000
  return data.filter((item) => !item.resolved_at || new Date(item.resolved_at).getTime() > limit)
}

export async function createSuggestion({ kind, body, userId }) {
  const { error } = await supabase.from('suggestions').insert({ kind, body: body.trim(), user_id: userId })
  if (error) throw friendlyError(error)
}

/** Apaga uma sugestão sua. Se o banco não deixar, o Supabase não dá erro: por isso conferimos as linhas apagadas. */
export async function deleteSuggestion(id) {
  const { data, error } = await supabase.from('suggestions').delete().eq('id', id).select('id')
  if (error) throw friendlyError(error)
  if (!data?.length) throw new Error('Não foi possível apagar esta sugestão.')
}

/** Edita uma sugestão sua (texto e tipo). */
export async function updateSuggestion({ id, kind, body }) {
  const { data, error } = await supabase.from('suggestions').update({ kind, body: body.trim() }).eq('id', id).select('id')
  if (error) throw friendlyError(error)
  if (!data?.length) throw new Error('Não foi possível salvar: só quem mandou a sugestão pode editar. Se for você, rode o migracao-sugestoes-resolvidas.sql no Supabase.')
}

/** Admin: marca (ou desmarca) uma sugestão como resolvida. Ela some sozinha 48 h depois. */
export async function setSuggestionResolved(id, resolved) {
  const { data, error } = await supabase
    .from('suggestions')
    .update({ resolved_at: resolved ? new Date().toISOString() : null })
    .eq('id', id)
    .select('id')
  if (error) throw friendlyError(error)
  if (!data?.length) throw new Error('Não foi possível marcar: só o admin pode. Rode o migracao-sugestoes-resolvidas.sql no Supabase.')
}
