import { useEffect, useRef, useState } from 'react'
import Avatar from '../components/Avatar'
import LiveChat from '../components/LiveChat'
import { useAuth } from '../contexts/AuthContext'
import { useLive } from '../contexts/LiveContext'
import { MAX_VIEWERS } from '../lib/live'

// startMuted: o som começa desligado (a pessoa liga no controle do vídeo). controls=false é a prévia da própria tela.
function VideoBox({ stream, startMuted = false, controls = true }) {
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream ?? null
  }, [stream])
  return (
    <div className="live-stage">
      <video ref={ref} autoPlay playsInline muted={startMuted} controls={controls} />
    </div>
  )
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
  { id: 'tab', title: 'Uma aba do Chrome', hint: 'só o som da aba; o Discord não vaza' },
  { id: 'window', title: 'Uma janela (VLC, jogo...)', hint: 'só o som dessa janela; precisa do Chrome 141 ou mais novo' },
  { id: 'screen', title: 'Tela inteira', hint: 'com o som do sistema; a voz do Discord vai junto' },
]

const STATUS_TEXT = {
  connecting: 'Conectando…',
  full: `A sala está cheia (máximo de ${MAX_VIEWERS} pessoas).`,
  ended: 'A transmissão terminou.',
  error: 'Não foi possível conectar à transmissão.',
}

export default function LivePage() {
  const { user } = useAuth()
  const live = useLive()
  const { hosts, viewersOf, hosting, localStream, watching, error, hasAudio, canBroadcast, quality } = live
  const [mode, setMode] = useState('tab')

  const myViewers = viewersOf(user.id)
  const others = hosts.filter((meta) => meta.userId !== user.id)
  const watchingIds = new Set(watching.map((item) => item.hostId))
  const tileCount = (hosting ? 1 : 0) + watching.length
  const hostName = (id) => hosts.find((meta) => meta.userId === id)?.name ?? 'Transmissão'
  const hostAvatar = (id) => hosts.find((meta) => meta.userId === id)?.avatarUrl ?? null
  const chatOn = hosts.length > 0 // o chat só abre quando tem transmissão no ar

  return (
    <div className="stack live-page">
      <header className="page-head">
        <h1>Ao vivo</h1>
      </header>

      <div className={chatOn ? 'live-layout has-chat' : 'live-layout'}>
        <div className="stack live-main">
          {tileCount > 0 && (
            <section className="live-grid" data-count={tileCount} aria-label="Transmissões">
              {hosting && (
                <article className="card live-tile">
                  <div className="live-top">
                    <span className="live-tag">
                      <span className="live-dot live-dot-static" aria-hidden="true" /> VOCÊ ESTÁ AO VIVO
                    </span>
                    <button type="button" className="btn btn-danger-ghost" onClick={live.stopLive}>
                      Parar transmissão
                    </button>
                  </div>
                  <VideoBox stream={localStream} startMuted controls={false} />
                  {!hasAudio && (
                    <p className="live-warn">Sem áudio: ao compartilhar, marque “Compartilhar áudio da guia/sistema”.</p>
                  )}
                  <p className="muted">
                    {myViewers.length} assistindo · qualidade {quality.label}
                  </p>
                  <Faces viewers={myViewers} />
                </article>
              )}

              {watching.map((item, index) => (
                <article key={item.hostId} className="card live-tile">
                  <div className="live-top">
                    <span className="live-tag">
                      <span className="live-dot live-dot-static" aria-hidden="true" /> {hostName(item.hostId)}
                    </span>
                    <button type="button" className="btn" onClick={() => live.unwatch(item.hostId)}>
                      {item.status === 'watching' || item.status === 'connecting' ? 'Sair' : 'Fechar'}
                    </button>
                  </div>
                  {STATUS_TEXT[item.status] && (
                    <p className={item.status === 'connecting' ? 'muted' : 'live-warn'} role="status">
                      {STATUS_TEXT[item.status]}
                    </p>
                  )}
                  {/* só a primeira transmissão toca o som; nas outras, o som liga no controle do vídeo */}
                  {(item.status === 'connecting' || item.status === 'watching') && (
                    <VideoBox stream={item.stream} startMuted={index > 0} />
                  )}
                  {item.status === 'watching' && (
                    <p className="muted">{viewersOf(item.hostId).length} assistindo</p>
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

          {others.length > 0 && (
            <section className="card panel live-list" aria-labelledby="live-now">
              <div className="panel-head">
                <h2 id="live-now">No ar agora</h2>
              </div>
              <ul className="live-hosts">
                {others.map((meta) => (
                  <li key={meta.userId} className="live-host">
                    <Avatar name={meta.name} src={meta.avatarUrl} size={44} />
                    <div className="live-host-info">
                      <strong>{meta.name}</strong>
                      <span className="muted">{viewersOf(meta.userId).length} assistindo</span>
                    </div>
                    {watchingIds.has(meta.userId) ? (
                      <span className="muted">Assistindo</span>
                    ) : (
                      <button type="button" className="btn btn-primary" onClick={() => live.watch(meta.userId)}>
                        Assistir
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {!hosting && (
            <section className="card panel live-idle">
              <h2>{others.length > 0 ? 'Quer transmitir também?' : 'Ninguém está transmitindo'}</h2>
              {canBroadcast ? (
                <button type="button" className="btn btn-primary" onClick={() => live.startLive({ mode })}>
                  Iniciar transmissão
                </button>
              ) : (
                <p className="muted">
                  Para transmitir, use o Chrome ou Edge em um computador. No celular dá para assistir.
                </p>
              )}
              {canBroadcast && (
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
              )}
            </section>
          )}
        </div>

        {chatOn && <LiveChat />}
      </div>
    </div>
  )
}
