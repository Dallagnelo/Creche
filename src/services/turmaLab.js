import { supabase } from '../lib/supabase'

// Ambientes comuns da Turma (nova) que o admin decora (ex.: a sala da turma). Tabela turma_lab_rooms.
const MISSING = 'Falta rodar a migração "migracao-turma-nova.sql" no Supabase.'

export async function getLabRoom(key) {
  const { data, error } = await supabase.from('turma_lab_rooms').select('layout').eq('key', key).limit(1)
  if (error) {
    if (error.code === 'PGRST205' || error.code === '42P01') return null
    throw error
  }
  return data?.[0]?.layout ?? null
}

export async function saveLabRoom(key, layout) {
  const { error } = await supabase.from('turma_lab_rooms').upsert({ key, layout, updated_at: new Date().toISOString() })
  if (error) {
    if (error.code === 'PGRST205' || error.code === '42P01') throw new Error(MISSING)
    if (error.code === '42501') throw new Error('Só o admin pode decorar a sala da turma.')
    throw error
  }
}

/** Ajustes dos móveis do pacote feitos pelo admin: { "lz:B:145": { name, kind, dir, h } }. */
export async function listLabItemConfigs() {
  const { data, error } = await supabase.from('turma_lab_items').select('key, config')
  if (error) {
    if (error.code === 'PGRST205' || error.code === '42P01') return {}
    throw error
  }
  return Object.fromEntries((data ?? []).map((row) => [row.key, row.config]))
}

export async function saveLabItemConfig(key, config) {
  const { error } = config
    ? await supabase.from('turma_lab_items').upsert({ key, config, updated_at: new Date().toISOString() })
    : await supabase.from('turma_lab_items').delete().eq('key', key)
  if (error) {
    if (error.code === 'PGRST205' || error.code === '42P01') throw new Error(MISSING)
    if (error.code === '42501') throw new Error('Só o admin pode ajustar os móveis.')
    throw error
  }
}
