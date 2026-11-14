import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { ErrorBox } from './Feedback'
import { disablePush, enablePush, pushIsOn, pushStatus } from '../lib/push'
import { DEFAULT_PREFS, getNotificationPrefs, saveNotificationPrefs, sendTestNotification } from '../services/notifications'

const GROUPS = [
  { key: 'live', label: '📡 Alguém entrou ao vivo', hint: 'Quando alguém da turma começa uma transmissão.' },
  { key: 'events', label: '📅 Eventos', hint: 'Evento novo e lembrete 1 dia antes.' },
  { key: 'polls', label: '🗳️ Votações', hint: 'Votação nova e aviso quando falta 1 hora para acabar (se você ainda não votou).' },
]

const STATUS_TEXT = {
  'no-key': 'As notificações no aparelho ainda não foram configuradas no site (falta a chave VITE_VAPID_PUBLIC_KEY).',
  'ios-install': 'No iPhone/iPad, primeiro instale o app: no Safari, toque em Compartilhar e em “Adicionar à Tela de Início”. Depois abra pelo ícone e ligue aqui.',
  off: 'O app instalável está desligado neste navegador, então não dá para receber notificações aqui.',
  unsupported: 'Este navegador não recebe notificações. Tente pelo Chrome, Edge, Firefox ou pelo app instalado.',
  denied: 'As notificações deste site estão bloqueadas no navegador. Libere no cadeado ao lado do endereço e recarregue a página.',
}

function Switch({ label, hint, checked, disabled, onChange }) {
  return (
    <label className="toggle">
      <span className="toggle-text">
        <strong>{label}</strong>
        <small className="muted toggle-hint">{hint}</small>
      </span>
      <input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
      <span className="toggle-track" aria-hidden="true" />
    </label>
  )
}

/** Configurações > Notificações: o que receber (vale para o sininho e para o aparelho) e o push deste aparelho. */
export default function NotificationSettings() {
  const { user } = useAuth()
  const [prefs, setPrefs] = useState(DEFAULT_PREFS)
  const [prefsError, setPrefsError] = useState('')
  const [status, setStatus] = useState(() => pushStatus())
  const [deviceOn, setDeviceOn] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!user?.id) return
    getNotificationPrefs(user.id).then(setPrefs, (error) => setPrefsError(error.message))
    pushIsOn().then(setDeviceOn)
  }, [user?.id])

  // veio do sininho ("Escolher o que receber"): rola até aqui
  useEffect(() => {
    if (window.location.hash === '#notificacoes') document.getElementById('notificacoes')?.scrollIntoView({ block: 'start' })
  }, [])

  async function changeGroup(key, value) {
    const next = { ...prefs, [key]: value }
    setPrefs(next)
    try {
      await saveNotificationPrefs(user.id, next)
      setPrefsError('')
    } catch (error) {
      setPrefs(prefs)
      setPrefsError(error.message)
    }
  }

  async function changeDevice(value) {
    setBusy(true)
    setMessage('')
    try {
      if (value) {
        await enablePush()
        setDeviceOn(true)
        setMessage('Pronto! Este aparelho vai receber as notificações.')
      } else {
        await disablePush()
        setDeviceOn(false)
      }
    } catch (error) {
      setMessage(error.message)
    } finally {
      setStatus(pushStatus())
      setBusy(false)
    }
  }

  async function test() {
    setMessage('')
    try {
      await sendTestNotification()
      setMessage(deviceOn ? 'Teste enviado! Deve chegar em alguns segundos no sininho e no aparelho.' : 'Teste enviado! Olhe o sininho.')
    } catch (error) {
      setMessage(error.message)
    }
  }

  return (
    <section id="notificacoes" className="card panel settings-group" aria-labelledby="settings-notify">
      <div className="panel-head">
        <h2 id="settings-notify">Notificações</h2>
      </div>

      <p className="muted settings-note">Escolha o que quer receber. Vale para o sininho 🔔 e para as notificações no aparelho.</p>
      {GROUPS.map((group) => (
        <Switch key={group.key} label={group.label} hint={group.hint} checked={!!prefs[group.key]} onChange={(value) => changeGroup(group.key, value)} />
      ))}
      {prefsError && <ErrorBox error={{ message: prefsError }} />}

      <div className="settings-sub">
        {status === 'ok' ? (
          <Switch
            label="📲 Notificações neste aparelho"
            hint="Chegam mesmo com o site fechado. Ligue em cada aparelho que quiser (celular, computador...)."
            checked={deviceOn}
            disabled={busy}
            onChange={changeDevice}
          />
        ) : (
          <div className="notify-blocked">
            <strong>📲 Notificações neste aparelho</strong>
            <p className="muted">{STATUS_TEXT[status]}</p>
          </div>
        )}
        {message && (
          <p className="notify-msg" role="status">
            {message}
          </p>
        )}
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={test}>
            🔔 Mandar um teste
          </button>
        </div>
      </div>
    </section>
  )
}
