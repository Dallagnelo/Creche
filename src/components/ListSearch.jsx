import { useId } from 'react'
import Icon from './Icon'

/** Barra de pesquisa para filtrar uma lista que já está na tela (sem ir ao servidor). */
export default function ListSearch({ value, onChange, placeholder, label }) {
  const id = useId()
  return (
    <div className="list-search" role="search">
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <span className="list-search-icon" aria-hidden="true">
        <Icon name="search" />
      </span>
      <input
        id={id}
        type="search"
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && value) {
            event.stopPropagation()
            onChange('')
          }
        }}
      />
      {value && (
        <button type="button" className="list-search-clear" aria-label="Limpar pesquisa" onClick={() => onChange('')}>
          <Icon name="close" />
        </button>
      )}
    </div>
  )
}
