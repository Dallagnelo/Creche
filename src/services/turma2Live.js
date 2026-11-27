import { openChannel, releaseChannel } from '../lib/realtimeChannel'

// Multiplayer da Turma 2.0: quem está no mesmo mapa se vê andando (Supabase Realtime).
// Presença: quem está no mapa (nome e personagem). Broadcast "pos": onde cada um está, ~8 vezes por segundo
// enquanto anda (e de 2 em 2 s parado). Nada disso fica salvo: é só o "ao vivo".

/**
 * Entra no mapa "code". onPeers(lista) recebe quem está lá (menos você): [{ id, nome, char }].
 * onPos(id, { x, y, dir, mv }) recebe cada posição nova. Devolve { send(pos), close() }.
 */
export function joinMapLive(code, me, { onPeers, onPos, onEvent }) {
  let channel = null
  let closed = false
  let ready = false
  let lastSent = 0
  let lastKey = ''
  let extra = {} // o resto da presença (cinema: sentado, pipoca na mão…)
  openChannel(`turma2:${code}`, { config: { broadcast: { self: false }, presence: { key: me.id } } }).then((ch) => {
    if (closed) {
      releaseChannel(ch)
      return
    }
    channel = ch
    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState()
      const list = Object.entries(state)
        .filter(([id]) => id !== me.id)
        .map(([id, metas]) => ({ id, ...(metas[metas.length - 1] ?? {}) }))
      onPeers(list)
    })
    ch.on('broadcast', { event: 'pos' }, ({ payload }) => {
      if (payload?.id && payload.id !== me.id) onPos(payload.id, payload)
    })
    // acontecimentos: emote, mensagem do chat e o uso de uma ferramenta (para os outros verem)
    ch.on('broadcast', { event: 'ev' }, ({ payload }) => {
      if (payload?.id && payload.id !== me.id) onEvent?.(payload.id, payload)
    })
    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        ready = true
        ch.track({ ...extra, nome: me.nome, char: me.char ?? null })
      }
    })
  })
  return {
    /** manda a posição (ele mesmo decide se precisa: só quando muda, no máximo ~8x/s, e um "estou aqui" a cada 2 s) */
    send(pos, now = performance.now()) {
      if (!ready || !channel) return
      const key = `${Math.round(pos.x)},${Math.round(pos.y)},${pos.dir},${pos.mv ? 1 : 0},${pos.fz ?? ''}`
      const changed = key !== lastKey
      if ((changed && now - lastSent < 120) || (!changed && now - lastSent < 2000)) return
      lastSent = now
      lastKey = key
      channel.send({ type: 'broadcast', event: 'pos', payload: { id: me.id, x: Math.round(pos.x), y: Math.round(pos.y), dir: pos.dir, mv: pos.mv ? 1 : 0, fz: pos.fz ?? '' } })
    },
    /** muda o resto da presença (quem chega depois também vê) */
    track(meta) {
      extra = { ...meta }
      if (ready && channel) channel.track({ ...extra, nome: me.nome, char: me.char ?? null })
    },
    /** manda um acontecimento: { k: 'emote', e } · { k: 'chat', texto } · { k: 'acao', item } · { k: 'fx', p } (cinema) */
    event(ev) {
      if (!ready || !channel) return
      channel.send({ type: 'broadcast', event: 'ev', payload: { ...ev, id: me.id } })
    },
    close() {
      closed = true
      if (channel) releaseChannel(channel)
    },
  }
}
