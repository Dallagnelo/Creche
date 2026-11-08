import { cropFromRow, cropToRow, isDefaultCrop } from '../lib/imageCrop'
import { supabase } from '../lib/supabase'
import { removeImage, signImagePaths, uploadImage } from './storage'

const BASE_FIELDS = 'id, name, platform, notes, cover_path, created_at, added_by'
const CROP_FIELDS = 'cover_crop_x, cover_crop_y, cover_crop_size'
const AUTHOR = 'author:profiles(display_name, avatar_url)'
const RATINGS = 'ratings:game_ratings(id, user_id, score, comment, user:profiles(display_name, avatar_url))'

const MIGRATION_HINT = 'Falta rodar a migração "migracao-recorte-imagens.sql" no Supabase (SQL Editor).'
const isMissingCrop = (error) => /cover_crop/i.test(error?.message ?? '')
const isMissingRatings = (error) => /game_ratings/i.test(error?.message ?? '')

export async function listGames() {
  // Tenta com tudo; se faltar alguma migração (recorte ou notas), busca sem essa parte e a página segue funcionando.
  const attempts = [
    `${BASE_FIELDS}, ${CROP_FIELDS}, ${AUTHOR}, ${RATINGS}`,
    `${BASE_FIELDS}, ${AUTHOR}, ${RATINGS}`,
    `${BASE_FIELDS}, ${CROP_FIELDS}, ${AUTHOR}`,
    `${BASE_FIELDS}, ${AUTHOR}`,
  ]
  let data = null
  let error = null
  for (const fields of attempts) {
    ;({ data, error } = await supabase.from('games').select(fields).order('created_at', { ascending: false }))
    if (!error) break
    if (!isMissingCrop(error) && !isMissingRatings(error)) break
  }
  if (error) throw error

  const urls = await signImagePaths(data.map((game) => game.cover_path))
  return data.map((game) => {
    const ratings = game.ratings ?? []
    return {
      ...game,
      ratings,
      average: ratings.length ? ratings.reduce((sum, rating) => sum + rating.score, 0) / ratings.length : null,
      coverUrl: urls[game.cover_path] ?? null,
      coverCrop: cropFromRow(game, 'cover'),
    }
  })
}

/** A capa é opcional: só enviamos a imagem se o usuário escolheu uma. */
export async function createGame({ name, platform, notes, file, coverCrop, userId }) {
  const coverPath = file ? await uploadImage(file, userId, 'games') : null

  const { error } = await supabase.from('games').insert({
    name: name.trim(),
    platform: platform.trim() || null,
    notes: notes.trim() || null,
    cover_path: coverPath,
    added_by: userId,
    // Só enviamos o recorte quando ele existe (assim o cadastro continua funcionando antes da migração).
    ...(coverPath && coverCrop && !isDefaultCrop(coverCrop) ? cropToRow(coverCrop, 'cover') : {}),
  })

  if (error) {
    await removeImage(coverPath)
    throw isMissingCrop(error) ? new Error(MIGRATION_HINT) : error
  }
}

/** Salva o recorte da capa (só o dono do jogo consegue). */
export async function updateGameCover(gameId, crop) {
  const { data, error } = await supabase
    .from('games')
    .update(cropToRow(crop, 'cover'))
    .eq('id', gameId)
    .select('id')
  if (error) throw isMissingCrop(error) ? new Error(MIGRATION_HINT) : error
  if (!data?.length) throw new Error('Não foi possível salvar: só quem adicionou o jogo pode mudar a capa.')
}

/**
 * Edita um jogo (só o dono consegue). Se vier uma imagem nova, ela vira a capa e a antiga é apagada.
 */
export async function updateGame({ game, name, platform, notes, file, coverCrop, userId }) {
  const newPath = file ? await uploadImage(file, userId, 'games') : null

  const { data, error } = await supabase
    .from('games')
    .update({
      name: name.trim(),
      platform: platform.trim() || null,
      notes: notes.trim() || null,
      ...(newPath ? { cover_path: newPath, ...cropToRow(coverCrop ?? { cx: 0.5, cy: 0.5, size: 1 }, 'cover') } : {}),
    })
    .eq('id', game.id)
    .select('id')

  if (error || !data?.length) {
    await removeImage(newPath)
    if (error) throw isMissingCrop(error) ? new Error(MIGRATION_HINT) : error
    throw new Error('Não foi possível salvar: só quem adicionou o jogo pode editar.')
  }
  if (newPath) await removeImage(game.cover_path)
}

export async function deleteGame(game) {
  const { error } = await supabase.from('games').delete().eq('id', game.id)
  if (error) throw error
  await removeImage(game.cover_path)
}
