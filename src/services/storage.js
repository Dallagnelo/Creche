import { supabase } from '../lib/supabase'

// "Services" são arquivos que só falam com o Supabase.
// Os componentes não precisam saber COMO os dados são buscados,
// só chamam funções como uploadImage() e listPosts().

const BUCKET = 'photos'
const MAX_SIZE_MB = 10
const SIGNED_URL_SECONDS = 60 * 60 // as URLs das fotos valem 1 hora

/**
 * Envia uma imagem para o Storage e devolve o CAMINHO dela.
 * O caminho começa com o id do usuário (exigido pela policy do bucket).
 */
export async function uploadImage(file, userId, folder) {
  if (!file.type.startsWith('image/')) {
    throw new Error('O arquivo precisa ser uma imagem.')
  }
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    throw new Error(`A imagem deve ter no máximo ${MAX_SIZE_MB} MB.`)
  }

  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${userId}/${folder}/${crypto.randomUUID()}.${extension}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false })

  if (error) throw error
  return path
}

/** Apaga uma imagem do Storage. Não dá erro se o caminho for vazio. */
export async function removeImage(path) {
  if (!path) return
  await supabase.storage.from(BUCKET).remove([path])
}

/** Apaga várias imagens de uma vez. */
export async function removeImages(paths) {
  const list = paths.filter(Boolean)
  if (list.length === 0) return
  await supabase.storage.from(BUCKET).remove(list)
}

/**
 * Como o bucket é privado, precisamos de URLs assinadas para exibir as fotos.
 * Pedimos todas de uma vez (1 requisição) e devolvemos { caminho: url }.
 */
export async function signImagePaths(paths) {
  const uniquePaths = [...new Set(paths.filter(Boolean))]
  if (uniquePaths.length === 0) return {}

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(uniquePaths, SIGNED_URL_SECONDS)

  if (error) throw error

  return Object.fromEntries(
    data.filter((item) => item.signedUrl).map((item) => [item.path, item.signedUrl]),
  )
}
