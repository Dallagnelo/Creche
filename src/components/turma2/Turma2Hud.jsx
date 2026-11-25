import { useEffect, useRef, useState } from 'react'
import { atlasUrl } from '../../lib/turma2/assets'
import { composePortrait, drawPortrait } from '../../lib/turma2/character'

// Interface do jogo da Turma 2.0, feita com as peças do Modern User Interface (LimeZu):
// ficha do jogador, título do mapa, botões, mochila, lista de mapas, ajuda, conversa e avisos.
// Fica por cima do canvas; o jogo continua recebendo as setas e o clique no chão.

export const HUD = '/limezu/editor/hud/'
const SLOTS = 24

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
    composePortrait(char).then((p) => alive && (img.current = p))
    let raf = 0
    const tick = (now) => {
      const c = ref.current
      if (c) {
        const ctx = c.getContext('2d')
        ctx.imageSmoothingEnabled = false
        ctx.clearRect(0, 0, 32, 32)
        if (img.current) drawPortrait(ctx, img.current, 0, 0, now / 1000, flags.current.talking || flags.current.nod, flags.current.nod ? 1 : 0)
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

function Panel({ title, onClose, children, className = '' }) {
  return (
    <div className={`t2h-panel ${className}`} role="dialog" aria-label={title}>
      <div className="t2h-panel-head">
        <span className="t2h-title">{title}</span>
        <UiButton cell={[1, 1]} label="Fechar" hotkey="Esc" onClick={onClose} />
      </div>
      {children}
    </div>
  )
}

/** conversa com um personagem do mapa: o texto vai aparecendo; clique ou E mostra tudo */
function Dialog({ talk }) {
  const [shown, setShown] = useState(0)
  const full = talk.fala
  useEffect(() => {
    setShown(0)
    const t = setInterval(() => setShown((n) => (n >= full.length ? n : n + 1)), 28)
    return () => clearInterval(t)
  }, [talk.id, full])
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
      {talk.c && !talk.c.pronto && (
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

export default function Turma2Hud({ stageRef, lib, name, character, mapName, maps, code, onPickMap, outdoor, sky, onSky, grid, onGrid, talk, save, toast, onDrop, onResetSave }) {
  const [panel, setPanel] = useState(null) // mochila | mapas | ajuda
  const [pick, setPick] = useState(null) // item escolhido na mochila
  const [full, setFull] = useState(false)
  const nod = !!toast

  useEffect(() => {
    const onFs = () => setFull(document.fullscreenElement === stageRef.current?.parentElement)
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [stageRef])

  const toggleFull = () => {
    const el = stageRef.current?.parentElement
    if (!el) return
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
    const el = stageRef.current?.parentElement
    if (!el) return undefined
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      const k = e.key.toLowerCase()
      if (k === 'i' || k === 'b') open('mochila')
      else if (k === 'm') open('mapas')
      else if (k === 'h' || k === '?') open('ajuda')
      else if (k === 'g') onGrid(!grid)
      else if (k === 'f') toggleFull()
      else if (k === 't' && outdoor) cycleSky()
      else if (e.key === 'Escape' && panel) close()
    }
    el.addEventListener('keydown', onKey)
    return () => el.removeEventListener('keydown', onKey)
  })

  const items = save.inv
  const chosen = items.find((it) => it.key === pick) ?? null

  return (
    <div className="t2h">
      {/* ficha do jogador */}
      <div className="t2h-card t2h-me">
        <div className="t2h-me-face">
          <Face char={character} size={56} nod={nod} />
        </div>
        <div className="t2h-me-info">
          <strong>{name}</strong>
          <span className="t2h-dark" title="Moedas">
            <img className="t2h-pix" src={`${HUD}i_moeda.png`} alt="" />
            {save.moedas}
          </span>
        </div>
      </div>

      {/* título do mapa */}
      <div className="t2h-top">
        <span className="t2h-title t2h-mapname">{mapName}</span>
        {outdoor && (
          <button type="button" className="t2h-dark t2h-sky" onClick={cycleSky} title="Mudar a hora (T)">
            {SKY[sky][0]} {SKY[sky][1]}
          </button>
        )}
      </div>

      {/* botões */}
      <div className="t2h-buttons" role="toolbar" aria-label="Menu do jogo">
        <UiButton icon="i_mochila" label="Mochila" hotkey="I" pressed={panel === 'mochila'} onClick={() => open('mochila')} />
        <UiButton cell={[7, 0]} label="Mapas" hotkey="M" pressed={panel === 'mapas'} onClick={() => open('mapas')} />
        <UiButton cell={[2, 0]} label="Onde dá para andar" hotkey="G" pressed={grid} onClick={() => onGrid(!grid)} />
        <UiButton cell={[full ? 6 : 7, 1]} label={full ? 'Sair da tela cheia' : 'Tela cheia'} hotkey="F" pressed={full} onClick={toggleFull} />
        <UiButton cell={[1, 3]} label="Ajuda" hotkey="H" pressed={panel === 'ajuda'} onClick={() => open('ajuda')} />
      </div>

      {toast && (
        <div className="t2h-toast t2h-card" key={toast.at} role="status">
          <ItemIcon lib={lib} item={toast.item} size={32} />
          <span>
            {toast.item.tipo === 'moeda' ? `+${toast.item.valor || 1} moeda${(toast.item.valor || 1) > 1 ? 's' : ''}` : `Pegou: ${toast.item.nome || 'item'}`}
          </span>
        </div>
      )}

      {talk && !panel && <Dialog talk={talk} />}

      {panel === 'mochila' && (
        <Panel title="Mochila" onClose={close} className="t2h-bag">
          <div className="t2h-bag-body">
            <div className="t2h-slots">
              {Array.from({ length: Math.max(SLOTS, Math.ceil(items.length / 6) * 6) }, (_, i) => {
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
              <span className="t2h-dark t2h-coins">
                <img className="t2h-pix" src={`${HUD}i_moeda.png`} alt="" />
                {save.moedas} moedas
              </span>
            </div>
          </div>
        </Panel>
      )}

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
          <p className="t2h-muted">Suas moedas e sua mochila ficam guardadas neste navegador.</p>
          <button
            type="button"
            className="t2h-text-btn"
            onClick={() => {
              if (window.confirm('Zerar moedas, mochila e tudo que você já pegou nos mapas?')) onResetSave()
            }}
          >
            Recomeçar do zero
          </button>
        </Panel>
      )}
    </div>
  )
}
