import { TILE, WALL_TOP, itemRect, besideItem } from '../../lib/room'
import { isSleep, BODY_H } from './roomHelpers'
import { spriteOf } from '../../lib/roomDraw'
import { canPlace, placeAt, MAX_ITEMS, emptyLayout } from '../../lib/rooms'
import { nextVariant, rotated, buildItem } from '../../lib/roomCatalog'
import { useEffect } from 'react'
import { saveRoomLayout } from '../../services/profiles'

// Toque, mouse e teclado na sala, e o modo "decorar o quarto" (arrastar, girar, desfazer, salvar).
export function useRoomControls({ stateRef, canvasRef, decoRef, selectPerson, setDeco, deco, stageRef, setPanel, fullscreen, toggleFullscreen, applyScene, sceneFromLayout, setSaving, setError, user, setRoomEmpty }) {
  // ---------- toque e mouse
  const toRoom = (event) => {
    const st = stateRef.current
    const rect = canvasRef.current.getBoundingClientRect()
    return {
      lx: ((event.clientX - rect.left) / rect.width) * st.scene.cols * TILE,
      ly: ((event.clientY - rect.top) / rect.height) * (st.scene.rows * TILE + WALL_TOP) - WALL_TOP,
    }
  }
  const personAt = (lx, ly) => {
    let hit = null
    let best = Infinity
    stateRef.current.players.forEach((p) => {
      const cy = isSleep(p.pose) ? p.y * TILE : p.y * TILE + TILE - BODY_H / 2
      const dist = Math.hypot(lx - (p.x * TILE + 8), ly - cy)
      if (dist < 12 && dist < best) {
        best = dist
        hit = p
      }
    })
    return hit
  }
  const petAt = (lx, ly) => {
    const st = stateRef.current
    return (
      st.scene.furniture.find((item) => {
        const spot = item.pet && st.petSpots.get(item.id)
        return spot && Math.hypot(lx - (spot.x * TILE + 8), ly - (spot.y * TILE + 9)) < 10
      }) ?? null
    )
  }
  const itemAt = (lx, ly, filter = (item) => item.act && !item.pet) => {
    const hits = stateRef.current.scene.furniture.filter((item) => {
      if (!filter(item)) return false
      const r = itemRect(item, spriteOf(item))
      return lx >= r.x && lx < r.x + r.w && ly >= r.y && ly < r.y + r.h
    })
    const depth = (item) => (item.floor ? -2 : item.wall ? -1 : item.y + item.h)
    hits.sort((a, b) => depth(b) - depth(a))
    return hits[0] ?? null
  }

  function handlePointer(event) {
    const st = stateRef.current
    if (!st.me || !st.scene) return
    const { lx, ly } = toRoom(event)
    if (decoRef.current) return // no modo decorar quem cuida é handleDown/handleUp
    const person = personAt(lx, ly)
    if (person && person !== st.me) {
      selectPerson(person.id)
      return
    }
    const pet = petAt(lx, ly)
    if (pet) {
      st.petPet?.(pet)
      return
    }
    // no celular o dedo é grosso: se não acertou em cheio, aceita um objeto bem pertinho (até 6 px da sala)
    let item = itemAt(lx, ly)
    if (!item && event.pointerType !== 'mouse') {
      for (const [dx, dy] of [[0, 6], [0, -6], [6, 0], [-6, 0], [5, 5], [-5, 5], [5, -5], [-5, -5]]) {
        item = itemAt(lx + dx, ly + dy)
        if (item) break
      }
    }
    if (item) {
      const me = st.me
      const from = me.pose ? { x: me.standX, y: me.standY } : { x: Math.round(me.x), y: Math.round(me.y) }
      st.goTo?.(besideItem(st.blocked, item, from), item)
      return
    }
    if (person) {
      selectPerson(person.id)
      return
    }
    st.goTo?.({ x: Math.floor(lx / TILE), y: Math.floor(ly / TILE) })
  }

  function handleMove(event) {
    const st = stateRef.current
    if (!st.scene) return
    const { lx, ly } = toRoom(event)
    st.hover = { x: Math.floor(lx / TILE), y: Math.floor(ly / TILE) }
    const current = decoRef.current
    if (current) {
      st.hoverItem = null
      if (st.drag) {
        const d = st.drag
        const x = Math.round(lx / TILE - d.offX)
        const y = d.wall ? 0 : Math.round(ly / TILE - d.offY)
        if (!d.moved && (x !== d.from.x || y !== d.from.y)) {
          d.moved = true
          setDeco((cur) => cur && { ...cur, dragging: d.index })
        }
        if (d.moved) st.ghost = { key: d.key, x, y, valid: canPlace(st.scene, d.key, x, y, d.index) }
        canvasRef.current.style.cursor = 'grabbing'
        return
      }
      if (current.pick) {
        const pos = placeAt(current.pick, lx, ly)
        st.ghost = pos ? { key: current.pick, ...pos, valid: canPlace(st.scene, current.pick, pos.x, pos.y) } : null
      } else st.ghost = null
      canvasRef.current.style.cursor = current.pick ? 'copy' : itemAt(lx, ly, (it) => it.index !== undefined) ? 'grab' : 'default'
      return
    }
    const person = personAt(lx, ly)
    const pet = person ? null : petAt(lx, ly)
    st.hoverPet = pet?.id ?? null
    st.hoverItem = (person && person !== st.me) || pet ? null : itemAt(lx, ly)
    canvasRef.current.style.cursor = person || pet || st.hoverItem ? 'pointer' : 'crosshair'
  }

  // ---------- modo decorar: colocar, arrastar e mexer nos móveis
  const commit = (change, extra = {}) =>
    setDeco((cur) => cur && { ...cur, note: null, ...extra, draft: change(cur.draft), history: [...cur.history, cur.draft].slice(-60), future: [] })
  const undo = () =>
    setDeco((cur) =>
      cur?.history.length ? { ...cur, draft: cur.history[cur.history.length - 1], history: cur.history.slice(0, -1), future: [cur.draft, ...cur.future], selected: null } : cur,
    )
  const redo = () =>
    setDeco((cur) => (cur?.future.length ? { ...cur, draft: cur.future[0], future: cur.future.slice(1), history: [...cur.history, cur.draft], selected: null } : cur))

  function handleDown(event) {
    const current = decoRef.current
    if (!current || current.pick) return
    const st = stateRef.current
    const { lx, ly } = toRoom(event)
    const item = itemAt(lx, ly, (it) => it.index !== undefined)
    if (!item) {
      setDeco((cur) => cur && { ...cur, selected: null })
      return
    }
    st.drag = { index: item.index, key: item.key, offX: lx / TILE - item.x, offY: ly / TILE - item.y, wall: item.wall, from: { x: item.x, y: item.y }, moved: false }
    canvasRef.current.setPointerCapture?.(event.pointerId)
    setDeco((cur) => cur && { ...cur, selected: item.index, note: cur.selected === item.index ? cur.note : null })
  }

  function handleUp(event) {
    const current = decoRef.current
    if (!current) return
    const st = stateRef.current
    const { lx, ly } = toRoom(event)
    if (st.drag) {
      const d = st.drag
      const g = st.ghost
      st.drag = null
      st.ghost = null
      if (d.moved && g?.valid) commit((draft) => ({ ...draft, items: draft.items.map((it, i) => (i === d.index ? [it[0], g.x, g.y] : it)) }), { dragging: null, selected: d.index })
      else if (d.moved) setDeco((cur) => cur && { ...cur, dragging: null })
      return
    }
    if (current.pick) {
      const key = current.pick
      const pos = placeAt(key, lx, ly)
      if (pos && canPlace(st.scene, key, pos.x, pos.y) && current.draft.items.length < MAX_ITEMS) {
        // Shift mantém o móvel escolhido para colocar outro igual
        commit((draft) => ({ ...draft, items: [...draft.items, [key, pos.x, pos.y]] }), { selected: event.shiftKey ? null : current.draft.items.length, pick: event.shiftKey ? key : null })
        st.ghost = null
      }
    }
  }

  function decoAction(kind) {
    const cur = decoRef.current
    if (!cur || cur.selected === null || cur.selected === undefined) return
    const i = cur.selected
    const [key, x, y] = cur.draft.items[i]
    const replace = (next) => commit((draft) => ({ ...draft, items: draft.items.map((it, j) => (j === i ? [next, x, y] : it)) }))
    if (kind === 'remove') commit((draft) => ({ ...draft, items: draft.items.filter((_, j) => j !== i) }), { selected: null })
    if (kind === 'move') commit((draft) => ({ ...draft, items: draft.items.filter((_, j) => j !== i) }), { selected: null, pick: key })
    if (kind === 'copy') setDeco((c) => c && { ...c, pick: key, selected: null })
    if (kind === 'color' && nextVariant(key)) replace(nextVariant(key))
    if (kind === 'rotate' && rotated(key)) {
      // girando, o móvel pode mudar de tamanho: tenta no mesmo lugar e, se não couber, nos vizinhos
      const next = rotated(key)
      const scene = stateRef.current.scene
      const tries = [[0, 0], [0, -1], [-1, 0], [-1, -1], [0, -2], [-2, 0], [1, 0], [0, 1], [-2, -1], [-1, -2]]
      const spot = scene && tries.map(([ox, oy]) => [x + ox, y + oy]).find(([tx, ty]) => canPlace(scene, next, tx, ty, i))
      if (spot) commit((draft) => ({ ...draft, items: draft.items.map((it, j) => (j === i ? [next, spot[0], spot[1]] : it)) }))
      else setDeco((c) => c && { ...c, note: 'Não cabe girado aqui. Mova o móvel para um lugar com mais espaço.' })
    }
  }

  // atalhos do modo decorar
  useEffect(() => {
    if (!deco) return undefined
    const onKey = (event) => {
      if (event.target.closest?.('input, textarea')) return
      const ctrl = event.ctrlKey || event.metaKey
      if (ctrl && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
      } else if (ctrl && event.key.toLowerCase() === 'y') {
        event.preventDefault()
        redo()
      } else if (!ctrl && event.key.toLowerCase() === 'r') {
        // R: gira o móvel selecionado (ou o que está sendo colocado)
        const cur = decoRef.current
        if (cur?.pick && rotated(cur.pick)) setDeco((c) => c && { ...c, pick: rotated(c.pick) })
        else decoAction('rotate')
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        decoAction('remove')
      } else if (event.key === 'Escape') {
        stateRef.current.ghost = null
        setDeco((cur) => cur && { ...cur, pick: null, selected: null })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!deco])

  // posição da barrinha de ações em cima do móvel selecionado
  function toolbarSpot() {
    const st = stateRef.current
    const canvas = canvasRef.current
    const stage = stageRef.current
    if (!deco || deco.pick || deco.dragging != null || deco.selected == null || !canvas || !stage || !st.scene) return null
    const entry = deco.draft.items[deco.selected]
    const item = entry && buildItem(entry[0], entry[1], entry[2], 'sel')
    if (!item) return null
    const r = itemRect(item, spriteOf(item))
    const c = canvas.getBoundingClientRect()
    const sr = stage.getBoundingClientRect()
    const k = c.width / (st.scene.cols * TILE)
    return { left: c.left - sr.left + (r.x + r.w / 2) * k, top: Math.max(4, c.top - sr.top + (r.y + WALL_TOP) * k - 8), item }
  }

  function handleKey(event) {
    const st = stateRef.current
    if (decoRef.current) return
    const dirs = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] }
    const dir = dirs[event.key]
    if (!dir || !st.me || decoRef.current) return
    event.preventDefault()
    const me = st.me
    let from = { x: Math.round(me.x), y: Math.round(me.y) }
    if (me.pose) from = { x: me.standX, y: me.standY }
    else if (me.path.length) from = me.path[me.path.length - 1]
    st.goTo?.({ x: from.x + dir[0], y: from.y + dir[1] })
  }

  // ---------- modo decorar
  function startDecor() {
    const st = stateRef.current
    setPanel(null)
    st.decorating = true
    setDeco({ draft: JSON.parse(JSON.stringify(st.savedLayout ?? emptyLayout())), pick: null, selected: null, dragging: null, history: [], future: [] })
    // no computador, decorar abre em tela cheia (mais espaço para o quarto e o catálogo)
    if (!fullscreen && window.innerWidth >= 900) {
      st.autoFullscreen = true
      toggleFullscreen()
    } else setTimeout(() => st.resize?.(), 60)
  }
  function endDecor() {
    const st = stateRef.current
    st.decorating = false
    st.drag = null
    st.ghost = null
    if (st.autoFullscreen && fullscreen) toggleFullscreen()
    st.autoFullscreen = false
    setTimeout(() => st.resize?.(), 60)
  }
  function cancelDecor() {
    const st = stateRef.current
    endDecor()
    setDeco(null)
    st.ghost = null
    applyScene(sceneFromLayout(st.savedLayout))
  }
  async function saveDecor() {
    const st = stateRef.current
    setSaving(true)
    setError(null)
    try {
      await saveRoomLayout(user.id, deco.draft)
      st.savedLayout = deco.draft
      st.myLayout = deco.draft
      st.shareLayout?.()
      setRoomEmpty(!deco.draft.items.length)
      endDecor()
      setDeco(null)
      st.ghost = null
    } catch (err) {
      setError(err)
    } finally {
      setSaving(false)
    }
  }
  return { startDecor, handlePointer, handleDown, handleUp, handleMove, handleKey, toolbarSpot, decoAction, commit, undo, redo, saveDecor, cancelDecor }
}
