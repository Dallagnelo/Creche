import { useEffect, useMemo, useState } from 'react'
import { catalogEntry, catalogThumb, CATEGORIES, FLOORS, GROUPS, rotated, WALLS } from '../lib/roomCatalog'
import { LZ_CATEGORIES, LZ_DEFAULT_FLOOR, LZ_DEFAULT_WALL, LZ_FLOORS, LZ_GROUPS, LZ_SHEETS, LZ_WALLS, onLimezuReady } from '../lib/roomLimezu'
import { parseRot } from '../lib/roomRotate'
import { MAX_ITEMS } from '../lib/rooms'

/** Amostra de parede/piso do pacote LimeZu (o pedaço da imagem, ampliado 2x). */
function LzSwatch({ item, on, onClick }) {
  const [sw, sh] = LZ_SHEETS[item.lz.sheet]
  return (
    <button
      type="button"
      className={`decor-swatch decor-swatch-lz${on ? ' is-on' : ''}`}
      style={{
        backgroundColor: item.swatch,
        backgroundImage: `url(/limezu/${item.lz.sheet}.png)`,
        backgroundSize: `${sw * 2}px ${sh * 2}px`,
        backgroundPosition: `-${item.lz.x * 2}px -${item.lz.y * 2}px`,
      }}
      aria-pressed={on}
      title={item.label}
      onClick={onClick}
    >
      <span>{item.label}</span>
    </button>
  )
}

/**
 * Catálogo do "modo decorar": um cartão por móvel (as cores aparecem como bolinhas),
 * aba de parede e chão, desfazer/refazer e salvar. Colocar, arrastar e mexer no móvel acontece na sala (RoomScene).
 */
export default function DecorPanel({ deco, onPick, onStyle, onUndo, onRedo, onSave, onCancel, saving, maxHeight, lab = false }) {
  // Turma (nova): só os móveis do pacote LimeZu, separados por tema
  const CATS = lab ? LZ_CATEGORIES : CATEGORIES
  const ALL = lab ? LZ_GROUPS : GROUPS
  const [tab, setTab] = useState(CATS[0]?.id ?? 'sala')
  const [query, setQuery] = useState('')
  const [colorOf, setColorOf] = useState({}) // cor escolhida em cada cartão
  const { draft, pick } = deco
  // miniaturas trocam para o visual do pacote LimeZu quando ele termina de carregar
  const [, setThumbsVersion] = useState(0)
  useEffect(() => onLimezuReady(() => setThumbsVersion((v) => v + 1)), [])
  const full = draft.items.length >= MAX_ITEMS

  const groups = useMemo(() => {
    const text = query.trim().toLowerCase()
    return ALL.filter((g) => (text ? g.label.toLowerCase().includes(text) || g.entries.some((e) => e.label.toLowerCase().includes(text)) : g.cat === tab))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, query, lab])

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

      {lab ? (
        // muitos temas (Turma nova): uma lista para escolher em vez de vários botões
        <select
          className="decor-theme"
          aria-label="Tema"
          value={query ? '' : tab}
          onChange={(event) => {
            setTab(event.target.value)
            setQuery('')
          }}
        >
          {query && <option value="">Busca: “{query}”</option>}
          {[...CATS, { id: 'estilo', label: 'Parede e chão' }].map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.label}
              {cat.id !== 'estilo' ? ` (${ALL.filter((g) => g.cat === cat.id).length})` : ''}
            </option>
          ))}
        </select>
      ) : (
      <div className="decor-tabs" role="tablist">
        {[...CATS, { id: 'estilo', label: 'Parede e chão' }].map((cat) => (
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
      )}
      <input className="decor-search" type="search" placeholder="Buscar móvel..." value={query} onChange={(event) => setQuery(event.target.value)} />

      <div className="decor-scroll">
        {tab === 'estilo' && !query ? (
          <div className="decor-style">
            <fieldset className="avatar-field">
              <legend>Parede</legend>
              <div className="decor-swatches">
                {lab
                  ? LZ_WALLS.map((wall) => (
                      <LzSwatch key={wall.id} item={wall} on={(String(draft.wall).startsWith('lzw:') ? draft.wall : LZ_DEFAULT_WALL) === wall.id} onClick={() => onStyle({ wall: wall.id })} />
                    ))
                  : WALLS.map((wall) => (
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
                {lab
                  ? LZ_FLOORS.map((floor) => (
                      <LzSwatch key={floor.id} item={floor} on={(String(draft.floor).startsWith('lzf:') ? draft.floor : LZ_DEFAULT_FLOOR) === floor.id} onClick={() => onStyle({ floor: floor.id })} />
                    ))
                  : FLOORS.map((floor) => (
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
              const active = !!pick && group.entries.some((e) => e.key === parseRot(pick).key)
              return (
                <li key={group.group}>
                  <div className={`decor-item${active ? ' is-on' : ''}${full ? ' is-disabled' : ''}`}>
                    <button type="button" className="decor-pick" title={entry.label} disabled={full} onClick={() => onPick(active ? null : entry.key)}>
                      <span className="decor-thumb">
                        <img src={catalogThumb(entry.key)} alt="" />
                      </span>
                      <span className="decor-name">{group.label}</span>
                    </button>
                    {group.entries.length > 12 && (
                      // muitas cores (ex.: camas do pacote): um botão que passa para a próxima
                      <span className="decor-colors">
                        <span className="decor-dot is-on" style={{ background: entry.color }} aria-hidden="true" />
                        <button
                          type="button"
                          className="decor-more-colors"
                          disabled={full}
                          onClick={() => choose(group, group.entries[(group.entries.indexOf(entry) + 1) % group.entries.length])}
                        >
                          {group.entries.indexOf(entry) + 1}/{group.entries.length} cores
                        </button>
                      </span>
                    )}
                    {group.entries.length > 1 && group.entries.length <= 12 && (
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
          ? `Toque no quarto para colocar: ${catalogEntry(pick)?.label}.${rotated(pick) ? ' R gira.' : ''} Esc para parar.`
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
