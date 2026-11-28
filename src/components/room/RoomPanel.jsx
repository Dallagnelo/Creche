import { youTubeId } from '../YouTubeScreen'
import { MAX_VIEWERS } from '../../lib/live'

/** Caixa de quem foi clicado (pessoa, bichinho ou móvel), com o DJ, o telão e os botões de cada um. */
export default function RoomPanel({ panel, setPanel, djTab, setDjTab, live, djLink, setDjError, stateRef, meName, setDjLink, djError, ytVideo, navRef, user }) {
  return (
    <div className="room-panel" role="status">
      <div className="room-panel-head">
        <strong>{panel.title}</strong>
        <button type="button" className="room-panel-close" aria-label="Fechar" onClick={() => setPanel(null)}>
          ×
        </button>
      </div>
      {panel.text && <p>{panel.text}</p>}
      {panel.dj && (
        <div className="room-dj">
          <div className="room-dj-tabs" role="tablist" aria-label="O que passar no telão">
            <button type="button" role="tab" aria-selected={djTab === 'yt'} className={djTab === 'yt' ? 'is-on' : ''} onClick={() => setDjTab('yt')}>
              ▶ YouTube
            </button>
            <button type="button" role="tab" aria-selected={djTab === 'live'} className={djTab === 'live' ? 'is-on' : ''} onClick={() => setDjTab('live')}>
              📡 Ao vivo{live.hosts.length > 0 ? ` (${live.hosts.length})` : ''}
            </button>
          </div>
          {djTab === 'yt' ? (
            <form
              className="room-dj-form"
              onSubmit={(event) => {
                event.preventDefault()
                const id = youTubeId(djLink)
                if (!id) {
                  setDjError('Esse link não parece do YouTube. Cole o link do vídeo (youtube.com ou youtu.be).')
                  return
                }
                stateRef.current.setYouTube?.({ type: 'yt', id, at: Date.now(), by: meName?.split(' ')[0] ?? '' })
                setDjLink('')
                setDjError('')
                setPanel(null)
              }}
            >
              <p>Cole o link de um vídeo do YouTube e ele toca no telão para todo mundo que está na sala, ao mesmo tempo.</p>
              <input
                type="url"
                inputMode="url"
                placeholder="https://youtu.be/..."
                value={djLink}
                onChange={(event) => {
                  setDjLink(event.target.value)
                  if (djError) setDjError('')
                }}
                aria-invalid={!!djError}
              />
              {djError && <p className="room-dj-error">{djError}</p>}
              <div className="room-panel-actions">
                <button type="submit" className="btn btn-primary">
                  ▶ Tocar no telão
                </button>
                {ytVideo && (
                  <button type="button" className="btn btn-ghost" onClick={() => { stateRef.current.setYouTube?.(null); setPanel(null) }}>
                    ⏻ Desligar
                  </button>
                )}
              </div>
            </form>
          ) : (
            <div className="room-dj-form">
              {live.hosts.length === 0 ? (
                <p>
                  Ninguém está ao vivo agora. Comece uma transmissão na página{' '}
                  <button type="button" className="room-dj-link" onClick={() => navRef.current('/ao-vivo')}>
                    Ao vivo
                  </button>{' '}
                  e depois passe ela aqui no telão.
                </p>
              ) : (
                <>
                  <p>Escolha uma transmissão para passar no telão. Todo mundo na sala assiste junto, em tempo real.</p>
                  <ul className="room-dj-lives">
                    {live.hosts.map((meta) => {
                      const onTv = ytVideo?.type === 'live' && ytVideo.host === meta.userId
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
                                stateRef.current.setYouTube?.({ type: 'live', host: meta.userId, name: meta.name ?? 'Alguém', by: meName?.split(' ')[0] ?? '' })
                                setPanel(null)
                              }}
                            >
                              📡 Passar
                            </button>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                  <p className="room-dj-note">Cada pessoa na sala conta como espectador da live (máximo de {MAX_VIEWERS}).</p>
                </>
              )}
              {ytVideo && (
                <div className="room-panel-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => { stateRef.current.setYouTube?.(null); setPanel(null) }}>
                    ⏻ Desligar o telão
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {panel.actions?.length > 0 && (
        <div className="room-panel-actions">
          {panel.actions.map((action, index) => (
            <button key={action.label} type="button" className={`btn ${index === 0 ? 'btn-primary' : 'btn-ghost'}`} onClick={action.run}>
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
