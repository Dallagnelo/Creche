import { bagSize, classOf, EQUIP_SLOTS, ITEMS, MAX_MAGIC } from './data'

// Regras do inventário: o que pode ir em cada espaço e o que acontece ao trocar.
// ref = { from: 'eq', key: 'main' } ou { from: 'bag', key: 3 }

/** Mochila do tamanho certo (espaços vazios = null). */
export function normalizeBag(character) {
  const size = bagSize(character)
  const raw = character.bag ?? []
  const filled = raw.filter(Boolean)
  // se sobrou item além do tamanho (perdeu Força, largou a bolsa), mostra tudo e a mochila fica "lotada"
  if (filled.length > size) return filled
  // mantém cada item no espaço onde o jogador deixou; o que estava além do tamanho vai para o primeiro livre
  const bag = Array.from({ length: size }, (_, i) => raw[i] ?? null)
  for (const cell of raw.slice(size)) {
    if (!cell) continue
    const free = bag.findIndex((c) => c === null)
    if (free >= 0) bag[free] = cell
  }
  return bag
}

export const itemAt = (state, ref) => {
  if (!ref) return null
  if (ref.from === 'eq') return state.equipment[ref.key] ? { id: state.equipment[ref.key] } : null
  return state.bag[ref.key] ?? null
}

const slotDef = (key) => EQUIP_SLOTS.find((s) => s.key === key)
const magicCount = (equipment) => Object.values(equipment).filter((id) => id && ITEMS[id]?.magic).length

/**
 * Move um item de um lugar para outro. Devolve { equipment, bag, msg } ou { error }.
 * character: para as regras de classe (Druida sem metal) e Força (armadura pesada).
 */
export function moveItem(character, state, src, dst) {
  if (!src || (src.from === dst.from && src.key === dst.key)) return null
  const equipment = { ...state.equipment }
  const bag = state.bag.slice()
  const moving = itemAt(state, src)
  if (!moving) return null
  const item = ITEMS[moving.id]
  if (!item) return { error: 'Item desconhecido.' }

  if (dst.from === 'eq') {
    const def = slotDef(dst.key)
    if (!def.accepts.includes(item.slot)) return { error: `${item.name} não vai em ${def.label}.` }
    if (dst.key === 'off' && equipment.main && ITEMS[equipment.main]?.slot === 'twohand') return { error: `${ITEMS[equipment.main].name} ocupa as duas mãos.` }
    if (character.class === 'druida' && item.metal) return { error: 'O Druida não usa metal.' }
    const swapped = equipment[dst.key]
    const before = magicCount(equipment) - (src.from === 'eq' && ITEMS[equipment[src.key]]?.magic ? 1 : 0)
    if (item.magic && before - (swapped && ITEMS[swapped]?.magic ? 1 : 0) + 1 > MAX_MAGIC) return { error: `Limite de ${MAX_MAGIC} itens mágicos em uso.` }
    if (src.from === 'bag') {
      // de uma pilha, equipa só um
      if (moving.qty > 1) {
        const free = swapped ? bag.findIndex((c) => c === null) : -1
        if (swapped && free < 0) return { error: 'Mochila cheia para guardar o que estava no lugar.' }
        bag[src.key] = { id: moving.id, qty: moving.qty - 1 }
        if (swapped) bag[free] = { id: swapped }
      } else bag[src.key] = swapped ? { id: swapped } : null
    } else {
      const back = slotDef(src.key)
      if (swapped && !back.accepts.includes(ITEMS[swapped]?.slot)) return { error: 'Não dá para trocar esses dois de lugar.' }
      equipment[src.key] = swapped ?? null
    }
    equipment[dst.key] = moving.id
    let msg = `Equipou ${item.name}.`
    if (dst.key === 'main' && item.slot === 'twohand' && equipment.off) {
      const free = bag.findIndex((c) => c === null)
      if (free < 0) return { error: `Mochila cheia: não há onde guardar ${ITEMS[equipment.off].name}.` }
      bag[free] = { id: equipment.off }
      equipment.off = null
      msg += ' O que estava na outra mão foi para a mochila.'
    }
    if (item.strReq && (character.attrs?.for ?? 0) < item.strReq) msg += ` Sem Força +${item.strReq}: −2 casas de movimento.`
    return { equipment, bag, msg }
  }

  const target = bag[dst.key]
  if (dst.key >= bag.length) return { error: 'Espaço trancado.' }
  if (src.from === 'eq') {
    if (target) {
      const def = slotDef(src.key)
      if (!def.accepts.includes(ITEMS[target.id]?.slot)) return { error: 'Esse espaço já está ocupado.' }
      equipment[src.key] = target.id
    } else equipment[src.key] = null
    bag[dst.key] = { id: moving.id }
    return { equipment, bag, msg: `Guardou ${item.name} na mochila.` }
  }
  // dentro da mochila: junta pilhas iguais, senão troca de lugar
  if (target && target.id === moving.id && item.stack) {
    bag[dst.key] = { id: moving.id, qty: (target.qty ?? 1) + (moving.qty ?? 1) }
    bag[src.key] = null
  } else {
    bag[dst.key] = moving
    bag[src.key] = target ?? null
  }
  return { equipment, bag, msg: '' }
}

/** Tira uma unidade de um espaço da mochila. */
export function consumeOne(bag, index) {
  const next = bag.slice()
  const cell = next[index]
  if (!cell) return next
  next[index] = cell.qty > 1 ? { id: cell.id, qty: cell.qty - 1 } : null
  return next
}

/** Põe um item na mochila (empilha se já tiver). Devolve a mochila nova ou null se estiver cheia. */
export function addToBag(character, itemKey, qty = 1) {
  const bag = normalizeBag(character)
  const item = ITEMS[itemKey]
  if (item?.stack) {
    const at = bag.findIndex((c) => c && c.id === itemKey)
    if (at >= 0) {
      bag[at] = { id: itemKey, qty: (bag[at].qty ?? 1) + qty }
      return bag
    }
  }
  const free = bag.findIndex((c) => c === null)
  if (free < 0) return null
  bag[free] = qty > 1 ? { id: itemKey, qty } : { id: itemKey }
  return bag
}

export const bagUsed = (bag) => bag.filter(Boolean).length
export { classOf }
