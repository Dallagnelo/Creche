import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { presenceSent, presenceWait } from '../lib/presenceBudget'

/**
 * Quem está com o site aberto agora, usando o Presence do Supabase Realtime.
 * Nada é gravado no banco: a lista vive na memória do Realtime e cada pessoa some dela ao fechar a aba.
 * Várias abas da mesma pessoa contam uma vez só (a chave é o id do usuário).
 */
export function useOnlineUsers({ userId, name, avatarUrl }) {
  const [online, setOnline] = useState([])
  const channelRef = useRef(null)
  const readyRef = useRef(false)
  const meRef = useRef({ name, avatarUrl })
  meRef.current = { name, avatarUrl }
  const lastRef = useRef('') // o que já foi publicado (não manda de novo se nada mudou)
  const timerRef = useRef(0)

  // publica "estou online" respeitando o limite de presença do Supabase (lib/presenceBudget.js)
  const publish = () => {
    const channel = channelRef.current
    if (!readyRef.current || !channel) return
    const key = JSON.stringify(meRef.current)
    if (key === lastRef.current) return
    const wait = presenceWait(true)
    if (wait > 0) {
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(publish, wait)
      return
    }
    lastRef.current = key
    presenceSent()
    channel.track(meRef.current)
  }

  useEffect(() => {
    if (!userId) return undefined
    const channel = supabase.channel('online-users', { config: { presence: { key: userId } } })
    channelRef.current = channel

    const sync = () => {
      const state = channel.presenceState()
      const list = Object.entries(state).map(([id, metas]) => {
        const meta = metas[metas.length - 1] ?? {}
        return { userId: id, name: meta.name ?? 'Alguém', avatarUrl: meta.avatarUrl ?? null }
      })
      list.sort((a, b) => (a.userId === userId ? -1 : b.userId === userId ? 1 : a.name.localeCompare(b.name, 'pt-BR')))
      setOnline(list)
    }
    channel.on('presence', { event: 'sync' }, sync)
    channel.subscribe((status) => {
      readyRef.current = status === 'SUBSCRIBED'
      if (readyRef.current) {
        lastRef.current = '' // conectou (ou reconectou): publica de novo
        publish()
      }
    })

    return () => {
      clearTimeout(timerRef.current)
      readyRef.current = false
      channelRef.current = null
      supabase.removeChannel(channel)
    }
  }, [userId])

  // se a pessoa trocar de nome ou de foto, atualiza na lista
  useEffect(() => {
    publish()
  }, [name, avatarUrl])

  return online
}
