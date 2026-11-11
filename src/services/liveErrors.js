import { supabase } from '../lib/supabase'

// Registra por que uma conexão de live falhou (tabela live_errors; veja supabase/migracao-diagnostico-live.sql).
// Nunca atrapalha a live: se a migração não foi rodada ou der erro, só ignora.
let lastLogAt = 0

export async function logLiveError({ userName, hostName, reason, detail }) {
  const now = Date.now()
  if (now - lastLogAt < 5000) return // no máximo 1 registro a cada 5 s
  lastLogAt = now
  try {
    const { error } = await supabase.from('live_errors').insert({
      user_name: userName ?? null,
      host_name: hostName ?? null,
      reason,
      detail: { ...detail, userAgent: navigator.userAgent, online: navigator.onLine, at: new Date().toISOString() },
    })
    if (error) console.warn('Diagnóstico de live indisponível:', error.message)
  } catch {
    /* ignora */
  }
}
