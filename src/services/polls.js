import { supabase } from '../lib/supabase'

// Votações de filmes (tabelas polls, poll_options e poll_votes; veja supabase/migracao-votacoes.sql).

function friendlyError(error) {
  if (error?.code === 'PGRST205' || error?.code === 'PGRST202' || /poll/i.test(error?.message ?? '') && /schema cache|does not exist/i.test(error?.message ?? '')) {
    return new Error('As votações ainda não existem no banco. Rode o arquivo migracao-votacoes.sql no SQL Editor do Supabase.')
  }
  return error
}

/** Todas as votações, da mais nova para a mais antiga, com filmes (opções) e votos. */
export async function listPolls() {
  const { data, error } = await supabase
    .from('polls')
    .select(
      'id, title, created_by, created_at, closes_at, status, closed_at, make_event, event_date, event_time, event_place, winner_option_ids, event_id, ' +
        'creator:profiles!polls_created_by_fkey(display_name), ' +
        'options:poll_options(id, title, poster_path, release_year, tmdb_id, imdb_id, movie:movies(id, title, poster_path, release_year)), ' +
        'votes:poll_votes(user_id, option_id)',
    )
    .order('created_at', { ascending: false })
  if (error) throw friendlyError(error)
  // Cada opção guarda o próprio filme; `movie` é o formato que as telas usam.
  return data.map((poll) => ({
    ...poll,
    options: poll.options.map((option) => ({
      ...option,
      movie: {
        id: option.tmdb_id ?? option.movie?.id,
        title: option.title ?? option.movie?.title ?? 'Filme',
        poster_path: option.poster_path ?? option.movie?.poster_path ?? null,
        release_year: option.release_year ?? option.movie?.release_year ?? null,
      },
    })),
  }))
}

/** Cria a votação. hours = null: sem prazo. O banco conta o prazo pelo relógio dele. */
export async function createPoll({ title, movies, hours, makeEvent, date, time, place }) {
  const { data, error } = await supabase.rpc('create_poll', {
    p_title: title.trim(),
    // só os dados que a votação precisa: o filme NÃO entra na lista da página Filmes
    p_movies: movies.map((movie) => ({
      tmdb_id: movie.tmdb_id ?? null,
      imdb_id: movie.imdb_id ?? null,
      title: movie.title,
      poster_path: movie.poster_path ?? null,
      release_year: movie.release_year ?? null,
    })),
    p_hours: hours,
    p_make_event: makeEvent,
    p_event_date: makeEvent ? date : null,
    p_event_time: makeEvent && time ? time : null,
    p_event_place: makeEvent ? place.trim() : null,
  })
  if (error) throw friendlyError(error)
  return data
}

/** Registra (ou troca) o voto da pessoa. */
export async function castVote({ pollId, userId, optionId }) {
  const { error } = await supabase
    .from('poll_votes')
    .upsert({ poll_id: pollId, user_id: userId, option_id: optionId }, { onConflict: 'poll_id,user_id' })
  if (error) {
    if (error.code === '42501') throw new Error('Essa votação já foi encerrada.')
    throw friendlyError(error)
  }
}

/** Tira o voto da pessoa (fica sem voto). */
export async function removeVote({ pollId, userId }) {
  const { data, error } = await supabase.from('poll_votes').delete().eq('poll_id', pollId).eq('user_id', userId).select('poll_id')
  if (error) throw friendlyError(error)
  if (!data?.length) throw new Error('Não foi possível tirar o voto. Rode o arquivo migracao-votacoes.sql no Supabase (versão nova) ou a votação já foi encerrada.')
}

/** Encerra agora (só quem criou ou o admin). */
export async function closePoll(pollId) {
  const { error } = await supabase.rpc('close_poll', { p_poll: pollId })
  if (error) throw friendlyError(error)
}

/** Pede ao banco para encerrar as votações cujo prazo acabou (e criar os eventos). Devolve quantas encerrou. */
export async function finalizeDuePolls() {
  const { data, error } = await supabase.rpc('finalize_due_polls')
  if (error) return 0 // sem a migração, a página só mostra as votações como estão
  return data ?? 0
}

export async function deletePoll(pollId) {
  const { data, error } = await supabase.from('polls').delete().eq('id', pollId).select('id')
  if (error) throw friendlyError(error)
  if (!data?.length) throw new Error('Não foi possível apagar: só quem criou a votação (ou o admin) pode apagá-la.')
}
