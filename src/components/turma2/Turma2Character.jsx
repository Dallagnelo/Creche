import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { loadImage } from '../../lib/turma2/assets'
import { DEFAULT_CHAR, LAYERS, composeChar, composePortrait, drawChar, drawPortrait, groups, loadCharLib, normalizeChar, partRect, randomChar, styleOf } from '../../lib/turma2/character'
import { CLASSES_CODE, STAGES, applyClass, classOf, normalizeClasses, stageLook, stageOf, BONUS } from '../../lib/turma2/classes'
import { HUD_CODE, HUD_PATH as HUD, normalizeHud } from '../../lib/turma2/hudConfig'
import { listMaps, saveMyChar } from '../../services/turma2Maps'

// Criador de personagem da Turma 2.0: empilha corpo, olhos, roupa, cabelo e acessório do pacote.
// CharacterPicker é usado aqui ("Meu personagem") e no editor de mapas (visual dos NPCs).

const TABS = [
  ['corpo', 'Pele'],
  ['olhos', 'Olhos'],
  ['roupa', 'Roupa'],
  ['cabelo', 'Cabelo'],
  ['acessorio', 'Acessório'],
  ['pronto', 'Prontos'],
]
const VIEWS = [
  ['down', 'Frente'],
  ['right', 'Direita'],
  ['up', 'Costas'],
  ['left', 'Esquerda'],
]
const OPTIONAL = new Set(['cabelo', 'acessorio', 'roupa'])
const ACC_NAMES = {
  ladybug: 'Joaninha', bee: 'Abelha', backpack: 'Mochila', snapback: 'Boné', dino_snapback: 'Boné de dino', policeman_hat: 'Quepe',
  bataclava: 'Balaclava', detective_hat: 'Chapéu de detetive', zombie_brain: 'Cérebro de zumbi', bolt: 'Raio', beanie: 'Gorro',
  mustache: 'Bigode', beard: 'Barba', gloves: 'Luvas', glasses: 'Óculos', monocle: 'Monóculo', medical_mask: 'Máscara',
  chef: 'Chapéu de chef', party_cone: 'Chapéu de festa',
}
const label = (cat, style) => {
  if (cat === 'acessorio') {
    const k = style.replace(/^accessory_\d+_/, '')
    return ACC_NAMES[k] ?? k.replace(/_/g, ' ')
  }
  const n = Number(style.match(/(\d+)$/)?.[1] ?? 0)
  return `${cat === 'roupa' ? 'Roupa' : cat === 'cabelo' ? 'Cabelo' : cat === 'corpo' ? 'Pele' : cat === 'olhos' ? 'Olhos' : 'Pronto'} ${n}`
}

/** um quadro do personagem, de frente, desenhado direto das peças (rápido, para as listas) */
export function CharThumb({ lib, char, scale = 3, dir = 'down' }) {
  const ref = useRef(null)
  const key = JSON.stringify(char)
  useEffect(() => {
    if (!lib || !char) return undefined
    let alive = true
    const c = char.pronto ? [['pronto', char.pronto]] : LAYERS.map((k) => [k, char[k]]).filter(([, v]) => v)
    const rects = c.map(([cat, n]) => partRect(lib, cat, n)).filter(Boolean)
    Promise.all(rects.map((r) => loadImage(r.url))).then((imgs) => {
      if (!alive || !ref.current) return
      const ctx = ref.current.getContext('2d')
      ctx.clearRect(0, 0, 16, 32)
      const col = { right: 0, up: 1, left: 2, down: 3 }[dir] * 6
      rects.forEach((r, i) => ctx.drawImage(imgs[i], r.x + col * 16, r.y, 16, 32, 0, 0, 16, 32))
    })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lib, key, dir])
  return <canvas ref={ref} width={16} height={32} className="t2c-thumb" style={{ width: 16 * scale, height: 32 * scale }} />
}

/** prévia animada grande (e o rosto falando, do Modern User Interface) */
function Preview({ char, dir, pose }) {
  const ref = useRef(null)
  const faceRef = useRef(null)
  const imgRef = useRef(null)
  const faceImg = useRef(null)
  const key = JSON.stringify(char)
  useEffect(() => {
    let alive = true
    composeChar(char).then((img) => alive && (imgRef.current = img))
    faceImg.current = null
    composePortrait(char).then((img) => alive && (faceImg.current = img))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  useEffect(() => {
    let raf = 0
    const tick = (now) => {
      const c = ref.current
      if (c && imgRef.current) {
        const ctx = c.getContext('2d')
        ctx.imageSmoothingEnabled = false
        ctx.clearRect(0, 0, c.width, c.height)
        ctx.save()
        ctx.scale(6, 6)
        drawChar(ctx, imgRef.current, pose, dir, now / 1000, 4, 2)
        ctx.restore()
      }
      const f = faceRef.current
      if (f) {
        const fx = f.getContext('2d')
        fx.imageSmoothingEnabled = false
        fx.clearRect(0, 0, f.width, f.height)
        f.hidden = !faceImg.current
        // fala por 2 s, concorda, fala de novo, nega…
        const t = now / 1000
        const cycle = t % 6
        if (faceImg.current) drawPortrait(fx, faceImg.current, 0, 0, t, true, cycle < 3 ? 0 : cycle < 4.5 ? 1 : 2, 96)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [dir, pose])
  return (
    <div className="t2c-stage">
      <canvas ref={ref} width={24 * 6} height={36 * 6} className="t2c-preview" aria-label="Prévia do personagem" />
      <canvas ref={faceRef} width={96} height={96} className="t2c-face" aria-label="Rosto do personagem" />
    </div>
  )
}

// lockTabs: partes que a classe decide (uniforme), escondidas aqui
export function CharacterPicker({ value, onChange, allowPremade = true, lockTabs = [], lockNote = '', startTab = 'cabelo' }) {
  const [lib, setLib] = useState(null)
  const [tab, setTab] = useState(startTab)
  const [dir, setDir] = useState('down')
  const [pose, setPose] = useState('anda')
  const lockKey = lockTabs.join()
  useEffect(() => {
    if (lockTabs.includes(tab) || (!allowPremade && tab === 'pronto')) setTab('cabelo')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockKey, allowPremade, tab])
  useEffect(() => {
    let alive = true
    loadCharLib().then((l) => alive && setLib(l))
    return () => {
      alive = false
    }
  }, [])
  const char = useMemo(() => normalizeChar(value, lib) ?? DEFAULT_CHAR, [value, lib])
  const built = char.pronto ? DEFAULT_CHAR : char // as abas de peças partem de um personagem montado
  // pele e olhos: cada peça é uma opção; roupa, cabelo e acessório: estilos, e as cores de cada um embaixo
  const flat = tab === 'corpo' || tab === 'olhos'
  const grouped = useMemo(() => {
    if (!lib || tab === 'pronto') return null
    return flat ? new Map(lib.cats[tab].parts.map((n) => [n, [n]])) : groups(lib, tab)
  }, [lib, tab, flat])
  if (!lib) return <p className="muted">Carregando as peças…</p>

  const set = (cat, name) => onChange(cat === 'pronto' ? { pronto: name } : { ...built, [cat]: name })
  const current = char.pronto ? null : char[tab]
  const currentStyle = current ? (flat ? current : styleOf(current)) : null
  // mesma "cor" (número final) ao trocar de estilo, quando existir
  const sameColor = (style, list) => {
    const suffix = current?.match(/_(\d+)$/)?.[1]
    return list.find((n) => n.endsWith(`_${suffix}`)) ?? list[0]
  }
  const tabs = TABS.filter(([k]) => (allowPremade || k !== 'pronto') && !lockTabs.includes(k))

  return (
    <div className="t2c">
      <div className="t2c-side">
        <Preview char={char} dir={dir} pose={pose} />
        <div className="t2c-row" role="group" aria-label="Virar">
          {VIEWS.map(([k, l]) => (
            <button key={k} type="button" className={dir === k ? 'is-on' : ''} aria-pressed={dir === k} onClick={() => setDir(k)}>
              {l}
            </button>
          ))}
        </div>
        <div className="t2c-row" role="group" aria-label="Pose">
          {[
            ['parado', 'Parado'],
            ['anda', 'Andando'],
            ['senta', 'Sentado'],
            ['celular', 'Celular'],
          ].map(([k, l]) => (
            <button key={k} type="button" className={pose === k ? 'is-on' : ''} aria-pressed={pose === k} onClick={() => setPose(k)}>
              {l}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-ghost" onClick={() => onChange(randomChar(lib))}>
          🎲 Aleatório
        </button>
      </div>
      <div className="t2c-main">
        <div className="t2c-tabs" role="tablist" aria-label="Partes">
          {tabs.map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'is-on' : ''} onClick={() => setTab(k)}>
              {l}
            </button>
          ))}
        </div>
        {lockNote && <p className="muted t2e-tip">{lockNote}</p>}
        {tab === 'pronto' ? (
          <div className="t2c-grid">
            {lib.cats.pronto.parts.map((n) => (
              <button key={n} type="button" className={char.pronto === n ? 'is-on' : ''} title={label('pronto', n)} onClick={() => set('pronto', n)}>
                <CharThumb lib={lib} char={{ pronto: n }} />
              </button>
            ))}
          </div>
        ) : (
          <>
            <div className="t2c-grid">
              {OPTIONAL.has(tab) && (
                <button type="button" className={!current ? 'is-on' : ''} title="Nenhum" onClick={() => set(tab, null)}>
                  <CharThumb lib={lib} char={{ ...built, [tab]: null }} />
                  <small>Nenhum</small>
                </button>
              )}
              {[...grouped].map(([style, list]) => {
                const pick = flat ? list[0] : style === currentStyle ? current : sameColor(style, list)
                return (
                  <button key={style} type="button" className={style === currentStyle ? 'is-on' : ''} title={label(tab, style)} onClick={() => set(tab, pick)}>
                    <CharThumb lib={lib} char={{ ...built, [tab]: pick }} />
                    {tab === 'acessorio' && <small>{label(tab, style)}</small>}
                  </button>
                )
              })}
            </div>
            {currentStyle && grouped.get(currentStyle)?.length > 1 && (
              <>
                <p className="t2c-sub">Cores</p>
                <div className="t2c-grid t2c-colors">
                  {grouped.get(currentStyle).map((n) => (
                    <button key={n} type="button" className={current === n ? 'is-on' : ''} title={n} onClick={() => set(tab, n)}>
                      <CharThumb lib={lib} char={{ ...built, [tab]: n }} scale={2} />
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

/** escolha da classe e da evolução (dentro do "Meu personagem") */
function ClassChooser({ lib, classes, level, isAdmin, char, onPick }) {
  const cls = classOf(char, classes)
  const stage = stageOf(char)
  const canEvolve = level >= classes.nivelEvolucao || isAdmin
  return (
    <section className="t2c-class">
      <h3>Classe</h3>
      <div className="t2c-classes">
        <button type="button" className={`t2c-classbtn${!cls ? ' is-on' : ''}`} onClick={() => onPick(null, null)}>
          <span className="t2c-classfig t2c-none">—</span>
          <strong>Sem classe</strong>
          <small>Só o visual</small>
        </button>
        {classes.classes.map((c) => (
          <button key={c.id} type="button" className={`t2c-classbtn${cls?.id === c.id ? ' is-on' : ''}`} style={{ '--cls': c.cor }} onClick={() => onPick(c.id, null)}>
            <span className="t2c-classfig">
              <CharThumb lib={lib} char={stageLook(c, 'base', char)} scale={2} />
            </span>
            <strong>
              <img className="t2h-pix" src={`${HUD}${c.icone}.png`} alt="" /> {c.nome}
            </strong>
            <small>{c.papel}</small>
          </button>
        ))}
      </div>
      {cls && (
        <div className="t2c-classinfo" style={{ '--cls': cls.cor }}>
          <p>{cls.desc}</p>
          <div className="t2c-chips">
            {BONUS.filter(([k]) => cls.bonus[k]).map(([k, label, unit]) => (
              <span key={k} className="t2c-chip">
                {label} {cls.bonus[k] > 0 ? '+' : ''}
                {cls.bonus[k]} {unit.replace(/^% /, '% ').replace(' a mais', '')}
              </span>
            ))}
          </div>
          <div className="t2c-evos">
            {STAGES.map(([key, label]) => {
              const st = cls[key]
              const locked = key !== 'base' && !canEvolve
              return (
                <button
                  key={key}
                  type="button"
                  className={`t2c-evo${stage === key ? ' is-on' : ''}`}
                  disabled={locked}
                  onClick={() => onPick(cls.id, key === 'base' ? null : key)}
                  title={locked ? `Libera no nível ${classes.nivelEvolucao}` : st.nome}
                >
                  <CharThumb lib={lib} char={stageLook(cls, key, char)} scale={3} />
                  <small>{label}</small>
                  <strong>{st.nome}</strong>
                  {locked ? <em>🔒 nível {classes.nivelEvolucao}</em> : <span className="t2c-evodesc">{st.desc}</span>}
                  {st.habilidades.length > 0 && (
                    <ul>
                      {st.habilidades.map((h, i) => (
                        <li key={i} title={h.desc}>
                          {h.nome}
                        </li>
                      ))}
                    </ul>
                  )}
                </button>
              )
            })}
          </div>
          {isAdmin && level < classes.nivelEvolucao && <p className="muted t2e-tip">Como admin você pode testar as evoluções antes do nível {classes.nivelEvolucao}.</p>}
        </div>
      )}
    </section>
  )
}

/** aba "Meu personagem": classe + visual, salvo no perfil */
export default function MyCharacter({ onSaved }) {
  const { user, profile, refreshProfile, isAdmin } = useAuth()
  const saved = profile?.turma2_char ?? null
  const [char, setChar] = useState(saved ?? DEFAULT_CHAR)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [classes, setClasses] = useState(null)
  const [level, setLevel] = useState(1)
  const [lib, setLib] = useState(null)
  useEffect(() => {
    let alive = true
    listMaps()
      .then((list) => {
        if (!alive) return
        setClasses(normalizeClasses(list.find((r) => r.code === CLASSES_CODE)?.data))
        setLevel(normalizeHud(list.find((r) => r.code === HUD_CODE)?.data).ficha.nivelValor)
      })
      .catch(() => setClasses(normalizeClasses(null)))
    loadCharLib().then((l) => alive && setLib(l))
    return () => {
      alive = false
    }
  }, [])
  const cls = classOf(char, classes)
  const changed = JSON.stringify(char) !== JSON.stringify(saved)
  const save = async () => {
    setBusy(true)
    setStatus('')
    try {
      await saveMyChar(user.id, char)
      await refreshProfile()
      setStatus('Salvo! Já é você andando pelos mapas.')
      onSaved?.()
    } catch (e) {
      setStatus(e.message)
    } finally {
      setBusy(false)
    }
  }
  const pick = (classe, evo) => {
    const base = char.pronto ? DEFAULT_CHAR : char
    const { classe: _c, evo: _e, ...rest } = base
    setChar(classe ? { ...rest, classe, evo } : rest)
  }
  const locked = cls?.uniforme ? ['roupa', 'acessorio'] : []
  return (
    <div className="t2c-page">
      {classes && <ClassChooser lib={lib} classes={classes} level={level} isAdmin={isAdmin} char={char} onPick={pick} />}
      <CharacterPicker
        value={applyClass(char, classes)}
        allowPremade={!cls}
        lockTabs={locked}
        lockNote={locked.length ? `A roupa e o acessório vêm do uniforme de ${cls[stageOf(char)].nome}. Pele, olhos e cabelo são seus.` : ''}
        onChange={(c) => {
          // com uniforme, a roupa e o acessório ficam os da pessoa (a classe veste por cima)
          const next = locked.length ? { ...c, roupa: char.roupa ?? null, acessorio: char.acessorio ?? null } : c
          setChar(cls ? { ...next, classe: cls.id, evo: char.evo ?? null } : next)
        }}
      />
      <div className="t2c-foot">
        {status && (
          <p className="t2e-status" role="status">
            {status}
          </p>
        )}
        <button type="button" className="btn btn-ghost" disabled={!changed || busy} onClick={() => setChar(saved ?? DEFAULT_CHAR)}>
          Desfazer mudanças
        </button>
        <button type="button" className="btn btn-primary" disabled={(!changed && saved) || busy} onClick={save}>
          {busy ? 'Salvando…' : 'Salvar personagem'}
        </button>
      </div>
    </div>
  )
}
