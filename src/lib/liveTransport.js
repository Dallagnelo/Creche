import { supabase } from './supabase'

const CHANNEL_NAME = 'turma-ao-vivo'

/**
 * Canal em tempo real do Supabase usado só para "avisar quem está ao vivo" (presença)
 * e trocar as mensagens de conexão entre os navegadores. O vídeo NÃO passa por aqui.
 */
export function createLiveTransport({ userId, onPresence, onSignal }) {
  const channel = supabase.channel(CHANNEL_NAME, {
    config: { broadcast: { self: false }, presence: { key: userId } },
  })

  channel.on('presence', { event: 'sync' }, () => {
    onPresence(Object.values(channel.presenceState()).flat())
  })
  channel.on('broadcast', { event: 'signal' }, ({ payload }) => onSignal(payload))

  let subscribed = false
  let wanted = null // presença que queremos publicar assim que o canal conectar

  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      subscribed = true
      if (wanted) channel.track(wanted)
    }
  })

  return {
    track(meta) {
      wanted = meta
      if (subscribed) channel.track(meta)
    },
    untrack() {
      wanted = null
      if (subscribed) channel.untrack()
    },
    send(message) {
      channel.send({ type: 'broadcast', event: 'signal', payload: message })
    },
    close() {
      supabase.removeChannel(channel)
    },
  }
}
