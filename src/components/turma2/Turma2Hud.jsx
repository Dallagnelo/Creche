import { useEffect, useRef, useState } from 'react'
import { atlasUrl } from '../../lib/turma2/assets'
import { composeChar, composePortrait, drawPortrait, loadCharLib } from '../../lib/turma2/character'
import { TIPOS, levelOf, totalLevel } from '../../lib/turma2/skills'
import { CharThumb } from './Turma2Character'
import Turma2Activity from './Turma2Activity'
import { HUD_DEFAULT, HUD_PATH, POSITIONS, normalizeHud } from '../../lib/turma2/hudConfig'
import { setHot } from '../../lib/turma2/save'

// Interface do jogo da Turma 2.0, feita com as peças do Modern User Interface (LimeZu):
// ficha do jogador, título do mapa, botões, mochila, lista de mapas, ajuda, conversa e avisos.
// Fica por cima do canvas; o jogo continua recebendo as setas e o clique no chão.

export const HUD = HUD_PATH

/** botão da folha do pacote: cell = [coluna, fileira] na grade de ícones; icon = ícone solto sobre o botão vazio */
export function UiButton({ cell, icon, label, onClick, pressed, hotkey }) {
  const [c, r] = cell ?? [3, -1]
  return (
    <button
      type="button"
      className={`t2h-btn${icon ? ' has-icon' : ''}${pressed ? ' is-on' : ''}`}
      style={{ '--bx': `${c * 48}px`, '--by': `${(16 + r * 16) * 3}px` }}
      onClick={onClick}
      aria-label={hotkey ? `${label} (${hotkey})` : label}
      aria-pressed={pressed === undefined ? undefined : pressed}
      title={hotkey ? `${label} (${hotkey})` : label}
    >
      {icon && <img src={`${HUD}${icon}.png`} alt="" />}
    </button>
  )
}

/** rosto (retrato) num canvas; talking mexe a boca; nod faz "sim" com a cabeça */
export function Face({ char, size = 64, talking = false, nod = false }) {
  const ref = useRef(null)
  const img = useRef(null)
  const flags = useRef({ talking, nod })
  flags.current = { talking, nod }
  const key = JSON.stringify(char)
  useEffect(() => {
    let alive = true
    img.current = null
    const head = { img: null } // personagem pronto não tem retrato: usa a cabeça do boneco
    composePortrait(char).then((p) => {
      if (!alive) return
      if (p) img.current = p
      else composeChar(char).then((b) => alive && (head.img = b))
    })
    let raf = 0
    const tick = (now) => {
      const c = ref.current
      if (c) {
        const ctx = c.getContext('2d')
        ctx.imageSmoothingEnabled = false
        ctx.clearRect(0, 0, 32, 32)
        if (img.current) drawPortrait(ctx, img.current, 0, 0, now / 1000, flags.current.talking || flags.current.nod, flags.current.nod ? 1 : 0)
        else if (head.img) ctx.drawImage(head.img, 18 * 16, 3, 16, 16, 0, 2, 32, 32)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      alive = false
      cancelAnimationFrame(raf)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return <canvas ref={ref} width={32} height={32} className="t2h-face" style={{ width: size, height: size }} aria-hidden="true" />
}

/** ícone de um item (peça da biblioteca), cabendo no espaço */
export function ItemIcon({ lib, item, size = 40 }) {
  if (item.tipo === 'moeda') return <img className="t2h-pix" src={`${HUD}i_moeda.png`} alt="" style={{ width: 30, height: 26 }} />
  const r = lib?.[item.src]?.[item.t]?.[item.n]
  if (!r) return <img className="t2h-pix" src={`${HUD}i_presente.png`} alt="" style={{ width: 28, height: 32 }} />
  const [x, y, w, h] = r
  const big = Math.max(w, h)
  const s = big < size ? Math.min(4, Math.floor(size / big)) : size / big // pequeno: aumenta em pixels inteiros
  return (
    <span className="t2h-item" style={{ width: w * s, height: h * s }}>
      <span style={{ width: w, height: h, backgroundImage: `url(${atlasUrl(item.src, item.t)})`, backgroundPosition: `-${x}px -${y}px`, transform: `scale(${s})` }} />
    </span>
  )
}

/** fileira de ícones (vida, fome…): value = quantos cheios (aceita meio), count = quantos ao todo */
function Pips({ icon, value, count = 5, label }) {
  return (
    <span className="t2h-pips" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={count} aria-valuenow={value} title={`${label}: ${value} de ${count}`}>
      {Array.from({ length: count }, (_, i) => {
        const fill = clamp01(value - i)
        return (
          <span key={i} className="t2h-pip">
            <img className="t2h-pix is-empty" src={`${HUD}${icon}.png`} alt="" />
            {fill > 0 && (
              <span className="t2h-pip-fill" style={{ width: `${fill * 100}%` }}>
                <img className="t2h-pix" src={`${HUD}${icon}.png`} alt="" />
              </span>
            )}
          </span>
        )
      })}
    </span>
  )
}
const clamp01 = (v) => Math.max(0, Math.min(1, v))

/** barra do pacote (fundo vazio + cor), value de 0 a 1 */
export function Bar({ icon, color, value, label, wide = false }) {
  const pct = Math.round(clamp01(value) * 100)
  return (
    <span className={`t2h-barrow${wide ? ' is-wide' : ''}`} title={`${label}: ${pct}%`}>
      {icon && <img className="t2h-pix t2h-baricon" src={`${HUD}${icon}.png`} alt="" />}
      <span className="t2h-bar" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <span className="t2h-bar-fill" style={{ width: `${pct}%`, backgroundImage: `url(${HUD}barra_${color}.png)` }} />
      </span>
    </span>
  )
}

export function Panel({ title, onClose, children, className = '' }) {
  return (
    // fundo escurecido por trás: a janela fica sozinha por cima de tudo (clicar fora fecha)
    <div className="t2h-backdrop" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`t2h-panel ${className}`} role="dialog" aria-label={title}>
        <div className="t2h-panel-head">
          <span className="t2h-title">{title}</span>
          <UiButton cell={[1, 1]} label="Fechar" hotkey="Esc" onClick={onClose} />
        </div>
        {children}
      </div>
    </div>
  )
}

/** conversa com um personagem do mapa: o texto vai aparecendo; clique ou E mostra tudo */
function Dialog({ talk, speed = 28, face = true }) {
  const [shown, setShown] = useState(0)
  const full = talk.fala
  useEffect(() => {
    if (!speed) {
      setShown(full.length)
      return undefined
    }
    setShown(0)
    const t = setInterval(() => setShown((n) => (n >= full.length ? n : n + 1)), speed)
    return () => clearInterval(t)
  }, [talk.id, full, speed])
  const done = shown >= full.length
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') setShown(full.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [full])
  return (
    <div className="t2h-dialog" onClick={() => setShown(full.length)} role="status" aria-live="polite">
      {face && talk.c && !talk.c.pronto && (
        <div className="t2h-dialog-face">
          <Face char={talk.c} size={72} talking={!done} />
        </div>
      )}
      <div className="t2h-dialog-body">
        {talk.nome && <span className="t2h-title t2h-dialog-name">{talk.nome}</span>}
        <p>
          {full.slice(0, shown)}
          {!done && <span className="t2h-caret">▍</span>}
        </p>
      </div>
    </div>
  )
}

const SKY = { dia: ['☀️', 'Dia'], tarde: ['🌇', 'Fim de tarde'], noite: ['🌙', 'Noite'] }

/** um status da ficha (ícones ou barra), do jeito que está na configuração, com o valor ao lado */
export function StatusRow({ s }) {
  const icons = s.tipo === 'icones'
  const count = Math.max(1, Math.min(10, Number(s.qtd) || 5))
  const value = Number(s.valor) || 0
  return (
    <span className={`t2h-stat${icons ? '' : ' is-bar'}`}>
      <small>{s.rotulo}</small>
      {icons ? (
        <Pips icon={s.icone || 'i_coracao_p'} value={value} count={count} label={s.rotulo} />
      ) : (
        <Bar icon={s.icone} color={s.cor || 'verde'} value={value / 100} label={s.rotulo} wide />
      )}
      <em className="t2h-statval">{icons ? `${value}/${count}` : `${Math.round(value)}%`}</em>
    </span>
  )
}

const TIPO_NOME = Object.fromEntries(TIPOS.map(([k, l]) => [k, l]))

/** janela das habilidades: nível e XP de cada uma; clique abre as passivas e o visual */
function SkillsPanel({ cfg, save, lib, character, onWear, onClose }) {
  const [open, setOpen] = useState(cfg.skills[0]?.id)
  const [charLib, setCharLib] = useState(null)
  useEffect(() => {
    loadCharLib().then(setCharLib).catch(() => {})
  }, [])
  const person = character && !character.pronto ? character : { corpo: 'body_03', olhos: 'eyes_02', cabelo: 'hairstyle_01_01' }
  const sk = cfg.skills.find((s) => s.id === open)
  const info = levelOf(save.xp?.[open] ?? 0)
  return (
    <Panel title={`Habilidades · nível total ${totalLevel(save, cfg)}`} onClose={onClose} className="t2h-skillsp">
      <div className="t2s-body">
        <ul className="t2s-list">
          {cfg.skills.map((s) => {
            const l = levelOf(save.xp?.[s.id] ?? 0)
            return (
              <li key={s.id}>
                <button type="button" className={`t2s-item${open === s.id ? ' is-on' : ''}`} style={{ '--sk': s.cor }} onClick={() => setOpen(s.id)}>
                  <img className="t2h-pix t2s-icon" src={`${HUD}${s.icone}.png`} alt="" />
                  <span className="t2s-name">{s.nome}</span>
                  <b className="t2s-lv">{l.nivel}</b>
                  <span className="t2s-xp" aria-hidden="true">
                    <span style={{ width: `${l.pct * 100}%` }} />
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
        {sk && (
          <div className="t2s-detail" style={{ '--sk': sk.cor }}>
            <div className="t2s-head">
              <img className="t2h-pix" src={`${HUD}${sk.icone}.png`} alt="" />
              <div>
                <span className="t2h-title">{sk.nome}</span>
                <span className="t2h-muted">
                  Nível {info.nivel}
                  {info.falta ? ` · faltam ${info.falta} XP para o ${info.nivel + 1}` : ' · nível máximo!'}
                </span>
              </div>
            </div>
            <span className="t2s-xp is-big" role="meter" aria-label={`XP de ${sk.nome}`} aria-valuenow={Math.round(info.pct * 100)} aria-valuemin={0} aria-valuemax={100}>
              <span style={{ width: `${info.pct * 100}%` }} />
            </span>
            <p className="t2s-desc">{sk.desc}</p>
            <ul className="t2s-passives">
              {sk.passivas.map((p, i) => {
                const on = info.nivel >= p.nivel
                return (
                  <li key={i} className={on ? 'is-on' : ''}>
                    <span className="t2s-plv">{on ? '✔' : `🔒 ${p.nivel}`}</span>
                    <span>
                      <b>{p.nome}</b> <small className="t2h-muted">({TIPO_NOME[p.tipo]} +{p.valor}%)</small>
                      <br />
                      <small>{p.desc}</small>
                    </span>
                  </li>
                )
              })}
            </ul>
            {sk.visual && (
              <div className="t2s-look">
                {charLib && <CharThumb lib={charLib} char={{ ...person, roupa: sk.visual.roupa, acessorio: sk.visual.acessorio }} scale={3} />}
                <span>
                  <b>Visual: {sk.visual.nome}</b>
                  <br />
                  <small className="t2h-muted">{info.nivel >= sk.visual.nivel ? 'Liberado!' : `Libera no nível ${sk.visual.nivel}`}</small>
                </span>
                {info.nivel >= sk.visual.nivel && onWear && (
                  <button type="button" className="t2h-text-btn" onClick={() => onWear(save.veste === sk.id ? null : sk.id)}>
                    {save.veste === sk.id ? 'Tirar' : 'Vestir'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Panel>
  )
}

const fmtTime = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// skillsCfg: as habilidades (lib/turma2/skills.js); act: o que dá para fazer onde o boneco está (E faz);
// job: a atividade aberta (minijogo, loja…); notes: avisos de XP e de nível novo
export default function Turma2Hud({ stageRef, lib, name, character, mapName, maps, code, onPickMap, outdoor, sky, onSky, grid, onGrid, talk, save, toast, onDrop, onSave, onResetSave, config = HUD_DEFAULT, preview = false, skillsCfg = null, act = null, onAct = null, job = null, onJobResult = null, onJobClose = null, notes = [], onWear = null }) {
  const cfg = normalizeHud(config)
  const [panel, setPanel] = useState(null) // mochila | mapas | ajuda
  const [pick, setPick] = useState(null) // item escolhido na mochila
  const [full, setFull] = useState(false)
  const [stats, setStats] = useState(cfg.ficha.aberta) // ficha aberta com os status (clique no rosto ou C)
  useEffect(() => setStats(cfg.ficha.aberta), [cfg.ficha.aberta])
  const nod = !!toast
  const slots = cfg.barra.espacos
  const hot = Array.from({ length: slots }, (_, i) => save.hot?.[i] ?? null)
  const sel = Math.min(save.sel ?? 0, slots - 1)
  const [hotName, setHotName] = useState(null) // nome do item ao trocar o espaço da barra rápida
  const selectHot = (i) => {
    const slot = (i + slots) % slots
    onSave((sv) => ({ ...sv, sel: slot }))
    const it = save.inv.find((x) => x.key === hot[slot])
    setHotName(it ? { text: it.nome, at: Date.now() } : null)
  }
  useEffect(() => {
    if (!hotName) return undefined
    const t = setTimeout(() => setHotName(null), 1400)
    return () => clearTimeout(t)
  }, [hotName])

  useEffect(() => {
    const onFs = () => setFull(document.fullscreenElement === stageRef.current?.parentElement)
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [stageRef])

  const toggleFull = () => {
    const el = stageRef.current?.parentElement
    if (!el || preview) return
    if (document.fullscreenElement) document.exitFullscreen?.()
    else el.requestFullscreen?.().catch(() => {})
  }
  const cycleSky = () => onSky(sky === 'dia' ? 'tarde' : sky === 'tarde' ? 'noite' : 'dia')
  // ao fechar uma janela o foco volta para o jogo (as setas e os atalhos continuam funcionando)
  const close = () => {
    setPanel(null)
    stageRef.current?.focus({ preventScroll: true })
  }
  const open = (p) => (panel === p ? close() : setPanel(p))

  // atalhos (só quando o foco está no jogo, para não atrapalhar quem digita em outro lugar)
  useEffect(() => {
    if (preview) return undefined
    const el = stageRef.current?.parentElement
    if (!el) return undefined
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      // vale com o foco no jogo, ou solto na página (um botão da janela que sumiu deixa o foco no body)
      if (!el.contains(e.target) && e.target !== document.body) return
      if (job) {
        // o minijogo cuida das teclas; Esc fecha
        if (e.key === 'Escape') onJobClose?.()
        return
      }
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      const k = e.key.toLowerCase()
      if (k === 'i' || k === 'b') open('mochila')
      else if (k === 'm') open('mapas')
      else if (k === 'h' || k === '?') open('ajuda')
      else if (k === 'g') onGrid(!grid)
      else if (k === 'f') toggleFull()
      else if (k === 't' && outdoor) cycleSky()
      else if (k === 'c' && cfg.ficha.mostrar) setStats((v) => !v)
      else if (k === 'k' && skillsCfg) open('habilidades')
      else if (k === 'e' && act && !act.off && onAct && !panel) {
        e.preventDefault()
        onAct(act)
      }
      else if (cfg.barra.mostrar && /^[1-9]$/.test(e.key) && Number(e.key) <= slots) selectHot(Number(e.key) - 1)
      else if (e.key === 'Escape' && panel) close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const items = save.inv
  const chosen = items.find((it) => it.key === pick) ?? null
  const f = cfg.ficha
  const hasStats = cfg.status.length > 0
  const level = skillsCfg ? totalLevel(save, skillsCfg) : 1
  const [clock, setClock] = useState(Date.now())
  useEffect(() => {
    if (!save.entrega) return undefined
    const t = setInterval(() => setClock(Date.now()), 500)
    return () => clearInterval(t)
  }, [save.entrega])

  const blocks = {
    // ficha do jogador: fechada mostra rosto, nível, nome e moedas; aberta (clique ou C) mostra os status
    ficha: (
      <div key="ficha" className={`t2h-card t2h-me${stats ? ' is-open' : ''}`}>
        <div className="t2h-me-row">
          <button type="button" className="t2h-me-face" onClick={() => hasStats && setStats((v) => !v)} title={hasStats ? (stats ? 'Esconder status (C)' : 'Ver status (C)') : name}>
            <Face char={character} size={60} nod={nod} />
            {f.nivel && (
              <span className="t2h-level" title={`Nível total ${level}`}>
                <img className="t2h-pix" src={`${HUD}i_estrela.png`} alt="" />
                <b>{level}</b>
              </span>
            )}
          </button>
          <div className="t2h-me-info">
            {f.nome && <strong className="t2h-me-name">{name}</strong>}
            {skillsCfg && (
              <button type="button" className="t2h-dark t2h-chip t2h-skillchip" onClick={() => open('habilidades')} title="Habilidades (K)">
                <img className="t2h-pix" src={`${HUD}i_estrela.png`} alt="" />
                Habilidades
              </button>
            )}
            {f.moedas && (
              <span className="t2h-dark t2h-chip" title="Moedas">
                <img className="t2h-pix t2h-coin" src={`${HUD}i_moeda_p.png`} alt="" />
                {save.moedas}
              </span>
            )}
          </div>
          {hasStats && (
            <button type="button" className="t2h-dark t2h-chip t2h-me-toggle" onClick={() => setStats((v) => !v)} aria-expanded={stats} aria-label={stats ? 'Esconder status (C)' : 'Ver status (C)'} title="Status (C)">
              {stats ? '▲' : '▼'}
            </button>
          )}
        </div>
        {stats && hasStats && (
          <div className="t2h-stats">
            <span className="t2h-stats-head">Status</span>
            {cfg.status.map((st) => (
              <StatusRow key={st.id} s={st} />
            ))}
          </div>
        )}
      </div>
    ),
    titulo: (
      <div key="titulo" className="t2h-top">
        <span className="t2h-title t2h-mapname">{mapName}</span>
        {outdoor && cfg.titulo.hora && (
          <button type="button" className="t2h-dark t2h-chip t2h-sky" onClick={cycleSky} title="Mudar a hora (T)">
            {SKY[sky][0]} {SKY[sky][1]}
          </button>
        )}
      </div>
    ),
    botoes: (
      <div key="botoes" className="t2h-buttons" role="toolbar" aria-label="Menu do jogo">
        {cfg.botoes.mochila && <UiButton icon="i_mochila" label="Mochila" hotkey="I" pressed={panel === 'mochila'} onClick={() => open('mochila')} />}
        {cfg.botoes.habilidades && skillsCfg && <UiButton icon="i_estrela" label="Habilidades" hotkey="K" pressed={panel === 'habilidades'} onClick={() => open('habilidades')} />}
        {cfg.botoes.mapas && <UiButton cell={[7, 0]} label="Mapas" hotkey="M" pressed={panel === 'mapas'} onClick={() => open('mapas')} />}
        {cfg.botoes.grade && <UiButton cell={[2, 0]} label="Onde dá para andar" hotkey="G" pressed={grid} onClick={() => onGrid(!grid)} />}
        {cfg.botoes.tela && <UiButton cell={[full ? 6 : 7, 1]} label={full ? 'Sair da tela cheia' : 'Tela cheia'} hotkey="F" pressed={full} onClick={toggleFull} />}
        {cfg.botoes.ajuda && <UiButton cell={[1, 3]} label="Ajuda" hotkey="H" pressed={panel === 'ajuda'} onClick={() => open('ajuda')} />}
      </div>
    ),
    // barra rápida: números escolhem; dois cliques tiram o item do espaço
    barra: (
      <div key="barra" className="t2h-hotbar" role="toolbar" aria-label="Barra rápida" onWheel={(e) => selectHot(sel + (e.deltaY > 0 ? 1 : -1))}>
        {hotName && (
          <span className="t2h-title t2h-hotname" key={hotName.at}>
            {hotName.text}
          </span>
        )}
        {hot.map((k, i) => {
          const it = k && save.inv.find((x) => x.key === k)
          return (
            <button
              key={i}
              type="button"
              className={`t2h-slot${i === sel ? ' is-on' : ''}`}
              onClick={() => selectHot(i)}
              onDoubleClick={() => it && onSave((sv) => setHot(sv, i, null))}
              aria-label={`Espaço ${i + 1}: ${it ? it.nome : 'vazio'}`}
              aria-pressed={i === sel}
              title={it ? `${it.nome} (dois cliques tira da barra)` : `Espaço ${i + 1}`}
            >
              <span className="t2h-hotnum">{i + 1}</span>
              {it && <ItemIcon lib={lib} item={it} size={32} />}
              {it?.qtd > 1 && <span className="t2h-qtd">{it.qtd}</span>}
            </button>
          )
        })}
      </div>
    ),
  }
  const order = ['ficha', 'titulo', 'botoes', 'barra']
  const bagSlots = Math.max(cfg.mochila.espacos, Math.ceil(items.length / cfg.mochila.colunas) * cfg.mochila.colunas)

  return (
    <div className="t2h" style={{ '--hud-zoom': cfg.escala }}>
      {POSITIONS.map(([pos]) => {
        const here = order.filter((k) => cfg[k].mostrar && cfg[k].pos === pos && blocks[k])
        if (!here.length) return null
        return (
          <div key={pos} className={`t2h-anchor t2h-at-${pos}`}>
            {here.map((k) => blocks[k])}
            {pos === 'topo-centro' && save.entrega && (
              <span className="t2h-dark t2h-chip t2h-delivery" role="status">
                📦 Leve para <b>{save.entrega.nome}</b> · {fmtTime(save.entrega.ate - clock)}
              </span>
            )}
            {pos === 'baixo-centro' && act && !job && !panel && (
              <button type="button" className={`t2h-card t2h-act${act.off ? ' is-off' : ''}`} onClick={() => !act.off && onAct?.(act)} disabled={act.off}>
                {!act.off && <kbd>E</kbd>}
                {act.label}
                {act.sub && <small>{act.sub}</small>}
              </button>
            )}
          </div>
        )
      })}

      {notes.length > 0 && (
        <div className="t2h-notes" aria-live="polite">
          {notes.map((n) => (
            <span key={n.id} className={`t2h-note${n.big ? ' is-big' : ''}`} style={{ '--sk': n.cor ?? '#5eead4' }}>
              {n.text}
            </span>
          ))}
        </div>
      )}

      {job && skillsCfg && <Turma2Activity job={job} save={save} cfg={skillsCfg} lib={lib} onResult={onJobResult} onClose={onJobClose} />}

      {toast && (
        <div className="t2h-toast t2h-card" key={toast.at} role="status">
          <ItemIcon lib={lib} item={toast.item} size={32} />
          <span>
            {toast.item.tipo === 'moeda' ? `+${toast.item.valor || 1} moeda${(toast.item.valor || 1) > 1 ? 's' : ''}` : `Pegou: ${toast.item.nome || 'item'}`}
          </span>
        </div>
      )}

      {talk && !panel && !job && (
        <div className={`t2h-dialog-wrap${cfg.barra.mostrar && cfg.barra.pos.startsWith('baixo') ? ' above-bar' : ''}${act ? ' has-act' : ''}`}>
          <Dialog talk={talk} speed={cfg.conversa.velocidade} face={cfg.conversa.rosto} />
        </div>
      )}

      {panel === 'mochila' && (
        <Panel title="Mochila" onClose={close} className="t2h-bag">
          <div className="t2h-bag-body">
            <div className="t2h-slots" style={{ gridTemplateColumns: `repeat(${cfg.mochila.colunas}, 48px)` }}>
              {Array.from({ length: bagSlots }, (_, i) => {
                const it = items[i]
                return (
                  <button
                    key={it?.key ?? `vazio-${i}`}
                    type="button"
                    className={`t2h-slot${it && it.key === pick ? ' is-on' : ''}`}
                    disabled={!it}
                    onClick={() => it && setPick(it.key)}
                    aria-label={it ? `${it.nome} (${it.qtd})` : 'Vazio'}
                  >
                    {it && <ItemIcon lib={lib} item={it} />}
                    {it?.qtd > 1 && <span className="t2h-qtd">{it.qtd}</span>}
                  </button>
                )
              })}
            </div>
            <div className="t2h-card t2h-detail">
              {chosen ? (
                <>
                  <div className="t2h-detail-icon">
                    <ItemIcon lib={lib} item={chosen} size={64} />
                  </div>
                  <strong>{chosen.nome}</strong>
                  <span className="t2h-muted">Quantidade: {chosen.qtd}</span>
                  {chosen.desc && <p>{chosen.desc}</p>}
                  {!cfg.barra.mostrar ? null : hot.includes(chosen.key) ? (
                    <span className="t2h-muted">Na barra rápida: espaço {hot.indexOf(chosen.key) + 1}</span>
                  ) : (
                    <button
                      type="button"
                      className="t2h-text-btn"
                      onClick={() => {
                        const free = hot.indexOf(null)
                        onSave((sv) => setHot(sv, free >= 0 ? free : sel, chosen.key))
                      }}
                    >
                      Pôr na barra rápida
                    </button>
                  )}
                  <button
                    type="button"
                    className="t2h-text-btn"
                    onClick={() => {
                      onDrop(chosen.key)
                      if (chosen.qtd <= 1) setPick(null)
                    }}
                  >
                    Jogar fora 1
                  </button>
                </>
              ) : (
                <>
                  <img className="t2h-pix" src={`${HUD}i_mochila.png`} alt="" style={{ width: 54, height: 54 }} />
                  <span className="t2h-muted">{items.length ? 'Escolha um item para ver.' : 'Vazia. Ande pelos mapas e pegue o que brilhar!'}</span>
                </>
              )}
              <span className="t2h-dark t2h-chip t2h-coins">
                <img className="t2h-pix t2h-coin" src={`${HUD}i_moeda_p.png`} alt="" />
                {save.moedas} moedas
              </span>
            </div>
          </div>
        </Panel>
      )}

      {panel === 'habilidades' && skillsCfg && <SkillsPanel cfg={skillsCfg} save={save} lib={lib} character={character} onWear={onWear} onClose={close} />}

      {panel === 'mapas' && (
        <Panel title="Mapas" onClose={close} className="t2h-maps">
          <div className="t2h-maplist">
            {maps.map((m) => (
              <button
                key={m.code}
                type="button"
                className={`t2h-card t2h-mapbtn${m.code === code ? ' is-on' : ''}`}
                onClick={() => {
                  setPanel(null)
                  onPickMap(m.code)
                }}
              >
                <strong>{m.label}</strong>
                <span className="t2h-muted">{m.code === code ? 'Você está aqui' : m.draft ? 'Rascunho (só você vê)' : 'Ir para cá'}</span>
              </button>
            ))}
          </div>
        </Panel>
      )}

      {panel === 'ajuda' && (
        <Panel title="Como jogar" onClose={close} className="t2h-help">
          <ul className="t2h-keys">
            <li><kbd>Setas</kbd> ou <kbd>WASD</kbd> andam · clique no chão para ir até lá</li>
            <li>Chegue perto de alguém para conversar · <kbd>E</kbd> mostra a fala inteira</li>
            <li>Passe por cima do que brilha para pegar (moedas e itens)</li>
            {cfg.barra.mostrar && (
              <li>
                <kbd>1</kbd> a <kbd>{slots}</kbd> ou a roda do mouse escolhem o espaço da barra rápida
              </li>
            )}
            {cfg.ficha.mostrar && hasStats && (
              <li>
                <kbd>C</kbd> ou clique no seu rosto mostra seus status
              </li>
            )}
            {skillsCfg && (
              <>
                <li>
                  <kbd>E</kbd> faz a atividade do lugar: pescar na beira da água, cozinhar na churrasqueira ou fogueira, vender na loja, pegar entregas no correio, consertar o que quebrou, plantar na horta e, à noite, enfrentar fantasmas
                </li>
                <li>
                  <kbd>K</kbd> mostra suas habilidades: cada uma sobe fazendo a atividade e libera passivas a cada 10 níveis
                </li>
              </>
            )}
            <li><kbd>I</kbd> mochila · <kbd>M</kbd> mapas · <kbd>G</kbd> onde dá para andar</li>
            <li>
              <kbd>F</kbd> tela cheia{outdoor ? ' · ' : ''}
              {outdoor && (
                <>
                  <kbd>T</kbd> muda a hora do dia
                </>
              )}{' '}
              · <kbd>Esc</kbd> fecha janelas
            </li>
          </ul>
          <p className="t2h-muted">Seu progresso fica guardado na sua conta.</p>
          <button
            type="button"
            className="t2h-text-btn"
            onClick={() => {
              if (window.confirm('Zerar moedas, mochila, habilidades e tudo que você já pegou nos mapas?')) onResetSave()
            }}
          >
            Recomeçar do zero
          </button>
        </Panel>
      )}
    </div>
  )
}
