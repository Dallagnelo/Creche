import { supabase } from '../lib/supabase'

// Eventos da turma (tabelas events e event_attendees; veja supabase/migracao-eventos.sql).

function friendlyError(error) {
  if (error?.code === 'PGRST205' || /event/i.test(error?.message ?? '') && /schema cache|does not exist/i.test(error?.message ?? '')) {
    return new Error('A tabela de eventos ainda não existe. Rode o arquivo migracao-eventos.sql no SQL Editor do Supabase.')
  }
  return error
}

/** Todos os eventos, com quem confirmou presença, do mais próximo para o mais distante. */
export async function listEvents() {
  const query = (columns) =>
    supabase
      .from('events')
      .select(
        `id, title, category, event_date, event_time, place, ${columns}notes, created_by, ` +
          'creator:profiles!events_created_by_fkey(display_name), ' +
          'attendees:event_attendees(user_id, person:profiles(display_name, avatar_url))',
      )
      .order('event_date', { ascending: true })
      .order('event_time', { ascending: true, nullsFirst: true })

  let { data, error } = await query('address, ')
  // Sem a migração do endereço (coluna "address"), a lista continua funcionando, só sem mapa.
  if (error && /address/i.test(error.message ?? '')) ({ data, error } = await query(''))

  if (error) throw friendlyError(error)
  return data
}

export async function createEvent({ title, category, date, time, place, address = '', notes, userId }) {
  const { data, error } = await supabase
    .from('events')
    .insert({
      title: title.trim(),
      category,
      event_date: date,
      event_time: time || null,
      place: place.trim() || null,
      // só envia o endereço quando preenchido (assim funciona mesmo antes da migração)
      ...(address.trim() ? { address: address.trim() } : {}),
      notes: notes.trim() || null,
      created_by: userId,
    })
    .select('id')
    .single()
  if (error) throw friendlyError(error)

  // Quem cria já está dentro (pode sair depois).
  await supabase.from('event_attendees').insert({ event_id: data.id, user_id: userId })
}

/** Edita um evento já criado (só quem criou consegue; o banco bloqueia os outros). */
export async function updateEvent({ id, title, category, date, time, place, address = '', notes, hasAddress }) {
  const { data, error } = await supabase
    .from('events')
    .update({
      title: title.trim(),
      category,
      event_date: date,
      event_time: time || null,
      place: place.trim() || null,
      // sem a migração do endereço a coluna não existe: aí nem mexe nela
      ...(hasAddress ? { address: address.trim() || null } : {}),
      notes: notes.trim() || null,
    })
    .eq('id', id)
    .select('id')
  if (error) throw friendlyError(error)
  if (!data?.length) throw new Error('Não foi possível salvar: só quem criou o evento (ou o admin) pode editá-lo. Se for você, rode o arquivo migracao-editar-eventos.sql no Supabase.')
}

export async function setAttendance({ eventId, userId, going }) {
  const query = going
    ? supabase.from('event_attendees').insert({ event_id: eventId, user_id: userId })
    : supabase.from('event_attendees').delete().eq('event_id', eventId).eq('user_id', userId)
  const { error } = await query
  if (error) throw error
}

export async function deleteEvent(eventId) {
  // .select() para perceber quando a regra do banco bloqueou (nesse caso nada é apagado e não há erro).
  const { data, error } = await supabase.from('events').delete().eq('id', eventId).select('id')
  if (error) throw error
  if (!data?.length) throw new Error('Não foi possível apagar: só quem criou o evento (ou o admin) pode apagá-lo.')
}

/** Pede ao banco para apagar os eventos que passaram de 48h do horário marcado (precisa de supabase/migracao-eventos-expiram.sql). */
export async function purgeExpiredEvents() {
  const { data, error } = await supabase.rpc('purge_expired_events')
  if (error) return 0 // sem a migração, a lista só esconde os vencidos
  return data ?? 0
}
