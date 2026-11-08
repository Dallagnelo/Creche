// Pequenas funções de formatação usadas em vários lugares.

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

/** "2026-11-04T10:00:00Z" -> "04 de nov. de 2026" */
export function formatDate(value) {
  if (!value) return ''
  return dateFormatter.format(new Date(value))
}

/** "2026-11-04T10:00:00Z" -> "04 nov" (versão curta, sem o ano) */
export function formatShortDate(value) {
  if (!value) return ''
  return new Date(value)
    .toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    .replace('.', '')
}

/** Datas do tipo "2026-11-04" (sem hora) precisam de tratamento para não "voltar um dia". */
export function formatDateOnly(value) {
  if (!value) return ''
  const [year, month, day] = value.split('-').map(Number)
  return dateFormatter.format(new Date(year, month - 1, day))
}

/** Data de hoje no formato aceito por <input type="date">, no fuso local. */
export function todayISO() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

/** Média com uma casa decimal, ex.: 4.3 */
export function formatAverage(value) {
  return value == null ? '–' : value.toFixed(1).replace('.', ',')
}

/** Idade em anos a partir de "1998-03-12". Devolve null se não houver data. */
export function calcAge(birthDate, today = new Date()) {
  if (!birthDate) return null
  const [year, month, day] = birthDate.split('-').map(Number)
  let age = today.getFullYear() - year
  const hadBirthday = today.getMonth() + 1 > month || (today.getMonth() + 1 === month && today.getDate() >= day)
  if (!hadBirthday) age -= 1
  return age
}

/** "27 anos" / "1 ano" */
export function formatAge(birthDate) {
  const age = calcAge(birthDate)
  if (age == null) return ''
  return `${age} ${age === 1 ? 'ano' : 'anos'}`
}

/** "1998-03-12" -> "12 de março" (sem o ano, para não expor a data completa) */
export function formatBirthday(birthDate) {
  if (!birthDate) return ''
  const [, month, day] = birthDate.split('-').map(Number)
  return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' }).format(new Date(2000, month - 1, day))
}

/** "2021-03-14" -> "março de 2021" */
export function formatMonthYear(value) {
  if (!value) return ''
  const [year, month, day] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, day))
}

/** Há quanto tempo desde uma data: "3 anos e 2 meses", "8 meses", "menos de 1 mês" */
export function formatFriendship(since, today = new Date()) {
  if (!since) return ''
  const [year, month, day] = since.split('-').map(Number)

  let months = (today.getFullYear() - year) * 12 + (today.getMonth() + 1 - month)
  if (today.getDate() < day) months -= 1 // ainda não completou o mês
  if (months < 1) return 'menos de 1 mês'

  const years = Math.floor(months / 12)
  const rest = months % 12
  const parts = []
  if (years) parts.push(`${years} ${years === 1 ? 'ano' : 'anos'}`)
  if (rest) parts.push(`${rest} ${rest === 1 ? 'mês' : 'meses'}`)
  return parts.join(' e ')
}

/** Segundos -> "2 h 15 min", "8 min", "menos de 1 min" (tempo total de live) */
export function formatLiveTime(seconds) {
  const minutes = Math.floor((seconds ?? 0) / 60)
  if (minutes < 1) return 'menos de 1 min'
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (!hours) return `${rest} min`
  return rest ? `${hours} h ${rest} min` : `${hours} h`
}

/** Milissegundos -> "12:34" ou "1:02:03" (relógio da live no ar) */
export function formatClock(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n) => String(n).padStart(2, '0')
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}
