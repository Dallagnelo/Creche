import { TILE } from '../../lib/room'
import { AVATAR_H } from '../../lib/avatar'
import { brasiliaToday, hallScene, corridorScene, CINEMA_KEY, cinemaScene, roomOwner, personalScene } from '../../lib/rooms'

// Funções e números de apoio da sala (sem React).
export const EMOTES = ['👋', '😂', '❤️', '🎉', '😮', '👍']
export const isNightNow = () => {
  const h = new Date().getHours()
  return h >= 19 || h < 6
}

export const SPEED = 3.6 // quadradinhos por segundo
export const BODY_H = 24
// deitado (na cama normal, girada de cabeça para baixo ou de lado)
export const isSleep = (pose) => typeof pose === 'string' && pose.startsWith('sleep')
// quem senta num sofá/cadeira de lado aparece por cima do móvel inteiro (senão o resto do sofá cobre a pessoa)
// lugar (do móvel) onde a pessoa está sentada/deitada
export function seatAt(scene, p) {
  if (!p.pose || !scene) return null
  for (const item of scene.furniture) {
    const seat = item.seats?.find((s) => Math.abs(s.x - p.x) < 0.3 && Math.abs(s.y - p.y) < 0.3)
    if (seat) return seat
  }
  return null
}
// ---------- Cine turma: brincadeiras da plateia
export const CINE_POPCORN = 10 // punhados num balde da pipoqueira
export const isCinemaSeatItem = (item) => String(item.key ?? '').startsWith('cinemaseat')
// o que a pessoa tem na mão: { popcorn: 0..10, soda: bool }
export const cleanHold = (hold) =>
  hold && typeof hold === 'object'
    ? { popcorn: Math.max(0, Math.min(CINE_POPCORN, Math.floor(Number(hold.popcorn) || 0))), soda: !!hold.soda }
    : null
// a fileira da frente (mais perto do telão) dá coroinha
export function frontRowY(scene) {
  let min = Infinity
  scene?.furniture.forEach((item) => isCinemaSeatItem(item) && item.seats?.forEach((seat) => (min = Math.min(min, seat.y))))
  return min
}
// está sentado numa poltrona do cinema? (é quem aparece na plateia do modo cinema)
export function inCinemaSeat(scene, p) {
  if (!p?.pose || !scene) return false
  return scene.furniture.some(
    (item) => String(item.key ?? '').startsWith('cinemaseat') && item.seats?.some((s) => Math.abs(s.x - p.x) < 0.3 && Math.abs(s.y - p.y) < 0.3),
  )
}
export function seatOver(scene, p) {
  if (!p.pose) return null
  for (const item of scene.furniture) {
    if (!item.seats) continue
    if (item.seats.some((seat) => seat.over && Math.abs(seat.x - p.x) < 0.3 && Math.abs(seat.y - p.y) < 0.3)) return (item.y + item.h) * TILE + 0.5
  }
  return null
}
export const Y_OFF = TILE - AVATAR_H + 1 // o personagem fica com os pés na base do quadradinho
export const DEFAULT_ON = { lamp: true, fire: true, fan: true, vending: true, claw: true }
// cor clara? (para escolher texto escuro ou claro na plaquinha)
export function isLightColor(hex) {
  const n = parseInt(String(hex).replace('#', ''), 16)
  if (Number.isNaN(n)) return false
  return ((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114 > 165
}
export const isDecor = (item) => item.floor || (item.wall && !item.act && !item.screen)

// Onde o boneco estava da última vez (ambiente e quadradinho), guardado só neste navegador.
export const spotKey = (userId) => `turma-lugar:${userId}`
export function readSpot(userId) {
  try {
    const spot = JSON.parse(localStorage.getItem(spotKey(userId)) ?? 'null')
    return spot && typeof spot.room === 'string' ? spot : null
  } catch {
    return null
  }
}
export function writeSpot(userId, spot) {
  try {
    localStorage.setItem(spotKey(userId), JSON.stringify(spot))
  } catch {
    // navegador sem armazenamento: só não lembra o lugar
  }
}

export function firstTodayCheck(userId) {
  try {
    return localStorage.getItem(`turma-dia:${userId}`) !== brasiliaToday().key
  } catch {
    return false
  }
}

// dia da sala da turma escolhido pelo admin para conferir (só neste navegador); null = o dia de hoje
let previewDay = null
export const getPreviewDay = () => previewDay
export const setPreviewDay = (value) => {
  previewDay = value
}
export function makeScene(key, members, meId, layout) {
  if (key === 'turma') return hallScene(previewDay ?? undefined)
  if (key === 'corredor') return corridorScene(members, meId)
  if (key === CINEMA_KEY) return cinemaScene()
  const owner = roomOwner(key)
  return personalScene(owner, members.find((m) => m.id === owner)?.name, layout)
}
