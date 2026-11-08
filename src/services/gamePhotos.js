import { cropToSquare, shrinkImage } from '../lib/image'
import { supabase } from '../lib/supabase'
import { removeImages, signImagePaths } from './storage'

// Fotos dos jogos (tabela game_photos; veja supabase/migracao-fotos-jogos.sql).
// Cada foto vira dois arquivos leves no bucket "photos": a grande (até 1600 px) e uma miniatura quadrada.

const BUCKET = 'photos'
export const MAX_PHOTOS_PER_PERSON = 10
const MAX_ORIGINAL_MB = 15

/** Fotos de um jogo (mais antigas primeiro), já com as URLs assinadas da miniatura e da foto grande. */
export async function listGamePhotos(gameId) {
  const { data, error } = await supabase
    .from('game_photos')
    .select('id, user_id, path, thumb_path, created_at, author:profiles(display_name, avatar_url)')
    .eq('game_id', gameId)
    .order('created_at', { ascending: true })
  if (error) throw error

  const urls = await signImagePaths(data.flatMap((photo) => [photo.path, photo.thumb_path]))
  return data.map((photo) => ({ ...photo, url: urls[photo.path] ?? null, thumbUrl: urls[photo.thumb_path] ?? null }))
}

async function uploadBlob(blob, path, contentType) {
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType, upsert: false })
  if (error) throw error
}

export async function addGamePhoto({ gameId, userId, file }) {
  if (!file.type.startsWith('image/')) throw new Error('O arquivo precisa ser uma imagem.')
  if (file.size > MAX_ORIGINAL_MB * 1024 * 1024) throw new Error(`A imagem deve ter no máximo ${MAX_ORIGINAL_MB} MB.`)

  const [full, thumb] = await Promise.all([shrinkImage(file, 1600), cropToSquare(file, 360)])
  const id = crypto.randomUUID()
  const path = `${userId}/game-photos/${id}.webp`
  const thumbPath = `${userId}/game-photos/${id}-t.jpg`

  try {
    await uploadBlob(full, path, 'image/webp')
    await uploadBlob(thumb, thumbPath, 'image/jpeg')
    const { error } = await supabase
      .from('game_photos')
      .insert({ game_id: gameId, user_id: userId, path, thumb_path: thumbPath })
    if (error) throw error
  } catch (error) {
    await removeImages([path, thumbPath]) // não deixa arquivo solto se algo falhou no meio
    throw error
  }
}

export async function deleteGamePhoto(photo) {
  // .select('id') porque o banco não dá erro quando bloqueia o delete (só devolve vazio).
  const { data, error } = await supabase.from('game_photos').delete().eq('id', photo.id).select('id')
  if (error) throw error
  if (!data?.length) throw new Error('Não foi possível apagar a foto.')
  await removeImages([photo.path, photo.thumb_path])
}

/** Caminhos dos arquivos das fotos de um jogo (para apagar do Storage quando o jogo é apagado). */
export async function listGamePhotoPaths(gameId) {
  const { data } = await supabase.from('game_photos').select('path, thumb_path').eq('game_id', gameId)
  return (data ?? []).flatMap((photo) => [photo.path, photo.thumb_path])
}
