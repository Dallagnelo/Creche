import { supabase } from './supabase'
import { presenceSent } from './presenceBudget'

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
      if (wanted) {
        presenceSent()
        channel.track(wanted)
      }
    }
  })

  return {
    track(meta) {
      wanted = meta
      if (subscribed) {
        presenceSent() // conta no limite de presença (lib/presenceBudget.js)
        channel.track(meta)
      }
    },
    untrack() {
      wanted = null
      if (subscribed) {
        presenceSent()
        channel.untrack()
      }
    },
    send(message) {
      channel.send({ type: 'broadcast', event: 'signal', payload: message })
    },
    close() {
      supabase.removeChannel(channel)
    },
  }
}
