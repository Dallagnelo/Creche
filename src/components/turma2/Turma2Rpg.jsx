import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { animAtlasUrl, atlasUrl, loadImage } from '../../lib/turma2/assets'
import { DEFAULT_CHAR } from '../../lib/turma2/character'
import { gameTime } from '../../lib/turma2/clock'
import { BENS, countOf, energyOf } from '../../lib/turma2/economy'
import { levelOf } from '../../lib/turma2/skills'
import {
  CLASSES, ENERGIA_EXPEDICAO, EVO_NIVEL, MONSTROS, NIVEIS, PAPEL_NOME, PRECISA_NOME, RES_NOME, SLOTS, TIERS, TIER_COR, TROCA_PRECO, VISUAL_NIVEL,
  battleLog, classById, classEvo, classLevel, classXp, equipOf, monsterById, monsterSnapshot, myClass, nextRecipe, powerOf, rewardOf, rpgOf,
} from '../../lib/turma2/rpg'
import * as api from '../../services/turma2Rpg'
import { HUD, Face, ItemIcon, Panel } from './Turma2Hud'

// Janelas do mini RPG: o quadro das classes (Cidade), a oficina e o Portal dos Monstros (Bosque).
// Mudanças no save (classe, equipamento, recompensa) vão por onResult; o jogo aplica e grava.

const icon = (id) => ({ ...BENS[id].icone })
const hhmm = (d) => new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
function left(ms) {
  if (ms <= 0) return 'terminando…'
  const m = Math.ceil(ms / 60000)
  return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min` : `${m} min`
}
const durNome = (min) => (min >= 60 ? `${Math.round(min / 6) / 10} h`.replace('.', ',') : `${min} min`)

function Coins({ save }) {
  return (
    <span className="t2h-dark t2h-chip t2a-coins">
      <img className="t2h-pix t2h-coin" src={`${HUD}i_moeda_p.png`} alt="" />
      {save.moedas}
    </span>
  )
}

function Tabs({ tabs, tab, setTab, children }) {
  return (
    <div className="t2a-tabs" role="tablist">
      {tabs.map(([k, l]) => (
        <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'is-on' : ''} onClick={() => setTab(k)}>
          {l}
        </button>
      ))}
      {children}
    </div>
  )
}

/** monstro animado (sprite do pacote): animado da biblioteca ou folha de personagem do Modern Exteriors */
export function MonsterSprite({ m, lib, size = 64 }) {
  const ref = useRef(null)
  useEffect(() => {
    let alive = true
    let raf = 0
    const sp = m.sprite
    const a = sp.anim ? lib?.anims?.[sp.anim] : null
    const urls = a ? [animAtlasUrl(a[0])] : sp.folha ? [sp.folha, ...(sp.por ? [sp.por] : [])] : []
    const base = sp.peca ? lib?.[sp.peca[0]]?.[sp.peca[1]]?.[sp.peca[2]] : null
    if (base) urls.push(atlasUrl(sp.peca[0], sp.peca[1]))
    Promise.all(urls.map(loadImage))
      .then((imgs) => {
        if (!alive || !imgs.length) return
        const draw = (now) => {
          const c = ref.current
          if (!c) return
          const ctx = c.getContext('2d')
          ctx.imageSmoothingEnabled = false
          ctx.clearRect(0, 0, c.width, c.height)
          const t = now / 1000
          if (a) {
            const [, x, y, fw, fh, frames] = a
            const f = Math.floor(t * 7) % frames
            const [cx, cy, cw, ch] = sp.crop ?? [0, 0, fw, fh]
            const s = Math.min(c.width / cw, c.height / ch)
            if (base) ctx.drawImage(imgs[1], base[0], base[1], base[2], base[3], (c.width - base[2] * s) / 2, c.height - base[3] * s, base[2] * s, base[3] * s)
            ctx.drawImage(imgs[0], x + f * fw + cx, y + cy, cw, ch, (c.width - cw * s) / 2, c.height - ch * s, cw * s, ch * s)
          } else {
            const n = sp.ate - sp.de + 1
            const col = sp.de + (Math.floor(t * 6) % n)
            const s = Math.min(c.width / 16, c.height / 32)
            for (const img of imgs) ctx.drawImage(img, col * 16, sp.linha * 32, 16, 32, (c.width - 16 * s) / 2, c.height - 32 * s, 16 * s, 32 * s)
          }
          raf = requestAnimationFrame(draw)
        }
        raf = requestAnimationFrame(draw)
      })
      .catch(() => {})
    return () => {
      alive = false
      cancelAnimationFrame(raf)
    }
  }, [m, lib])
  return <canvas ref={ref} width={64} height={64} className="t2r-monster" style={{ width: size, height: size }} aria-label={m.nome} role="img" />
}

function LevelBar({ xp, cor }) {
  const l = levelOf(xp)
  return (
    <span className="t2r-bar" title={`Nível ${l.nivel}`}>
      <span style={{ width: `${Math.round(l.pct * 100)}%`, background: cor }} />
    </span>
  )
}

// ---------------------------------------------------------------- quadro das classes (Cidade das Flores)
export function ClassBoard({ save, onResult, onClose }) {
  const mine = myClass(save)
  const r = rpgOf(save)
  const lv = classLevel(save)
  const evo = classEvo(save)
  const eq = equipOf(save)
  const [open, setOpen] = useState(mine?.id ?? null)
  return (
    <Panel title="Quadro das classes" onClose={onClose} className="t2a t2r-wide">
      <div className="t2a-tabs">
        <span className="t2a-tip">{mine ? `Sua classe: ${mine.nome}${evo ? ` (${mine.evos[evo].nome})` : ''} · nível ${lv}` : 'Escolha a sua classe: a primeira é de graça.'}</span>
        <Coins save={save} />
      </div>
      {mine && (
        <div className="t2r-box" style={{ '--sk': mine.cor }}>
          <LevelBar xp={classXp(save, mine.id)} cor={mine.cor} />
          <small>
            Poder na luta: <b>{powerOf(save)}</b>. O XP de classe vem das expedições no Portal dos Monstros (Bosque).
          </small>
          {lv >= EVO_NIVEL && !evo && (
            <div className="t2r-evos">
              <b>Escolha a evolução (não dá para mudar depois):</b>
              {Object.entries(mine.evos).map(([k, e]) => (
                <button key={k} type="button" className="t2h-text-btn is-ok" onClick={() => onResult({ tipo: 'rpg_evo', evo: k })}>
                  {e.nome}: {e.desc}
                </button>
              ))}
            </div>
          )}
          {lv < EVO_NIVEL && <small>No nível {EVO_NIVEL} você escolhe a evolução: {Object.values(mine.evos).map((e) => e.nome).join(' ou ')}.</small>}
          {evo && lv < VISUAL_NIVEL && <small>No nível {VISUAL_NIVEL} libera o uniforme de {mine.evos[evo].nome}.</small>}
          <div className="t2r-show" role="group" aria-label="Mostrar no boneco">
            <span>Mostrar no boneco:</span>
            {[
              ['classe', 'Uniforme', true],
              ['protecao', 'Proteção', eq.protecao > 0],
              ['amuleto', 'Amuleto', eq.amuleto > 0],
              [null, 'Nada', true],
            ].map(([k, l, ok]) => (
              <button key={l} type="button" className={`t2h-text-btn${(r.mostra ?? null) === k ? ' is-ok' : ''}`} disabled={!ok} aria-pressed={(r.mostra ?? null) === k} onClick={() => onResult({ tipo: 'rpg_mostra', v: k })}>
                {l}
              </button>
            ))}
          </div>
        </div>
      )}
      <ul className="t2a-list t2r-list">
        {CLASSES.map((c) => {
          const is = mine?.id === c.id
          const clv = classLevel(save, c.id)
          const price = mine ? TROCA_PRECO : 0
          return (
            <li key={c.id} className={`t2r-class${open === c.id ? ' is-open' : ''}`} style={{ '--sk': c.cor }}>
              <button type="button" className="t2a-row" aria-expanded={open === c.id} onClick={() => setOpen(open === c.id ? null : c.id)}>
                <span className="t2r-dot" />
                <span className="t2a-row-main">
                  <b>
                    {c.nome} <small>· {PAPEL_NOME[c.papel]}</small>
                  </b>
                  <small>{c.luta}</small>
                </span>
                <span className="t2a-row-side">{is ? 'Sua classe' : classXp(save, c.id) ? `nível ${clv}` : ''}</span>
              </button>
              {open === c.id && (
                <div className="t2r-class-more">
                  <p>
                    <b>Na vila:</b> {c.vila}
                  </p>
                  <p>
                    <b>Bônus na recompensa:</b> {c.premio}
                  </p>
                  <p>
                    <b>Evoluções (nível {EVO_NIVEL}):</b> {Object.values(c.evos).map((e) => `${e.nome} (${e.desc.toLowerCase().replace(/\.$/, '')})`).join(' ou ')}.
                  </p>
                  {!is && (
                    <button type="button" className="t2h-text-btn is-ok t2a-main" disabled={save.moedas < price} onClick={() => onResult({ tipo: 'rpg_classe', id: c.id })}>
                      {mine ? `Trocar para ${c.nome} (${price} moedas)` : `Escolher ${c.nome} (grátis)`}
                    </button>
                  )}
                  {!is && mine && <small>Trocar não apaga nada: cada classe guarda o próprio nível.</small>}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}

// ---------------------------------------------------------------- oficina (Bosque)
export function Workshop({ save, lib, onResult, onClose }) {
  const eq = equipOf(save)
  const eng = myClass(save)?.id === 'engenheiro'
  return (
    <Panel title="Oficina" onClose={onClose} className="t2a t2r-wide">
      <div className="t2a-tabs">
        <span className="t2a-tip">{eng ? 'Engenheiro: tudo 30% mais barato.' : 'Junte materiais dos monstros e faça equipamentos.'}</span>
        <Coins save={save} />
      </div>
      <ul className="t2a-list t2r-list">
        {SLOTS.map(([slot, nome, desc]) => {
          const next = nextRecipe(save, slot)
          const can = next && save.moedas >= next.moedas && Object.entries(next.mats).every(([id, q]) => countOf(save, id) >= q)
          return (
            <li key={slot} className="t2a-row is-static t2r-slot">
              <span className="t2r-tier" style={{ '--tc': TIER_COR[eq[slot]] ?? '#c9a27a' }}>{eq[slot] || '–'}</span>
              <span className="t2a-row-main">
                <b>
                  {nome}: {TIERS[eq[slot]]}
                </b>
                <small>{desc}</small>
                {next ? (
                  <span className="t2r-mats">
                    <span>Para {TIERS[next.tier]}:</span>
                    {Object.entries(next.mats).map(([id, q]) => (
                      <span key={id} className={`t2r-mat${countOf(save, id) >= q ? ' is-ok' : ''}`} title={BENS[id].nome}>
                        <ItemIcon lib={lib} item={icon(id)} size={20} />
                        {countOf(save, id)}/{q}
                      </span>
                    ))}
                    <span className={`t2r-mat${save.moedas >= next.moedas ? ' is-ok' : ''}`}>
                      <img className="t2h-pix t2h-coin" src={`${HUD}i_moeda_p.png`} alt="moedas" />
                      {next.moedas}
                    </span>
                  </span>
                ) : (
                  <small>Já está no nível máximo.</small>
                )}
              </span>
              {next && (
                <span className="t2a-row-btns">
                  <button type="button" className="t2h-text-btn" disabled={!can} onClick={() => onResult({ tipo: 'rpg_equip', slot })}>
                    Fazer
                  </button>
                </span>
              )}
            </li>
          )
        })}
      </ul>
      <p className="t2a-tip t2r-small">Os materiais vêm das expedições: casca (Caranguejo), gosma (Fantasminha), frasco podre (Zumbi), osso (Esqueleto), abóbora e galho assombrados (difíceis) e a coroa (Fantasma Rei).</p>
    </Panel>
  )
}

// ---------------------------------------------------------------- Portal dos Monstros (Bosque)
const CORES = ['#5eead4', '#ff5a4e', '#ffc23d', '#7be36a', '#4d8dff', '#a97bff', '#ff6fc1', '#ff8a3d']
const nomeDe = (p) => p?.display_name ?? 'Alguém'
const charDe = (p) => p?.turma2_char ?? DEFAULT_CHAR

function Person({ p, classe, nivel, children }) {
  const c = classById(classe)
  return (
    <li className="t2a-row is-static">
      <Face char={charDe(p)} size={40} />
      <span className="t2a-row-main">
        <b>{nomeDe(p)}</b>
        <small style={{ color: c?.cor ? undefined : '#7a5a44' }}>{c ? `${c.nome} · nível ${nivel ?? 1}` : 'Sem classe ainda'}</small>
      </span>
      {children && <span className="t2a-row-btns">{children}</span>}
    </li>
  )
}

function useNow(on) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!on) return undefined
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [on])
  return now
}

export function Portal({ save, lib, onResult, onClose }) {
  const { user, profile, isAdmin } = useAuth()
  const uid = user?.id
  const mine = myClass(save)
  const [tab, setTab] = useState('grupo')
  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const reload = useCallback(() => {
    if (!uid) return
    api.loadPortal(uid).then(setData).catch((e) => setErr(e.message))
  }, [uid])
  // conta para o banco quem eu sou (classe, nível e poder) e escuta as mudanças do grupo
  useEffect(() => {
    if (!uid) return undefined
    const go = mine ? api.souEu(mine.id, classLevel(save), powerOf(save)).catch(() => {}) : Promise.resolve()
    go.then(reload)
    return api.watchRpg(uid, reload)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, reload])
  const run = async (fn, ok) => {
    setBusy(true)
    setMsg(null)
    try {
      const r = await fn()
      if (ok) setMsg(typeof ok === 'function' ? ok(r) : ok)
      reload()
      return r
    } catch (e) {
      setMsg(e.message)
      return undefined
    } finally {
      setBusy(false)
    }
  }
  const prontas = data?.historico.filter((h) => !h.pegou && h.status === 'fim').length ?? 0
  return (
    <Panel title="Portal dos Monstros" onClose={onClose} className="t2a t2r-wide t2r-portal">
      <Tabs
        tabs={[
          ['grupo', `Grupo${data?.convites.length && !data?.grupo ? ` (${data.convites.length})` : ''}`],
          ['expedicao', 'Expedição'],
          ['historico', `Histórico${prontas ? ` (${prontas})` : ''}`],
        ]}
        tab={tab}
        setTab={setTab}
      />
      {!uid ? (
        <p className="t2a-tip">Entre na sua conta para lutar com a turma.</p>
      ) : err ? (
        <p className="t2a-tip">{err}</p>
      ) : !data ? (
        <p className="t2a-tip">Abrindo o portal…</p>
      ) : !mine ? (
        <p className="t2a-tip">Escolha uma classe antes: o quadro das classes fica na Cidade das Flores, na praça.</p>
      ) : tab === 'grupo' ? (
        <GroupTab data={data} uid={uid} busy={busy} run={run} />
      ) : tab === 'expedicao' ? (
        <ExpeditionTab data={data} uid={uid} me={profile} save={save} lib={lib} busy={busy} run={run} isAdmin={isAdmin} onResult={onResult} />
      ) : (
        <HistoryTab data={data} uid={uid} lib={lib} busy={busy} run={run} onResult={onResult} />
      )}
      {msg && (
        <p className="t2a-tip t2r-msg" role="status">
          {msg}
        </p>
      )}
    </Panel>
  )
}

function GroupTab({ data, uid, busy, run }) {
  const [nome, setNome] = useState('')
  const [cor, setCor] = useState(CORES[0])
  const [convidaveis, setConvidaveis] = useState(null)
  const g = data.grupo
  if (!g) {
    return (
      <>
        {data.convites.length > 0 && (
          <>
            <b className="t2r-h">Convites</b>
            <ul className="t2a-list">
              {data.convites.map((c) => (
                <li key={c.grupo_id} className="t2a-row is-static" style={{ '--sk': c.grupo?.cor }}>
                  <span className="t2r-dot" />
                  <span className="t2a-row-main">
                    <b>{c.grupo?.nome ?? 'Grupo'}</b>
                    <small>{nomeDe(c.quem)} te convidou</small>
                  </span>
                  <span className="t2a-row-btns">
                    <button type="button" className="t2h-text-btn is-ok" disabled={busy} onClick={() => run(() => api.responderConvite(c.grupo_id, true), 'Você entrou no grupo!')}>
                      Aceitar
                    </button>
                    <button type="button" className="t2h-text-btn" disabled={busy} onClick={() => run(() => api.responderConvite(c.grupo_id, false))}>
                      Recusar
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
        <b className="t2r-h">Criar um grupo</b>
        <div className="t2r-form">
          <input className="t2r-input" value={nome} maxLength={24} placeholder="Nome do grupo" aria-label="Nome do grupo" onChange={(e) => setNome(e.target.value)} onKeyDown={(e) => e.stopPropagation()} />
          <span className="t2r-colors" role="radiogroup" aria-label="Cor do grupo">
            {CORES.map((c) => (
              <button key={c} type="button" role="radio" aria-checked={cor === c} aria-label={c} className={cor === c ? 'is-on' : ''} style={{ background: c }} onClick={() => setCor(c)} />
            ))}
          </span>
          <button type="button" className="t2h-text-btn is-ok" disabled={busy || !nome.trim()} onClick={() => run(() => api.criarGrupo(nome.trim(), cor), 'Grupo criado! Agora convide a turma.')}>
            Criar
          </button>
        </div>
        <label className="t2r-check">
          <input type="checkbox" checked={!!data.me?.mural} disabled={busy} onChange={(e) => run(() => api.setMural(e.target.checked), e.target.checked ? 'Você está no mural: os grupos podem te chamar.' : null)} />
          Aparecer no mural (os grupos veem que você procura grupo)
        </label>
        <b className="t2r-h">Mural: procurando grupo</b>
        {data.mural.length ? (
          <ul className="t2a-list">
            {data.mural.map((p) => (
              <Person key={p.user_id} p={p.perfil} classe={p.classe} nivel={p.nivel} />
            ))}
          </ul>
        ) : (
          <p className="t2a-tip t2r-small">Ninguém no mural agora.</p>
        )}
      </>
    )
  }
  const cheio = data.membros.length >= 5
  return (
    <>
      <div className="t2r-group" style={{ '--sk': g.cor }}>
        <span className="t2r-dot" />
        <b>{g.nome}</b>
        <small>{data.membros.length}/5</small>
      </div>
      <ul className="t2a-list">
        {data.membros.map((m) => (
          <Person key={m.user_id} p={m.perfil} classe={m.classe} nivel={m.nivel}>
            {m.user_id === g.dono ? <small>Líder</small> : null}
          </Person>
        ))}
      </ul>
      <div className="t2a-actions t2r-actions">
        <button type="button" className="t2h-text-btn" disabled={busy || cheio} onClick={() => api.loadConvidaveis(uid).then(setConvidaveis).catch(() => setConvidaveis([]))}>
          {cheio ? 'Grupo cheio' : 'Convidar'}
        </button>
        <button type="button" className="t2h-text-btn" disabled={busy} onClick={() => run(() => api.sairDoGrupo(), 'Você saiu do grupo.')}>
          Sair do grupo
        </button>
      </div>
      {convidaveis && !cheio && (
        <>
          <b className="t2r-h">Convidar (quem está sem grupo; os do mural primeiro)</b>
          {convidaveis.length ? (
            <ul className="t2a-list">
              {[...convidaveis]
                .sort((a, b) => (data.mural.some((m) => m.user_id === b.id) ? 1 : 0) - (data.mural.some((m) => m.user_id === a.id) ? 1 : 0))
                .map((p) => (
                  <Person key={p.id} p={p} classe={p.classe} nivel={p.nivel}>
                    <button type="button" className="t2h-text-btn" disabled={busy} onClick={() => run(() => api.convidar(p.id), `Convite mandado para ${nomeDe(p)}.`)}>
                      Convidar
                    </button>
                  </Person>
                ))}
            </ul>
          ) : (
            <p className="t2a-tip t2r-small">Ninguém livre para convidar agora.</p>
          )}
        </>
      )}
    </>
  )
}

function Needs({ m }) {
  const parts = [...m.precisa.map((p) => PRECISA_NOME[p]), ...(m.classes ? [`${m.classes} classes diferentes`] : []), ...(m.fraco ? [`fraco contra ${classById(m.fraco).nome}`] : [])]
  return <small>{`${m.min}+ pessoas${parts.length ? ` · precisa: ${parts.join(', ')}` : ''}`}</small>
}

function ExpeditionTab({ data, uid, me, save, lib, busy, run, isAdmin, onResult }) {
  const now = useNow(true)
  const [comida, setComida] = useState('')
  if (!data.grupo) return <p className="t2a-tip">Entre num grupo (aba Grupo) para mandar expedições.</p>
  const exp = data.abertas[0]
  if (!exp) {
    return (
      <>
        <p className="t2a-tip t2r-small">Escolha o monstro. Cada um aceita quando entrar no jogo; quando todo o grupo aceitar, a luta começa sozinha (ou comece antes, com o mínimo).</p>
        <ul className="t2a-list t2r-list">
          {MONSTROS.map((m) => (
            <li key={m.id} className="t2a-row is-static t2r-mon">
              <MonsterSprite m={m} lib={lib} size={56} />
              <span className="t2a-row-main">
                <b>
                  {m.nome}{' '}
                  <span className="t2r-chip" style={{ background: NIVEIS[m.nivel].cor }}>
                    {NIVEIS[m.nivel].nome}
                  </span>
                </b>
                <small>{m.desc}</small>
                <Needs m={m} />
                <small>
                  {durNome(m.minutos)} · poder {m.poder} · {m.moedas} moedas, {m.xp} XP e {BENS[m.material].nome.toLowerCase()}
                </small>
              </span>
              <span className="t2a-row-btns">
                <button type="button" className="t2h-text-btn" disabled={busy || data.membros.length < (isAdmin ? 1 : m.min)} onClick={() => run(() => api.propor(m.id, monsterSnapshot(m)), 'Expedição proposta! Aceite e avise o grupo.')}>
                  Propor
                </button>
              </span>
            </li>
          ))}
        </ul>
        {data.membros.length < 3 && <p className="t2a-tip t2r-small">O grupo precisa de pelo menos 3 pessoas{isAdmin ? ' (o admin pode testar com menos)' : ''}.</p>}
      </>
    )
  }
  const m = monsterById(exp.monstro_id) ?? { ...exp.monstro, id: exp.monstro_id, sprite: { anim: 'graveyard_haunted_tree_laugh' }, material: 'gosma' }
  const aceitei = exp.membros.some((x) => x.user_id === uid)
  const pratos = save.inv.filter((it) => it.bem && BENS[it.bem]?.tipo === 'prato')
  const today = gameTime().day
  const en = energyOf(save, today)
  if (exp.status === 'lutando') {
    const total = new Date(exp.fim) - new Date(exp.inicio)
    const pct = Math.min(1, Math.max(0, (now - new Date(exp.inicio)) / total))
    return (
      <>
        <div className="t2r-fight">
          <div className="t2r-team">
            {exp.membros.map((x, i) => (
              <span key={x.user_id} className="t2r-fighter" style={{ animationDelay: `${i * 0.18}s` }} title={`${nomeDe(x.perfil)} (${classById(x.classe)?.nome})`}>
                <Face char={charDe(x.perfil)} size={36} />
              </span>
            ))}
          </div>
          <span className="t2r-vs">VS</span>
          <span className="t2r-foe">
            <MonsterSprite m={m} lib={lib} size={88} />
          </span>
        </div>
        <b className="t2r-h">
          Lutando contra {m.nome}: termina às {hhmm(exp.fim)} ({left(new Date(exp.fim) - now)})
        </b>
        <span className="t2a-time t2r-time">
          <span style={{ width: `${pct * 100}%` }} />
        </span>
        <p className="t2a-tip t2r-small">A luta continua mesmo com o jogo fechado. Quando acabar, chega uma notificação e a recompensa fica no Histórico.</p>
        {isAdmin && (
          <button type="button" className="t2h-text-btn" disabled={busy} onClick={() => run(() => api.terminarJa(exp.id), 'Terminou (teste do admin). Veja o Histórico.')}>
            Terminar agora (teste do admin)
          </button>
        )}
      </>
    )
  }
  // aberta: esperando o grupo aceitar
  const aceitar = async () => {
    if (en < ENERGIA_EXPEDICAO) return run(async () => {
      throw new Error(`Você precisa de ${ENERGIA_EXPEDICAO} de energia. Coma alguma coisa ou durma.`)
    })
    const energia = comida ? BENS[comida]?.energia ?? 0 : 0
    const r = await run(
      () => api.aceitar(exp.id, { classe: myClass(save).id, papel: myClass(save).papel, nivel: classLevel(save), poder: powerOf(save, energia), comida: comida || null }),
      (st) => (st === 'lutando' ? 'Todo mundo aceitou: a luta começou!' : 'Você aceitou. Falta o resto do grupo.'),
    )
    if (r) onResult({ tipo: 'rpg_aceitou', comida: comida || null })
  }
  return (
    <>
      <div className="t2r-fight is-wait">
        <span className="t2r-foe">
          <MonsterSprite m={m} lib={lib} size={88} />
        </span>
        <span className="t2a-row-main">
          <b>{m.nome}</b>
          <Needs m={m} />
          <small>
            {durNome(m.minutos)} · aceitaram {exp.membros.length} de {data.membros.length} (mínimo {m.min})
          </small>
        </span>
      </div>
      <ul className="t2a-list">
        {data.membros.map((x) => {
          const a = exp.membros.find((y) => y.user_id === x.user_id)
          return (
            <Person key={x.user_id} p={x.perfil} classe={a?.classe ?? x.classe} nivel={a?.nivel ?? x.nivel}>
              <small className={a ? 't2r-yes' : ''}>{a ? `Aceitou${a.comida ? ` · levou ${BENS[a.comida]?.nome.toLowerCase() ?? 'comida'}` : ''}` : 'Esperando'}</small>
            </Person>
          )
        })}
      </ul>
      {!aceitei ? (
        <div className="t2r-form">
          <label className="t2r-small">
            Levar comida (dá mais poder):{' '}
            <select className="t2r-input" value={comida} onChange={(e) => setComida(e.target.value)}>
              <option value="">Nenhuma</option>
              {pratos.map((it) => (
                <option key={it.bem} value={it.bem}>
                  {it.nome} (+{Math.round((BENS[it.bem].energia ?? 0) / 3)} poder)
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="t2h-text-btn is-ok t2a-main" disabled={busy} onClick={aceitar}>
            Aceitar ({ENERGIA_EXPEDICAO} de energia) · poder {powerOf(save, comida ? BENS[comida]?.energia ?? 0 : 0)}
          </button>
        </div>
      ) : (
        <p className="t2a-tip t2r-small">Você já aceitou{me?.display_name ? `, ${me.display_name}` : ''}. Avise o grupo para entrar no jogo e aceitar.</p>
      )}
      <div className="t2a-actions t2r-actions">
        {aceitei && exp.membros.length >= m.min && (
          <button type="button" className="t2h-text-btn is-ok" disabled={busy} onClick={() => run(() => api.comecar(exp.id), 'A luta começou!')}>
            Começar agora ({exp.membros.length} pessoas)
          </button>
        )}
        {aceitei && isAdmin && exp.membros.length < m.min && (
          <button type="button" className="t2h-text-btn" disabled={busy} onClick={() => run(() => api.comecar(exp.id, true), 'Começou (teste do admin).')}>
            Testar com {exp.membros.length} (admin)
          </button>
        )}
        <button type="button" className="t2h-text-btn" disabled={busy} onClick={() => run(() => api.cancelar(exp.id), 'Expedição cancelada.')}>
          Cancelar expedição
        </button>
      </div>
    </>
  )
}

function HistoryTab({ data, uid, lib, busy, run, onResult }) {
  const now = useNow(true)
  const [open, setOpen] = useState(null)
  if (!data.historico.length) return <p className="t2a-tip">Nenhuma luta ainda. Mande uma expedição na aba Expedição!</p>
  return (
    <ul className="t2a-list t2r-list">
      {data.historico.map((h) => {
        const m = monsterById(h.monstro_id) ?? { ...h.monstro, id: h.monstro_id, sprite: { anim: 'graveyard_haunted_tree_laugh' }, material: 'gosma', moedas: 0, xp: 0 }
        const acabou = h.status === 'fim'
        const res = h.resultado?.res
        const eu = h.membros.find((x) => x.user_id === uid)
        const log = acabou ? battleLog(h.membros.map((x) => ({ nome: nomeDe(x.perfil), classe: x.classe })), h.resultado, m) : []
        const prize = acabou && eu ? rewardOf(m, res, eu.classe, h.membros.map((x) => x.classe)) : null
        return (
          <li key={h.id} className="t2r-hist">
            <div className="t2a-row is-static">
              <MonsterSprite m={m} lib={lib} size={44} />
              <span className="t2a-row-main">
                <b>
                  {m.nome}{' '}
                  {acabou ? (
                    <span className={`t2r-chip is-${res}`}>{RES_NOME[res]}</span>
                  ) : (
                    <span className="t2r-chip">Lutando · {left(new Date(h.fim) - now)}</span>
                  )}
                </b>
                <small>{h.membros.map((x) => nomeDe(x.perfil)).join(', ')}</small>
                {prize && (
                  <small>
                    {prize.moedas} moedas · {prize.xp} XP de {classById(eu.classe)?.nome}
                    {prize.qtd ? ` · ${prize.qtd}× ${BENS[prize.material].nome.toLowerCase()}` : ''}
                  </small>
                )}
              </span>
              <span className="t2a-row-btns">
                {acabou && (
                  <button type="button" className="t2h-text-btn" aria-expanded={open === h.id} onClick={() => setOpen(open === h.id ? null : h.id)}>
                    Resumo
                  </button>
                )}
                {acabou && !h.pegou && (
                  <button
                    type="button"
                    className="t2h-text-btn is-ok"
                    disabled={busy}
                    onClick={() =>
                      run(async () => {
                        const r = await api.pegar(h.id)
                        if (r) onResult({ tipo: 'rpg_premio', classe: eu.classe, ...prize, monstro: m.nome, res })
                        return r
                      }, 'Recompensa guardada!')
                    }
                  >
                    Pegar recompensa
                  </button>
                )}
              </span>
            </div>
            {open === h.id && (
              <ul className="t2r-log">
                {log.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/** aviso no canto do jogo: convite novo ou recompensa pronta (some quando não tem nada) */
export function RpgBadge({ onClick }) {
  const { user } = useAuth()
  const uid = user?.id
  const [p, setP] = useState({ convites: 0, prontas: 0 })
  useEffect(() => {
    if (!uid) return undefined
    let alive = true
    const check = () => api.pendencias(uid).then((r) => alive && setP(r))
    check()
    const t = setInterval(check, 60000)
    const stop = api.watchRpg(uid, check)
    return () => {
      alive = false
      clearInterval(t)
      stop()
    }
  }, [uid])
  const total = p.convites + p.prontas
  const text = useMemo(
    () => [p.convites ? `${p.convites} convite${p.convites > 1 ? 's' : ''}` : '', p.prontas ? `${p.prontas} recompensa${p.prontas > 1 ? 's' : ''}` : ''].filter(Boolean).join(' e '),
    [p],
  )
  if (!total) return null
  return (
    <button type="button" className="t2r-badge" onClick={() => onClick(text)} title={`${text} no Portal dos Monstros`}>
      <span aria-hidden="true">⚔️</span>
      <b>{total}</b>
      <span className="t2r-badge-txt">{text}</span>
    </button>
  )
}
