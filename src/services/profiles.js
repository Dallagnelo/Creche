import { cropToSquare } from '../lib/image'
import { supabase } from '../lib/supabase'

const AVATAR_BUCKET = 'avatars'
/** Valor especial do campo "quem chamou": a pessoa não usa o app, então escrevemos o nome. */
export const OTHER = '__other'

const MAX_AVATAR_MB = 15 // limite do arquivo ORIGINAL; depois reduzimos para ~50 KB
const MAX_GIF_MB = 5 // GIF animado vai como está (não dá para recortar sem perder a animação)

export const isGif = (file) => file?.type === 'image/gif'

const FIELDS = 'id, display_name, avatar_url, bio, birth_date, city, favorite_game, favorite_movie, created_at'
const TURMA_FIELDS = 'friends_since, invited_by, invited_by_name'

/** Todos os perfis da turma, em ordem alfabética. */
export async function listProfiles() {
  let { data, error } = await supabase
    .from('profiles')
    .select(`${FIELDS}, ${TURMA_FIELDS}`)
    .order('display_name')

  // Se a migração "migracao-turma.sql" ainda não foi rodada, busca sem os campos novos.
  if (error && /friends_since|invited_by/i.test(error.message ?? '')) {
    ;({ data, error } = await supabase.from('profiles').select(FIELDS).order('display_name'))
  }
  if (error) throw error
  return data
}

/** Salva os dados do perfil. Textos vazios viram null no banco. */
export async function updateProfile(userId, values) {
  const clean = (text) => text?.trim() || null

  const { error } = await supabase
    .from('profiles')
    .update({
      display_name: values.display_name.trim(),
      birth_date: values.birth_date || null,
      city: clean(values.city),
      favorite_game: clean(values.favorite_game),
      favorite_movie: clean(values.favorite_movie),
      bio: clean(values.bio),
      // Campos da página "A Turma": só enviados quando o formulário os tem (migração rodada).
      ...(values.friends_since !== undefined && {
        friends_since: values.friends_since || null,
        invited_by: values.invited_by && values.invited_by !== OTHER ? values.invited_by : null,
        invited_by_name: values.invited_by === OTHER ? clean(values.invited_by_name) : null,
      }),
    })
    .eq('id', userId)

  if (error) throw error
}

// O endereço público termina em ".../avatars/<id-do-usuario>/<arquivo>".
// Para apagar o arquivo antigo precisamos só da parte depois de "/avatars/".
function pathFromUrl(url) {
  const marker = `/${AVATAR_BUCKET}/`
  const index = url?.indexOf(marker) ?? -1
  return index === -1 ? null : decodeURIComponent(url.slice(index + marker.length).split('?')[0])
}

async function removeFile(url) {
  const path = pathFromUrl(url)
  if (path) await supabase.storage.from(AVATAR_BUCKET).remove([path])
}

/** Troca a foto de perfil: reduz, envia, grava o endereço e apaga a foto antiga. */
export async function setAvatar(userId, file, previousUrl, crop = null) {
  if (!file.type.startsWith('image/')) throw new Error('O arquivo precisa ser uma imagem.')
  if (file.size > MAX_AVATAR_MB * 1024 * 1024) throw new Error(`A imagem deve ter no máximo ${MAX_AVATAR_MB} MB.`)

  const gif = isGif(file)
  if (gif && file.size > MAX_GIF_MB * 1024 * 1024) throw new Error(`O GIF deve ter no máximo ${MAX_GIF_MB} MB.`)

  const blob = gif ? file : await cropToSquare(file, 512, crop)
  const contentType = gif ? 'image/gif' : 'image/jpeg'
  const path = `${userId}/${crypto.randomUUID()}.${gif ? 'gif' : 'jpg'}`

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, blob, { contentType, upsert: false })
  if (uploadError) throw uploadError

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path)

  const { error } = await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', userId)
  if (error) {
    await supabase.storage.from(AVATAR_BUCKET).remove([path]) // não deixa arquivo órfão
    throw error
  }

  await removeFile(previousUrl)
  return data.publicUrl
}

/** Volta para o avatar com a inicial do nome. */
export async function removeAvatar(userId, previousUrl) {
  const { error } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', userId)
  if (error) throw error
  await removeFile(previousUrl)
}
