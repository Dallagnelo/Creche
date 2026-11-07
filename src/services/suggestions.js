import { supabase } from '../lib/supabase'

// Sugestões da turma (tabela suggestions; veja supabase/migracao-sugestoes.sql).

function friendlyError(error) {
  if (error?.code === 'PGRST205' || (/suggestion/i.test(error?.message ?? '') && /schema cache|does not exist/i.test(error?.message ?? ''))) {
    return new Error('A tabela de sugestões ainda não existe. Rode o arquivo migracao-sugestoes.sql no SQL Editor do Supabase.')
  }
  return error
}

export async function listSuggestions() {
  const { data, error } = await supabase
    .from('suggestions')
    .select('id, kind, body, created_at, user_id, author:profiles(display_name, avatar_url)')
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw friendlyError(error)
  return data
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
