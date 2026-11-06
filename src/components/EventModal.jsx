import { useEffect } from 'react'
import EventForm from './EventForm'

// Janela para criar um evento (abre por cima da página, como os outros modais).
export default function EventModal({ presetDate, onCreated, onClose }) {
  // Fecha com a tecla Esc (os seletores de data/hora tratam o Esc antes, então não fecham a janela por engano).
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
        className="card modal event-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Novo evento"
        onClick={(event) => event.stopPropagation()}
      >
        <EventForm presetDate={presetDate} onCreated={onCreated} onCancel={onClose} />
      </div>
    </div>
  )
}
