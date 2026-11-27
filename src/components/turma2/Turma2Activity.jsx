import { useEffect, useRef, useState } from 'react'
import { BENS, CROPS, RECIPES, SHOP, biteWindow, buyPrice, cookZone, countOf, recipeUses, rollFish, sellPrice } from '../../lib/turma2/economy'
import { bonus, levelIn, skillById } from '../../lib/turma2/skills'
import { HUD, ItemIcon, Panel } from './Turma2Hud'
import { gameTime, msToMorning } from '../../lib/turma2/clock'

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

// ---------------------------------------------------------------- pesca (no estilo Stardew)
// 1) espere morder e puxe na hora; 2) segure (Espaço, E ou o mouse) para a barrinha verde subir e
// acompanhar o peixe: com ele dentro, o medidor enche; fora, esvazia. Cheio = pegou.
const FIGHT = { lixo: 10, lambari: 25, tilapia: 38, tucunare: 55, dourado: 72, lendario: 90 }
function Fishing({ save, cfg, lib, onResult, onClose }) {
  const [round, setRound] = useState(0)
  const [phase, setPhase] = useState('espera') // espera | morde | luta | fim
  const [out, setOut] = useState(null)
  const wait = useRef(0)
  const win = biteWindow(save, cfg)
  const [t] = useClock(phase !== 'fim')
  const g = useRef({ fish: null, f: 0.5, ft: 0.5, next: 0, b: 0, v: 0, p: 0.3, hold: false, last: 0 })
  const [, redraw] = useState(0)
  useEffect(() => {
    wait.current = 1.4 + Math.random() * 3
    setPhase('espera')
    setOut(null)
  }, [round])
  const lv = levelIn(save, 'pesca')
  const barSize = Math.min(0.5, 0.22 + lv * 0.005 + (bonus(save, cfg, 'pesca', 'facil') / 100) * 0.12)
  // a luta: roda a cada quadro
  useEffect(() => {
    if (phase !== 'luta') return undefined
    let raf = 0
    let prev = performance.now()
    const st = g.current
    const diff = (FIGHT[st.fish.id] ?? 30) / 100
    const step = (now) => {
      const dt = Math.min(0.05, (now - prev) / 1000)
      prev = now
      // o peixe escolhe um ponto novo de vez em quando (o difícil muda mais e corre mais)
      st.next -= dt
      if (st.next <= 0) {
        st.ft = Math.random()
        st.next = 0.35 + Math.random() * (1.4 - diff)
      }
      st.f += (st.ft - st.f) * Math.min(1, dt * (1 + diff * 4))
      // a barrinha: segurando sobe, soltando cai
      st.v += (st.hold ? 2.8 : -2.4) * dt
      st.v = Math.max(-1.6, Math.min(1.6, st.v))
      st.b += st.v * dt
      if (st.b < 0) {
        st.b = 0
        st.v = Math.abs(st.v) * 0.3
      }
      if (st.b > 1 - barSize) {
        st.b = 1 - barSize
        st.v = 0
      }
      const inside = st.f >= st.b && st.f <= st.b + barSize
      st.p += (inside ? 0.38 : -0.26 * (1 + diff)) * dt
      if (st.p >= 1) {
        setPhase('fim')
        setOut({ ok: true, fish: st.fish })
        onResult({ tipo: 'pesca', fish: st.fish })
        return
      }
      if (st.p <= 0) {
        setPhase('fim')
        setOut({ ok: false, msg: 'Ah não, o peixe escapou!' })
        return
      }
      redraw((n) => n + 1)
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])
  useEffect(() => {
    if (phase === 'espera' && t >= wait.current) setPhase('morde')
    if (phase === 'morde' && t >= wait.current + win) {
      setPhase('fim')
      setOut({ ok: false, msg: 'Demorou… o peixe soltou a isca.' })
    }
  }, [t, phase, win])
  const press = () => {
    if (phase === 'fim') {
      onResult({ tipo: 'lance' }) // cada lance novo gasta energia (sem energia, o jogo fecha a pesca)
      return setRound((r) => r + 1)
    }
    if (phase === 'espera') {
      setPhase('fim')
      setOut({ ok: false, msg: 'Puxou cedo demais e espantou o peixe.' })
      return undefined
    }
    if (phase === 'morde') {
      const st = g.current
      st.fish = rollFish(save, cfg)
      st.f = 0.3 + Math.random() * 0.4
      st.ft = st.f
      st.next = 0.5
      st.b = 0
      st.v = 0
      st.p = 0.3
      st.hold = true
      setPhase('luta')
    }
    return undefined
  }
  // segurar: teclado (Espaço, E, Enter) ou mouse/dedo em qualquer lugar da janela
  useEffect(() => {
    const down = (e) => {
      if (!ACT_KEYS.includes(e.code)) return
      e.preventDefault()
      e.stopPropagation()
      if (e.repeat) return
      g.current.hold = true
      press()
    }
    const up = (e) => {
      if (ACT_KEYS.includes(e.code)) g.current.hold = false
    }
    window.addEventListener('keydown', down, true)
    window.addEventListener('keyup', up, true)
    return () => {
      window.removeEventListener('keydown', down, true)
      window.removeEventListener('keyup', up, true)
    }
  })
  const st = g.current
  return (
    <Panel title="Pescando" onClose={onClose} className="t2a t2a-fish">
      {phase === 'luta' ? (
        <div
          className="t2a-fight"
          onPointerDown={(e) => {
            e.preventDefault()
            st.hold = true
          }}
          onPointerUp={() => (st.hold = false)}
          onPointerLeave={() => (st.hold = false)}
        >
          <div className="t2a-track">
            <span className="t2a-bar" style={{ bottom: `${st.b * 100}%`, height: `${barSize * 100}%` }} />
            <span className="t2a-fishdot" style={{ bottom: `calc(${st.f * 100}% - 9px)` }}>
              🐟
            </span>
          </div>
          <div className="t2a-catch">
            <span style={{ height: `${Math.max(0, st.p) * 100}%` }} />
          </div>
          <p className="t2a-tip">Segure Espaço (ou o mouse) para a barra verde subir; solte para descer. Mantenha o peixe dentro dela!</p>
        </div>
      ) : (
        <div className="t2a-scene t2a-water">
          <span className={`t2a-bobber${phase === 'morde' ? ' is-bite' : ''}`} style={{ transform: `translateY(${phase === 'morde' ? 6 : Math.sin(t * 3) * 2}px)` }} />
          {phase === 'morde' && <span className="t2a-ring" />}
          <span className="t2a-hint">{phase === 'espera' ? 'Espere morder…' : phase === 'morde' ? 'PUXA!' : ''}</span>
        </div>
      )}
      {phase === 'fim' ? (
        <Result ok={out.ok} again="Pescar de novo" onAgain={press} onClose={onClose}>
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
      ) : phase !== 'luta' ? (
        <button type="button" className="t2h-text-btn t2a-main" onClick={press}>
          Puxar <kbd>Espaço</kbd>
        </button>
      ) : null}
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

// ---------------------------------------------------------------- caixa de venda (paga na manhã seguinte)
function ShippingBin({ save, cfg, lib, onResult, onClose }) {
  const today = gameTime().day
  const box = save.caixa?.dia === today ? save.caixa.itens : {}
  const goods = save.inv.filter((it) => it.bem && BENS[it.bem]?.preco > 0)
  const inBox = Object.entries(box)
  const total = inBox.reduce((sum, [id, q]) => sum + sellPrice(save, cfg, id) * q, 0)
  const mins = Math.ceil(msToMorning() / 60000)
  return (
    <Panel title="Caixa de venda" onClose={onClose} className="t2a t2a-shop">
      <p className="t2a-tip">
        O que você põe aqui é vendido de manhã (daqui a {mins} min de verdade). Dá para tirar de volta até lá.
      </p>
      {inBox.length > 0 && (
        <>
          <ul className="t2a-list">
            {inBox.map(([id, q]) => (
              <li key={id} className="t2a-row is-static">
                <ItemIcon lib={lib} item={icon(id)} size={28} />
                <span className="t2a-row-main">
                  <b>
                    {BENS[id].nome} <small>×{q}</small>
                  </b>
                  <small>{sellPrice(save, cfg, id) * q} moedas</small>
                </span>
                <span className="t2a-row-btns">
                  <button type="button" className="t2h-text-btn" onClick={() => onResult({ tipo: 'tirar', id, qtd: q })}>
                    Tirar
                  </button>
                </span>
              </li>
            ))}
          </ul>
          <p className="t2a-tip">
            Na caixa: <b>{total} moedas</b> amanhã cedo.
          </p>
        </>
      )}
      {goods.length ? (
        <ul className="t2a-list">
          {goods.map((it) => (
            <li key={it.key} className="t2a-row is-static">
              <ItemIcon lib={lib} item={it} size={28} />
              <span className="t2a-row-main">
                <b>
                  {it.nome} <small>×{it.qtd}</small>
                </b>
                <small>{sellPrice(save, cfg, it.bem)} moedas cada</small>
              </span>
              <span className="t2a-row-btns">
                <button type="button" className="t2h-text-btn" onClick={() => onResult({ tipo: 'caixa', id: it.bem, qtd: 1 })}>
                  Pôr 1
                </button>
                {it.qtd > 1 && (
                  <button type="button" className="t2h-text-btn" onClick={() => onResult({ tipo: 'caixa', id: it.bem, qtd: it.qtd })}>
                    Todos
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        !inBox.length && <p className="t2a-tip">Nada para vender ainda. Plante, pesque ou cozinhe!</p>
      )}
    </Panel>
  )
}

// ---------------------------------------------------------------- baú da casa
function ChestList({ title, list, lib, verb, onMove, empty }) {
  return (
    <div className="t2a-chest-col">
      <h4>{title}</h4>
      {list.length ? (
        <ul className="t2a-list">
          {list.map((it) => (
            <li key={it.key} className="t2a-row is-static">
              <ItemIcon lib={lib} item={it} size={28} />
              <span className="t2a-row-main">
                <b>
                  {it.nome} <small>×{it.qtd}</small>
                </b>
              </span>
              <span className="t2a-row-btns">
                <button type="button" className="t2h-text-btn" onClick={() => onMove(it.key, 1)}>
                  {verb} 1
                </button>
                {it.qtd > 1 && (
                  <button type="button" className="t2h-text-btn" onClick={() => onMove(it.key, it.qtd)}>
                    Todos
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="t2a-tip">{empty}</p>
      )}
    </div>
  )
}

function Chest({ save, lib, onResult, onClose }) {
  return (
    <Panel title="Baú" onClose={onClose} className="t2a t2a-chest">
      <p className="t2a-tip">O baú guarda o que você quiser, sem limite. Só você vê o seu.</p>
      <div className="t2a-chest-cols">
        <ChestList title="Mochila" list={save.inv} lib={lib} verb="Guardar" empty="Mochila vazia." onMove={(key, qtd) => onResult({ tipo: 'guardar', key, qtd })} />
        <ChestList title="No baú" list={save.bau ?? []} lib={lib} verb="Pegar" empty="O baú está vazio." onMove={(key, qtd) => onResult({ tipo: 'retirar', key, qtd })} />
      </div>
    </Panel>
  )
}

/** a janela da atividade aberta agora */
export default function Turma2Activity({ job, save, cfg, lib, onResult, onClose }) {
  const props = { save, cfg, lib, onResult, onClose }
  const sk = skillById(cfg, { pesca: 'pesca', cozinha: 'culinaria', conserto: 'mecanica', coragem: 'coragem', plantar: 'jardinagem', loja: 'comercio', venda: 'comercio', bau: 'criacao' }[job.tipo])
  const body =
    job.tipo === 'pesca' ? <Fishing {...props} /> : job.tipo === 'cozinha' ? <Cooking {...props} /> : job.tipo === 'conserto' ? <Fixing {...props} /> : job.tipo === 'coragem' ? <Ghost {...props} /> : job.tipo === 'plantar' ? <Planting {...props} /> : job.tipo === 'loja' ? <Shop {...props} /> : job.tipo === 'venda' ? <ShippingBin {...props} /> : job.tipo === 'bau' ? <Chest {...props} /> : null
  return (
    <div className="t2a-wrap" style={{ '--sk': sk?.cor ?? '#5eead4' }}>
      {body}
    </div>
  )
}
