import { useEffect, useRef, useState } from 'react'
import Avatar from '../components/Avatar'
import FormModal from '../components/FormModal'
import LiveChat from '../components/LiveChat'
import { useAuth } from '../contexts/AuthContext'
import { useLive } from '../contexts/LiveContext'
import { DEFAULT_PRESET, MAX_VIEWERS, SEND_PRESETS } from '../lib/live'

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

export default function LivePage() {
  const { user } = useAuth()
  const live = useLive()
  const { hosts, viewersOf, hosting, localStream, watching, error, hasAudio, sendStats, canBroadcast } = live
  const [mode, setMode] = useState('tab')
  const [preset, setPreset] = useState(DEFAULT_PRESET)
  const [showStart, setShowStart] = useState(false)
  const [minimized, setMinimized] = useState(false) // a sua prévia fica só uma barrinha

  useEffect(() => {
    if (!hosting) setMinimized(false)
  }, [hosting])

  const myViewers = viewersOf(user.id)
  const others = hosts.filter((meta) => meta.userId !== user.id)
  const watchingIds = new Set(watching.map((item) => item.hostId))
  const showOwnTile = hosting && !minimized
  const tileCount = (showOwnTile ? 1 : 0) + watching.length
  const hostName = (id) => hosts.find((meta) => meta.userId === id)?.name ?? 'Transmissão'
  const hostAvatar = (id) => hosts.find((meta) => meta.userId === id)?.avatarUrl ?? null
  const chatOn = hosts.length > 0 // o chat só abre quando tem transmissão no ar

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

      <div className="live-layout">
        <div className="stack live-main">
          {hosting && minimized && (
            <section className="card live-mini" aria-label="Sua transmissão (minimizada)">
              <span className="live-tag">
                <span className="live-dot live-dot-static" aria-hidden="true" /> VOCÊ ESTÁ AO VIVO
              </span>
              <span className="muted">{myViewers.length} assistindo</span>
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
            <section className="live-grid" data-count={tileCount} aria-label="Transmissões">
              {showOwnTile && (
                <article className="card live-tile">
                  <div className="live-top">
                    <span className="live-tag">
                      <span className="live-dot live-dot-static" aria-hidden="true" /> VOCÊ ESTÁ AO VIVO
                    </span>
                    <div className="live-mini-actions">
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
                    {myViewers.length} assistindo
                    {sendStats?.w > 0 && ` · enviando ${sendStats.w}×${sendStats.h} a ${sendStats.fps} fps`}
                  </p>
                  {sendStats?.unlimited && sendStats.limit === 'cpu' && (
                    <p className="live-warn" role="status">
                      O processador do seu computador está no limite. A qualidade foi mantida no máximo.
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

          {!hosting && others.length === 0 && (
            <section className="card panel live-idle">
              <h2>Ninguém está transmitindo</h2>
              {!canBroadcast && (
                <p className="muted">
                  Para transmitir, use o Chrome ou Edge em um computador. No celular dá para assistir.
                </p>
              )}
            </section>
          )}

          {chatOn && <LiveChat />}
        </div>
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
