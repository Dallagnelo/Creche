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
  const { data, error } = await supabase
    .from('events')
    .select(
      'id, title, category, event_date, event_time, place, notes, created_by, ' +
        'creator:profiles!events_created_by_fkey(display_name), ' +
        'attendees:event_attendees(user_id, person:profiles(display_name, avatar_url))',
    )
    .order('event_date', { ascending: true })
    .order('event_time', { ascending: true, nullsFirst: true })

  if (error) throw friendlyError(error)
  return data
}

export async function createEvent({ title, category, date, time, place, notes, userId }) {
  const { data, error } = await supabase
    .from('events')
    .insert({
      title: title.trim(),
      category,
      event_date: date,
      event_time: time || null,
      place: place.trim() || null,
      notes: notes.trim() || null,
      created_by: userId,
    })
    .select('id')
    .single()
  if (error) throw friendlyError(error)

  // Quem cria já está dentro (pode sair depois).
  await supabase.from('event_attendees').insert({ event_id: data.id, user_id: userId })
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
  if (!data?.length) throw new Error('Não foi possível apagar: só quem criou o evento pode apagá-lo.')
}
