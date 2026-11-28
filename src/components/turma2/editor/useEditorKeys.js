import { useEffect } from 'react'
import { T } from '../../../lib/turma2/assets'
import { TILE_KINDS, TOOLS } from './editorHelpers'

// Atalhos de teclado do editor (ferramentas, desfazer, apagar, mover a seleção, espaço para arrastar a vista).
export function useEditorKeys({ testing, creating, charEdit, spaceRef, boxRef, redo, undo, duplicateSel, sel, removeSel, setSel, setTool, updateItem, zoomAt }) {
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

}
