import { useEffect, useState } from 'react'
import { applyUpdate, hasUpdate, UPDATE_EVENT } from '../lib/pwa'

/** Aviso "Nova versão disponível" (só aparece com o PWA ligado e uma versão nova esperando). */
export default function PwaUpdate() {
  const [ready, setReady] = useState(hasUpdate())
  useEffect(() => {
    const show = () => setReady(true)
    window.addEventListener(UPDATE_EVENT, show)
    return () => window.removeEventListener(UPDATE_EVENT, show)
  }, [])
  if (!ready) return null
  return (
    <div className="pwa-toast" role="status">
      <div>
        <strong>Nova versão disponível</strong>
        <span>Atualize para ver as novidades.</span>
      </div>
      <div className="pwa-toast-actions">
        <button type="button" className="btn btn-primary" onClick={applyUpdate}>
          Atualizar agora
        </button>
        <button type="button" className="btn" onClick={() => setReady(false)}>
          Depois
        </button>
      </div>
    </div>
  )
}
