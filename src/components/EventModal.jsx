import EventForm from './EventForm'
import FormModal from './FormModal'

// Janela para criar (ou editar, com `event`) um evento (abre por cima da página).
export default function EventModal({ event, presetDate, onCreated, onClose }) {
  return (
    <FormModal label={event ? 'Editar evento' : 'Novo evento'} onClose={onClose}>
      <EventForm event={event} presetDate={presetDate} onCreated={onCreated} onCancel={onClose} />
    </FormModal>
  )
}
