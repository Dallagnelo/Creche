import { useEffect, useRef, useState } from 'react'
import { totalLevel } from '../../lib/turma2/skills'
import Turma2Activity from './Turma2Activity'
import { gameTime } from '../../lib/turma2/clock'
import { HEART, energyOf, hearts } from '../../lib/turma2/economy'
import { HOT_SLOTS, setHot } from '../../lib/turma2/save'
import { EMOTES, EMOTES_URL } from '../../lib/turma2/social'
import { HUD_DEFAULT, HUD_PATH, POSITIONS, normalizeHud } from '../../lib/turma2/hudConfig'
import { Panel, MenuTabs, UiButton, Face, Energy, ItemIcon, Clock, Dialog, Hearts } from './hud/HudBits'
import { SkillsPanel } from './hud/SkillsPanel'
import { CharSheet } from './hud/CharSheet'

// Interface do jogo da Turma 2.0, feita com as peças do Modern User Interface (LimeZu):
// ficha do jogador, título do mapa, botões, mochila, lista de mapas, ajuda, conversa e avisos.
// Fica por cima do canvas; o jogo continua recebendo as setas e o clique no chão.

export const HUD = HUD_PATH

/** tecla de cada espaço da barra rápida: 1 a 9 e 0 (os dois últimos só com o mouse, o toque ou a roda) */
const hotKey = (i) => (i < 9 ? String(i + 1) : i === 9 ? '0' : '')

const fmtTime = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// skillsCfg: as habilidades (lib/turma2/skills.js); act: o que dá para fazer onde o boneco está (E faz);
// job: a atividade aberta (minijogo, loja…); notes: avisos de XP e de nível novo
export default function Turma2Hud({ stageRef, lib, name, character, mapName, maps, code, onPickMap, outdoor, sky, onSky, grid, onGrid, talk, save, toast, onDrop, onSave, onResetSave, config = HUD_DEFAULT, preview = false, skillsCfg = null, act = null, onAct = null, job = null, onJobResult = null, onJobClose = null, notes = [], onWear = null, chat = [], onSay = null, onEmote = null, people = [] }) {
  const cfg = normalizeHud(config)
  const [panel, setPanel] = useState(null) // mochila | mapas | ajuda
  const [pick, setPick] = useState(null) // item escolhido na mochila
  const [typing, setTyping] = useState(false) // escrevendo no chat (Enter)
  const [emotes, setEmotes] = useState(false) // escolhendo um emote (Q)
  const [drag, setDrag] = useState(null) // arrastando um item na mochila: { key, from: 'bag' | número do espaço da barra }
  const [realFull, setFull] = useState(false)
  // celular: o iPhone não deixa pôr a página em tela cheia, então o jogo cobre a tela por conta própria
  // (começa assim no celular; o botão "Sair da tela cheia" volta para a página)
  const phone = () => typeof window !== 'undefined' && window.matchMedia?.('(max-width: 900px) and (pointer: coarse), (max-height: 520px) and (pointer: coarse)').matches
  const [cover, setCover] = useState(() => !preview && phone())
  const full = realFull || cover
  const [menuOpen, setMenuOpen] = useState(false) // celular: os botões ficam guardados num botão só
  useEffect(() => {
    const el = stageRef.current?.parentElement
    if (!el || preview) return undefined
    el.classList.toggle('is-cover', cover)
    document.documentElement.classList.toggle('t2-cover', cover)
    return () => {
      el.classList.remove('is-cover')
      document.documentElement.classList.remove('t2-cover')
    }
  }, [cover, stageRef, preview])
  const nod = !!toast
  const slots = HOT_SLOTS // 12, como no Stardew (teclas 1 a 9 e 0)
  const hot = Array.from({ length: slots }, (_, i) => save.hot?.[i] ?? null)
  const sel = Math.min(save.sel ?? 0, slots - 1)
  const hotRef = useRef(null)
  // no celular a barra rola de lado: o espaço escolhido fica sempre à vista
  useEffect(() => {
    const bar = hotRef.current
    const el = bar?.querySelector('.t2h-slot.is-on')
    if (!el || bar.scrollWidth <= bar.clientWidth) return
    const left = el.offsetLeft // a barra é position: relative
    if (left < bar.scrollLeft) bar.scrollLeft = left - 4
    else if (left + el.offsetWidth > bar.scrollLeft + bar.clientWidth) bar.scrollLeft = left + el.offsetWidth - bar.clientWidth + 4
  }, [sel])
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
    if (cover) setCover(false)
    else if (document.fullscreenElement) document.exitFullscreen?.()
    else if (phone() || !el.requestFullscreen) setCover(true)
    else el.requestFullscreen().catch(() => setCover(true))
    setMenuOpen(false)
  }
  // relógio da turma (atualiza a cada segundo)
  const [g, setG] = useState(() => gameTime())
  useEffect(() => {
    const t = setInterval(() => setG(gameTime()), 1000)
    return () => clearInterval(t)
  }, [])
  // ao fechar uma janela o foco volta para o jogo (as setas e os atalhos continuam funcionando)
  const close = () => {
    setPanel(null)
    stageRef.current?.focus({ preventScroll: true })
  }
  const open = (p) => {
    setMenuOpen(false)
    return panel === p ? close() : setPanel(p)
  }

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
      else if (k === 'k' && skillsCfg) open('habilidades')
      else if (k === 'e' && act && !act.off && onAct && !panel) {
        e.preventDefault()
        onAct(act)
      }
      else if (cfg.barra.mostrar && /^[0-9]$/.test(e.key)) selectHot(e.key === '0' ? 9 : Number(e.key) - 1)
      else if (e.key === 'Enter' && onSay && !panel) {
        e.preventDefault()
        setTyping(true)
      } else if (k === 'q' && onEmote) setEmotes((v) => !v)
      else if (k === 'o') open('amigos')
      else if (k === 'p') open('personagem')
      else if (e.key === 'Escape' && panel) close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const items = save.inv
  // o que está na barra rápida aparece só lá (antes aparecia duas vezes, parecia item repetido)
  const bagItems = items.filter((it) => !hot.includes(it.key))
  const chosen = items.find((it) => it.key === pick) ?? null
  const f = cfg.ficha
  const level = skillsCfg ? totalLevel(save, skillsCfg) : 1
  const [clock, setClock] = useState(Date.now())
  useEffect(() => {
    if (!save.entrega) return undefined
    const t = setInterval(() => setClock(Date.now()), 500)
    return () => clearInterval(t)
  }, [save.entrega])

  const blocks = {
    // cartão do jogador: rosto, nível, nome, moedas e energia; o rosto abre a Ficha do personagem (com os status)
    ficha: (
      <div key="ficha" className="t2h-card t2h-me">
        <div className="t2h-me-row">
          <button type="button" className="t2h-me-face" onClick={() => open('personagem')} title="Ficha do personagem (P)">
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
            {f.moedas && (
              <span className="t2h-dark t2h-chip" title="Moedas">
                <img className="t2h-pix t2h-coin" src={`${HUD}i_moeda_p.png`} alt="" />
                {save.moedas}
              </span>
            )}
          </div>
        </div>
        {skillsCfg && <Energy value={energyOf(save, g.day)} />}
      </div>
    ),
    titulo: (
      <div key="titulo" className="t2h-top">
        <span className="t2h-mapname">{mapName}</span>
      </div>
    ),
    botoes: (
      <div key="botoes" className={`t2h-buttons${menuOpen ? ' is-open' : ''}`} role="toolbar" aria-label="Menu do jogo">
        <button type="button" className="t2h-btn t2h-menubtn" style={{ '--bx': '144px', '--by': '0px' }} aria-expanded={menuOpen} aria-label={menuOpen ? 'Fechar o menu' : 'Abrir o menu'} onClick={() => setMenuOpen((v) => !v)}>
          <span aria-hidden="true">{menuOpen ? '✕' : '☰'}</span>
        </button>
        {cfg.botoes.mochila && <UiButton icon="i_mochila" label="Mochila" hotkey="I" pressed={panel === 'mochila'} onClick={() => open('mochila')} />}
        {cfg.botoes.habilidades && skillsCfg && <UiButton icon="i_estrela" label="Habilidades" hotkey="K" pressed={panel === 'habilidades'} onClick={() => open('habilidades')} />}
        {cfg.botoes.amigos && <UiButton icon="i_coracao" label="Amigos" hotkey="O" pressed={panel === 'amigos'} onClick={() => open('amigos')} />}
        {cfg.botoes.mapas && <UiButton cell={[6, 0]} label="Mapas" hotkey="M" pressed={panel === 'mapas'} onClick={() => open('mapas')} />}
        {cfg.botoes.grade && <UiButton cell={[2, 0]} className="t2h-only-pc" label="Onde dá para andar" hotkey="G" pressed={grid} onClick={() => onGrid(!grid)} />}
        {cfg.botoes.tela && <UiButton icon="i_cheia" label={full ? 'Sair da tela cheia' : 'Tela cheia'} hotkey="F" pressed={full} onClick={toggleFull} />}
        {cfg.botoes.ajuda && <UiButton cell={[1, 3]} label="Ajuda" hotkey="H" pressed={panel === 'ajuda'} onClick={() => open('ajuda')} />}
      </div>
    ),
    // barra rápida: números escolhem; dois cliques tiram o item do espaço
    barra: (
      <div key="barra" ref={hotRef} className="t2h-hotbar" role="toolbar" aria-label="Barra rápida" onWheel={(e) => selectHot(sel + (e.deltaY > 0 ? 1 : -1))}>
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
              <span className="t2h-hotnum">{hotKey(i)}</span>
              {i === sel && <span className="t2h-selbox" aria-hidden="true" />}
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

      <Clock g={g} />

      {/* chat da turma (Enter) e emotes (Q) */}
      {onSay && (
        <div className="t2h-chat">
          {!typing && !panel && !job && (
            <span className="t2h-chatbtns">
              <UiButton cell={[3, 2]} label="Falar no chat" hotkey="Enter" onClick={() => !panel && setTyping(true)} />
              {onEmote && <UiButton icon="i_sorriso" label="Emotes" hotkey="Q" pressed={emotes} onClick={() => setEmotes((v) => !v)} />}
            </span>
          )}
          {chat
            .filter((m) => typing || Date.now() - m.at < 12000)
            .map((m) => (
              <span key={m.key} className={`t2h-chatline${m.eu ? ' is-me' : ''}`}>
                <b>{m.nome}:</b> {m.texto}
              </span>
            ))}
          {typing && (
            <form
              className="t2h-chatform"
              onSubmit={(e) => {
                e.preventDefault()
                const v = e.currentTarget.elements.msg.value
                if (v.trim()) onSay(v)
                setTyping(false)
                stageRef.current?.focus({ preventScroll: true })
              }}
            >
              <input
                name="msg"
                autoFocus
                maxLength={120}
                placeholder="Fale com a turma (Enter envia, Esc cancela)"
                autoComplete="off"
                onKeyDown={(e) => {
                  e.stopPropagation()
                  if (e.key === 'Escape') {
                    setTyping(false)
                    stageRef.current?.focus({ preventScroll: true })
                  }
                }}
              />
            </form>
          )}
        </div>
      )}
      {emotes && onEmote && (
        <div className="t2h-card t2h-emotes" role="menu" aria-label="Emotes">
          {EMOTES.map((em) => (
            <button
              key={em.id}
              type="button"
              title={em.nome}
              aria-label={em.nome}
              onClick={() => {
                onEmote(em.id)
                setEmotes(false)
                stageRef.current?.focus({ preventScroll: true })
              }}
              style={{ backgroundImage: `url(${EMOTES_URL})`, backgroundPosition: `-${em.x * 32}px -${em.y * 32}px` }}
            />
          ))}
        </div>
      )}

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
        <Panel title="Mochila" onClose={close} className="t2h-bag t2h-menu">
          <MenuTabs tab="mochila" onTab={open} />
          <div className="t2h-bag-body">
            <div>
              {/* a fileira de cima é a barra rápida (arraste itens para cá; arraste de volta para tirar) */}
              <span className="t2h-bag-label">Barra rápida</span>
              <div className="t2h-slots t2h-slots-hot" style={{ '--cols': slots }}>
                {hot.map((k, i) => {
                  const it = k && save.inv.find((x) => x.key === k)
                  return (
                    <button
                      key={`h${i}`}
                      type="button"
                      className={`t2h-slot${i === sel ? ' is-sel' : ''}${it && it.key === pick ? ' is-on' : ''}`}
                      draggable={!!it}
                      onDragStart={() => it && setDrag({ key: it.key, from: i })}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (drag) onSave((sv) => setHot(sv, i, drag.key))
                        setDrag(null)
                      }}
                      onClick={() => (it ? setPick(it.key) : selectHot(i))}
                      aria-label={`Barra ${i + 1}: ${it ? it.nome : 'vazio'}`}
                    >
                      <span className="t2h-hotnum">{hotKey(i)}</span>
                      {it && <ItemIcon lib={lib} item={it} size={34} />}
                      {it?.qtd > 1 && <span className="t2h-qtd">{it.qtd}</span>}
                    </button>
                  )
                })}
              </div>
              <span className="t2h-bag-label">Guardado na mochila</span>
              <div
                className="t2h-slots"
                style={{ '--cols': slots }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (drag && typeof drag.from === 'number') onSave((sv) => setHot(sv, drag.from, null))
                  setDrag(null)
                }}
              >
                {Array.from({ length: Math.max(24, Math.ceil(bagItems.length / slots) * slots) }, (_, i) => {
                  const it = bagItems[i]
                  return (
                    <button
                      key={it?.key ?? `vazio-${i}`}
                      type="button"
                      className={`t2h-slot${it && it.key === pick ? ' is-on' : ''}${it && hot.includes(it.key) ? ' is-hot' : ''}`}
                      draggable={!!it}
                      onDragStart={() => it && setDrag({ key: it.key, from: 'bag' })}
                      onClick={() => it && setPick(it.key)}
                      aria-label={it ? `${it.nome} (${it.qtd})` : 'Vazio'}
                    >
                      {it && <ItemIcon lib={lib} item={it} size={34} />}
                      {it?.qtd > 1 && <span className="t2h-qtd">{it.qtd}</span>}
                    </button>
                  )
                })}
              </div>
              <p className="t2h-muted t2h-bag-tip">Arraste um item para a barra rápida (teclas 1 a 0); arraste de volta para guardar.</p>
            </div>
            <div className="t2h-card t2h-detail">
              {chosen ? (
                <>
                  <div className="t2h-detail-icon">
                    <ItemIcon lib={lib} item={chosen} size={64} />
                  </div>
                  <strong>{chosen.nome}</strong>
                  <span className="t2h-dark t2h-chip t2h-qtdchip">× {chosen.qtd}</span>
                  {chosen.desc && <p>{chosen.desc}</p>}
                  {hot.includes(chosen.key) ? (
                    <button type="button" className="t2h-text-btn" onClick={() => onSave((sv) => setHot(sv, hot.indexOf(chosen.key), null))}>
                      Tirar da barra ({hot.indexOf(chosen.key) + 1})
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="t2h-text-btn is-ok"
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
                    className="t2h-text-btn is-bad"
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
                  <span className="t2h-muted">{items.length ? 'Escolha um item para ver.' : 'Vazia por enquanto.'}</span>
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

      {panel === 'habilidades' && skillsCfg && <SkillsPanel cfg={skillsCfg} save={save} lib={lib} character={character} onWear={onWear} onClose={close} onTab={open} />}

      {panel === 'personagem' && (
        <CharSheet name={name} character={character} save={save} cfg={cfg} skillsCfg={skillsCfg} g={g} onTab={open} onClose={close} onHelp={() => setPanel('ajuda')} onFull={preview ? null : toggleFull} full={full} />
      )}

      {panel === 'amigos' && (
        <Panel title="Amigos" onClose={close} className="t2h-friends t2h-menu">
          <MenuTabs tab="amigos" onTab={open} />
          <p className="t2h-muted">Converse todo dia (E perto da pessoa) e dê presentes: escolha o item na barra e aperte E conversando. Cada {HEART} pontos = 1 coração.</p>
          <ul className="t2h-friendlist">
            {[...new Map([...people.map((p) => [p.id, p]), ...Object.entries(save.amigos ?? {}).map(([id, a]) => [id, { id, nome: a.nome ?? id, ...people.find((p) => p.id === id) }])]).values()].map((p) => {
              const a = save.amigos?.[p.id] ?? {}
              return (
                <li key={p.id} className="t2h-card t2h-friend">
                  {p.c && !p.c.pronto ? <Face char={p.c} size={44} /> : <img className="t2h-pix" src={`${HUD}i_coracao.png`} alt="" style={{ width: 32, height: 32 }} />}
                  <span className="t2h-friend-main">
                    <b>{p.nome}</b>
                    <Hearts n={hearts(a.pts)} />
                  </span>
                  <span className="t2h-muted">{a.pts ?? 0} pts</span>
                </li>
              )
            })}
          </ul>
        </Panel>
      )}

      {panel === 'mapas' && (
        <Panel title="Mapas" onClose={close} className="t2h-maps t2h-menu">
          <MenuTabs tab="mapas" onTab={open} />
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
            <li><kbd>Setas</kbd> ou <kbd>WASD</kbd> andam · <kbd>Shift</kbd> corre · clique no chão para ir até lá</li>
            <li>Chegue perto de alguém para conversar · <kbd>E</kbd> mostra a fala inteira</li>
            <li>Passe por cima do que brilha para pegar (moedas e itens)</li>
            {cfg.barra.mostrar && (
              <li>
                <kbd>1</kbd> a <kbd>0</kbd>, a roda do mouse ou um toque escolhem o espaço da barra rápida
              </li>
            )}
            {cfg.ficha.mostrar && (
              <li>
                Clique no seu rosto (ou <kbd>P</kbd>) para abrir a ficha do personagem
              </li>
            )}
            {skillsCfg && (
              <>
                <li>
                  <kbd>1</kbd>…<kbd>0</kbd> escolhe o item da barra; <kbd>Espaço</kbd> ou <kbd>C</kbd> (ou clique perto de você) usa no quadradinho da frente: enxada ara a horta, regador rega, semente planta, vara pesca na água e comida enche a energia
                </li>
                <li>
                  <kbd>E</kbd> conversa e faz as coisas do lugar: colher (horta e árvores), caixa de venda (paga de manhã), loja, cozinhar, bichos (dar feno, coletar ovo e leite, carinho), dar presente (item escolhido na barra), cama para dormir, baú, entregas, consertos e, à noite, fantasmas
                </li>
                <li>
                  O relógio é o mesmo para a turma toda: 1 dia do jogo = 1 hora de verdade. Planta regada cresce um dia por dia; a energia enche de novo de manhã
                </li>
                <li>
                  <kbd>K</kbd> mostra suas habilidades: cada uma sobe fazendo a atividade e libera passivas a cada 10 níveis
                </li>
              </>
            )}
            <li><kbd>P</kbd> personagem · <kbd>I</kbd> mochila · <kbd>O</kbd> amigos · <kbd>M</kbd> mapas · <kbd>G</kbd> onde dá para andar</li>
            {onSay && (
              <li>
                <kbd>Enter</kbd> (ou o botão do envelope) fala no chat, num balão em cima de você · <kbd>Q</kbd> (ou a carinha) emotes
              </li>
            )}
            <li>
              <kbd>F</kbd> tela cheia · <kbd>Esc</kbd> fecha janelas
            </li>
          </ul>
          <p className="t2h-muted">Seu progresso fica guardado na sua conta.</p>
          <button
            type="button"
            className="t2h-text-btn is-bad"
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
