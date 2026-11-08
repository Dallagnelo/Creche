import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { supabase } from './supabase'

// Chat da página Ao vivo, o mais leve possível:
//  - NADA é gravado no banco. As mensagens só passam pelo canal de tempo real do Supabase
//    e ficam na memória do navegador (somem ao recarregar a página).
//  - O canal só abre enquanto alguém está com a página Ao vivo aberta e existe transmissão no ar.
//  - Cada pessoa pode mandar no máximo 1 mensagem por segundo, com até 300 caracteres.

export const CHAT_MAX_LENGTH = 300
const CHANNEL_NAME = 'turma-ao-vivo-chat'
const KEEP_MESSAGES = 100
const MIN_GAP_MS = 1000
const CLOSE_DELAY_MS = 3000 // evita fechar e abrir o canal se a pessoa só trocar de página rapidinho

let channel = null
let users = 0
let closeTimer = null
let lastSentAt = 0
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
  if (!text || typeof payload.id !== 'string' || typeof payload.from !== 'string') return null
  return {
    id: payload.id.slice(0, 80),
    from: payload.from.slice(0, 80),
    name: typeof payload.name === 'string' ? payload.name.slice(0, 60) : 'Alguém',
    avatarUrl: typeof payload.avatarUrl === 'string' ? payload.avatarUrl.slice(0, 600) : null,
    text,
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

/**
 * enabled: abre o canal do chat enquanto for true.
 * me: { userId, name, avatarUrl } de quem está falando.
 * Devolve { messages, ready, send(text) }. send devolve 'ok', 'wait' (rápido demais) ou 'off' (sem conexão).
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

  return { messages: state.messages, ready: state.ready, send }
}
