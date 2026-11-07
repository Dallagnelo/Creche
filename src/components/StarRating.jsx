const STARS = [1, 2, 3, 4, 5]

/** Quanto da estrela n está preenchido: 0, 0.5 ou 1 (valores quebrados, como a média 3.7, vão para a meia estrela mais próxima). */
function fillOf(n, value) {
  const rounded = Math.round(value * 2) / 2
  if (rounded >= n) return 1
  if (rounded >= n - 0.5) return 0.5
  return 0
}

function Star({ fill, size }) {
  return (
    <span className="star-half" style={{ fontSize: size }} aria-hidden="true">
      <span className="star">★</span>
      {fill > 0 && (
        <span className="star star-on star-fill" style={{ width: `${fill * 100}%` }}>
          ★
        </span>
      )}
    </span>
  )
}

const label = (value) => String(value).replace('.', ',')

/**
 * Estrelas de 0,5 a 5 (de meia em meia).
 *  - Sem `onChange`: só exibe (modo leitura); a média é arredondada para a meia estrela mais próxima.
 *  - Com `onChange`: a metade esquerda da estrela dá meia nota (ex.: 3,5), a direita dá a nota inteira.
 *    Clicar na nota já escolhida limpa a nota.
 */
export default function StarRating({ value = 0, onChange, size = 24 }) {
  if (!onChange) {
    return (
      <span className="stars" role="img" aria-label={`Nota ${label(value.toFixed(1))} de 5`}>
        {STARS.map((n) => (
          <Star key={n} fill={fillOf(n, value)} size={size} />
        ))}
      </span>
    )
  }

  return (
    <div className="stars" role="radiogroup" aria-label="Sua nota">
      {STARS.map((n) => (
        <span key={n} className="star-slot">
          <Star fill={fillOf(n, value)} size={size} />
          {[n - 0.5, n].map((score, index) => (
            <button
              key={score}
              type="button"
              role="radio"
              aria-checked={score === value}
              aria-label={`${label(score)} ${score === 1 ? 'estrela' : 'estrelas'}`}
              className={`star-hit ${index === 0 ? 'star-hit-left' : 'star-hit-right'}`}
              onClick={() => onChange(score === value ? 0 : score)}
            />
          ))}
        </span>
      ))}
    </div>
  )
}
