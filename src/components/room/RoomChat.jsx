import { EMOTES } from './roomHelpers'

/** Caixa do chat da sala e os emotes. */
export default function RoomChat({ speak, message, leaveChat, chatInputRef, hasKeyboard, setMessage, setChatFocus }) {
  return (
    <form
      className="room-chat"
      onSubmit={(event) => {
        event.preventDefault()
        // mandou: sai da caixa e volta a andar; para falar de novo, ENTER outra vez
        if (speak(message)) leaveChat()
      }}
    >
      <div className="room-emotes" role="group" aria-label="Emotes">
        {EMOTES.map((emote) => (
          <button key={emote} type="button" className="room-emote" onClick={() => speak(emote)}>
            {emote}
          </button>
        ))}
      </div>
      <input
        ref={chatInputRef}
        className="room-chat-input"
        value={message}
        enterKeyHint="send"
        onKeyDown={(event) => {
          if (event.key === 'Escape' || (event.key === 'Enter' && !message.trim())) {
            event.preventDefault()
            leaveChat()
          }
        }}
        maxLength={80}
        placeholder={hasKeyboard ? 'Falar algo para quem está aqui... (ENTER)' : 'Falar algo para quem está aqui...'}
        aria-label="Mensagem"
        onChange={(event) => setMessage(event.target.value)}
        onFocus={() => setChatFocus(true)}
        onBlur={() => setChatFocus(false)}
      />
      <button type="submit" className="btn btn-primary room-chat-send" disabled={!message.trim()}>
        Falar
      </button>
    </form>
  )
}
