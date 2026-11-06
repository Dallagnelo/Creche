import { supabase } from '../lib/supabase'
import { removeImages, signImagePaths, uploadImage } from './storage'

const PAGE_LIMIT = 100
export const MAX_PHOTOS_PER_POST = 20

const AUTHOR = 'author:profiles(display_name, avatar_url)'

// Erro típico de quem ainda não rodou a migração das várias fotos.
const MIGRATION_HINT =
  'Falta rodar a migração "migracao-varias-fotos.sql" no Supabase (SQL Editor).'

function isMissingImagesTable(error) {
  return /post_images/i.test(error?.message ?? '') || error?.code === 'PGRST200' || error?.code === 'PGRST205'
}

/**
 * Lista os posts do mais novo para o mais antigo.
 * Cada post volta com `images` (todas as fotos, em ordem, já com URL)
 * e `imageUrl` (a primeira foto, usada como capa).
 */
export async function listPosts() {
  let { data, error } = await supabase
    .from('posts')
    // "author:profiles(...)" faz um JOIN: traz junto o nome de quem postou.
    // "images:post_images(...)" faz outro JOIN: traz todas as fotos do post.
    .select(`id, caption, image_path, created_at, author_id, ${AUTHOR}, images:post_images(image_path, position)`)
    .order('created_at', { ascending: false })
    .limit(PAGE_LIMIT)

  // Se a migração ainda não foi rodada, o mural continua funcionando com 1 foto por post.
  if (error && isMissingImagesTable(error)) {
    ;({ data, error } = await supabase
      .from('posts')
      .select(`id, caption, image_path, created_at, author_id, ${AUTHOR}`)
      .order('created_at', { ascending: false })
      .limit(PAGE_LIMIT))
  }
  if (error) throw error

  // Lista de caminhos de cada post (se não houver linhas em post_images, usa a capa).
  const withPaths = data.map((post) => {
    const sorted = [...(post.images ?? [])].sort((a, b) => a.position - b.position)
    const paths = sorted.length > 0 ? sorted.map((item) => item.image_path) : [post.image_path]
    return { post, paths }
  })

  const urls = await signImagePaths(withPaths.flatMap((item) => item.paths))

  return withPaths.map(({ post, paths }) => {
    const images = paths.filter((path) => urls[path]).map((path) => ({ path, url: urls[path] }))
    const { images: _ignored, ...rest } = post
    return { ...rest, paths, images, imageUrl: images[0]?.url ?? null }
  })
}

/** Envia todas as fotos e depois cria o post e o registro de cada foto. */
export async function createPost({ files, caption, userId }) {
  if (files.length === 0) throw new Error('Escolha pelo menos uma foto.')
  if (files.length > MAX_PHOTOS_PER_POST) {
    throw new Error(`Cada lembrança pode ter no máximo ${MAX_PHOTOS_PER_POST} fotos.`)
  }

  // Envia tudo ao mesmo tempo. Se alguma falhar, apaga as que já subiram.
  const results = await Promise.allSettled(files.map((file) => uploadImage(file, userId, 'posts')))
  const paths = results.filter((r) => r.status === 'fulfilled').map((r) => r.value)
  const failed = results.find((r) => r.status === 'rejected')
  if (failed) {
    await removeImages(paths)
    throw failed.reason
  }

  // 1) o post (a primeira foto é a capa)
  const { data: post, error } = await supabase
    .from('posts')
    .insert({ author_id: userId, image_path: paths[0], caption: caption.trim() || null })
    .select('id')
    .single()

  if (error) {
    await removeImages(paths)
    throw error
  }

  // 2) as fotos do post, na ordem em que foram escolhidas
  const { error: imagesError } = await supabase
    .from('post_images')
    .insert(paths.map((image_path, position) => ({ post_id: post.id, image_path, position })))

  if (imagesError) {
    // Desfaz tudo para não deixar post "pela metade" nem fotos órfãs.
    await supabase.from('posts').delete().eq('id', post.id)
    await removeImages(paths)
    throw isMissingImagesTable(imagesError) ? new Error(MIGRATION_HINT) : imagesError
  }
}

/** Apaga o post (as linhas de post_images vão junto) e depois as fotos do Storage. */
export async function deletePost(post) {
  const { error } = await supabase.from('posts').delete().eq('id', post.id)
  if (error) throw error
  await removeImages(post.paths ?? [post.image_path])
}
