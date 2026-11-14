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

/** Este aparelho já recebe notificações? */
export async function pushIsOn() {
  if (pushStatus() !== 'ok' || Notification.permission !== 'granted') return false
  try {
    const reg = await registration()
    const sub = await reg.pushManager.getSubscription()
    if (sub) savePushSubscription(sub).catch(() => {}) // garante que o banco conhece este aparelho
    return !!sub
  } catch {
    return false
  }
}

export async function enablePush() {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Você não permitiu as notificações. Dá para liberar nas configurações do navegador (cadeado ao lado do endereço).')
  const reg = await registration()
  let sub = await reg.pushManager.getSubscription()
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(PUBLIC_KEY) })
  await savePushSubscription(sub)
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
