import { useEffect } from 'react'
import { useBackClose } from '../lib/backClose'

// Janela genérica para formulários de "adicionar" (evento, filme, jogo). Fecha com Esc ou clicando fora.
export default function FormModal({ label, onClose, className = '', children }) {
  useBackClose(onClose)

  useEffect(() => {
    function handleKey(event) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div className="modal-backdrop" onClick={onClose}>
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
