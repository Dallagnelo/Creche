import { useRef, useState } from 'react'

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
 * Estrelas de 0 a 5 (de meia em meia).
 *  - Sem `onChange`: só exibe (modo leitura); a média é arredondada para a meia estrela mais próxima.
 *  - Com `onChange`: clique ou segure e arraste sobre as estrelas. A metade esquerda de cada estrela dá
 *    meia nota (ex.: 3,5), a direita dá a nota inteira. Levar o ponteiro até a faixa à esquerda das estrelas (ou arrastar para fora) ou tocar de novo na primeira meia estrela dá nota zero (nenhuma estrela).
 *    `value` pode ser null (ainda sem nota). Pelo teclado: setas mudam de 0,5 em 0,5.
 */
export default function StarRating({ value = 0, onChange, size = 24 }) {
  const ref = useRef(null)
  const dragging = useRef(false)
  const [hover, setHover] = useState(null) // pré-visualização com o mouse, antes de clicar

  if (!onChange) {
    const shown = value ?? 0
    return (
      <span className="stars" role="img" aria-label={`Nota ${label(shown.toFixed(1))} de 5`}>
        {STARS.map((n) => (
          <Star key={n} fill={fillOf(n, shown)} size={size} />
        ))}
      </span>
    )
  }

  const current = value ?? 0
  const shown = hover ?? current

  // Converte a posição do ponteiro em nota (0 a 5, de 0,5 em 0,5).
  function valueAt(clientX) {
    const slots = ref.current.querySelectorAll('.star-slot')
    let result = 0
    slots.forEach((slot, index) => {
      const rect = slot.getBoundingClientRect()
      if (clientX >= rect.left) result = clientX - rect.left < rect.width / 2 ? index + 0.5 : index + 1
    })
    return Math.min(5, result)
  }

  function handleKeyDown(event) {
    const steps = { ArrowRight: 0.5, ArrowUp: 0.5, ArrowLeft: -0.5, ArrowDown: -0.5 }
    if (event.key in steps) {
      event.preventDefault()
      onChange(Math.min(5, Math.max(0, current + steps[event.key])))
    } else if (event.key === 'Home') {
      event.preventDefault()
      onChange(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      onChange(5)
    }
  }

  return (
    <div className="stars-row">
      <div
        ref={ref}
        className={`stars stars-drag${size >= 34 ? ' stars-lg' : ''}${hover != null ? ' is-hover' : ''}${shown === 0 ? ' is-zero' : ''}`}
        role="slider"
        tabIndex={0}
        aria-label="Sua nota"
        aria-valuemin={0}
        aria-valuemax={5}
        aria-valuenow={current}
        aria-valuetext={value == null ? 'sem nota' : `${label(current)} de 5`}
        onKeyDown={handleKeyDown}
        onPointerDown={(event) => {
          dragging.current = true
          event.currentTarget.setPointerCapture(event.pointerId)
          const picked = valueAt(event.clientX)
          // tocar de novo na primeira meia estrela tira ela: nota zero (nenhuma estrela)
          onChange(picked === 0.5 && current === 0.5 ? 0 : picked)
        }}
        onPointerMove={(event) => {
          if (dragging.current) onChange(valueAt(event.clientX))
          else if (event.pointerType === 'mouse') setHover(valueAt(event.clientX))
        }}
        onPointerLeave={() => setHover(null)}
        onPointerUp={() => {
          dragging.current = false
        }}
        onPointerCancel={() => {
          dragging.current = false
        }}
      >
        {STARS.map((n) => (
          <span key={n} className="star-slot">
            <Star fill={fillOf(n, shown)} size={size} />
          </span>
        ))}
      </div>
    </div>
  )
}
