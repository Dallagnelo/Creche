const STARS = [1, 2, 3, 4, 5]

/**
 * Estrelas de 1 a 5.
 *  - Sem `onChange`: só exibe (modo leitura), aceita valores quebrados como a média 3.7.
 *  - Com `onChange`: o usuário clica para escolher. Clicar na estrela já marcada limpa a nota.
 */
export default function StarRating({ value = 0, onChange, size = 24 }) {
  if (!onChange) {
    return (
      <span className="stars" role="img" aria-label={`Nota ${value.toFixed(1)} de 5`}>
        {STARS.map((n) => (
          <span key={n} className={n <= Math.round(value) ? 'star star-on' : 'star'} style={{ fontSize: size }}>
            ★
          </span>
        ))}
      </span>
    )
  }

  return (
    <div className="stars" role="radiogroup" aria-label="Sua nota">
      {STARS.map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={n === value}
          aria-label={`${n} ${n === 1 ? 'estrela' : 'estrelas'}`}
          className={n <= value ? 'star star-btn star-on' : 'star star-btn'}
          style={{ fontSize: size }}
          onClick={() => onChange(n === value ? 0 : n)}
        >
          ★
        </button>
      ))}
    </div>
  )
}
