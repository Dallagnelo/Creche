import { useEffect, useRef, useState } from 'react'
import { ATTRS, classOf, derived, EQUIP_SLOTS, fmtMod, ITEMS, MAX_MAGIC, RARITY, XP_FOR_LEVEL, bagSize } from '../../lib/rpg/data'
import { bagUsed, consumeOne, itemAt, moveItem, normalizeBag } from '../../lib/rpg/inventory'
import RpgIcon from './RpgIcon'

const KIND = { weapon: 'Arma', twohand: 'Arma de duas mãos', offhand: 'Mão secundária', head: 'Cabeça', body: 'Armadura', cape: 'Capa', hands: 'Mãos', feet: 'Pés', ring: 'Anel', neck: 'Amuleto', none: 'Mochila' }
const roll = (count, sides) => Array.from({ length: count }, () => 1 + Math.floor(Math.random() * sides)).reduce((a, b) => a + b, 0)

/**
 * Ficha com inventário: espaços de equipamento, mochila (arrastar ou tocar e tocar), descrição do item,
 * atributos (tocar rola um teste) e habilidades. Só o dono mexe (editable).
 */
export default function CharacterSheet({ character, editable, onSave, onRollAttr }) {
  const cls = classOf(character.class)
  const [state, setState] = useState(() => ({ equipment: { ...character.equipment }, bag: normalizeBag(character) }))
  const [sel, setSel] = useState(null)
  const [msg, setMsg] = useState({ text: '', bad: false })
  const dragFrom = useRef(null)

  // a ficha mudou no banco (mestre deu um item, outra aba): recarrega
  useEffect(() => {
    setState({ equipment: { ...character.equipment }, bag: normalizeBag(character) })
    setSel(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character.id, JSON.stringify(character.equipment), JSON.stringify(character.bag), character.attrs?.for])

  const stats = derived({ ...character, equipment: state.equipment })
  const size = bagSize({ ...character, bag: state.bag })
  const selItem = itemAt(state, sel)
  const selData = selItem ? ITEMS[selItem.id] : null

  async function persist(next, extra = {}, text = '') {
    const prev = state
    setState({ equipment: next.equipment, bag: next.bag })
    setSel(null)
    setMsg({ text, bad: false })
    try {
      await onSave({ equipment: next.equipment, bag: next.bag.filter(Boolean).length ? next.bag : [], ...extra })
    } catch (err) {
      setState(prev)
      setMsg({ text: err.message ?? 'Não deu para salvar.', bad: true })
    }
  }

  function move(src, dst) {
    const result = moveItem(character, state, src, dst)
    if (!result) return
    if (result.error) {
      setMsg({ text: result.error, bad: true })
      setSel(null)
      return
    }
    persist(result, {}, result.msg)
  }

  function pick(ref) {
    if (!editable) {
      setSel(itemAt(state, ref) ? ref : null)
      return
    }
    if (sel && !(sel.from === ref.from && sel.key === ref.key)) return move(sel, ref)
    if (sel) return setSel(null)
    if (itemAt(state, ref)) {
      setSel(ref)
      setMsg({ text: '', bad: false })
    }
  }

  const handlers = (ref) => ({
    onClick: () => pick(ref),
    draggable: editable && !!itemAt(state, ref),
    onDragStart: (e) => {
      try {
        e.dataTransfer.setData('text/plain', 'item')
      } catch {
        /* alguns navegadores não deixam */
      }
      dragFrom.current = ref
      setSel(ref)
    },
    onDragOver: (e) => editable && e.preventDefault(),
    onDrop: (e) => {
      e.preventDefault()
      const src = dragFrom.current
      dragFrom.current = null
      if (src) move(src, ref)
    },
  })

  function useSelected() {
    if (!sel || sel.from !== 'bag' || !selData?.usable) return
    const bag = consumeOne(state.bag, sel.key)
    if (selData.heal) {
      const [count, sides, plus] = selData.heal
      const healed = roll(count, sides) + plus
      const hp = Math.min(character.hp_max, character.hp + healed)
      persist({ equipment: state.equipment, bag }, { hp }, `Tomou ${selData.name} e curou ${hp - character.hp} de vida.`)
    } else if (selData.effort) {
      const effort = Math.min(character.effort_max, character.effort + selData.effort)
      persist({ equipment: state.equipment, bag }, { effort }, `Tomou ${selData.name}: +${effort - character.effort} de Esforço.`)
    }
  }

  const level = character.level ?? 1
  const nextXp = XP_FOR_LEVEL[Math.min(10, level + 1)]
  const prevXp = XP_FOR_LEVEL[level]
  const xpPct = level >= 10 ? 100 : Math.max(0, Math.min(100, ((character.xp - prevXp) / (nextXp - prevXp)) * 100))
  const slotClass = (ref, item) =>
    `rpg-slot${item ? '' : ' is-empty'}${sel && sel.from === ref.from && sel.key === ref.key ? ' is-sel' : ''}${sel && !item && editable ? ' is-target' : ''}`

  return (
    <div className="rpg-cols">
      <section className="rpg-panel rpg-col-side" aria-labelledby="sheet-name" style={{ flexBasis: 380 }}>
        <div style={{ textAlign: 'center' }}>
          <h2 id="sheet-name" style={{ fontSize: 26 }}>{character.name}</h2>
          <p className="rpg-ink-soft rpg-italic">
            {cls?.name} de nível {level}
            {character.path ? ` · ${cls?.paths.find((p) => p.id === character.path)?.name}` : ''}
            {character.status === 'caido' ? ' · Caído' : character.status === 'morto' ? ' · Morto' : ''}
          </p>
          <hr className="rpg-divider" />
        </div>

        <div className="rpg-medals">
          <div className="rpg-medal"><b><RpgIcon name="checked-shield" />{stats.defense}</b><span>Defesa</span></div>
          <div className="rpg-medal"><b><RpgIcon name="crossed-swords" />{fmtMod(stats.attack)}</b><span>Ataque</span></div>
          <div className="rpg-medal"><b style={{ fontSize: 13 }}><RpgIcon name="dice-twenty-faces-twenty" />{stats.damage}</b><span>Dano</span></div>
          <div className="rpg-medal is-blood"><b style={{ fontSize: 14 }}><RpgIcon name="heart-plus" />{character.hp}/{character.hp_max}</b><span>Vida</span></div>
        </div>

        <div className="rpg-split" style={{ fontSize: 14 }}>
          <span>Esforço</span>
          <div className="rpg-bar is-effort" aria-hidden="true"><i style={{ width: `${(character.effort / Math.max(1, character.effort_max)) * 100}%` }} /></div>
          <b>{character.effort}/{character.effort_max}</b>
        </div>
        <div className="rpg-split" style={{ fontSize: 14 }}>
          <span>XP</span>
          <div className="rpg-bar is-xp" aria-hidden="true"><i style={{ width: `${xpPct}%` }} /></div>
          <b>{level >= 10 ? 'máx.' : `${character.xp}/${nextXp}`}</b>
        </div>

        <div className="rpg-eq-grid">
          {EQUIP_SLOTS.map((slot) => {
            const ref = { from: 'eq', key: slot.key }
            const id = state.equipment[slot.key]
            const item = id ? ITEMS[id] : null
            return (
              <div key={slot.key} className="rpg-eq-cell" style={slot.key === 'feet' ? { gridColumn: 2 } : undefined}>
                <button type="button" className={slotClass(ref, item)} style={item ? { '--rar': RARITY[item.rarity].color } : undefined} aria-label={`${slot.label}: ${item ? item.name : 'vazio'}`} {...handlers(ref)}>
                  <RpgIcon name={item ? item.icon : slot.ghost} />
                </button>
                <span>{slot.label}</span>
              </div>
            )
          })}
        </div>
        <div className="rpg-split rpg-ink-soft" style={{ fontSize: 14 }}>
          <span>Itens mágicos em uso: <b style={{ color: 'var(--ink)' }}>{stats.magic}/{MAX_MAGIC}</b></span>
          {editable && <span className="rpg-italic">Arraste, ou toque no item e depois no espaço</span>}
        </div>
      </section>

      <div className="rpg-col-main">
        <section className="rpg-panel-dark" aria-labelledby="bag-title">
          <div className="rpg-split">
            <h2 id="bag-title" className="rpg-row" style={{ gap: 10 }}><RpgIcon name="knapsack" />Mochila</h2>
            <div className="rpg-row" style={{ gap: 16, fontFamily: 'var(--display)', fontWeight: 700 }}>
              <span className="rpg-row" style={{ gap: 6, color: 'var(--gold-hi)' }}><RpgIcon name="coins" />{character.gold} ouro</span>
              <span>{bagUsed(state.bag)}/{size}</span>
            </div>
          </div>
          <div className="rpg-bag">
            {state.bag.map((cell, i) => {
              const ref = { from: 'bag', key: i }
              const item = cell ? ITEMS[cell.id] : null
              return (
                <button key={i} type="button" className={slotClass(ref, item)} style={item ? { '--rar': RARITY[item.rarity].color } : undefined} aria-label={item ? `${item.name}${cell.qty > 1 ? `, ${cell.qty}` : ''}` : 'Espaço vazio'} {...handlers(ref)}>
                  {item && <RpgIcon name={item.icon} />}
                  {cell?.qty > 1 && <span className="rpg-qty">x{cell.qty}</span>}
                </button>
              )
            })}
            {Array.from({ length: Math.max(0, 12 - state.bag.length) }, (_, i) => (
              <span key={`lock${i}`} className="rpg-slot is-locked" aria-hidden="true" />
            ))}
          </div>
          <span className="rpg-soft rpg-italic" style={{ fontSize: 14 }}>8 + Força {fmtMod(character.attrs?.for ?? 0)} = {8 + (character.attrs?.for ?? 0)} espaços. A Bolsa devoradora abre mais 6.</span>
        </section>

        <section className="rpg-panel" aria-labelledby="item-title" aria-live="polite" style={{ minHeight: 160 }}>
          <h2 id="item-title">Descrição do item</h2>
          {selData ? (
            <div className="rpg-row" style={{ alignItems: 'flex-start', gap: 18 }}>
              <span className="rpg-slot" style={{ '--rar': RARITY[selData.rarity].color, width: 76, height: 76, cursor: 'default' }}>
                <RpgIcon name={selData.icon} style={{ width: 52, height: 52 }} />
              </span>
              <div style={{ flex: '1 1 240px', display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                <b style={{ fontFamily: 'var(--display)', fontSize: 20 }}>{selData.name}</b>
                <span style={{ fontFamily: 'var(--display)', fontSize: 13, fontWeight: 700, color: selData.rarity ? RARITY[selData.rarity].color : 'var(--ink-soft)' }}>
                  {RARITY[selData.rarity].label} · {KIND[selData.slot]}
                </span>
                <b>{selData.stat}</b>
                {selData.desc && <span className="rpg-italic rpg-ink-soft">{selData.desc}</span>}
              </div>
              {editable && selData.usable && sel?.from === 'bag' && (
                <button type="button" className="rpg-btn" onClick={useSelected}>Usar</button>
              )}
            </div>
          ) : (
            <p className="rpg-italic rpg-ink-soft">Toque num item para ler a descrição.</p>
          )}
          <p className={`rpg-msg ${msg.bad ? 'is-bad' : 'is-good'}`}>{msg.text}</p>
        </section>

        <section className="rpg-panel" aria-labelledby="attr-title">
          <div className="rpg-split">
            <h2 id="attr-title">Atributos</h2>
            {editable && <span className="rpg-ink-soft rpg-italic" style={{ fontSize: 14 }}>Toque para rolar um teste (d20 + atributo)</span>}
          </div>
          <div className="rpg-attr-grid">
            {ATTRS.map((attr) =>
              editable ? (
                <button key={attr.id} type="button" className="rpg-attr" onClick={() => onRollAttr?.(attr)} style={attr.id === cls?.attr ? { borderColor: '#b8860b', borderWidth: 3 } : undefined}>
                  <span>{attr.name}</span>
                  <b>{fmtMod(character.attrs?.[attr.id] ?? 0)}</b>
                </button>
              ) : (
                <div key={attr.id} className="rpg-attr">
                  <span>{attr.name}</span>
                  <b>{fmtMod(character.attrs?.[attr.id] ?? 0)}</b>
                </div>
              ),
            )}
          </div>
          {character.wounds > 0 && <p className="rpg-msg is-bad">{character.wounds} {character.wounds === 1 ? 'Ferida' : 'Feridas'}: −1 num atributo cada, até um descanso longo.</p>}
        </section>

        {cls && (
          <section className="rpg-panel" aria-labelledby="hab-title">
            <h2 id="hab-title">Habilidades</h2>
            <ul className="rpg-list">
              {cls.abilities.map((ab) => (
                <li key={ab.name} className="rpg-roll" style={{ opacity: ab.level > level ? 0.5 : 1 }}>
                  <span style={{ flex: 1 }}>
                    <b>{ab.name}</b>
                    <span className="rpg-ink-soft"> — {ab.desc}</span>
                  </span>
                  <span className="rpg-ink-soft" style={{ whiteSpace: 'nowrap', fontFamily: 'var(--display)', fontSize: 13 }}>
                    {ab.level > level ? `Nível ${ab.level}` : ab.cost ? `${ab.cost} Esforço` : 'Sempre'}
                  </span>
                </li>
              ))}
            </ul>
            {level >= 3 && !character.path && <p className="rpg-ink-soft rpg-italic">Nível 3: peça ao mestre para escolher seu caminho ({cls.paths.map((p) => p.name).join(' ou ')}).</p>}
            {character.path && (
              <ul className="rpg-list">
                {cls.paths.find((p) => p.id === character.path)?.abilities.map((text, i) => (
                  <li key={text} className="rpg-roll" style={{ opacity: [3, 7, 10][i] > level ? 0.5 : 1 }}>
                    <span>{text}</span>
                    <span className="rpg-ink-soft" style={{ fontFamily: 'var(--display)', fontSize: 13 }}>Nível {[3, 7, 10][i]}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
