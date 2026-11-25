import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import DATA from '../../lib/turma2Rooms.json'
import { T, animAtlasUrl, atlasUrl, loadImage, loadLibrary, themeName } from '../../lib/turma2/assets'
import { ASPHALT, BASES, TERRAINS, allCells, around, emptyLayer, loadAutotiles, paintCells, setCells } from '../../lib/turma2/autotile'
import { composeChar, drawChar, loadCharLib, randomChar } from '../../lib/turma2/character'
import { newMap, normalizeMap, walkGrid, waterFrames } from '../../lib/turma2/compile'
import { useAuth } from '../../contexts/AuthContext'
import { isMapRow } from '../../lib/turma2/hudConfig'
import { deleteMap, listMaps, saveMap } from '../../services/turma2Maps'
import { CharacterPicker } from './Turma2Character'
import Turma2Game from './Turma2Game'

// Editor de mapas da Turma 2.0 (só o admin). Monta um mapa inteiro com as peças do pacote LimeZu:
// chão pintado (as bordas se encaixam sozinhas), água animada, objetos, animados, luzes da noite,
// portas para outros mapas, coisas que vão e voltam, onde o jogador nasce e onde dá para andar.
// O mapa fica salvo na tabela turma2_maps; "Publicar" faz ele aparecer para a turma no jogo.

const TOOLS = [
  ['select', '🖱️', 'Selecionar e mover', 'v'],
  ['object', '🪑', 'Colocar objeto', 'o'],
  ['anim', '✨', 'Colocar animado', 'a'],
  ['terrain', '🖌️', 'Pintar chão', 'p'],
  ['water', '🌊', 'Água (lago ou mar)', 'g'],
  ['block', '🚧', 'Onde dá para andar', 'b'],
  ['light', '💡', 'Luz da noite', 'l'],
  ['door', '🚪', 'Porta para outro mapa', 'd'],
  ['patrol', '🚤', 'Vai e volta', 'r'],
  ['npc', '🧑', 'Personagem (NPC)', 'c'],
  ['item', '🎁', 'Item para pegar', 'i'],
  ['spawn', '📍', 'Onde o jogador nasce', 'n'],
  ['hand', '✋', 'Arrastar a vista', 'h'],
]
const HELP = {
  select: 'Clique numa coisa para escolher; arraste para mover. Setas movem 1 px (Shift: 16). Delete apaga, Ctrl+D duplica. Arrastar o vazio move a vista.',
  object: 'Escolha uma peça na biblioteca e clique no mapa para colocar (pode colocar várias). Botão direito ou Esc volta a selecionar.',
  anim: 'Escolha um animado na biblioteca e clique no mapa. Fogueira, bandeira, fantasma, pássaro…',
  terrain: 'Escolha o chão e pinte arrastando. As bordas se ajustam sozinhas. Borracha apaga.',
  water: 'Arraste um retângulo. Lago tem margem em volta; mar tem areia só em cima. Ninguém anda na água.',
  block: 'Pinte de vermelho onde não dá para andar e de verde onde dá (por cima do automático). "Automático" desfaz o ajuste.',
  light: 'Clique para pôr uma luz. Ela só aparece no fim de tarde e à noite.',
  door: 'Clique no quadradinho da porta. Quem pisar ali vai para o mapa escolhido, no ponto escolhido.',
  patrol: 'Escolha um animado (barco, carro, bicho) e arraste na horizontal: ele vai e volta nesse trecho.',
  npc: 'Clique num quadradinho para pôr um personagem. Depois escolha o visual, o nome, o que ele fala e se fica parado, passeia, sentado ou no celular.',
  item: 'Moeda ou peça da biblioteca que o jogador pega ao passar por cima (vai para a mochila). Escolha abaixo e clique no mapa.',
  spawn: 'Clique onde o jogador aparece quando entra no mapa.',
  hand: 'Arraste para mover a vista. Roda do mouse dá zoom (também funciona em qualquer ferramenta).',
}
const KIND_LIST = { object: 'objects', anim: 'anims', patrol: 'patrols', light: 'lights', door: 'doors', water: 'water', npc: 'npcs', item: 'items' }
const KIND_NAME = { object: 'Objeto', anim: 'Animado', patrol: 'Vai e volta', light: 'Luz', door: 'Porta', water: 'Água', npc: 'Personagem', item: 'Item para pegar' }
const TILE_KINDS = new Set(['door', 'water', 'npc', 'item']) // posição em quadradinhos (o resto é em px)
const MODOS = [
  ['parado', 'Parado (vira para quem chega)'],
  ['passeia', 'Passeia por perto'],
  ['senta', 'Sentado'],
  ['celular', 'No celular'],
]
const ZOOMS = [0.5, 1, 1.5, 2, 3, 4, 5, 6]
const DRAFT_KEY = 't2-editor-rascunho'
const MAX_SIDE = 160

const uid = () => Math.random().toString(36).slice(2, 9)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(',')
const rgbToHex = (rgb) => `#${(rgb ?? '255,200,120').split(',').map((n) => Number(n).toString(16).padStart(2, '0')).join('')}`
const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40)

function resizeMap(map, w, h) {
  const terrain = {}
  for (const [id, layer] of Object.entries(map.terrain ?? {})) {
    let s = ''
    for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) s += x < map.w && y < map.h ? layer[y * map.w + x] : '0'
    terrain[id] = s
  }
  const block = {}
  for (const [k, v] of Object.entries(map.block ?? {})) {
    const [x, y] = k.split(',').map(Number)
    if (x < w && y < h) block[k] = v
  }
  return { ...map, w, h, terrain, block, spawn: [Math.min(map.spawn[0], w - 1), Math.min(map.spawn[1], h - 1)] }
}

/** caixa (em px) de cada coisa do mapa, para clicar e desenhar a seleção */
function boxOf(kind, it, lib) {
  if (kind === 'object') {
    const r = lib[it.src ?? 'pecas']?.[it.t]?.[it.n]
    return r ? [it.x, it.y, r[2], r[3]] : [it.x, it.y, 16, 16]
  }
  if (kind === 'anim') {
    const r = lib.anims[it.n]
    return r ? [it.x, it.y, it.fw ?? r[3], r[4]] : [it.x, it.y, 16, 16]
  }
  if (kind === 'patrol') {
    const r = lib.anims[it.r]
    const fw = r?.[3] ?? 16
    const fh = r?.[4] ?? 16
    return [it.x0, it.y - fh, it.x1 - it.x0 + fw, fh]
  }
  if (kind === 'light') return [it.x - 6, it.y - 6, 12, 12]
  if (kind === 'door') return [it.x * T, it.y * T, T, T]
  if (kind === 'water') return [it.x * T, it.y * T, it.w * T, it.h * T]
  if (kind === 'npc') return [it.x * T, it.y * T - T, T, T * 2]
  if (kind === 'item') return [it.x * T, it.y * T, T, T]
  return [0, 0, 0, 0]
}

// quanto do pé de um objeto bloqueia, por padrão (o resto o boneco passa por trás)
const defaultDepth = (h) => (h <= 32 ? 1 : Math.ceil(h / T / 2))

/** procura a versão "para a esquerda" de um animado que vai para a direita */
function leftOf(name, anims) {
  for (const [a, b] of [['right', 'left'], ['_r_', '_l_'], ['_r', '_l']]) {
    const guess = name.replace(a, b)
    if (guess !== name && anims[guess]) return guess
  }
  return name
}

/** miniatura de um pedaço de uma imagem grande (sem baixar nada além da própria imagem) */
function Thumb({ url, rect, size = 56 }) {
  const [x, y, w, h] = rect
  const big = Math.max(w, h)
  const s = big <= size ? Math.max(1, Math.floor(size / big)) : size / big
  return (
    <span className="t2e-thumb" style={{ width: Math.max(1, w * s), height: Math.max(1, h * s) }}>
      <span style={{ width: w, height: h, backgroundImage: `url(${url})`, backgroundPosition: `-${x}px -${y}px`, transform: `scale(${s})` }} />
    </span>
  )
}

function Library({ lib, mode, setMode, chosen, onChoose }) {
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
    const themes = q ? Object.keys(src) : [theme[mode]]
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
          {Object.keys(lib[mode]).map((t) => (
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

function Num({ label, value, onChange, min, max, step = 1 }) {
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

function LightFields({ value, onChange }) {
  const on = !!value
  return (
    <div className="t2e-row">
      <label className="t2e-check">
        <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked ? [48, '255,200,120'] : undefined)} />
        Acende à noite
      </label>
      {on && (
        <>
          <Num label="Raio" value={value[0]} min={8} max={400} onChange={(v) => onChange([v, value[1]])} />
          <label className="t2e-field">
            <span>Cor</span>
            <input type="color" value={rgbToHex(value[1])} onChange={(e) => onChange([value[0], hexToRgb(e.target.value)])} />
          </label>
        </>
      )}
    </div>
  )
}

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
        const asphalt = rect ? loadImage(atlasUrl('pecas', ASPHALT.theme)).then((img) => ({ img, rect })) : null
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

  // ---------- desenhar ----------
  const getImg = (url) => {
    const c = imgs.current
    if (!c.has(url)) {
      c.set(url, null)
      loadImage(url).then((img) => c.set(url, img)).catch(() => {})
    }
    return c.get(url)
  }
  const chars = useRef(new Map())
  const getChar = (c) => {
    const k = JSON.stringify(c)
    const m = chars.current
    if (!m.has(k)) {
      m.set(k, null)
      composeChar(c).then((img) => m.set(k, img)).catch(() => {})
    }
    return m.get(k)
  }
  const getWater = (w) => {
    const k = `${w.w}x${w.h}:${w.kind}`
    const c = waterCache.current
    if (!c.has(k)) {
      c.set(k, null)
      waterFrames(w).then((cv) => c.set(k, cv))
    }
    return c.get(k)
  }

  const walk = useMemo(() => (lib && map && (showWalk || tool === 'block') ? walkGrid(map, lib) : null), [lib, map, showWalk, tool])
  const live = useRef({})
  live.current = { map, lib, tool, sel, chosen, libMode, showGrid, walk, sky, snap, terrainId, brush, erase }

  useEffect(() => {
    // durante o "Testar" o canvas do editor sai da tela; ao voltar é um canvas novo, então recomeça aqui
    if (!map || testing) return undefined
    const canvas = canvasRef.current
    const box = boxRef.current
    const ctx = canvas.getContext('2d')
    const shade = document.createElement('canvas')
    let raf = 0
    const frame = (now) => {
      const L = live.current
      const m = L.map
      const r = box.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      const W = Math.round(r.width * dpr)
      const H = Math.round(r.height * dpr)
      if (canvas.width !== W || canvas.height !== H) {
        canvas.width = W
        canvas.height = H
        canvas.style.width = `${r.width}px`
        canvas.style.height = `${r.height}px`
      }
      const { zoom: z, ox, oy } = viewRef.current
      const time = now / 1000
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, W, H)
      ctx.setTransform(z, 0, 0, z, ox, oy)
      ctx.imageSmoothingEnabled = false
      if (floorRef.current) ctx.drawImage(floorRef.current, 0, 0)
      const wf = Math.floor(time * 5) % 8
      for (const w of m.water) {
        const cv = getWater(w)
        if (cv) ctx.drawImage(cv, 0, wf * w.h * T, w.w * T, w.h * T, w.x * T, w.y * T, w.w * T, w.h * T)
      }
      // coisas de pé, de cima para baixo
      const list = []
      for (const o of m.objects) {
        const rr = L.lib[o.src ?? 'pecas']?.[o.t]?.[o.n]
        if (rr) list.push([o.y + rr[3], 0, o, rr])
      }
      for (const a of m.anims) {
        const rr = L.lib.anims[a.n]
        if (rr) list.push([a.y + rr[4], 1, a, rr])
      }
      for (const p of m.patrols) {
        const rr = L.lib.anims[p.r]
        if (rr) list.push([p.y, 2, p, rr])
      }
      for (const n of m.npcs) list.push([(n.y + 1) * T, 3, n, null])
      list.sort((p, q) => p[0] - q[0])
      for (const [, kind, it, rr] of list) {
        if (kind === 0) {
          const img = getImg(atlasUrl(it.src ?? 'pecas', it.t))
          if (!img) continue
          if (it.f) {
            ctx.save()
            ctx.translate(it.x + rr[2], it.y)
            ctx.scale(-1, 1)
            ctx.drawImage(img, rr[0], rr[1], rr[2], rr[3], 0, 0, rr[2], rr[3])
            ctx.restore()
          } else ctx.drawImage(img, rr[0], rr[1], rr[2], rr[3], it.x, it.y, rr[2], rr[3])
        } else if (kind === 1) {
          const img = getImg(animAtlasUrl(rr[0]))
          if (!img) continue
          const fw = it.fw ?? rr[3]
          const frames = it.fr ?? rr[5]
          const f = Math.floor(time * (it.fps ?? 8)) % frames
          const night = L.sky === 'noite'
          ctx.globalAlpha = (it.w === 'n' && !night) || (it.w === 'd' && night) ? 0.35 : 1
          ctx.drawImage(img, rr[1] + f * fw, rr[2], fw, rr[4], it.x, it.y, fw, rr[4])
          ctx.globalAlpha = 1
        } else if (kind === 3) {
          const img = getChar(it.c)
          const pose = it.modo === 'senta' ? 'senta' : it.modo === 'celular' ? 'celular' : 'parado'
          if (img) drawChar(ctx, img, pose, pose === 'senta' && it.dir !== 'left' ? 'right' : it.dir ?? 'down', time, it.x * T, it.y * T - T)
          if (it.nome) {
            ctx.font = '6px sans-serif'
            ctx.textAlign = 'center'
            ctx.fillStyle = '#fff'
            ctx.fillText(it.nome, it.x * T + T / 2, it.y * T - T - 2)
          }
          if (it.modo === 'passeia') {
            const r = it.raio ?? 3
            ctx.strokeStyle = 'rgba(255,209,102,0.6)'
            ctx.lineWidth = 1 / z
            ctx.strokeRect((it.x - r) * T, (it.y - r) * T, (2 * r + 1) * T, (2 * r + 1) * T)
          }
        } else {
          const img = getImg(animAtlasUrl(rr[0]))
          if (!img) continue
          const f = Math.floor(time * 8) % rr[5]
          ctx.drawImage(img, rr[1] + f * rr[3], rr[2], rr[3], rr[4], it.x0, it.y - rr[4], rr[3], rr[4])
          ctx.globalAlpha = 0.4
          ctx.drawImage(img, rr[1], rr[2], rr[3], rr[4], it.x1, it.y - rr[4], rr[3], rr[4])
          ctx.globalAlpha = 1
          ctx.strokeStyle = '#ffd166'
          ctx.lineWidth = 1 / z
          ctx.setLineDash([4 / z, 3 / z])
          ctx.beginPath()
          ctx.moveTo(it.x0 + rr[3] / 2, it.y - 1)
          ctx.lineTo(it.x1 + rr[3] / 2, it.y - 1)
          ctx.stroke()
          ctx.setLineDash([])
        }
      }
      // luzes (todas as fontes)
      const lights = m.lights.map((l) => [l.x, l.y, l.r, l.c])
      for (const o of m.objects) {
        const rr = L.lib[o.src ?? 'pecas']?.[o.t]?.[o.n]
        if (o.l && rr) lights.push([o.x + rr[2] / 2, o.y + rr[3] / 2, o.l[0], o.l[1]])
      }
      for (const a of m.anims) {
        const rr = L.lib.anims[a.n]
        if (a.l && rr) lights.push([a.x + (a.fw ?? rr[3]) / 2, a.y + rr[4] / 2, a.l[0], a.l[1]])
      }
      if (L.sky !== 'dia') {
        const night = L.sky === 'noite'
        if (shade.width !== W || shade.height !== H) {
          shade.width = W
          shade.height = H
        }
        const s = shade.getContext('2d')
        s.setTransform(1, 0, 0, 1, 0, 0)
        s.globalCompositeOperation = 'source-over'
        s.clearRect(0, 0, W, H)
        s.setTransform(z, 0, 0, z, ox, oy)
        s.fillStyle = night ? 'rgba(6, 10, 38, 0.8)' : 'rgba(150, 60, 30, 0.3)'
        s.fillRect(0, 0, m.w * T, m.h * T)
        s.globalCompositeOperation = 'destination-out'
        for (const [lx, ly, lr] of lights) {
          const g = s.createRadialGradient(lx, ly, 0, lx, ly, lr)
          g.addColorStop(0, `rgba(0,0,0,${night ? 0.95 : 0.6})`)
          g.addColorStop(1, 'rgba(0,0,0,0)')
          s.fillStyle = g
          s.fillRect(lx - lr, ly - lr, lr * 2, lr * 2)
        }
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.drawImage(shade, 0, 0)
        ctx.setTransform(z, 0, 0, z, ox, oy)
        ctx.globalCompositeOperation = 'lighter'
        for (const [lx, ly, lr, c] of lights) {
          const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, lr * 0.7)
          g.addColorStop(0, `rgba(${c},${night ? 0.32 : 0.14})`)
          g.addColorStop(1, `rgba(${c},0)`)
          ctx.fillStyle = g
          ctx.fillRect(lx - lr, ly - lr, lr * 2, lr * 2)
        }
        ctx.globalCompositeOperation = 'source-over'
      }
      // ajudas do editor
      ctx.lineWidth = 1 / z
      if (L.walk) {
        ctx.globalAlpha = 0.33
        L.walk.forEach((line, y) => {
          for (let x = 0; x < line.length; x += 1) {
            const forced = m.block[`${x},${y}`]
            ctx.fillStyle = line[x] === '.' ? '#3ddc84' : '#ff4d4d'
            ctx.fillRect(x * T + 1, y * T + 1, T - 2, T - 2)
            if (forced !== undefined) {
              ctx.globalAlpha = 0.9
              ctx.strokeStyle = '#fff'
              ctx.strokeRect(x * T + 3, y * T + 3, T - 6, T - 6)
              ctx.globalAlpha = 0.33
            }
          }
        })
        ctx.globalAlpha = 1
      }
      if (L.showGrid && z >= 1) {
        ctx.strokeStyle = 'rgba(255,255,255,0.12)'
        ctx.beginPath()
        for (let x = 0; x <= m.w; x += 1) {
          ctx.moveTo(x * T, 0)
          ctx.lineTo(x * T, m.h * T)
        }
        for (let y = 0; y <= m.h; y += 1) {
          ctx.moveTo(0, y * T)
          ctx.lineTo(m.w * T, y * T)
        }
        ctx.stroke()
      }
      ctx.strokeStyle = 'rgba(94,234,212,0.7)'
      ctx.strokeRect(0, 0, m.w * T, m.h * T)
      if (L.tool === 'water' || L.sel?.kind === 'water') {
        ctx.strokeStyle = '#7cc4ff'
        for (const w of m.water) ctx.strokeRect(w.x * T, w.y * T, w.w * T, w.h * T)
      }
      if (L.tool === 'light' || L.sel?.kind === 'light' || L.sky !== 'dia') {
        for (const l of m.lights) {
          ctx.strokeStyle = `rgba(${l.c},0.9)`
          ctx.beginPath()
          ctx.arc(l.x, l.y, l.r, 0, Math.PI * 2)
          ctx.stroke()
          ctx.fillStyle = `rgb(${l.c})`
          ctx.fillRect(l.x - 3, l.y - 3, 6, 6)
        }
      }
      for (const it of m.items) {
        const cx = it.x * T + T / 2
        const foot = (it.y + 1) * T - 2
        if (it.tipo === 'moeda') {
          const img = getImg('/limezu/editor/hud/i_moeda.png')
          if (img) ctx.drawImage(img, cx - 7, foot - 13, 15, 13)
        } else {
          const rr = L.lib[it.src ?? 'pecas']?.[it.t]?.[it.n]
          const img = rr && getImg(atlasUrl(it.src ?? 'pecas', it.t))
          if (img) {
            const sc = Math.min(1, 16 / Math.max(rr[2], rr[3]))
            ctx.drawImage(img, rr[0], rr[1], rr[2], rr[3], Math.round(cx - (rr[2] * sc) / 2), Math.round(foot - rr[3] * sc), Math.round(rr[2] * sc), Math.round(rr[3] * sc))
          }
        }
        ctx.strokeStyle = 'rgba(255,230,120,0.8)'
        ctx.strokeRect(it.x * T + 0.5, it.y * T + 0.5, T - 1, T - 1)
      }
      ctx.font = '6px sans-serif'
      ctx.textAlign = 'center'
      for (const d of m.doors) {
        ctx.fillStyle = 'rgba(255,140,60,0.45)'
        ctx.fillRect(d.x * T, d.y * T, T, T)
        ctx.strokeStyle = '#ff8c3c'
        ctx.strokeRect(d.x * T + 0.5, d.y * T + 0.5, T - 1, T - 1)
        ctx.fillStyle = '#fff'
        ctx.fillText(`→ ${d.to || '?'}`, d.x * T + T / 2, d.y * T - 2)
      }
      // onde nasce
      const [sx, sy] = m.spawn
      ctx.fillStyle = 'rgba(94,234,212,0.5)'
      ctx.fillRect(sx * T, sy * T, T, T)
      ctx.fillStyle = '#060b14'
      ctx.fillText('início', sx * T + T / 2, sy * T + 10)
      // seleção
      const it = itemOf(m, L.sel)
      if (it) {
        const [bx, by, bw, bh] = boxOf(L.sel.kind, it, L.lib)
        ctx.strokeStyle = '#5eead4'
        ctx.lineWidth = 2 / z
        ctx.setLineDash([5 / z, 3 / z])
        ctx.lineDashOffset = -time * 20 / z
        ctx.strokeRect(bx - 1, by - 1, bw + 2, bh + 2)
        ctx.setLineDash([])
        ctx.lineWidth = 1 / z
      }
      // prévia do que vai ser colocado / pintado
      const hv = hoverRef.current
      const dg = dragRef.current
      if (hv) {
        const pick = L.chosen[L.tool === 'anim' || L.tool === 'patrol' ? 'anims' : L.libMode === 'anims' ? 'pecas' : L.libMode]
        if (L.tool === 'object' && pick && !dg) {
          const rr = L.lib[pick.src]?.[pick.t]?.[pick.n]
          if (rr) {
            const [px, py] = placeAt(hv, rr[2], rr[3], L.snap)
            const img = getImg(atlasUrl(pick.src, pick.t))
            ctx.globalAlpha = 0.6
            if (img) ctx.drawImage(img, rr[0], rr[1], rr[2], rr[3], px, py, rr[2], rr[3])
            ctx.globalAlpha = 1
          }
        } else if (L.tool === 'anim' && pick && !dg) {
          const rr = L.lib.anims[pick.n]
          if (rr) {
            const [px, py] = placeAt(hv, rr[3], rr[4], L.snap)
            const img = getImg(animAtlasUrl(rr[0]))
            ctx.globalAlpha = 0.6
            if (img) ctx.drawImage(img, rr[1], rr[2], rr[3], rr[4], px, py, rr[3], rr[4])
            ctx.globalAlpha = 1
          }
        } else if (L.tool === 'terrain' || L.tool === 'block') {
          const n = L.tool === 'terrain' ? L.brush : 1
          const tx = Math.floor(hv.x / T) - Math.floor((n - 1) / 2)
          const ty = Math.floor(hv.y / T) - Math.floor((n - 1) / 2)
          ctx.strokeStyle = '#fff'
          ctx.strokeRect(tx * T, ty * T, n * T, n * T)
        } else if (L.tool === 'door' || L.tool === 'spawn') {
          ctx.strokeStyle = '#fff'
          ctx.strokeRect(Math.floor(hv.x / T) * T, Math.floor(hv.y / T) * T, T, T)
        }
      }
      if (dg?.rect) {
        const [ax, ay, bx2, by2] = dg.rect
        ctx.strokeStyle = '#fff'
        ctx.setLineDash([4 / z, 3 / z])
        if (dg.type === 'water') ctx.strokeRect(Math.min(ax, bx2) * T, Math.min(ay, by2) * T, (Math.abs(bx2 - ax) + 1) * T, (Math.abs(by2 - ay) + 1) * T)
        else {
          ctx.beginPath()
          ctx.moveTo(ax, ay)
          ctx.lineTo(bx2, ay)
          ctx.stroke()
        }
        ctx.setLineDash([])
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
    // o desenho lê tudo de live.current; só recomeça quando abre outro mapa
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!map, meta?.code, testing])

  // ---------- mouse ----------
  const toWorld = (e) => {
    const r = canvasRef.current.getBoundingClientRect()
    const dpr = canvasRef.current.width / r.width
    const { zoom, ox, oy } = viewRef.current
    return { x: ((e.clientX - r.left) * dpr - ox) / zoom, y: ((e.clientY - r.top) * dpr - oy) / zoom }
  }
  const tileOf = (w) => [Math.floor(w.x / T), Math.floor(w.y / T)]
  const inMap = (m, tx, ty) => tx >= 0 && ty >= 0 && tx < m.w && ty < m.h

  const hitTest = (m, w) => {
    const inside = (b) => w.x >= b[0] && w.y >= b[1] && w.x < b[0] + b[2] && w.y < b[1] + b[3]
    for (const kind of ['item', 'door', 'light']) {
      for (const it of [...m[KIND_LIST[kind]]].reverse()) if (inside(boxOf(kind, it, lib))) return { kind, id: it.id }
    }
    const stand = [
      ...m.objects.map((it) => ['object', it]),
      ...m.anims.map((it) => ['anim', it]),
      ...m.patrols.map((it) => ['patrol', it]),
      ...m.npcs.map((it) => ['npc', it]),
    ].map(([kind, it]) => {
      const b = boxOf(kind, it, lib)
      return [b[1] + b[3], kind, it, b]
    })
    stand.sort((p, q) => q[0] - p[0])
    for (const [, kind, it, b] of stand) if (inside(b)) return { kind, id: it.id }
    for (const it of [...m.water].reverse()) if (inside(boxOf('water', it, lib))) return { kind: 'water', id: it.id }
    return null
  }

  const paintTerrain = (m, tx, ty) => {
    const n = brush
    const cells = []
    const x0 = tx - Math.floor((n - 1) / 2)
    const y0 = ty - Math.floor((n - 1) / 2)
    for (let y = y0; y < y0 + n; y += 1) for (let x = x0; x < x0 + n; x += 1) if (inMap(m, x, y)) cells.push([x, y])
    if (!cells.length) return m
    const terrain = { ...m.terrain }
    if (erase === 'all') {
      for (const id of Object.keys(terrain)) terrain[id] = setCells(terrain[id], m.w, cells, false)
    } else {
      terrain[terrainId] = setCells(terrain[terrainId] ?? emptyLayer(m.w, m.h), m.w, cells, !erase)
    }
    const next = { ...m, terrain }
    if (floorRef.current && sheet) paintCells(floorRef.current.getContext('2d'), sheet, next, around(cells))
    return next
  }

  const onPointerDown = (e) => {
    const m = mapRef.current
    if (!m || !lib) return
    boxRef.current.focus({ preventScroll: true })
    canvasRef.current.setPointerCapture(e.pointerId)
    const w = toWorld(e)
    const [tx, ty] = tileOf(w)
    const pan = () => (dragRef.current = { type: 'pan', sx: e.clientX, sy: e.clientY, ox: viewRef.current.ox, oy: viewRef.current.oy })
    if (e.button === 1 || e.button === 2 || tool === 'hand' || spaceRef.current) {
      if (e.button === 2 && tool !== 'select' && tool !== 'hand') setTool('select')
      pan()
      return
    }
    if (tool === 'select') {
      const hit = hitTest(m, w)
      if (!hit) {
        setSel(null)
        pan()
        return
      }
      setSel(hit)
      const it = itemOf(m, hit)
      dragRef.current = { type: 'move', before: m, hit, start: w, orig: { ...it } }
    } else if (tool === 'object' || tool === 'anim') {
      const pick = tool === 'anim' ? chosen.anims : chosen[libMode === 'anims' ? 'pecas' : libMode] ?? chosen.pecas ?? chosen.moveis
      if (!pick) {
        setStatus('Escolha primeiro uma peça na biblioteca (à esquerda).')
        return
      }
      if (tool === 'object') {
        const rr = lib[pick.src][pick.t][pick.n]
        const [x, y] = placeAt(w, rr[2], rr[3], snap)
        const o = { id: uid(), src: pick.src, t: pick.t, n: pick.n, x, y, d: defaultDepth(rr[3]) }
        commit({ ...m, objects: [...m.objects, o] })
        setSel({ kind: 'object', id: o.id })
      } else {
        const rr = lib.anims[pick.n]
        const [x, y] = placeAt(w, rr[3], rr[4], snap)
        const a = { id: uid(), n: pick.n, x, y, fps: 8, d: rr[4] >= 16 ? 1 : 0, w: '' }
        commit({ ...m, anims: [...m.anims, a] })
        setSel({ kind: 'anim', id: a.id })
      }
    } else if (tool === 'terrain') {
      if (!inMap(m, tx, ty)) return
      dragRef.current = { type: 'paint', before: m, last: `${tx},${ty}` }
      setMap(paintTerrain(m, tx, ty))
    } else if (tool === 'block') {
      if (!inMap(m, tx, ty)) return
      dragRef.current = { type: 'block', before: m }
      setMap(setBlock(m, tx, ty, blockMode))
    } else if (tool === 'water') {
      if (!inMap(m, tx, ty)) return
      dragRef.current = { type: 'water', rect: [tx, ty, tx, ty] }
    } else if (tool === 'patrol') {
      if (!chosen.anims) {
        setStatus('Escolha primeiro um animado (aba Animados) para ir e voltar.')
        return
      }
      dragRef.current = { type: 'patrol', rect: [Math.round(w.x), (ty + 1) * T, Math.round(w.x), (ty + 1) * T] }
    } else if (tool === 'light') {
      const l = { id: uid(), x: Math.round(w.x), y: Math.round(w.y), r: 56, c: '255,200,120' }
      commit({ ...m, lights: [...m.lights, l] })
      setSel({ kind: 'light', id: l.id })
    } else if (tool === 'door') {
      if (!inMap(m, tx, ty)) return
      const target = rows.find((r) => r.code !== meta.code) ?? null
      const d = { id: uid(), x: tx, y: ty, to: target?.code ?? DATA.rooms[0].code, sx: target?.data?.spawn?.[0] ?? 0, sy: target?.data?.spawn?.[1] ?? 0 }
      if (!target) [d.sx, d.sy] = DATA.rooms[0].spawn
      commit({ ...m, doors: [...m.doors, d] })
      setSel({ kind: 'door', id: d.id })
    } else if (tool === 'npc') {
      if (!inMap(m, tx, ty)) return
      const n = { id: uid(), x: tx, y: ty, c: charLib ? randomChar(charLib) : null, nome: '', fala: 'Oi! Tudo bem?', modo: 'parado', dir: 'down', raio: 3 }
      commit({ ...m, npcs: [...m.npcs, n] })
      setSel({ kind: 'npc', id: n.id })
    } else if (tool === 'item') {
      if (!inMap(m, tx, ty)) return
      let it
      if (itemKind === 'moeda') it = { id: uid(), tipo: 'moeda', x: tx, y: ty, valor: 1 }
      else {
        const pick = chosen[libMode === 'anims' ? 'pecas' : libMode] ?? chosen.pecas ?? chosen.moveis
        if (!pick) {
          setStatus('Escolha primeiro uma peça na biblioteca para virar item.')
          return
        }
        const nome = pick.src === 'moveis' ? `${themeName(pick.t)} ${pick.n}` : pick.n.replace(/_\d+$/, '').replace(/_/g, ' ')
        it = { id: uid(), tipo: 'objeto', src: pick.src, t: pick.t, n: pick.n, x: tx, y: ty, nome: nome.charAt(0).toUpperCase() + nome.slice(1), desc: '' }
      }
      commit({ ...m, items: [...m.items, it] })
      setSel({ kind: 'item', id: it.id })
    } else if (tool === 'spawn') {
      if (!inMap(m, tx, ty)) return
      commit({ ...m, spawn: [tx, ty] })
    }
  }

  const onPointerMove = (e) => {
    const w = toWorld(e)
    hoverRef.current = w
    const dg = dragRef.current
    if (!dg) return
    const m = mapRef.current
    if (dg.type === 'pan') {
      const dpr = canvasRef.current.width / canvasRef.current.getBoundingClientRect().width
      viewRef.current = { ...viewRef.current, ox: dg.ox + (e.clientX - dg.sx) * dpr, oy: dg.oy + (e.clientY - dg.sy) * dpr }
    } else if (dg.type === 'move') {
      const dx = w.x - dg.start.x
      const dy = w.y - dg.start.y
      const o = dg.orig
      const k = dg.hit.kind
      let patch
      if (TILE_KINDS.has(k)) {
        patch = { x: o.x + Math.round(dx / T), y: o.y + Math.round(dy / T) }
      } else if (k === 'patrol') {
        const ddx = Math.round(dx / snap) * snap
        patch = { x0: o.x0 + ddx, x1: o.x1 + ddx, y: Math.round((o.y + dy) / snap) * snap }
      } else if (k === 'light') {
        patch = { x: Math.round(o.x + dx), y: Math.round(o.y + dy) }
      } else {
        const [, , bw, bh] = boxOf(k, o, lib)
        const nx = Math.round((o.x + dx) / snap) * snap
        const ny = Math.round((o.y + bh + dy) / snap) * snap - bh
        patch = { x: nx, y: ny }
        void bw
      }
      updateItem(k, dg.hit.id, patch, { history: false })
    } else if (dg.type === 'paint') {
      const [tx, ty] = tileOf(w)
      const key = `${tx},${ty}`
      if (key !== dg.last && inMap(m, tx, ty)) {
        dg.last = key
        setMap(paintTerrain(m, tx, ty))
      }
    } else if (dg.type === 'block') {
      const [tx, ty] = tileOf(w)
      if (inMap(m, tx, ty)) {
        const next = setBlock(m, tx, ty, blockMode)
        if (next !== m) setMap(next)
      }
    } else if (dg.type === 'water') {
      const [tx, ty] = tileOf(w)
      dg.rect = [dg.rect[0], dg.rect[1], clamp(tx, 0, m.w - 1), clamp(ty, 0, m.h - 1)]
    } else if (dg.type === 'patrol') {
      dg.rect = [dg.rect[0], dg.rect[1], Math.round(w.x), dg.rect[3]]
    }
  }

  const onPointerUp = () => {
    const dg = dragRef.current
    dragRef.current = null
    if (!dg) return
    const m = mapRef.current
    if (dg.before && dg.before !== m) {
      undoRef.current.push(dg.before)
      redoRef.current = []
      bump()
    }
    if (dg.type === 'water') {
      const [ax, ay, bx, by] = dg.rect
      const r = { id: uid(), x: Math.min(ax, bx), y: Math.min(ay, by), w: Math.abs(bx - ax) + 1, h: Math.abs(by - ay) + 1, kind: waterKind }
      if (waterKind === 'lago' && (r.w < 3 || r.h < 3)) {
        setStatus('O lago precisa de pelo menos 3x3 quadradinhos.')
        return
      }
      commit({ ...m, water: [...m.water, r] })
      setSel({ kind: 'water', id: r.id })
    } else if (dg.type === 'patrol') {
      const rr = lib.anims[chosen.anims.n]
      let [x0, y, x1] = [dg.rect[0], dg.rect[1], dg.rect[2]]
      if (x1 < x0) [x0, x1] = [x1, x0]
      x0 = Math.round(x0 - rr[3] / 2)
      x1 = Math.max(x0 + T, Math.round(x1 - rr[3] / 2))
      const p = { id: uid(), r: chosen.anims.n, l: leftOf(chosen.anims.n, lib.anims), x0, x1, y, speed: 14 }
      commit({ ...m, patrols: [...m.patrols, p] })
      setSel({ kind: 'patrol', id: p.id })
    }
  }

  const zoomAt = useCallback((factor, cx, cy) => {
    const v = viewRef.current
    const i = ZOOMS.indexOf(v.zoom)
    const ni = clamp((i < 0 ? 3 : i) + factor, 0, ZOOMS.length - 1)
    const z = ZOOMS[ni]
    if (z === v.zoom) return
    const c = canvasRef.current
    const px = cx ?? c.width / 2
    const py = cy ?? c.height / 2
    const wx = (px - v.ox) / v.zoom
    const wy = (py - v.oy) / v.zoom
    viewRef.current = { zoom: z, ox: Math.round(px - wx * z), oy: Math.round(py - wy * z) }
    setZoomLabel(z)
  }, [])

  useEffect(() => {
    const c = canvasRef.current
    if (!c) return undefined
    const onWheel = (e) => {
      e.preventDefault()
      const r = c.getBoundingClientRect()
      const dpr = c.width / r.width
      zoomAt(e.deltaY < 0 ? 1 : -1, (e.clientX - r.left) * dpr, (e.clientY - r.top) * dpr)
    }
    c.addEventListener('wheel', onWheel, { passive: false })
    return () => c.removeEventListener('wheel', onWheel)
  }, [zoomAt, map ? 1 : 0, testing])

  // ---------- teclado ----------
  useEffect(() => {
    const onKey = (e) => {
      if (testing || creating || charEdit) return
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return
      if (e.code === 'Space') {
        spaceRef.current = e.type === 'keydown'
        if (boxRef.current?.contains(e.target)) e.preventDefault()
        return
      }
      if (e.type !== 'keydown') return
      const ctrl = e.ctrlKey || e.metaKey
      if (ctrl && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
      } else if (ctrl && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        redo()
      } else if (ctrl && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        duplicateSel()
      } else if (ctrl && e.key.toLowerCase() === 's') {
        e.preventDefault()
        document.getElementById('t2e-save')?.click()
      } else if (!ctrl && (e.key === 'Delete' || e.key === 'Backspace') && sel) {
        e.preventDefault()
        removeSel()
      } else if (e.key === 'Escape') {
        setSel(null)
        setTool('select')
      } else if (!ctrl && sel && e.key.startsWith('Arrow')) {
        e.preventDefault()
        const step = e.shiftKey ? T : 1
        const [dx, dy] = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]
        const tileKind = TILE_KINDS.has(sel.kind)
        const s = tileKind ? 1 : step
        updateItem(sel.kind, sel.id, (it) =>
          sel.kind === 'patrol' ? { x0: it.x0 + dx * s, x1: it.x1 + dx * s, y: it.y + dy * s } : { x: it.x + dx * s, y: it.y + dy * s },
        )
      } else if (!ctrl && !e.altKey) {
        const t = TOOLS.find((x) => x[3] === e.key.toLowerCase())
        if (t) setTool(t[0])
        else if (e.key === '+' || e.key === '=') zoomAt(1)
        else if (e.key === '-') zoomAt(-1)
      }
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKey)
    }
  }, [testing, creating, charEdit, sel, undo, redo, duplicateSel, removeSel, updateItem, zoomAt])

  // ---------- salvar / abrir ----------
  const doSave = async (publish = meta?.published) => {
    if (!map || !meta) return
    setStatus('Salvando…')
    try {
      const row = await saveMap({ code: meta.code, name: meta.name, data: map, published: !!publish })
      setRows((list) => [...list.filter((r) => r.code !== row.code), row].sort((a, b) => a.name.localeCompare(b.name)))
      setMeta({ ...meta, published: row.published, saved: true })
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
    load(row.data, { code: row.code, name: row.name, published: row.published, saved: true })
    setStatus('')
  }
  const doDelete = async () => {
    if (!meta) return
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

  const propsPanel = () => {
    if (!selected) return null
    const k = sel.kind
    const up = (patch) => updateItem(k, sel.id, patch)
    return (
      <section className="t2e-card">
        <h3>
          {KIND_NAME[k]}
          {(k === 'object' || k === 'anim') && <small>{k === 'object' ? (selected.src === 'moveis' ? `${themeName(selected.t)} #${selected.n}` : selected.n) : selected.n}</small>}
        </h3>
        {k === 'object' || k === 'anim' || k === 'light' ? (
          <div className="t2e-row">
            <Num label="X (px)" value={selected.x} onChange={(v) => up({ x: v })} />
            <Num label="Y (px)" value={selected.y} onChange={(v) => up({ y: v })} />
          </div>
        ) : null}
        {TILE_KINDS.has(k) && (
          <div className="t2e-row">
            <Num label="X" value={selected.x} min={0} onChange={(v) => up({ x: v })} />
            <Num label="Y" value={selected.y} min={0} onChange={(v) => up({ y: v })} />
          </div>
        )}
        {k === 'object' && (
          <>
            <div className="t2e-row">
              <Num label="Fileiras que bloqueiam" value={selected.d ?? 1} min={0} max={30} onChange={(v) => up({ d: v })} />
              <label className="t2e-check">
                <input type="checkbox" checked={!!selected.f} onChange={(e) => up({ f: e.target.checked || undefined })} />
                Espelhar
              </label>
            </div>
            <p className="muted t2e-tip">0 = dá para passar por cima (tapete, sombra). O boneco passa atrás do resto.</p>
            <LightFields value={selected.l} onChange={(l) => up({ l })} />
          </>
        )}
        {k === 'anim' && (
          <>
            <div className="t2e-row">
              <Num label="Velocidade (quadros/s)" value={selected.fps ?? 8} min={1} max={30} onChange={(v) => up({ fps: v })} />
              <Num label="Fileiras que bloqueiam" value={selected.d ?? 0} min={0} max={20} onChange={(v) => up({ d: v })} />
            </div>
            <div className="t2e-row">
              <Num label="Largura do quadro" value={selected.fw ?? lib.anims[selected.n][3]} min={4} max={512} onChange={(v) => up({ fw: v })} />
              <Num label="Quadros" value={selected.fr ?? lib.anims[selected.n][5]} min={1} max={64} onChange={(v) => up({ fr: v })} />
            </div>
            <p className="muted t2e-tip">Se a animação "pular", ajuste a largura do quadro e o número de quadros.</p>
            <label className="t2e-field">
              <span>Aparece</span>
              <select value={selected.w ?? ''} onChange={(e) => up({ w: e.target.value })}>
                <option value="">Sempre</option>
                <option value="n">Só à noite (fantasmas, vagalumes)</option>
                <option value="d">Só de dia (pássaros)</option>
              </select>
            </label>
            <LightFields value={selected.l} onChange={(l) => up({ l })} />
          </>
        )}
        {k === 'patrol' && (
          <>
            <div className="t2e-row">
              <Num label="Começo X" value={selected.x0} onChange={(v) => up({ x0: v })} />
              <Num label="Fim X" value={selected.x1} onChange={(v) => up({ x1: v })} />
            </div>
            <div className="t2e-row">
              <Num label="Pé Y" value={selected.y} onChange={(v) => up({ y: v })} />
              <Num label="Velocidade" value={selected.speed ?? 14} min={2} max={200} onChange={(v) => up({ speed: v })} />
            </div>
            <label className="t2e-field">
              <span>Animado voltando</span>
              <select value={selected.l} onChange={(e) => up({ l: e.target.value })}>
                <option value={selected.r}>O mesmo, espelhado</option>
                {Object.keys(lib.anims)
                  .filter((n) => n !== selected.r)
                  .map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
              </select>
            </label>
            {chosen.anims && chosen.anims.n !== selected.r && (
              <button type="button" onClick={() => up({ r: chosen.anims.n, l: leftOf(chosen.anims.n, lib.anims) })}>
                Trocar por "{chosen.anims.n}"
              </button>
            )}
          </>
        )}
        {k === 'light' && (
          <div className="t2e-row">
            <Num label="Raio" value={selected.r} min={8} max={400} onChange={(v) => up({ r: v })} />
            <label className="t2e-field">
              <span>Cor</span>
              <input type="color" value={rgbToHex(selected.c)} onChange={(e) => up({ c: hexToRgb(e.target.value) })} />
            </label>
          </div>
        )}
        {k === 'door' && (
          <>
            <label className="t2e-field">
              <span>Leva para</span>
              <select
                value={selected.to}
                onChange={(e) => {
                  const t = allTargets.find((x) => x.code === e.target.value)
                  up({ to: e.target.value, sx: t?.spawn?.[0] ?? 0, sy: t?.spawn?.[1] ?? 0 })
                }}
              >
                {allTargets.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="t2e-row">
              <Num label="Aparece em X" value={selected.sx} min={0} onChange={(v) => up({ sx: v })} />
              <Num label="Aparece em Y" value={selected.sy} min={0} onChange={(v) => up({ sy: v })} />
            </div>
            <p className="muted t2e-tip">Dica: no mapa de destino, ponha outra porta de volta para cá.</p>
          </>
        )}
        {k === 'npc' && (
          <>
            <button type="button" className="t2e-npc-look" onClick={() => setCharEdit(sel.id)}>
              <span>Mudar o visual</span>
            </button>
            <label className="t2e-field">
              <span>Nome (aparece no balão)</span>
              <input value={selected.nome ?? ''} maxLength={30} placeholder="Seu Zé do quiosque" onChange={(e) => up({ nome: e.target.value })} />
            </label>
            <label className="t2e-field">
              <span>O que fala quando você chega perto</span>
              <textarea rows={3} maxLength={240} value={selected.fala ?? ''} placeholder="Vazio = não fala nada" onChange={(e) => up({ fala: e.target.value })} />
            </label>
            <label className="t2e-field">
              <span>Jeito</span>
              <select value={selected.modo ?? 'parado'} onChange={(e) => up({ modo: e.target.value })}>
                {MODOS.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            {selected.modo === 'passeia' ? (
              <Num label="Até quantos quadradinhos de distância" value={selected.raio ?? 3} min={1} max={20} onChange={(v) => up({ raio: v })} />
            ) : selected.modo === 'celular' ? null : (
              <label className="t2e-field">
                <span>Virado para</span>
                <select value={selected.dir ?? 'down'} onChange={(e) => up({ dir: e.target.value })}>
                  {(selected.modo === 'senta'
                    ? [
                        ['right', 'Direita'],
                        ['left', 'Esquerda'],
                      ]
                    : [
                        ['down', 'Frente'],
                        ['up', 'Costas'],
                        ['left', 'Esquerda'],
                        ['right', 'Direita'],
                      ]
                  ).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {selected.modo === 'senta' && <p className="muted t2e-tip">Ponha em cima de um banco ou cadeira e, em "Onde dá para andar", deixe esse quadradinho livre se quiser.</p>}
          </>
        )}
        {k === 'item' && (
          <>
            {selected.tipo === 'moeda' ? (
              <Num label="Vale quantas moedas" value={selected.valor ?? 1} min={1} max={999} onChange={(v) => up({ valor: v })} />
            ) : (
              <>
                <label className="t2e-field">
                  <span>Nome na mochila</span>
                  <input value={selected.nome ?? ''} maxLength={40} onChange={(e) => up({ nome: e.target.value })} />
                </label>
                <label className="t2e-field">
                  <span>Descrição (opcional)</span>
                  <textarea rows={2} maxLength={160} value={selected.desc ?? ''} onChange={(e) => up({ desc: e.target.value })} />
                </label>
              </>
            )}
            <p className="muted t2e-tip">Cada jogador pega uma vez só. Em "Ajuda" do jogo dá para recomeçar.</p>
          </>
        )}
        {k === 'water' && (
          <>
            <div className="t2e-row">
              <Num label="Largura" value={selected.w} min={1} onChange={(v) => up({ w: v })} />
              <Num label="Altura" value={selected.h} min={1} onChange={(v) => up({ h: v })} />
            </div>
            <label className="t2e-field">
              <span>Tipo</span>
              <select value={selected.kind} onChange={(e) => up({ kind: e.target.value })}>
                <option value="lago">Lago (com margem)</option>
                <option value="mar">Mar (areia em cima)</option>
              </select>
            </label>
          </>
        )}
        <div className="t2e-row t2e-actions">
          <button type="button" onClick={duplicateSel}>
            Duplicar
          </button>
          <button type="button" className="danger" onClick={removeSel}>
            Apagar
          </button>
        </div>
      </section>
    )
  }

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
            {(tool === 'object' || tool === 'anim' || tool === 'patrol' || tool === 'select' || (tool === 'item' && itemKind === 'objeto')) && (
              <Library
                lib={lib}
                mode={tool === 'anim' || tool === 'patrol' ? 'anims' : libMode}
                setMode={(mode) => {
                  setLibMode(mode)
                  if (mode === 'anims' && tool === 'object') setTool('anim')
                  else if (mode !== 'anims' && (tool === 'anim' || tool === 'patrol')) setTool('object')
                }}
                chosen={chosen[pickForTool]}
                onChoose={(it) => {
                  const key = it.src ?? 'anims'
                  setChosen({ ...chosen, [key]: it })
                  if (key === 'anims') {
                    if (tool !== 'patrol') setTool('anim')
                  } else {
                    setLibMode(key)
                    if (tool !== 'item') setTool('object')
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
                onSky={(s) => commit({ ...map, sky: s })}
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
                <button type="button" className="danger" onClick={doDelete}>
                  Apagar mapa
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

function placeAt(w, bw, bh, snap) {
  // o pé da peça fica no quadradinho do mouse, centralizada nele
  if (snap === 1) return [Math.round(w.x - bw / 2), Math.round(w.y - bh / 2)]
  const x = Math.round((w.x - bw / 2) / snap) * snap
  const foot = (Math.floor(w.y / snap) + 1) * snap
  return [x, foot - bh]
}

function setBlock(m, x, y, mode) {
  const k = `${x},${y}`
  const cur = m.block[k]
  if (mode === -1) {
    if (cur === undefined) return m
    const block = { ...m.block }
    delete block[k]
    return { ...m, block }
  }
  if (cur === mode) return m
  return { ...m, block: { ...m.block, [k]: mode } }
}

function MapCard({ map, meta, setMeta, onResize, onBase, onSky }) {
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
      <label className="t2e-field">
        <span>Hora ao entrar</span>
        <select value={map.sky ?? 'dia'} onChange={(e) => onSky(e.target.value)}>
          <option value="dia">Dia</option>
          <option value="tarde">Fim de tarde</option>
          <option value="noite">Noite</option>
        </select>
      </label>
    </section>
  )
}

function NewMapForm({ form, setForm, rows, onCancel, onCreate }) {
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
