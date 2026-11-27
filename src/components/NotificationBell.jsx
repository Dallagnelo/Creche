import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Icon from './Icon'
import { listNotifications, markAllRead, notificationCutoff, runDueNotifications, watchNotifications } from '../services/notifications'

function timeAgo(iso) {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return 'agora'
  if (seconds < 3600) return `há ${Math.floor(seconds / 60)} min`
  if (seconds < 86400) return `há ${Math.floor(seconds / 3600)} h`
  const days = Math.floor(seconds / 86400)
  return days === 1 ? 'ontem' : `há ${days} dias`
}

/** Sininho do topo: quadrado "Avisos" com a contagem de não lidas e a lista ao clicar. */
export default function NotificationBell() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)
  const [fresh, setFresh] = useState(() => new Set()) // as que eram novas quando o sininho abriu (continuam destacadas)
  const [, setTick] = useState(0) // atualiza o "há X min"
  const boxRef = useRef(null)
  const userId = user?.id

  const load = useCallback(async () => {
    setItems(await listNotifications())
  }, [])

  useEffect(() => {
    if (!userId) return undefined
    let alive = true
    // primeiro gera os avisos com hora marcada (evento amanhã, votação acabando), depois busca a lista
    runDueNotifications().finally(() => alive && load())
    const stop = watchNotifications(userId, (row) => setItems((list) => (list.some((item) => item.id === row.id) ? list : [row, ...list])))
    const due = setInterval(() => runDueNotifications(), 15 * 60 * 1000)
    const onVisible = () => document.visibilityState === 'visible' && load()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      alive = false
      stop()
      clearInterval(due)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [userId, load])

  // fecha clicando fora ou com Esc
  useEffect(() => {
    if (!open) return undefined
    setTick((value) => value + 1)
    const onDown = (event) => !boxRef.current?.contains(event.target) && setOpen(false)
    const onKey = (event) => event.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  // passados 3 dias, o aviso some (mesmo com a página aberta há tempo)
  const cutoff = notificationCutoff()
  const shown = items.filter((item) => item.created_at >= cutoff)
  const unread = shown.filter((item) => !item.read_at).length

  // abrir o sininho já marca tudo como lido; as novas seguem destacadas enquanto ele está aberto
  function toggle() {
    if (open) {
      setOpen(false)
      return
    }
    setFresh(new Set(shown.filter((item) => !item.read_at).map((item) => item.id)))
    setOpen(true)
    if (unread) {
      const now = new Date().toISOString()
      setItems((list) => list.map((item) => (item.read_at ? item : { ...item, read_at: now })))
      markAllRead()
    }
  }
  function openItem(item) {
    setOpen(false)
    if (item.link) navigate(item.link)
  }

  return (
    <div className="bell" ref={boxRef}>
      <button
        type="button"
        className={`counter counter-bell${unread ? ' has-unread' : ''}${open ? ' is-open' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={unread ? `Avisos: ${unread} não lidos` : 'Avisos'}
        onClick={toggle}
      >
        <span className="counter-label">Avisos</span>
        <span className="counter-value bell-value">
          <Icon name="bell" />
          {unread > 0 && <span className="bell-badge">{unread > 9 ? '9+' : unread}</span>}
        </span>
      </button>

      {open && (
        <div className="bell-panel" role="dialog" aria-label="Avisos">
          <div className="bell-head">
            <strong>Avisos</strong>
          </div>
          {shown.length === 0 ? (
            <p className="bell-empty">Nenhum aviso por enquanto. 🌙</p>
          ) : (
            <ul className="bell-list">
              {shown.map((item) => (
                <li key={item.id}>
                  <button type="button" className={`bell-item${!item.read_at || fresh.has(item.id) ? ' is-new' : ''}`} onClick={() => openItem(item)}>
                    <span className="bell-item-title">{item.title}</span>
                    {item.body && <span className="bell-item-body">{item.body}</span>}
                    <span className="bell-item-time">{timeAgo(item.created_at)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className="bell-foot"
            onClick={() => {
              setOpen(false)
              navigate('/configuracoes#notificacoes')
            }}
          >
            ⚙ Escolher o que receber
          </button>
        </div>
      )}
    </div>
  )
}
