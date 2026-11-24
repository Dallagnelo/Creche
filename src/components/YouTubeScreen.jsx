import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLive } from '../contexts/LiveContext'
import CinemaAudience from './CinemaAudience'
import { CinemaCredits, MoodChart, useMoodTimeline } from './CinemaMood'

// Telão da sala: um vídeo do YouTube tocando para todo mundo ao mesmo tempo.
// Todos usam o mesmo "começou em" (horário em que o DJ deu play), então cada um pula para o mesmo ponto do vídeo.

let apiPromise = null
function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (!apiPromise) {
    apiPromise = new Promise((resolve, reject) => {
      const previous = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        previous?.()
        resolve(window.YT)
      }
      const fail = () => {
        apiPromise = null // deixa tentar de novo da próxima vez
        reject(new Error('youtube'))
      }
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      tag.async = true
      tag.onerror = fail
      document.head.appendChild(tag)
      setTimeout(() => !window.YT?.Player && fail(), 12000)
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
// ponto do vídeo em que a sala está: parado (pausado por alguém) ou correndo desde "at"
const targetTime = (video) => (Number.isFinite(video?.pausedAt) ? Math.max(0, video.pausedAt) : expectedTime(video?.at ?? Date.now()))
const isPaused = (video) => Number.isFinite(video?.pausedAt)
const clock = (seconds) => {
  const total = Math.max(0, Math.floor(seconds || 0))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const sec = String(total % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

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
/**
 * O telão da sala. Toca um vídeo do YouTube (sincronizado) ou uma transmissão da página Ao vivo.
 * video = { type: 'yt', id, at, by, pausedAt?, pausedBy? } ou { type: 'live', host, name, by }.
 * Pausar e pular para um ponto valem para a sala inteira (onControl manda o novo estado para todos).
 * A imagem fica atrás da sala, na tela da TV (rect em % da sala). Dá para ampliar ou pôr em tela cheia (só para você).
 */
export default function YouTubeScreen({ video, rect, onStop, onControl, audience = null, cinema = false, onCinemaClose, onReact, onChat, cine }) {
  const { user, profile } = useAuth()
  const live = useLive()
  const liveRef = useRef(live)
  liveRef.current = live
  const isLive = video?.type === 'live'
  const ytId = video && !isLive ? video.id : null
  const liveHost = isLive ? video.host : null

  const screenRef = useRef(null)
  const boxRef = useRef(null)
  const liveVideoRef = useRef(null)
  const playerRef = useRef(null)
  const videoRef = useRef(video)
  videoRef.current = video
  const [blocked, setBlocked] = useState(false)
  const [volume, setVolume] = useState(readVolume)
  const volumeRef = useRef(volume)
  volumeRef.current = volume
  const [zoom, setZoom] = useState(false)
  const [realFull, setFull] = useState(false)
  // modo cinema (Cine turma): sentou na poltrona, o vídeo ocupa a janela toda com a plateia por cima
  const pseudo = !!(cinema && audience)
  const full = realFull || pseudo
  const [awake, setAwake] = useState(true) // em tela cheia, o controle some quando o mouse fica parado
  const lastVolume = useRef(70)
  const [title, setTitle] = useState('')
  // barra de tempo (vídeo do YouTube): posição e duração lidas do player; arrastar mostra o ponto antes de soltar
  const [pos, setPos] = useState(0)
  const [dur, setDur] = useState(0)
  const [drag, setDrag] = useState(null)
  const [failed, setFailed] = useState(false)

  const applyVolume = (value) => {
    const player = playerRef.current
    if (player?.setVolume) {
      player.setVolume(value)
      if (value === 0) player.mute()
      else player.unMute()
    }
    const el = liveVideoRef.current
    if (el) {
      el.volume = value / 100
      el.muted = value === 0 || liveHost === user?.id // a sua própria live não toca o som (eco)
    }
  }

  // ---------- YouTube: cria o player e troca de vídeo quando o DJ escolher outro
  useEffect(() => {
    if (!ytId) return undefined
    let cancelled = false
    setFailed(false)
    loadYouTubeApi()
      .then((YT) => {
        if (cancelled || !boxRef.current) return
        if (playerRef.current) {
          const player = playerRef.current
          // mesmo vídeo (só acertou o ponto): pula para lá sem recarregar
          if (player.getVideoData?.().video_id === ytId) player.seekTo(targetTime(videoRef.current), true)
          else player.loadVideoById({ videoId: ytId, startSeconds: targetTime(videoRef.current) })
          // pausado pela sala: fica parado no mesmo ponto; senão, toca
          if (isPaused(videoRef.current)) player.pauseVideo?.()
          else player.playVideo?.()
          return
        }
        // sem legenda e na melhor qualidade que o YouTube deixar (ele pode baixar por causa da internet ou do tamanho da tela)
        const tidy = (target) => {
          try {
            target.unloadModule?.('captions')
            target.unloadModule?.('cc')
            target.setOption?.('captions', 'track', {})
          } catch {
            /* vídeo sem legendas */
          }
          try {
            const levels = target.getAvailableQualityLevels?.() ?? []
            const best = levels.find((level) => level !== 'auto') ?? 'highres'
            target.setPlaybackQuality?.(best)
          } catch {
            /* o YouTube decide */
          }
        }
        const mount = document.createElement('div')
        boxRef.current.innerHTML = ''
        boxRef.current.appendChild(mount)
        playerRef.current = new YT.Player(mount, {
          videoId: ytId,
          width: '100%',
          height: '100%',
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            iv_load_policy: 3,
            cc_load_policy: 0, // legenda desligada
            cc_lang_pref: 'none',
            vq: 'highres', // pede a melhor qualidade
            start: Math.floor(targetTime(videoRef.current)),
          },
          events: {
            onReady: (event) => {
              applyVolume(volumeRef.current)
              tidy(event.target)
              event.target.seekTo(targetTime(videoRef.current), true)
              if (isPaused(videoRef.current)) event.target.pauseVideo()
              else event.target.playVideo()
              setTitle(event.target.getVideoData?.().title ?? '')
              // se o navegador bloquear o som automático, aparece o botão "Ouvir"
              setTimeout(() => {
                const state = playerRef.current?.getPlayerState?.()
                if (state !== 1 && state !== 0) setBlocked(true)
              }, 1800)
            },
            onError: () => setFailed(true),
            onStateChange: (event) => {
              if (event.data === 1 && isPaused(videoRef.current)) {
                // a sala está pausada: não deixa tocar sozinho
                event.target.pauseVideo()
                event.target.seekTo(targetTime(videoRef.current), true)
                return
              }
              if (event.data === 1) {
                tidy(event.target) // o YouTube às vezes religa a legenda ou baixa a qualidade ao começar a tocar
                setBlocked(false)
                setTitle(event.target.getVideoData?.().title ?? '')
              }
            },
          },
        })
      })
      .catch(() => !cancelled && setFailed(true))
    return () => {
      cancelled = true
    }
  }, [ytId, video?.at, video?.pausedAt]) // eslint-disable-line react-hooks/exhaustive-deps

  // De tempos em tempos confere se está no mesmo ponto que todo mundo.
  // Proteções contra o "vídeo voltando sem parar":
  // - transmissão ao vivo do YouTube não tem "segundo X": não acerta nada;
  // - só corrige se continuar fora do ponto em duas conferências seguidas;
  // - se precisou corrigir 3 vezes em pouco tempo, para de corrigir esse vídeo e deixa tocar.
  useEffect(() => {
    if (!ytId) return undefined
    let strikes = 0
    let fixes = []
    let gaveUp = false
    const timer = setInterval(() => {
      const player = playerRef.current
      if (gaveUp || !player?.getCurrentTime || player.getPlayerState?.() !== 1) return
      if (isPaused(videoRef.current)) {
        player.pauseVideo?.() // alguém pausou e este player continuou: para junto
        return
      }
      const data = player.getVideoData?.() ?? {}
      const duration = player.getDuration?.() ?? 0
      if (data.isLive || !duration) return
      if (Date.now() < videoRef.current.at - 2000) return // "começou no futuro": relógio errado, não dá para confiar
      const expected = expectedTime(videoRef.current.at)
      if (expected >= duration - 1) return // pelo relógio já acabou: deixa como está
      const diff = Math.abs(player.getCurrentTime() - expected)
      if (diff <= 3) {
        strikes = 0
        return
      }
      strikes += 1
      if (strikes < 2) return
      strikes = 0
      const now = Date.now()
      fixes = fixes.filter((time) => now - time < 90000)
      if (fixes.length >= 3) {
        gaveUp = true
        return
      }
      fixes.push(now)
      player.seekTo(expected, true)
    }, 5000)
    return () => clearInterval(timer)
  }, [ytId, video?.at, video?.pausedAt]) // eslint-disable-line react-hooks/exhaustive-deps

  // atualiza a barra de tempo
  useEffect(() => {
    if (!ytId) return undefined
    const timer = setInterval(() => {
      const player = playerRef.current
      if (!player?.getCurrentTime) return
      const data = player.getVideoData?.() ?? {}
      const duration = data.isLive ? 0 : player.getDuration?.() ?? 0
      setDur(duration)
      setPos(isPaused(videoRef.current) ? targetTime(videoRef.current) : player.getCurrentTime())
    }, 500)
    return () => clearInterval(timer)
  }, [ytId])

  // tempo do vídeo para a "nota ao vivo" do cinema (live da aba Ao vivo: conta desde que você sentou)
  const sinceRef = useRef(Date.now())
  const getVideoTime = () => {
    const player = playerRef.current
    const current = videoRef.current
    if (ytId && player?.getCurrentTime) {
      const state = player.getPlayerState?.()
      return {
        key: ytId,
        t: player.getCurrentTime(),
        dur: player.getVideoData?.()?.isLive ? 0 : player.getDuration?.() ?? 0,
        ended: state === 0,
        paused: isPaused(current) || state === 2,
      }
    }
    return { key: current?.host ?? 'live', t: (Date.now() - sinceRef.current) / 1000, dur: 0, ended: false, paused: false }
  }

  // nota ao vivo do cinema: anota para todo mundo na sala (sentado ou não), e no fim todos veem o mesmo gráfico
  const mood = useMoodTimeline({ cine, meId: user?.id, getPeople: audience, getVideoTime, enabled: !!(audience && cine), seated: pseudo })

  // pausar / continuar / pular: vale para a sala inteira
  const myName = profile?.display_name?.split(' ')[0] ?? 'Alguém'
  const togglePause = () => {
    const current = videoRef.current
    if (!current || current.type !== 'yt' || !onControl) return
    if (isPaused(current)) {
      const { pausedAt, pausedBy, ...rest } = current // eslint-disable-line no-unused-vars
      onControl({ ...rest, at: Date.now() - current.pausedAt * 1000 })
    } else {
      const now = playerRef.current?.getCurrentTime?.() ?? targetTime(current)
      onControl({ ...current, pausedAt: Math.max(0, now), pausedBy: myName })
    }
  }
  const seekTo = (seconds) => {
    const current = videoRef.current
    if (!current || current.type !== 'yt' || !onControl) return
    const t = Math.max(0, Math.min(dur ? dur - 1 : seconds, seconds))
    if (isPaused(current)) onControl({ ...current, pausedAt: t })
    else onControl({ ...current, at: Date.now() - t * 1000 })
  }
  const commitDrag = () => {
    if (drag == null) return
    seekTo(drag)
    setDrag(null)
  }

  // saiu do YouTube (desligou ou trocou para live): desmonta o player
  useEffect(() => {
    if (ytId) return
    playerRef.current?.destroy?.()
    playerRef.current = null
    if (boxRef.current) boxRef.current.innerHTML = ''
    setBlocked(false)
    setTitle('')
    setFailed(false)
    if (!video) setZoom(false)
  }, [ytId, video])

  useEffect(() => () => playerRef.current?.destroy?.(), [])

  // ---------- Ao vivo: a TV vira mais um espectador da transmissão (a sua própria live aparece direto)
  useEffect(() => {
    if (!liveHost || liveHost === user?.id) return undefined
    const api = liveRef.current
    const already = api.watching.some((item) => item.hostId === liveHost)
    if (!already) api.watch(liveHost)
    return () => {
      if (!already) liveRef.current.unwatch(liveHost)
    }
  }, [liveHost, user?.id])

  const entry = liveHost ? live.watching.find((item) => item.hostId === liveHost) : null
  const liveStream = liveHost ? (liveHost === user?.id ? live.localStream : entry?.stream) : null
  useEffect(() => {
    const el = liveVideoRef.current
    if (!el) return
    if (el.srcObject !== (liveStream ?? null)) el.srcObject = liveStream ?? null
    if (!liveStream) return
    applyVolume(volumeRef.current)
    el.play().then(
      () => setBlocked(false),
      () => setBlocked(true),
    )
  }, [liveStream]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- tela cheia
  useEffect(() => {
    const onChange = () => setFull(!!screenRef.current && (document.fullscreenElement ?? document.webkitFullscreenElement) === screenRef.current)
    document.addEventListener('fullscreenchange', onChange)
    document.addEventListener('webkitfullscreenchange', onChange)
    return () => {
      document.removeEventListener('fullscreenchange', onChange)
      document.removeEventListener('webkitfullscreenchange', onChange)
    }
  }, [])
  useEffect(() => {
    if (!full) return undefined
    setAwake(true)
    let timer = setTimeout(() => setAwake(false), 2500)
    const wake = () => {
      setAwake(true)
      clearTimeout(timer)
      timer = setTimeout(() => setAwake(false), 2500)
    }
    const el = screenRef.current
    el?.addEventListener('pointermove', wake)
    el?.addEventListener('pointerdown', wake)
    return () => {
      clearTimeout(timer)
      el?.removeEventListener('pointermove', wake)
      el?.removeEventListener('pointerdown', wake)
    }
  }, [full])
  // desligaram o telão com você em tela cheia: sai da tela cheia
  useEffect(() => {
    if (!video && (document.fullscreenElement ?? document.webkitFullscreenElement) === screenRef.current) {
      ;(document.exitFullscreen ?? document.webkitExitFullscreen)?.call(document)
    }
  }, [video])
  // modo cinema aberto: a caixa da sala sobe por cima do resto da página (menu, barra do celular, avisos)
  useEffect(() => {
    if (!pseudo) return undefined
    document.body.classList.add('cine-open')
    return () => document.body.classList.remove('cine-open')
  }, [pseudo])
  // Esc no modo cinema: levanta da poltrona (e o vídeo volta para a parede)
  useEffect(() => {
    if (!pseudo) return undefined
    const onKey = (event) => {
      if (event.key !== 'Escape' || event.target.closest?.('input, textarea, select')) return
      if (document.fullscreenElement ?? document.webkitFullscreenElement) return // primeiro sai da tela cheia do navegador
      onCinemaClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pseudo, onCinemaClose])

  // Esc fecha a tela ampliada
  useEffect(() => {
    if (!zoom) return undefined
    const onKey = (event) => event.key === 'Escape' && setZoom(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zoom])

  if (!video || !rect) return null

  function listen() {
    if (!volumeRef.current) changeVolume(70)
    else applyVolume(volumeRef.current)
    const player = playerRef.current
    if (player) {
      player.seekTo(targetTime(videoRef.current), true)
      if (!isPaused(videoRef.current)) player.playVideo()
    }
    liveVideoRef.current?.play().then(() => setBlocked(false), () => {})
  }
  function changeVolume(value) {
    const next = Math.min(100, Math.max(0, Math.round(value)))
    setVolume(next)
    applyVolume(next)
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
  function toggleFull() {
    const el = screenRef.current
    if (!el) return
    if (realFull) {
      ;(document.exitFullscreen ?? document.webkitExitFullscreen)?.call(document)
      return
    }
    const request = el.requestFullscreen ?? el.webkitRequestFullscreen
    if (request) {
      Promise.resolve(request.call(el)).catch(() => !pseudo && setZoom(true))
      return
    }
    if (pseudo) return // iPhone no modo cinema: já ocupa a janela toda
    // iPhone: só o <video> entra em tela cheia; no YouTube, amplia na sala
    if (isLive && liveVideoRef.current?.webkitEnterFullscreen) liveVideoRef.current.webkitEnterFullscreen()
    else setZoom(true)
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
  const style = pseudo ? undefined : { left: `${place.left}%`, top: `${place.top}%`, width: `${place.width}%`, height: `${place.height}%` }
  const icon = volume === 0 ? '🔇' : volume < 40 ? '🔈' : volume < 75 ? '🔉' : '🔊'
  const hostName = (video.name ?? 'alguém').split(' ')[0]
  const paused = !!ytId && isPaused(video)
  const shownTitle = isLive ? `📡 Ao vivo: ${video.name ?? 'transmissão'}` : title || 'Tocando no telão'

  let message = null
  if (failed) message = ['Não deu para tocar esse vídeo aqui 😕', 'Ele pode estar bloqueado para tocar fora do YouTube.']
  else if (isLive && liveHost !== user?.id && !liveStream) {
    if (entry?.status === 'full') message = [`A live de ${hostName} está lotada 😕`, 'Espere alguém sair para assistir aqui.']
    else if (entry?.status === 'error') message = [`Não deu para conectar na live de ${hostName} 😕`, 'Desligue e ligue o telão de novo.']
    else message = [`Conectando na live de ${hostName}…`]
  }

  const remote = (extra = '') => (
    <div className={`yt-remote${extra}`} role="group" aria-label="Controle do telão">
      <span className="yt-live" aria-hidden="true" />
      <span className="yt-title" title={shownTitle}>
        {paused ? `⏸ Pausado por ${video.pausedBy ?? 'alguém'}` : shownTitle}
        {!paused && video.by ? ` · DJ ${video.by}` : ''}
      </span>
      {ytId && onControl && (
        <button type="button" onClick={togglePause} aria-label={paused ? 'Continuar para todo mundo' : 'Pausar para todo mundo'} title={paused ? 'Continuar (para todo mundo)' : 'Pausar (para todo mundo)'}>
          {paused ? '▶' : '⏸'}
        </button>
      )}
      {ytId && onControl && dur > 0 && (
        <span className="yt-seek">
          <span className="yt-time">{clock(drag ?? pos)}</span>
          <input
            type="range"
            className="yt-volume yt-seek-bar"
            min="0"
            max={Math.floor(dur)}
            step="1"
            value={Math.floor(drag ?? pos)}
            onChange={(event) => setDrag(Number(event.target.value))}
            onPointerUp={commitDrag}
            onKeyUp={commitDrag}
            onBlur={commitDrag}
            aria-label="Pular para um ponto do vídeo (para todo mundo)"
            title="Pular para um ponto (para todo mundo)"
            style={{ '--fill': `${((drag ?? pos) / dur) * 100}%` }}
          />
          <span className="yt-time">{clock(dur)}</span>
        </span>
      )}
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
      {!full && (
        <button type="button" onClick={() => setZoom(!zoom)} aria-label={zoom ? 'Voltar para a parede' : 'Ampliar na sala'} title={zoom ? 'Voltar para a parede' : 'Ampliar na sala (só para você)'}>
          {zoom ? '🗗' : '🔍'}
        </button>
      )}
      <button type="button" onClick={toggleFull} aria-label={realFull ? 'Sair da tela cheia' : 'Tela cheia'} title={realFull ? 'Sair da tela cheia' : 'Tela cheia (só para você)'}>
        ⛶
      </button>
      {pseudo && (
        <button type="button" className="yt-cinema-btn" onClick={onCinemaClose} title="Levantar da poltrona (Esc)">
          Levantar
        </button>
      )}
      <button type="button" onClick={onStop} title="Desligar o telão para todo mundo" aria-label="Desligar o telão para todo mundo">
        ⏻
      </button>
    </div>
  )

  return (
    <>
      {/* a imagem fica ATRÁS da sala (o canvas abre um "buraco" na tela da TV): quem passa na frente aparece por cima */}
      <div ref={screenRef} className={`yt-screen${zoom ? ' is-zoom' : ''}${full ? ' is-full' : ''}${full && !awake ? ' is-sleep' : ''}${pseudo ? ' has-audience is-pseudo' : ''}`} style={style}>
        <div className="yt-frame">
          <div ref={boxRef} className="yt-player" />
          {isLive && <video ref={liveVideoRef} className="yt-live-video" autoPlay playsInline />}
          {full && message && <p className="yt-fail">{message.map((line, index) => <span key={index}>{line}</span>)}</p>}
          {full && blocked && !message && (
            <button type="button" className="yt-listen" onClick={listen}>
              ▶ Ouvir com a turma
            </button>
          )}
        </div>
        {pseudo && (
          <CinemaAudience getPeople={audience} meId={user?.id} onReact={onReact} onChat={onChat} cine={cine} mood={mood} title={shownTitle} />
        )}
        {full && remote(' yt-remote-full')}
      </div>
      {/* camada de cima, transparente: tocar na tela amplia, e o controle remoto aparece embaixo */}
      <div className={`yt-tv${zoom ? ' is-zoom' : ''}`} style={style}>
        <button
          type="button"
          className="yt-hit"
          onClick={() => setZoom(!zoom)}
          onDoubleClick={toggleFull}
          aria-label={zoom ? 'Voltar a TV para a parede' : 'Ampliar a TV (só para você)'}
          title={zoom ? 'Voltar para a parede' : 'Ampliar (duplo clique: tela cheia)'}
        />
        {message && (
          <p className="yt-fail" role="status">
            {message.map((line, index) => (
              <span key={index}>{line}</span>
            ))}
          </p>
        )}
        {blocked && !message && (
          <button type="button" className="yt-listen" onClick={listen}>
            ▶ Ouvir com a turma
          </button>
        )}
        {!full && remote()}
      </div>
      {/* fim da sessão: créditos subindo para todo mundo na sala (sentado ou em pé), depois o gráfico */}
      {audience && mood.phase === 'credits' && (
        <div className={`cine-credits-wrap${pseudo ? ' is-inside' : ''}`}>
          <CinemaCredits crew={mood.crew} title={shownTitle} onDone={mood.creditsDone} />
        </div>
      )}
      {/* quem está em pé na sala também vê o gráfico da sessão quando o vídeo acaba */}
      {!pseudo && mood.chartOpen && (
        <div className="cine-chart-pop">
          <MoodChart timeline={mood.timeline} title={shownTitle} onClose={() => mood.setChartOpen(false)} />
        </div>
      )}
    </>
  )
}
