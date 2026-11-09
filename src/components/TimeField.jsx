import { useEffect, useRef, useState } from 'react'

const pad = (text) => String(text).padStart(2, '0')

// Só números. Se o quadro já estava cheio e a pessoa digitou mais um, começa de novo com o dígito novo.
function newDigits(raw) {
  const digits = raw.replace(/\D/g, '')
  return digits.length > 2 ? digits.slice(-1) : digits
}

/** Junta hora e minutos no formato "HH:MM" (ou "" quando os dois estão vazios). */
function join(hour, minute) {
  if (!hour && !minute) return ''
  return `${pad(hour || '0')}:${pad(minute || '0')}`
}

/**
 * Campo de hora com dois quadros: um para a hora e outro para os minutos, digitando.
 * Ao completar a hora o cursor pula sozinho para os minutos.
 * value: "HH:MM" ou "" (sem hora).
 */
export default function TimeField({ value, onChange, ariaLabel = 'Hora' }) {
  const [hour, setHour] = useState(value ? value.split(':')[0] : '')
  const [minute, setMinute] = useState(value ? value.split(':')[1] : '')
  // Guarda sempre o valor mais novo: o evento de "sair do quadro" pode rodar antes da tela atualizar.
  const latest = useRef({ hour, minute })
  const hourRef = useRef(null)
  const minuteRef = useRef(null)

  // Se o valor vier de fora (ex.: abrir um evento para editar), atualiza os quadros.
  useEffect(() => {
    if (value !== join(hour, minute)) {
      const [h, m] = value ? value.split(':') : ['', '']
      latest.current = { hour: h, minute: m }
      setHour(h)
      setMinute(m)
    }
    // só reage ao valor de fora
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const emit = (nextHour, nextMinute) => {
    latest.current = { hour: nextHour, minute: nextMinute }
    setHour(nextHour)
    setMinute(nextMinute)
    onChange(join(nextHour, nextMinute))
  }

  function handleHour(event) {
    let digits = newDigits(event.target.value)
    // 3 a 9 sozinho só pode ser hora com zero na frente (ex.: 5 vira 05)
    if (digits.length === 1 && Number(digits) > 2) digits = `0${digits}`
    if (digits.length === 2 && Number(digits) > 23) digits = '23'
    emit(digits, minute)
    if (digits.length === 2) minuteRef.current?.focus()
  }

  function handleMinute(event) {
    let digits = newDigits(event.target.value)
    // 6 a 9 sozinho vira 06 a 09
    if (digits.length === 1 && Number(digits) > 5) digits = `0${digits}`
    if (digits.length === 2 && Number(digits) > 59) digits = '59'
    emit(hour, digits)
  }

  // Apagar com os minutos vazios volta para a hora.
  function handleMinuteKey(event) {
    if (event.key === 'Backspace' && !minute) hourRef.current?.focus()
  }

  // Ao sair de um quadro, completa com zero (ex.: "5" vira "05"). Usa o valor mais novo.
  const finishHour = () => {
    const { hour: h, minute: m } = latest.current
    if (h && h.length < 2) emit(pad(h), m)
  }
  const finishMinute = () => {
    const { hour: h, minute: m } = latest.current
    if (h || m) emit(pad(h || '0'), pad(m || '0'))
  }

  return (
    <div className="time-input" role="group" aria-label={ariaLabel}>
      <div className="time-row">
        <input
          ref={hourRef}
          className="time-box"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="HH"
          aria-label="Hora"
          value={hour}
          onChange={handleHour}
          onFocus={(event) => event.target.select()}
          onMouseUp={(event) => event.preventDefault()}
          onBlur={finishHour}
        />
        <span className="time-colon" aria-hidden="true">
          :
        </span>
        <input
          ref={minuteRef}
          className="time-box"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="MM"
          aria-label="Minutos"
          value={minute}
          onChange={handleMinute}
          onKeyDown={handleMinuteKey}
          onFocus={(event) => event.target.select()}
          onMouseUp={(event) => event.preventDefault()}
          onBlur={finishMinute}
        />
      </div>
      <button
        type="button"
        className="btn btn-ghost time-clear"
        disabled={!hour && !minute}
        onClick={() => {
          emit('', '')
          hourRef.current?.focus()
        }}
      >
        Sem hora
      </button>
    </div>
  )
}
