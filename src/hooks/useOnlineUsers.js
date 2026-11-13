import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

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
    channel.subscribe(async (status) => {
      readyRef.current = status === 'SUBSCRIBED'
      if (readyRef.current) await channel.track(meRef.current)
    })

    return () => {
      readyRef.current = false
      channelRef.current = null
      supabase.removeChannel(channel)
    }
  }, [userId])

  // se a pessoa trocar de nome ou de foto, atualiza na lista
  useEffect(() => {
    if (readyRef.current) channelRef.current?.track({ name, avatarUrl })
  }, [name, avatarUrl])

  return online
}
