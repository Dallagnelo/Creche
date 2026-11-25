import { supabase } from '../lib/supabase'

// Mapas da Turma 2.0 feitos no editor do admin (tabela turma2_maps; veja supabase/migracao-turma2-mapas.sql).
// Sem a migração rodada, listMaps devolve [] e o jogo segue só com os mapas que vêm no site.

/** Todos os mapas que você pode ver (a turma vê os publicados; o admin vê também os rascunhos). */
export async function listMaps() {
  const { data, error } = await supabase.from('turma2_maps').select('id, code, name, data, published, updated_at').order('name')
  if (error) {
    console.warn('Mapas da Turma 2.0 indisponíveis:', error.message)
    return []
  }
  return data
}

/** Cria ou atualiza (pelo code). Devolve a linha salva. */
export async function saveMap({ code, name, data, published }) {
  const { data: row, error } = await supabase
    .from('turma2_maps')
    .upsert({ code, name, data, published }, { onConflict: 'code' })
    .select('id, code, name, data, published, updated_at')
    .single()
  if (error) throw new Error(error.message)
  return row
}

export async function deleteMap(code) {
  const { error } = await supabase.from('turma2_maps').delete().eq('code', code)
  if (error) throw new Error(error.message)
}

/** O personagem da Turma 2.0 de quem está logado (veja supabase/migracao-turma2-personagem.sql). */
export async function saveMyChar(userId, char) {
  const { error } = await supabase.from('profiles').update({ turma2_char: char }).eq('id', userId)
  if (error) {
    if (/turma2_char/i.test(error.message ?? '')) throw new Error('Falta rodar a migração "migracao-turma2-personagem.sql" no Supabase.')
    throw new Error(error.message)
  }
}
