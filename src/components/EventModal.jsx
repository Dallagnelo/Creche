import EventForm from './EventForm'
import FormModal from './FormModal'

// Janela para criar um evento (abre por cima da página).
export default function EventModal({ presetDate, onCreated, onClose }) {
  return (
    <FormModal label="Novo evento" onClose={onClose}>
      <EventForm presetDate={presetDate} onCreated={onCreated} onCancel={onClose} />
    </FormModal>
  )
}
