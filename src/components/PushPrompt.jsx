import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { enablePush, pushIsOn, pushStatus } from '../lib/push'

const SNOOZE_DAYS = 7
const DELAY_MS = 4000 // espera o site carregar antes de perguntar

/**
 * Convite para ligar as notificações no aparelho, logo na entrada.
 * Só aparece para quem ainda não ligou (nem bloqueou). "Agora não" esconde por 7 dias.
 * No iPhone/iPad, explica que precisa instalar o app antes.
 */
export default function PushPrompt() {
  const { user } = useAuth()
  const [mode, setMode] = useState(null) // 'ask' | 'ios'
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const userId = user?.id
  const key = `push-convite-depois:${userId}`

  useEffect(() => {
    if (!userId) return undefined
    let alive = true
    const timer = setTimeout(async () => {
      try {
        const until = Number(localStorage.getItem(key) ?? 0)
        if (until > Date.now()) return
      } catch {
        /* sem localStorage: pergunta mesmo assim */
      }
      const status = pushStatus()
      if (status === 'ios-install') {
        if (alive) setMode('ios')
        return
      }
      if (status !== 'ok') return
      if (await pushIsOn()) return
      if (alive) setMode('ask')
    }, DELAY_MS)
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [userId, key])

  if (!mode) return null

  function later() {
    try {
      localStorage.setItem(key, String(Date.now() + SNOOZE_DAYS * 86_400_000))
    } catch {
      /* ignora */
    }
    setMode(null)
  }

  async function turnOn() {
    setBusy(true)
    setError('')
    try {
      await enablePush()
      setDone(true)
      setTimeout(() => setMode(null), 2500)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="push-prompt" role="dialog" aria-labelledby="push-prompt-title">
      <span className="push-prompt-icon" aria-hidden="true">
        🔔
      </span>
      <div className="push-prompt-text">
        {done ? (
          <strong id="push-prompt-title">Pronto! Você vai receber os avisos neste aparelho. 🎉</strong>
        ) : mode === 'ios' ? (
          <>
            <strong id="push-prompt-title">Quer receber avisos no iPhone?</strong>
            <span>
              Instale o app: no Safari, toque em <b>Compartilhar</b> e em <b>“Adicionar à Tela de Início”</b>. Depois abra pelo ícone e ligue os avisos.
            </span>
          </>
        ) : (
          <>
            <strong id="push-prompt-title">Quer receber avisos neste aparelho?</strong>
            <span>Lives começando, eventos novos e votações. Dá para desligar quando quiser em Configurações.</span>
          </>
        )}
        {error && <span className="push-prompt-error">{error}</span>}
      </div>
      {!done && (
        <div className="push-prompt-actions">
          {mode === 'ask' && (
            <button type="button" className="btn btn-primary" onClick={turnOn} disabled={busy}>
              {busy ? 'Ligando...' : 'Ligar'}
            </button>
          )}
          <button type="button" className="btn btn-ghost" onClick={later} disabled={busy}>
            {mode === 'ios' ? 'Entendi' : 'Agora não'}
          </button>
        </div>
      )}
    </div>
  )
}
