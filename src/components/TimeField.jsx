import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'
import Popover from './Popover'

const HOURS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'))
const MINUTES = Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, '0'))

/**
 * Campo de hora com seletor próprio: escolha a hora e depois os minutos (de 5 em 5).
 * value: "HH:MM" ou "" (sem hora).
 */
export default function TimeField({ value, onChange, placeholder = 'Sem hora', ariaLabel }) {
  const [open, setOpen] = useState(false)
  const anchorRef = useRef(null)
  const [hour, minute] = value ? value.split(':') : ['', '']

  // Ao abrir, leva o foco para a hora escolhida (ou a primeira), para dar para usar só o teclado.
  useEffect(() => {
    if (!open) return
    const target = document.querySelector('.time-cell.is-selected') ?? document.querySelector('.time-cell')
    target?.focus()
  }, [open])

  const pick = (next, close) => {
    onChange(next)
    if (close) {
      setOpen(false)
      anchorRef.current?.focus()
    }
  }

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        className={`picker-trigger ${value ? '' : 'is-empty'}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{value || placeholder}</span>
        <Icon name="clock" />
      </button>

      {open && (
        <Popover anchorRef={anchorRef} onClose={() => setOpen(false)} label="Escolher hora" width={300}>
          <div className="time">
            <p className="time-title time-title-first">Hora</p>
            <div className="time-grid">
              {HOURS.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`time-cell ${item === hour ? 'is-selected' : ''}`}
                  aria-pressed={item === hour}
                  onClick={() => pick(`${item}:${minute || '00'}`, false)}
                >
                  {item}
                </button>
              ))}
            </div>

            <p className="time-title">Minutos</p>
            <div className="time-grid">
              {MINUTES.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`time-cell ${item === minute ? 'is-selected' : ''}`}
                  aria-pressed={item === minute}
                  disabled={!hour}
                  onClick={() => pick(`${hour}:${item}`, true)}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="pop-foot">
              <button type="button" className="btn btn-ghost" disabled={!value} onClick={() => pick('', true)}>
                Sem hora
              </button>
              <button type="button" className="btn btn-primary" disabled={!value} onClick={() => pick(value, true)}>
                Pronto
              </button>
            </div>
          </div>
        </Popover>
      )}
    </>
  )
}
