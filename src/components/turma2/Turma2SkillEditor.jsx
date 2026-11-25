import { useEffect, useState } from 'react'
import { loadCharLib } from '../../lib/turma2/character'
import { DEFAULT_SKILLS, MAX_LEVEL, SKILLS_CODE, TIPOS, normalizeSkills, xpAt } from '../../lib/turma2/skills'
import { HUD_ICONS } from '../../lib/turma2/hudConfig'
import { listMaps, saveMap } from '../../services/turma2Maps'
import { CharThumb, CharacterPicker } from './Turma2Character'
import { HUD } from './Turma2Hud'

// Editor das habilidades (só admin): nome, cor, ícone e descrição de cada uma, as passivas
// (nível, o que fazem e quanto) e o visual que libera. As 7 habilidades são fixas porque o jogo
// sabe o que cada uma faz (pescar, cozinhar…); o resto é tudo daqui.

const MODEL = { corpo: 'body_03', olhos: 'eyes_02', cabelo: 'hairstyle_01_01' }

function Field({ label, children }) {
  return (
    <label className="t2e-field">
      <span>{label}</span>
      {children}
    </label>
  )
}
const Num = ({ value, onChange, min, max }) => (
  <input
    type="number"
    value={value}
    min={min}
    max={max}
    onChange={(e) => {
      const v = Number(e.target.value)
      if (e.target.value !== '' && Number.isFinite(v)) onChange(v)
    }}
  />
)

export default function Turma2SkillEditor() {
  const [cfg, setCfg] = useState(null)
  const [saved, setSaved] = useState(null)
  const [selId, setSelId] = useState('pesca')
  const [lib, setLib] = useState(null)
  const [look, setLook] = useState(false)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    listMaps().then((list) => {
      if (!alive) return
      const row = list.find((r) => r.code === SKILLS_CODE)
      const c = normalizeSkills(row?.data)
      setCfg(c)
      setSaved(row ? c : null)
    })
    loadCharLib().then((l) => alive && setLib(l))
    return () => {
      alive = false
    }
  }, [])

  if (!cfg) return <p className="muted">Carregando as habilidades…</p>

  const changed = JSON.stringify(cfg) !== JSON.stringify(saved ?? normalizeSkills(null))
  const idx = cfg.skills.findIndex((s) => s.id === selId)
  const sk = cfg.skills[idx]
  const up = (patch) => setCfg({ ...cfg, skills: cfg.skills.map((s, i) => (i === idx ? { ...s, ...patch } : s)) })
  const upPas = (i, patch) => up({ passivas: sk.passivas.map((p, j) => (j === i ? { ...p, ...patch } : p)) })
  const save = async () => {
    setBusy(true)
    setStatus('Salvando…')
    try {
      const clean = normalizeSkills(cfg)
      await saveMap({ code: SKILLS_CODE, name: 'Habilidades', data: clean, published: true })
      setCfg(clean)
      setSaved(clean)
      setStatus('Habilidades salvas! Já valem no jogo para todo mundo.')
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
          {busy ? 'Salvando…' : changed ? 'Salvar habilidades' : 'Salvo'}
        </button>
        <button type="button" className="btn btn-ghost" disabled={!changed} onClick={() => setCfg(saved ?? normalizeSkills(null))}>
          Desfazer mudanças
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => window.confirm('Voltar todas as habilidades ao original? (Só vale depois de salvar.)') && setCfg(normalizeSkills(DEFAULT_SKILLS))}
        >
          Voltar ao original
        </button>
        <span className="muted t2e-tip">
          Nível 10 ≈ {xpAt(10)} XP · nível 25 ≈ {xpAt(25)} XP · nível {MAX_LEVEL} ≈ {xpAt(MAX_LEVEL)} XP
        </span>
      </div>
      {status && (
        <p className="t2e-status" role="status">
          {status}
        </p>
      )}
      <div className="t2k-main">
        <aside className="t2k-list" aria-label="Habilidades">
          {cfg.skills.map((s) => (
            <button key={s.id} type="button" className={`t2k-item${s.id === selId ? ' is-on' : ''}`} style={{ '--cls': s.cor }} onClick={() => setSelId(s.id)}>
              <img className="t2h-pix" src={`${HUD}${s.icone}.png`} alt="" style={{ width: 24, height: 24 }} />
              <span>
                <b>{s.nome}</b>
                <small className="muted">{s.passivas.length} passivas</small>
              </span>
            </button>
          ))}
        </aside>
        {sk && (
          <div className="t2k-form">
            <section className="t2e-card" style={{ '--cls': sk.cor }}>
              <div className="t2e-row">
                <Field label="Nome">
                  <input value={sk.nome} maxLength={24} onChange={(e) => up({ nome: e.target.value })} />
                </Field>
                <Field label="Cor">
                  <input type="color" value={sk.cor} onChange={(e) => up({ cor: e.target.value })} />
                </Field>
                <Field label="Ícone">
                  <select value={sk.icone} onChange={(e) => up({ icone: e.target.value })}>
                    {HUD_ICONS.map(([k, l]) => (
                      <option key={k} value={k}>
                        {l}
                      </option>
                    ))}
                  </select>
                </Field>
                <img className="t2h-pix" src={`${HUD}${sk.icone}.png`} alt="" style={{ width: 32, height: 32, alignSelf: 'end' }} />
              </div>
              <Field label="O que é (aparece no jogo)">
                <textarea rows={2} maxLength={240} value={sk.desc} onChange={(e) => up({ desc: e.target.value })} />
              </Field>
            </section>

            <section className="t2e-card">
              <h3>Passivas</h3>
              <p className="muted t2e-tip">
                O que cada tipo faz nesta habilidade: <b>Mais fácil</b> = mais tempo / alvo maior no minijogo; <b>Dobro</b> = chance de sair em dobro; <b>Mais raro</b> = peixe raro (Pesca);{' '}
                <b>Mais moedas</b> = paga mais; <b>Mais rápido</b> = planta cresce mais rápido (Jardinagem) ou anda mais rápido (Entregas); <b>Desconto</b> = loja mais barata (Comércio); <b>Mais XP</b> = sobe mais rápido.
              </p>
              {sk.passivas.map((p, i) => (
                <div key={i} className="t2u-status t2k-skill">
                  <div className="t2e-row">
                    <Field label="Nível">
                      <Num value={p.nivel} min={1} max={MAX_LEVEL} onChange={(v) => upPas(i, { nivel: v })} />
                    </Field>
                    <Field label="Nome">
                      <input value={p.nome} maxLength={30} onChange={(e) => upPas(i, { nome: e.target.value })} />
                    </Field>
                    <Field label="Tipo">
                      <select value={p.tipo} onChange={(e) => upPas(i, { tipo: e.target.value })}>
                        {TIPOS.map(([k, l]) => (
                          <option key={k} value={k}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Quanto (%)">
                      <Num value={p.valor} min={0} max={300} onChange={(v) => upPas(i, { valor: v })} />
                    </Field>
                    <button type="button" className="danger" onClick={() => up({ passivas: sk.passivas.filter((_, j) => j !== i) })} aria-label={`Tirar ${p.nome}`}>
                      ✕
                    </button>
                  </div>
                  <Field label="Descrição">
                    <input value={p.desc} maxLength={120} onChange={(e) => upPas(i, { desc: e.target.value })} />
                  </Field>
                </div>
              ))}
              <button
                type="button"
                disabled={sk.passivas.length >= 10}
                onClick={() => up({ passivas: [...sk.passivas, { nivel: Math.min(MAX_LEVEL, (sk.passivas.at(-1)?.nivel ?? 0) + 5), nome: 'Nova passiva', desc: '', tipo: 'facil', valor: 10 }] })}
              >
                + Adicionar passiva
              </button>
            </section>

            <section className="t2e-card">
              <h3>Visual que libera</h3>
              {sk.visual ? (
                <div className="t2e-row">
                  <button type="button" className="t2k-look" onClick={() => setLook(true)} title="Montar o visual">
                    {lib && <CharThumb lib={lib} char={{ ...MODEL, roupa: sk.visual.roupa, acessorio: sk.visual.acessorio }} scale={4} />}
                    <small>Trocar roupa</small>
                  </button>
                  <Field label="Nome do visual">
                    <input value={sk.visual.nome} maxLength={30} onChange={(e) => up({ visual: { ...sk.visual, nome: e.target.value } })} />
                  </Field>
                  <Field label="Libera no nível">
                    <Num value={sk.visual.nivel} min={1} max={MAX_LEVEL} onChange={(v) => up({ visual: { ...sk.visual, nivel: v } })} />
                  </Field>
                  <button type="button" className="danger" onClick={() => up({ visual: null })}>
                    Sem visual
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => up({ visual: { nivel: 25, nome: 'Visual', roupa: 'outfit_01_01', acessorio: null } })}>
                  + Dar um visual para esta habilidade
                </button>
              )}
              <p className="muted t2e-tip">A pessoa veste na janela Habilidades (K) do jogo; pele, olhos e cabelo continuam os dela.</p>
            </section>
          </div>
        )}
      </div>

      {look && sk?.visual && (
        <div className="t2e-modal" role="dialog" aria-modal="true" aria-label={`Visual: ${sk.visual.nome}`}>
          <div className="t2e-modal-box">
            <h3>
              Visual de {sk.nome} <small className="muted">(só a roupa e o acessório valem)</small>
            </h3>
            <CharacterPicker value={{ ...MODEL, roupa: sk.visual.roupa, acessorio: sk.visual.acessorio }} onChange={(c) => up({ visual: { ...sk.visual, roupa: c.roupa, acessorio: c.acessorio ?? null } })} startTab="roupa" />
            <div className="t2e-row t2e-actions">
              <button type="button" className="btn btn-primary" onClick={() => setLook(false)}>
                Pronto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
