import { supabase } from '../lib/supabase'
import { removeImage, signImagePaths, uploadImage } from './storage'

export async function listGames() {
  const { data, error } = await supabase
    .from('games')
    .select('id, name, platform, notes, cover_path, created_at, added_by, author:profiles(display_name, avatar_url)')
    .order('created_at', { ascending: false })

  if (error) throw error

  const urls = await signImagePaths(data.map((game) => game.cover_path))
  return data.map((game) => ({ ...game, coverUrl: urls[game.cover_path] ?? null }))
}

/** A capa é opcional: só enviamos a imagem se o usuário escolheu uma. */
export async function createGame({ name, platform, notes, file, userId }) {
  const coverPath = file ? await uploadImage(file, userId, 'games') : null

  const { error } = await supabase.from('games').insert({
    name: name.trim(),
    platform: platform.trim() || null,
    notes: notes.trim() || null,
    cover_path: coverPath,
    added_by: userId,
  })

  if (error) {
    await removeImage(coverPath)
    throw error
  }
}

export async function deleteGame(game) {
  const { error } = await supabase.from('games').delete().eq('id', game.id)
  if (error) throw error
  await removeImage(game.cover_path)
}
