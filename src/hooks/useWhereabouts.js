import { useEffect, useRef, useState } from 'react'
import { openChannel, releaseChannel } from '../lib/realtimeChannel'

/*
 * Em que sala do jogo "Turma" cada pessoa está, para os cartõezinhos embaixo do jogo.
 * Cada sala tem o próprio canal, então ninguém sabe onde os outros estão. Este canal à parte
 * só usa broadcast (não presença, que tem limite no Supabase): quem entra pergunta "onde vocês estão?",
 * quem está no jogo responde, e cada um avisa quando troca de sala ou sai do jogo.
 * Devolve { [userId]: 'Nome da sala' } de quem está com o jogo aberto agora.
 */
export function useWhereabouts(userId, room) {
  const [where, setWhere] = useState({})
  const channelRef = useRef(null)
  const readyRef = useRef(false)
  const roomRef = useRef(room)
  roomRef.current = room

  const tell = () => {
    if (!readyRef.current || !roomRef.current) return
    channelRef.current?.send({ type: 'broadcast', event: 'here', payload: { id: userId, room: roomRef.current } })
  }

  useEffect(() => {
    if (!userId) return undefined
    let alive = true
    let channel = null
    const set = (id, value) =>
      setWhere((current) => {
        if (current[id] === value) return current
        const next = { ...current }
        if (value) next[id] = value
        else delete next[id]
        return next
      })
    openChannel('turma-onde', { config: { broadcast: { self: false } } }).then((created) => {
      if (!alive) {
        releaseChannel(created)
        return
      }
      channel = created
      channelRef.current = channel
      channel.on('broadcast', { event: 'here' }, ({ payload }) => payload?.id && set(payload.id, String(payload.room ?? '').slice(0, 60)))
      channel.on('broadcast', { event: 'bye' }, ({ payload }) => payload?.id && set(payload.id, null))
      channel.on('broadcast', { event: 'ask' }, () => tell())
      channel.subscribe((status) => {
        readyRef.current = status === 'SUBSCRIBED'
        if (readyRef.current) {
          channel.send({ type: 'broadcast', event: 'ask', payload: { id: userId } })
          tell()
        }
      })
    })
    return () => {
      alive = false
      if (channel && readyRef.current) channel.send({ type: 'broadcast', event: 'bye', payload: { id: userId } })
      readyRef.current = false
      channelRef.current = null
      if (channel) releaseChannel(channel)
    }
  }, [userId])

  // trocou de sala: avisa todo mundo
  useEffect(() => {
    tell()
  }, [room])

  return where
}
