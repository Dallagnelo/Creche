import { useEffect, useRef, useState } from 'react'
import { addDays, addMonths, clampISO, formatPickerDate, MONTH_NAMES, monthGrid, parseISO, toISO, WEEKDAY_LETTERS } from '../lib/dates'
import { todayISO } from '../lib/format'
import Icon from './Icon'
import Popover from './Popover'

/**
 * Campo de data com calendário próprio (no lugar do seletor do navegador).
 *  - value: "AAAA-MM-DD" ou "" · min / max: limites no mesmo formato
 *  - onChange: recebe { target: { name, value } } (igual a um <input>, para encaixar nos formulários)
 */
export default function DateField({ value, onChange, name, min, max, clearable = false, placeholder = 'Escolher data', ariaLabel }) {
  const [open, setOpen] = useState(false)
  const anchorRef = useRef(null)

  const emit = (next) => onChange({ target: { name, value: next } })

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
        <span>{value ? formatPickerDate(value) : placeholder}</span>
        <Icon name="calendar" />
      </button>

      {open && (
        <Popover anchorRef={anchorRef} onClose={() => setOpen(false)} label="Escolher data">
          <Calendar
            value={value}
            min={min}
            max={max}
            clearable={clearable}
            onPick={(iso) => {
              emit(iso)
              setOpen(false)
              anchorRef.current?.focus()
            }}
            onClear={() => {
              emit('')
              setOpen(false)
              anchorRef.current?.focus()
            }}
          />
        </Popover>
      )}
    </>
  )
}

function Calendar({ value, min, max, clearable, onPick, onClear }) {
  const today = todayISO()
  const [focus, setFocus] = useState(clampISO(value || today, min, max)) // dia "em foco" (define o mês mostrado)
  const [steal, setSteal] = useState(true) // só puxa o foco para o dia quando a pessoa usa o teclado
  const gridRef = useRef(null)

  const { year, month0 } = parseISO(focus)
  const cells = monthGrid(year, month0)
  const minYear = min ? parseISO(min).year : parseISO(today).year - 100
  const maxYear = max ? parseISO(max).year : parseISO(today).year + 5
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, index) => minYear + index)

  useEffect(() => {
    if (steal) gridRef.current?.querySelector(`[data-date="${focus}"]`)?.focus()
  }, [focus, steal])

  const go = (next, keyboard) => {
    setSteal(keyboard)
    setFocus(clampISO(next, min, max))
  }
  const disabled = (iso) => (min && iso < min) || (max && iso > max)

  function handleKeyDown(event) {
    const moves = {
      ArrowLeft: () => addDays(focus, -1),
      ArrowRight: () => addDays(focus, 1),
      ArrowUp: () => addDays(focus, -7),
      ArrowDown: () => addDays(focus, 7),
      PageUp: () => addMonths(focus, event.shiftKey ? -12 : -1),
      PageDown: () => addMonths(focus, event.shiftKey ? 12 : 1),
      Home: () => addDays(focus, -new Date(year, month0, parseISO(focus).day).getDay()),
      End: () => addDays(focus, 6 - new Date(year, month0, parseISO(focus).day).getDay()),
    }
    if (!moves[event.key]) return
    event.preventDefault()
    go(moves[event.key](), true)
  }

  const prevDisabled = min && addMonths(toISO(year, month0, 1), -1) < min.slice(0, 8) + '01'
  const nextDisabled = max && addMonths(toISO(year, month0, 1), 1) > max

  return (
    <div className="cal">
      <div className="cal-head">
        <button type="button" className="cal-nav" aria-label="Mês anterior" disabled={prevDisabled} onClick={() => go(addMonths(focus, -1), false)}>
          <Icon name="chevron-left" />
        </button>
        <select aria-label="Mês" value={month0} onChange={(event) => go(toISO(year, Number(event.target.value), Math.min(parseISO(focus).day, 28)), false)}>
          {MONTH_NAMES.map((month, index) => (
            <option key={month} value={index}>
              {month}
            </option>
          ))}
        </select>
        <select aria-label="Ano" value={year} onChange={(event) => go(toISO(Number(event.target.value), month0, Math.min(parseISO(focus).day, 28)), false)}>
          {years.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <button type="button" className="cal-nav" aria-label="Próximo mês" disabled={nextDisabled} onClick={() => go(addMonths(focus, 1), false)}>
          <Icon name="chevron-right" />
        </button>
      </div>

      <div className="cal-weekdays" aria-hidden="true">
        {WEEKDAY_LETTERS.map((letter, index) => (
          <span key={index}>{letter}</span>
        ))}
      </div>

      <div ref={gridRef} className="cal-grid" role="grid" onKeyDown={handleKeyDown}>
        {cells.map((iso) => {
          const { month0: cellMonth, day } = parseISO(iso)
          return (
            <button
              key={iso}
              type="button"
              data-date={iso}
              tabIndex={iso === focus ? 0 : -1}
              disabled={disabled(iso)}
              aria-label={formatPickerDate(iso)}
              aria-pressed={iso === value}
              className={[
                'cal-day',
                cellMonth !== month0 && 'is-outside',
                iso === today && 'is-today',
                iso === value && 'is-selected',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onPick(iso)}
            >
              {day}
            </button>
          )
        })}
      </div>

      <div className="pop-foot">
        <button type="button" className="btn btn-ghost" disabled={disabled(today)} onClick={() => onPick(today)}>
          Hoje
        </button>
        {clearable && value && (
          <button type="button" className="btn btn-ghost" onClick={onClear}>
            Limpar
          </button>
        )}
      </div>
    </div>
  )
}
