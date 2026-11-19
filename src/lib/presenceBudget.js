/**
 * Limite do Supabase Realtime: cada conexão pode mandar no máximo 5 atualizações de presença
 * (track/untrack) a cada 30 s, somando TODOS os canais (sala da Turma, "online", Ao vivo).
 * Passou disso, o servidor FECHA o canal (ClientPresenceRateLimitReached) e a pessoa some para os outros.
 *
 * Aqui fica a conta compartilhada: usamos no máximo 4 (1 de margem).
 * - presenceWait(urgent): quanto esperar (ms) antes de poder mandar; 0 = pode agora.
 *   Atualização comum (posição) só usa até 2 vagas, para sobrar para as urgentes (entrar na sala, telão, online).
 * - presenceSent(): avisa que mandou um track/untrack agora.
 */
const WINDOW = 30000
const MAX = 4
const MAX_ROUTINE = 2
const sent = []

const prune = (now) => {
  while (sent.length && now - sent[0] >= WINDOW) sent.shift()
}

export function presenceWait(urgent = false) {
  const now = Date.now()
  prune(now)
  const max = urgent ? MAX : MAX_ROUTINE
  if (sent.length < max) return 0
  return sent[sent.length - max] + WINDOW - now + 300
}

export function presenceSent() {
  sent.push(Date.now())
}
