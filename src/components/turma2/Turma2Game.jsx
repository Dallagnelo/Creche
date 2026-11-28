import { useEffect, useMemo, useRef, useState } from 'react'
import DATA from '../../lib/turma2Rooms.json'
import { composeChar } from '../../lib/turma2/character'
import { loadLibrary } from '../../lib/turma2/assets'
import { gameTime } from '../../lib/turma2/clock'
import { compileMap } from '../../lib/turma2/compile'
import { HUD_CODE, isMapRow } from '../../lib/turma2/hudConfig'
import { SKILLS_CODE, addXp, applyLook, levelIn, normalizeSkills, skillById } from '../../lib/turma2/skills'
import {
  BENS,
  CROPS,
  ENERGY_MAX,
  cropDays,
  energyCost,
  energyOf,
  foodEnergy,
  friendKey,
  friendOf,
  giveKit,
  hearts,
  pruneHorta,
  sellPrice,
  setFriend,
  sprinklerSince,
  takeGood,
  wetToday,
  withEnergy,
} from '../../lib/turma2/economy'
import { applyRpgLook, perk } from '../../lib/turma2/rpg'
import { RpgBadge } from './Turma2Rpg'
import { addItem, dropItem, emptySave, fixSave, loadSave, writeSave } from '../../lib/turma2/save'
import { useAuth } from '../../contexts/AuthContext'
import Turma2Hud from './Turma2Hud'
import { START_CODE, listMaps } from '../../services/turma2Maps'
import { flushRemoteSave, loadRemoteSave, queueRemoteSave } from '../../services/turma2Save'
import YouTubeScreen from '../YouTubeScreen'
import Turma2Telao from './Turma2Telao'
import { loadImage } from './game/gameHelpers'
import { useGameEngine } from './game/useGameEngine'
import { useGameCinema } from './game/useGameCinema'
import { makeActivities } from './game/activities'

// Turma 2.0 (teste): as salas prontas do museu do LimeZu, desenhadas só com os sprites do pacote.
// Camadas: chão e paredes → objetos atrás do boneco → boneco → objetos na frente dele
// (cada objeto tem a "linha do pé": se o pé do boneco está mais embaixo, ele passa na frente).
// Anda com as setas / WASD ou clicando no chão. Por enquanto é só você na sala (modo de teste).

// extraRows: mapas do editor (se não vier, busca os do banco); startCode: em qual mapa começar
// character: o personagem de quem joga (montado em "Meu personagem"); sem ele, o boneco padrão
export default function Turma2Game({ extraRows = null, startCode = null, character: rawCharacter = null }) {
  const [code, setCode] = useState(startCode ?? DATA.rooms.find((r) => !r.hidden)?.code ?? START_CODE)
  const [rows, setRows] = useState(extraRows ?? [])
  // habilidades (editáveis pelo admin na aba Habilidades)
  const skillsData = rows.find((r) => r.code === SKILLS_CODE)?.data
  const skillsCfg = useMemo(() => normalizeSkills(skillsData), [skillsData])
  const skillsRef = useRef(skillsCfg)
  skillsRef.current = skillsCfg
  const { user, profile, isAdmin } = useAuth()
  const uid = user?.id
  const [save, setSave] = useState(() => giveKit(loadSave(uid)))
  const saveRef = useRef(save)
  saveRef.current = save
  // o visual liberado de uma habilidade (vestido na janela Habilidades) vai por cima do personagem
  const character = rawCharacter ? applyRpgLook(applyLook(rawCharacter, save, skillsCfg), save) : null
  const charKey = JSON.stringify(character)
  // o boneco de quem joga: trocar de visual não reinicia o mapa (só troca a imagem)
  const heroRef = useRef(null)
  const libRef = useRef(null)
  const charRef = useRef(character)
  charRef.current = character
  useEffect(() => {
    let alive = true
    const p = charRef.current ? composeChar(charRef.current) : loadImage(DATA.character)
    p.then((img) => alive && (heroRef.current = img)).catch(() => {})
    return () => {
      alive = false
    }
  }, [charKey])
  const [compiled, setCompiled] = useState({}) // mapas do editor já montados para o jogo
  const arriveRef = useRef(null) // ao passar por uma porta: onde o boneco aparece no outro lugar
  const [showGrid, setShowGrid] = useState(false)
  const [ready, setReady] = useState(false)
  const [talk, setTalk] = useState(null) // com quem está conversando (aparece a caixa de conversa)
  const [toast, setToast] = useState(null) // aviso de item pego
  const [lib, setLib] = useState(null) // biblioteca de peças (ícones da mochila)
  const [act, setAct] = useState(null) // o que dá para fazer onde o boneco está (E faz)
  const [job, setJob] = useState(null) // atividade aberta (minijogo, loja…)
  const jobRef = useRef(null)
  jobRef.current = job
  const worldRef = useRef(null) // o mapa vivo (NPCs, atividades, onde o boneco está), para as entregas
  const [notes, setNotes] = useState([]) // avisos de XP e de nível novo
  const [chat, setChat] = useState([]) // últimas mensagens do chat (multiplayer)
  // cinema (Cine Planeta): o vídeo do telão, se você está sentado numa poltrona e a cabine do telão aberta
  const cineRef = useRef(null)
  const [ytVideo, setYtVideo] = useState(null)
  const [seated, setSeated] = useState(false)
  const [telaoOpen, setTelaoOpen] = useState(false)
  const socialRef = useRef(null) // o motor do jogo preenche: falar (chat) e emote, para mim e para os outros
  const note = (text, extra = {}) => {
    const id = Math.random()
    setNotes((list) => [...list.slice(-4), { id, text, ...extra }])
    setTimeout(() => setNotes((list) => list.filter((n) => n.id !== id)), extra.big ? 4200 : 2600)
  }
  /** grava o progresso (navegador agora; banco daqui a pouco) */
  const commit = (next) => {
    const s = { ...next, at: Date.now() }
    saveRef.current = s
    setSave(s)
    writeSave(uid, s)
    queueRemoteSave(uid, s)
  }
  /** soma XP numa habilidade e avisa (nível novo, passiva nova, visual liberado) */
  const gainXp = (s, id, amount) => {
    const cfg = skillsRef.current
    const r = addXp(s, cfg, id, amount)
    const sk = skillById(cfg, id)
    note(`+${r.gain} XP · ${sk.nome}`, { cor: sk.cor })
    if (r.up) note(`${sk.nome} subiu para o nível ${r.up}!`, { big: true, cor: sk.cor })
    for (const p of r.unlocked) note(`Passiva nova: ${p.nome} — ${p.desc}`, { big: true, cor: sk.cor })
    if (r.visual) note(`Visual liberado: ${r.visual.nome} (K para vestir)`, { big: true, cor: sk.cor })
    return r.save
  }
  const hudRef = useRef({})
  hudRef.current = {
    talk: (n) => {
      // conversou pela primeira vez no dia: amizade sobe um pouco
      const today = gameTime().day
      const room = worldRef.current?.room.code
      let s = saveRef.current
      if (n && !n.bicho && room && friendOf(s, room, n.id).falou !== today) {
        const a = friendOf(s, room, n.id)
        s = setFriend(s, room, n.id, { ...a, pts: (a.pts ?? 0) + (perk(s, 'streamer') ? 30 : 20), falou: today, nome: n.nome })
        commit(s)
      }
      const pts = n && room ? friendOf(s, room, n.id).pts ?? 0 : 0
      const h = hearts(pts)
      const fala = n && (h >= 3 && n.falaAmigo ? n.falaAmigo : n.fala)
      setTalk((cur) => ((cur?.id ?? null) === (n?.id ?? null) && cur?.pts === pts ? cur : n && { id: n.id, nome: n.nome, fala, c: n.c, pts, coracoes: h }))
    },
    chat: (msg) => setChat((list) => [...list.slice(-5), { ...msg, at: Date.now(), key: Math.random() }]),
    act: (a) => setAct((cur) => (cur?.key === a?.key && cur?.label === a?.label ? cur : a)),
    collect: (roomCode, item) => {
      // Policial: moeda achada no chão vale o dobro
      commit(addItem(saveRef.current, roomCode, item.tipo === 'moeda' && perk(saveRef.current, 'policial') ? { ...item, valor: (item.valor || 1) * 2 } : item))
      setToast({ item, at: Date.now() })
    },
  }
  // progresso: o do navegador na hora; o do banco quando chegar (fica o mais novo)
  useEffect(() => {
    let alive = true
    const loaded = loadSave(uid)
    const local = giveKit(loaded)
    saveRef.current = local
    setSave(local)
    if (local !== loaded) writeSave(uid, local) // primeira vez: o kit inicial já fica guardado
    if (uid) {
      loadRemoteSave(uid).then((remote) => {
        if (!alive) return
        const r = fixSave(remote)
        if (r && (r.at ?? 0) >= (saveRef.current.at ?? 0)) {
          const k = giveKit(r)
          saveRef.current = k
          setSave(k)
          writeSave(uid, k)
        } else if (saveRef.current.at) queueRemoteSave(uid, saveRef.current)
      })
    }
    return () => {
      alive = false
    }
  }, [uid])
  // ao sair da aba ou do jogo: grava no banco o que ainda estava esperando
  useEffect(() => {
    const onHide = () => document.visibilityState === 'hidden' && flushRemoteSave()
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', flushRemoteSave)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', flushRemoteSave)
      flushRemoteSave()
    }
  }, [])
  useEffect(() => {
    if (!toast) return undefined
    const t = setTimeout(() => setToast(null), 2200)
    return () => clearTimeout(t)
  }, [toast])
  useEffect(() => {
    loadLibrary()
      .then((l) => {
        libRef.current = l
        setLib(l)
      })
      .catch(() => {})
  }, [])

  const fxRef = useRef(null) // efeitinho no mapa (terra voando, água) — o motor do jogo preenche
  const { startAct, jobResult } = makeActivities({ saveRef, skillsRef, worldRef, note, cineRef, setTelaoOpen, commit, setJob, gainXp, socialRef, hudRef, fxRef, uid, closeJob: () => closeJob(), job })
  // ---------------------------------------------------------------- ferramentas (Espaço / C / clique no quadradinho)
  /** usa o item escolhido na barra no quadradinho (tx, ty); devolve true se fez alguma coisa */
  const useItemAt = (tx, ty) => {
    const s = saveRef.current
    const cfg = skillsRef.current
    const w = worldRef.current
    if (!w || jobRef.current) return false
    const key = s.hot[s.sel]
    const id = key && s.inv.find((it) => it.key === key)?.bem
    if (!id) return false
    const b = BENS[id]
    const today = gameTime().day
    const k = `${tx},${ty}`
    const plots = s.horta?.[w.room.code] ?? {}
    const plot = plots[k]
    const en = energyOf(s, today)
    const cost = energyCost(s, id)
    if (cost && en < cost) {
      note('Você está exausto… coma alguma coisa (escolha a comida na barra e aperte Espaço) ou espere a manhã.')
      return true
    }
    const setPlot = (next, p) => ({ ...next, horta: { ...next.horta, [w.room.code]: { ...plots, [k]: p } } })
    if (id === 'enxada') {
      if (!w.hortaSet.has(k)) return note('Aqui não dá para arar. Use a enxada na terra da horta.'), true
      if (plot) return true
      commit(withEnergy(setPlot(s, { arado: today }), today, en - cost))
      fxRef.current?.('terra', k)
      return true
    }
    if (id === 'irrigador') {
      if (!w.hortaSet.has(k)) return note('O irrigador vai na terra da horta.'), true
      if (plot?.planta || plot?.irrigador !== undefined) return note('Aqui já tem coisa. Escolha um quadradinho vazio.'), true
      commit(setPlot(takeGood(s, id), { irrigador: today }))
      fxRef.current?.('agua', k)
      note('Irrigador colocado: a partir de amanhã ele rega os 4 quadradinhos em volta.')
      return true
    }
    if (plot?.irrigador !== undefined) return note('Aqui tem um irrigador (E para recolher).'), true
    if (id === 'regador') {
      if (!plot) return note('Regue a terra arada (use a enxada antes).'), true
      if (wetToday(plot, today, sprinklerSince(plots, k))) return true
      commit(withEnergy(setPlot(s, { ...plot, agua: [...(plot.agua ?? []).slice(-14), today] }), today, en - cost))
      fxRef.current?.('agua', k)
      return true
    }
    if (b.tipo === 'semente') {
      const crop = CROPS[b.planta]
      if (!plot || plot.planta) return note(plot ? 'Já tem planta aqui.' : 'Plante na terra arada (use a enxada antes).'), true
      if (levelIn(s, 'jardinagem') < crop.nivel) return note(`${BENS[b.planta].nome} precisa de Jardinagem ${crop.nivel}.`), true
      commit(setPlot(takeGood(s, id), { arado: today, planta: b.planta, dia: today, agua: (plot.agua ?? []).filter((d) => d === today) }))
      fxRef.current?.('terra', k)
      note(`Plantou ${BENS[b.planta].nome}: regue todo dia (${cropDays(s, cfg, b.planta)} dias).`)
      return true
    }
    if (id === 'vara') {
      if (!w.room.wet?.has(k)) return note('Olhe para a água para pescar.'), true
      commit(withEnergy(s, today, en - cost))
      setJob({ tipo: 'pesca' })
      return true
    }
    if (b.energia) {
      // comer (no Stardew: escolher a comida e usar)
      if (en >= ENERGY_MAX) return note('Sua energia já está cheia.'), true
      commit(withEnergy(takeGood(s, id), today, en + foodEnergy(s, id)))
      note(`Comeu ${b.nome}: +${foodEnergy(s, id)} de energia`)
      return true
    }
    return false
  }
  const useItemRef = useRef(null)
  useItemRef.current = (tx, ty) => {
    const s = saveRef.current
    const key = s.hot[s.sel]
    const id = key && s.inv.find((it) => it.key === key)?.bem
    const did = useItemAt(tx, ty)
    if (did && id && BENS[id]?.tipo === 'ferramenta' && id !== 'vara') socialRef.current?.tool(id)
    return did
  }

  // de manhã (a cada hora real): a caixa de venda paga o que foi posto ontem
  const dayRef = useRef(null)
  useEffect(() => {
    const check = () => {
      const g = gameTime()
      if (dayRef.current !== null && dayRef.current !== g.day) note(`Bom dia! ${g.weekday}, dia ${g.dayOfSeason} de ${g.season}.`, { big: true, cor: '#ffd166' })
      dayRef.current = g.day
      const pruned = pruneHorta(saveRef.current.horta, g.day)
      if (pruned !== saveRef.current.horta) commit({ ...saveRef.current, horta: pruned })
      const s = saveRef.current
      if (s.caixa && s.caixa.dia < g.day && Object.keys(s.caixa.itens ?? {}).length) {
        const cfg = skillsRef.current
        const total = Object.entries(s.caixa.itens).reduce((sum, [id, q]) => sum + sellPrice(s, cfg, id) * q, 0)
        commit(gainXp({ ...s, caixa: null, moedas: s.moedas + total }, 'comercio', Math.max(1, Math.round(total * 0.8))))
        note(`A caixa de venda rendeu ${total} moedas!`, { big: true, cor: '#ffe08a' })
      }
    }
    check()
    const t = setInterval(check, 1000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid])
  // quem sou eu no "ao vivo" (os outros me veem com este nome e este personagem)
  const liveMeRef = useRef(null)
  liveMeRef.current = uid ? { id: uid, nome: profile?.display_name ?? 'Alguém', char: character } : null

  const closeJob = () => {
    setJob(null)
    boxRef.current?.focus({ preventScroll: true })
  }
  const [missing, setMissing] = useState(null) // imagem que não carregou (arquivo faltando?)
  const boxRef = useRef(null)
  const canvasRef = useRef(null)
  const gridRef = useRef(showGrid)
  gridRef.current = showGrid
  const builtin = DATA.rooms.find((r) => r.code === code)
  const room = builtin ?? compiled[code] ?? null

  useEffect(() => {
    if (extraRows) return undefined
    let alive = true
    listMaps().then((list) => alive && setRows(list))
    return () => {
      alive = false
    }
  }, [extraRows])

  // mapa feito no editor: monta o chão e o resto na primeira vez que alguém entra nele
  useEffect(() => {
    if (builtin || compiled[code]) return undefined
    const row = rows.find((r) => r.code === code)
    if (!row) return undefined
    let alive = true
    setReady(false)
    compileMap(row)
      .then((r) => alive && setCompiled((c) => ({ ...c, [code]: r })))
      .catch((error) => alive && setMissing(error.message))
    return () => {
      alive = false
    }
  }, [builtin, code, compiled, rows])

  useEffect(() => {
    setTalk(null)
  }, [room])

  useGameEngine({ room, setReady, setMissing, canvasRef, boxRef, arriveRef, useItemRef, saveRef, heroRef, charRef, worldRef, hudRef, libRef, skillsRef, fxRef, liveMeRef, setYtVideo, setSeated, cineRef, setTelaoOpen, socialRef, jobRef, setCode, gridRef })

  const { telaoRect, getCinemaPeople, cinemaSay, cineApi } = useGameCinema({ cineRef, worldRef, uid, profile, heroRef, boxRef, room, socialRef })
  // o jogo vai até o fim da tela (mede onde ele começa na página; o CSS usa --t2-top)
  useEffect(() => {
    const box = boxRef.current
    if (!box) return undefined
    const measure = () => box.style.setProperty('--t2-top', `${Math.round(box.getBoundingClientRect().top + window.scrollY)}px`)
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  const label = room?.label ?? rows.find((r) => r.code === code)?.name ?? code
  const maps = [
    ...DATA.rooms.filter((r) => !r.hidden).map((r) => ({ code: r.code, label: r.label })),
    ...rows.filter(isMapRow).map((r) => ({ code: r.code, label: r.name, draft: !r.published })),
  ]
  return (
    <div className="t2">
      <div ref={boxRef} className="t2-stage" tabIndex={0} aria-label={`${label}: ande com as setas ou WASD, ou clique no chão`}>
        <canvas ref={canvasRef} />
        {room?.telao && ytVideo && (
          <YouTubeScreen
            video={ytVideo}
            rect={telaoRect}
            onStop={() => cineRef.current?.setYt(null)}
            onControl={(next) => cineRef.current?.setYt(next)}
            audience={getCinemaPeople}
            cinema={seated}
            onCinemaClose={() => {
              cineRef.current?.stand()
              boxRef.current?.focus({ preventScroll: true })
            }}
            onReact={cinemaSay}
            onChat={cinemaSay}
            cine={cineApi}
          />
        )}
        {room?.telao && telaoOpen && (
          <Turma2Telao
            video={ytVideo}
            name={profile?.display_name ?? ''}
            onPlay={(v) => cineRef.current?.setYt(v)}
            onClose={() => {
              setTelaoOpen(false)
              boxRef.current?.focus({ preventScroll: true })
            }}
          />
        )}
        {!ready && (
          <p className="t2-loading">
            {missing ? (
              <span>
                Não achei a imagem <code>{missing}</code>.<br />
                Confira se as pastas do pacote (<code>public/limezu</code>) subiram com as imagens.
              </span>
            ) : (
              'Carregando o mapa…'
            )}
          </p>
        )}
        {room && (
          <Turma2Hud
            stageRef={boxRef}
            config={rows.find((r) => r.code === HUD_CODE)?.data}
            skillsCfg={skillsCfg}
            act={act}
            onAct={startAct}
            job={job}
            onJobResult={jobResult}
            onJobClose={closeJob}
            notes={notes}
            onWear={(id) => commit({ ...saveRef.current, veste: id })}
            lib={lib}
            name={profile?.display_name ?? 'Você'}
            character={character}
            mapName={label}
            maps={maps}
            code={code}
            onPickMap={(c) => {
              setCode(c)
              boxRef.current?.focus({ preventScroll: true })
            }}
            outdoor={!!room.outdoor}
            grid={showGrid}
            onGrid={setShowGrid}
            talk={talk}
            save={save}
            toast={toast}
            onSave={(fn) => commit(fn(saveRef.current))}
            onDrop={(key) => commit(dropItem(saveRef.current, key))}
            chat={chat}
            onSay={(t) => socialRef.current?.say(t)}
            onEmote={(e) => socialRef.current?.emote(e)}
            people={(room.npcs ?? []).filter((n) => !n.bicho && n.nome).map((n) => ({ id: friendKey(code, n.id), nome: n.nome, c: n.c }))}
            onResetSave={() => {
              commit(giveKit(emptySave()))
              setCompiled({}) // os itens voltam para os mapas
            }}
          />
        )}
        {room && !job && (
          <RpgBadge
            admin={isAdmin}
            onOpen={(tipo) => setJob({ tipo })}
            onClick={(t) => note(`Você tem ${t}: abra o Portal dos Monstros, no Bosque do Acampamento.`, { big: true, cor: '#a97bff' })}
          />
        )}
      </div>
    </div>
  )
}
