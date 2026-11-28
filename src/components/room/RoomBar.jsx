import { setPreviewDay, makeScene } from './roomHelpers'
import { HALL_THEMES, brasiliaToday, CINEMA_KEY } from '../../lib/rooms'

/** Barra de cima da sala: nome do ambiente, botões (decorar, tela cheia, trocar de sala) e quantas pessoas há. */
export default function RoomBar({ sceneName, isAdmin, roomKey, hallPreview, setHallPreview, applyScene, membersRef, user, goRoom, inMyRoom, myRoom, canDecorate, deco, startDecor, toggleFullscreen, fullscreen, meLook, setEditingAvatar, count }) {
  return (
    <div className="room-bar">
      <span className="room-title">{sceneName}</span>
      <div className="room-bar-actions">
        {isAdmin && roomKey === 'turma' && (
          <label className="room-day-pick" title="Só você (admin) vê a troca">
            <span>Ver sala de</span>
            <select
              value={hallPreview ?? 'hoje'}
              onChange={(event) => {
                const value = event.target.value === 'hoje' ? null : Number(event.target.value)
                setPreviewDay(value)
                setHallPreview(value)
                applyScene(makeScene('turma', membersRef.current, user.id, null))
              }}
            >
              <option value="hoje">Hoje ({HALL_THEMES[brasiliaToday().weekday].dayName})</option>
              {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                <option key={day} value={day}>
                  {HALL_THEMES[day].dayName} · {HALL_THEMES[day].name}
                </option>
              ))}
            </select>
          </label>
        )}
        {roomKey !== 'turma' && (
          <button type="button" className="room-bar-btn" onClick={() => goRoom('turma')}>
            Sala da turma
          </button>
        )}
        {!inMyRoom && (
          <button type="button" className="room-bar-btn" onClick={() => goRoom(myRoom)}>
            Meu quarto
          </button>
        )}
        {roomKey !== CINEMA_KEY && (
          <button type="button" className="room-bar-btn" onClick={() => goRoom(CINEMA_KEY)}>
            🎬 Cine turma
          </button>
        )}
        {canDecorate && !deco && (
          <button type="button" className="room-bar-btn is-strong" onClick={startDecor}>
            Decorar
          </button>
        )}
        <button type="button" className="room-bar-btn" onClick={toggleFullscreen} aria-pressed={fullscreen}>
          {fullscreen ? 'Sair da tela cheia' : '⛶ Tela cheia'}
        </button>
        <button type="button" className={`room-bar-btn${meLook ? '' : ' is-new'}`} onClick={() => setEditingAvatar(true)}>
          {meLook ? 'Meu avatar' : 'Crie seu avatar!'}
        </button>
      </div>
      <span className="room-count">
        <span className="online-dot-inline" aria-hidden="true" />
        {count} aqui
      </span>
    </div>
  )
}
