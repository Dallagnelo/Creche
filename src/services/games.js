import { cropFromRow, cropToRow, DEFAULT_CROP, isDefaultCrop } from '../lib/imageCrop'
import { supabase } from '../lib/supabase'
import { listGamePhotoPaths } from './gamePhotos'
import { shortPlatform } from './igdb'
import { removeImage, removeImages, signImagePaths } from './storage'

const BASE_FIELDS = 'id, name, platform, notes, cover_path, created_at, added_by'
const CROP_FIELDS = 'cover_crop_x, cover_crop_y, cover_crop_size'
const IGDB_BASIC = 'cover_url, igdb_id' // capa e número do IGDB (migracao-igdb.sql)
const IGDB_FULL = `${IGDB_BASIC}, release_year, summary, genres, igdb_url, all_platforms` // + detalhes (migracao-igdb-detalhes.sql)
const AUTHOR = 'author:profiles(display_name, avatar_url)'
const RATINGS = 'ratings:game_ratings(id, user_id, score, comment, user:profiles(display_name, avatar_url))'

const MIGRATION_HINT = 'Falta rodar a migração "migracao-recorte-imagens.sql" no Supabase (SQL Editor).'
const isMissingCrop = (error) => /cover_crop/i.test(error?.message ?? '')
const isMissingRatings = (error) => /game_ratings/i.test(error?.message ?? '')
const isMissingIgdb = (error) => /cover_url|igdb_id|release_year|summary|genres|igdb_url|all_platforms/i.test(error?.message ?? '')
const IGDB_HINT = 'Falta rodar a migração "migracao-igdb-detalhes.sql" no Supabase (SQL Editor).'

/** Campos do IGDB prontos para gravar na tabela (usado ao criar e ao vincular um jogo existente). */
function igdbToRow(igdb) {
  const platforms = [...new Set((igdb.platforms ?? []).map(shortPlatform))]
  return {
    cover_url: igdb.coverUrl ?? null,
    igdb_id: igdb.id ?? null,
    release_year: igdb.year ?? null,
    summary: igdb.summary ?? null,
    genres: igdb.genres?.length ? igdb.genres.join(', ') : null,
    igdb_url: igdb.url ?? null,
    all_platforms: platforms.length ? platforms.join(', ') : null,
  }
}

export async function listGames() {
  // Tenta com tudo; se faltar alguma migração (IGDB, recorte ou notas), busca sem essa parte e a página segue funcionando.
  const attempts = []
  for (const igdb of [IGDB_FULL, IGDB_BASIC, null]) {
    for (const withCrop of [true, false]) {
      for (const withRatings of [true, false]) {
        attempts.push(
          [BASE_FIELDS, igdb, withCrop && CROP_FIELDS, AUTHOR, withRatings && RATINGS].filter(Boolean).join(', '),
        )
      }
    }
  }
  let data = null
  let error = null
  for (const fields of attempts) {
    ;({ data, error } = await supabase.from('games').select(fields).order('created_at', { ascending: false }))
    if (!error) break
    if (!isMissingCrop(error) && !isMissingRatings(error) && !isMissingIgdb(error)) break
  }
  if (error) throw error

  const urls = await signImagePaths(data.map((game) => game.cover_path))
  return data.map((game) => {
    const ratings = game.ratings ?? []
    return {
      ...game,
      ratings,
      average: ratings.length ? ratings.reduce((sum, rating) => sum + rating.score, 0) / ratings.length : null,
      // A capa pode ser um arquivo enviado (Storage, URL assinada) ou um endereço do IGDB.
      coverUrl: urls[game.cover_path] ?? game.cover_url ?? null,
      coverCrop: cropFromRow(game, 'cover'),
    }
  })
}

/** Cria o jogo. Se veio da busca (igdb), capa, ano, gêneros, plataformas e sinopse vêm do IGDB. */
export async function createGame({ name, platform, notes, igdb, userId }) {
  const { error } = await supabase.from('games').insert({
    name: name.trim(),
    platform: platform.trim() || null,
    notes: notes.trim() || null,
    added_by: userId,
    ...(igdb ? igdbToRow(igdb) : {}),
  })

  if (error) throw isMissingIgdb(error) ? new Error(IGDB_HINT) : error
}

/**
 * Edita um jogo (só o dono consegue). Se vier "igdb", o jogo passa a usar a capa e os dados do IGDB
 * e a imagem enviada antes (se houver) é apagada.
 */
export async function updateGame({ game, name, platform, notes, igdb }) {
  const { data, error } = await supabase
    .from('games')
    .update({
      name: name.trim(),
      platform: platform.trim() || null,
      notes: notes.trim() || null,
      ...(igdb
        ? {
            ...igdbToRow(igdb),
            cover_path: null,
            ...(isDefaultCrop(game.coverCrop) ? {} : cropToRow(DEFAULT_CROP, 'cover')),
          }
        : {}),
    })
    .eq('id', game.id)
    .select('id')

  if (error) throw isMissingIgdb(error) ? new Error(IGDB_HINT) : isMissingCrop(error) ? new Error(MIGRATION_HINT) : error
  if (!data?.length) throw new Error('Não foi possível salvar: só quem adicionou o jogo pode editar.')
  if (igdb) await removeImage(game.cover_path)
}

export async function deleteGame(game) {
  const photoPaths = await listGamePhotoPaths(game.id) // anotados antes, porque o banco apaga as linhas junto com o jogo
  const { error } = await supabase.from('games').delete().eq('id', game.id)
  if (error) throw error
  await removeImage(game.cover_path)
  await removeImages(photoPaths)
}
