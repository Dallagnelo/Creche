import { supabase } from '../lib/supabase'

// Mapas da Turma 2.0 feitos no editor do admin (tabela turma2_maps; veja supabase/migracao-turma2-mapas.sql).
// Os mapas que vêm com o jogo (Enseada da Maré, Cidade das Flores e o que tem dentro deles) ficam em src/lib/turma2/defaultMaps.json, no mesmo
// formato do editor: dá para abrir e editar no editor; ao salvar, a versão do banco passa a valer no lugar da original.
// Sem a migração rodada, listMaps devolve só os mapas que vêm com o jogo.

/** em qual mapa o jogo começa */
export const START_CODE = 'enseada'

let defaultsPromise = null
/** os mapas que vêm com o jogo (carregados só quando precisa: o arquivo é grande) */
export function defaultMaps() {
  if (!defaultsPromise) defaultsPromise = import('../lib/turma2/defaultMaps.json').then((m) => m.default.maps)
  return defaultsPromise
}

/** Todos os mapas que você pode ver (a turma vê os publicados; o admin vê também os rascunhos).
 *  padrao: vem com o jogo; db: tem versão salva no banco (a do banco ganha). */
export async function listMaps() {
  const [defaults, res] = await Promise.all([
    defaultMaps().catch((e) => {
      console.warn('Mapas do jogo indisponíveis:', e.message)
      return []
    }),
    supabase.from('turma2_maps').select('id, code, name, data, published, updated_at').order('name'),
  ])
  if (res.error) console.warn('Mapas da Turma 2.0 indisponíveis:', res.error.message)
  const fromDb = res.error ? [] : res.data
  const byCode = new Map(fromDb.map((r) => [r.code, r]))
  const merged = defaults.map((d) => {
    const own = byCode.get(d.code)
    return own ? { ...own, padrao: true, db: true } : { ...d, padrao: true, db: false }
  })
  const codes = new Set(defaults.map((d) => d.code))
  return [...merged, ...fromDb.filter((r) => !codes.has(r.code)).map((r) => ({ ...r, db: true }))]
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
