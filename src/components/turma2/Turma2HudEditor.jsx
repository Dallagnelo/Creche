import { useEffect, useRef, useState } from 'react'
import { loadLibrary } from '../../lib/turma2/assets'
import { DEFAULT_CHAR } from '../../lib/turma2/character'
import { HUD_CODE, HUD_COLORS, HUD_DEFAULT, HUD_ICONS, POSITIONS, normalizeHud } from '../../lib/turma2/hudConfig'
import { listMaps, saveMap } from '../../services/turma2Maps'
import { useAuth } from '../../contexts/AuthContext'
import Turma2Hud, { HUD } from './Turma2Hud'
import { normalizeSkills } from '../../lib/turma2/skills'

const PREVIEW_SKILLS = normalizeSkills(null)

// Editor da interface do jogo (só admin): liga/desliga e muda de lugar cada parte, edita os status
// da ficha, a barra rápida, a conversa e a mochila. A prévia ao lado é a interface de verdade.

const uid = () => Math.random().toString(36).slice(2, 7)

function Check({ label, checked, onChange }) {
  return (
    <label className="t2e-check">
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  )
}
function Pick({ label, value, options, onChange }) {
  return (
    <label className="t2e-field">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  )
}
function Num({ label, value, min, max, step = 1, onChange }) {
  return (
    <label className="t2e-field">
      <span>{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => e.target.value !== '' && Number.isFinite(Number(e.target.value)) && onChange(Number(e.target.value))}
      />
    </label>
  )
}

/** parte da interface: mostrar + onde fica */
function Part({ title, part, set, children }) {
  return (
    <section className="t2e-card">
      <h3>{title}</h3>
      <div className="t2e-row">
        <Check label="Mostrar" checked={part.mostrar} onChange={(v) => set({ mostrar: v })} />
        {part.pos !== undefined && <Pick label="Onde fica" value={part.pos} options={POSITIONS} onChange={(v) => set({ pos: v })} />}
      </div>
      {part.mostrar !== false && children}
    </section>
  )
}

const SAMPLE_TALK = { id: 'exemplo', nome: 'Dona Cida', fala: 'Oi! Assim fica a conversa com os personagens dos mapas.', c: { corpo: 'body_05', olhos: 'eyes_03', roupa: 'outfit_12_02', cabelo: 'hairstyle_20_04', acessorio: null } }

export default function Turma2HudEditor() {
  const { profile } = useAuth()
  const [cfg, setCfg] = useState(null)
  const [saved, setSaved] = useState(null)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [lib, setLib] = useState(null)
  const [talk, setTalk] = useState(true)
  const [sky, setSky] = useState('dia')
  const [toast, setToast] = useState(null)
  const stageRef = useRef(null)
  const [sample, setSample] = useState({ v: 1, moedas: 12, inv: [], pegos: {}, hot: [], sel: 0 })

  useEffect(() => {
    let alive = true
    listMaps().then((list) => {
      if (!alive) return
      const row = list.find((r) => r.code === HUD_CODE)
      const c = normalizeHud(row?.data)
      setCfg(c)
      setSaved(row ? c : null)
    })
    loadLibrary()
      .then((l) => {
        if (!alive) return
        setLib(l)
        // itens de exemplo na mochila e na barra rápida da prévia
        const picks = [
          ['camping', /apple/],
          ['camping', /lantern|lamp/],
          ['camping', /fish/],
        ]
        const inv = []
        for (const [t, re] of picks) {
          const n = Object.keys(l.pecas[t] ?? {}).find((k) => re.test(k))
          if (n) inv.push({ key: `pecas/${t}/${n}/x`, src: 'pecas', t, n, nome: n.replace(/_\d+$/, '').replace(/_/g, ' '), desc: 'Item de exemplo.', qtd: inv.length + 1 })
        }
        setSample((s) => ({ ...s, inv, hot: inv.slice(0, 2).map((it) => it.key) }))
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!toast) return undefined
    const t = setTimeout(() => setToast(null), 2200)
    return () => clearTimeout(t)
  }, [toast])

  if (!cfg) return <p className="muted">Carregando a interface…</p>

  const changed = JSON.stringify(cfg) !== JSON.stringify(saved ?? normalizeHud(null))
  const set = (part, patch) => setCfg({ ...cfg, [part]: { ...cfg[part], ...patch } })
  const setStatusRow = (i, patch) => setCfg({ ...cfg, status: cfg.status.map((s, j) => (j === i ? { ...s, ...patch } : s)) })
  const moveStatus = (i, d) => {
    const list = [...cfg.status]
    const j = i + d
    if (j < 0 || j >= list.length) return
    ;[list[i], list[j]] = [list[j], list[i]]
    setCfg({ ...cfg, status: list })
  }
  const save = async () => {
    setBusy(true)
    setStatus('Salvando…')
    try {
      await saveMap({ code: HUD_CODE, name: 'Interface do jogo', data: cfg, published: true })
      setSaved(cfg)
      setStatus('Salvo! A interface nova já vale para todo mundo (quem está jogando vê ao trocar de página).')
    } catch (e) {
      setStatus(`Não salvou: ${e.message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="t2u">
      <div className="t2e-bar">
        <button type="button" className="btn btn-primary" disabled={!changed || busy} onClick={save}>
          {busy ? 'Salvando…' : changed ? 'Salvar interface' : 'Salvo'}
        </button>
        <button type="button" className="btn btn-ghost" disabled={!changed} onClick={() => setCfg(saved ?? normalizeHud(null))}>
          Desfazer mudanças
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => window.confirm('Voltar tudo para o jeito original? (Só vale depois de salvar.)') && setCfg(normalizeHud(HUD_DEFAULT))}
        >
          Voltar ao original
        </button>
        <span className="t2e-sep" />
        <label className="t2e-check">
          <input type="checkbox" checked={talk} onChange={(e) => setTalk(e.target.checked)} />
          Prévia com conversa
        </label>
        <button type="button" className="btn btn-ghost" onClick={() => setToast({ item: { tipo: 'moeda', valor: 1 }, at: Date.now() })}>
          Ver aviso de moeda
        </button>
      </div>
      {status && (
        <p className="t2e-status" role="status">
          {status}
        </p>
      )}

      <div className="t2u-main">
        <div className="t2u-form">
          <section className="t2e-card">
            <h3>Geral</h3>
            <Pick
              label="Tamanho da interface"
              value={String(cfg.escala)}
              options={[
                ['0.75', 'Pequena'],
                ['1', 'Normal'],
                ['1.25', 'Grande'],
                ['1.5', 'Bem grande'],
              ]}
              onChange={(v) => setCfg({ ...cfg, escala: Number(v) })}
            />
          </section>

          <Part title="Ficha do jogador" part={cfg.ficha} set={(p) => set('ficha', p)}>
            <div className="t2e-row">
              <Check label="Já começa aberta" checked={cfg.ficha.aberta} onChange={(v) => set('ficha', { aberta: v })} />
              <Check label="Nome" checked={cfg.ficha.nome} onChange={(v) => set('ficha', { nome: v })} />
              <Check label="Moedas" checked={cfg.ficha.moedas} onChange={(v) => set('ficha', { moedas: v })} />
              <Check label="Nível total (soma das habilidades)" checked={cfg.ficha.nivel} onChange={(v) => set('ficha', { nivel: v })} />
            </div>
            <h4 className="t2u-sub">Status (aparecem com a ficha aberta)</h4>
            {cfg.status.map((s, i) => (
              <div key={s.id} className="t2u-status">
                <div className="t2e-row">
                  <label className="t2e-field">
                    <span>Nome</span>
                    <input value={s.rotulo} maxLength={14} onChange={(e) => setStatusRow(i, { rotulo: e.target.value })} />
                  </label>
                  <Pick
                    label="Jeito"
                    value={s.tipo}
                    options={[
                      ['icones', 'Ícones'],
                      ['barra', 'Barra'],
                    ]}
                    onChange={(v) => setStatusRow(i, { tipo: v, valor: v === 'barra' ? 50 : 3 })}
                  />
                  <label className="t2e-field t2u-icon">
                    <span>Ícone</span>
                    <span className="t2u-icon-pick">
                      {s.icone && <img className="t2h-pix" src={`${HUD}${s.icone}.png`} alt="" />}
                      <select value={s.icone} onChange={(e) => setStatusRow(i, { icone: e.target.value })}>
                        {s.tipo === 'barra' && <option value="">Sem ícone</option>}
                        {HUD_ICONS.map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </span>
                  </label>
                </div>
                <div className="t2e-row">
                  {s.tipo === 'barra' ? (
                    <>
                      <Pick label="Cor" value={s.cor} options={HUD_COLORS} onChange={(v) => setStatusRow(i, { cor: v })} />
                      <Num label="Quanto está cheia (%)" value={s.valor} min={0} max={100} onChange={(v) => setStatusRow(i, { valor: v })} />
                    </>
                  ) : (
                    <>
                      <Num label="Quantos ícones" value={s.qtd} min={1} max={10} onChange={(v) => setStatusRow(i, { qtd: v })} />
                      <Num label="Cheios (aceita meio)" value={s.valor} min={0} max={10} step={0.5} onChange={(v) => setStatusRow(i, { valor: v })} />
                    </>
                  )}
                  <div className="t2u-order">
                    <button type="button" onClick={() => moveStatus(i, -1)} disabled={i === 0} aria-label="Subir">
                      ↑
                    </button>
                    <button type="button" onClick={() => moveStatus(i, 1)} disabled={i === cfg.status.length - 1} aria-label="Descer">
                      ↓
                    </button>
                    <button type="button" className="danger" onClick={() => setCfg({ ...cfg, status: cfg.status.filter((_, j) => j !== i) })} aria-label={`Tirar ${s.rotulo}`}>
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))}
            <button
              type="button"
              disabled={cfg.status.length >= 8}
              onClick={() => setCfg({ ...cfg, status: [...cfg.status, { id: uid(), rotulo: 'Novo', tipo: 'barra', icone: 'i_estrela', cor: 'vermelha', qtd: 5, valor: 50 }] })}
            >
              + Adicionar status
            </button>
          </Part>

          <Part title="Nome do mapa" part={cfg.titulo} set={(p) => set('titulo', p)}>
            <Check label="Mostrar a hora do dia (mapas ao ar livre)" checked={cfg.titulo.hora} onChange={(v) => set('titulo', { hora: v })} />
          </Part>

          <Part title="Botões" part={cfg.botoes} set={(p) => set('botoes', p)}>
            <div className="t2e-row">
              <Check label="Mochila" checked={cfg.botoes.mochila} onChange={(v) => set('botoes', { mochila: v })} />
              <Check label="Habilidades" checked={cfg.botoes.habilidades} onChange={(v) => set('botoes', { habilidades: v })} />
              <Check label="Mapas" checked={cfg.botoes.mapas} onChange={(v) => set('botoes', { mapas: v })} />
              <Check label="Grade" checked={cfg.botoes.grade} onChange={(v) => set('botoes', { grade: v })} />
              <Check label="Tela cheia" checked={cfg.botoes.tela} onChange={(v) => set('botoes', { tela: v })} />
              <Check label="Ajuda" checked={cfg.botoes.ajuda} onChange={(v) => set('botoes', { ajuda: v })} />
            </div>
            <p className="muted t2e-tip">Os atalhos de teclado continuam valendo mesmo sem o botão.</p>
          </Part>

          <Part title="Barra rápida" part={cfg.barra} set={(p) => set('barra', p)}>
            <Num label="Espaços (1 a 9)" value={cfg.barra.espacos} min={1} max={9} onChange={(v) => set('barra', { espacos: v })} />
          </Part>

          <section className="t2e-card">
            <h3>Conversa</h3>
            <div className="t2e-row">
              <Check label="Mostrar o rosto" checked={cfg.conversa.rosto} onChange={(v) => set('conversa', { rosto: v })} />
              <Pick
                label="Texto aparece"
                value={String(cfg.conversa.velocidade)}
                options={[
                  ['12', 'Rápido'],
                  ['28', 'Normal'],
                  ['50', 'Devagar'],
                  ['0', 'Tudo de uma vez'],
                ]}
                onChange={(v) => set('conversa', { velocidade: Number(v) })}
              />
            </div>
          </section>

          <section className="t2e-card">
            <h3>Mochila</h3>
            <div className="t2e-row">
              <Num label="Espaços" value={cfg.mochila.espacos} min={6} max={60} onChange={(v) => set('mochila', { espacos: v })} />
              <Num label="Por linha" value={cfg.mochila.colunas} min={3} max={10} onChange={(v) => set('mochila', { colunas: v })} />
            </div>
            <p className="muted t2e-tip">Abra a mochila na prévia para ver.</p>
          </section>
        </div>

        <div className="t2u-preview-wrap">
          <p className="muted t2e-tip">Prévia (dá para clicar: abrir a ficha, a mochila, os mapas…)</p>
          <div className="t2-stage t2u-preview" ref={stageRef} tabIndex={0}>
            <Turma2Hud
              preview
              skillsCfg={PREVIEW_SKILLS}
              config={cfg}
              stageRef={stageRef}
              lib={lib}
              name={profile?.display_name ?? 'Você'}
              character={profile?.turma2_char ?? DEFAULT_CHAR}
              mapName="Orla da Turma"
              maps={[
                { code: 'orla', label: 'Orla da Turma' },
                { code: 'acampamento', label: 'Acampamento do Outono' },
              ]}
              code="orla"
              onPickMap={() => {}}
              outdoor
              sky={sky}
              onSky={setSky}
              grid={false}
              onGrid={() => {}}
              talk={talk ? SAMPLE_TALK : null}
              save={sample}
              toast={toast}
              onDrop={() => {}}
              onSave={(fn) => setSample(fn)}
              onResetSave={() => {}}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
