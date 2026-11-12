import { PLATFORMS } from '../lib/platforms'
import { useState } from 'react'
import { usePickedGame } from '../hooks/usePickedGame'
import { ErrorBox } from './Feedback'
import GamePick from './GamePick'
import GameSearch from './GameSearch'

/**
 * Edição de um jogo (só o dono vê): nome, plataforma e anotações.
 * Também dá para "atualizar pelo IGDB": busca o jogo e a capa e os dados passam a vir de lá
 * (útil para jogos antigos, cadastrados sem capa ou com foto enviada na mão).
 *  - onSave({ name, platform, notes, igdb }) devolve uma Promise; erros aparecem aqui.
 */
export default function GameEditForm({ game, onSave, onCancel }) {
  const [name, setName] = useState(game.name)
  const [platform, setPlatform] = useState(game.platform ?? '')
  const [notes, setNotes] = useState(game.notes ?? '')
  const { picked: igdb, translating, pick, clear } = usePickedGame()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function handlePick(found) {
    pick(found)
    setName(found.name)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await onSave({ name, platform, notes, igdb })
    } catch (err) {
      setError(err)
      setSaving(false)
    }
  }

  return (
    <form className="form game-edit" onSubmit={handleSubmit}>
      <h3>Editar jogo</h3>

      <div className="form-row">
        <label className="field">
          <span>Nome do jogo</span>
          <input type="text" required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="field">
          <span>Plataforma (opcional)</span>
          <select value={platform} onChange={(event) => setPlatform(event.target.value)}>
            <option value="">Sem plataforma</option>
            {PLATFORMS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
            {/* jogo antigo com uma plataforma que não está na lista: mantém o valor até a pessoa trocar */}
            {platform && !PLATFORMS.includes(platform) && <option value={platform}>{platform}</option>}
          </select>
        </label>
      </div>

      <label className="field">
        <span>Anotações (opcional)</span>
        <textarea rows={3} maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} />
      </label>

      {igdb ? (
        <div className="stack">
          <span className="field-label">Capa e informações vão vir deste jogo do IGDB:</span>
          <GamePick game={igdb} translating={translating} onChange={clear} changeLabel="Escolher outro" />
        </div>
      ) : (
        <GameSearch
          onSelect={handlePick}
          disabled={saving}
          label={game.igdb_id || game.cover_url ? 'Trocar o jogo do IGDB (capa e informações)' : 'Buscar no IGDB (capa e informações)'}
        />
      )}

      {error && <ErrorBox error={error} />}

      <div className="modal-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>
          Cancelar
        </button>
        <span className="spacer" />
        <button type="submit" className="btn btn-primary" disabled={!name.trim() || saving || translating}>
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </div>
    </form>
  )
}
