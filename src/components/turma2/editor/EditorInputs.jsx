import { useState, useMemo, useEffect } from 'react'
import { animAtlasUrl, themeName, atlasUrl } from '../../../lib/turma2/assets'
import { HUD_ONLY, rgbToHex, hexToRgb } from './editorHelpers'

// Peças de formulário do editor: biblioteca de peças, campos de número e de luz.
/** miniatura de um pedaço de uma imagem grande (sem baixar nada além da própria imagem) */
export function Thumb({ url, rect, size = 56 }) {
  const [x, y, w, h] = rect
  const big = Math.max(w, h)
  const s = big <= size ? Math.max(1, Math.floor(size / big)) : size / big
  return (
    <span className="t2e-thumb" style={{ width: Math.max(1, w * s), height: Math.max(1, h * s) }}>
      <span style={{ width: w, height: h, backgroundImage: `url(${url})`, backgroundPosition: `-${x}px -${y}px`, transform: `scale(${s})` }} />
    </span>
  )
}

export function Library({ lib, mode, setMode, chosen, onChoose }) {
  const [theme, setTheme] = useState({ pecas: 'city_props', moveis: 'living_room' })
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(240)
  const items = useMemo(() => {
    if (!lib) return []
    const q = query.trim().toLowerCase().replace(/\s+/g, '_')
    if (mode === 'anims') {
      return Object.entries(lib.anims)
        .filter(([n]) => !q || n.includes(q))
        .map(([n, r]) => ({ key: n, n, label: n, url: animAtlasUrl(r[0]), rect: [r[1], r[2], r[3], r[4]] }))
    }
    const src = lib[mode]
    const themes = q ? Object.keys(src).filter((t) => !HUD_ONLY.test(t)) : [theme[mode]]
    const out = []
    for (const t of themes) {
      for (const [n, r] of Object.entries(src[t] ?? {})) {
        if (q && !n.includes(q) && !t.includes(q)) continue
        out.push({ key: `${t}/${n}`, src: mode, t, n, label: mode === 'moveis' ? `${themeName(t)} #${n}` : n, url: atlasUrl(mode, t), rect: r })
      }
    }
    return out
  }, [lib, mode, theme, query])
  useEffect(() => setLimit(240), [mode, theme, query])
  if (!lib) return <p className="muted">Carregando a biblioteca…</p>
  const chosenKey = chosen && (mode === 'anims' ? chosen.n : `${chosen.t}/${chosen.n}`)
  return (
    <div className="t2e-lib">
      <div className="t2e-tabs" role="tablist" aria-label="Biblioteca">
        {[
          ['pecas', 'Exterior'],
          ['moveis', 'Interior'],
          ['anims', 'Animados'],
        ].map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={mode === k} className={mode === k ? 'is-on' : ''} onClick={() => setMode(k)}>
            {label}
          </button>
        ))}
      </div>
      {mode !== 'anims' && (
        <select aria-label="Tema" value={theme[mode]} onChange={(e) => setTheme({ ...theme, [mode]: e.target.value })} disabled={!!query.trim()}>
          {Object.keys(lib[mode]).filter((t) => !HUD_ONLY.test(t)).map((t) => (
            <option key={t} value={t}>
              {themeName(t)} ({Object.keys(lib[mode][t]).length})
            </option>
          ))}
        </select>
      )}
      <input type="search" placeholder={mode === 'moveis' ? 'Buscar tema (ex.: kitchen)' : 'Buscar (ex.: tree, bench, car)'} value={query} onChange={(e) => setQuery(e.target.value)} />
      <p className="muted t2e-count">{items.length} itens{query.trim() ? ' (em todos os temas)' : ''}</p>
      <div className="t2e-grid">
        {items.slice(0, limit).map((it) => (
          <button key={it.key} type="button" title={it.label} className={chosenKey === it.key ? 'is-on' : ''} onClick={() => onChoose(it)}>
            <Thumb url={it.url} rect={it.rect} />
          </button>
        ))}
      </div>
      {items.length > limit && (
        <button type="button" className="t2e-more" onClick={() => setLimit(limit + 480)}>
          Mostrar mais ({items.length - limit})
        </button>
      )}
    </div>
  )
}

export function Num({ label, value, onChange, min, max, step = 1 }) {
  return (
    <label className="t2e-field">
      <span>{label}</span>
      <input
        type="number"
        value={value ?? ''}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          if (e.target.value === '') return
          const v = Number(e.target.value)
          if (Number.isFinite(v)) onChange(v)
        }}
      />
    </label>
  )
}

export function LightFields({ value, onChange }) {
  const on = !!value
  return (
    <div className="t2e-row">
      <label className="t2e-check">
        <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked ? [48, '255,200,120'] : undefined)} />
        Acende à noite
      </label>
      {on && (
        <>
          <Num label="Raio" value={value[0]} min={8} max={400} onChange={(v) => onChange([v, value[1], ...value.slice(2)])} />
          <label className="t2e-field">
            <span>Cor</span>
            <input type="color" value={rgbToHex(value[1])} onChange={(e) => onChange([value[0], hexToRgb(e.target.value), ...value.slice(2)])} />
          </label>
        </>
      )}
    </div>
  )
}
