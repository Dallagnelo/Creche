import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { canBroadcast, iceServers, MAX_VIEWERS, qualityFor, waitForIce } from '../lib/live'
import { createLiveTransport } from '../lib/liveTransport'
import { useAuth } from './AuthContext'

// A transmissão fica aqui (e não na página) para continuar funcionando se a pessoa
// navegar para outra página do site enquanto transmite ou assiste.
const LiveContext = createContext(null)

const JOIN_TIMEOUT_MS = 20000

export function LiveProvider({ children }) {
  const { user, profile } = useAuth()
  const [presence, setPresence] = useState([])
  const [role, setRole] = useState('idle') // 'idle' | 'host' | 'viewer'
  const [stream, setStream] = useState(null) // o que aparece no vídeo (a sua tela ou a de quem transmite)
  const [status, setStatus] = useState('idle') // espectador: 'connecting' | 'watching' | 'full' | 'ended' | 'error'
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

    let currentRole = 'idle'
    let currentPresence = []
    let transport = null
    let localStream = null
    let hostPc = null
    let joinTimer = null
    const peers = new Map() // host: um RTCPeerConnection por espectador

    const changeRole = (next) => {
      currentRole = next
      setRole(next)
    }
    const send = (message) => transport?.send({ ...message, from: userId })

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
      if (currentRole !== 'host' || !localStream) return
      if (!peers.has(viewerId) && peers.size >= MAX_VIEWERS) {
        send({ type: 'full', to: viewerId })
        return
      }
      closePeer(viewerId)

      const pc = new RTCPeerConnection({ iceServers: iceServers() })
      peers.set(viewerId, pc)
      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream))
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

    async function startLive() {
      setError(null)
      if (currentRole !== 'idle') return
      if (currentPresence.some((meta) => meta.role === 'host')) {
        setError(new Error('Já tem alguém transmitindo agora.'))
        return
      }
      let captured
      try {
        captured = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: { ideal: 30 }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: true,
        })
      } catch (err) {
        if (err?.name !== 'NotAllowedError') setError(new Error('Não foi possível iniciar a transmissão neste navegador.'))
        return
      }
      localStream = captured
      const video = captured.getVideoTracks()[0]
      if (video) {
        video.contentHint = 'motion' // prioriza fluidez (filmes, jogos)
        video.addEventListener('ended', () => apiRef.current?.stopLive())
      }
      setHasAudio(captured.getAudioTracks().length > 0)
      changeRole('host')
      setStream(captured)
      transport?.track({ ...meRef.current, role: 'host', since: Date.now() })
    }

    function stopLive() {
      if (currentRole !== 'host') return
      send({ type: 'ended', to: '*' })
      peers.forEach((pc) => pc.close())
      peers.clear()
      localStream?.getTracks().forEach((track) => track.stop())
      localStream = null
      transport?.untrack()
      changeRole('idle')
      setStream(null)
    }

    // ---------- quem assiste ----------
    function resetViewer(nextStatus) {
      clearTimeout(joinTimer)
      hostPc?.close()
      hostPc = null
      transport?.untrack()
      changeRole('idle')
      setStream(null)
      setStatus(nextStatus)
    }

    function join() {
      setError(null)
      const host = currentPresence.find((meta) => meta.role === 'host')
      if (currentRole !== 'idle' || !host) return
      changeRole('viewer')
      setStatus('connecting')
      transport?.track({ ...meRef.current, role: 'viewer', since: Date.now() })
      send({ type: 'join', to: host.userId })
      joinTimer = setTimeout(() => {
        if (currentRole === 'viewer' && !hostPc?.remoteDescription) {
          setError(new Error('Não deu para conectar na transmissão. Tente entrar de novo.'))
          resetViewer('error')
        }
      }, JOIN_TIMEOUT_MS)
    }

    function leave() {
      if (currentRole !== 'viewer') return
      const host = currentPresence.find((meta) => meta.role === 'host')
      if (host) send({ type: 'leave', to: host.userId })
      resetViewer('idle')
    }

    async function handleOffer(hostId, offer) {
      if (currentRole !== 'viewer') return
      hostPc?.close()
      const pc = new RTCPeerConnection({ iceServers: iceServers() })
      hostPc = pc
      pc.ontrack = (event) => {
        clearTimeout(joinTimer)
        setStream(event.streams[0])
        setStatus('watching')
      }
      pc.onconnectionstatechange = () => {
        if (pc !== hostPc) return
        if (pc.connectionState === 'failed') {
          setError(new Error('A conexão caiu. Tente entrar de novo.'))
          resetViewer('error')
        }
      }
      try {
        await pc.setRemoteDescription(offer)
        await pc.setLocalDescription(await pc.createAnswer())
        await waitForIce(pc)
        send({ type: 'answer', to: hostId, data: pc.localDescription.toJSON() })
      } catch {
        setError(new Error('Não deu para conectar na transmissão.'))
        resetViewer('error')
      }
    }

    // ---------- mensagens e presença ----------
    function onSignal(message) {
      if (!message || (message.to !== '*' && message.to !== userId)) return
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
          if (currentRole === 'viewer') resetViewer('full')
          break
        case 'ended':
          if (currentRole === 'viewer') resetViewer('ended')
          break
        default:
      }
    }

    function onPresence(list) {
      currentPresence = list
      setPresence(list)
      // Se quem transmite sumiu (fechou a aba, caiu a internet), encerra para quem assiste.
      if (currentRole === 'viewer' && !list.some((meta) => meta.role === 'host')) resetViewer('ended')
    }

    transport = createLiveTransport({ userId, onPresence, onSignal })
    apiRef.current = { startLive, stopLive, join, leave }

    return () => {
      peers.forEach((pc) => pc.close())
      peers.clear()
      hostPc?.close()
      localStream?.getTracks().forEach((track) => track.stop())
      clearTimeout(joinTimer)
      transport.close()
      apiRef.current = null
      currentRole = 'idle'
      setRole('idle')
      setStream(null)
      setPresence([])
    }
  }, [userId])

  // Avisa antes de fechar a aba se estiver transmitindo (fechar encerra a live para todo mundo).
  useEffect(() => {
    if (role !== 'host') return undefined
    const warn = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [role])

  const value = useMemo(() => {
    const host = presence.find((meta) => meta.role === 'host') ?? null
    const viewers = presence.filter((meta) => meta.role === 'viewer')
    return {
      host,
      viewers,
      role,
      stream,
      status,
      error,
      hasAudio,
      canBroadcast: canBroadcast(),
      quality: qualityFor(viewers.length),
      startLive: () => apiRef.current?.startLive(),
      stopLive: () => apiRef.current?.stopLive(),
      join: () => apiRef.current?.join(),
      leave: () => apiRef.current?.leave(),
      clearStatus: () => {
        setStatus('idle')
        setError(null)
      },
    }
  }, [presence, role, stream, status, error, hasAudio])

  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>
}

export function useLive() {
  const value = useContext(LiveContext)
  if (!value) throw new Error('useLive precisa estar dentro do <LiveProvider>')
  return value
}
