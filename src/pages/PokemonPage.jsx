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
import { DAILY_TRIES, POKE_HINT, pokeCaught, pokeRanking, pokeStatus, startQuiz } from '../services/pokemon'
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
  // partida do "Quem é esse Pokémon?": enquanto estiver no meio dela, a Pokédex fica bloqueada
  const [quiz, setQuiz] = useState(undefined) // undefined = carregando; null = banco sem limite/partida
  const locked = !!quiz && !quiz.legacy && quiz.started && quiz.used < DAILY_TRIES
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
    pokeStatus().then(setQuiz).catch(() => setQuiz(null))
  }, [loadList, loadTurma])
  // no meio da partida: sai da Pokédex e fecha o que estiver aberto
  useEffect(() => {
    if (!locked) return
    setOpen(null)
    if (tab === 'dex') setTab('quiz')
  }, [locked, tab])
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
        {TABS.map((t) => {
          const off = locked && t.id === 'dex'
          return (
            <button
              key={t.id}
              type="button"
              className={`pk-seg-item ${tab === t.id ? 'is-on' : ''}`}
              aria-pressed={tab === t.id}
              disabled={off}
              title={off ? 'Bloqueada até você terminar as tentativas de hoje' : undefined}
              onClick={() => setTab(t.id)}
            >
              {off ? `🔒 ${t.label}` : t.label}
            </button>
          )
        })}
      </div>

      {missingDb && <p className="card muted">{POKE_HINT} Enquanto isso, a Pokédex funciona, mas ninguém pega Pokémon nem entra no ranking.</p>}
      {listError && <ErrorBox error={listError} onRetry={loadList} />}
      {!list && !listError && <Spinner label="Ligando a Pokédex..." />}

      {locked && <p className="muted" style={{ margin: 0 }}>🔒 A Pokédex volta quando você terminar as tentativas de hoje.</p>}
      {list && tab === 'dex' && !locked && <Pokedex list={list} caught={caught ?? null} people={people ?? []} onOpen={setOpen} />}
      {list && tab === 'quiz' && <WhoIsThat
          list={list}
          caught={caught ?? null}
          userId={user?.id}
          onCaught={loadTurma}
          status={quiz}
          onStart={async () => {
            await startQuiz()
            setQuiz((q) => ({ ...(q ?? { used: 0 }), started: true }))
          }}
          onUsed={(update) => setQuiz((q) => (q ? { ...q, used: update(q.used) } : q))}
        />}
      {tab === 'rank' && (ranking === undefined ? <Spinner /> : <PokeRanking rows={ranking} userId={user?.id} total={list?.length ?? 1025} />)}

      {open && !locked && (
        <PokeDetail id={open.id} name={open.name} caughtBy={caught?.get(open.id) ?? []} people={people ?? []} onClose={() => setOpen(null)} />
      )}
      <p className="muted" style={{ fontSize: '0.8rem' }}>
        Dados e imagens: <a href="https://pokeapi.co" target="_blank" rel="noopener noreferrer">PokéAPI</a>. Pokémon e nomes são marcas da Nintendo, Game Freak e The Pokémon Company; este é um projeto de fãs, sem fins lucrativos.
      </p>
    </section>
  )
}
