import { formatLiveTime } from './format'

// Conquistas do Cine turma, calculadas a partir dos números salvos (não precisa de tabela própria).
const BADGES = [
  { id: 'first-ticket', icon: '🎟️', title: 'Primeira sessão', test: (s) => s.sessions >= 1 },
  { id: 'regular', icon: '🎬', title: 'Frequentador do cinema', hint: '10 sessões', test: (s) => s.sessions >= 10 },
  { id: 'marathon', icon: '🍿', title: 'Maratonista', hint: '3 horas assistindo', test: (s) => s.seconds >= 3 * 3600 },
  { id: 'first-popcorn', icon: '🎯', title: 'Primeira pipoca jogada', test: (s) => s.popcorn_thrown >= 1 },
  { id: 'sniper', icon: '🏹', title: 'Atirador de pipoca', hint: '50 pipocas jogadas', test: (s) => s.popcorn_thrown >= 50 },
  { id: 'target', icon: '🥴', title: 'Alvo favorito', hint: 'levou 50 pipocas', test: (s) => s.popcorn_received >= 50 },
]

/** Conquistas que a pessoa já tem. */
export function cinemaBadges(stats) {
  if (!stats) return []
  return BADGES.filter((badge) => badge.test(stats))
}

/** Resumo em uma linha: "🎟️ 23 sessões · 5h12 assistindo". */
export function cinemaSummary(stats) {
  if (!stats || (!stats.sessions && !stats.seconds)) return null
  const parts = [`🎟️ ${stats.sessions} ${stats.sessions === 1 ? 'sessão' : 'sessões'}`]
  if (stats.seconds > 0) parts.push(`${formatLiveTime(stats.seconds)} assistindo`)
  if (stats.popcorn_thrown > 0) parts.push(`🍿 ${stats.popcorn_thrown} jogadas`)
  return parts.join(' · ')
}
