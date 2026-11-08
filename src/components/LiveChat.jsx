import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { CHAT_MAX_LENGTH, useLiveChat } from '../lib/liveChat'

// Cada pessoa tem sempre a mesma cor no chat (calculada a partir do id), como nos chats de transmissão.
const hueOf = (id) => {
  let hash = 0
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) % 360
  return hash
}

const timeOf = (at) => new Date(at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

/** Chat único da página Ao vivo (vale para todas as transmissões). Nada fica salvo no banco. */
export default function LiveChat() {
  const { user, profile } = useAuth()
  const me = {
    userId: user.id,
    name: profile?.display_name ?? user.email ?? 'Alguém',
    avatarUrl: profile?.avatar_url ?? null,
  }
  const { messages, ready, send } = useLiveChat(true, me)
  const [text, setText] = useState('')
  const [hint, setHint] = useState('')
  const logRef = useRef(null)

  // Desce a conversa quando chega mensagem, mas só se a pessoa já estava no fim (ou se foi ela que escreveu).
  useEffect(() => {
    const log = logRef.current
    if (!log) return
    const last = messages[messages.length - 1]
    const nearEnd = log.scrollHeight - log.scrollTop - log.clientHeight < 80
    if (nearEnd || last?.from === me.userId) log.scrollTop = log.scrollHeight
  }, [messages, me.userId])

  function handleSubmit(event) {
    event.preventDefault()
    const result = send(text)
    if (result === 'ok') {
      setText('')
      setHint('')
    } else {
      setHint(result === 'wait' ? 'Calma, uma mensagem por segundo.' : 'Chat desconectado, tentando de novo…')
    }
  }

  return (
    <section className="card live-chat" aria-labelledby="live-chat-title">
      <h2 id="live-chat-title">Chat da turma</h2>

      <ul className="live-chat-log" ref={logRef} aria-live="polite">
        {messages.length === 0 && (
          <li className="muted live-chat-empty">{ready ? 'Ninguém falou nada ainda.' : 'Conectando ao chat…'}</li>
        )}
        {messages.map((message) => (
          <li key={message.id} className={message.from === me.userId ? 'live-msg is-mine' : 'live-msg'}>
            <time className="live-msg-time" dateTime={new Date(message.at).toISOString()}>
              {timeOf(message.at)}
            </time>{' '}
            <span className="live-msg-text">
              <strong style={{ color: `hsl(${hueOf(message.from)} 70% var(--chat-l))` }}>{message.name}</strong>
              <span aria-hidden="true">: </span>
              {message.text}
            </span>
          </li>
        ))}
      </ul>

      <form className="live-chat-form" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="live-chat-input">
          Mensagem para a turma
        </label>
        <input
          id="live-chat-input"
          type="text"
          autoComplete="off"
          maxLength={CHAT_MAX_LENGTH}
          placeholder="Escreva aqui…"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        <button type="submit" className="btn btn-primary" disabled={!ready || !text.trim()}>
          Enviar
        </button>
      </form>
      <small className="muted live-chat-note">{hint || 'Mensagens somem se recarregar a pagina.'}</small>
    </section>
  )
}
