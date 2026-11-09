import { categoryColor, categoryOf } from '../lib/events'
import Avatar from './Avatar'
import Icon from './Icon'

const MAX_FACES = 4

// Peças pequenas usadas pelos dois visuais da página de Eventos.

/** Quadradinho colorido + nome do tipo. */
export function TypeTag({ category }) {
  return (
    <span className="evt-tag">
      <i style={{ background: categoryColor(category) }} aria-hidden="true" />
      {categoryOf(category).label}
    </span>
  )
}

/** Rostinhos de quem vai (+N quando passa de 4). */
export function People({ event }) {
  const faces = event.attendees.slice(0, MAX_FACES)
  const extra = event.attendees.length - faces.length
  if (faces.length === 0) return <span className="muted">Ninguém confirmou ainda</span>
  return (
    <div className="event-people">
      <ul className="event-faces" aria-label={`Quem vai: ${event.attendees.length}`}>
        {faces.map((item) => (
          <li key={item.user_id} title={item.person?.display_name}>
            <Avatar name={item.person?.display_name} src={item.person?.avatar_url} size={28} />
          </li>
        ))}
      </ul>
      {extra > 0 && <span className="evt-extra">+{extra}</span>}
    </div>
  )
}

export function GoingButton({ event, going, onToggle }) {
  return (
    <button
      type="button"
      className={`btn ${going ? 'btn-ghost evt-going' : 'btn-primary'}`}
      aria-pressed={going}
      title={going ? 'Clique para sair' : undefined}
      onClick={() => onToggle(event, !going)}
    >
      {going ? '✓ Você vai' : 'Eu vou!'}
    </button>
  )
}

export function TrashButton({ event, onDelete }) {
  return (
    <button type="button" className="btn-trash" aria-label={`Apagar evento ${event.title}`} title="Apagar evento" onClick={() => onDelete(event)}>
      <Icon name="trash" />
    </button>
  )
}

export function EditButton({ event, onEdit }) {
  return (
    <button type="button" className="btn-trash btn-edit" aria-label={`Editar evento ${event.title}`} title="Editar evento" onClick={() => onEdit(event)}>
      <Icon name="edit" />
    </button>
  )
}

/** Deixa o card inteiro clicável (menos os botões e links de dentro) e o título acessível pelo teclado. */
export function openOnClick(onOpen, event) {
  return {
    onClick: (e) => {
      if (onOpen && !e.target.closest('button, a')) onOpen(event)
    },
  }
}

export function OpenTitle({ event, onOpen }) {
  if (!onOpen) return event.title
  return (
    <button type="button" className="evt-title-btn" onClick={() => onOpen(event)}>
      {event.title}
    </button>
  )
}
