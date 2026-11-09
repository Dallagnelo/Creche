// Fileira de filtros (só no celular): "Todos", "Não vistos"... Rola de lado quando não cabe tudo.
export default function FilterChips({ options, value, onChange, label }) {
  return (
    <div className="filter-chips" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className={`filter-chip ${option.id === value ? 'is-on' : ''}`}
          aria-pressed={option.id === value}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
