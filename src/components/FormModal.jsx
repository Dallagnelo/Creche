import { useEffect, useRef } from 'react'
import { useBackClose } from '../lib/backClose'
import { backdropClose } from '../lib/backdrop'

// Janela genérica para formulários de "adicionar" (evento, filme, jogo). Fecha com Esc ou clicando fora.
export default function FormModal({ label, onClose, className = '', children }) {
  useBackClose(onClose)
  const ref = useRef(null)

  useEffect(() => {
    function handleKey(event) {
      if (event.key !== 'Escape') return
      // com uma janela aberta por cima de outra, o Esc fecha só a de cima
      const all = document.querySelectorAll('.modal-backdrop')
      if (all.length && all[all.length - 1] !== ref.current) return
      onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div ref={ref} className="modal-backdrop" {...backdropClose(onClose)}>
      <div
        className={`card modal form-modal ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
