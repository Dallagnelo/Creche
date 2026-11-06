// Pequenas contas com datas no formato "AAAA-MM-DD" (o mesmo do banco), sem mexer com fuso horário.

const pad = (n) => String(n).padStart(2, '0')

export const toISO = (year, month0, day) => `${year}-${pad(month0 + 1)}-${pad(day)}`

export function parseISO(iso) {
  const [year, month, day] = iso.split('-').map(Number)
  return { year, month0: month - 1, day }
}

export const daysInMonth = (year, month0) => new Date(year, month0 + 1, 0).getDate()

export function addDays(iso, amount) {
  const { year, month0, day } = parseISO(iso)
  const date = new Date(year, month0, day + amount)
  return toISO(date.getFullYear(), date.getMonth(), date.getDate())
}

/** Soma meses mantendo o dia (ou o último dia do mês, se ele não existir: 31/01 + 1 mês = 28/02). */
export function addMonths(iso, amount) {
  const { year, month0, day } = parseISO(iso)
  const target = new Date(year, month0 + amount, 1)
  const last = daysInMonth(target.getFullYear(), target.getMonth())
  return toISO(target.getFullYear(), target.getMonth(), Math.min(day, last))
}

/** As 42 casas (6 semanas, começando no domingo) do calendário do mês. */
export function monthGrid(year, month0) {
  const startOffset = new Date(year, month0, 1).getDay() // 0 = domingo
  return Array.from({ length: 42 }, (_, index) => addDays(toISO(year, month0, 1), index - startOffset))
}

export function clampISO(iso, min, max) {
  if (min && iso < min) return min
  if (max && iso > max) return max
  return iso
}

export const MONTH_NAMES = Array.from({ length: 12 }, (_, index) => {
  const name = new Date(2020, index, 1).toLocaleDateString('pt-BR', { month: 'long' })
  return name.charAt(0).toUpperCase() + name.slice(1)
})

export const WEEKDAY_LETTERS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
export const WEEKDAY_NAMES = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

/** "7 de nov. de 2026" */
export function formatPickerDate(iso) {
  const { year, month0, day } = parseISO(iso)
  return new Date(year, month0, day).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Próximo sábado a partir de hoje (se hoje é sábado, o próximo). */
export function nextSaturday(todayIso) {
  const { year, month0, day } = parseISO(todayIso)
  const weekday = new Date(year, month0, day).getDay()
  return addDays(todayIso, ((6 - weekday + 7) % 7) || 7)
}
