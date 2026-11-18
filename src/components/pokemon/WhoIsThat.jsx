import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { artUrl, GENERATIONS, playCry } from '../../services/pokeapi'
import { DAILY_TRIES, recordGuess } from '../../services/pokemon'

const GEN_KEY = 'pokemon-quiz-gens'
const shuffle = (arr) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
const readGens = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(GEN_KEY) ?? 'null')
    if (Array.isArray(saved) && saved.length && saved.every((g) => GENERATIONS.some((x) => x.id === g))) return saved
  } catch {
    // sem armazenamento
  }
  return [1]
}

// O dia vira à meia-noite de Brasília (UTC−3, sem horário de verão).
const untilMidnight = () => {
  const now = Date.now() - 3 * 3600 * 1000
  const left = 86400000 - (now % 86400000)
  const h = Math.floor(left / 3600000)
  const m = Math.floor((left % 3600000) / 60000)
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}min` : `${m} min`
}
// A rodada em aberto fica guardada: recarregar a página não troca o Pokémon (não dá para "pular" os difíceis).
const roundKey = (userId) => `pokemon-quiz-round:${userId}`
const readRound = (userId) => {
  try {
    const saved = JSON.parse(localStorage.getItem(roundKey(userId)) ?? 'null')
    return saved?.id && Array.isArray(saved.options) && saved.options.length === 4 ? saved : null
  } catch {
    return null
  }
}
const writeRound = (userId, round) => {
  try {
    if (round) localStorage.setItem(roundKey(userId), JSON.stringify(round))
    else localStorage.removeItem(roundKey(userId))
  } catch {
    // sem armazenamento
  }
}

/** Minijogo: a silhueta aparece, você escolhe o nome. Acertou = pegou o Pokémon (vale para a Pokédex da turma). */
export default function WhoIsThat({ list, caught, userId, onCaught, status, onStart, onUsed }) {
  const [gens, setGens] = useState(readGens)
  const [round, setRound] = useState(null)
  const [picked, setPicked] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [streak, setStreak] = useState(0)
  const [score, setScore] = useState({ right: 0, total: 0 })
  const [news, setNews] = useState(null)
  const [saveError, setSaveError] = useState(null)
  // tentativas de hoje e se a partida foi iniciada vêm da página (ela também bloqueia a Pokédex)
  const used = status === undefined ? undefined : status === null ? null : status.used
  const started = status === null || !!status?.started
  const [starting, setStarting] = useState(false)
  const [, setTick] = useState(0)
  const recent = useRef([])
  const nextRef = useRef(null)
  const answerRef = useRef(null)
  const outRef = useRef(false)

  const pool = useMemo(() => {
    const ranges = GENERATIONS.filter((g) => gens.includes(g.id))
    return list.filter((p) => ranges.some((g) => p.id >= g.from && p.id <= g.to))
  }, [list, gens])

  const makeRound = useCallback(() => {
    if (pool.length < 4) return null
    let target
    for (let i = 0; i < 30; i += 1) {
      target = pool[Math.floor(Math.random() * pool.length)]
      if (!recent.current.includes(target.id)) break
    }
    const others = shuffle(pool.filter((p) => p.id !== target.id)).slice(0, 3)
    return { id: target.id, name: target.name, options: shuffle([target, ...others]) }
  }, [pool])

  const next = useCallback(() => {
    const saved = readRound(userId)
    if (saved) {
      // rodada que ficou sem resposta (recarregou a página ou trocou de aba): continua nela
      setRound(saved)
      setPicked(null)
      setNews(null)
      setLoaded(false)
      return
    }
    const r = nextRef.current ?? makeRound()
    nextRef.current = makeRound()
    if (nextRef.current) new Image().src = artUrl(nextRef.current.id) // já baixa a próxima
    if (!r) return
    recent.current = [r.id, ...recent.current].slice(0, Math.min(40, Math.floor(pool.length / 2)))
    writeRound(userId, r)
    setRound(r)
    setPicked(null)
    setNews(null)
    setLoaded(false)
  }, [makeRound, pool.length, userId])

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 30000)
    return () => clearInterval(timer)
  }, [])

  // trocou as gerações: começa de novo
  useEffect(() => {
    try {
      localStorage.setItem(GEN_KEY, JSON.stringify(gens))
    } catch {
      // sem armazenamento
    }
    nextRef.current = null
    recent.current = []
  }, [gens])

  // partida iniciada (agora ou numa visita anterior): mostra a rodada (a que ficou aberta, se tiver)
  const leftNow = used == null ? null : Math.max(0, DAILY_TRIES - used)
  useEffect(() => {
    if (started && !round && leftNow !== 0) next()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, leftNow === 0])

  async function begin() {
    setStarting(true)
    setSaveError(null)
    try {
      await onStart()
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setStarting(false)
    }
  }

  async function answer(option) {
    if (!round || picked || out) return
    const right = option.id === round.id
    const newStreak = right ? streak + 1 : 0
    setPicked(option.id)
    writeRound(userId, null)
    onUsed?.((n) => n + 1)
    setStreak(newStreak)
    setScore((s) => ({ right: s.right + (right ? 1 : 0), total: s.total + 1 }))
    playCry(round.id, 0.3)
    const already = (caught?.get(round.id) ?? []).includes(userId)
    if (right && !already) setNews(round.name)
    try {
      setSaveError(null)
      await recordGuess(round.id, right, newStreak)
      if (right && !already) onCaught?.()
    } catch (err) {
      setSaveError(err.message)
      if (err.limit) onUsed?.(() => DAILY_TRIES)
    }
  }
  answerRef.current = answer

  // teclado: 1 a 4 respondem, Enter vai para o próximo
  useEffect(() => {
    const onKey = (event) => {
      if (event.target.closest?.('input, textarea, select')) return
      if (!picked && /^[1-4]$/.test(event.key) && round) answerRef.current(round.options[Number(event.key) - 1])
      else if (picked && !outRef.current && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault()
        next()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [picked, round, next])

  const toggleGen = (id) =>
    setGens((current) => (current.includes(id) ? (current.length > 1 ? current.filter((g) => g !== id) : current) : [...current, id].sort((a, b) => a - b)))
  const left = used == null ? null : Math.max(0, DAILY_TRIES - used)
  const out = left === 0
  outRef.current = out
  const allOn = gens.length === GENERATIONS.length
  const right = picked && picked === round?.id
  const mine = caught ? [...caught.values()].filter((users) => users.includes(userId)).length : null

  return (
    <div className="pk-quiz">
      {used === undefined && <p className="muted">Carregando...</p>}

      {used !== undefined && !started && !out && (
        <div className="pk-start">
          <div className="pk-stage pk-stage-mystery" aria-hidden="true">
            <span>?</span>
          </div>
          <h2 className="pk-start-title">Quem é esse Pokémon?</h2>
          <p>
            Você tem <b>{left ?? DAILY_TRIES} {left === 1 ? 'tentativa' : 'tentativas'}</b> hoje. Acertou, pegou: ele entra na Pokédex da turma.
          </p>
          <p className="muted pk-start-lock">
            <span aria-hidden="true">🔒</span> Ao iniciar, a Pokédex fica bloqueada até você terminar as tentativas.
          </p>
          <div className="pk-start-regions">
            <span className="muted">Regiões do jogo</span>
            <div className="filter-chips" role="group" aria-label="Regiões do jogo">
              <button type="button" className={`filter-chip${allOn ? ' is-on' : ''}`} aria-pressed={allOn} onClick={() => setGens(allOn ? [1] : GENERATIONS.map((g) => g.id))}>
                Todas
              </button>
              {GENERATIONS.map((g) => (
                <button key={g.id} type="button" className={`filter-chip${gens.includes(g.id) ? ' is-on' : ''}`} aria-pressed={gens.includes(g.id)} onClick={() => toggleGen(g.id)} title={`${g.id}ª geração (${g.from}–${g.to})`}>
                  {g.name}
                </button>
              ))}
            </div>
          </div>
          <button type="button" className="btn btn-primary pk-start-btn" disabled={starting || pool.length < 4} onClick={begin}>
            {starting ? 'Iniciando...' : 'Iniciar o jogo'}
          </button>
        </div>
      )}

      {started && (
      <div className="pk-score" aria-live="polite">
        <div>{streak} <span>em sequência</span></div>
        <div>{score.right}/{score.total} <span>nesta partida</span></div>
        {mine !== null && <div>{mine} <span>pegos por você</span></div>}
        {left !== null && <div>{left}/{DAILY_TRIES} <span>tentativas hoje</span></div>}
      </div>
      )}

      {out && !picked && (
        <div className="card pk-done">
          <p className="pk-verdict">Acabaram as tentativas de hoje!</p>
          <p className="muted">Você usou as {DAILY_TRIES} de hoje. Novas tentativas em {untilMidnight()} (meia-noite).</p>
        </div>
      )}

      {started && round && !(out && !picked) && (
        <>
          <div className={`pk-stage ${picked ? 'is-revealed' : ''}`}>
            <img key={round.id} src={artUrl(round.id)} alt={picked ? round.name : 'Silhueta de um Pokémon misterioso'} draggable="false" onLoad={() => setLoaded(true)} onContextMenu={(e) => e.preventDefault()} />
            {!loaded && <span className="pk-stage-name">...</span>}
            {picked && <span className="pk-stage-name">É o {round.name}!</span>}
          </div>

          <p className={`pk-verdict ${picked ? (right ? 'is-good' : 'is-bad') : ''}`} role="status">
            {!picked ? 'Quem é esse Pokémon?' : right ? (news ? `Acertou! Você pegou ${news}!` : 'Acertou!') : 'Errou!'}
          </p>

          <div className="pk-options">
            {round.options.map((option, i) => {
              const state = picked ? (option.id === round.id ? 'is-right' : option.id === picked ? 'is-wrong' : '') : ''
              return (
                <button key={option.id} type="button" className={`btn pk-option ${state}`} disabled={!!picked} onClick={() => answer(option)}>
                  <small className="muted" aria-hidden="true">{i + 1}</small> {option.name}
                </button>
              )
            })}
          </div>
          {picked && !out && (
            <button type="button" className="btn btn-primary" onClick={next} autoFocus>
              {left == null ? 'Próximo' : `Próximo (${left} ${left === 1 ? 'restante' : 'restantes'} hoje)`}
            </button>
          )}
          {picked && out && <p className="muted">Essa foi a última de hoje. A Pokédex está liberada de novo. Novas tentativas em {untilMidnight()}.</p>}
        </>
      )}
      {saveError && <p role="alert" style={{ color: 'var(--danger)', fontWeight: 700 }}>{saveError}</p>}
      {started && !out && !round && <p className="muted">Escolha pelo menos uma região com 4 ou mais Pokémon.</p>}
    </div>
  )
}
