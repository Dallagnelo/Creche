import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { CHAT_MAX_LENGTH, useLiveChat } from '../lib/liveChat'
import Avatar from './Avatar'

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
          <li className="muted live-chat-empty">{ready ? 'Ninguém falou nada ainda. Manda a primeira!' : 'Conectando ao chat…'}</li>
        )}
        {messages.map((message) => (
          <li key={message.id} className={message.from === me.userId ? 'live-msg is-mine' : 'live-msg'}>
            <Avatar name={message.name} src={message.avatarUrl} size={26} />
            <div className="live-msg-body">
              <div className="live-msg-head">
                <strong>{message.name}</strong>
                <time className="muted" dateTime={new Date(message.at).toISOString()}>
                  {timeOf(message.at)}
                </time>
              </div>
              <p>{message.text}</p>
            </div>
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
      <small className="muted live-chat-note">{hint || 'As mensagens não ficam salvas: somem quando você recarrega a página.'}</small>
    </section>
  )
}
