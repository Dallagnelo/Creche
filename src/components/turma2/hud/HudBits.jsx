import { HUD_PATH as HUD } from '../../../lib/turma2/hudConfig'
import { useRef, useEffect, useState } from 'react'
import { composePortrait, composeChar, drawPortrait } from '../../../lib/turma2/character'
import { atlasUrl } from '../../../lib/turma2/assets'
import { clockText } from '../../../lib/turma2/clock'
import { ENERGY_MAX } from '../../../lib/turma2/economy'

// Peças pequenas da interface do jogo: botões, rosto, ícone de item, barras, janelas, conversa, relógio e energia.
/** botão da folha do pacote: cell = [coluna, fileira] na grade de ícones; icon = ícone solto sobre o botão vazio */
export function UiButton({ cell, icon, label, onClick, pressed, hotkey, className = '' }) {
  const [c, r] = cell ?? [3, -1]
  return (
    <button
      type="button"
      className={`t2h-btn${icon ? ' has-icon' : ''}${pressed ? ' is-on' : ''}${className ? ` ${className}` : ''}`}
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
  // ícone da fazenda: o pacote desenhou à mão em 16, 24 e 32 px; usa o maior que cabe (sem borrar)
  let t = item.t
  if (t === 'fazenda_icones') {
    const v = [32, 24].find((v) => v <= size && lib?.[item.src]?.[`${t}_${v}`]?.[item.n])
    if (v) t = `${t}_${v}`
  }
  const r = lib?.[item.src]?.[t]?.[item.n]
  if (!r) return <img className="t2h-pix" src={`${HUD}i_presente.png`} alt="" style={{ width: 28, height: 32 }} />
  const [x, y, w, h] = r
  const big = Math.max(w, h)
  const s = big < size ? Math.min(4, Math.floor(size / big)) : size / big // pequeno: aumenta em pixels inteiros
  return (
    <span className="t2h-item" style={{ width: w * s, height: h * s }}>
      <span style={{ width: w, height: h, backgroundImage: `url(${atlasUrl(item.src, t)})`, backgroundPosition: `-${x}px -${y}px`, transform: `scale(${s})` }} />
    </span>
  )
}

export const clamp01 = (v) => Math.max(0, Math.min(1, v))

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
export function Dialog({ talk, speed = 28, face = true }) {
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
        {talk.nome && (
          <span className="t2h-dialog-top">
            <span className="t2h-title t2h-dialog-name">{talk.nome}</span>
            {talk.coracoes !== undefined && <Hearts n={talk.coracoes} />}
          </span>
        )}
        <p>
          {full.slice(0, shown)}
          {!done && <span className="t2h-caret">▍</span>}
        </p>
      </div>
    </div>
  )
}

/** corações de amizade (10 no máximo, como no Stardew) */
export function Hearts({ n, max = 10 }) {
  return (
    <span className="t2h-hearts" aria-label={`${n} de ${max} corações`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < n ? 'is-on' : ''}>
          ♥
        </span>
      ))}
    </span>
  )
}

/** abas do menu do jogo (como no Stardew): mochila, habilidades, amigos e mapas */
export const MENU_TABS = [
  ['personagem', 'cara_feliz', 'Ficha (P)'],
  ['mochila', 'i_mochila', 'Mochila (I)'],
  ['habilidades', 'i_estrela', 'Habilidades (K)'],
  ['amigos', 'i_coracao', 'Amigos (O)'],
  ['mapas', 'i_livro', 'Mapas (M)'],
]
export function MenuTabs({ tab, onTab }) {
  return (
    <div className="t2h-menutabs" role="tablist" aria-label="Menu do jogo">
      {MENU_TABS.map(([k, icon, label]) => (
        <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'is-on' : ''} onClick={() => onTab(k)} title={label}>
          <img className="t2h-pix" src={`${HUD}${icon}.png`} alt="" onError={(e) => (e.currentTarget.style.visibility = 'hidden')} />
          <span>{label.replace(/ \(.\)$/, '')}</span>
        </button>
      ))}
    </div>
  )
}

export const SEASON_ICON = { Primavera: '🌸', Verão: '☀️', Outono: '🍂', Inverno: '❄️' }

/** relógio no estilo Stardew: dia da semana, dia da estação e a hora (o mesmo para a turma toda) */
export function Clock({ g }) {
  const sun = g.hour >= 6 && g.hour < 18 ? '☀️' : g.hour >= 18 && g.hour < 20 ? '🌇' : '🌙'
  return (
    <div className="t2h-clock" title="Relógio da turma: 1 dia do jogo = 1 hora de verdade">
      <span className="t2h-clock-day">
        {g.weekday}. {g.dayOfSeason}
        <span className="t2h-clock-season">
          {SEASON_ICON[g.season]} {g.season}
        </span>
      </span>
      <span className="t2h-clock-time">
        <img className="t2h-pix" src={`${HUD}i_relogio.png`} alt="" />
        <b>{clockText(g)}</b>
        <span className="t2h-clock-sky" aria-hidden="true">
          {sun}
        </span>
      </span>
    </div>
  )
}

/** energia na ficha: barra do pacote (verde, amarela ou vermelha conforme vai acabando) */
export function Energy({ value }) {
  const pct = value / ENERGY_MAX
  const color = pct > 0.5 ? 'verde' : pct > 0.2 ? 'amarela' : 'vermelha'
  return (
    <span className={`t2h-energy${pct <= 0.2 ? ' is-low' : ''}`} title={`Energia ${value}/${ENERGY_MAX}`}>
      <Bar icon="i_raio" color={color} value={pct} label="Energia" wide />
      <b>{value}</b>
    </span>
  )
}
