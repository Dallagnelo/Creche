import { useEffect, useRef, useState } from 'react'
import Avatar from '../components/Avatar'
import { useAuth } from '../contexts/AuthContext'
import { useLive } from '../contexts/LiveContext'
import { MAX_VIEWERS } from '../lib/live'

function VideoBox({ stream, muted, children }) {
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream ?? null
  }, [stream])
  return (
    <div className="live-stage">
      <video ref={ref} autoPlay playsInline muted={muted} controls={!muted} />
      {children}
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

const MESSAGES = {
  full: `A sala está cheia (máximo de ${MAX_VIEWERS} pessoas).`,
  ended: 'A transmissão terminou.',
  error: 'Não foi possível conectar à transmissão.',
}

export default function LivePage() {
  const { user } = useAuth()
  const live = useLive()
  const { host, viewers, role, stream, status, error, hasAudio, canBroadcast, quality } = live
  const isMe = host?.userId === user?.id
  const [mode, setMode] = useState('tab')

  return (
    <div className="stack live-page">
      <header className="page-head">
        <h1>Ao vivo</h1>
      </header>

      {role === 'host' && (
        <section className="card panel">
          <div className="live-top">
            <span className="live-tag">
              <span className="live-dot live-dot-static" aria-hidden="true" /> VOCÊ ESTÁ AO VIVO
            </span>
            <button type="button" className="btn btn-danger-ghost" onClick={live.stopLive}>
              Parar transmissão
            </button>
          </div>
          <VideoBox stream={stream} muted />
          {!hasAudio && (
            <p className="live-warn">
              Sem áudio: ao compartilhar, marque “Compartilhar áudio da guia/sistema”.
            </p>
          )}
          <p className="muted">
            {viewers.length} assistindo · qualidade {quality.label}
          </p>
          <Faces viewers={viewers} />
          {error && <p className="live-warn">{error}</p>}
        </section>
      )}

      {role === 'viewer' && (
        <section className="card panel">
          <div className="live-top">
            <span className="live-tag">
              <span className="live-dot live-dot-static" aria-hidden="true" /> {host?.name ?? 'Transmissão'}
            </span>
            <button type="button" className="btn" onClick={live.leave}>
              Sair
            </button>
          </div>
          {status === 'connecting' && <p className="muted">Conectando…</p>}
          <VideoBox stream={stream} muted={false} />
          <Faces viewers={viewers} />
        </section>
      )}

      {role === 'idle' && (
        <section className="card panel live-idle">
          {MESSAGES[status] && (
            <p className="live-warn" role="status">
              {MESSAGES[status]} {error && status === 'error' ? error : ''}
            </p>
          )}
          {host && !isMe ? (
            <>
              <Avatar name={host.name} src={host.avatarUrl} size={64} />
              <h2>{host.name} está ao vivo</h2>
              <p className="muted">{viewers.length} assistindo</p>
              <button type="button" className="btn btn-primary" onClick={live.join}>
                Assistir
              </button>
            </>
          ) : (
            <>
              <h2>Ninguém está transmitindo</h2>
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
              <ul className="live-tips muted">
                
              </ul>
            </>
          )}
        </section>
      )}
    </div>
  )
}
