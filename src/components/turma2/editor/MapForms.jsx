import { Num } from './EditorInputs'
import { MAX_SIDE, clamp, slug } from './editorHelpers'
import { useState, useEffect } from 'react'
import { BASES } from '../../../lib/turma2/autotile'

// Cartões do editor: dados do mapa aberto e formulário de mapa novo.
export function MapCard({ map, meta, setMeta, onResize, onBase, onDentro }) {
  const [size, setSize] = useState([map.w, map.h])
  useEffect(() => setSize([map.w, map.h]), [map.w, map.h])
  return (
    <section className="t2e-card">
      <h3>Mapa</h3>
      <label className="t2e-field">
        <span>Nome</span>
        <input value={meta.name} maxLength={60} onChange={(e) => setMeta({ ...meta, name: e.target.value })} />
      </label>
      <p className="muted t2e-tip">
        Código: <code>{meta.code}</code>
      </p>
      <div className="t2e-row">
        <Num label="Largura" value={size[0]} min={10} max={MAX_SIDE} onChange={(v) => setSize([v, size[1]])} />
        <Num label="Altura" value={size[1]} min={8} max={MAX_SIDE} onChange={(v) => setSize([size[0], v])} />
      </div>
      {(size[0] !== map.w || size[1] !== map.h) && (
        <button type="button" onClick={() => onResize(clamp(size[0], 10, MAX_SIDE), clamp(size[1], 8, MAX_SIDE))}>
          Mudar tamanho para {clamp(size[0], 10, MAX_SIDE)}x{clamp(size[1], 8, MAX_SIDE)}
        </button>
      )}
      <label className="t2e-field">
        <span>Chão de fundo</span>
        <select value={map.base} onChange={(e) => onBase(e.target.value)}>
          {BASES.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </select>
      </label>
      <label className="t2e-check">
        <input type="checkbox" checked={!!map.dentro} onChange={(e) => onDentro(e.target.checked)} />
        Dentro de casa (não escurece à noite)
      </label>
      <p className="muted t2e-tip">A hora do dia segue o relógio da turma (1 dia = 1 hora). Use a Vista para ver o mapa de dia, de tarde ou de noite.</p>
    </section>
  )
}

export function NewMapForm({ form, setForm, rows, onCancel, onCreate }) {
  const [error, setError] = useState(null)
  const set = (patch) => setForm({ ...form, ...patch })
  return (
    <form
      className="t2e-card t2e-new"
      onSubmit={(e) => {
        e.preventDefault()
        setError(onCreate(form))
      }}
    >
      <h3>Novo mapa</h3>
      <div className="t2e-row">
        <label className="t2e-field">
          <span>Nome</span>
          <input autoFocus value={form.name} maxLength={60} placeholder="Centro da cidade" onChange={(e) => set({ name: e.target.value })} />
        </label>
        <label className="t2e-field">
          <span>Código (para portas)</span>
          <input value={form.code || slug(form.name)} maxLength={40} placeholder="centro" onChange={(e) => set({ code: slug(e.target.value) })} />
        </label>
      </div>
      {rows.length > 0 && (
        <label className="t2e-field">
          <span>Começar de</span>
          <select value={form.copy} onChange={(e) => set({ copy: e.target.value })}>
            <option value="">Mapa em branco</option>
            {rows.map((r) => (
              <option key={r.code} value={r.code}>
                Cópia de {r.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {!form.copy && (
        <div className="t2e-row">
          <Num label="Largura (quadradinhos)" value={form.w} min={10} max={MAX_SIDE} onChange={(v) => set({ w: v })} />
          <Num label="Altura" value={form.h} min={8} max={MAX_SIDE} onChange={(v) => set({ h: v })} />
          <label className="t2e-field">
            <span>Chão</span>
            <select value={form.base} onChange={(e) => set({ base: e.target.value })}>
              {BASES.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      <p className="muted t2e-tip">Uma tela do jogo mostra mais ou menos 40x24 quadradinhos. Mapas grandes a câmera acompanha.</p>
      {error && <p className="t2e-error">{error}</p>}
      <div className="t2e-row t2e-actions">
        <button type="button" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary">
          Criar
        </button>
      </div>
    </form>
  )
}
