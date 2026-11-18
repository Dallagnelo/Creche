import { supabase } from '../lib/supabase'

// RPG da turma: campanhas, personagens, rodadas, ações, dados, inimigos e tesouro.
// Tudo protegido por RLS (supabase/migracao-rpg.sql): os dados são sorteados no banco (rpc rpg_roll).

export const RPG_HINT = 'O RPG ainda não foi ativado. Rode o arquivo supabase/migracao-rpg.sql no Supabase.'
const isMissing = (error) => error?.code === 'PGRST205' || error?.code === '42P01' || error?.code === 'PGRST202'
const check = (error) => {
  if (!error) return
  if (isMissing(error)) throw new Error(RPG_HINT)
  throw error
}

// ------------------------------------------------------------ campanhas
/** Campanhas que eu vejo (sou mestre ou jogador). Sem a migração: null. */
export async function listCampaigns() {
  const { data, error } = await supabase
    .from('rpg_campaigns')
    .select('id, name, status, master_id, round_days, created_at, master:profiles!rpg_campaigns_master_id_fkey ( display_name ), members:rpg_members ( user_id ), rounds:rpg_rounds ( number, status, closes_at )')
    .order('created_at', { ascending: false })
  if (error) {
    if (isMissing(error)) return null
    throw error
  }
  return data.map((c) => {
    const current = [...(c.rounds ?? [])].sort((a, b) => b.number - a.number)[0] ?? null
    return { ...c, current }
  })
}

export async function createCampaign({ name, roundDays }) {
  const { data, error } = await supabase.from('rpg_campaigns').insert({ name: name.trim(), round_days: roundDays }).select('id').single()
  check(error)
  return data.id
}

export async function updateCampaign(id, patch) {
  const { error } = await supabase.from('rpg_campaigns').update(patch).eq('id', id)
  check(error)
}

/** Tudo da mesa de uma vez: campanha, jogadores, personagens, rodadas, ações, rolagens e inimigos. */
export async function getTable(campaignId, { master = false } = {}) {
  const [campaign, members, characters, rounds, rolls, enemies, loot] = await Promise.all([
    supabase.from('rpg_campaigns').select('*, master:profiles!rpg_campaigns_master_id_fkey ( display_name )').eq('id', campaignId).maybeSingle(),
    supabase.from('rpg_members').select('user_id, wants, created_at, profile:profiles ( id, display_name, avatar_url )').eq('campaign_id', campaignId).order('created_at'),
    supabase.from('rpg_characters').select('*').eq('campaign_id', campaignId).order('created_at'),
    supabase.from('rpg_rounds').select('*').eq('campaign_id', campaignId).order('number', { ascending: false }),
    supabase.from('rpg_rolls').select('*').eq('campaign_id', campaignId).order('created_at', { ascending: false }).limit(60),
    master ? supabase.from('rpg_enemies').select('*').eq('campaign_id', campaignId).order('created_at') : supabase.rpc('rpg_enemy_status', { p_campaign: campaignId }),
    master ? supabase.from('rpg_loot').select('*').eq('campaign_id', campaignId).order('created_at') : Promise.resolve({ data: [] }),
  ])
  for (const result of [campaign, members, characters, rounds, rolls, enemies, loot]) check(result.error)
  if (!campaign.data) return null
  const current = rounds.data[0] ?? null
  let actions = []
  if (current) {
    const res = await supabase.from('rpg_actions').select('*').eq('round_id', current.id)
    check(res.error)
    actions = res.data
  }
  return {
    campaign: campaign.data,
    members: members.data,
    characters: characters.data,
    rounds: rounds.data,
    current,
    actions,
    rolls: rolls.data,
    enemies: enemies.data ?? [],
    loot: loot.data ?? [],
  }
}

export async function addMember(campaignId, userId) {
  const { error } = await supabase.from('rpg_members').insert({ campaign_id: campaignId, user_id: userId })
  check(error)
}
// ------------------------------------------------------------ sala de espera (lobby)
/** Entra na sala de espera dizendo se quer jogar, mestrar ou tanto faz. */
export async function joinLobby(campaignId, userId, wants = 'jogar') {
  const { error } = await supabase.from('rpg_members').insert({ campaign_id: campaignId, user_id: userId, wants })
  if (error && /row-level security/i.test(error.message ?? '')) throw new Error('A campanha já começou: peça ao mestre para te chamar.')
  check(error)
}
export async function setWants(campaignId, userId, wants) {
  const { error } = await supabase.from('rpg_members').update({ wants }).eq('campaign_id', campaignId).eq('user_id', userId)
  check(error)
}
/** Só o admin: passa o posto de mestre. Quem era mestre volta para a sala como jogador. */
export async function setMaster(campaign, newMasterId) {
  const previous = campaign.master_id
  if (previous === newMasterId) return
  const { error: e1 } = await supabase.from('rpg_members').delete().eq('campaign_id', campaign.id).eq('user_id', newMasterId)
  check(e1)
  const { data, error: e2 } = await supabase.from('rpg_campaigns').update({ master_id: newMasterId }).eq('id', campaign.id).select('id')
  check(e2)
  if (!data?.length) throw new Error('Só o admin escolhe o mestre.')
  const { error: e3 } = await supabase.from('rpg_members').insert({ campaign_id: campaign.id, user_id: previous, wants: 'jogar' })
  if (e3 && e3.code !== '23505') check(e3)
}
export async function startCampaign(campaignId) {
  const { data, error } = await supabase.from('rpg_campaigns').update({ status: 'jogando' }).eq('id', campaignId).select('id')
  check(error)
  if (!data?.length) throw new Error('Só o mestre ou o admin começam a campanha.')
}
/** Só o admin: apaga a campanha com tudo dentro (personagens, rodadas, rolagens, inimigos, baú). */
export async function deleteCampaign(campaignId) {
  const { data, error } = await supabase.from('rpg_campaigns').delete().eq('id', campaignId).select('id')
  check(error)
  if (!data?.length) throw new Error('Não foi possível excluir. Só o admin exclui campanhas.')
}

export async function removeMember(campaignId, userId) {
  const { error } = await supabase.from('rpg_members').delete().eq('campaign_id', campaignId).eq('user_id', userId)
  check(error)
}

// ------------------------------------------------------------ personagens
export async function createCharacter(campaignId, character) {
  const { error } = await supabase.from('rpg_characters').insert({ ...character, campaign_id: campaignId })
  check(error)
}
export async function updateCharacter(id, patch) {
  const { error } = await supabase.from('rpg_characters').update(patch).eq('id', id)
  check(error)
}

// ------------------------------------------------------------ rodadas e ações
export async function openRound({ campaignId, number, kind, scene, days }) {
  const closes = new Date(Date.now() + days * 86400000).toISOString()
  const { error } = await supabase.from('rpg_rounds').insert({ campaign_id: campaignId, number, kind, scene: scene.trim(), closes_at: closes })
  check(error)
}
export async function resolveRound(roundId, resolution) {
  const { error } = await supabase
    .from('rpg_rounds')
    .update({ status: 'resolvida', resolution: resolution.trim(), resolved_at: new Date().toISOString() })
    .eq('id', roundId)
  check(error)
}
export async function saveAction({ roundId, characterId, action, move, planB, reaction }) {
  const { error } = await supabase.from('rpg_actions').upsert(
    { round_id: roundId, character_id: characterId, action: action.trim(), move: move.trim(), plan_b: planB.trim(), reaction: reaction.trim(), updated_at: new Date().toISOString() },
    { onConflict: 'round_id,character_id' },
  )
  if (error && /row-level security/i.test(error.message ?? '')) throw new Error('A rodada já fechou: não dá mais para mudar a ação.')
  check(error)
}

/** Rola no servidor. Devolve a rolagem gravada (results, total...). */
export async function roll({ campaignId, sides, count = 1, modifier = 0, label = '', roundId = null, characterId = null, secret = false }) {
  const { data, error } = await supabase.rpc('rpg_roll', {
    p_campaign: campaignId, p_sides: sides, p_count: count, p_modifier: modifier, p_label: label,
    p_round: roundId, p_character: characterId, p_secret: secret,
  })
  check(error)
  return data
}

// ------------------------------------------------------------ mestre: inimigos e tesouro
export async function addEnemy(campaignId, { name, monsterKey, hp, defense }) {
  const { error } = await supabase.from('rpg_enemies').insert({ campaign_id: campaignId, name, monster_key: monsterKey, hp, hp_max: hp, defense })
  check(error)
}
export async function updateEnemy(id, patch) {
  const { error } = await supabase.from('rpg_enemies').update(patch).eq('id', id)
  check(error)
}
export async function removeEnemy(id) {
  const { error } = await supabase.from('rpg_enemies').delete().eq('id', id)
  check(error)
}
export async function addLoot(campaignId, itemKey, qty = 1) {
  const { error } = await supabase.from('rpg_loot').insert({ campaign_id: campaignId, item_key: itemKey, qty })
  check(error)
}
export async function removeLoot(id) {
  const { error } = await supabase.from('rpg_loot').delete().eq('id', id)
  check(error)
}
