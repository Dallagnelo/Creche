import { useEffect, useRef, useState } from 'react'

// "Nota ao vivo" do Cine turma: cada um mexe uma barrinha (😡 … 😍) enquanto assiste,
// e o site vai anotando a média da plateia inteira ao longo do vídeo. No fim, o gráfico aparece para
// todo mundo que está na sala (sentado ou não), e é o MESMO gráfico para todos: quem anotou a sessão
// mais longa manda a linha do tempo e os outros adotam.
// Fica fininha no canto esquerdo e quase some com o mouse parado, para não atrapalhar o vídeo.
// Nada é salvo no banco.

export const MOODS = ['😡', '😕', '😐', '🙂', '😍'] // -2 … +2
const SAMPLE_MS = 5000
const MAX_SHARED = 200 // pontos no gráfico enviado no fim (cabe folgado numa mensagem)
const clock = (seconds) => {
  const total = Math.max(0, Math.floor(seconds || 0))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const sec = String(total % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}
const spanOf = (line) => (line.length >= 2 ? line[line.length - 1].t - line[0].t : 0)
// reduz para no máximo MAX_SHARED pontos (média de cada pedaço) e arredonda
const compact = (line) => {
  const step = Math.max(1, Math.ceil(line.length / MAX_SHARED))
  const out = []
  for (let i = 0; i < line.length; i += step) {
    const chunk = line.slice(i, i + step)
    out.push([
      Math.round(chunk[chunk.length - 1].t),
      Math.round((chunk.reduce((a, b) => a + b.avg, 0) / chunk.length) * 100) / 100,
      Math.max(...chunk.map((c) => c.n)),
    ])
  }
  // as pontas ficam exatas (o começo e o fim da sessão não mudam ao reduzir)
  out[0][0] = Math.round(line[0].t)
  out[out.length - 1][0] = Math.round(line[line.length - 1].t)
  return out
}
// o que chega pela rede: só números dentro do esperado
const expand = (pts) =>
  (Array.isArray(pts) ? pts : [])
    .slice(0, MAX_SHARED)
    .filter((p) => Array.isArray(p) && p.every(Number.isFinite))
    .map(([t, avg, n]) => ({ t: Math.max(0, t), avg: Math.max(-2, Math.min(2, avg)), n: Math.max(1, Math.min(99, Math.round(n))) }))
    .sort((a, b) => a.t - b.t)

/**
 * Guarda a nota de cada um (recebida pelo cine.subscribe) e a linha do tempo da média da plateia.
 * Roda para todo mundo na sala do cinema (sentado ou não); só quem está sentado manda a própria nota.
 * getPeople: () => quem está sentado agora; getVideoTime: () => { key, t, dur, ended, paused }.
 */
export function useMoodTimeline({ cine, meId, getPeople, getVideoTime, enabled = true, seated = false }) {
  const [mine, setMine] = useState(0)
  const moods = useRef(new Map()) // userId -> -2..2
  const [timeline, setTimeline] = useState([]) // [{ t, avg, n }]
  const [ended, setEnded] = useState(false)
  const [chartOpen, setChartOpen] = useState(false)
  const keyRef = useRef(null)
  const lineRef = useRef([])
  lineRef.current = timeline
  const sharedSpan = useRef(-1) // maior gráfico já recebido/enviado neste vídeo
  const sendTimer = useRef(0)
  const peopleRef = useRef(getPeople)
  peopleRef.current = getPeople
  // a função muda a cada render do telão: guarda a mais nova sem reiniciar o relógio de 5 s
  const timeRef = useRef(getVideoTime)
  timeRef.current = getVideoTime
  const seatedRef = useRef(seated)
  seatedRef.current = seated

  const startVideo = (key) => {
    keyRef.current = key
    setTimeline([])
    lineRef.current = []
    setEnded(false)
    setChartOpen(false)
    sharedSpan.current = -1
    clearTimeout(sendTimer.current)
  }
  const shareMine = () => {
    const line = lineRef.current
    if (line.length < 2 || spanOf(line) <= sharedSpan.current + 4) return
    const pts = compact(line)
    sharedSpan.current = spanOf(expand(pts)) - 0.01 // a própria mensagem volta para mim e abre o gráfico
    cine?.act('chart', null, { key: keyRef.current, pts })
  }

  // notas dos outros e o gráfico final que alguém mandou
  useEffect(() => {
    if (!cine || !enabled) return undefined
    return cine.subscribe((ev) => {
      if (ev.act === 'mood') moods.current.set(ev.from, ev.v)
      if (ev.act === 'chart') {
        if (!ev.key) return
        if (keyRef.current && ev.key !== keyRef.current) return // gráfico de outro vídeo
        if (!keyRef.current) keyRef.current = ev.key
        const line = expand(ev.pts)
        const span = spanOf(line)
        if (line.length < 2 || span < sharedSpan.current) return
        sharedSpan.current = span
        if (spanOf(lineRef.current) > span + 4) {
          shareMine() // o meu pegou mais do vídeo (quem mandou chegou depois): mando o meu e todos adotam
          return
        }
        clearTimeout(sendTimer.current)
        lineRef.current = line
        setTimeline(line)
        setEnded(true)
        setChartOpen(true)
      }
    })
  }, [cine, enabled]) // eslint-disable-line react-hooks/exhaustive-deps

  // a sua nota: manda quando muda (devagar) e repete de vez em quando para quem chegou depois
  const sentRef = useRef(0)
  useEffect(() => {
    if (!enabled || !seated) return undefined
    moods.current.set(meId, mine)
    const timer = setTimeout(() => {
      cine?.act('mood', null, { v: mine })
      sentRef.current = Date.now()
    }, 500)
    return () => clearTimeout(timer)
  }, [mine, meId, cine, enabled, seated])
  useEffect(() => {
    if (!enabled) return undefined
    const timer = setInterval(() => {
      if (seatedRef.current && Date.now() - sentRef.current > 30000) {
        cine?.act('mood', null, { v: moods.current.get(meId) ?? 0 })
        sentRef.current = Date.now()
      }
    }, 10000)
    return () => clearInterval(timer)
  }, [cine, meId, enabled])

  // anota a média da plateia toda a cada 5 s de vídeo tocando
  useEffect(() => {
    if (!enabled) return undefined
    const finish = () => {
      if (sendTimer.current || sharedSpan.current >= 0) return // já está mandando ou já recebeu
      setEnded(true)
      setChartOpen(true)
      // quem manda primeiro: o primeiro sentado da lista; os outros esperam um pouco e só mandam se
      // ninguém mandou um gráfico tão longo quanto o seu (assim todo mundo acaba com o mesmo)
      const ids = (peopleRef.current?.() ?? []).map((p) => p.id).sort()
      const rank = ids.indexOf(meId)
      const wait = (rank < 0 ? ids.length + 2 : rank) * 1500 + 400
      sendTimer.current = setTimeout(shareMine, wait)
    }
    const timer = setInterval(() => {
      const now = timeRef.current?.()
      if (!now) return
      if (now.key !== keyRef.current) startVideo(now.key) // outro vídeo: começa um gráfico novo
      if (now.ended) return finish()
      if (now.paused) return
      const ids = (peopleRef.current?.() ?? []).map((p) => p.id)
      if (!ids.length) return
      // todo mundo sentado conta na média (quem ainda não mexeu a barrinha conta como 😐)
      const values = ids.map((id) => moods.current.get(id) ?? 0)
      const avg = values.reduce((a, b) => a + b, 0) / values.length
      setTimeline((current) => {
        const last = current[current.length - 1]
        if (last && Math.abs(last.t - now.t) < 2) return current // pulou para trás ou parado: não repete
        return [...current, { t: now.t, avg, n: ids.length }].sort((a, b) => a.t - b.t).slice(-1500)
      })
      if (now.dur && now.t >= now.dur - 3) finish()
    }, SAMPLE_MS)
    return () => {
      clearInterval(timer)
      clearTimeout(sendTimer.current)
      sendTimer.current = 0
    }
  }, [enabled, meId]) // eslint-disable-line react-hooks/exhaustive-deps

  return { mine, setMine, timeline, ended, chartOpen, setChartOpen }
}

/** Termômetro no canto esquerdo: 5 carinhas empilhadas (😍 em cima, 😡 embaixo); a escolhida acende. */
const MOOD_LABELS = ['odiando', 'não curtindo', 'normal', 'curtindo', 'amando']
export function MoodSlider({ value, onChange }) {
  const onKey = (event) => {
    const step = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[event.key]
    if (!step) return
    event.preventDefault()
    event.stopPropagation()
    const next = Math.max(-2, Math.min(2, value + step))
    onChange(next)
    event.currentTarget.querySelector(`[data-v="${next}"]`)?.focus()
  }
  return (
    <div className="cine-mood" role="radiogroup" aria-label="Nota ao vivo do filme" title="Nota ao vivo: como está o filme para você?" onKeyDown={onKey}>
      <span className="cine-mood-label" aria-hidden="true">Nota</span>
      {[2, 1, 0, -1, -2].map((v) => (
        <button
          key={v}
          type="button"
          role="radio"
          data-v={v}
          aria-checked={value === v}
          aria-label={MOOD_LABELS[v + 2]}
          tabIndex={value === v ? 0 : -1}
          className={`cine-mood-opt${value === v ? ' is-on' : ''}`}
          onClick={() => onChange(v)}
        >
          {MOODS[v + 2]}
        </button>
      ))}
    </div>
  )
}

/** Gráfico de como a plateia sentiu o vídeo ao longo do tempo. */
export function MoodChart({ timeline, title, onClose }) {
  const W = 560
  const H = 200
  const pad = { l: 34, r: 12, t: 14, b: 26 }
  const enough = timeline.length >= 2
  const t0 = enough ? timeline[0].t : 0
  const t1 = enough ? timeline[timeline.length - 1].t : 1
  const x = (t) => pad.l + ((t - t0) / Math.max(1, t1 - t0)) * (W - pad.l - pad.r)
  const y = (v) => pad.t + ((2 - v) / 4) * (H - pad.t - pad.b)
  const path = timeline.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.avg).toFixed(1)}`).join(' ')
  const area = enough ? `${path} L${x(t1).toFixed(1)},${y(0)} L${x(t0).toFixed(1)},${y(0)} Z` : ''
  const best = enough ? timeline.reduce((a, b) => (b.avg > a.avg ? b : a)) : null
  const worst = enough ? timeline.reduce((a, b) => (b.avg < a.avg ? b : a)) : null
  const avg = enough ? timeline.reduce((a, b) => a + b.avg, 0) / timeline.length : 0
  const verdict = avg >= 1 ? 'A turma amou! 😍' : avg >= 0.3 ? 'A turma curtiu 🙂' : avg > -0.3 ? 'Morno 😐' : avg > -1 ? 'Não agradou muito 😕' : 'A turma odiou 😡'

  return (
    <div className="cine-chart" role="dialog" aria-label="Como a turma sentiu o vídeo">
      <div className="cine-chart-head">
        <h3>📈 Termômetro da sessão</h3>
        <button type="button" onClick={onClose} aria-label="Fechar o gráfico">
          ×
        </button>
      </div>
      <p className="cine-chart-title">{title}</p>
      {!enough ? (
        <p className="cine-chart-empty">Ainda não deu tempo de juntar as notas. Mexa a barrinha 😡 … 😍 enquanto assiste!</p>
      ) : (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Média da plateia ao longo do vídeo. ${verdict}`}>
            {[-2, -1, 0, 1, 2].map((v) => (
              <g key={v}>
                <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} className={v === 0 ? 'is-zero' : ''} />
                <text x={pad.l - 6} y={y(v) + 5} textAnchor="end">
                  {MOODS[v + 2]}
                </text>
              </g>
            ))}
            <path d={area} className="cine-chart-area" />
            <path d={path} className="cine-chart-line" />
            {best && <circle cx={x(best.t)} cy={y(best.avg)} r="5" className="is-best" />}
            {worst && <circle cx={x(worst.t)} cy={y(worst.avg)} r="5" className="is-worst" />}
            <text x={pad.l} y={H - 6} className="cine-chart-time">
              {clock(t0)}
            </text>
            <text x={W - pad.r} y={H - 6} textAnchor="end" className="cine-chart-time">
              {clock(t1)}
            </text>
          </svg>
          <p className="cine-chart-verdict">
            <strong>{verdict}</strong>
            {best && best.avg > 0 && <span> · Melhor momento: {clock(best.t)}</span>}
            {worst && worst.avg < 0 && <span> · Pior momento: {clock(worst.t)}</span>}
          </p>
        </>
      )}
    </div>
  )
}
