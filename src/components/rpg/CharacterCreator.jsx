import { useState } from 'react'
import { ATTRS, CLASSES, fmtMod, ITEMS, maxStats, newCharacter } from '../../lib/rpg/data'
import RpgIcon from './RpgIcon'

const POINTS = 4

/** Criação do personagem: nome, classe e atributos (4 pontos, máximo +2, um atributo pode ir a -1). */
export default function CharacterCreator({ onCreate }) {
  const [name, setName] = useState('')
  const [classId, setClassId] = useState(null)
  const [attrs, setAttrs] = useState({ for: 0, des: 0, con: 0, int: 0, sab: 0, car: 0 })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const cls = CLASSES.find((c) => c.id === classId)
  const negatives = Object.values(attrs).filter((v) => v < 0).length
  const spent = Object.values(attrs).reduce((sum, v) => sum + v, 0)
  const left = POINTS - spent
  const preview = cls ? maxStats(cls, attrs, 1) : null

  const canUp = (id) => left > 0 && attrs[id] < 2
  const canDown = (id) => attrs[id] > 0 || (attrs[id] === 0 && negatives === 0)
  const change = (id, step) => setAttrs((a) => ({ ...a, [id]: a[id] + step }))

  async function submit(event) {
    event.preventDefault()
    if (!name.trim()) return setError('Dê um nome ao personagem.')
    if (!cls) return setError('Escolha uma classe.')
    if (left !== 0) return setError(`Ainda faltam ${left} ${left === 1 ? 'ponto' : 'pontos'} para distribuir.`)
    setBusy(true)
    setError('')
    try {
      await onCreate(newCharacter(cls, name, attrs))
    } catch (err) {
      setError(err.message ?? 'Não deu para criar.')
      setBusy(false)
    }
  }

  return (
    <form className="rpg-panel" onSubmit={submit} aria-labelledby="create-title">
      <h2 id="create-title" style={{ fontSize: 24 }}>Criar personagem</h2>
      <label className="rpg-field" style={{ maxWidth: 360 }}>
        Nome do herói
        <input className="rpg-input" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Brakka" />
      </label>

      <h3>Classe</h3>
      <div className="rpg-pick-grid" role="radiogroup" aria-label="Classe">
        {CLASSES.map((c) => (
          <button key={c.id} type="button" role="radio" aria-checked={classId === c.id} className={`rpg-pick${classId === c.id ? ' is-on' : ''}`} onClick={() => setClassId(c.id)}>
            <RpgIcon name={c.icon} />
            <b>{c.name}</b>
            <span style={{ fontSize: 13, color: '#d8c49a' }}>Vida {c.hp} · {ATTRS.find((a) => a.id === c.attr).name}</span>
          </button>
        ))}
      </div>
      {cls && (
        <div className="rpg-card" style={{ boxShadow: 'none' }}>
          <b style={{ fontSize: 18 }}>{cls.name}</b>
          <span className="rpg-italic">{cls.blurb}</span>
          <span className="rpg-ink-soft">
            Começa com:{' '}
            {[...Object.values(cls.kit.equipment).map((id) => ITEMS[id].name), ...cls.kit.bag.map(([id, qty]) => (qty > 1 ? `${qty}× ${ITEMS[id].name}` : ITEMS[id].name))].join(', ')}
            {` e ${cls.kit.gold} ouro.`}
          </span>
        </div>
      )}

      <div className="rpg-split">
        <h3>Atributos</h3>
        <span className="rpg-ink-soft" style={{ fontFamily: 'var(--display)', fontWeight: 700 }}>
          {left} {left === 1 ? 'ponto' : 'pontos'} para distribuir
        </span>
      </div>
      <p className="rpg-ink-soft rpg-italic" style={{ fontSize: 14 }}>
        Todos começam em 0. Máximo +2 no nível 1. Dá para baixar um atributo para −1 e ganhar 1 ponto extra.
      </p>
      <div className="rpg-attr-grid">
        {ATTRS.map((attr) => (
          <div key={attr.id} className="rpg-attr" style={cls?.attr === attr.id ? { borderColor: '#b8860b', borderWidth: 3 } : undefined}>
            <span>{attr.name}{cls?.attr === attr.id ? ' ★' : ''}</span>
            <div className="rpg-stepper">
              <button type="button" onClick={() => change(attr.id, -1)} disabled={!canDown(attr.id)} aria-label={`Diminuir ${attr.name}`}>−</button>
              <b aria-live="polite">{fmtMod(attrs[attr.id])}</b>
              <button type="button" onClick={() => change(attr.id, 1)} disabled={!canUp(attr.id)} aria-label={`Aumentar ${attr.name}`}>+</button>
            </div>
          </div>
        ))}
      </div>

      {preview && (
        <p className="rpg-ink-soft">
          Com isso: <b style={{ color: 'var(--ink)' }}>{preview.hp} de vida</b> e <b style={{ color: 'var(--ink)' }}>{preview.effort} de Esforço</b>.
        </p>
      )}
      {error && <p className="rpg-msg is-bad">{error}</p>}
      <div className="rpg-row" style={{ justifyContent: 'flex-end' }}>
        <button type="submit" className="rpg-btn" disabled={busy}>{busy ? 'Criando...' : 'Entrar na aventura'}</button>
      </div>
    </form>
  )
}
