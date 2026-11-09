import Icon from './Icon'

// Barra de cima das janelas em tela cheia (só no celular): ✕ à esquerda e o título.
export default function SheetTop({ title, onClose }) {
  return (
    <header className="sheet-top">
      <button type="button" className="sheet-close" onClick={onClose} aria-label="Fechar">
        <Icon name="close" />
      </button>
      <span className="sheet-title">{title}</span>
    </header>
  )
}
