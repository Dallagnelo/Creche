import { cropFromRow, cropToRow, isDefaultCrop } from '../lib/imageCrop'
import { supabase } from '../lib/supabase'
import { removeImage, signImagePaths, uploadImage } from './storage'

const BASE_FIELDS = 'id, name, platform, notes, cover_path, created_at, added_by'
const CROP_FIELDS = 'cover_crop_x, cover_crop_y, cover_crop_size'
const AUTHOR = 'author:profiles(display_name, avatar_url)'

const MIGRATION_HINT = 'Falta rodar a migração "migracao-recorte-imagens.sql" no Supabase (SQL Editor).'
const isMissingCrop = (error) => /cover_crop/i.test(error?.message ?? '')

export async function listGames() {
  let { data, error } = await supabase
    .from('games')
    .select(`${BASE_FIELDS}, ${CROP_FIELDS}, ${AUTHOR}`)
    .order('created_at', { ascending: false })

  // Se a migração do recorte de imagens ainda não foi rodada, busca sem essas colunas.
  if (error && isMissingCrop(error)) {
    ;({ data, error } = await supabase
      .from('games')
      .select(`${BASE_FIELDS}, ${AUTHOR}`)
      .order('created_at', { ascending: false }))
  }
  if (error) throw error

  const urls = await signImagePaths(data.map((game) => game.cover_path))
  return data.map((game) => ({
    ...game,
    coverUrl: urls[game.cover_path] ?? null,
    coverCrop: cropFromRow(game, 'cover'),
  }))
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

export async function deleteGame(game) {
  const { error } = await supabase.from('games').delete().eq('id', game.id)
  if (error) throw error
  await removeImage(game.cover_path)
}
