// Progresso de cada um na Turma 2.0 (moedas, mochila e o que já pegou em cada mapa).
// Fica guardado neste navegador (localStorage), separado por pessoa.

const KEY = (uid) => `t2-jogo-${uid ?? 'anon'}`
export const emptySave = () => ({ v: 1, moedas: 0, inv: [], pegos: {} })

export function loadSave(uid) {
  try {
    const s = JSON.parse(localStorage.getItem(KEY(uid)))
    if (s?.v === 1 && Array.isArray(s.inv)) return { ...emptySave(), ...s }
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
