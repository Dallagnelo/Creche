import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'
import { useAuth } from '../contexts/AuthContext'
import { CHAT_MAX_GIF_MB, CHAT_MAX_LENGTH, IMAGE_GAP_MS, useLiveChat } from '../lib/liveChat'

// Cada pessoa tem sempre a mesma cor no chat (calculada a partir do id), como nos chats de transmissão.
const hueOf = (id) => {
  let hash = 0
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) % 360
  return hash
}

const timeOf = (at) => new Date(at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

/** Chat único da página Ao vivo (vale para todas as transmissões). Nada fica salvo no banco. */
export default function LiveChat({ onHide }) {
  const { user, profile } = useAuth()
  const me = {
    userId: user.id,
    name: profile?.display_name ?? user.email ?? 'Alguém',
    avatarUrl: profile?.avatar_url ?? null,
  }
  const { messages, ready, send, sendImage } = useLiveChat(true, me)
  const [text, setText] = useState('')
  const [hint, setHint] = useState('')
  const [busy, setBusy] = useState(false)
  const logRef = useRef(null)
  const fileRef = useRef(null)
  const stickRef = useRef(true) // se a conversa deve continuar descendo (quando uma imagem termina de carregar)

  // Desce a conversa quando chega mensagem, mas só se a pessoa já estava no fim (ou se foi ela que escreveu).
  useEffect(() => {
    const log = logRef.current
    if (!log) return
    const last = messages[messages.length - 1]
    const nearEnd = log.scrollHeight - log.scrollTop - log.clientHeight < 80
    stickRef.current = nearEnd || last?.from === me.userId
    if (stickRef.current) log.scrollTop = log.scrollHeight
  }, [messages, me.userId])

  const scrollDown = () => {
    if (stickRef.current && logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }

  const IMAGE_HINTS = {
    wait: 'Calma, uma mensagem por segundo.',
    slow: `Foto ou GIF só a cada ${IMAGE_GAP_MS / 1000} segundos.`,
    off: 'Chat desconectado, tentando de novo…',
    type: 'Esse arquivo não é uma imagem.',
    big: `O GIF deve ter no máximo ${CHAT_MAX_GIF_MB} MB.`,
    fail: 'Não consegui enviar a imagem. Tenta de novo.',
  }

  async function handleImage(file) {
    if (!file || busy) return
    setBusy(true)
    setHint('Enviando imagem…')
    const result = await sendImage(file, text)
    setBusy(false)
    if (result === 'ok') {
      setText('')
      setHint('')
    } else {
      setHint(IMAGE_HINTS[result] ?? IMAGE_HINTS.fail)
    }
  }

  // Colar uma imagem (Ctrl+V) no campo de texto também envia.
  function handlePaste(event) {
    const file = [...(event.clipboardData?.files ?? [])].find((item) => item.type.startsWith('image/'))
    if (!file) return
    event.preventDefault()
    handleImage(file)
  }

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
      <div className="live-chat-head">
        <h2 id="live-chat-title">Chat da turma</h2>
        {onHide && (
          <button type="button" className="btn" onClick={onHide}>
            Minimizar
          </button>
        )}
      </div>

      <ul className="live-chat-log" ref={logRef} aria-live="polite">
        {messages.length === 0 && (
          <li className="muted live-chat-empty">{ready ? 'Ninguém falou nada ainda. Manda a primeira!' : 'Conectando ao chat…'}</li>
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
            {message.image && (
              <a className="live-msg-image" href={message.image} target="_blank" rel="noopener noreferrer">
                <img src={message.image} alt={`Imagem enviada por ${message.name}`} loading="lazy" onLoad={scrollDown} />
              </a>
            )}
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
          onPaste={handlePaste}
        />
        <input
          ref={fileRef}
          className="sr-only"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          aria-label="Escolher foto ou GIF"
          onChange={(event) => {
            handleImage(event.target.files?.[0])
            event.target.value = ''
          }}
        />
        <button
          type="button"
          className="btn btn-ghost live-chat-attach"
          onClick={() => fileRef.current?.click()}
          disabled={!ready || busy}
          title="Anexar foto ou GIF"
          aria-label="Anexar foto ou GIF"
        >
          <Icon name="attach" />
        </button>
        <button type="submit" className="btn btn-primary" disabled={!ready || busy || !text.trim()}>
          Enviar
        </button>
      </form>
      <small className="muted live-chat-note">{hint || 'As mensagens não ficam salvas: somem quando você recarrega a página.'}</small>
    </section>
  )
}
