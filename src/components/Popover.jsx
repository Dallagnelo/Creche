import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const GAP = 6
const MARGIN = 8
const SHEET_BREAKPOINT = 520

/**
 * Balão que abre embaixo (ou em cima) de um botão. No celular vira uma "gaveta" colada embaixo da tela.
 * Fica fora do resto da página (portal), então nenhuma janela ou card o corta.
 */
export default function Popover({ anchorRef, onClose, label, width = 340, children }) {
  const ref = useRef(null)
  const [style, setStyle] = useState({ top: 0, left: 0, opacity: 0 }) // opacity (e não visibility): assim o teclado já consegue focar dentro
  const sheet = window.innerWidth < SHEET_BREAKPOINT

  useLayoutEffect(() => {
    if (sheet) return undefined
    function place() {
      const anchor = anchorRef.current?.getBoundingClientRect()
      const box = ref.current
      if (!anchor || !box) return
      const height = box.offsetHeight
      const left = Math.min(Math.max(MARGIN, anchor.left), window.innerWidth - width - MARGIN)
      let top = anchor.bottom + GAP
      if (top + height > window.innerHeight - MARGIN) {
        const above = anchor.top - GAP - height
        top = above >= MARGIN ? above : Math.max(MARGIN, window.innerHeight - height - MARGIN)
      }
      setStyle({ top, left, width })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [anchorRef, sheet, width])

  function close() {
    onClose()
    anchorRef.current?.focus()
  }

  // Esc fecha só o balão (não a janela que está por trás), esteja o foco onde estiver.
  useEffect(() => {
    function handleKey(event) {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      event.preventDefault()
      onClose()
      anchorRef.current?.focus()
    }
    document.addEventListener('keydown', handleKey, true)
    return () => document.removeEventListener('keydown', handleKey, true)
  }, [onClose, anchorRef])

  return createPortal(
    // Os eventos não podem "subir" para a janela por trás (ela fecharia ao clicar no fundo).
    <div className={`pop-layer ${sheet ? 'is-sheet' : ''}`} onClick={(event) => event.stopPropagation()}>
      <div className="pop-backdrop" onClick={close} />
      <div ref={ref} className="pop" role="dialog" aria-label={label} style={sheet ? undefined : style}>
        {children}
      </div>
    </div>,
    document.body,
  )
}
