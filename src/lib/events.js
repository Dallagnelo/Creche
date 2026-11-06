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
