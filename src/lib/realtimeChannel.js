import { supabase } from './supabase'

/*
 * O cliente do Supabase guarda um canal por nome: supabase.channel('x') devolve o canal que já existe
 * com esse nome, mesmo que ele esteja no meio de ser fechado. Quem sai e volta rápido para o mesmo quarto
 * (ou vem da Home, que espia a sala) pegava esse canal "morrendo": logo depois ele fechava de vez e
 * a pessoa ficava sozinha no quarto, vendo só o próprio boneco.
 * Aqui o canal antigo termina de fechar antes de o novo ser criado.
 */
const closing = new Map() // nome do canal -> promessa de que terminou de fechar
const LEAVE_TIMEOUT = 3000

export function releaseChannel(channel) {
  if (!channel) return Promise.resolve()
  const topic = channel.topic
  const timeout = new Promise((resolve) => setTimeout(() => resolve('timed out'), LEAVE_TIMEOUT))
  const done = Promise.race([supabase.removeChannel(channel).catch(() => 'error'), timeout]).then((status) => {
    // o servidor não respondeu: desmonta à força para esse canal não ser reaproveitado
    if (status !== 'ok' && supabase.getChannels().includes(channel)) {
      try {
        channel.teardown()
      } catch {
        /* já estava desmontado */
      }
      if (supabase.getChannels().includes(channel)) supabase.realtime._remove?.(channel)
    }
  })
  closing.set(topic, done)
  done.finally(() => {
    if (closing.get(topic) === done) closing.delete(topic)
  })
  return done
}

/** Cria um canal novo com esse nome, esperando um canal antigo de mesmo nome terminar de fechar. */
export async function openChannel(name, params) {
  const topic = `realtime:${name}`
  for (let i = 0; i < 5; i += 1) {
    if (closing.has(topic)) {
      await closing.get(topic)
      continue
    }
    const stale = supabase.getChannels().find((c) => c.topic === topic)
    if (!stale) break
    await releaseChannel(stale)
  }
  return supabase.channel(name, params)
}
