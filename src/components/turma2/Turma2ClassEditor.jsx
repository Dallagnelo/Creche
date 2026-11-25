import { useEffect, useState } from 'react'
import { loadCharLib } from '../../lib/turma2/character'
import { BONUS, CLASSES_CODE, DEFAULT_CLASSES, STAGES, normalizeClass, normalizeClasses, stageLook } from '../../lib/turma2/classes'
import { HUD_ICONS } from '../../lib/turma2/hudConfig'
import { listMaps, saveMap } from '../../services/turma2Maps'
import { CharThumb, CharacterPicker } from './Turma2Character'
import { HUD } from './Turma2Hud'

// Editor de classes (só admin): cria, muda e apaga classes. Cada classe tem cor, ícone, bônus,
// e três etapas (base e duas evoluções), cada uma com nome, uniforme (roupa e acessório) e habilidades.
// Por enquanto bônus e habilidades são só informação; as regras entram no jogo depois.

const uid = () => Math.random().toString(36).slice(2, 6)
const slug = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 24)

function Field({ label, children }) {
  return (
    <label className="t2e-field">
      <span>{label}</span>
      {children}
    </label>
  )
}

export default function Turma2ClassEditor() {
  const [cfg, setCfg] = useState(null)
  const [saved, setSaved] = useState(null)
  const [selId, setSelId] = useState(null)
  const [look, setLook] = useState(null) // etapa com o uniforme sendo montado
  const [lib, setLib] = useState(null)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    listMaps().then((list) => {
      if (!alive) return
      const row = list.find((r) => r.code === CLASSES_CODE)
      const c = normalizeClasses(row?.data)
      setCfg(c)
      setSaved(row ? c : null)
      setSelId(c.classes[0]?.id ?? null)
    })
    loadCharLib().then((l) => alive && setLib(l))
    return () => {
      alive = false
    }
  }, [])

  if (!cfg) return <p className="muted">Carregando as classes…</p>

  const changed = JSON.stringify(cfg) !== JSON.stringify(saved ?? normalizeClasses(null))
  const idx = cfg.classes.findIndex((c) => c.id === selId)
  const cls = cfg.classes[idx] ?? null
  const setList = (classes) => setCfg({ ...cfg, classes })
  const up = (patch) => setList(cfg.classes.map((c, i) => (i === idx ? { ...c, ...patch } : c)))
  const upStage = (key, patch) => up({ [key]: { ...cls[key], ...patch } })
  const move = (d) => {
    const j = idx + d
    if (j < 0 || j >= cfg.classes.length) return
    const list = [...cfg.classes]
    ;[list[idx], list[j]] = [list[j], list[idx]]
    setList(list)
  }
  const addClass = (from = null) => {
    const base = from ? structuredClone(from) : normalizeClass({ nome: 'Nova classe', papel: 'Papel', cor: '#5eead4', icone: 'i_estrela' }, cfg.classes.length)
    const nome = from ? `${from.nome} (cópia)` : base.nome
    const c = { ...base, nome, id: `${slug(nome) || 'classe'}_${uid()}` }
    if (!from) {
      c.base = { ...c.base, nome: 'Nova classe', roupa: 'outfit_01_01' }
      c.a = { ...c.a, nome: 'Evolução A', roupa: 'outfit_01_02' }
      c.b = { ...c.b, nome: 'Evolução B', roupa: 'outfit_01_03' }
    }
    setList([...cfg.classes, c])
    setSelId(c.id)
  }
  const removeClass = () => {
    if (!cls || !window.confirm(`Apagar a classe "${cls.nome}"? Quem estiver nela fica sem classe.`)) return
    const list = cfg.classes.filter((_, i) => i !== idx)
    setList(list)
    setSelId(list[Math.max(0, idx - 1)]?.id ?? null)
  }
  const save = async () => {
    setBusy(true)
    setStatus('Salvando…')
    try {
      await saveMap({ code: CLASSES_CODE, name: 'Classes', data: cfg, published: true })
      setSaved(cfg)
      setStatus('Classes salvas! Já aparecem para todo mundo no "Meu personagem".')
    } catch (e) {
      setStatus(`Não salvou: ${e.message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="t2k">
      <div className="t2e-bar">
        <button type="button" className="btn btn-primary" disabled={!changed || busy} onClick={save}>
          {busy ? 'Salvando…' : changed ? 'Salvar classes' : 'Salvo'}
        </button>
        <button type="button" className="btn btn-ghost" disabled={!changed} onClick={() => setCfg(saved ?? normalizeClasses(null))}>
          Desfazer mudanças
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            if (!window.confirm('Voltar para as 9 classes originais? (Só vale depois de salvar.)')) return
            const c = normalizeClasses(DEFAULT_CLASSES)
            setCfg(c)
            setSelId(c.classes[0].id)
          }}
        >
          Voltar ao original
        </button>
        <span className="t2e-sep" />
        <label className="t2e-field t2k-level">
          <span>Nível para evoluir</span>
          <input type="number" min={1} max={999} value={cfg.nivelEvolucao} onChange={(e) => e.target.value && setCfg({ ...cfg, nivelEvolucao: Math.max(1, Number(e.target.value)) })} />
        </label>
      </div>
      {status && (
        <p className="t2e-status" role="status">
          {status}
        </p>
      )}

      <div className="t2k-main">
        <aside className="t2k-list" aria-label="Classes">
          {cfg.classes.map((c) => (
            <button key={c.id} type="button" className={`t2k-item${c.id === selId ? ' is-on' : ''}`} style={{ '--cls': c.cor }} onClick={() => setSelId(c.id)}>
              <CharThumb lib={lib} char={stageLook(c, 'base')} scale={2} />
              <span>
                <strong>
                  <img className="t2h-pix" src={`${HUD}${c.icone}.png`} alt="" /> {c.nome}
                </strong>
                <small>{c.papel}</small>
              </span>
            </button>
          ))}
          <button type="button" className="t2k-add" onClick={() => addClass()}>
            + Nova classe
          </button>
        </aside>

        {cls ? (
          <div className="t2k-form">
            <section className="t2e-card">
              <div className="t2k-head">
                <h3 style={{ color: cls.cor }}>{cls.nome || 'Sem nome'}</h3>
                <div className="t2u-order">
                  <button type="button" onClick={() => move(-1)} disabled={idx === 0} aria-label="Subir na lista">
                    ↑
                  </button>
                  <button type="button" onClick={() => move(1)} disabled={idx === cfg.classes.length - 1} aria-label="Descer na lista">
                    ↓
                  </button>
                  <button type="button" onClick={() => addClass(cls)}>
                    Duplicar
                  </button>
                  <button type="button" className="danger" onClick={removeClass}>
                    Apagar
                  </button>
                </div>
              </div>
              <div className="t2e-row">
                <Field label="Nome da classe">
                  <input value={cls.nome} maxLength={28} onChange={(e) => up({ nome: e.target.value })} />
                </Field>
                <Field label="Papel no grupo">
                  <input value={cls.papel} maxLength={28} placeholder="Cura, Tank, Suporte…" onChange={(e) => up({ papel: e.target.value })} />
                </Field>
              </div>
              <Field label="Descrição">
                <textarea rows={2} maxLength={200} value={cls.desc} onChange={(e) => up({ desc: e.target.value })} />
              </Field>
              <div className="t2e-row">
                <Field label="Cor">
                  <input type="color" value={cls.cor} onChange={(e) => up({ cor: e.target.value })} />
                </Field>
                <Field label="Ícone">
                  <span className="t2u-icon-pick">
                    <img className="t2h-pix" src={`${HUD}${cls.icone}.png`} alt="" />
                    <select value={cls.icone} onChange={(e) => up({ icone: e.target.value })}>
                      {HUD_ICONS.map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </span>
                </Field>
              </div>
              <label className="t2e-check">
                <input type="checkbox" checked={cls.uniforme} onChange={(e) => up({ uniforme: e.target.checked })} />
                Uniforme obrigatório (a classe decide a roupa e o acessório; a pessoa escolhe pele, olhos e cabelo)
              </label>
            </section>

            <section className="t2e-card">
              <h3>Bônus</h3>
              <div className="t2e-row">
                {BONUS.map(([k, label, unit]) => (
                  <label key={k} className="t2e-field t2k-bonus">
                    <span>
                      {label} <small>({unit})</small>
                    </span>
                    <input type="number" min={-100} max={100} value={cls.bonus[k]} onChange={(e) => e.target.value !== '' && up({ bonus: { ...cls.bonus, [k]: Number(e.target.value) } })} />
                  </label>
                ))}
              </div>
              <p className="muted t2e-tip">Por enquanto só aparece na escolha da classe; quando os status ficarem de verdade, os bônus passam a valer.</p>
            </section>

            <div className="t2k-stages">
              {STAGES.map(([key, label]) => {
                const st = cls[key]
                return (
                  <section key={key} className="t2e-card t2k-stage" style={{ '--cls': cls.cor }}>
                    <h3>
                      {label}
                      {key !== 'base' && <small>libera no nível {cfg.nivelEvolucao}</small>}
                    </h3>
                    <button type="button" className="t2k-look" onClick={() => setLook(key)} title="Montar o uniforme">
                      {['down', 'right', 'up'].map((d) => (
                        <CharThumb key={d} lib={lib} char={stageLook(cls, key)} scale={3} dir={d} />
                      ))}
                      <span>Montar uniforme</span>
                    </button>
                    <Field label="Nome">
                      <input value={st.nome} maxLength={28} onChange={(e) => upStage(key, { nome: e.target.value })} />
                    </Field>
                    <Field label="Descrição">
                      <textarea rows={2} maxLength={160} value={st.desc} onChange={(e) => upStage(key, { desc: e.target.value })} />
                    </Field>
                    <h4 className="t2u-sub">Habilidades</h4>
                    {st.habilidades.map((h, i) => (
                      <div key={i} className="t2u-status">
                        <div className="t2e-row">
                          <Field label="Nome">
                            <input value={h.nome} maxLength={28} onChange={(e) => upStage(key, { habilidades: st.habilidades.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)) })} />
                          </Field>
                          <button type="button" className="danger" aria-label={`Tirar ${h.nome}`} onClick={() => upStage(key, { habilidades: st.habilidades.filter((_, j) => j !== i) })}>
                            ✕
                          </button>
                        </div>
                        <Field label="O que faz">
                          <textarea rows={2} maxLength={160} value={h.desc} onChange={(e) => upStage(key, { habilidades: st.habilidades.map((x, j) => (j === i ? { ...x, desc: e.target.value } : x)) })} />
                        </Field>
                      </div>
                    ))}
                    {st.habilidades.length < 3 && (
                      <button type="button" onClick={() => upStage(key, { habilidades: [...st.habilidades, { nome: 'Nova habilidade', desc: '' }] })}>
                        + Habilidade
                      </button>
                    )}
                  </section>
                )
              })}
            </div>
          </div>
        ) : (
          <p className="muted">Crie uma classe para começar.</p>
        )}
      </div>

      {look && cls && (
        <div className="t2e-modal" role="dialog" aria-modal="true" aria-label={`Uniforme: ${cls[look].nome}`}>
          <div className="t2e-modal-box">
            <h3>
              Uniforme de {cls[look].nome} <small className="muted">(roupa e acessório valem para a classe; pele, olhos e cabelo são só do modelo)</small>
            </h3>
            <CharacterPicker
              allowPremade={false}
              value={stageLook(cls, look)}
              onChange={(c) => up({ [look]: { ...cls[look], roupa: c.roupa, acessorio: c.acessorio }, modelo: { corpo: c.corpo, olhos: c.olhos, cabelo: c.cabelo } })}
            />
            <div className="t2e-row t2e-actions">
              <button type="button" className="btn btn-primary" onClick={() => setLook(null)}>
                Pronto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
