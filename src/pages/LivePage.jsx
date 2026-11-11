import { useEffect, useRef, useState } from 'react'
import Avatar from '../components/Avatar'
import FormModal from '../components/FormModal'
import LiveChat from '../components/LiveChat'
import LiveRanking from '../components/LiveRanking'
import { useAuth } from '../contexts/AuthContext'
import { useLive } from '../contexts/LiveContext'
import { usePhone } from '../hooks/useMediaQuery'
import { formatClock } from '../lib/format'
import { DEFAULT_PRESET, MAX_VIEWERS, SEND_PRESETS } from '../lib/live'

// startMuted: o som começa desligado (a pessoa liga no controle do vídeo). controls=false é a prévia da própria tela.
function VideoBox({ stream, startMuted = false, controls = true, phone = false }) {
  const ref = useRef(null)
  const stageRef = useRef(null)
  const [ratio, setRatio] = useState(null) // proporção real do vídeo, para o quadro ter o mesmo formato (sem faixas pretas)
  const [muted, setMuted] = useState(startMuted)
  useEffect(() => {
    const video = ref.current
    if (!video) return undefined
    video.srcObject = stream ?? null
    const update = () => {
      if (video.videoWidth && video.videoHeight) setRatio(video.videoWidth / video.videoHeight)
    }
    // Ao vivo não se pausa: se algo pausar o vídeo (ex.: o navegador), ele volta sozinho.
    const keepPlaying = () => {
      if (stream) video.play().catch(() => {})
    }
    video.addEventListener('loadedmetadata', update)
    video.addEventListener('resize', update)
    video.addEventListener('pause', keepPlaying)
    update()
    // se o navegador bloquear o som automático, começa sem som (a pessoa liga no botão)
    video.play().catch(() => {
      video.muted = true
      setMuted(true)
      video.play().catch(() => {})
    })
    return () => {
      video.removeEventListener('loadedmetadata', update)
      video.removeEventListener('resize', update)
      video.removeEventListener('pause', keepPlaying)
    }
  }, [stream])
  useEffect(() => {
    if (ref.current) ref.current.muted = muted
  }, [muted])
  function fullscreen() {
    const video = ref.current
    if (document.fullscreenElement) return document.exitFullscreen()
    if (stageRef.current?.requestFullscreen) return stageRef.current.requestFullscreen()
    return video?.webkitEnterFullscreen?.() // iPhone
  }
  return (
    <div ref={stageRef} className={`live-stage${phone ? ' is-phone' : ''}`} style={ratio && !phone ? { aspectRatio: ratio } : undefined}>
      <video ref={ref} autoPlay playsInline muted={startMuted} controls={controls && !phone} controlsList="nodownload noremoteplayback" disablePictureInPicture={false} />
      {phone && (
        <>
          {muted && (
            <button type="button" className="lw-square lw-sound" onClick={() => setMuted(false)} aria-label="Ativar som">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true">
                <path d="M4 9v6h4l5 4V5L8 9zM17 9l4 6M21 9l-4 6" />
              </svg>
            </button>
          )}
          <button type="button" className="lw-square lw-full" onClick={fullscreen} aria-label="Tela cheia">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true">
              <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
            </svg>
          </button>
        </>
      )}
    </div>
  )
}

// Relógio de quanto tempo a transmissão está no ar (conta desde o início, igual para todo mundo).
function Clock({ since }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  if (!since) return null
  return <time className="live-clock">{formatClock(now - since)}</time>
}

function Faces({ viewers }) {
  if (viewers.length === 0) return <p className="muted">Ninguém assistindo ainda.</p>
  return (
    <ul className="live-faces">
      {viewers.map((v) => (
        <li key={v.userId} title={v.name}>
          <Avatar name={v.name} src={v.avatarUrl} size={34} />
          <span>{v.name}</span>
        </li>
      ))}
    </ul>
  )
}

const MODES = [
  { id: 'tab', title: 'Uma aba do Chrome', hint: 'Apenas a aba da internet' },
  { id: 'window', title: 'Uma janela (VLC, jogo...)', hint: 'Apenas janela selecionada' },
  { id: 'screen', title: 'Tela inteira', hint: 'Som do PC todo' },
]

const STATUS_TEXT = {
  connecting: 'Conectando…',
  full: `A sala está cheia (máximo de ${MAX_VIEWERS} pessoas).`,
  ended: 'A transmissão terminou.',
  error: 'Não foi possível conectar à transmissão.',
}

// Mensagem mais útil conforme o motivo da falha (o motivo também fica salvo para o admin).
const REASON_TEXT = {
  'timeout-no-offer': 'Não consegui falar com quem transmite. Atualize a página e tente de novo.',
  'timeout-after-offer': 'Sua rede está bloqueando a conexão direta. Tente sem VPN ou trocando de Wi-Fi para dados móveis.',
  'ice-failed': 'Sua rede está bloqueando a conexão direta. Tente sem VPN ou trocando de Wi-Fi para dados móveis.',
}

// Assistir no celular: tela cheia com o vídeo no alto, a barra de quem assiste e o chat embaixo.
function WatchScreen({ item, name, since, viewers, onBack }) {
  const [chatOpen, setChatOpen] = useState(true)
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])
  const waiting = item.status !== 'watching'
  return (
    <div className="lw-screen" role="region" aria-label={`Transmissão de ${name}`}>
      <header className="lw-head">
        <button type="button" className="lw-back" onClick={onBack} aria-label="Sair da transmissão">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <span className="lw-title">
          <span className="lw-mark" aria-hidden="true" />
          Transmissão de {name}
        </span>
        <span className="lw-clock">
          <Clock since={since} />
        </span>
      </header>

      <div className={`lw-video${chatOpen ? '' : ' is-tall'}`}>
        {!waiting || item.status === 'connecting' ? (
          <VideoBox stream={item.stream} startMuted={false} phone />
        ) : null}
        {waiting && (
          <div className="lw-status" role="status">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true">
              <circle cx="12" cy="12" r="2.5" fill="currentColor" />
              <path d="M7.5 7.5a6.4 6.4 0 0 0 0 9M16.5 7.5a6.4 6.4 0 0 1 0 9M4.5 4.5a10.6 10.6 0 0 0 0 15M19.5 4.5a10.6 10.6 0 0 1 0 15" />
            </svg>
            {(item.status === 'error' && REASON_TEXT[item.reason]) || STATUS_TEXT[item.status]}
          </div>
        )}
      </div>

      <div className="lw-bar">
        <div className="lw-faces" aria-hidden="true">
          {viewers.slice(0, 3).map((viewer) => (
            <span key={viewer.userId} className="lw-face">
              <Avatar name={viewer.name} src={viewer.avatarUrl} size={32} />
            </span>
          ))}
        </div>
        <span className="lw-count">{viewers.length} assistindo</span>
        <button type="button" className="lw-chat-toggle" aria-expanded={chatOpen} onClick={() => setChatOpen((value) => !value)}>
          Chat
          <svg className={chatOpen ? '' : 'is-flipped'} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>

      <div className={`lw-chat${chatOpen ? '' : ' is-closed'}`}>
        <LiveChat screen />
      </div>
    </div>
  )
}

export default function LivePage() {
  const { user } = useAuth()
  const live = useLive()
  const phone = usePhone()
  const { hosts, viewersOf, hosting, localStream, watching, error, hasAudio, sendStats, canBroadcast } = live
  const [mode, setMode] = useState('tab')
  const [preset, setPreset] = useState(DEFAULT_PRESET)
  const [showStart, setShowStart] = useState(false)
  const [pinned, setPinned] = useState(null) // transmissão fixada em tamanho grande ('me' = a sua)
  const [chatHidden, setChatHidden] = useState(false) // chat minimizado: a live ocupa a largura toda
  const [minimized, setMinimized] = useState(false) // a sua prévia fica só uma barrinha

  useEffect(() => {
    if (!hosting) setMinimized(false)
  }, [hosting])

  const myViewers = viewersOf(user.id)
  const others = hosts.filter((meta) => meta.userId !== user.id)
  const watchingIds = new Set(watching.map((item) => item.hostId))
  const showOwnTile = hosting && !minimized
  const tileCount = (showOwnTile ? 1 : 0) + watching.length
  const tileIds = [...(showOwnTile ? ['me'] : []), ...watching.map((item) => item.hostId)]
  const pinnedId = tileCount > 1 && tileIds.includes(pinned) ? pinned : null // some sozinho se a live acabar
  const togglePin = (id) => setPinned(pinnedId === id ? null : id)
  const tileClass = (id) => (pinnedId === id ? 'card live-tile is-pinned' : 'card live-tile')
  const pinButton = (id) =>
    tileCount > 1 ? (
      <button type="button" className="btn" aria-pressed={pinnedId === id} onClick={() => togglePin(id)}>
        {pinnedId === id ? 'Desafixar' : 'Fixar'}
      </button>
    ) : null
  const hostName = (id) => hosts.find((meta) => meta.userId === id)?.name ?? 'Transmissão'
  const sinceOf = (id) => hosts.find((meta) => meta.userId === id)?.since ?? null
  const hostAvatar = (id) => hosts.find((meta) => meta.userId === id)?.avatarUrl ?? null
  // o chat só aparece para quem está assistindo ou transmitindo (clicou em Assistir ou iniciou a live)
  const chatAvailable = hosts.length > 0 && (hosting || watching.length > 0)
  // sem live no ar, o chat reinicia: na próxima transmissão ele volta aberto
  useEffect(() => {
    if (!chatAvailable) setChatHidden(false)
  }, [chatAvailable])
  const chatOn = chatAvailable && !chatHidden // o chat só abre quando tem transmissão no ar

  // Ao fechar o chat, o vídeo mantém a mesma altura e só se estica para o lado (não fica gigante).
  const layoutRef = useRef(null)
  const [lockedHeight, setLockedHeight] = useState(0)
  const sideChat = chatOn && hosts.length === 1
  useEffect(() => {
    const stage = layoutRef.current?.querySelector('.live-stage')
    if (!sideChat || !stage || typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(() => {
      if (stage.offsetHeight > 0) setLockedHeight(stage.offsetHeight)
    })
    observer.observe(stage)
    return () => observer.disconnect()
  }, [sideChat, watching.length])
  const keepHeight = hosts.length === 1 && chatAvailable && chatHidden && lockedHeight > 0

  // No celular, quem está assistindo vê a tela cheia de assistir (o vídeo no alto e o chat embaixo).
  if (phone && !hosting && watching.length > 0) {
    const first = watching[0]
    return (
      <WatchScreen
        item={first}
        name={hostName(first.hostId)}
        since={sinceOf(first.hostId)}
        viewers={viewersOf(first.hostId)}
        onBack={() => live.unwatch(first.hostId)}
      />
    )
  }

  return (
    <div className="stack live-page">
      <header className="page-head">
        <h1>Ao vivo</h1>
        {canBroadcast && !hosting && (
          <button type="button" className="btn btn-new" aria-haspopup="dialog" onClick={() => setShowStart(true)}>
            Iniciar transmissão
          </button>
        )}
      </header>

      {others.length > 0 && (
        <section className="card live-strip" aria-label="Transmissões no ar">
          <h2 className="live-strip-title">
            <span className="live-dot live-dot-static" aria-hidden="true" /> Ao vivo agora
          </h2>
          <div className="live-strip-list">
            {others.map((meta) => (
              <div key={meta.userId} className="live-chip">
                <span className="live-chip-avatar">
                  <Avatar name={meta.name} src={meta.avatarUrl} size={52} />
                  <span className="live-chip-badge">AO VIVO</span>
                </span>
                <div className="live-chip-info">
                  <strong>{meta.name}</strong>
                  <span className="muted">
                    {viewersOf(meta.userId).length} assistindo · há <Clock since={meta.since} />
                  </span>
                </div>
                {watchingIds.has(meta.userId) ? (
                  <span className="live-chip-watching">Assistindo</span>
                ) : (
                  <button type="button" className="btn btn-primary live-chip-btn" onClick={() => live.watch(meta.userId)}>
                    Assistir
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <div
        ref={layoutRef}
        className={`live-layout${chatOn && hosts.length === 1 ? ' has-side-chat' : ''}${keepHeight ? ' keep-height' : ''}`}
        style={keepHeight ? { '--live-lock': `${lockedHeight}px` } : undefined}
      >
        <div className="stack live-main">
          {chatAvailable && chatHidden && (
            <div className="live-chat-show">
              <button type="button" className="btn" onClick={() => setChatHidden(false)}>
                Mostrar chat
              </button>
            </div>
          )}
          {hosting && minimized && (
            <section className="card live-mini" aria-label="Sua transmissão (minimizada)">
              <span className="live-tag">
                <span className="live-dot live-dot-static" aria-hidden="true" /> VOCÊ ESTÁ AO VIVO
              </span>
              <span className="muted">
                {myViewers.length} assistindo · no ar há <Clock since={sinceOf(user.id)} />
              </span>
              <div className="live-mini-actions">
                <button type="button" className="btn" onClick={() => setMinimized(false)}>
                  Mostrar
                </button>
                <button type="button" className="btn btn-danger" onClick={live.stopLive}>
                  Parar transmissão
                </button>
              </div>
            </section>
          )}

          {tileCount > 0 && (
            <section
              className="live-grid"
              data-count={tileCount}
              data-pinned={pinnedId ? 'true' : undefined}
              aria-label="Transmissões"
            >
              {showOwnTile && (
                <article className={tileClass('me')}>
                  <div className="live-top">
                    <span className="live-tag">
                      <span className="live-dot live-dot-static" aria-hidden="true" /> VOCÊ ESTÁ AO VIVO
                    </span>
                    <div className="live-mini-actions">
                      {pinButton('me')}
                      <button type="button" className="btn" onClick={() => setMinimized(true)}>
                        Minimizar
                      </button>
                      <button type="button" className="btn btn-danger" onClick={live.stopLive}>
                        Parar transmissão
                      </button>
                    </div>
                  </div>
                  <VideoBox stream={localStream} startMuted controls={false} />
                  {!hasAudio && (
                    <p className="live-warn">Sem áudio: ao compartilhar, marque “Compartilhar áudio da guia/sistema”.</p>
                  )}
                  <p className="muted">
                    {myViewers.length} assistindo · no ar há <Clock since={sinceOf(user.id)} />
                    {sendStats?.w > 0 && ` · enviando ${sendStats.w}×${sendStats.h} a ${sendStats.fps} fps`}
                  </p>
                  {sendStats?.unlimited && sendStats.limit !== 'none' && (
                    <p className="live-warn" role="status">
                      {sendStats.limit === 'cpu'
                        ? 'O processador do seu computador está no limite: a imagem mantém a nitidez, mas os quadros por segundo caem.'
                        : 'A internet de envio está no limite: a imagem pode perder qualidade.'}
                    </p>
                  )}
                  {sendStats?.adapt > 0 && (
                    <p className="live-warn" role="status">
                      {sendStats.limit === 'bandwidth'
                        ? 'Sua internet de envio está no limite: a imagem foi reduzida para não travar.'
                        : 'Seu computador está no limite: a imagem foi reduzida para não travar.'}
                    </p>
                  )}
                  <Faces viewers={myViewers} />
                </article>
              )}

              {watching.map((item, index) => (
                <article key={item.hostId} className={tileClass(item.hostId)}>
                  <div className="live-top">
                    <span className="live-tag">
                      <span className="live-dot live-dot-static" aria-hidden="true" /> {hostName(item.hostId)}
                    </span>
                    <div className="live-mini-actions">
                      {pinButton(item.hostId)}
                      <button type="button" className="btn" onClick={() => live.unwatch(item.hostId)}>
                        {item.status === 'watching' || item.status === 'connecting' ? 'Sair' : 'Fechar'}
                      </button>
                    </div>
                  </div>
                  {STATUS_TEXT[item.status] && (
                    <p className={item.status === 'connecting' ? 'muted' : 'live-warn'} role="status">
                      {(item.status === 'error' && REASON_TEXT[item.reason]) || STATUS_TEXT[item.status]}
                    </p>
                  )}
                  {/* só a primeira transmissão toca o som; nas outras, o som liga no controle do vídeo */}
                  {(item.status === 'connecting' || item.status === 'watching') && (
                    <VideoBox stream={item.stream} startMuted={index > 0} />
                  )}
                  {item.status === 'watching' && (
                    <p className="muted">
                      {viewersOf(item.hostId).length} assistindo · no ar há <Clock since={sinceOf(item.hostId)} />
                    </p>
                  )}
                </article>
              ))}
            </section>
          )}

          {error && (
            <p className="live-warn" role="status">
              {error.message}
            </p>
          )}

          {!hosting && others.length === 0 && (
            <section className="card panel live-idle">
              <h2>
                <span className="desk-only">Ninguém está transmitindo</span>
                <span className="phone-only">Ninguém ao vivo agora</span>
              </h2>
              <p className="muted phone-only-block">Para transmitir, abra o site no computador.</p>
              {!canBroadcast && (
                <p className="muted desk-only-block">
                  Para transmitir, use o Chrome ou Edge em um computador. No celular dá para assistir.
                </p>
              )}
            </section>
          )}

          {hosts.length === 0 && <LiveRanking />}

          {chatOn && hosts.length !== 1 && <LiveChat onHide={() => setChatHidden(true)} />}
        </div>
        {chatOn && hosts.length === 1 && (
          <div className="live-chat-side">
            <LiveChat onHide={() => setChatHidden(true)} />
          </div>
        )}
      </div>

      {showStart && (
        <FormModal label="Iniciar transmissão" onClose={() => setShowStart(false)}>
          <form
            className="form"
            onSubmit={(event) => {
              event.preventDefault()
              setShowStart(false)
              live.startLive({ mode, preset })
            }}
          >
            <h2>Iniciar transmissão</h2>
            <fieldset className="live-modes">
              <legend>O que transmitir</legend>
              {MODES.map((item) => (
                <label key={item.id} className="live-check">
                  <input type="radio" name="live-mode" checked={mode === item.id} onChange={() => setMode(item.id)} />
                  <span>
                    <strong>{item.title}</strong> <small className="muted">{item.hint}</small>
                  </span>
                </label>
              ))}
            </fieldset>
            <fieldset className="live-modes">
              <legend>Qualidade do envio</legend>
              {SEND_PRESETS.map((item) => (
                <label key={item.id} className="live-check">
                  <input type="radio" name="live-preset" checked={preset === item.id} onChange={() => setPreset(item.id)} />
                  <span>
                    <strong>{item.title}</strong> <small className="muted">{item.hint}</small>
                  </span>
                </label>
              ))}
            </fieldset>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setShowStart(false)}>
                Cancelar
              </button>
              <span className="spacer" />
              <button type="submit" className="btn btn-primary">
                Iniciar
              </button>
            </div>
          </form>
        </FormModal>
      )}
    </div>
  )
}
