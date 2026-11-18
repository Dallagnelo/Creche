import { useEffect, useMemo, useState } from 'react'
import { dexNumber, GENERATIONS, plain, pokemonOfType, TYPES } from '../../services/pokeapi'
import Avatar from '../Avatar'
import ListSearch from '../ListSearch'
import { PokeSprite } from './PokeBits'

const PAGE = 60

/** Pokédex da turma: todos os Pokémon, com busca, filtros e quem da turma já pegou cada um. */
export default function Pokedex({ list, caught, people, onOpen }) {
  const [query, setQuery] = useState('')
  const [gen, setGen] = useState('')
  const [type, setType] = useState('')
  const [show, setShow] = useState('todos')
  const [typeIds, setTypeIds] = useState(null)
  const [typeError, setTypeError] = useState(null)
  const [limit, setLimit] = useState(PAGE)

  useEffect(() => {
    setTypeIds(null)
    setTypeError(null)
    if (!type) return undefined
    let alive = true
    pokemonOfType(type)
      .then((ids) => alive && setTypeIds(new Set(ids)))
      .catch((err) => alive && setTypeError(err.message))
    return () => {
      alive = false
    }
  }, [type])

  useEffect(() => setLimit(PAGE), [query, gen, type, show])

  const visible = useMemo(() => {
    const raw = query.trim().replace(/^#/, '')
    const isNumber = /^\d+$/.test(raw)
    const exact = isNumber && raw.startsWith('0') // "007" é exatamente o 7
    const num = raw.replace(/^0+/, '')
    const q = plain(raw)
    const g = GENERATIONS.find((x) => String(x.id) === gen)
    return list.filter((p) => {
      if (g && (p.id < g.from || p.id > g.to)) return false
      if (type && (!typeIds || !typeIds.has(p.id))) return false
      const who = caught?.get(p.id) ?? []
      if (show === 'pegos' && who.length === 0) return false
      if (show === 'faltam' && who.length > 0) return false
      if (!q) return true
      if (isNumber) return exact ? String(p.id) === num : String(p.id).startsWith(num)
      return plain(p.name).includes(q)
    })
  }, [list, query, gen, type, typeIds, show, caught])

  const turmaTotal = caught ? caught.size : 0

  return (
    <div className="stack">
      <div className="pk-tools">
        <ListSearch value={query} onChange={setQuery} label="Pesquisar Pokémon" placeholder="Nome ou número (ex.: pikachu, 25)" />
        <label className="sr-only" htmlFor="pk-gen">Geração</label>
        <select id="pk-gen" value={gen} onChange={(e) => setGen(e.target.value)}>
          <option value="">Todas as regiões</option>
          {GENERATIONS.map((g) => <option key={g.id} value={g.id}>{g.id}ª · {g.name}</option>)}
        </select>
        <label className="sr-only" htmlFor="pk-type">Tipo</label>
        <select id="pk-type" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">Todos os tipos</option>
          {Object.entries(TYPES).map(([key, t]) => <option key={key} value={key}>{t.name}</option>)}
        </select>
        {caught && (
          <div className="pk-seg" role="group" aria-label="Mostrar">
            {[['todos', 'Todos'], ['pegos', 'Pegos'], ['faltam', 'Faltam']].map(([id, label]) => (
              <button key={id} type="button" className={`pk-seg-item ${show === id ? 'is-on' : ''}`} aria-pressed={show === id} onClick={() => setShow(id)}>{label}</button>
            ))}
          </div>
        )}
      </div>
      <p className="muted pk-count">
        {caught ? `A turma já pegou ${turmaTotal} de ${list.length}. ` : ''}
        {visible.length === list.length ? `${list.length} Pokémon` : `${visible.length} encontrados`}
        {type && !typeIds && !typeError ? ' · carregando o tipo...' : ''}
      </p>
      {typeError && <p className="muted" role="alert">{typeError}</p>}

      {visible.length === 0 && (!type || typeIds) && <p className="muted list-empty">Nenhum Pokémon encontrado.</p>}
      <ul className="pk-grid">
        {visible.slice(0, limit).map((p) => {
          const who = caught?.get(p.id) ?? []
          const faces = who.map((uid) => people.find((x) => x.id === uid)).filter(Boolean)
          return (
            <li key={p.id}>
              <button type="button" className="pk-card" onClick={() => onOpen(p)}>
                <PokeSprite id={p.id} alt="" />
                <span className="pk-num">{dexNumber(p.id)}</span>
                <span className="pk-name">{p.name}</span>
                <span className="pk-who" aria-label={faces.length ? `Pegos por ${faces.map((f) => f.display_name).join(', ')}` : 'Ninguém pegou ainda'}>
                  {faces.slice(0, 4).map((f) => <Avatar key={f.id} name={f.display_name} src={f.avatar_url} size={22} />)}
                  {faces.length > 4 && <small className="muted" style={{ marginLeft: 4 }}>+{faces.length - 4}</small>}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      {visible.length > limit && (
        <button type="button" className="btn btn-ghost pk-more" onClick={() => setLimit((n) => n + PAGE)}>
          Mostrar mais ({visible.length - limit} restantes)
        </button>
      )}
    </div>
  )
}
