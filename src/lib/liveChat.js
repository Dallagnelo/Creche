import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { shrinkImage } from './image'
import { supabase } from './supabase'

// Chat da página Ao vivo, o mais leve possível:
//  - NADA é gravado no banco. As mensagens só passam pelo canal de tempo real do Supabase
//    e ficam na memória do navegador (somem ao recarregar a página).
//  - O canal só abre enquanto alguém está com a página Ao vivo aberta e existe transmissão no ar.
//  - Cada pessoa pode mandar no máximo 1 mensagem por segundo, com até 300 caracteres.

export const CHAT_MAX_LENGTH = 300
export const CHAT_MAX_GIF_MB = 3

// Imagens e GIFs do chat vão para o Storage (o canal de tempo real não aguenta arquivos) e só o ENDEREÇO
// viaja na mensagem. Quem enviou apaga os próprios arquivos com mais de 1 hora, então nada se acumula.
const IMAGE_BUCKET = 'chat-live'
const IMAGE_MAX_AGE_MS = 60 * 60 * 1000
const IMAGE_URL_PREFIX = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/${IMAGE_BUCKET}/`
const CHANNEL_NAME = 'turma-ao-vivo-chat'
const KEEP_MESSAGES = 100
const MIN_GAP_MS = 1000
export const IMAGE_GAP_MS = 10 * 1000 // imagem/GIF: no máximo 1 a cada 10 segundos por pessoa
const CLOSE_DELAY_MS = 3000 // evita fechar e abrir o canal se a pessoa só trocar de página rapidinho

let channel = null
let users = 0
let closeTimer = null
let lastSentAt = 0
let lastImageAt = 0
let snapshot = { messages: [], ready: false }
const listeners = new Set()

function emit(patch) {
  snapshot = { ...snapshot, ...patch }
  listeners.forEach((listener) => listener())
}

const subscribe = (listener) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
const getSnapshot = () => snapshot

/** Confere (e limpa) uma mensagem recebida, porque ela vem de outro navegador. */
function clean(payload) {
  if (!payload || typeof payload !== 'object') return null
  const text = typeof payload.text === 'string' ? payload.text.trim().slice(0, CHAT_MAX_LENGTH) : ''
  // Só aceita imagem que esteja no nosso bucket (o endereço vem de outro navegador).
  const image =
    typeof payload.image === 'string' && payload.image.length < 400 && payload.image.startsWith(IMAGE_URL_PREFIX)
      ? payload.image
      : null
  if ((!text && !image) || typeof payload.id !== 'string' || typeof payload.from !== 'string') return null
  return {
    id: payload.id.slice(0, 80),
    from: payload.from.slice(0, 80),
    name: typeof payload.name === 'string' ? payload.name.slice(0, 60) : 'Alguém',
    avatarUrl: typeof payload.avatarUrl === 'string' ? payload.avatarUrl.slice(0, 600) : null,
    text,
    image,
    at: Number.isFinite(payload.at) ? payload.at : Date.now(),
  }
}

function receive(payload) {
  const message = clean(payload)
  if (!message || snapshot.messages.some((item) => item.id === message.id)) return
  emit({ messages: [...snapshot.messages, message].slice(-KEEP_MESSAGES) })
}

function open() {
  clearTimeout(closeTimer)
  closeTimer = null
  users += 1
  if (channel) return
  channel = supabase.channel(CHANNEL_NAME, { config: { broadcast: { self: false } } })
  channel.on('broadcast', { event: 'msg' }, ({ payload }) => receive(payload))
  channel.subscribe((status) => emit({ ready: status === 'SUBSCRIBED' }))
}

function close() {
  users -= 1
  if (users > 0) return
  closeTimer = setTimeout(() => {
    if (users === 0 && channel) {
      supabase.removeChannel(channel)
      channel = null
      emit({ ready: false })
    }
  }, CLOSE_DELAY_MS)
}

/** Apaga do Storage as imagens desta pessoa com mais de 1 hora (o chat nem guarda mensagens tão antigas). */
async function cleanOldImages(userId) {
  try {
    const { data } = await supabase.storage.from(IMAGE_BUCKET).list(userId, { limit: 100 })
    const old = (data ?? []).filter((file) => Date.now() - new Date(file.created_at).getTime() > IMAGE_MAX_AGE_MS)
    if (old.length) await supabase.storage.from(IMAGE_BUCKET).remove(old.map((file) => `${userId}/${file.name}`))
  } catch {
    // faxina é opcional; tenta de novo no próximo envio
  }
}

/**
 * enabled: abre o canal do chat enquanto for true.
 * me: { userId, name, avatarUrl } de quem está falando.
 * Devolve { messages, ready, send(text), sendImage(arquivo, legenda) }. send devolve 'ok', 'wait' (rápido demais) ou 'off' (sem conexão).
 */
export function useLiveChat(enabled, me) {
  useEffect(() => {
    if (!enabled) return undefined
    open()
    return close
  }, [enabled])

  const state = useSyncExternalStore(subscribe, getSnapshot)

  const send = useCallback(
    (rawText) => {
      const text = rawText.trim().slice(0, CHAT_MAX_LENGTH)
      if (!text) return 'ok'
      if (!channel || !snapshot.ready) return 'off'
      const now = Date.now()
      if (now - lastSentAt < MIN_GAP_MS) return 'wait'
      lastSentAt = now
      const message = {
        id: `${me.userId}-${now}-${Math.random().toString(36).slice(2, 8)}`,
        from: me.userId,
        name: me.name,
        avatarUrl: me.avatarUrl,
        text,
        at: now,
      }
      channel.send({ type: 'broadcast', event: 'msg', payload: message })
      receive(message) // o canal não devolve a nossa própria mensagem, então mostramos aqui
      return 'ok'
    },
    [me.userId, me.name, me.avatarUrl],
  )

  // Envia uma imagem/GIF (com legenda opcional). Devolve 'ok', 'wait', 'slow' (imagem a cada 10 s), 'off', 'type', 'big' ou 'fail'.
  const sendImage = useCallback(
    async (file, caption = '') => {
      if (!file.type.startsWith('image/')) return 'type'
      const gif = file.type === 'image/gif'
      if (gif && file.size > CHAT_MAX_GIF_MB * 1024 * 1024) return 'big'
      if (!channel || !snapshot.ready) return 'off'
      if (Date.now() - lastSentAt < MIN_GAP_MS) return 'wait'
      if (Date.now() - lastImageAt < IMAGE_GAP_MS) return 'slow'
      const before = { text: lastSentAt, image: lastImageAt }
      lastSentAt = lastImageAt = Date.now() // reserva a vaga já, para não enviar duas vezes seguidas durante o upload
      try {
        const blob = gif ? file : await shrinkImage(file)
        const path = `${me.userId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${gif ? 'gif' : 'webp'}`
        const { error } = await supabase.storage
          .from(IMAGE_BUCKET)
          .upload(path, blob, { contentType: gif ? 'image/gif' : 'image/webp', cacheControl: '3600' })
        if (error) throw error
        const image = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl
        const now = Date.now()
        const message = {
          id: `${me.userId}-${now}-${Math.random().toString(36).slice(2, 8)}`,
          from: me.userId,
          name: me.name,
          avatarUrl: me.avatarUrl,
          text: caption.trim().slice(0, CHAT_MAX_LENGTH),
          image,
          at: now,
        }
        channel?.send({ type: 'broadcast', event: 'msg', payload: message })
        receive(message)
        cleanOldImages(me.userId) // sem await: é só faxina
        return 'ok'
      } catch {
        lastSentAt = before.text // upload que falhou não gasta a vez da pessoa
        lastImageAt = before.image
        return 'fail'
      }
    },
    [me.userId, me.name, me.avatarUrl],
  )

  return { messages: state.messages, ready: state.ready, send, sendImage }
}
