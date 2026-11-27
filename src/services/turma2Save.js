import { supabase } from '../lib/supabase'

// Progresso da Turma 2.0 no banco (tabela turma2_saves; veja supabase/migracao-turma2-progresso.sql).
// Sem a migração rodada, segue só com o que está no navegador (e avisa uma vez no console).

let warned = false
const warn = (msg) => {
  if (warned) return
  warned = true
  console.warn('Progresso da Turma 2.0 só no navegador:', msg)
}

export async function loadRemoteSave(userId) {
  if (!userId) return null
  const { data, error } = await supabase.from('turma2_saves').select('data').eq('user_id', userId).maybeSingle()
  if (error) {
    warn(error.message)
    return null
  }
  return data?.data ?? null
}

let timer = null
let pending = null
const write = async (p) => {
  const { error } = await supabase.from('turma2_saves').upsert({ user_id: p.userId, data: p.save, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) warn(error.message)
}
/** grava no banco daqui a pouco (junta várias mudanças seguidas numa gravação só) */
export function queueRemoteSave(userId, save) {
  if (!userId) return
  pending = { userId, save }
  if (timer) return
  timer = setTimeout(() => {
    timer = null
    const p = pending
    pending = null
    if (p) write(p)
  }, 1500)
}

/** grava já o que estava esperando (ao sair da página ou do jogo, para não perder o último segundo) */
export function flushRemoteSave() {
  if (timer) clearTimeout(timer)
  timer = null
  const p = pending
  pending = null
  if (p) write(p)
}
