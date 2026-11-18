import { useCallback, useEffect, useState } from 'react'
import { ErrorBox, Spinner } from '../components/Feedback'
import PokeDetail from '../components/pokemon/PokeDetail'
import Pokedex from '../components/pokemon/Pokedex'
import PokeRanking from '../components/pokemon/PokeRanking'
import WhoIsThat from '../components/pokemon/WhoIsThat'
import { useAuth } from '../contexts/AuthContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { KEYS } from '../lib/dataCache'
import { listProfiles } from '../services/profiles'
import { listPokemon } from '../services/pokeapi'
import { POKE_HINT, pokeCaught, pokeRanking } from '../services/pokemon'
import '../styles/pokemon.css'

const TABS = [
  { id: 'dex', label: 'Pokédex da turma' },
  { id: 'quiz', label: 'Quem é esse Pokémon?' },
  { id: 'rank', label: 'Ranking' },
]

/** Pokémon: Pokédex da turma, minijogo "Quem é esse Pokémon?" e ranking. Dados da PokéAPI. */
export default function PokemonPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState(() => {
    try {
      return sessionStorage.getItem('pokemon-tab') ?? 'dex'
    } catch {
      return 'dex'
    }
  })
  const [list, setList] = useState(null)
  const [listError, setListError] = useState(null)
  const [caught, setCaught] = useState(undefined) // undefined = carregando, null = sem migração
  const [ranking, setRanking] = useState(undefined)
  const [open, setOpen] = useState(null)
  const { data: people } = useAsyncData(listProfiles, KEYS.profiles)

  const loadList = useCallback(() => {
    setListError(null)
    listPokemon().then(setList).catch(setListError)
  }, [])
  const loadTurma = useCallback(() => {
    pokeCaught().then(setCaught).catch(() => setCaught(null))
    pokeRanking().then(setRanking).catch(() => setRanking(null))
  }, [])
  useEffect(() => {
    loadList()
    loadTurma()
  }, [loadList, loadTurma])
  useEffect(() => {
    try {
      sessionStorage.setItem('pokemon-tab', tab)
    } catch {
      // sem armazenamento
    }
    if (tab === 'rank') pokeRanking().then(setRanking).catch(() => {})
  }, [tab])

  const missingDb = caught === null || ranking === null

  return (
    <section className="stack">
      <div className="page-head">
        <div>
          <h1>Pokémon</h1>
          <p className="muted" style={{ margin: 0 }}>Acerte no “Quem é esse Pokémon?” para pegar e complete a Pokédex com a turma.</p>
        </div>
      </div>

      <div className="pk-seg" role="group" aria-label="Seções">
        {TABS.map((t) => (
          <button key={t.id} type="button" className={`pk-seg-item ${tab === t.id ? 'is-on' : ''}`} aria-pressed={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {missingDb && <p className="card muted">{POKE_HINT} Enquanto isso, a Pokédex funciona, mas ninguém pega Pokémon nem entra no ranking.</p>}
      {listError && <ErrorBox error={listError} onRetry={loadList} />}
      {!list && !listError && <Spinner label="Ligando a Pokédex..." />}

      {list && tab === 'dex' && <Pokedex list={list} caught={caught ?? null} people={people ?? []} onOpen={setOpen} />}
      {list && tab === 'quiz' && <WhoIsThat list={list} caught={caught ?? null} userId={user?.id} onCaught={loadTurma} />}
      {tab === 'rank' && (ranking === undefined ? <Spinner /> : <PokeRanking rows={ranking} userId={user?.id} total={list?.length ?? 1025} />)}

      {open && (
        <PokeDetail id={open.id} name={open.name} caughtBy={caught?.get(open.id) ?? []} people={people ?? []} onClose={() => setOpen(null)} />
      )}
      <p className="muted" style={{ fontSize: '0.8rem' }}>
        Dados e imagens: <a href="https://pokeapi.co" target="_blank" rel="noopener noreferrer">PokéAPI</a>. Pokémon e nomes são marcas da Nintendo, Game Freak e The Pokémon Company; este é um projeto de fãs, sem fins lucrativos.
      </p>
    </section>
  )
}
