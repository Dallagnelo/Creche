import { shrinkImage } from '../lib/image'
import { supabase } from '../lib/supabase'

// "Services" são arquivos que só falam com o Supabase.
// Os componentes não precisam saber COMO os dados são buscados,
// só chamam funções como uploadImage() e listPosts().

const BUCKET = 'photos'
const MAX_SIZE_MB = 25 // o original pode ser grande: a foto é reduzida antes de subir
const SIGNED_URL_SECONDS = 7 * 24 * 60 * 60 // os links das fotos valem 7 dias...
const SIGNED_REUSE_MS = 5 * 24 * 60 * 60 * 1000 // ...e o mesmo link é reaproveitado por 5 dias (o navegador não baixa a foto de novo)
const MAX_SIDE = { games: 900 } // lado maior das fotos (padrão 1600 px)

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

  // Reduz a foto antes de enviar (gasta bem menos dados ao ver o site). GIF fica como está, para não perder a animação.
  let body = file
  let contentType = file.type
  let extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  if (file.type !== 'image/gif') {
    try {
      const small = await shrinkImage(file, MAX_SIDE[folder] ?? 1600)
      if (small.size < file.size) {
        body = small
        contentType = 'image/webp'
        extension = 'webp'
      }
    } catch {
      /* não conseguiu reduzir: envia a original */
    }
  }
  const path = `${userId}/${folder}/${crypto.randomUUID()}.${extension}`

  // cacheControl longo: o nome do arquivo é único, então o navegador pode guardar a foto por muito tempo
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, body, { contentType, upsert: false, cacheControl: '31536000' })

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

const SIGNED_KEY = 'memorias-da-turma:signed-urls'
const signedMemory = new Map() // caminho -> { url, at }
let signedLoaded = false

function loadSigned() {
  if (signedLoaded) return
  signedLoaded = true
  try {
    const saved = JSON.parse(localStorage.getItem(SIGNED_KEY) || '{}')
    const now = Date.now()
    Object.entries(saved).forEach(([path, entry]) => {
      if (entry && now - entry.at < SIGNED_REUSE_MS) signedMemory.set(path, entry)
    })
  } catch {
    /* ignora */
  }
}

function saveSigned() {
  try {
    localStorage.setItem(SIGNED_KEY, JSON.stringify(Object.fromEntries(signedMemory)))
  } catch {
    /* sem espaço: segue só com a memória */
  }
}

/** Esquece os links guardados (ao sair da conta). */
export function clearSignedUrls() {
  signedMemory.clear()
  try {
    localStorage.removeItem(SIGNED_KEY)
  } catch {
    /* ignora */
  }
}

/**
 * Como o bucket é privado, precisamos de URLs assinadas para exibir as fotos.
 * Pedimos todas de uma vez (1 requisição) e devolvemos { caminho: url }.
 * O link de cada foto é guardado e reaproveitado: link igual = o navegador usa a foto que já baixou.
 */
export async function signImagePaths(paths) {
  const uniquePaths = [...new Set(paths.filter(Boolean))]
  if (uniquePaths.length === 0) return {}

  loadSigned()
  const now = Date.now()
  const result = {}
  const missing = []
  uniquePaths.forEach((path) => {
    const hit = signedMemory.get(path)
    if (hit && now - hit.at < SIGNED_REUSE_MS) result[path] = hit.url
    else missing.push(path)
  })
  if (missing.length === 0) return result

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(missing, SIGNED_URL_SECONDS)
  if (error) throw error

  data.forEach((item) => {
    if (!item.signedUrl) return
    result[item.path] = item.signedUrl
    signedMemory.set(item.path, { url: item.signedUrl, at: now })
  })
  saveSigned()
  return result
}
