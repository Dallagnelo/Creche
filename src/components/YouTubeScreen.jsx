import { useEffect, useRef, useState } from 'react'

// Telão da sala: um vídeo do YouTube tocando para todo mundo ao mesmo tempo.
// Todos usam o mesmo "começou em" (horário em que o DJ deu play), então cada um pula para o mesmo ponto do vídeo.

let apiPromise = null
function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (!apiPromise) {
    apiPromise = new Promise((resolve) => {
      const previous = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        previous?.()
        resolve(window.YT)
      }
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      tag.async = true
      document.head.appendChild(tag)
    })
  }
  return apiPromise
}

/** Tira o id do vídeo de qualquer link do YouTube (ou aceita o id puro). */
export function youTubeId(text) {
  const value = String(text ?? '').trim()
  if (/^[\w-]{11}$/.test(value)) return value
  try {
    const url = new URL(value.startsWith('http') ? value : `https://${value}`)
    const host = url.hostname.replace(/^www\.|^m\.|^music\./, '')
    if (host === 'youtu.be') return url.pathname.slice(1, 12) || null
    if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      if (url.searchParams.get('v')) return url.searchParams.get('v').slice(0, 11)
      const parts = url.pathname.split('/').filter(Boolean)
      if (['shorts', 'embed', 'live', 'v'].includes(parts[0]) && parts[1]) return parts[1].slice(0, 11)
    }
  } catch {
    return null
  }
  return null
}

const expectedTime = (at) => Math.max(0, (Date.now() - at) / 1000)

const VOLUME_KEY = 'turma-volume'
function readVolume() {
  try {
    const value = Number(localStorage.getItem(VOLUME_KEY))
    return Number.isFinite(value) && localStorage.getItem(VOLUME_KEY) !== null ? Math.min(100, Math.max(0, value)) : 70
  } catch {
    return 70
  }
}

/** O vídeo aparece em cima da tela do telão (rect em % da sala). Tocando na tela ele amplia só para você. */
export default function YouTubeScreen({ video, rect, onStop }) {
  const boxRef = useRef(null)
  const playerRef = useRef(null)
  const videoRef = useRef(video)
  videoRef.current = video
  const [blocked, setBlocked] = useState(false)
  const [volume, setVolume] = useState(readVolume)
  const volumeRef = useRef(volume)
  volumeRef.current = volume
  const [zoom, setZoom] = useState(false)
  const lastVolume = useRef(70)
  const [title, setTitle] = useState('')

  const applyVolume = (player, value) => {
    if (!player?.setVolume) return
    player.setVolume(value)
    if (value === 0) player.mute()
    else player.unMute()
  }

  // cria o player uma vez e troca de vídeo quando o DJ escolher outro
  useEffect(() => {
    if (!video) return undefined
    let cancelled = false
    loadYouTubeApi().then((YT) => {
      if (cancelled || !boxRef.current) return
      if (playerRef.current) {
        playerRef.current.loadVideoById({ videoId: video.id, startSeconds: expectedTime(video.at) })
        return
      }
      const mount = document.createElement('div')
      boxRef.current.innerHTML = ''
      boxRef.current.appendChild(mount)
      playerRef.current = new YT.Player(mount, {
        videoId: video.id,
        width: '100%',
        height: '100%',
        playerVars: { autoplay: 1, controls: 0, disablekb: 1, modestbranding: 1, rel: 0, playsinline: 1, iv_load_policy: 3, start: Math.floor(expectedTime(video.at)) },
        events: {
          onReady: (event) => {
            applyVolume(event.target, volumeRef.current)
            event.target.seekTo(expectedTime(videoRef.current.at), true)
            event.target.playVideo()
            setTitle(event.target.getVideoData?.().title ?? '')
            // se o navegador bloquear o som automático, aparece o botão "Ouvir"
            setTimeout(() => {
              const state = playerRef.current?.getPlayerState?.()
              if (state !== 1 && state !== 0) setBlocked(true)
            }, 1800)
          },
          onStateChange: (event) => {
            if (event.data === 1) {
              setBlocked(false)
              setTitle(event.target.getVideoData?.().title ?? '')
            }
          },
        },
      })
    })
    return () => {
      cancelled = true
    }
  }, [video?.id, video?.at]) // eslint-disable-line react-hooks/exhaustive-deps

  // de tempos em tempos confere se está no mesmo ponto que todo mundo
  useEffect(() => {
    if (!video) return undefined
    const timer = setInterval(() => {
      const player = playerRef.current
      if (!player?.getCurrentTime || player.getPlayerState?.() !== 1) return
      const diff = Math.abs(player.getCurrentTime() - expectedTime(videoRef.current.at))
      if (diff > 2.5) player.seekTo(expectedTime(videoRef.current.at), true)
    }, 8000)
    return () => clearInterval(timer)
  }, [video])

  // vídeo parado pelo DJ: desmonta o player
  useEffect(() => {
    if (video) return
    playerRef.current?.destroy?.()
    playerRef.current = null
    setBlocked(false)
    setTitle('')
    setZoom(false)
  }, [video])

  useEffect(() => () => playerRef.current?.destroy?.(), [])

  // Esc fecha a tela ampliada
  useEffect(() => {
    if (!zoom) return undefined
    const onKey = (event) => event.key === 'Escape' && setZoom(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zoom])

  if (!video || !rect) return null

  function listen() {
    const player = playerRef.current
    if (!player) return
    player.seekTo(expectedTime(videoRef.current.at), true)
    applyVolume(player, volumeRef.current || 70)
    if (!volumeRef.current) changeVolume(70)
    player.playVideo()
  }
  function changeVolume(value) {
    const next = Math.min(100, Math.max(0, Math.round(value)))
    setVolume(next)
    applyVolume(playerRef.current, next)
    try {
      localStorage.setItem(VOLUME_KEY, String(next))
    } catch {
      /* sem localStorage: vale só agora */
    }
  }
  function toggleMute() {
    if (volume > 0) {
      lastVolume.current = volume
      changeVolume(0)
    } else changeVolume(lastVolume.current || 70)
  }

  // ampliado: a TV cresce no meio da sala (só para você), mantendo 16:9
  let place = { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
  if (zoom) {
    const aspect = rect.aspect ?? 2
    let width = 64
    let height = (width * aspect * 9) / 16
    if (height > 78) {
      height = 78
      width = (height / aspect) * (16 / 9)
    }
    place = { left: (100 - width) / 2, top: 5, width, height }
  }
  const style = { left: `${place.left}%`, top: `${place.top}%`, width: `${place.width}%`, height: `${place.height}%` }
  const icon = volume === 0 ? '🔇' : volume < 40 ? '🔈' : volume < 75 ? '🔉' : '🔊'

  return (
    <div className={`yt-tv${zoom ? ' is-zoom' : ''}`} style={style}>
      <div className="yt-frame">
        <div ref={boxRef} className="yt-player" />
        <button
          type="button"
          className="yt-hit"
          onClick={() => setZoom(!zoom)}
          aria-label={zoom ? 'Voltar a TV para a parede' : 'Ampliar a TV (só para você)'}
          title={zoom ? 'Voltar para a parede' : 'Ampliar'}
        />
        {blocked && (
          <button type="button" className="yt-listen" onClick={listen}>
            ▶ Ouvir com a turma
          </button>
        )}
      </div>
      <div className="yt-remote" role="group" aria-label="Controle do telão">
        <span className="yt-live" aria-hidden="true" />
        <span className="yt-title" title={title}>
          {title || 'Tocando no telão'}
          {video.by ? ` · DJ ${video.by}` : ''}
        </span>
        <button type="button" onClick={toggleMute} aria-label={volume ? 'Tirar o som' : 'Ligar o som'} title={volume ? 'Tirar o som (só para você)' : 'Ligar o som'}>
          {icon}
        </button>
        <input
          type="range"
          className="yt-volume"
          min="0"
          max="100"
          step="5"
          value={volume}
          onChange={(event) => changeVolume(Number(event.target.value))}
          aria-label="Volume (só para você)"
          title={`Volume: ${volume}%`}
          style={{ '--fill': `${volume}%` }}
        />
        <button type="button" onClick={() => setZoom(!zoom)} aria-label={zoom ? 'Voltar para a parede' : 'Ampliar'} title={zoom ? 'Voltar para a parede' : 'Ampliar (só para você)'}>
          {zoom ? '🗗' : '⛶'}
        </button>
        <button type="button" onClick={onStop} title="Desligar o telão para todo mundo" aria-label="Desligar o telão para todo mundo">
          ⏻
        </button>
      </div>
    </div>
  )
}
