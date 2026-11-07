import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { todayISO } from '../lib/format'
import { EVENT_CATEGORIES } from '../lib/events'
import { createEvent } from '../services/events'
import DateField from './DateField'
import { ErrorBox } from './Feedback'
import TimeField from './TimeField'

export default function EventForm({ onCreated, onCancel, presetDate }) {
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('filme')
  const [date, setDate] = useState(todayISO())
  const [time, setTime] = useState('')
  const [place, setPlace] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  // Quando se clica em "marcar neste dia" no calendário, a data do formulário acompanha.
  useEffect(() => {
    if (presetDate) setDate(presetDate)
  }, [presetDate])

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await createEvent({ title, category, date, time, place, address, notes, userId: user.id })
      setTitle('')
      setTime('')
      setPlace('')
      setAddress('')
      setNotes('')
      onCreated()
    } catch (err) {
      setError(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className={onCancel ? 'form' : 'card form panel'} onSubmit={handleSubmit}>
      <h2>Novo evento</h2>

      <label className="field">
        <span>O que vai rolar?</span>
        <input
          type="text"
          required
          maxLength={100}
          placeholder="Ex.: Ver Interestelar"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>

      <label className="field">
        <span>Tipo</span>
        <select value={category} onChange={(event) => setCategory(event.target.value)}>
          {EVENT_CATEGORIES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.emoji} {item.label}
            </option>
          ))}
        </select>
      </label>

      <div className="form-row">
        <div className="field">
          <span>Dia</span>
          <DateField value={date} ariaLabel="Dia do evento" onChange={(event) => setDate(event.target.value || todayISO())} />
        </div>
        <div className="field">
          <span>Hora (opcional)</span>
          <TimeField value={time} ariaLabel="Hora do evento" onChange={setTime} />
        </div>
      </div>

      <label className="field">
        <span>Local (opcional)</span>
        <input
          type="text"
          maxLength={100}
          placeholder="Ex.: Casa do João"
          value={place}
          onChange={(event) => setPlace(event.target.value)}
        />
      </label>

      <label className="field">
        <span>Endereço com mapa (opcional)</span>
        <input
          type="text"
          maxLength={200}
          placeholder="Rua, número, cidade. Preencha para mostrar o mapa"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
        />
      </label>

      <label className="field">
        <span>Detalhes (opcional)</span>
        <textarea
          rows={2}
          maxLength={500}
          placeholder="Quem leva a pipoca, horário de chegada..."
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </label>

      {error && <ErrorBox error={error} />}

      <div className="modal-actions">
        {onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancelar
          </button>
        )}
        <span className="spacer" />
        <button type="submit" className="btn btn-primary" disabled={!title.trim() || !date || saving}>
          {saving ? 'Salvando...' : 'Criar evento'}
        </button>
      </div>
    </form>
  )
}
