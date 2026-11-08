import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { canBroadcast, iceServers, MAX_HOSTS, MAX_VIEWERS, qualityFor, waitForIce } from '../lib/live'
import { createLiveTransport } from '../lib/liveTransport'
import { useAuth } from './AuthContext'

// A transmissão fica aqui (e não na página) para continuar funcionando se a pessoa
// navegar para outra página do site enquanto transmite ou assiste.
//
// Várias pessoas podem transmitir ao mesmo tempo (até MAX_HOSTS) e cada um pode assistir a quantas quiser.
// Cada transmissão é uma conexão direta entre o navegador de quem transmite e o de quem assiste.
const LiveContext = createContext(null)

const JOIN_TIMEOUT_MS = 20000
const PRESENCE_DELAY_MS = 1200 // junta várias mudanças seguidas em uma só (o Supabase limita as chamadas de presença)

export function LiveProvider({ children }) {
  const { user, profile } = useAuth()
  const [presence, setPresence] = useState([])
  const [hosting, setHosting] = useState(false) // você está transmitindo
  const [localStream, setLocalStream] = useState(null) // a sua tela (aparece como prévia)
  const [watching, setWatching] = useState([]) // transmissões que você assiste: [{ hostId, stream, status }]
  const [error, setError] = useState(null)
  const [hasAudio, setHasAudio] = useState(true)

  const apiRef = useRef(null)
  const meRef = useRef(null)
  meRef.current = {
    userId: user?.id,
    name: profile?.display_name ?? user?.email ?? 'Alguém',
    avatarUrl: profile?.avatar_url ?? null,
  }

  const userId = user?.id
  useEffect(() => {
    if (!userId) return undefined

    let isHosting = false
    let startedAt = 0
    let currentPresence = []
    let transport = null
    let localMedia = null
    let presenceTimer = null
    const peers = new Map() // quem transmite: um RTCPeerConnection por espectador
    const entries = new Map() // quem assiste: hostId -> { pc, stream, status, timer }

    const send = (message) => transport?.send({ ...message, from: userId })
    const isHostInPresence = (id) => currentPresence.some((meta) => meta.userId === id && meta.hosting)

    function emitWatching() {
      setWatching(Array.from(entries, ([hostId, entry]) => ({ hostId, stream: entry.stream, status: entry.status })))
    }

    // Publica quem eu sou (transmitindo e/ou assistindo). Sem nada para mostrar, sai da lista.
    function publish(immediate = false) {
      clearTimeout(presenceTimer)
      const run = () => {
        presenceTimer = null
        if (!isHosting && entries.size === 0) {
          transport?.untrack()
          return
        }
        transport?.track({
          ...meRef.current,
          hosting: isHosting,
          watching: Array.from(entries.keys()),
          since: startedAt || Date.now(),
        })
      }
      if (immediate) run()
      else presenceTimer = setTimeout(run, PRESENCE_DELAY_MS)
    }

    // ---------- quem transmite ----------
    function applyQuality() {
      const quality = qualityFor(peers.size)
      peers.forEach((pc) => {
        pc.getSenders().forEach((sender) => {
          if (sender.track?.kind !== 'video') return
          const params = sender.getParameters()
          if (!params.encodings?.length) params.encodings = [{}]
          params.encodings[0].maxBitrate = quality.maxBitrate
          params.encodings[0].scaleResolutionDownBy = quality.scale
          sender.setParameters(params).catch(() => {})
        })
      })
    }

    function closePeer(peerId) {
      peers.get(peerId)?.close()
      peers.delete(peerId)
      applyQuality()
    }

    async function handleJoin(viewerId) {
      if (!isHosting || !localMedia) return
      if (!peers.has(viewerId) && peers.size >= MAX_VIEWERS) {
        send({ type: 'full', to: viewerId })
        return
      }
      closePeer(viewerId)

      const pc = new RTCPeerConnection({ iceServers: iceServers() })
      peers.set(viewerId, pc)
      localMedia.getTracks().forEach((track) => pc.addTrack(track, localMedia))
      pc.onconnectionstatechange = () => {
        if (['failed', 'closed'].includes(pc.connectionState) && peers.get(viewerId) === pc) closePeer(viewerId)
      }
      applyQuality()

      try {
        await pc.setLocalDescription(await pc.createOffer())
        await waitForIce(pc)
        send({ type: 'offer', to: viewerId, data: pc.localDescription.toJSON() })
      } catch {
        closePeer(viewerId)
      }
    }

    async function startLive(options = {}) {
      setError(null)
      if (isHosting) return
      if (currentPresence.filter((meta) => meta.hosting).length >= MAX_HOSTS) {
        setError(new Error(`Já tem ${MAX_HOSTS} transmissões no ar. Espere uma terminar para começar a sua.`))
        return
      }
      let captured
      try {
        // Modos de captura (options.mode):
        //  - 'tab' (padrão): sugere a aba do Chrome e só o áudio dela. O Discord não vaza.
        //  - 'window': sugere uma janela e só o áudio DESSA janela (Chrome 141+; ex.: VLC sem o Discord).
        //  - 'screen': tela inteira com o áudio do sistema (o que o Discord tocar vai junto).
        const mode = options.mode ?? 'tab'
        const extra =
          mode === 'tab'
            ? { video: { displaySurface: 'browser' }, systemAudio: 'exclude', windowAudio: 'exclude' }
            : mode === 'window'
              ? { video: { displaySurface: 'window' }, systemAudio: 'exclude', windowAudio: 'window' }
              : { video: { displaySurface: 'monitor' }, systemAudio: 'include', windowAudio: 'system' }
        captured = await navigator.mediaDevices.getDisplayMedia({
          video: {
            frameRate: { ideal: 30 },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            ...extra.video,
          },
          audio: true,
          systemAudio: extra.systemAudio,
          windowAudio: extra.windowAudio,
        })
      } catch (err) {
        if (err?.name !== 'NotAllowedError') setError(new Error('Não foi possível iniciar a transmissão neste navegador.'))
        return
      }
      localMedia = captured
      const video = captured.getVideoTracks()[0]
      if (video) {
        video.contentHint = 'motion' // prioriza fluidez (filmes, jogos)
        video.addEventListener('ended', () => apiRef.current?.stopLive())
      }
      setHasAudio(captured.getAudioTracks().length > 0)
      isHosting = true
      startedAt = Date.now()
      setHosting(true)
      setLocalStream(captured)
      publish(true)
    }

    function stopLive() {
      if (!isHosting) return
      send({ type: 'ended', to: '*' })
      peers.forEach((pc) => pc.close())
      peers.clear()
      localMedia?.getTracks().forEach((track) => track.stop())
      localMedia = null
      isHosting = false
      startedAt = 0
      setHosting(false)
      setLocalStream(null)
      publish(true)
    }

    // ---------- quem assiste ----------
    function failEntry(entry, status) {
      clearTimeout(entry.timer)
      entry.pc?.close()
      entry.pc = null
      entry.stream = null
      entry.status = status
      emitWatching()
    }

    function watch(hostId) {
      if (!hostId || hostId === userId || entries.has(hostId) || !isHostInPresence(hostId)) return
      setError(null)
      const entry = { pc: null, stream: null, status: 'connecting', timer: null }
      entry.timer = setTimeout(() => {
        if (entries.get(hostId) === entry && entry.status === 'connecting') failEntry(entry, 'error')
      }, JOIN_TIMEOUT_MS)
      entries.set(hostId, entry)
      emitWatching()
      publish()
      send({ type: 'join', to: hostId })
    }

    function unwatch(hostId) {
      const entry = entries.get(hostId)
      if (!entry) return
      clearTimeout(entry.timer)
      entry.pc?.close()
      entries.delete(hostId)
      if (entry.status === 'connecting' || entry.status === 'watching') send({ type: 'leave', to: hostId })
      emitWatching()
      publish()
    }

    async function handleOffer(hostId, offer) {
      const entry = entries.get(hostId)
      if (!entry || !['connecting', 'watching'].includes(entry.status)) return
      entry.pc?.close()
      const pc = new RTCPeerConnection({ iceServers: iceServers() })
      entry.pc = pc
      pc.ontrack = (event) => {
        if (entry.pc !== pc) return
        clearTimeout(entry.timer)
        entry.stream = event.streams[0]
        entry.status = 'watching'
        emitWatching()
      }
      pc.onconnectionstatechange = () => {
        if (entry.pc === pc && pc.connectionState === 'failed') failEntry(entry, 'error')
      }
      try {
        await pc.setRemoteDescription(offer)
        await pc.setLocalDescription(await pc.createAnswer())
        await waitForIce(pc)
        if (entry.pc === pc) send({ type: 'answer', to: hostId, data: pc.localDescription.toJSON() })
      } catch {
        if (entry.pc === pc) failEntry(entry, 'error')
      }
    }

    // ---------- mensagens e presença ----------
    function onSignal(message) {
      if (!message || (message.to !== '*' && message.to !== userId)) return
      const entry = entries.get(message.from)
      switch (message.type) {
        case 'join':
          handleJoin(message.from)
          break
        case 'answer':
          peers.get(message.from)?.setRemoteDescription(message.data).catch(() => closePeer(message.from))
          break
        case 'leave':
          closePeer(message.from)
          break
        case 'offer':
          handleOffer(message.from, message.data)
          break
        case 'full':
          if (entry) failEntry(entry, 'full')
          break
        case 'ended':
          if (entry) failEntry(entry, 'ended')
          break
        default:
      }
    }

    function onPresence(list) {
      currentPresence = list
      setPresence(list)
      // Se quem transmite sumiu (fechou a aba, caiu a internet), encerra aquela transmissão para quem assiste.
      entries.forEach((entry, hostId) => {
        if (['connecting', 'watching'].includes(entry.status) && !isHostInPresence(hostId)) failEntry(entry, 'ended')
      })
    }

    transport = createLiveTransport({ userId, onPresence, onSignal })
    apiRef.current = { startLive, stopLive, watch, unwatch }

    return () => {
      clearTimeout(presenceTimer)
      peers.forEach((pc) => pc.close())
      peers.clear()
      entries.forEach((entry) => {
        clearTimeout(entry.timer)
        entry.pc?.close()
      })
      entries.clear()
      localMedia?.getTracks().forEach((track) => track.stop())
      transport.close()
      apiRef.current = null
      isHosting = false
      setHosting(false)
      setLocalStream(null)
      setWatching([])
      setPresence([])
    }
  }, [userId])

  // Avisa antes de fechar a aba se estiver transmitindo (fechar encerra a sua live para todo mundo).
  useEffect(() => {
    if (!hosting) return undefined
    const warn = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [hosting])

  const value = useMemo(() => {
    const hosts = presence
      .filter((meta) => meta.hosting)
      .sort((a, b) => (a.since ?? 0) - (b.since ?? 0))
    const viewersOf = (hostId) => presence.filter((meta) => meta.watching?.includes(hostId))
    const myViewers = viewersOf(userId)
    return {
      hosts, // todo mundo que está transmitindo (inclusive você)
      viewersOf, // quem está assistindo a uma transmissão
      hosting,
      localStream,
      watching,
      error,
      hasAudio,
      canBroadcast: canBroadcast(),
      quality: qualityFor(myViewers.length),
      startLive: (options) => apiRef.current?.startLive(options),
      stopLive: () => apiRef.current?.stopLive(),
      watch: (hostId) => apiRef.current?.watch(hostId),
      unwatch: (hostId) => apiRef.current?.unwatch(hostId),
    }
  }, [presence, hosting, localStream, watching, error, hasAudio, userId])

  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>
}

export function useLive() {
  const value = useContext(LiveContext)
  if (!value) throw new Error('useLive precisa estar dentro do <LiveProvider>')
  return value
}
