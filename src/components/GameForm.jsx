import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { usePickedGame } from '../hooks/usePickedGame'
import { createGame } from '../services/games'
import { ErrorBox } from './Feedback'
import GameSearch from './GameSearch'
import GamePick from './GamePick'

/**
 * Novo jogo, igual ao fluxo dos filmes: busca no IGDB, escolhe um resultado e pronto.
 * Capa, ano, gêneros, plataformas, distribuidora e sinopse vêm da própria API, sem mais nada para preencher.
 */
export default function GameForm({ onCreated, onCancel }) {
  const { user } = useAuth()
  const { picked, translating, pick, clear } = usePickedGame() // jogo escolhido na busca (dados do IGDB)
  const [manual, setManual] = useState(false) // "não achei": cadastra só com o nome
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const ready = Boolean(picked) || manual

  function handlePick(game) {
    pick(game)
    setName(game.name)
    setManual(false)
  }

  function handleReset() {
    clear()
    setManual(false)
    setName('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await createGame({ name, igdb: picked, userId: user.id })
      handleReset()
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

      {!ready && (
        <>
          <GameSearch onSelect={handlePick} disabled={saving} autoFocus={Boolean(onCancel)} />
          <button type="button" className="btn btn-ghost game-manual-btn" onClick={() => setManual(true)}>
            Não achei meu jogo
          </button>
        </>
      )}

      {picked && <GamePick game={picked} translating={translating} onChange={handleReset} />}

      {manual && (
        <>
          <label className="field">
            <span>Nome do jogo</span>
            <input
              type="text"
              required
              autoFocus
              maxLength={100}
              placeholder="Ex.: Minecraft"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <p className="muted hint">Sem a busca, o jogo fica sem capa e sem as informações do IGDB.</p>
          <button type="button" className="btn btn-ghost game-manual-btn" onClick={handleReset}>
            Voltar para a busca
          </button>
        </>
      )}

      {error && <ErrorBox error={error} />}

      {onCancel ? (
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancelar
          </button>
          <span className="spacer" />
          <button type="submit" className="btn btn-primary" disabled={!ready || !name.trim() || saving || translating}>
            {saving ? 'Salvando...' : 'Adicionar jogo'}
          </button>
        </div>
      ) : (
        <button type="submit" className="btn btn-primary" disabled={!ready || !name.trim() || saving || translating}>
          {saving ? 'Salvando...' : 'Adicionar jogo'}
        </button>
      )}
    </form>
  )
}
