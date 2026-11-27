import { useState } from 'react'
import { useLive } from '../../contexts/LiveContext'
import { MAX_VIEWERS } from '../../lib/live'
import { useAuth } from '../../contexts/AuthContext'
import { youTubeId } from '../YouTubeScreen'

// Cabine do telão do Cine Planeta (Turma 2.0): igual ao DJ do Cine turma.
// Cola um link do YouTube (toca para todo mundo do cinema ao mesmo tempo) ou passa uma transmissão da página Ao vivo.
export default function Turma2Telao({ video, name, onPlay, onClose }) {
  const live = useLive()
  const { user } = useAuth()
  const [tab, setTab] = useState('yt')
  const [link, setLink] = useState('')
  const [error, setError] = useState('')
  const by = String(name ?? '').split(' ')[0]
  const hosts = live?.hosts ?? []
  const off = video && (
    <div className="room-panel-actions">
      <button type="button" className="btn btn-ghost" onClick={() => { onPlay(null); onClose() }}>
        ⏻ Desligar o telão
      </button>
    </div>
  )
  return (
    <div className="room-panel t2-telao" role="dialog" aria-label="Cabine do telão" onKeyDown={(event) => event.stopPropagation()}>
      <div className="room-panel-head">
        <strong>Cabine do telão</strong>
        <button type="button" className="room-panel-close" aria-label="Fechar" onClick={onClose}>
          ×
        </button>
      </div>
      <div className="room-dj">
        <div className="room-dj-tabs" role="tablist" aria-label="O que passar no telão">
          <button type="button" role="tab" aria-selected={tab === 'yt'} className={tab === 'yt' ? 'is-on' : ''} onClick={() => setTab('yt')}>
            ▶ YouTube
          </button>
          <button type="button" role="tab" aria-selected={tab === 'live'} className={tab === 'live' ? 'is-on' : ''} onClick={() => setTab('live')}>
            📡 Ao vivo{hosts.length > 0 ? ` (${hosts.length})` : ''}
          </button>
        </div>
        {tab === 'yt' ? (
          <form
            className="room-dj-form"
            onSubmit={(event) => {
              event.preventDefault()
              const id = youTubeId(link)
              if (!id) {
                setError('Esse link não parece do YouTube. Cole o link do vídeo (youtube.com ou youtu.be).')
                return
              }
              onPlay({ type: 'yt', id, at: Date.now(), by })
              onClose()
            }}
          >
            <p>Cole o link de um vídeo do YouTube e ele toca no telão para todo mundo que está no cinema, ao mesmo tempo. Sente numa poltrona para assistir em tela grande com a plateia.</p>
            <input
              type="url"
              inputMode="url"
              placeholder="https://youtu.be/..."
              value={link}
              autoFocus
              onChange={(event) => {
                setLink(event.target.value)
                if (error) setError('')
              }}
              aria-invalid={!!error}
            />
            {error && <p className="room-dj-error">{error}</p>}
            <div className="room-panel-actions">
              <button type="submit" className="btn btn-primary">
                ▶ Tocar no telão
              </button>
              {video && (
                <button type="button" className="btn btn-ghost" onClick={() => { onPlay(null); onClose() }}>
                  ⏻ Desligar
                </button>
              )}
            </div>
          </form>
        ) : (
          <div className="room-dj-form">
            {hosts.length === 0 ? (
              <p>
                Ninguém está ao vivo agora. Comece uma transmissão na página <a className="room-dj-link" href="/ao-vivo">Ao vivo</a> e depois passe ela aqui no telão.
              </p>
            ) : (
              <>
                <p>Escolha uma transmissão para passar no telão. Todo mundo no cinema assiste junto, em tempo real.</p>
                <ul className="room-dj-lives">
                  {hosts.map((meta) => {
                    const onTv = video?.type === 'live' && video.host === meta.userId
                    return (
                      <li key={meta.userId}>
                        <span className="room-dj-live-dot" aria-hidden="true" />
                        <span className="room-dj-live-name">
                          {meta.name ?? 'Alguém'}
                          {meta.userId === user?.id ? ' (você)' : ''}
                        </span>
                        {onTv ? (
                          <span className="room-dj-live-on">No telão</span>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => {
                              onPlay({ type: 'live', host: meta.userId, name: meta.name ?? 'Alguém', by })
                              onClose()
                            }}
                          >
                            📡 Passar
                          </button>
                        )}
                      </li>
                    )
                  })}
                </ul>
                <p className="room-dj-note">Cada pessoa no cinema conta como espectador da live (máximo de {MAX_VIEWERS}).</p>
              </>
            )}
            {off}
          </div>
        )}
      </div>
    </div>
  )
}
