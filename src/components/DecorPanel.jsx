import { useMemo, useState } from 'react'
import { catalogEntry, catalogThumb, CATEGORIES, FLOORS, GROUPS, WALLS } from '../lib/roomCatalog'
import { MAX_ITEMS } from '../lib/rooms'

/**
 * Catálogo do "modo decorar": um cartão por móvel (as cores aparecem como bolinhas),
 * aba de parede e chão, desfazer/refazer e salvar. Colocar, arrastar e mexer no móvel acontece na sala (RoomScene).
 */
export default function DecorPanel({ deco, onPick, onStyle, onUndo, onRedo, onSave, onCancel, saving, maxHeight }) {
  const [tab, setTab] = useState('sala')
  const [query, setQuery] = useState('')
  const [colorOf, setColorOf] = useState({}) // cor escolhida em cada cartão
  const { draft, pick } = deco
  const full = draft.items.length >= MAX_ITEMS

  const groups = useMemo(() => {
    const text = query.trim().toLowerCase()
    return GROUPS.filter((g) => (text ? g.label.toLowerCase().includes(text) || g.entries.some((e) => e.label.toLowerCase().includes(text)) : g.cat === tab))
  }, [tab, query])

  const chosen = (group) => group.entries.find((e) => e.key === colorOf[group.group]) ?? group.entries[0]
  const choose = (group, entry) => {
    setColorOf((current) => ({ ...current, [group.group]: entry.key }))
    onPick(entry.key)
  }

  return (
    <section className="decor" aria-label="Decorar o quarto" style={maxHeight ? { maxHeight } : undefined}>
      <div className="decor-head">
        <strong>Decorando</strong>
        <span className="muted decor-count">
          {draft.items.length}/{MAX_ITEMS}
        </span>
        <div className="decor-history">
          <button type="button" className="decor-icon" onClick={onUndo} disabled={!deco.history.length} title="Desfazer (Ctrl+Z)" aria-label="Desfazer">
            ↶
          </button>
          <button type="button" className="decor-icon" onClick={onRedo} disabled={!deco.future.length} title="Refazer (Ctrl+Y)" aria-label="Refazer">
            ↷
          </button>
        </div>
      </div>

      <div className="decor-tabs" role="tablist">
        {[...CATEGORIES, { id: 'estilo', label: 'Parede e chão' }].map((cat) => (
          <button
            key={cat.id}
            type="button"
            role="tab"
            aria-selected={tab === cat.id && !query}
            className={`decor-tab${tab === cat.id && !query ? ' is-on' : ''}`}
            onClick={() => {
              setTab(cat.id)
              setQuery('')
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>
      <input className="decor-search" type="search" placeholder="Buscar móvel..." value={query} onChange={(event) => setQuery(event.target.value)} />

      <div className="decor-scroll">
        {tab === 'estilo' && !query ? (
          <div className="decor-style">
            <fieldset className="avatar-field">
              <legend>Parede</legend>
              <div className="decor-swatches">
                {WALLS.map((wall) => (
                  <button
                    key={wall.id}
                    type="button"
                    className={`decor-swatch${draft.wall === wall.id ? ' is-on' : ''}`}
                    style={{ background: `repeating-linear-gradient(90deg, ${wall.base} 0 6px, ${wall.stripe} 6px 9px)` }}
                    aria-pressed={draft.wall === wall.id}
                    onClick={() => onStyle({ wall: wall.id })}
                  >
                    <span>{wall.label}</span>
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset className="avatar-field">
              <legend>Chão</legend>
              <div className="decor-swatches">
                {FLOORS.map((floor) => (
                  <button
                    key={floor.id}
                    type="button"
                    className={`decor-swatch${draft.floor === floor.id ? ' is-on' : ''}`}
                    style={{
                      background: floor.tile
                        ? `repeating-conic-gradient(${floor.tones[0]} 0 25%, ${floor.tones[1]} 0 50%) 0 0 / 14px 14px`
                        : `repeating-linear-gradient(0deg, ${floor.tones[0]} 0 5px, ${floor.seam} 5px 6px)`,
                    }}
                    aria-pressed={draft.floor === floor.id}
                    onClick={() => onStyle({ floor: floor.id })}
                  >
                    <span>{floor.label}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        ) : (
          <ul className="decor-grid">
            {groups.map((group) => {
              const entry = chosen(group)
              const active = group.entries.some((e) => e.key === pick)
              return (
                <li key={group.group}>
                  <div className={`decor-item${active ? ' is-on' : ''}${full ? ' is-disabled' : ''}`}>
                    <button type="button" className="decor-pick" title={entry.label} disabled={full} onClick={() => onPick(active ? null : entry.key)}>
                      <span className="decor-thumb">
                        <img src={catalogThumb(entry.key)} alt="" />
                      </span>
                      <span className="decor-name">{group.label}</span>
                    </button>
                    {group.entries.length > 1 && (
                      <span className="decor-colors">
                        {group.entries.map((variant) => (
                          <button
                            key={variant.key}
                            type="button"
                            className={`decor-dot${variant.key === entry.key ? ' is-on' : ''}`}
                            style={{ background: variant.color }}
                            title={variant.label}
                            aria-label={variant.label}
                            disabled={full}
                            onClick={() => choose(group, variant)}
                          />
                        ))}
                      </span>
                    )}
                  </div>
                </li>
              )
            })}
            {groups.length === 0 && <li className="muted">Nenhum móvel encontrado.</li>}
          </ul>
        )}
      </div>

      <p className="decor-tip muted">
        {pick
          ? `Toque no quarto para colocar: ${catalogEntry(pick)?.label}. Esc para parar.`
          : full
            ? 'Limite de móveis atingido. Remova algum para colocar outro.'
            : 'Escolha um móvel e toque no quarto. Arraste para mover. Toque num móvel para mais opções.'}
      </p>
      <div className="decor-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>
          Cancelar
        </button>
        <button type="button" className="btn btn-primary" onClick={onSave} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar quarto'}
        </button>
      </div>
    </section>
  )
}
