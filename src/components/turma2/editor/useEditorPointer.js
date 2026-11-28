import { T, themeName } from '../../../lib/turma2/assets'
import { KIND_LIST, boxOf, placeAt, uid, defaultDepth, setBlock, trafficSize, TILE_KINDS, clamp, leftOf, ZOOMS } from './editorHelpers'
import { setCells, emptyLayer, TERRAINS, paintCells, allCells, around } from '../../../lib/turma2/autotile'
import DATA from '../../../lib/turma2Rooms.json'
import { randomChar } from '../../../lib/turma2/character'
import { useCallback, useEffect } from 'react'

// Mouse e toque no editor: escolher, arrastar, pintar o chão, bloquear, colocar peças e o zoom da roda.
export function useEditorPointer({ canvasRef, viewRef, lib, brush, erase, terrainId, floorRef, sheet, mapRef, boxRef, dragRef, tool, spaceRef, setTool, setSel, itemOf, chosen, libMode, setStatus, snap, commit, setMap, blockMode, rows, meta, charLib, itemKind, hoverRef, updateItem, undoRef, redoRef, bump, waterKind, setZoomLabel, map, testing }) {
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
      ...(m.traffic ?? []).map((it) => ['traffic', it]),
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
    // cerca: fechar ou abrir um cercado muda o "lado de dentro" de todos os pedaços: redesenha o mapa todo
    const ring = erase === 'all' || TERRAINS.find((t) => t.id === terrainId)?.ring
    if (floorRef.current && sheet) paintCells(floorRef.current.getContext('2d'), sheet, next, ring ? allCells(next) : around(cells))
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
    } else if (tool === 'traffic') {
      const anim = libMode === 'anims'
      const pick = anim ? chosen.anims : chosen[libMode] ?? chosen.pecas
      if (!pick) {
        setStatus('Escolha primeiro um carro (aba Peças, tema Veículos) ou um barco (aba Animados).')
        return
      }
      const c = anim ? { id: uid(), a: pick.n, speed: 20 } : { id: uid(), src: pick.src, t: pick.t, n: pick.n, speed: 60 }
      const [tw, th] = trafficSize(c, lib)
      ;[c.x, c.y] = placeAt(w, tw, th, snap)
      commit({ ...m, traffic: [...(m.traffic ?? []), c] })
      setSel({ kind: 'traffic', id: c.id })
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
  return { zoomAt, onPointerDown, onPointerMove, onPointerUp }
}
