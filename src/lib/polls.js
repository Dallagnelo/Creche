// Contas das votações: contagem de votos, vencedores e tempo restante.

const HOUR = 3600000

/** Aberta de verdade: não encerrada e dentro do prazo (sem prazo = aberta até o criador encerrar). */
export function isPollOpen(poll, now = new Date()) {
  return poll.status === 'open' && (!poll.closes_at || new Date(poll.closes_at) > now)
}

/** Passou do prazo mas o banco ainda não encerrou (será encerrada em instantes). */
export function isPollDue(poll, now = new Date()) {
  return poll.status === 'open' && Boolean(poll.closes_at) && new Date(poll.closes_at) <= now
}

/** Opções com votos e porcentagem. `ranking` vem do mais votado para o menos. */
export function tally(poll) {
  const total = poll.votes.length
  const options = poll.options.map((option) => {
    const votes = poll.votes.filter((vote) => vote.option_id === option.id).length
    return { ...option, votes, pct: total ? Math.round((votes / total) * 100) : 0 }
  })
  const ranking = [...options].sort((a, b) => b.votes - a.votes)
  return { total, options, ranking }
}

/** Opções vencedoras de uma votação encerrada (empate = várias). Vazio se ninguém votou. */
export function winnersOf(poll) {
  const { options } = tally(poll)
  const saved = options.filter((option) => poll.winner_option_ids?.includes(option.id))
  if (saved.length) return saved
  const best = Math.max(0, ...options.map((option) => option.votes))
  return best > 0 ? options.filter((option) => option.votes === best) : []
}

/** Milissegundos que faltam (0 se já acabou; null se não tem prazo). */
export function msLeft(poll, now = new Date()) {
  if (!poll.closes_at) return null
  return Math.max(0, new Date(poll.closes_at) - now)
}

const pad = (value) => String(value).padStart(2, '0')

/** Três quadros do relógio: DIAS/HORAS/MIN quando falta muito, HORAS/MIN/SEG no resto. */
export function clockBoxes(ms) {
  const totalSeconds = Math.floor(ms / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (ms >= 48 * HOUR) return [{ v: pad(days), l: 'DIAS' }, { v: pad(hours), l: 'HORAS' }, { v: pad(minutes), l: 'MIN' }]
  return [{ v: pad(Math.floor(totalSeconds / 3600)), l: 'HORAS' }, { v: pad(minutes), l: 'MIN' }, { v: pad(seconds), l: 'SEG' }]
}

/** "05:42:10" ou "2 dias" (para o selo pequeno). */
export function shortLeft(ms) {
  if (ms >= 48 * HOUR) return `${Math.floor(ms / (24 * HOUR))} dias`
  const totalSeconds = Math.floor(ms / 1000)
  return `${pad(Math.floor(totalSeconds / 3600))}:${pad(Math.floor((totalSeconds % 3600) / 60))}:${pad(totalSeconds % 60)}`
}

/** Quando fecha, em texto: "hoje às 21:30", "amanhã às 08:00" ou "12/11 às 09:00". */
export function closeLabel(poll, now = new Date()) {
  const date = new Date(poll.closes_at)
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const sameDay = (a, b) => a.toDateString() === b.toDateString()
  if (sameDay(date, now)) return `hoje às ${time}`
  if (sameDay(date, new Date(now.getTime() + 24 * HOUR))) return `amanhã às ${time}`
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)} às ${time}`
}
