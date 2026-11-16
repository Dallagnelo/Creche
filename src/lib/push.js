// Notificações no aparelho (Web Push). Precisa do app instalável (service worker) ligado.
import { pwaEnabled } from './pwa'
import { removePushSubscription, savePushSubscription } from '../services/notifications'

const PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY ?? ''

export const isIos = () =>
  /iphone|ipad|ipod/i.test(window.navigator.userAgent) ||
  (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1)
export const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true

/**
 * O que dá para fazer neste aparelho:
 *  'ok'         pode ligar
 *  'no-key'     falta configurar a chave (VITE_VAPID_PUBLIC_KEY) no site
 *  'ios-install' iPhone/iPad: precisa instalar o app na Tela de Início primeiro
 *  'off'        app instalável desligado neste navegador (?pwa=off) ou modo de teste
 *  'unsupported' navegador sem suporte
 *  'denied'     a pessoa bloqueou as notificações do site
 */
export function pushStatus() {
  if (!PUBLIC_KEY) return 'no-key'
  if (isIos() && !isStandalone()) return 'ios-install'
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported'
  if (import.meta.env.DEV || !pwaEnabled()) return 'off'
  if (Notification.permission === 'denied') return 'denied'
  return 'ok'
}

async function registration() {
  const ready = navigator.serviceWorker.ready
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('O app ainda está carregando. Tente de novo em alguns segundos.')), 8000))
  return Promise.race([ready, timeout])
}

function keyBytes(base64url) {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((base64url.length + 3) % 4)
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))
}

/** A inscrição foi feita com a chave atual? (se a chave do site mudar, as inscrições antigas param de funcionar) */
function sameKey(sub) {
  const key = sub?.options?.applicationServerKey
  if (!key) return true // navegador não informa: confia
  const mine = keyBytes(PUBLIC_KEY)
  const theirs = new Uint8Array(key)
  return theirs.length === mine.length && theirs.every((byte, index) => byte === mine[index])
}

const isBrave = () => typeof navigator.brave?.isBrave === 'function'

/** Explica em português os erros mais comuns ao ligar. */
function friendlyError(error) {
  const text = String(error?.message ?? error)
  if (error?.name === 'AbortError' || /push service|registration failed/i.test(text)) {
    return isBrave()
      ? 'O Brave vem com as notificações de sites desligadas. Abra brave://settings/privacy, ligue “Usar os serviços do Google para mensagens push”, reinicie o navegador e tente de novo.'
      : 'O serviço de notificações do navegador não respondeu. Confira se a internet está ok e tente de novo daqui a pouco.'
  }
  if (error?.name === 'NotAllowedError') return 'As notificações foram bloqueadas. Libere no cadeado ao lado do endereço e recarregue a página.'
  return text
}

/** Este aparelho já recebe notificações? */
export async function pushIsOn() {
  if (pushStatus() !== 'ok' || Notification.permission !== 'granted') return false
  try {
    const reg = await registration()
    const sub = await reg.pushManager.getSubscription()
    if (!sub || !sameKey(sub)) return false // chave antiga: precisa ligar de novo
    savePushSubscription(sub).catch(() => {}) // garante que o banco conhece este aparelho (e com a conta de agora)
    return true
  } catch {
    return false
  }
}

export async function enablePush() {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Você não permitiu as notificações. Dá para liberar nas configurações do navegador (cadeado ao lado do endereço).')
  try {
    const reg = await registration()
    let sub = await reg.pushManager.getSubscription()
    if (sub && !sameKey(sub)) {
      // inscrição feita com uma chave antiga: troca pela atual
      await removePushSubscription(sub.endpoint)
      await sub.unsubscribe()
      sub = null
    }
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(PUBLIC_KEY) })
    await savePushSubscription(sub)
  } catch (error) {
    throw new Error(friendlyError(error))
  }
}

export async function disablePush() {
  try {
    const reg = await registration()
    const sub = await reg.pushManager.getSubscription()
    if (sub) {
      await removePushSubscription(sub.endpoint)
      await sub.unsubscribe()
    }
  } catch {
    /* sem service worker: não há o que desligar */
  }
}
