import { useMemo, useState } from 'react'
import { classOf, ITEMS, maxStats, MONSTERS, monsterOf, RARITY, XP_FOR_LEVEL } from '../../lib/rpg/data'
import { addToBag } from '../../lib/rpg/inventory'
import {
  addEnemy, addLoot, addMember, openRound, removeEnemy, removeLoot, removeMember, resolveRound, roll, updateCampaign, updateCharacter, updateEnemy,
} from '../../services/rpg'
import RpgIcon from './RpgIcon'
import { roundState } from './RoundPanel'

/** Painel do mestre: inimigos, ações da rodada, resolução, ajustes do grupo, baú do tesouro e jogadores. */
export default function MasterPanel({ table, profiles, onReload }) {
  const { campaign, characters, current, actions, rolls, enemies, loot, members } = table
  const [msg, setMsg] = useState({ text: '', bad: false })
  const [busy, setBusy] = useState(false)

  async function run(fn, okText) {
    setBusy(true)
    setMsg({ text: '', bad: false })
    try {
      await fn()
      if (okText) setMsg({ text: okText, bad: false })
      await onReload()
    } catch (err) {
      setMsg({ text: err.message ?? 'Deu errado.', bad: true })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <p className={`rpg-msg ${msg.bad ? 'is-bad' : 'is-good'}`} aria-live="polite" style={{ color: msg.bad ? '#ff9b85' : '#b6e39a', minHeight: msg.text ? 20 : 0 }}>{msg.text}</p>
      <div className="rpg-cols">
        <div className="rpg-col-main">
          <RoundSection campaign={campaign} current={current} characters={characters} actions={actions} rolls={rolls} busy={busy} run={run} />
          <ChestSection campaign={campaign} characters={characters} loot={loot} busy={busy} run={run} />
        </div>
        <div className="rpg-col-side">
          <EnemySection campaign={campaign} enemies={enemies} players={characters.filter((c) => c.status !== 'morto').length} busy={busy} run={run} />
          <PartySection characters={characters} busy={busy} run={run} />
          <MembersSection campaign={campaign} members={members} profiles={profiles} busy={busy} run={run} />
        </div>
      </div>
    </div>
  )
}

function RoundSection({ campaign, current, characters, actions, rolls, busy, run }) {
  const [resolution, setResolution] = useState('')
  const [scene, setScene] = useState('')
  const [kind, setKind] = useState('exploracao')
  const [days, setDays] = useState(campaign.round_days)
  const [hidden, setHidden] = useState(null)
  const state = roundState(current, characters, actions)
  const nextNumber = (current?.number ?? 0) + 1
  const roundRolls = current ? rolls.filter((r) => r.round_id === current.id) : []

  function publish() {
    if (!scene.trim()) return
    run(async () => {
      if (current && current.status === 'aberta') await resolveRound(current.id, resolution || 'A rodada terminou.')
      await openRound({ campaignId: campaign.id, number: nextNumber, kind, scene, days })
      setResolution('')
      setScene('')
    }, `Rodada ${nextNumber} aberta. O grupo já pode jogar.`)
  }

  async function secretRoll() {
    try {
      setHidden(await roll({ campaignId: campaign.id, sides: 20, label: 'Rolagem do mestre', roundId: current?.id ?? null, secret: true }))
    } catch {
      /* mostra nada */
    }
  }

  return (
    <section className="rpg-panel" aria-labelledby="m-round">
      <div className="rpg-split">
        <h2 id="m-round">{current ? `Rodada ${current.number}` : 'Começar a campanha'}</h2>
        <div className="rpg-row">
          {current && (
            <span className="rpg-ink-soft" style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 14 }}>
              {state === 'open' ? `${actions.length} de ${characters.filter((c) => c.status !== 'morto').length} jogaram` : state === 'closed' ? 'Fechada: hora de resolver' : 'Resolvida'}
            </span>
          )}
          <button type="button" className="rpg-btn-ghost" onClick={secretRoll}>Rolar escondido (d20)</button>
          {hidden && <b style={{ fontFamily: 'var(--display)' }}>{hidden.total}</b>}
        </div>
      </div>

      {current && current.status === 'aberta' && (
        <>
          <div className="rpg-scroll">
            <table className="rpg-table">
              <thead>
                <tr><th scope="col">Quem</th><th scope="col">Ação</th><th scope="col">Dados</th></tr>
              </thead>
              <tbody>
                {characters.filter((c) => c.status !== 'morto').map((c) => {
                  const a = actions.find((x) => x.character_id === c.id)
                  const rs = roundRolls.filter((r) => r.character_id === c.id)
                  return (
                    <tr key={c.id}>
                      <td><b style={{ fontFamily: 'var(--display)' }}>{c.name}</b><br /><span className="rpg-ink-soft" style={{ fontSize: 13 }}>{classOf(c.class)?.name} · {c.hp}/{c.hp_max}</span></td>
                      <td>
                        {a ? (
                          <>
                            {a.action}
                            {a.move && <><br /><i className="rpg-ink-soft">Movimento: {a.move}</i></>}
                            {a.plan_b && <><br /><i className="rpg-ink-soft">Plano B: {a.plan_b}</i></>}
                            {a.reaction && <><br /><i className="rpg-ink-soft">Reação: {a.reaction}</i></>}
                          </>
                        ) : (
                          <i className="rpg-ink-soft">Ainda não jogou</i>
                        )}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {rs.length ? rs.map((r) => <div key={r.id}>{r.label || r.dice}: <b>{r.total}</b></div>) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <label className="rpg-field">
            O que aconteceu (todos vão ler)
            <textarea className="rpg-input" rows={5} value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder="Conte o resultado das ações desta rodada." />
          </label>
        </>
      )}

      <hr className="rpg-divider" />
      <h3>{current ? `Próxima cena (rodada ${nextNumber})` : 'Primeira cena'}</h3>
      <label className="rpg-field">
        Cena
        <textarea className="rpg-input" rows={4} value={scene} onChange={(e) => setScene(e.target.value)} placeholder="Descreva onde o grupo está e o que está acontecendo. Termine com: o que vocês fazem?" />
      </label>
      <div className="rpg-row" style={{ alignItems: 'flex-end' }}>
        <label className="rpg-field" style={{ width: 170 }}>
          Tipo
          <select className="rpg-input" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="exploracao">Exploração</option>
            <option value="combate">Combate</option>
          </select>
        </label>
        <label className="rpg-field" style={{ width: 130 }}>
          Prazo
          <select className="rpg-input" value={days} onChange={(e) => setDays(Number(e.target.value))}>
            {[1, 2, 3, 4, 5, 7].map((d) => <option key={d} value={d}>{d} {d === 1 ? 'dia' : 'dias'}</option>)}
          </select>
        </label>
        <button type="button" className="rpg-btn" disabled={busy || !scene.trim()} onClick={publish} style={{ marginLeft: 'auto' }}>
          {current?.status === 'aberta' ? `Publicar e abrir rodada ${nextNumber}` : `Abrir rodada ${nextNumber}`}
        </button>
      </div>
    </section>
  )
}

function EnemySection({ campaign, enemies, players, busy, run }) {
  const [key, setKey] = useState('goblin')
  const [count, setCount] = useState(1)
  const [dmg, setDmg] = useState({})

  function add() {
    const m = monsterOf(key)
    run(async () => {
      for (let i = 0; i < count; i += 1) {
        const hp = m.boss ? Math.round((m.hp * Math.max(3, players)) / 4) : m.hp
        await addEnemy(campaign.id, { name: count > 1 ? `${m.name} ${i + 1}` : m.name, monsterKey: key, hp, defense: m.def })
      }
    })
  }

  return (
    <section className="rpg-panel-stone" aria-labelledby="m-enemies">
      <h2 id="m-enemies">Inimigos</h2>
      {enemies.length === 0 && <p className="rpg-soft rpg-italic">Nenhum inimigo em cena.</p>}
      <ul className="rpg-list">
        {enemies.map((e) => {
          const m = monsterOf(e.monster_key)
          const v = dmg[e.id] ?? ''
          const apply = (sign) => {
            const n = Number(v) || 0
            if (!n) return
            run(() => updateEnemy(e.id, { hp: Math.max(0, Math.min(e.hp_max, e.hp - sign * n)) }))
            setDmg({ ...dmg, [e.id]: '' })
          }
          return (
            <li key={e.id} style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 8, borderBottom: '1px solid rgba(168,130,63,.35)' }}>
              <div className="rpg-split">
                <span className="rpg-row" style={{ gap: 8 }}><RpgIcon name={m?.icon ?? 'skull-crossed-bones'} style={{ color: '#8fd16a' }} /><b style={{ fontFamily: 'var(--display)' }}>{e.name}</b></span>
                <b style={{ color: e.hp <= 0 ? '#ff9b85' : 'var(--gold-hi)' }}>{e.hp <= 0 ? 'Derrotado' : `${e.hp}/${e.hp_max}`}</b>
              </div>
              <div className="rpg-bar" aria-hidden="true"><i style={{ width: `${(Math.max(0, e.hp) / e.hp_max) * 100}%` }} /></div>
              <div className="rpg-row rpg-compact">
                <label className="rpg-sr" htmlFor={`d-${e.id}`}>Valor para {e.name}</label>
                <input id={`d-${e.id}`} className="rpg-input" type="number" min={0} value={v} onChange={(ev) => setDmg({ ...dmg, [e.id]: ev.target.value })} />
                <button type="button" className="rpg-btn" disabled={busy} onClick={() => apply(1)}>Dano</button>
                <button type="button" className="rpg-btn-ghost" disabled={busy} onClick={() => apply(-1)}>Curar</button>
                <button type="button" className="rpg-btn-ghost" disabled={busy} onClick={() => run(() => removeEnemy(e.id))} aria-label={`Tirar ${e.name} de cena`}>✕</button>
              </div>
              {m && <span className="rpg-soft" style={{ fontSize: 13 }}>Def {e.defense} · ataque +{m.atk} ({m.dmg}) · {m.tactic}</span>}
            </li>
          )
        })}
      </ul>
      <div className="rpg-row" style={{ alignItems: 'flex-end' }}>
        <label className="rpg-field" style={{ flex: '1 1 180px' }}>
          Monstro do bestiário
          <select className="rpg-input" value={key} onChange={(e) => setKey(e.target.value)}>
            {Object.entries(MONSTERS).map(([k, m]) => (
              <option key={k} value={k}>{m.name} · custo {m.cost}{m.boss ? ' · chefe' : ''}</option>
            ))}
          </select>
        </label>
        <label className="rpg-field" style={{ width: 70 }}>
          Qtd.
          <input className="rpg-input" type="number" min={1} max={12} value={count} onChange={(e) => setCount(Math.max(1, Math.min(12, Number(e.target.value) || 1)))} />
        </label>
        <button type="button" className="rpg-btn-gold" disabled={busy} onClick={add}>Pôr em cena</button>
      </div>
    </section>
  )
}

function PartySection({ characters, busy, run }) {
  const [val, setVal] = useState({})
  if (!characters.length) return null
  return (
    <section className="rpg-panel" aria-labelledby="m-party">
      <h2 id="m-party">O grupo</h2>
      <ul className="rpg-list">
        {characters.map((c) => {
          const cls = classOf(c.class)
          const v = Number(val[c.id]) || 0
          const nextXp = XP_FOR_LEVEL[c.level + 1]
          const canLevel = c.level < 10 && c.xp >= nextXp
          const set = (patch) => {
            run(() => updateCharacter(c.id, patch))
            setVal({ ...val, [c.id]: '' })
          }
          const levelUp = () => {
            const level = c.level + 1
            const { hp, effort } = maxStats(cls, c.attrs, level)
            set({ level, hp_max: hp, hp: Math.min(hp, c.hp + (hp - c.hp_max)), effort_max: effort, effort })
          }
          return (
            <li key={c.id} className="rpg-card" style={{ boxShadow: 'none' }}>
              <div className="rpg-split">
                <b style={{ fontSize: 17 }}>{c.name}</b>
                <span className="rpg-ink-soft rpg-italic">{cls?.name} nv {c.level} · {c.status === 'ok' ? 'de pé' : c.status}</span>
              </div>
              <span className="rpg-ink-soft" style={{ fontSize: 14 }}>
                Vida {c.hp}/{c.hp_max} · Esforço {c.effort}/{c.effort_max} · XP {c.xp} · {c.gold} ouro
              </span>
              <div className="rpg-row rpg-compact">
                <label className="rpg-sr" htmlFor={`v-${c.id}`}>Valor para {c.name}</label>
                <input id={`v-${c.id}`} className="rpg-input" type="number" min={0} value={val[c.id] ?? ''} onChange={(e) => setVal({ ...val, [c.id]: e.target.value })} />
                <button type="button" className="rpg-btn" disabled={busy || !v} onClick={() => { const hp = Math.max(0, c.hp - v); set({ hp, status: hp === 0 && c.status === 'ok' ? 'caido' : c.status }) }}>Dano</button>
                <button type="button" className="rpg-btn-ghost" disabled={busy || !v} onClick={() => set({ hp: Math.min(c.hp_max, c.hp + v), status: c.status === 'caido' ? 'ok' : c.status })}>Curar</button>
                <button type="button" className="rpg-btn-ghost" disabled={busy || !v} onClick={() => set({ xp: c.xp + v })}>+XP</button>
                <button type="button" className="rpg-btn-ghost" disabled={busy || !v} onClick={() => set({ gold: c.gold + v })}>+Ouro</button>
              </div>
              <div className="rpg-row rpg-compact">
                <label className="rpg-field" style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  Estado
                  <select className="rpg-input" value={c.status} onChange={(e) => set({ status: e.target.value })} style={{ width: 'auto', minHeight: 36 }}>
                    <option value="ok">De pé</option>
                    <option value="caido">Caído</option>
                    <option value="morto">Morto</option>
                  </select>
                </label>
                <button type="button" className="rpg-btn-ghost" disabled={busy} onClick={() => set({ effort: c.effort_max, hp: c.hp_max, wounds: 0 })}>Descanso longo</button>
                {canLevel && <button type="button" className="rpg-btn-gold" disabled={busy} onClick={levelUp}>Subir para nível {c.level + 1}</button>}
                {c.level >= 3 && !c.path && cls && (
                  <select className="rpg-input" value="" onChange={(e) => e.target.value && set({ path: e.target.value })} style={{ width: 'auto', minHeight: 36 }} aria-label={`Caminho de ${c.name}`}>
                    <option value="">Escolher caminho…</option>
                    {cls.paths.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function ChestSection({ campaign, characters, loot, busy, run }) {
  const [sel, setSel] = useState(null)
  const [q, setQ] = useState('')
  const [rarity, setRarity] = useState(-1)
  const [gold, setGold] = useState('')
  const alive = characters.filter((c) => c.status !== 'morto')
  const catalog = useMemo(
    () => Object.entries(ITEMS).filter(([, it]) => (rarity < 0 || it.rarity === rarity) && (!q.trim() || it.name.toLowerCase().includes(q.trim().toLowerCase()))),
    [q, rarity],
  )
  const selRow = loot.find((l) => l.id === sel)

  function give(c) {
    if (!selRow) return
    const bag = addToBag(c, selRow.item_key, selRow.qty)
    if (!bag) return run(async () => { throw new Error(`A mochila de ${c.name} está cheia.`) })
    setSel(null)
    run(async () => {
      await updateCharacter(c.id, { bag })
      await removeLoot(selRow.id)
    }, `${ITEMS[selRow.item_key]?.name} foi para a mochila de ${c.name}.`)
  }

  function split() {
    if (!campaign.chest_gold || !alive.length) return
    const each = Math.floor(campaign.chest_gold / alive.length)
    if (!each) return
    run(async () => {
      for (const c of alive) await updateCharacter(c.id, { gold: c.gold + each })
      await updateCampaign(campaign.id, { chest_gold: campaign.chest_gold - each * alive.length })
    }, `${each} ouro para cada um.`)
  }

  return (
    <section className="rpg-panel-dark" aria-labelledby="m-chest">
      <div className="rpg-split">
        <h2 id="m-chest" className="rpg-row" style={{ gap: 8 }}><RpgIcon name="open-treasure-chest" />Baú do tesouro</h2>
        <span className="rpg-soft rpg-italic" style={{ fontSize: 14 }}>Toque no item e depois em quem recebe</span>
      </div>
      {loot.length === 0 && <p className="rpg-soft rpg-italic">O baú está vazio. Adicione itens pelo grimório abaixo.</p>}
      <div className="rpg-pick-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(118px, 1fr))' }}>
        {loot.map((l) => {
          const it = ITEMS[l.item_key]
          return (
            <button key={l.id} type="button" className={`rpg-pick${sel === l.id ? ' is-on' : ''}`} style={{ borderColor: sel === l.id ? undefined : RARITY[it?.rarity ?? 0].color }} onClick={() => setSel(sel === l.id ? null : l.id)} aria-pressed={sel === l.id}>
              <RpgIcon name={it?.icon ?? 'swap-bag'} />
              <b style={{ fontSize: 13 }}>{it?.name ?? l.item_key}{l.qty > 1 ? ` ×${l.qty}` : ''}</b>
              <span style={{ fontSize: 11, color: RARITY[it?.rarity ?? 0].color === '#8a6a3a' ? '#d8c49a' : RARITY[it?.rarity ?? 0].color }}>{RARITY[it?.rarity ?? 0].label}</span>
            </button>
          )
        })}
      </div>
      {sel && (
        <div className="rpg-row">
          {alive.map((c) => (
            <button key={c.id} type="button" className="rpg-card is-target" disabled={busy} onClick={() => give(c)} style={{ flex: '1 1 150px' }}>
              <b>{c.name}</b>
              <span className="rpg-ink-soft" style={{ fontSize: 13 }}>Mochila {(c.bag ?? []).filter(Boolean).length} itens</span>
            </button>
          ))}
          <button type="button" className="rpg-btn-ghost" disabled={busy} onClick={() => { run(() => removeLoot(sel)); setSel(null) }}>Tirar do baú</button>
        </div>
      )}
      <hr className="rpg-divider" />
      <div className="rpg-row" style={{ alignItems: 'flex-end' }}>
        <span className="rpg-row" style={{ gap: 6, fontFamily: 'var(--display)', fontWeight: 700, color: 'var(--gold-hi)' }}><RpgIcon name="coins" />{campaign.chest_gold} ouro no baú</span>
        <label className="rpg-sr" htmlFor="chest-gold">Ouro para pôr no baú</label>
        <input id="chest-gold" className="rpg-input" type="number" min={0} value={gold} onChange={(e) => setGold(e.target.value)} style={{ width: 90 }} placeholder="+ ouro" />
        <button type="button" className="rpg-btn-ghost" disabled={busy || !Number(gold)} onClick={() => { run(() => updateCampaign(campaign.id, { chest_gold: campaign.chest_gold + Number(gold) })); setGold('') }}>Pôr no baú</button>
        <button type="button" className="rpg-btn-gold" disabled={busy || !campaign.chest_gold || !alive.length} onClick={split}>Dividir entre os vivos</button>
      </div>
      <hr className="rpg-divider" />
      <h3>Grimório de itens</h3>
      <div className="rpg-row">
        <label className="rpg-sr" htmlFor="cat-q">Buscar item</label>
        <input id="cat-q" className="rpg-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar item (ex.: poção, anel)" style={{ flex: '1 1 200px', width: 'auto' }} />
        {[['Todos', -1], ['Comum', 0], ['Incomum', 1], ['Raro', 2]].map(([label, r]) => (
          <button key={label} type="button" className={rarity === r ? 'rpg-btn-gold' : 'rpg-btn-dark'} aria-pressed={rarity === r} onClick={() => setRarity(r)}>{label}</button>
        ))}
      </div>
      <ul className="rpg-list" style={{ maxHeight: 320, overflowY: 'auto' }}>
        {catalog.map(([k, it]) => (
          <li key={k} className="rpg-roll" style={{ alignItems: 'center' }}>
            <span className="rpg-row" style={{ gap: 10, minWidth: 0, flexWrap: 'nowrap' }}>
              <span className="rpg-slot" style={{ '--rar': RARITY[it.rarity].color, width: 40, height: 40, cursor: 'default' }}><RpgIcon name={it.icon} style={{ width: 26, height: 26 }} /></span>
              <span style={{ minWidth: 0 }}><b>{it.name}</b><br /><span className="rpg-soft" style={{ fontSize: 13 }}>{it.stat} · {it.price}</span></span>
            </span>
            <button type="button" className="rpg-btn-ghost" disabled={busy} onClick={() => run(() => addLoot(campaign.id, k))} aria-label={`Pôr ${it.name} no baú`}>+</button>
          </li>
        ))}
      </ul>
    </section>
  )
}

function MembersSection({ campaign, members, profiles, busy, run }) {
  const [pick, setPick] = useState('')
  const ids = new Set(members.map((m) => m.user_id))
  const options = (profiles ?? []).filter((p) => p.id !== campaign.master_id && !ids.has(p.id))
  return (
    <section className="rpg-panel" aria-labelledby="m-members">
      <h2 id="m-members">Jogadores</h2>
      {members.length === 0 && <p className="rpg-ink-soft rpg-italic">Chame a turma: quem entrar aqui pode criar o personagem.</p>}
      <ul className="rpg-list">
        {members.map((m) => (
          <li key={m.user_id} className="rpg-split">
            <span>{m.profile?.display_name ?? '—'}</span>
            <button type="button" className="rpg-btn-ghost" disabled={busy} onClick={() => run(() => removeMember(campaign.id, m.user_id))}>Tirar</button>
          </li>
        ))}
      </ul>
      <div className="rpg-row">
        <label className="rpg-sr" htmlFor="add-member">Chamar alguém</label>
        <select id="add-member" className="rpg-input" value={pick} onChange={(e) => setPick(e.target.value)} style={{ flex: '1 1 160px', width: 'auto' }}>
          <option value="">Chamar alguém da turma…</option>
          {options.map((p) => <option key={p.id} value={p.id}>{p.display_name}</option>)}
        </select>
        <button type="button" className="rpg-btn" disabled={busy || !pick} onClick={() => { run(() => addMember(campaign.id, pick)); setPick('') }}>Chamar</button>
      </div>
    </section>
  )
}

