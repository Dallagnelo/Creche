import { cropFromRow, cropToRow, isDefaultCrop } from '../lib/imageCrop'
import { supabase } from '../lib/supabase'
import { removeImages, signImagePaths, uploadImage } from './storage'

export const MAX_ALBUM_PHOTOS = 50
export const MAX_PER_UPLOAD = 10

const MIGRATION_HINT = 'Falta rodar a migração "migracao-albuns.sql" no Supabase (SQL Editor).'

function isMissingTable(error) {
  return /albums|album_photos/i.test(error?.message ?? '') || ['PGRST200', 'PGRST205', '42P01'].includes(error?.code)
}

/**
 * Lista os álbuns, com todas as fotos (já com URL) em ordem de envio.
 * Sem a migração rodada, devolve lista vazia para o mural continuar funcionando.
 */
export async function listAlbums() {
  const { data, error } = await supabase
    .from('albums')
    .select(
      'id, title, cover_path, cover_crop_x, cover_crop_y, cover_crop_size, created_by, created_at, ' +
        'author:profiles(display_name, avatar_url), ' +
        'photos:album_photos(id, path, added_by, created_at, adder:profiles(display_name, avatar_url))',
    )
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) {
    if (isMissingTable(error)) return []
    throw error
  }

  const urls = await signImagePaths(data.flatMap((album) => [album.cover_path, ...album.photos.map((p) => p.path)]))

  return data.map((album) => {
    const photos = [...album.photos]
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .filter((photo) => urls[photo.path])
      .map((photo) => ({ ...photo, url: urls[photo.path] }))
    const lastAt = photos.length ? photos[photos.length - 1].created_at : album.created_at
    return {
      ...album,
      photos,
      coverUrl: urls[album.cover_path] ?? photos[0]?.url ?? null,
      coverCrop: cropFromRow(album, 'cover'),
      lastAt,
    }
  })
}

async function uploadAll(files, userId) {
  const results = await Promise.allSettled(files.map((file) => uploadImage(file, userId, 'albums')))
  const paths = results.filter((r) => r.status === 'fulfilled').map((r) => r.value)
  const failed = results.find((r) => r.status === 'rejected')
  if (failed) {
    await removeImages(paths)
    throw failed.reason
  }
  return paths
}

/** Cria o álbum: a capa é obrigatória e entra como primeira foto; as outras fotos são opcionais. */
export async function createAlbum({ title, coverFile, coverCrop, files = [], userId }) {
  const name = title.trim()
  if (!name) throw new Error('Dê um nome para o álbum.')
  if (!coverFile) throw new Error('Escolha a capa do álbum.')
  if (files.length + 1 > MAX_ALBUM_PHOTOS) throw new Error(`Um álbum guarda no máximo ${MAX_ALBUM_PHOTOS} fotos.`)

  const [coverPath, ...extraPaths] = await uploadAll([coverFile, ...files], userId)
  const allPaths = [coverPath, ...extraPaths]

  const { data: album, error } = await supabase
    .from('albums')
    .insert({
      title: name,
      cover_path: coverPath,
      created_by: userId,
      ...(coverCrop && !isDefaultCrop(coverCrop) ? cropToRow(coverCrop, 'cover') : {}),
    })
    .select('id')
    .single()
  if (error) {
    await removeImages(allPaths)
    throw isMissingTable(error) ? new Error(MIGRATION_HINT) : error
  }

  const { error: photosError } = await supabase
    .from('album_photos')
    .insert(allPaths.map((path) => ({ album_id: album.id, path, added_by: userId })))
  if (photosError) {
    await supabase.from('albums').delete().eq('id', album.id)
    await removeImages(allPaths)
    throw photosError
  }
}

/** Qualquer pessoa coloca mais fotos num álbum que já existe. */
export async function addAlbumPhotos({ album, files, userId }) {
  if (files.length === 0) return
  if (files.length > MAX_PER_UPLOAD) throw new Error(`Dá para enviar até ${MAX_PER_UPLOAD} fotos de cada vez.`)
  if (album.photos.length + files.length > MAX_ALBUM_PHOTOS) {
    throw new Error(`Este álbum só aceita mais ${Math.max(MAX_ALBUM_PHOTOS - album.photos.length, 0)} fotos.`)
  }
  const paths = await uploadAll(files, userId)
  const { error } = await supabase
    .from('album_photos')
    .insert(paths.map((path) => ({ album_id: album.id, path, added_by: userId })))
  if (error) {
    await removeImages(paths)
    throw error
  }
}

/** Apaga uma foto do álbum (quem enviou, quem criou o álbum ou o admin). */
export async function deleteAlbumPhoto(photo) {
  const { data, error } = await supabase.from('album_photos').delete().eq('id', photo.id).select('id')
  if (error) throw error
  if (!data?.length) throw new Error('Você não pode apagar esta foto.')
  await removeImages([photo.path])
}

/** Muda nome e/ou capa (quem criou ou o admin). Com `coverFile`, a nova capa também entra no carrossel. */
export async function updateAlbum({ album, title, coverFile, coverCrop, userId }) {
  const name = title.trim()
  if (!name) throw new Error('Dê um nome para o álbum.')
  const patch = { title: name }
  let newPath = null
  if (coverFile) {
    ;[newPath] = await uploadAll([coverFile], userId)
    patch.cover_path = newPath
  }
  if (coverCrop) Object.assign(patch, cropToRow(coverCrop, 'cover'))

  const { data, error } = await supabase.from('albums').update(patch).eq('id', album.id).select('id')
  if (error || !data?.length) {
    if (newPath) await removeImages([newPath])
    if (error) throw error
    throw new Error('Só quem criou o álbum pode mudar o nome e a capa.')
  }
  if (newPath) {
    const { error: photoError } = await supabase
      .from('album_photos')
      .insert({ album_id: album.id, path: newPath, added_by: userId })
    if (photoError) throw photoError
  }
}

/** Apaga o álbum inteiro (as fotos do banco vão junto) e depois os arquivos. */
export async function deleteAlbum(album) {
  const { data, error } = await supabase.from('albums').delete().eq('id', album.id).select('id')
  if (error) throw error
  if (!data?.length) throw new Error('Só quem criou o álbum pode apagá-lo.')
  await removeImages([album.cover_path, ...album.photos.map((photo) => photo.path)])
}
