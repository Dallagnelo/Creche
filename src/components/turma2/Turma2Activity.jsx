import { useEffect, useRef, useState } from 'react'
import { BENS, CROPS, RECIPES, SHOP, biteWindow, buyPrice, cookZone, countOf, recipeUses, rollFish, sellPrice } from '../../lib/turma2/economy'
import { bonus, levelIn, skillById } from '../../lib/turma2/skills'
import { HUD, ItemIcon, Panel } from './Turma2Hud'

// Os minijogos e janelas das atividades da Turma 2.0: pescar, cozinhar, consertar, enfrentar fantasma,
// plantar e a loja. Cada um decide o resultado e chama onResult (o jogo aplica: XP, itens, moedas);
// a janela fica aberta mostrando o que aconteceu, e E (ou o botão) faz de novo.

const ACT_KEYS = ['KeyE', 'Space', 'Enter']
const icon = (id) => ({ ...BENS[id].icone })

/** aperta E / espaço / Enter (ou clica no botão) */
function useAction(fn) {
  const ref = useRef(fn)
  ref.current = fn
  useEffect(() => {
    const onKey = (e) => {
      if (!ACT_KEYS.includes(e.code) || e.repeat) return
      e.preventDefault()
      e.stopPropagation()
      ref.current()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])
}

/** relógio de animação (0 → ∞ segundos desde start) */
function useClock(running) {
  const [t, setT] = useState(0)
  const start = useRef(performance.now())
  useEffect(() => {
    if (!running) return undefined
    start.current = performance.now()
    let raf = 0
    const tick = (now) => {
      setT((now - start.current) / 1000)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [running])
  return [t, () => (performance.now() - start.current) / 1000]
}

function Result({ ok, children, again, onAgain, onClose }) {
  return (
    <div className={`t2a-result${ok ? ' is-ok' : ' is-bad'}`} role="status">
      <div className="t2a-result-body">{children}</div>
      <div className="t2a-actions">
        {again && (
          <button type="button" className="t2h-text-btn t2a-main" onClick={onAgain}>
            {again} <kbd>E</kbd>
          </button>
        )}
        <button type="button" className="t2h-text-btn" onClick={onClose}>
          Fechar
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- pesca
function Fishing({ save, cfg, lib, onResult, onClose }) {
  const [round, setRound] = useState(0)
  const [phase, setPhase] = useState('espera') // espera | morde | fim
  const [out, setOut] = useState(null)
  const wait = useRef(0)
  const win = biteWindow(save, cfg)
  const [t, now] = useClock(phase !== 'fim')
  useEffect(() => {
    wait.current = 1.4 + Math.random() * 3
    setPhase('espera')
    setOut(null)
  }, [round])
  useEffect(() => {
    if (phase === 'espera' && t >= wait.current) setPhase('morde')
    if (phase === 'morde' && t >= wait.current + win) {
      setPhase('fim')
      setOut({ ok: false, msg: 'Demorou… o peixe soltou a isca.' })
    }
  }, [t, phase, win])
  const act = () => {
    if (phase === 'fim') return setRound((r) => r + 1)
    if (phase === 'espera') {
      setPhase('fim')
      setOut({ ok: false, msg: 'Puxou cedo demais e espantou o peixe.' })
      return undefined
    }
    const fish = rollFish(save, cfg)
    setPhase('fim')
    setOut({ ok: true, fish })
    onResult({ tipo: 'pesca', fish })
    return undefined
  }
  useAction(act)
  void now
  const left = phase === 'morde' ? Math.max(0, 1 - (t - wait.current) / win) : 1
  return (
    <Panel title="Pescando" onClose={onClose} className="t2a t2a-fish">
      <div className="t2a-scene t2a-water">
        <span className={`t2a-bobber${phase === 'morde' ? ' is-bite' : ''}`} style={{ transform: `translateY(${phase === 'morde' ? 6 : Math.sin(t * 3) * 2}px)` }} />
        {phase === 'morde' && <span className="t2a-ring" style={{ transform: `scale(${0.4 + left})`, opacity: left }} />}
        <span className="t2a-hint">{phase === 'espera' ? 'Espere morder…' : phase === 'morde' ? 'PUXA!' : ''}</span>
      </div>
      {phase !== 'fim' ? (
        <button type="button" className="t2h-text-btn t2a-main" onClick={act}>
          Puxar <kbd>E</kbd>
        </button>
      ) : (
        <Result ok={out.ok} again="Pescar de novo" onAgain={act} onClose={onClose}>
          {out.ok ? (
            <>
              <ItemIcon lib={lib} item={icon(out.fish.id)} size={40} />
              <span>
                Pegou {out.fish.qtd > 1 ? `${out.fish.qtd}× ` : ''}
                <b>{BENS[out.fish.id].nome}</b>!
              </span>
            </>
          ) : (
            <span>{out.msg}</span>
          )}
        </Result>
      )}
    </Panel>
  )
}

// ---------------------------------------------------------------- culinária
function Cooking({ save, cfg, lib, onResult, onClose }) {
  const [rec, setRec] = useState(null)
  const [out, setOut] = useState(null)
  const [msg, setMsg] = useState('')
  const zone = cookZone(save, cfg)
  const [z0] = useState(() => 0.42 + Math.random() * (0.5 - zone))
  const [t] = useClock(!!rec && !out)
  const lv = levelIn(save, 'culinaria')
  const speed = 0.42 // da barra por segundo (vai acelerando um pouco)
  const pos = rec && !out ? Math.min(1.05, speed * t + 0.08 * t * t) : 0
  const finish = (burnt) => {
    const uses = recipeUses(save, rec)
    if (!uses) return
    const dbl = !burnt && Math.random() * 100 < bonus(save, cfg, 'culinaria', 'dobro')
    const r = { tipo: 'cozinha', uses, dish: burnt ? 'queimado' : rec.id, qtd: dbl ? 2 : 1, xp: burnt ? Math.round(rec.xp * 0.3) : rec.xp }
    setOut(r)
    onResult(r)
  }
  useEffect(() => {
    if (rec && !out && pos >= 1.05) finish(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos])
  const act = () => {
    if (out) {
      setOut(null)
      setMsg('')
      setRec(recipeUses(save, rec) ? { ...rec } : null)
      return
    }
    if (!rec) return
    if (pos < z0) setMsg('Ainda está cru! Espere mais um pouco.')
    else finish(pos > z0 + zone)
  }
  useAction(act)
  return (
    <Panel title="Cozinhando" onClose={onClose} className="t2a t2a-cook">
      {!rec ? (
        <ul className="t2a-list">
          {RECIPES.map((r) => {
            const uses = recipeUses(save, r)
            const locked = lv < r.nivel
            return (
              <li key={r.id}>
                <button type="button" className="t2a-row" disabled={!uses || locked} onClick={() => setRec(r)}>
                  <ItemIcon lib={lib} item={icon(r.id)} size={32} />
                  <span className="t2a-row-main">
                    <b>{BENS[r.id].nome}</b>
                    <small>{r.usa.map((u) => (u === 'peixe' ? 'um peixe' : BENS[u].nome)).join(' + ')}</small>
                  </span>
                  <span className="t2a-row-side">{locked ? `🔒 nível ${r.nivel}` : uses ? `+${r.xp} XP` : 'falta ingrediente'}</span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : !out ? (
        <>
          <p className="t2a-tip">Tire do fogo quando a seta estiver no verde. {msg}</p>
          <div className="t2a-meter">
            <span className="t2a-zone" style={{ left: `${z0 * 100}%`, width: `${zone * 100}%` }} />
            <span className="t2a-burn" style={{ left: `${(z0 + zone) * 100}%` }} />
            <span className="t2a-needle" style={{ left: `${Math.min(1, pos) * 100}%` }} />
          </div>
          <button type="button" className="t2h-text-btn t2a-main" onClick={act}>
            Tirar do fogo <kbd>E</kbd>
          </button>
        </>
      ) : (
        <Result ok={out.dish !== 'queimado'} again={recipeUses(save, rec) ? 'Fazer de novo' : null} onAgain={act} onClose={onClose}>
          <ItemIcon lib={lib} item={icon(out.dish)} size={40} />
          <span>{out.dish === 'queimado' ? 'Queimou!' : `Saiu ${out.qtd > 1 ? '2× ' : ''}${BENS[out.dish].nome}!`}</span>
        </Result>
      )}
    </Panel>
  )
}

// ---------------------------------------------------------------- mecânica
const ARROWS = [
  ['ArrowLeft', '←'],
  ['ArrowUp', '↑'],
  ['ArrowRight', '→'],
  ['ArrowDown', '↓'],
]
function Fixing({ save, cfg, onResult, onClose }) {
  const lv = levelIn(save, 'mecanica')
  const len = Math.min(7, 3 + Math.floor(lv / 10))
  const limit = (3 + len * 0.9) * (1 + bonus(save, cfg, 'mecanica', 'facil') / 100)
  const [seq] = useState(() => Array.from({ length: len }, () => Math.floor(Math.random() * 4)))
  const [at, setAt] = useState(0)
  const [out, setOut] = useState(null)
  const [penalty, setPenalty] = useState(0)
  const [t] = useClock(!out)
  const left = Math.max(0, limit - t - penalty)
  useEffect(() => {
    if (!out && left <= 0) setOut({ ok: false })
  }, [left, out])
  useEffect(() => {
    if (out) return undefined
    const onKey = (e) => {
      const k = ARROWS.findIndex((a) => a[0] === e.key)
      const dir = k >= 0 ? k : { KeyA: 0, KeyW: 1, KeyD: 2, KeyS: 3 }[e.code]
      if (dir === undefined) return
      e.preventDefault()
      e.stopPropagation()
      press(dir)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  })
  const press = (dir) => {
    if (out) return
    if (dir === seq[at]) {
      if (at + 1 >= seq.length) {
        const r = { tipo: 'conserto', ok: true }
        setOut(r)
        onResult(r)
      } else setAt(at + 1)
    } else {
      setAt(0)
      setPenalty((p) => p + 1)
    }
  }
  useAction(() => out && onClose())
  return (
    <Panel title="Consertando" onClose={onClose} className="t2a t2a-fix">
      {!out ? (
        <>
          <p className="t2a-tip">Aperte as setas (ou WASD) na ordem. Errou, volta do começo e perde 1 s.</p>
          <div className="t2a-seq">
            {seq.map((d, i) => (
              <span key={i} className={`t2a-key${i < at ? ' is-done' : i === at ? ' is-now' : ''}`}>
                {ARROWS[d][1]}
              </span>
            ))}
          </div>
          <div className="t2a-time">
            <span style={{ width: `${(left / limit) * 100}%` }} />
          </div>
          <div className="t2a-pad">
            {[1, 0, 3, 2].map((d) => (
              <button key={d} type="button" className={`t2a-padbtn d${d}`} onClick={() => press(d)} aria-label={ARROWS[d][0]}>
                {ARROWS[d][1]}
              </button>
            ))}
          </div>
        </>
      ) : (
        <Result ok={out.ok} onClose={onClose}>
          <img className="t2h-pix" src={`${HUD}i_engrenagem.png`} alt="" style={{ width: 32, height: 32 }} />
          <span>{out.ok ? 'Consertado! Voltou a funcionar.' : 'Não deu tempo… tente de novo.'}</span>
        </Result>
      )}
    </Panel>
  )
}

// ---------------------------------------------------------------- coragem
function Ghost({ save, cfg, onResult, onClose }) {
  const band = 0.16 * (1 + bonus(save, cfg, 'coragem', 'facil') / 100)
  const [hits, setHits] = useState(0)
  const [out, setOut] = useState(null)
  const [round, setRound] = useState(0)
  const [t] = useClock(!out)
  const period = Math.max(0.9, 1.6 - hits * 0.25)
  const phase = ((t + round * 0.37) % period) / period // 1 → 0: o anel fecha
  const size = 1 - phase
  const target = 0.35
  useEffect(() => setRound((r) => r + 1), [hits])
  const act = () => {
    if (out) return onClose()
    if (Math.abs(size - target) <= band / 2) {
      if (hits + 1 >= 3) {
        const r = { tipo: 'coragem', ok: true }
        setOut(r)
        onResult(r)
      } else setHits(hits + 1)
    } else {
      const r = { tipo: 'coragem', ok: false }
      setOut(r)
      onResult(r)
    }
    return undefined
  }
  useAction(act)
  return (
    <Panel title="Fantasma!" onClose={onClose} className="t2a t2a-ghost">
      {!out ? (
        <>
          <p className="t2a-tip">Aperte quando o anel encostar no círculo. Três acertos e ele foge! ({hits}/3)</p>
          <div className="t2a-scene t2a-night">
            <span className="t2a-target" style={{ width: `${target * 100}%`, height: `${target * 100}%`, borderWidth: Math.max(2, band * 60) }} />
            <span className="t2a-closing" style={{ width: `${size * 100}%`, height: `${size * 100}%` }} />
            <span className="t2a-boo">👻</span>
          </div>
          <button type="button" className="t2h-text-btn t2a-main" onClick={act}>
            Agora! <kbd>E</kbd>
          </button>
        </>
      ) : (
        <Result ok={out.ok} onClose={onClose}>
          <span>{out.ok ? 'O fantasma fugiu e deixou umas moedas!' : 'BUUU! Você levou um susto e ele sumiu.'}</span>
        </Result>
      )}
    </Panel>
  )
}

// ---------------------------------------------------------------- plantar
function Planting({ save, lib, onResult, onClose }) {
  const lv = levelIn(save, 'jardinagem')
  const seeds = Object.entries(BENS).filter(([id, b]) => b.tipo === 'semente' && countOf(save, id) > 0)
  return (
    <Panel title="Plantar" onClose={onClose} className="t2a t2a-plant">
      {seeds.length ? (
        <ul className="t2a-list">
          {seeds.map(([id, b]) => {
            const crop = CROPS[b.planta]
            const locked = lv < crop.nivel
            return (
              <li key={id}>
                <button type="button" className="t2a-row" disabled={locked} onClick={() => onResult({ tipo: 'plantar', semente: id })}>
                  <ItemIcon lib={lib} item={icon(b.planta)} size={32} />
                  <span className="t2a-row-main">
                    <b>{BENS[b.planta].nome}</b>
                    <small>
                      {countOf(save, id)} semente{countOf(save, id) > 1 ? 's' : ''} · fica pronta em ~{crop.min} min
                    </small>
                  </span>
                  <span className="t2a-row-side">{locked ? `🔒 nível ${crop.nivel}` : 'Plantar'}</span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="t2a-tip">Você não tem sementes. Compre numa loja (supermercado, quiosque…).</p>
      )}
    </Panel>
  )
}

// ---------------------------------------------------------------- loja
function Shop({ save, cfg, lib, onResult, onClose }) {
  const [tab, setTab] = useState('vender')
  const goods = save.inv.filter((it) => it.bem && BENS[it.bem]?.preco > 0)
  const total = goods.reduce((s, it) => s + sellPrice(save, cfg, it.bem) * it.qtd, 0)
  return (
    <Panel title="Loja" onClose={onClose} className="t2a t2a-shop">
      <div className="t2a-tabs" role="tablist">
        {[
          ['vender', 'Vender'],
          ['comprar', 'Comprar'],
        ].map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'is-on' : ''} onClick={() => setTab(k)}>
            {l}
          </button>
        ))}
        <span className="t2h-dark t2h-chip t2a-coins">
          <img className="t2h-pix t2h-coin" src={`${HUD}i_moeda_p.png`} alt="" />
          {save.moedas}
        </span>
      </div>
      {tab === 'vender' ? (
        goods.length ? (
          <>
            <ul className="t2a-list">
              {goods.map((it) => (
                <li key={it.key} className="t2a-row is-static">
                  <ItemIcon lib={lib} item={it} size={32} />
                  <span className="t2a-row-main">
                    <b>
                      {it.nome} <small>×{it.qtd}</small>
                    </b>
                    <small>{sellPrice(save, cfg, it.bem)} moedas cada</small>
                  </span>
                  <span className="t2a-row-btns">
                    <button type="button" className="t2h-text-btn" onClick={() => onResult({ tipo: 'vender', id: it.bem, qtd: 1 })}>
                      Vender 1
                    </button>
                    {it.qtd > 1 && (
                      <button type="button" className="t2h-text-btn" onClick={() => onResult({ tipo: 'vender', id: it.bem, qtd: it.qtd })}>
                        Todos
                      </button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
            <button type="button" className="t2h-text-btn t2a-main" onClick={() => goods.forEach((it) => onResult({ tipo: 'vender', id: it.bem, qtd: it.qtd }))}>
              Vender tudo ({total} moedas)
            </button>
          </>
        ) : (
          <p className="t2a-tip">Nada para vender. Pesque, plante ou cozinhe e volte aqui!</p>
        )
      ) : (
        <ul className="t2a-list">
          {SHOP.map((id) => {
            const price = buyPrice(save, cfg, id)
            const tool = BENS[id].tipo === 'ferramenta'
            const owned = tool && countOf(save, id) > 0
            return (
              <li key={id} className="t2a-row is-static">
                <ItemIcon lib={lib} item={icon(id)} size={32} />
                <span className="t2a-row-main">
                  <b>{BENS[id].nome}</b>
                  <small>{BENS[id].desc}</small>
                </span>
                <span className="t2a-row-btns">
                  <button type="button" className="t2h-text-btn" disabled={owned || save.moedas < price} onClick={() => onResult({ tipo: 'comprar', id, preco: price })}>
                    {owned ? 'Já tem' : `${price} 🪙`}
                  </button>
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}

/** a janela da atividade aberta agora */
export default function Turma2Activity({ job, save, cfg, lib, onResult, onClose }) {
  const props = { save, cfg, lib, onResult, onClose }
  const sk = skillById(cfg, { pesca: 'pesca', cozinha: 'culinaria', conserto: 'mecanica', coragem: 'coragem', plantar: 'jardinagem', loja: 'comercio' }[job.tipo])
  const body =
    job.tipo === 'pesca' ? <Fishing {...props} /> : job.tipo === 'cozinha' ? <Cooking {...props} /> : job.tipo === 'conserto' ? <Fixing {...props} /> : job.tipo === 'coragem' ? <Ghost {...props} /> : job.tipo === 'plantar' ? <Planting {...props} /> : job.tipo === 'loja' ? <Shop {...props} /> : null
  return (
    <div className="t2a-wrap" style={{ '--sk': sk?.cor ?? '#5eead4' }}>
      {body}
    </div>
  )
}
