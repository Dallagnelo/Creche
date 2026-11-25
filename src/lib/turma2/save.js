// Progresso de cada um na Turma 2.0 (moedas, mochila, XP das habilidades, horta, entregas…).
// Fica neste navegador (localStorage) e também no Supabase (tabela turma2_saves; veja
// supabase/migracao-turma2-progresso.sql), para não perder ao trocar de computador.
// xp: { pesca: 120, … } · horta: { mapa: { "x,y": { planta, t, regado } } } · consertos: { mapa: { id: quando } }
// entrega: { mapa, de, para, nome, ate } · veste: habilidade cujo visual está vestindo · kit: já ganhou o kit inicial

const KEY = (uid) => `t2-jogo-${uid ?? 'anon'}`
// status: por enquanto só visual (vida em meios corações de 5, fome em meias coxas de 5, o resto de 0 a 1)
export const HOT_SLOTS = 8
export const DEFAULT_STATUS = { nivel: 1, xp: 0.35, vida: 10, fome: 8, energia: 0.8, humor: 0.65 }
export const emptySave = () => ({ v: 1, at: 0, moedas: 0, inv: [], pegos: {}, hot: Array(HOT_SLOTS).fill(null), sel: 0, status: { ...DEFAULT_STATUS }, xp: {}, horta: {}, consertos: {}, entrega: null, veste: null, kit: 0 })

/** completa um save (de outra versão, ou vindo do banco) */
export function fixSave(s) {
  if (s?.v !== 1 || !Array.isArray(s.inv)) return null
  const base = emptySave()
  const hot = Array.from({ length: HOT_SLOTS }, (_, i) => s.hot?.[i] ?? null)
  return { ...base, ...s, hot, status: { ...base.status, ...s.status }, xp: { ...s.xp }, horta: { ...s.horta }, consertos: { ...s.consertos } }
}

export function loadSave(uid) {
  try {
    const s = fixSave(JSON.parse(localStorage.getItem(KEY(uid))))
    if (s) return s
  } catch {
    /* nada salvo */
  }
  return emptySave()
}

export function writeSave(uid, save) {
  try {
    localStorage.setItem(KEY(uid), JSON.stringify(save))
  } catch {
    /* sem espaço: segue sem salvar */
  }
}

export const isTaken = (save, room, id) => !!save.pegos[room]?.[id]

/** pegou um item do mapa: moeda soma no contador; o resto vai para a mochila (empilha os iguais) */
export function addItem(save, room, item) {
  const pegos = { ...save.pegos, [room]: { ...save.pegos[room], [item.id]: 1 } }
  if (item.tipo === 'moeda') return { ...save, pegos, moedas: save.moedas + (item.valor || 1) }
  const key = `${item.src}/${item.t}/${item.n}/${item.nome}`
  const has = save.inv.find((it) => it.key === key)
  const inv = has
    ? save.inv.map((it) => (it.key === key ? { ...it, qtd: it.qtd + 1 } : it))
    : [...save.inv, { key, src: item.src, t: item.t, n: item.n, nome: item.nome || 'Item', desc: item.desc || '', qtd: 1, quando: Date.now() }]
  return { ...save, pegos, inv }
}

export function dropItem(save, key) {
  return { ...save, inv: save.inv.flatMap((it) => (it.key !== key ? [it] : it.qtd > 1 ? [{ ...it, qtd: it.qtd - 1 }] : [])) }
}

/** barra rápida: põe o item num espaço (se já estava em outro, sai de lá) */
export function setHot(save, slot, key) {
  const hot = save.hot.map((k) => (k === key && key !== null ? null : k))
  while (hot.length <= slot) hot.push(null)
  hot[slot] = key
  return { ...save, hot }
}
