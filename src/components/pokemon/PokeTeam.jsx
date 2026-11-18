import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { listPokemon } from '../../services/pokeapi'
import { savePet, saveTeam, TEAM_MAX } from '../../services/pokemon'
import { PokeSprite } from './PokeBits'

/** Nomes dos Pokémon (a lista vem do cache da PokéAPI). */
function useNames() {
  const [names, setNames] = useState(null)
  useEffect(() => {
    let alive = true
    listPokemon()
      .then((list) => alive && setNames(new Map(list.map((p) => [p.id, p.name]))))
      .catch(() => alive && setNames(new Map()))
    return () => {
      alive = false
    }
  }, [])
  return names
}

/**
 * Time Pokémon de uma pessoa (até 6, o primeiro é o favorito) e o bichinho que segue o boneco na Turma.
 * Com `editable`, mostra os botões para tirar e o atalho para a Pokédex.
 */
export default function PokeTeam({ team = [], pet = null, editable = false }) {
  const { user, refreshProfile } = useAuth()
  const names = useNames()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const nameOf = (id) => names?.get(id) ?? `#${id}`

  async function run(fn) {
    setBusy(true)
    setError(null)
    try {
      await fn()
      await refreshProfile?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (!editable && team.length === 0 && !pet) return null
  const slots = Array.from({ length: TEAM_MAX }, (_, i) => team[i] ?? null)

  return (
    <div className="stack" style={{ gap: '0.7rem' }}>
      <div className="pk-team">
        {slots.map((id, i) =>
          id ? (
            <div key={`${id}-${i}`} className={`pk-slot is-filled ${i === 0 ? 'is-fav' : ''}`} title={i === 0 ? `${nameOf(id)} (favorito)` : nameOf(id)}>
              <PokeSprite id={id} alt={nameOf(id)} size={96} />
              {editable && (
                <button type="button" className="pk-slot-x" disabled={busy} aria-label={`Tirar ${nameOf(id)} do time`} onClick={() => run(() => saveTeam(user.id, team.filter((x) => x !== id)))}>
                  ×
                </button>
              )}
            </div>
          ) : (
            <div key={`vazio-${i}`} className="pk-slot" aria-hidden={!editable}>
              {editable ? '+' : ''}
            </div>
          ),
        )}
      </div>
      {(pet || editable) && (
        <div className="pk-pet-row">
          {pet ? (
            <>
              <PokeSprite id={pet} alt={nameOf(pet)} size={48} />
              <span>
                <b>{nameOf(pet)}</b> {editable ? 'te segue' : 'segue'} na Turma
              </span>
              {editable && (
                <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => run(() => savePet(user.id, null))}>
                  Parar
                </button>
              )}
            </>
          ) : (
            <span className="muted">Nenhum Pokémon te segue na Turma ainda.</span>
          )}
        </div>
      )}
      {editable && (
        <Link to="/pokemon" className="btn" style={{ alignSelf: 'flex-start' }}>
          {team.length ? 'Trocar na Pokédex' : 'Montar meu time na Pokédex'}
        </Link>
      )}
      {error && <p role="alert" style={{ color: 'var(--danger)', fontWeight: 700 }}>{error}</p>}
    </div>
  )
}
