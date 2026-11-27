import { supabase } from '../lib/supabase'

// Mini RPG da Turma 2.0 no banco (veja supabase/migracao-turma2-rpg.sql): grupos, convites, mural e expedições.
// Tudo que muda passa por funções do banco (rpc); a leitura é direta nas tabelas.

const missing = (error) => error?.code === 'PGRST205' || error?.code === 'PGRST202' || error?.code === '42P01'
const fail = (error) => {
  if (missing(error)) throw new Error('Falta rodar a migração "migracao-turma2-rpg.sql" no Supabase.')
  throw new Error(error.message)
}
async function rpc(name, args = {}) {
  const { data, error } = await supabase.rpc(name, args)
  if (error) fail(error)
  return data
}

const PERFIL = 'id, display_name, turma2_char'

/** tudo que o Portal mostra: meu grupo, quem está nele, convites, mural e as expedições */
export async function loadPortal(userId) {
  const { data: me, error } = await supabase.from('turma2_rpg_jogadores').select('user_id, classe, nivel, poder, grupo_id, mural').eq('user_id', userId).maybeSingle()
  if (error) fail(error)
  const grupoId = me?.grupo_id ?? null
  const [grupo, membros, convites, mural, exps, minhas] = await Promise.all([
    grupoId ? supabase.from('turma2_rpg_grupos').select('id, nome, cor, dono').eq('id', grupoId).maybeSingle() : { data: null },
    grupoId ? supabase.from('turma2_rpg_jogadores').select(`user_id, classe, nivel, poder, perfil:profiles(${PERFIL})`).eq('grupo_id', grupoId) : { data: [] },
    supabase.from('turma2_rpg_convites').select('grupo_id, de, created_at, grupo:turma2_rpg_grupos(nome, cor), quem:profiles!turma2_rpg_convites_de_fkey(display_name)').eq('user_id', userId),
    supabase.from('turma2_rpg_jogadores').select(`user_id, classe, nivel, perfil:profiles(${PERFIL})`).eq('mural', true).is('grupo_id', null).neq('user_id', userId),
    grupoId
      ? supabase.from('turma2_rpg_expedicoes').select('id, monstro_id, monstro, status, created_at, inicio, fim, resultado, criada_por').eq('grupo_id', grupoId).in('status', ['aberta', 'lutando']).order('created_at', { ascending: false })
      : { data: [] },
    // histórico: as lutas de que eu participei (mesmo de um grupo antigo)
    supabase.from('turma2_rpg_exp_membros').select('exp_id, pegou, exp:turma2_rpg_expedicoes(id, monstro_id, monstro, status, inicio, fim, resultado)').eq('user_id', userId).order('aceitou', { ascending: false }).limit(15),
  ])
  for (const r of [grupo, membros, convites, mural, exps, minhas]) if (r.error) fail(r.error)
  const expIds = [...new Set([...(exps.data ?? []).map((e) => e.id), ...(minhas.data ?? []).map((m) => m.exp_id)])]
  const quem = expIds.length
    ? await supabase.from('turma2_rpg_exp_membros').select(`exp_id, user_id, classe, papel, nivel, poder, comida, perfil:profiles(${PERFIL})`).in('exp_id', expIds)
    : { data: [] }
  if (quem.error) fail(quem.error)
  const byExp = new Map()
  for (const m of quem.data) byExp.set(m.exp_id, [...(byExp.get(m.exp_id) ?? []), m])
  return {
    me,
    grupo: grupo.data,
    membros: membros.data ?? [],
    convites: convites.data ?? [],
    mural: mural.data ?? [],
    abertas: (exps.data ?? []).map((e) => ({ ...e, membros: byExp.get(e.id) ?? [] })),
    historico: (minhas.data ?? [])
      .filter((m) => m.exp && (m.exp.status === 'fim' || m.exp.status === 'lutando'))
      .map((m) => ({ ...m.exp, pegou: m.pegou, membros: byExp.get(m.exp_id) ?? [] })),
  }
}

/** pessoas que dá para convidar: quem já jogou a Turma 2.0 e está sem grupo */
export async function loadConvidaveis(userId) {
  const [{ data: livres, error }, { data: ocupados, error: e2 }] = await Promise.all([
    supabase.from('profiles').select(PERFIL).not('turma2_char', 'is', null).neq('id', userId).order('display_name'),
    supabase.from('turma2_rpg_jogadores').select('user_id, classe, nivel, grupo_id'),
  ])
  if (error) fail(error)
  if (e2) fail(e2)
  const info = new Map(ocupados.map((j) => [j.user_id, j]))
  return livres.filter((p) => !info.get(p.id)?.grupo_id).map((p) => ({ ...p, classe: info.get(p.id)?.classe ?? null, nivel: info.get(p.id)?.nivel ?? null }))
}

export const souEu = (classe, nivel, poder) => rpc('t2_rpg_eu', { p_classe: classe, p_nivel: nivel, p_poder: poder })
export const setMural = (on) => rpc('t2_rpg_mural', { p_on: on })
export const criarGrupo = (nome, cor) => rpc('t2_rpg_criar_grupo', { p_nome: nome, p_cor: cor })
export const editarGrupo = (nome, cor) => rpc('t2_rpg_editar_grupo', { p_nome: nome, p_cor: cor })
export const convidar = (userId) => rpc('t2_rpg_convidar', { p_user: userId })
export const responderConvite = (grupoId, aceita) => rpc('t2_rpg_responder_convite', { p_grupo: grupoId, p_aceita: aceita })
export const sairDoGrupo = () => rpc('t2_rpg_sair')
export const propor = (monstroId, monstro) => rpc('t2_rpg_propor', { p_monstro_id: monstroId, p_monstro: monstro })
export const aceitar = (expId, d) => rpc('t2_rpg_aceitar', { p_exp: expId, p_classe: d.classe, p_papel: d.papel, p_nivel: d.nivel, p_poder: d.poder, p_comida: d.comida ?? null })
export const comecar = (expId, teste = false) => rpc('t2_rpg_comecar', { p_exp: expId, p_teste: teste })
export const cancelar = (expId) => rpc('t2_rpg_cancelar', { p_exp: expId })
export const terminarJa = (expId) => rpc('t2_rpg_terminar_ja', { p_exp: expId })
export const pegar = (expId) => rpc('t2_rpg_pegar', { p_exp: expId })

/** quantas coisas esperam por mim (convites + recompensas prontas), para o aviso no HUD */
export async function pendencias(userId) {
  const [c, r] = await Promise.all([
    supabase.from('turma2_rpg_convites').select('grupo_id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('turma2_rpg_exp_membros').select('exp_id, exp:turma2_rpg_expedicoes!inner(status, fim)').eq('user_id', userId).eq('pegou', false).in('exp.status', ['fim', 'lutando']),
  ])
  if (c.error || r.error) return { convites: 0, prontas: 0 }
  const now = Date.now()
  const prontas = (r.data ?? []).filter((m) => m.exp.status === 'fim' || new Date(m.exp.fim).getTime() <= now).length
  return { convites: c.count ?? 0, prontas }
}

/** avisa quando algo muda no RPG (alguém aceitou, convite novo, luta acabou). Devolve a função para parar. */
export function watchRpg(userId, onChange) {
  const channel = supabase
    .channel(`turma2-rpg:${userId}:${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'turma2_rpg_expedicoes' }, () => onChange())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'turma2_rpg_exp_membros' }, () => onChange())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'turma2_rpg_jogadores' }, () => onChange())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'turma2_rpg_convites' }, () => onChange())
    .subscribe()
  return () => supabase.removeChannel(channel)
}
