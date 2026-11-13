import { useEffect, useState } from 'react'
import { canInstall, INSTALL_EVENT, promptInstall } from '../lib/pwa'

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
const isIos = () =>
  /iphone|ipad|ipod/i.test(window.navigator.userAgent) ||
  (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1)

/**
 * Convite para instalar o app (celular ou computador). Chrome, Edge e Android mostram um botão que
 * abre a instalação; no iPhone/iPad não existe botão, então explicamos o caminho pelo Safari.
 * Some sozinho quando o app já está instalado e aberto como aplicativo.
 */
export default function InstallApp({ className = '' }) {
  const [installable, setInstallable] = useState(canInstall())
  const [installed, setInstalled] = useState(() => isStandalone())
  useEffect(() => {
    const sync = () => setInstallable(canInstall())
    window.addEventListener(INSTALL_EVENT, sync)
    window.addEventListener('appinstalled', () => setInstalled(true))
    return () => window.removeEventListener(INSTALL_EVENT, sync)
  }, [])

  if (installed) return null
  if (installable) {
    return (
      <div className={`install-app ${className}`}>
        <div>
          <strong>Instale o app da turma</strong>
          <span className="muted"> Abre direto da tela inicial, sem navegador.</span>
        </div>
        <button type="button" className="btn btn-primary" onClick={promptInstall}>
          Instalar app
        </button>
      </div>
    )
  }
  if (isIos()) {
    return (
      <div className={`install-app ${className}`}>
        <div>
          <strong>Instale o app no iPhone</strong>
          <span className="muted">
            {' '}
            No Safari, toque em Compartilhar (quadrado com seta) e depois em “Adicionar à Tela de Início”.
          </span>
        </div>
      </div>
    )
  }
  return null
}
