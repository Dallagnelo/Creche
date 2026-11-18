import { supabase } from '../lib/supabase'

export const POKE_HINT = 'Falta rodar a migração "migracao-pokemon.sql" no Supabase.'
export const TEAM_MAX = 6
const missing = (error) => /poke_|42883|PGRST202|42P01|42703/i.test(`${error?.code ?? ''} ${error?.message ?? ''}`)
function check(error) {
  if (!error) return
  if (missing(error)) throw new Error(POKE_HINT)
  throw error
}

/** Salva o time (até 6, o primeiro é o favorito). */
export async function saveTeam(userId, team) {
  const clean = [...new Set(team)].filter((id) => Number.isInteger(id)).slice(0, TEAM_MAX)
  const { error } = await supabase.from('profiles').update({ poke_team: clean }).eq('id', userId)
  check(error)
  return clean
}

/** Escolhe (ou tira, com null) o Pokémon que segue o seu boneco na Turma. */
export async function savePet(userId, pokemonId) {
  const { error } = await supabase.from('profiles').update({ poke_pet: pokemonId }).eq('id', userId)
  check(error)
}

/** Guarda um palpite do "Quem é esse Pokémon?". Acertou = pegou. */
export async function recordGuess(pokemonId, correct, streak) {
  const { error } = await supabase.from('poke_guesses').insert({ pokemon_id: pokemonId, correct, streak: correct ? streak : 0 })
  check(error)
}

/** Ranking do minijogo. null = migração ainda não rodada. */
export async function pokeRanking() {
  const { data, error } = await supabase.rpc('poke_ranking')
  if (error && missing(error)) return null
  check(error)
  return data ?? []
}

/** Quem da turma já pegou cada Pokémon: Map(número -> [ids das pessoas]). null = sem migração. */
export async function pokeCaught() {
  const { data, error } = await supabase.rpc('poke_caught')
  if (error && missing(error)) return null
  check(error)
  return new Map((data ?? []).map((row) => [row.pokemon_id, row.users ?? []]))
}
