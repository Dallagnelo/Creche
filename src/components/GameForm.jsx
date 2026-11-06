import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { DEFAULT_CROP } from '../lib/imageCrop'
import { createGame } from '../services/games'
import { ErrorBox } from './Feedback'
import Icon from './Icon'
import ImageCropper from './ImageCropper'

export default function GameForm({ onCreated, onCancel }) {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [platform, setPlatform] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState(null)
  const [crop, setCrop] = useState(DEFAULT_CROP)
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

  function handleChoose(event) {
    setFile(event.target.files?.[0] ?? null)
    setCrop(DEFAULT_CROP) // capa nova começa com o maior quadrado possível
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await createGame({ name, platform, notes, file, coverCrop: crop, userId: user.id })
      setName('')
      setPlatform('')
      setNotes('')
      setFile(null)
      setCrop(DEFAULT_CROP)
      if (fileInputRef.current) fileInputRef.current.value = ''
      onCreated()
    } catch (err) {
      setError(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className={onCancel ? 'form' : 'card form panel'} onSubmit={handleSubmit}>
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
        {preview ? (
          <>
            <ImageCropper src={preview} value={crop} onChange={setCrop} />
            <label className="btn btn-ghost adjuster-change">
              Trocar imagem
              <input
                ref={fileInputRef}
                className="sr-only"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                aria-label="Trocar capa do jogo"
                onChange={handleChoose}
              />
            </label>
          </>
        ) : (
          // O <label> vira o botão: clicar nele abre a escolha de arquivo (o input fica escondido).
          <label className="cover-picker" title="Escolher capa">
            <input
              ref={fileInputRef}
              className="sr-only"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              aria-label="Escolher capa do jogo"
              onChange={handleChoose}
            />
            <Icon name="photos" />
          </label>
        )}
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

      {onCancel ? (
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancelar
          </button>
          <span className="spacer" />
          <button type="submit" className="btn btn-primary" disabled={!name.trim() || saving}>
            {saving ? 'Salvando...' : 'Adicionar jogo'}
          </button>
        </div>
      ) : (
        <button type="submit" className="btn btn-primary" disabled={!name.trim() || saving}>
          {saving ? 'Salvando...' : 'Adicionar jogo'}
        </button>
      )}
    </form>
  )
}
