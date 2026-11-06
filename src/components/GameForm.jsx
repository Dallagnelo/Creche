import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { createGame } from '../services/games'
import { ErrorBox } from './Feedback'
import Icon from './Icon'

export default function GameForm({ onCreated }) {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [platform, setPlatform] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [preview, setPreview] = useState(null)
  const fileInputRef = useRef(null)

  // Miniatura da capa escolhida (e libera a memória quando ela muda).
  useEffect(() => {
    if (!file) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await createGame({ name, platform, notes, file, userId: user.id })
      setName('')
      setPlatform('')
      setNotes('')
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      onCreated()
    } catch (err) {
      setError(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="card form panel" onSubmit={handleSubmit}>
      <h2>Novo jogo</h2>

      <div className="form-row">
        <label className="field">
          <span>Nome do jogo</span>
          <input
            type="text"
            required
            maxLength={100}
            placeholder="Ex.: Minecraft"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <label className="field">
          <span>Plataforma (opcional)</span>
          <input
            type="text"
            maxLength={50}
            placeholder="Ex.: PC, PS5, Switch"
            value={platform}
            onChange={(event) => setPlatform(event.target.value)}
          />
        </label>
      </div>

      <div className="field">
        <span>Capa (opcional)</span>
        {/* O <label> vira o botão: clicar nele abre a escolha de arquivo (o input fica escondido). */}
        <label
          className={`cover-picker ${preview ? 'has-preview' : ''}`}
          title={file ? file.name : 'Escolher capa'}
        >
          <input
            ref={fileInputRef}
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            aria-label="Escolher capa do jogo"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          {preview ? <img src={preview} alt="Pré-visualização da capa" /> : <Icon name="photos" />}
        </label>
      </div>

      <label className="field">
        <span>Anotações (opcional)</span>
        <textarea
          rows={2}
          maxLength={500}
          placeholder="Memórias, partidas épicas, quem era o pior jogador..."
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </label>

      {error && <ErrorBox error={error} />}

      <button type="submit" className="btn btn-primary" disabled={!name.trim() || saving}>
        {saving ? 'Salvando...' : 'Adicionar jogo'}
      </button>
    </form>
  )
}
