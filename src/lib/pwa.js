// App instalável (PWA), liberado para todos. Para desligar só neste navegador (se algo der errado),
// abra o site com ?pwa=off; ?pwa=on volta a ligar. Para desligar para todo mundo: na Vercel, crie a
// variável VITE_PWA_ENABLED=false e faça um novo deploy.

const FLAG = 'memorias-da-turma:pwa'
const UPDATE_EVENT = 'pwa-update-ready'
const INSTALL_EVENT = 'pwa-install-ready'

let installPrompt = null
let waitingWorker = null

function applyUrlFlag() {
  try {
    const value = new URLSearchParams(window.location.search).get('pwa')
    if (value === 'on') localStorage.removeItem(FLAG)
    if (value === 'off') localStorage.setItem(FLAG, 'off')
  } catch {
    /* ignora */
  }
}

export function pwaEnabled() {
  if (import.meta.env.VITE_PWA_ENABLED === 'false') return false
  try {
    return localStorage.getItem(FLAG) !== 'off'
  } catch {
    return true
  }
}

export const canInstall = () => Boolean(installPrompt)
export const hasUpdate = () => Boolean(waitingWorker)
export { UPDATE_EVENT, INSTALL_EVENT }

export async function promptInstall() {
  if (!installPrompt) return false
  installPrompt.prompt()
  const { outcome } = await installPrompt.userChoice
  installPrompt = null
  window.dispatchEvent(new Event(INSTALL_EVENT))
  return outcome === 'accepted'
}

export function applyUpdate() {
  waitingWorker?.postMessage('SKIP_WAITING')
}

async function turnOff() {
  // PWA desligado: remove qualquer service worker e cache que tenha sobrado (volta ao site normal)
  try {
    const registrations = await navigator.serviceWorker?.getRegistrations?.()
    await Promise.all((registrations ?? []).map((item) => item.unregister()))
    const names = await caches?.keys?.()
    await Promise.all((names ?? []).map((name) => caches.delete(name)))
  } catch {
    /* ignora */
  }
}

export function initPwa() {
  applyUrlFlag()
  if (!('serviceWorker' in navigator)) return
  // no servidor de testes (npm run dev) o service worker fica sempre desligado
  if (import.meta.env.DEV) {
    turnOff()
    return
  }
  if (!pwaEnabled()) {
    turnOff()
    return
  }

  // manifesto e ícone do iPhone só existem para quem está com o PWA ligado
  const manifest = document.createElement('link')
  manifest.rel = 'manifest'
  manifest.href = '/manifest.webmanifest'
  document.head.appendChild(manifest)
  const apple = document.createElement('link')
  apple.rel = 'apple-touch-icon'
  apple.href = '/icons/apple-touch-icon.png'
  document.head.appendChild(apple)

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    installPrompt = event
    window.dispatchEvent(new Event(INSTALL_EVENT))
  })
  window.addEventListener('appinstalled', () => {
    installPrompt = null
    window.dispatchEvent(new Event(INSTALL_EVENT))
  })

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js')
      const notify = (worker) => {
        // só avisa quando já havia uma versão rodando (não na primeira instalação)
        if (worker && navigator.serviceWorker.controller) {
          waitingWorker = worker
          window.dispatchEvent(new Event(UPDATE_EVENT))
        }
      }
      if (registration.waiting) notify(registration.waiting)
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed') notify(worker)
        })
      })
      const hadController = Boolean(navigator.serviceWorker.controller)
      let reloading = false
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloading || !hadController) return // primeira instalação: não recarrega
        reloading = true
        window.location.reload()
      })
    } catch (error) {
      console.warn('PWA indisponível:', error?.message ?? error)
    }
  })
}
