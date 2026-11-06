import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { todayISO } from '../lib/format'
import { EVENT_CATEGORIES } from '../lib/events'
import { createEvent } from '../services/events'
import { ErrorBox } from './Feedback'

export default function EventForm({ onCreated }) {
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('filme')
  const [date, setDate] = useState(todayISO())
  const [time, setTime] = useState('')
  const [place, setPlace] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await createEvent({ title, category, date, time, place, notes, userId: user.id })
      setTitle('')
      setTime('')
      setPlace('')
      setNotes('')
      onCreated()
    } catch (err) {
      setError(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="card form panel" onSubmit={handleSubmit}>
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
        <label className="field">
          <span>Dia</span>
          <input type="date" required value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
        <label className="field">
          <span>Hora (opcional)</span>
          <input type="time" value={time} onChange={(event) => setTime(event.target.value)} />
        </label>
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

      <button type="submit" className="btn btn-primary" disabled={!title.trim() || !date || saving}>
        {saving ? 'Salvando...' : 'Criar evento'}
      </button>
    </form>
  )
}
