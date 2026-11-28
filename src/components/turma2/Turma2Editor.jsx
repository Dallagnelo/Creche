import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import DATA from '../../lib/turma2Rooms.json'
import { T, atlasUrl, loadImage, loadLibrary } from '../../lib/turma2/assets'
import { ASPHALT, TERRAINS, allCells, loadAutotiles, paintCells } from '../../lib/turma2/autotile'
import { loadCharLib } from '../../lib/turma2/character'
import { newMap, normalizeMap } from '../../lib/turma2/compile'
import { useAuth } from '../../contexts/AuthContext'
import { isMapRow } from '../../lib/turma2/hudConfig'
import { defaultMaps, deleteMap, listMaps, saveMap } from '../../services/turma2Maps'
import { CharacterPicker } from './Turma2Character'
import Turma2Game from './Turma2Game'
import { NewMapForm, MapCard } from './editor/MapForms'
import { ZOOMS, DRAFT_KEY, KIND_LIST, TILE_KINDS, uid, clamp, TOOLS, slug, MAX_SIDE, resizeMap, HELP } from './editor/editorHelpers'
import { Library } from './editor/EditorInputs'
import { makePropsPanel } from './editor/propsPanel'
import { useEditorKeys } from './editor/useEditorKeys'
import { useEditorPointer } from './editor/useEditorPointer'
import { useEditorCanvas } from './editor/useEditorCanvas'

// Editor de mapas da Turma 2.0 (só o admin). Monta um mapa inteiro com as peças do pacote LimeZu:
// chão pintado (as bordas se encaixam sozinhas), água animada, objetos, animados, luzes da noite,
// portas para outros mapas, coisas que vão e voltam, onde o jogador nasce e onde dá para andar.
// O mapa fica salvo na tabela turma2_maps; "Publicar" faz ele aparecer para a turma no jogo.

export default function Turma2Editor() {
  const [lib, setLib] = useState(null)
  const [sheet, setSheet] = useState(null)
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState(null) // { code, name, published, saved }
  const [map, setMapState] = useState(null)
  const [dirty, setDirty] = useState(false)
  const [status, setStatus] = useState('')
  const [tool, setTool] = useState('select')
  const [libMode, setLibMode] = useState('pecas')
  const [chosen, setChosen] = useState({ pecas: null, moveis: null, anims: null })
  const [sel, setSel] = useState(null) // { kind, id }
  const [terrainId, setTerrainId] = useState('terra')
  const [brush, setBrush] = useState(1)
  const [erase, setErase] = useState(false)
  const [blockMode, setBlockMode] = useState(1) // 1 bloqueia, 0 libera, -1 automático
  const [waterKind, setWaterKind] = useState('lago')
  const [snap, setSnap] = useState(16)
  const [showGrid, setShowGrid] = useState(true)
  const [showWalk, setShowWalk] = useState(false)
  const [sky, setSky] = useState('dia')
  const [testing, setTesting] = useState(false)
  const [creating, setCreating] = useState(null) // formulário de mapa novo
  const [zoomLabel, setZoomLabel] = useState(3)
  const [charLib, setCharLib] = useState(null)
  const [itemKind, setItemKind] = useState('moeda') // item novo: moeda ou a peça escolhida
  const [charEdit, setCharEdit] = useState(null) // id do NPC com o visual sendo montado
  const { profile } = useAuth()
  const [, bump] = useReducer((n) => n + 1, 0)

  const mapRef = useRef(null)
  const hudRowRef = useRef(null) // linhas especiais (interface, classes): vão junto no "Testar"
  const undoRef = useRef([])
  const redoRef = useRef([])
  const floorRef = useRef(null)
  const viewRef = useRef({ zoom: 3, ox: 40, oy: 40 })
  const boxRef = useRef(null)
  const canvasRef = useRef(null)
  const dragRef = useRef(null)
  const hoverRef = useRef(null)
  const spaceRef = useRef(false)
  const waterCache = useRef(new Map())
  const imgs = useRef(new Map())

  // ---------- carregar ----------
  useEffect(() => {
    let alive = true
    loadLibrary()
      .then((l) => {
        if (!alive) return
        setLib(l)
        const rect = l.pecas[ASPHALT.theme]?.[ASPHALT.name]
        const asphalt = rect ? loadImage(atlasUrl('pecas', ASPHALT.theme)).then((img) => ({ img, rect, rects: l.pecas[ASPHALT.theme] })) : null
        return loadAutotiles(asphalt).then((s) => alive && setSheet(s))
      })
      .catch((e) => alive && setStatus(`Não consegui carregar a biblioteca (${e.message}). Confira se public/limezu/editor subiu.`))
    listMaps().then((list) => {
      if (!alive) return
      hudRowRef.current = list.filter((r) => !isMapRow(r)) // interface, classes…
      setRows(list.filter(isMapRow))
    })
    loadCharLib().then((l) => alive && setCharLib(l)).catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  const repaintAll = useCallback(
    (m) => {
      if (!sheet || !m) return
      let c = floorRef.current
      if (!c) c = floorRef.current = document.createElement('canvas')
      c.width = m.w * T
      c.height = m.h * T
      paintCells(c.getContext('2d'), sheet, m, allCells(m))
    },
    [sheet],
  )

  const centerView = useCallback((m) => {
    const box = boxRef.current
    if (!box || !m) return
    const r = box.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    const fit = Math.min((r.width * dpr) / (m.w * T), (r.height * dpr) / (m.h * T))
    const zoom = ZOOMS.reduce((best, z) => (z <= fit * 1.6 ? z : best), ZOOMS[0])
    viewRef.current = { zoom, ox: Math.round((r.width * dpr - m.w * T * zoom) / 2), oy: Math.round((r.height * dpr - m.h * T * zoom) / 2) }
    setZoomLabel(zoom)
  }, [])

  const load = useCallback(
    (raw, nextMeta, { keepDirty = false } = {}) => {
      const m = normalizeMap(raw)
      mapRef.current = m
      setMapState(m)
      setMeta(nextMeta)
      setDirty(keepDirty)
      setSel(null)
      undoRef.current = []
      redoRef.current = []
      repaintAll(m)
      requestAnimationFrame(() => centerView(m))
    },
    [repaintAll, centerView],
  )

  // as peças do chão chegaram depois do mapa: desenha agora
  useEffect(() => {
    if (sheet && mapRef.current) repaintAll(mapRef.current)
  }, [sheet, repaintAll])

  // rascunho que não foi salvo (fechou a aba, caiu a internet…): volta sozinho
  useEffect(() => {
    if (!sheet || map) return
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (raw) {
        const d = JSON.parse(raw)
        if (d?.map?.w) {
          load(d.map, d.meta, { keepDirty: true })
          setStatus('Rascunho não salvo recuperado.')
        }
      }
    } catch {
      /* sem rascunho */
    }
  }, [sheet, map, load])

  useEffect(() => {
    if (!map || !meta || !dirty) return undefined
    const t = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ map, meta }))
      } catch {
        /* sem espaço: tudo bem */
      }
    }, 600)
    return () => clearTimeout(t)
  }, [map, meta, dirty])

  useEffect(() => {
    if (!dirty) return undefined
    const warn = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  // ---------- mudar o mapa (com desfazer) ----------
  const setMap = useCallback((next) => {
    mapRef.current = next
    setMapState(next)
    setDirty(true)
  }, [])
  const commit = useCallback(
    (next, before = mapRef.current) => {
      if (before && before !== next) {
        undoRef.current.push(before)
        if (undoRef.current.length > 120) undoRef.current.shift()
        redoRef.current = []
      }
      setMap(next)
      bump()
    },
    [setMap],
  )
  const undo = useCallback(() => {
    const prev = undoRef.current.pop()
    if (!prev) return
    redoRef.current.push(mapRef.current)
    setMap(prev)
    repaintAll(prev)
    bump()
  }, [setMap, repaintAll])
  const redo = useCallback(() => {
    const next = redoRef.current.pop()
    if (!next) return
    undoRef.current.push(mapRef.current)
    setMap(next)
    repaintAll(next)
    bump()
  }, [setMap, repaintAll])

  const itemOf = (m, s) => (s ? m?.[KIND_LIST[s.kind]]?.find((it) => it.id === s.id) : null)
  const updateItem = useCallback(
    (kind, id, patch, { history = true } = {}) => {
      const m = mapRef.current
      const key = KIND_LIST[kind]
      const next = { ...m, [key]: m[key].map((it) => (it.id === id ? { ...it, ...(typeof patch === 'function' ? patch(it) : patch) } : it)) }
      if (history) commit(next)
      else setMap(next)
    },
    [commit, setMap],
  )
  const removeSel = useCallback(() => {
    const m = mapRef.current
    if (!sel || !m) return
    const key = KIND_LIST[sel.kind]
    commit({ ...m, [key]: m[key].filter((it) => it.id !== sel.id) })
    setSel(null)
  }, [sel, commit])
  const duplicateSel = useCallback(() => {
    const m = mapRef.current
    const it = itemOf(m, sel)
    if (!it) return
    const key = KIND_LIST[sel.kind]
    const tileKind = TILE_KINDS.has(sel.kind)
    const copy = { ...it, id: uid() }
    if (sel.kind === 'patrol') copy.y += T
    else if (tileKind) copy.x += 1
    else copy.x += T
    commit({ ...m, [key]: [...m[key], copy] })
    setSel({ kind: sel.kind, id: copy.id })
  }, [sel, commit])

  const { bichos } = useEditorCanvas({ imgs, waterCache, lib, map, showWalk, tool, sel, chosen, libMode, showGrid, sky, snap, terrainId, brush, erase, testing, canvasRef, boxRef, viewRef, floorRef, itemOf, hoverRef, dragRef, meta })

  const { zoomAt, onPointerDown, onPointerMove, onPointerUp } = useEditorPointer({ canvasRef, viewRef, lib, brush, erase, terrainId, floorRef, sheet, mapRef, boxRef, dragRef, tool, spaceRef, setTool, setSel, itemOf, chosen, libMode, setStatus, snap, commit, setMap, blockMode, rows, meta, charLib, itemKind, hoverRef, updateItem, undoRef, redoRef, bump, waterKind, setZoomLabel, map, testing })

  useEditorKeys({ testing, creating, charEdit, spaceRef, boxRef, redo, undo, duplicateSel, sel, removeSel, setSel, setTool, updateItem, zoomAt })
  // ---------- salvar / abrir ----------
  const doSave = async (publish = meta?.published) => {
    if (!map || !meta) return
    setStatus('Salvando…')
    try {
      const row = await saveMap({ code: meta.code, name: meta.name, data: map, published: !!publish })
      const saved = { ...row, padrao: meta.padrao, db: true }
      setRows((list) => (list.some((r) => r.code === row.code) ? list.map((r) => (r.code === row.code ? saved : r)) : [...list, saved]))
      setMeta({ ...meta, published: row.published, saved: true, db: true })
      setDirty(false)
      localStorage.removeItem(DRAFT_KEY)
      setStatus(row.published ? 'Salvo e publicado: a turma já vê este mapa.' : 'Salvo como rascunho (só você vê).')
    } catch (e) {
      setStatus(`Não salvou: ${e.message}. Rodou o supabase/migracao-turma2-mapas.sql?`)
    }
  }
  const openRow = (code) => {
    if (dirty && !window.confirm('Tem mudanças não salvas neste mapa. Abrir outro mesmo assim?')) return
    const row = rows.find((r) => r.code === code)
    if (!row) return
    load(row.data, { code: row.code, name: row.name, published: row.published, saved: true, padrao: !!row.padrao, db: !!row.db })
    setStatus(row.padrao && !row.db ? 'Este mapa vem com o jogo. Pode mexer à vontade: ao salvar, a sua versão passa a valer (e dá para voltar ao original depois).' : '')
  }
  const doDelete = async () => {
    if (!meta) return
    if (meta.padrao) {
      // mapa que vem com o jogo: não some, só volta a ser o original
      if (!meta.db) {
        setStatus('Este mapa vem com o jogo e já está no original (não dá para apagar).')
        return
      }
      if (!window.confirm(`Voltar "${meta.name}" ao original do jogo? As suas mudanças salvas somem.`)) return
      try {
        await deleteMap(meta.code)
        const orig = (await defaultMaps()).find((d) => d.code === meta.code)
        const row = { ...orig, padrao: true, db: false }
        setRows((list) => list.map((r) => (r.code === row.code ? row : r)))
        localStorage.removeItem(DRAFT_KEY)
        load(row.data, { code: row.code, name: row.name, published: true, saved: true, padrao: true, db: false })
        setStatus('Mapa voltou ao original do jogo.')
      } catch (e) {
        setStatus(`Não consegui voltar ao original: ${e.message}`)
      }
      return
    }
    if (!window.confirm(`Apagar o mapa "${meta.name}" para sempre?`)) return
    try {
      if (meta.saved) await deleteMap(meta.code)
      setRows((list) => list.filter((r) => r.code !== meta.code))
      localStorage.removeItem(DRAFT_KEY)
      mapRef.current = null
      setMapState(null)
      setMeta(null)
      setDirty(false)
      setStatus('Mapa apagado.')
    } catch (e) {
      setStatus(`Não apagou: ${e.message}`)
    }
  }
  const createMap = (form) => {
    const code = slug(form.code || form.name)
    if (!form.name.trim()) return 'Dê um nome ao mapa.'
    if (code.length < 2) return 'O código precisa de pelo menos 2 letras.'
    if (rows.some((r) => r.code === code) || DATA.rooms.some((r) => r.code === code) || code.startsWith('_')) return 'Já existe um mapa com esse código.'
    const w = clamp(Math.round(form.w), 10, MAX_SIDE)
    const h = clamp(Math.round(form.h), 8, MAX_SIDE)
    const base = form.copy ? rows.find((r) => r.code === form.copy)?.data : null
    const m = base ? resizeMap(structuredClone(base), base.w, base.h) : newMap(w, h, form.base)
    load(m, { code, name: form.name.trim(), published: false, saved: false }, { keepDirty: true })
    setStatus(base ? 'Cópia criada. Salve para guardar.' : 'Mapa novo criado. Salve para guardar.')
    return null
  }
  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ code: meta.code, name: meta.name, data: map }, null, 1)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `turma2-${meta.code}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  }
  const importJson = (file) => {
    file
      .text()
      .then((txt) => {
        const j = JSON.parse(txt)
        const data = j.data ?? j
        if (!data.w || !data.h) throw new Error('arquivo sem mapa')
        const m = { ...newMap(data.w, data.h), ...data }
        const code = slug(j.code ?? file.name.replace(/\.json$/, '')) || `mapa_${uid()}`
        load(m, { code, name: j.name ?? code, published: false, saved: rows.some((r) => r.code === code) }, { keepDirty: true })
        setStatus('Mapa importado. Salve para guardar.')
      })
      .catch((e) => setStatus(`Não consegui importar: ${e.message}`))
  }

  // ---------- painel da direita ----------
  const selected = itemOf(map, sel)
  const allTargets = [...DATA.rooms.map((r) => ({ code: r.code, name: `${r.label} (do site)`, spawn: r.spawn })), ...rows.map((r) => ({ code: r.code, name: r.name, spawn: r.data?.spawn }))]
  if (meta && !allTargets.some((t) => t.code === meta.code)) allTargets.push({ code: meta.code, name: `${meta.name} (este)`, spawn: map?.spawn })

  const { propsPanel } = makePropsPanel({ selected, sel, updateItem, lib, chosen, allTargets, bichos, setCharEdit, duplicateSel, removeSel })

  // ---------- tela ----------
  if (testing && map && meta) {
    const draft = { code: meta.code, name: meta.name, data: map, published: meta.published }
    return (
      <div className="t2e-testing">
        <div className="t2e-bar">
          <button type="button" className="btn btn-ghost" onClick={() => setTesting(false)}>
            ← Voltar ao editor
          </button>
          <span className="muted">Testando "{meta.name}" (o que não foi salvo também aparece aqui).</span>
        </div>
        <Turma2Game extraRows={[...(hudRowRef.current ?? []), ...rows.filter((r) => r.code !== meta.code), draft]} startCode={meta.code} character={profile?.turma2_char ?? null} />
      </div>
    )
  }

  const pickForTool = tool === 'anim' || tool === 'patrol' ? 'anims' : libMode
  return (
    <div className="t2e">
      <div className="t2e-bar">
        <label className="t2-pick">
          <span>Mapa</span>
          <select value={meta?.saved ? meta.code : ''} onChange={(e) => e.target.value && openRow(e.target.value)}>
            <option value="">{meta && !meta.saved ? `${meta.name} (novo)` : rows.length ? 'Abrir um mapa…' : 'Nenhum mapa ainda'}</option>
            {rows.map((r) => (
              <option key={r.code} value={r.code}>
                {r.name}
                {r.padrao ? (r.db ? ' (do jogo, editado)' : ' (do jogo)') : ''}
                {r.published ? ' ✓' : ' (rascunho)'}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="btn btn-ghost" onClick={() => setCreating({ name: '', code: '', w: 48, h: 32, base: 'grama', copy: '' })}>
          + Novo mapa
        </button>
        {map && meta && (
          <>
            <button id="t2e-save" type="button" className="btn btn-primary" onClick={() => doSave()} disabled={!dirty && meta.saved}>
              {dirty || !meta.saved ? 'Salvar' : 'Salvo'}
            </button>
            <label className="t2e-check t2e-publish">
              <input type="checkbox" checked={!!meta.published} onChange={(e) => doSave(e.target.checked)} />
              Publicado
            </label>
            <button type="button" className="btn btn-ghost" onClick={() => setTesting(true)}>
              ▶ Testar
            </button>
            <span className="t2e-sep" />
            <button type="button" onClick={undo} disabled={!undoRef.current.length} title="Desfazer (Ctrl+Z)" aria-label="Desfazer">
              ↶
            </button>
            <button type="button" onClick={redo} disabled={!redoRef.current.length} title="Refazer (Ctrl+Y)" aria-label="Refazer">
              ↷
            </button>
            <button type="button" onClick={() => zoomAt(-1)} aria-label="Diminuir zoom">
              −
            </button>
            <span className="t2e-zoom">{zoomLabel}x</span>
            <button type="button" onClick={() => zoomAt(1)} aria-label="Aumentar zoom">
              +
            </button>
            <button type="button" onClick={() => centerView(map)}>
              Ver tudo
            </button>
          </>
        )}
      </div>
      {status && (
        <p className="t2e-status" role="status">
          {status}
        </p>
      )}

      {charEdit && itemOf(map, { kind: 'npc', id: charEdit }) && (
        <div className="t2e-modal" role="dialog" aria-modal="true" aria-label="Visual do personagem">
          <div className="t2e-modal-box">
            <CharacterPicker
              value={itemOf(map, { kind: 'npc', id: charEdit }).c}
              onChange={(c) => updateItem('npc', charEdit, { c })}
            />
            <div className="t2e-row t2e-actions">
              <button type="button" className="btn btn-primary" onClick={() => setCharEdit(null)}>
                Pronto
              </button>
            </div>
          </div>
        </div>
      )}

      {creating && (
        <NewMapForm
          form={creating}
          setForm={setCreating}
          rows={rows}
          onCancel={() => setCreating(null)}
          onCreate={(f) => {
            const err = createMap(f)
            if (err) return err
            setCreating(null)
            return null
          }}
        />
      )}

      {!map ? (
        <div className="t2e-empty">
          <p>{sheet ? 'Abra um mapa ou crie um novo para começar.' : 'Carregando as peças…'}</p>
          <label className="btn btn-ghost">
            Importar arquivo .json
            <input type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files[0] && importJson(e.target.files[0])} />
          </label>
        </div>
      ) : (
        <div className="t2e-main">
          <aside className="t2e-left">
            <div className="t2e-tools" role="toolbar" aria-label="Ferramentas">
              {TOOLS.map(([k, icon, label, key]) => (
                <button key={k} type="button" className={tool === k ? 'is-on' : ''} aria-pressed={tool === k} title={`${label} (${key.toUpperCase()})`} onClick={() => setTool(k)}>
                  <span aria-hidden="true">{icon}</span>
                  <small>{label}</small>
                </button>
              ))}
            </div>
            <p className="muted t2e-tip">{HELP[tool]}</p>
            {tool === 'terrain' && (
              <section className="t2e-card">
                <div className="t2e-swatches">
                  {TERRAINS.map((t) => (
                    <button key={t.id} type="button" className={terrainId === t.id && !erase ? 'is-on' : ''} onClick={() => { setTerrainId(t.id); setErase(false) }}>
                      <i style={{ background: t.color }} />
                      {t.label}
                    </button>
                  ))}
                </div>
                <div className="t2e-row">
                  <label className="t2e-check">
                    <input type="checkbox" checked={erase === true} onChange={(e) => setErase(e.target.checked)} />
                    Apagar este chão
                  </label>
                  <label className="t2e-check">
                    <input type="checkbox" checked={erase === 'all'} onChange={(e) => setErase(e.target.checked ? 'all' : false)} />
                    Borracha (todos)
                  </label>
                </div>
                <label className="t2e-field">
                  <span>Pincel: {brush}x{brush}</span>
                  <input type="range" min={1} max={7} value={brush} onChange={(e) => setBrush(Number(e.target.value))} />
                </label>
              </section>
            )}
            {tool === 'water' && (
              <section className="t2e-card">
                <label className="t2e-field">
                  <span>Tipo</span>
                  <select value={waterKind} onChange={(e) => setWaterKind(e.target.value)}>
                    <option value="lago">Lago (com margem em volta)</option>
                    <option value="mar">Mar (areia só em cima)</option>
                  </select>
                </label>
                <p className="muted t2e-tip">Para lagos de formato livre, use o chão "Água" no pincel.</p>
              </section>
            )}
            {tool === 'item' && (
              <section className="t2e-card">
                <div className="t2e-tabs">
                  {[
                    ['moeda', '🪙 Moeda'],
                    ['objeto', '📦 Peça escolhida'],
                  ].map(([v, l]) => (
                    <button key={v} type="button" className={itemKind === v ? 'is-on' : ''} onClick={() => setItemKind(v)}>
                      {l}
                    </button>
                  ))}
                </div>
              </section>
            )}
            {tool === 'block' && (
              <section className="t2e-card">
                <div className="t2e-tabs">
                  {[
                    [1, 'Bloquear'],
                    [0, 'Liberar'],
                    [-1, 'Automático'],
                  ].map(([v, label]) => (
                    <button key={v} type="button" className={blockMode === v ? 'is-on' : ''} onClick={() => setBlockMode(v)}>
                      {label}
                    </button>
                  ))}
                </div>
              </section>
            )}
            {(tool === 'object' || tool === 'anim' || tool === 'patrol' || tool === 'traffic' || tool === 'select' || (tool === 'item' && itemKind === 'objeto')) && (
              <Library
                lib={lib}
                mode={tool === 'anim' || tool === 'patrol' ? 'anims' : libMode}
                setMode={(mode) => {
                  setLibMode(mode)
                  if (tool === 'traffic') return
                  if (mode === 'anims' && tool === 'object') setTool('anim')
                  else if (mode !== 'anims' && (tool === 'anim' || tool === 'patrol')) setTool('object')
                }}
                chosen={chosen[pickForTool]}
                onChoose={(it) => {
                  const key = it.src ?? 'anims'
                  setChosen({ ...chosen, [key]: it })
                  if (key === 'anims') {
                    if (tool !== 'patrol' && tool !== 'traffic') setTool('anim')
                  } else {
                    setLibMode(key)
                    if (tool !== 'item' && tool !== 'traffic') setTool('object')
                  }
                }}
              />
            )}
          </aside>

          <div
            ref={boxRef}
            className={`t2e-stage tool-${tool}`}
            tabIndex={0}
            aria-label="Mapa em edição"
            onContextMenu={(e) => e.preventDefault()}
          >
            <canvas
              ref={canvasRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onPointerLeave={() => (hoverRef.current = null)}
            />
          </div>

          <aside className="t2e-right">
            {propsPanel()}
            {!selected && meta && (
              <MapCard
                map={map}
                meta={meta}
                setMeta={(m) => {
                  setMeta(m)
                  setDirty(true)
                }}
                onResize={(w, h) => {
                  const next = resizeMap(map, w, h)
                  commit(next)
                  repaintAll(next)
                }}
                onBase={(base) => {
                  const next = { ...map, base }
                  commit(next)
                  repaintAll(next)
                }}
                onDentro={(v) => commit({ ...map, dentro: v || undefined })}
              />
            )}
            <section className="t2e-card">
              <h3>Vista</h3>
              <div className="t2e-tabs">
                {[
                  ['dia', '☀️'],
                  ['tarde', '🌇'],
                  ['noite', '🌙'],
                ].map(([k, icon]) => (
                  <button key={k} type="button" className={sky === k ? 'is-on' : ''} aria-pressed={sky === k} onClick={() => setSky(k)} title={k}>
                    {icon}
                  </button>
                ))}
              </div>
              <label className="t2e-check">
                <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />
                Grade
              </label>
              <label className="t2e-check">
                <input type="checkbox" checked={showWalk} onChange={(e) => setShowWalk(e.target.checked)} />
                Mostrar onde dá para andar
              </label>
              <label className="t2e-field">
                <span>Encaixe ao colocar/mover</span>
                <select value={snap} onChange={(e) => setSnap(Number(e.target.value))}>
                  <option value={16}>Quadradinho (16 px)</option>
                  <option value={8}>Meio (8 px)</option>
                  <option value={1}>Livre (1 px)</option>
                </select>
              </label>
            </section>
            {meta && (
              <section className="t2e-card">
                <h3>Arquivo</h3>
                <div className="t2e-row t2e-actions">
                  <button type="button" onClick={exportJson}>
                    Baixar .json
                  </button>
                  <label className="t2e-filebtn">
                    Importar
                    <input type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files[0] && importJson(e.target.files[0])} />
                  </label>
                </div>
                <button type="button" className="danger" onClick={doDelete} disabled={meta.padrao && !meta.db}>
                  {meta.padrao ? 'Voltar ao original' : 'Apagar mapa'}
                </button>
              </section>
            )}
            <p className="muted t2e-tip">
              {map.objects.length} objetos · {map.anims.length} animados · {map.lights.length} luzes · {map.doors.length} portas · {map.npcs.length} personagens · {map.items.length} itens
            </p>
          </aside>
        </div>
      )}
    </div>
  )
}

