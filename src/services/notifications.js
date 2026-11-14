import { supabase } from '../lib/supabase'

// Notificações (tabelas notifications, notification_prefs e push_subscriptions; veja supabase/migracao-notificacoes.sql).

const missing = (error) => error?.code === 'PGRST205' || error?.code === 'PGRST202' || error?.code === '42P01'

/** As últimas notificações de quem está logado (mais novas primeiro). Sem a migração, devolve vazio. */
export async function listNotifications(limit = 40) {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, kind, title, body, link, created_at, read_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) {
    if (!missing(error)) console.warn('Notificações indisponíveis:', error.message)
    return []
  }
  return data
}

export async function markAllRead() {
  const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null)
  if (error) console.warn('Não consegui marcar como lidas:', error.message)
}

export async function markRead(id) {
  const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id)
  if (error) console.warn('Não consegui marcar como lida:', error.message)
}

export async function clearNotifications(userId) {
  const { error } = await supabase.from('notifications').delete().eq('user_id', userId)
  if (error) throw error
}

/** Avisa quando chega notificação nova (Realtime). Devolve a função para parar de ouvir. */
export function watchNotifications(userId, onNew) {
  const channel = supabase
    .channel(`notificacoes:${userId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, (change) =>
      onNew(change.new),
    )
    .subscribe()
  return () => supabase.removeChannel(channel)
}

export const DEFAULT_PREFS = { live: true, events: true, polls: true }

export async function getNotificationPrefs(userId) {
  const { data, error } = await supabase.from('notification_prefs').select('live, events, polls').eq('user_id', userId).maybeSingle()
  if (error) {
    if (missing(error)) throw new Error('As notificações ainda não existem no banco. Rode o arquivo migracao-notificacoes.sql no SQL Editor do Supabase.')
    throw error
  }
  return data ?? DEFAULT_PREFS
}

export async function saveNotificationPrefs(userId, prefs) {
  const { error } = await supabase.from('notification_prefs').upsert({ user_id: userId, ...prefs })
  if (error) throw error
}

/** Gera os avisos com hora marcada (evento amanhã, votação acabando). Não repete aviso. */
export async function runDueNotifications() {
  const { error } = await supabase.rpc('notify_due')
  if (error && !missing(error)) console.warn('Avisos agendados:', error.message)
}

export async function notifyLiveStarted() {
  const { error } = await supabase.rpc('notify_live_started')
  if (error && !missing(error)) console.warn('Aviso de live:', error.message)
}

export async function sendTestNotification() {
  const { error } = await supabase.rpc('notify_test')
  if (error) throw error
}

export async function savePushSubscription(subscription) {
  const json = subscription.toJSON()
  const { error } = await supabase.rpc('save_push_subscription', { p_endpoint: json.endpoint, p_p256dh: json.keys.p256dh, p_auth: json.keys.auth })
  if (error) throw error
}

export async function removePushSubscription(endpoint) {
  const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
  if (error) console.warn('Não consegui remover o aparelho:', error.message)
}

/** Admin: manda um aviso escrito para a turma toda. Devolve quantas pessoas receberam. */
export async function sendAdminBroadcast({ title, body, link }) {
  const { data, error } = await supabase.rpc('admin_broadcast', { p_title: title, p_body: body || null, p_link: link || null })
  if (error) {
    if (missing(error)) throw new Error('Falta rodar o arquivo migracao-avisos-admin.sql no SQL Editor do Supabase.')
    throw new Error(error.message)
  }
  return data ?? 0
}
