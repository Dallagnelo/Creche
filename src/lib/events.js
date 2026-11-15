// Tipos de evento e pequenas contas de data usadas na página de Eventos.

export const EVENT_CATEGORIES = [
  { id: 'filme', label: 'Filme', emoji: '🎬' },
  { id: 'esporte', label: 'Esporte', emoji: '🏐' },
  { id: 'jogo', label: 'Jogo', emoji: '🎮' },
  { id: 'comida', label: 'Comida', emoji: '🍕' },
  { id: 'festa', label: 'Festa', emoji: '🎉' },
  { id: 'passeio', label: 'Passeio', emoji: '🚗' },
  { id: 'outro', label: 'Outro', emoji: '📌' },
]

export function categoryOf(id) {
  return EVENT_CATEGORIES.find((item) => item.id === id) ?? EVENT_CATEGORIES[EVENT_CATEGORIES.length - 1]
}

function parseDay(value) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/** Quantos dias faltam (0 = hoje, 1 = amanhã, negativo = já passou). */
export function daysUntil(dateISO) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((parseDay(dateISO) - today) / 86400000)
}

export function relativeLabel(dateISO) {
  const days = daysUntil(dateISO)
  if (days === 0) return 'Hoje'
  if (days === 1) return 'Amanhã'
  if (days === -1) return 'Ontem'
  if (days > 1) return `Em ${days} dias`
  return `Há ${-days} dias`
}

/** Partes para o "calendarizinho" do cartão: dia, mês curto e dia da semana. */
export function dateParts(dateISO) {
  const date = parseDay(dateISO)
  return {
    day: String(date.getDate()).padStart(2, '0'),
    month: date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
    weekday: date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
  }
}

export function formatTime(value) {
  return value ? value.slice(0, 5) : ''
}

// Cor de cada tipo (usada no calendário e nos cards). Sempre combina com texto escuro por cima.
const CATEGORY_COLORS = {
  filme: '#ff7eb6',
  esporte: '#5eead4',
  jogo: '#ffd166',
  comida: '#ff9b5e',
  festa: '#b79cff',
  passeio: '#6fc3ff',
  outro: '#c3cfe3',
}

export function categoryColor(id) {
  return CATEGORY_COLORS[id] ?? CATEGORY_COLORS.outro
}

/** Quanto falta para o evento (usa a hora, se tiver). Retorna null quando já começou ou não tem hora certa. */
export function countdownTo(dateISO, time) {
  const [year, month, day] = dateISO.split('-').map(Number)
  const [hour = 0, minute = 0] = (time ?? '').split(':').map(Number)
  const diff = new Date(year, month - 1, day, hour, minute) - new Date()
  if (diff <= 0) return null
  const minutes = Math.floor(diff / 60000)
  return { days: Math.floor(minutes / 1440), hours: Math.floor((minutes % 1440) / 60), minutes: minutes % 60 }
}

/** "sábado, 7 de novembro" */
export function longDate(dateISO) {
  const [year, month, day] = dateISO.split('-').map(Number)
  const text = new Date(year, month - 1, day).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** "dom, 8 de novembro" (minúsculo; o CSS põe em maiúsculas onde precisar) */
export function captionDate(dateISO) {
  const [year, month, day] = dateISO.split('-').map(Number)
  return new Date(year, month - 1, day)
    .toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'long' })
    .replace('.', '')
}

/** "Sáb, 7 de nov" */
export function shortDate(dateISO) {
  const [year, month, day] = dateISO.split('-').map(Number)
  const text = new Date(year, month - 1, day)
    .toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })
    .replace(/\./g, '')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** Por quanto tempo um evento que já começou continua na lista (depois disso ele é apagado). */
/** Quantos eventos que já aconteceram aparecem antes do botão "Ver todos". */
export const PAST_PREVIEW = 6

/** Início do evento: data + hora. Sem hora marcada, vale o fim do dia (23:59). */
export function eventStart(event) {
  const [year, month, day] = event.event_date.split('-').map(Number)
  const [hour, minute] = event.event_time ? event.event_time.split(':').map(Number) : [23, 59]
  return new Date(year, month - 1, day, hour, minute)
}

/** O evento já chegou na data e hora marcadas? */
export function hasEnded(event, now = new Date()) {
  return eventStart(event) <= now
}

/** "aconteceu hoje" / "aconteceu ontem" / "há 5 dias" / "há 2 meses" / "há 1 ano": quando o evento aconteceu. */
export function happenedAgo(event, now = new Date()) {
  const start = eventStart(event)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const day = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const days = Math.round((today - day) / 86400000)
  if (days <= 0) return 'aconteceu hoje'
  if (days === 1) return 'aconteceu ontem'
  if (days < 30) return `há ${days} dias`
  const months = Math.floor(days / 30)
  if (months < 12) return months === 1 ? 'há 1 mês' : `há ${months} meses`
  const years = Math.floor(days / 365)
  return years <= 1 ? 'há 1 ano' : `há ${years} anos`
}
