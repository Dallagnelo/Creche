import { useEffect, useMemo, useRef, useState } from 'react'
import DATA from '../../lib/turma2Rooms.json'
import { composeChar, drawChar } from '../../lib/turma2/character'
import { TOOL_ANIMS, FISH, drawWithTool, loadToolAnims, skinOf, useTime } from '../../lib/turma2/toolAnim'
import { animAtlasUrl, atlasUrl, loadBichos, loadLibrary } from '../../lib/turma2/assets'
import { FENCES, drawTilled, loadAutotiles } from '../../lib/turma2/autotile'
import { gameTime, skyLight } from '../../lib/turma2/clock'
import { compileMap } from '../../lib/turma2/compile'
import { HUD_CODE, isMapRow } from '../../lib/turma2/hudConfig'
import { SKILLS_CODE, addXp, applyLook, bonus, levelIn, normalizeSkills, skillById } from '../../lib/turma2/skills'
import {
  BENS, CROPS, ENERGY_MAX, FIX_AGAIN_MS, GHOST_BACK_MS, animalState, countOf, cropDays, energyCost, energyOf, foodEnergy, friendKey, friendOf, fruitReady, giftPoints, giveGood, giveKit,
  grownDays, growth, hearts, productOf, pruneHorta, sellPrice, setFriend, sprinklerSince, takeGood, wetToday, withEnergy,
} from '../../lib/turma2/economy'
import {
  ENERGIA_EXPEDICAO, EVO_NIVEL, SLOTS, TIERS, TIER_COR, addClassXp, applyRpgLook, chooseClass, classById, classEvo, classLevel, equipOf, myClass, nextRecipe, perk, powerOf,
  rpgOf, setRpg, weaponGlow,
} from '../../lib/turma2/rpg'
import { souEu } from '../../services/turma2Rpg'
import { RpgBadge } from './Turma2Rpg'
import { EMOTES_URL, cleanChat, emoteById } from '../../lib/turma2/social'
import { addItem, dropItem, emptySave, fixSave, isTaken, loadSave, writeSave } from '../../lib/turma2/save'
import { useAuth } from '../../contexts/AuthContext'
import Turma2Hud, { HUD } from './Turma2Hud'
import { START_CODE, listMaps } from '../../services/turma2Maps'
import { flushRemoteSave, loadRemoteSave, queueRemoteSave } from '../../services/turma2Save'
import { joinMapLive } from '../../services/turma2Live'

// Turma 2.0 (teste): as salas prontas do museu do LimeZu, desenhadas só com os sprites do pacote.
// Camadas: chão e paredes → objetos atrás do boneco → boneco → objetos na frente dele
// (cada objeto tem a "linha do pé": se o pé do boneco está mais embaixo, ele passa na frente).
// Anda com as setas / WASD ou clicando no chão. Por enquanto é só você na sala (modo de teste).

const T = 16
const ACT_ORDER = ['portal', 'oficina', 'classes', 'venda', 'bau', 'cama', 'fruta', 'feno', 'correio', 'loja', 'cozinha', 'conserto', 'coragem'] // perto de duas coisas: vale a primeira
const ghostGone = new Map() // fantasmas enfrentados há pouco ("mapa:id" → quando)
const SPEED = 4.2 // quadradinhos por segundo, andando
const RUN = 6.4 // correndo (segurando Shift)
const ZOOM_KEY = 't2-zoom2' // ajuste de zoom de cada um (- e = no teclado, ou a rodinha do mouse no mapa)
const DIRV = { right: [1, 0], up: [0, -1], left: [-1, 0], down: [0, 1] }
const REACH = 1 // até onde a ferramenta alcança (quadradinhos em volta do boneco)
const TOOL_KEYS = ['Space', 'KeyC'] // usar a ferramenta / item da barra (como o clique no Stardew)
const DIRS = { right: 0, up: 1, left: 2, down: 3 } // ordem das colunas na folha do boneco
const KEYS = {
  ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1],
  ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0],
}
const BASE = '/limezu/t2/'

const images = new Map()
const loadImage = (name) => {
  if (!images.has(name)) {
    images.set(
      name,
      new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => {
          images.delete(name) // deixa tentar de novo depois
          reject(new Error(name.startsWith('/') ? name : `${BASE}${name}.png`))
        }
        img.src = name.startsWith('/') ? name : `${BASE}${name}.png`
      }),
    )
  }
  return images.get(name)
}

const n7pose = (n) => (n.modo === 'senta' ? 'senta' : n.modo === 'celular' ? 'celular' : n.next ? 'anda' : 'parado')

/** balão com o nome (se tiver) e a fala, quebrando as linhas; a ponta fica em (cx, bottom) */
const free = (room, x, y) => y >= 0 && x >= 0 && y < room.walk.length && x < room.walk[0].length && room.walk[y][x] === '.'
const dirOf = (dx, dy) => (dx > 0 ? 'right' : dx < 0 ? 'left' : dy < 0 ? 'up' : 'down')

// caminho até o quadradinho clicado (ou até o mais perto dele que dá para chegar)
function findPath(room, from, to) {
  const w = room.walk[0].length
  const key = (x, y) => y * w + x
  const prev = new Map([[key(from.x, from.y), null]])
  const queue = [from]
  let best = from
  let bestD = Math.abs(from.x - to.x) + Math.abs(from.y - to.y)
  while (queue.length) {
    const cur = queue.shift()
    const d = Math.abs(cur.x - to.x) + Math.abs(cur.y - to.y)
    if (d < bestD) {
      best = cur
      bestD = d
    }
    if (d === 0) break
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cur.x + dx
      const ny = cur.y + dy
      if (!free(room, nx, ny) || prev.has(key(nx, ny))) continue
      prev.set(key(nx, ny), cur)
      queue.push({ x: nx, y: ny })
    }
  }
  const path = []
  for (let p = best; p && (p.x !== from.x || p.y !== from.y); p = prev.get(key(p.x, p.y))) path.unshift(p)
  return path
}

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

  // ---------------------------------------------------------------- atividades (E)
  const startAct = (a) => {
    const s = saveRef.current
    const cfg = skillsRef.current
    const w = worldRef.current
    const need = { pesca: 'vara', cozinha: 'panela', conserto: 'caixa' }[a.tipo]
    if (need && countOf(s, need) === 0) {
      note(`Você precisa de: ${BENS[need].nome}. Compre numa loja.`)
      return
    }
    if (a.tipo === 'conserto' || a.tipo === 'coragem') {
      const today = gameTime().day
      const en = energyOf(s, today)
      if (en < energyCost(s, a.tipo)) {
        note('Você está exausto… coma alguma coisa ou espere a manhã.')
        return
      }
      commit(withEnergy(s, today, en - energyCost(s, a.tipo)))
    }
    if (['pesca', 'cozinha', 'conserto', 'loja', 'coragem', 'portal', 'oficina', 'classes'].includes(a.tipo)) setJob({ tipo: a.tipo, id: a.id })
    else if (a.tipo === 'venda' || a.tipo === 'bau') setJob({ tipo: a.tipo })
    else if (a.tipo === 'fruta') {
      const today = gameTime().day
      if (!fruitReady(s, w.room.code, a.id, today)) return
      const qtd = 1 + (Math.random() < 0.4 ? 1 : 0) + (Math.random() * 100 < bonus(s, cfg, 'jardinagem', 'dobro') ? 1 : 0)
      const next = giveGood({ ...s, frutas: { ...s.frutas, [w.room.code]: { ...s.frutas?.[w.room.code], [a.id]: today } } }, a.fruta, qtd)
      commit(gainXp(next, 'jardinagem', 4 * qtd))
      note(`Colheu ${qtd}× ${BENS[a.fruta].nome}. A árvore dá de novo daqui a uns dias.`)
    } else if (a.tipo === 'feno') {
      const today = gameTime().day
      if (s.fenoDia === today) return
      commit({ ...giveGood(s, 'feno', 5), fenoDia: today })
      note('Pegou 5 fenos. Dê um para cada bicho (E perto dele).')
    } else if (a.tipo === 'bicho') {
      const today = gameTime().day
      const room = w.room.code
      const b = s.bichos?.[room]?.[a.id] ?? {}
      const set = (patch, next = s) => ({ ...next, bichos: { ...next.bichos, [room]: { ...next.bichos?.[room], [a.id]: { ...b, ...patch } } } })
      if (a.step === 'coletar') {
        const prod = productOf(a.bicho)
        const qtd = Math.random() * 100 < bonus(s, cfg, 'criacao', 'dobro') ? 2 : 1
        commit(gainXp(set({ coletou: today }, giveGood(s, prod, qtd)), 'criacao', 10 * qtd))
        note(`Coletou ${qtd > 1 ? '2× ' : ''}${BENS[prod].nome}!`)
      } else if (a.step === 'alimentar') {
        if (!countOf(s, 'feno')) return note('Você não tem feno. Pegue no monte de feno ou compre na barraca.')
        commit(gainXp(set({ comeu: today, amor: (b.amor ?? 0) + 2 }, takeGood(s, 'feno')), 'criacao', 5))
        note(productOf(a.bicho) ? `Deu feno. Amanhã tem ${BENS[productOf(a.bicho)].nome.toLowerCase()}!` : 'Deu feno. Ele ficou feliz!')
      } else if (a.step === 'carinho') {
        commit(gainXp(set({ carinho: today, amor: (b.amor ?? 0) + 1 }), 'criacao', 3))
        socialRef.current?.emote('coracao', a.npc)
      }
    } else if (a.tipo === 'presente') {
      const today = gameTime().day
      const key = s.hot[s.sel]
      const id = key && s.inv.find((it) => it.key === key)?.bem
      if (!id) return
      const npc = w.npcs.find((n) => n.id === a.id)
      const pts = Math.round(giftPoints(npc, id) * (perk(s, 'streamer') && giftPoints(npc, id) > 0 ? 1.5 : 1))
      const am = friendOf(s, w.room.code, a.id)
      commit(setFriend(takeGood(s, id), w.room.code, a.id, { ...am, pts: Math.max(0, (am.pts ?? 0) + pts), presente: today, nome: npc.nome }))
      note(pts >= 80 ? `${npc.nome} amou o presente! ♥` : pts > 0 ? `${npc.nome} gostou do presente.` : `${npc.nome} não gostou nada disso…`, { cor: pts > 0 ? '#ff7aa8' : '#8a8a8a' })
      socialRef.current?.emote(pts >= 80 ? 'coracao' : pts > 0 ? 'nota' : 'triste', a.id)
      hudRef.current.talk(npc)
    } else if (a.tipo === 'cama') {
      const today = gameTime().day
      if (s.dormiu === today) return note('Você já dormiu hoje. Volte amanhã!')
      commit({ ...withEnergy(s, today, ENERGY_MAX), dormiu: today })
      fxRef.current?.('dormir')
      note('Você tirou um cochilo e acordou com a energia cheia. 💤', { big: true, cor: '#9ad0ff' })
    } else if (a.tipo === 'irrigador') {
      const plots = s.horta?.[w.room.code] ?? {}
      const { [a.cell]: _gone, ...rest } = plots
      commit(giveGood({ ...s, horta: { ...s.horta, [w.room.code]: rest } }, 'irrigador'))
      note('Recolheu o irrigador.')
    }
    else if (a.tipo === 'colher') {
      const today = gameTime().day
      const plots = s.horta?.[w.room.code] ?? {}
      const plot = plots[a.cell]
      if (!plot?.planta || growth(s, cfg, plot, today, sprinklerSince(plots, a.cell)) < 1) return
      const qtd = Math.random() * 100 < bonus(s, cfg, 'jardinagem', 'dobro') ? 2 : 1
      // colheu: a terra continua arada (e molhada, se já regou hoje)
      let next = giveGood({ ...s, horta: { ...s.horta, [w.room.code]: { ...plots, [a.cell]: { arado: today, agua: (plot.agua ?? []).filter((d) => d === today) } } } }, plot.planta, qtd)
      next = gainXp(next, 'jardinagem', CROPS[plot.planta].xp * qtd)
      commit(next)
      fxRef.current?.('colher', a.cell)
      socialRef.current?.tool('colher')
      note(`Colheu ${qtd > 1 ? '2× ' : ''}${BENS[plot.planta].nome}`)
    } else if (a.tipo === 'correio') {
      const me = w.me
      const far = (x, y) => Math.abs(x - me.x) + Math.abs(y - me.y)
      const opts = [
        ...w.npcs.filter((n) => n.nome).map((n) => ({ tipo: 'npc', id: n.id, nome: n.nome, x: n.x, y: n.y })),
        ...w.acts.filter((x) => x.tipo === 'caixa_correio').map((x) => ({ tipo: 'obj', id: x.id, nome: 'a caixa de correio marcada', x: x.cells[0][0], y: x.cells[0][1] })),
      ].filter((o) => far(o.x, o.y) >= 8)
      if (!opts.length) {
        note('Nenhum endereço para entregar neste mapa.')
        return
      }
      const to = opts[Math.floor(Math.random() * opts.length)]
      const dist = far(to.x, to.y)
      commit({ ...s, entrega: { mapa: w.room.code, para: { tipo: to.tipo, id: to.id }, nome: to.nome, dist, ate: Date.now() + (20 + dist * 1.1) * 1000 } })
      note(`Pegou um pacote! Leve para ${to.nome}.`, { big: true, cor: skillById(cfg, 'entregas').cor })
    } else if (a.tipo === 'entregar') {
      const e = s.entrega
      const late = Date.now() > e.ate
      const coins = Math.max(1, Math.round((4 + e.dist / 3) * (1 + bonus(s, cfg, 'entregas', 'moedas') / 100) * (perk(s, 'atleta') ? 1.2 : 1) * (late ? 0.5 : 1)))
      const next = gainXp({ ...s, entrega: null, moedas: s.moedas + coins }, 'entregas', Math.round((10 + e.dist / 2) * (late ? 0.5 : 1)))
      commit(next)
      note(`Entregue! +${coins} moedas${late ? ' (atrasou: metade)' : ''}`)
    }
  }
  /** conta para o banco a classe, o nível e o poder (os colegas veem no Portal) */
  const syncRpg = (s) => {
    const c = myClass(s)
    if (uid && c) souEu(c.id, classLevel(s), powerOf(s)).catch(() => {})
  }
  const jobResult = (r) => {
    const s = saveRef.current
    const cfg = skillsRef.current
    const room = worldRef.current?.room
    if (r.tipo === 'lance') {
      // pescar de novo: cada lance gasta energia (o primeiro já gastou ao usar a vara)
      const today = gameTime().day
      const en = energyOf(s, today)
      if (en < energyCost(s, 'vara')) {
        closeJob()
        note('Você está exausto… coma alguma coisa ou espere a manhã.')
        return
      }
      commit(withEnergy(s, today, en - energyCost(s, 'vara')))
    } else if (r.tipo === 'pesca') {
      commit(gainXp(giveGood(s, r.fish.id, r.fish.qtd), 'pesca', r.fish.xp * r.fish.qtd))
    } else if (r.tipo === 'cozinha') {
      let next = s
      for (const u of r.uses) next = takeGood(next, u)
      commit(gainXp(giveGood(next, r.dish, r.qtd), 'culinaria', r.xp))
    } else if (r.tipo === 'conserto') {
      const lv = levelIn(s, 'mecanica')
      const dbl = Math.random() * 100 < bonus(s, cfg, 'mecanica', 'dobro') ? 2 : 1
      const coins = Math.round((4 + lv / 4) * (1 + bonus(s, cfg, 'mecanica', 'moedas') / 100) * (perk(s, 'engenheiro') ? 1.25 : 1) * dbl)
      const next = { ...s, moedas: s.moedas + coins, consertos: { ...s.consertos, [room.code]: { ...s.consertos?.[room.code], [job.id]: Date.now() } } }
      commit(gainXp(next, 'mecanica', Math.round(18 + lv / 2)))
      note(`+${coins} moedas pelo conserto${dbl > 1 ? ' (pagaram em dobro!)' : ''}`)
    } else if (r.tipo === 'coragem') {
      ghostGone.set(`${room.code}:${job.id}`, Date.now())
      if (!r.ok) {
        commit(gainXp(s, 'coragem', 5))
        return
      }
      const lv = levelIn(s, 'coragem')
      const coins = Math.round((6 + lv / 3) * (1 + bonus(s, cfg, 'coragem', 'moedas') / 100))
      let next = { ...s, moedas: s.moedas + coins }
      const goo = Math.random() * 100 < 35 + bonus(s, cfg, 'coragem', 'dobro')
      if (goo) next = giveGood(next, 'gosma')
      commit(gainXp(next, 'coragem', 30))
      note(`+${coins} moedas${goo ? ' e uma gosma de fantasma' : ''}`)
    } else if (r.tipo === 'caixa' || r.tipo === 'tirar') {
      // caixa de venda: põe hoje, recebe na manhã seguinte (dá para tirar de volta no mesmo dia)
      const today = gameTime().day
      const box = s.caixa?.dia === today ? s.caixa : { dia: today, itens: {} }
      const have = r.tipo === 'caixa' ? countOf(s, r.id) : box.itens[r.id] ?? 0
      const qtd = Math.min(have, r.qtd)
      if (!qtd) return
      const itens = { ...box.itens, [r.id]: (box.itens[r.id] ?? 0) + (r.tipo === 'caixa' ? qtd : -qtd) }
      if (!itens[r.id]) delete itens[r.id]
      const moved = r.tipo === 'caixa' ? takeGood(s, r.id, qtd) : giveGood(s, r.id, qtd)
      commit({ ...moved, caixa: { dia: today, itens } })
    } else if (r.tipo === 'guardar' || r.tipo === 'retirar') {
      // baú: passa itens entre a mochila e o baú (o baú guarda do mesmo jeito que a mochila)
      const from = r.tipo === 'guardar' ? s.inv : s.bau ?? []
      const it = from.find((x) => x.key === r.key)
      if (!it) return
      const qtd = Math.min(it.qtd, r.qtd)
      const take = (list) => list.flatMap((x) => (x.key !== r.key ? [x] : x.qtd > qtd ? [{ ...x, qtd: x.qtd - qtd }] : []))
      const put = (list) => (list.some((x) => x.key === r.key) ? list.map((x) => (x.key === r.key ? { ...x, qtd: x.qtd + qtd } : x)) : [...list, { ...it, qtd }])
      commit(r.tipo === 'guardar' ? { ...s, inv: take(s.inv), bau: put(s.bau ?? []) } : { ...s, inv: put(s.inv), bau: take(s.bau ?? []) })
    } else if (r.tipo === 'vender') {
      const have = countOf(s, r.id)
      const qtd = Math.min(have, r.qtd)
      if (!qtd) return
      const total = sellPrice(s, cfg, r.id) * qtd
      commit(gainXp({ ...takeGood(s, r.id, qtd), moedas: s.moedas + total }, 'comercio', Math.max(1, Math.round(total * 0.8))))
    } else if (r.tipo === 'rpg_classe') {
      const next = chooseClass(s, r.id)
      if (!next) return note('Moedas insuficientes para trocar de classe.')
      commit(next)
      const c = classById(r.id)
      note(`Agora você é ${c.nome}! ${c.vila}`, { big: true, cor: c.cor })
      syncRpg(next)
    } else if (r.tipo === 'rpg_evo') {
      const c = myClass(s)
      if (!c || classEvo(s) || classLevel(s) < EVO_NIVEL) return
      const next = setRpg(s, { evo: { ...rpgOf(s).evo, [c.id]: r.evo } })
      commit(next)
      note(`Evoluiu para ${c.evos[r.evo].nome}!`, { big: true, cor: c.cor })
      syncRpg(next)
    } else if (r.tipo === 'rpg_mostra') {
      commit(setRpg(s, { mostra: r.v }))
    } else if (r.tipo === 'rpg_equip') {
      const rec = nextRecipe(s, r.slot)
      if (!rec || s.moedas < rec.moedas || Object.entries(rec.mats).some(([id, q]) => countOf(s, id) < q)) return
      let next = { ...s, moedas: s.moedas - rec.moedas }
      for (const [id, q] of Object.entries(rec.mats)) next = takeGood(next, id, q)
      next = setRpg(next, { equip: { ...equipOf(s), [r.slot]: rec.tier }, mostra: rpgOf(s).mostra ?? (r.slot === 'arma' ? null : r.slot) })
      commit(next)
      note(`Equipamento novo: ${SLOTS.find(([k]) => k === r.slot)[1]} de ${TIERS[rec.tier].toLowerCase()}!`, { big: true, cor: TIER_COR[rec.tier] })
      syncRpg(next)
    } else if (r.tipo === 'rpg_aceitou') {
      const today = gameTime().day
      let next = withEnergy(s, today, energyOf(s, today) - ENERGIA_EXPEDICAO)
      if (r.comida && countOf(next, r.comida)) next = takeGood(next, r.comida)
      commit(next)
    } else if (r.tipo === 'rpg_premio') {
      let next = { ...s, moedas: s.moedas + (r.moedas ?? 0) }
      if (r.qtd && BENS[r.material]) next = giveGood(next, r.material, r.qtd)
      const x = addClassXp(next, r.classe, r.xp ?? 0)
      commit(x.save)
      const c = classById(r.classe)
      note(`${r.res === 'vitoria' ? 'Vitória' : r.res === 'parcial' ? 'Quase' : 'Derrota'} contra ${r.monstro}: +${r.moedas} moedas, +${r.xp} XP${r.qtd ? `, ${r.qtd}× ${BENS[r.material].nome.toLowerCase()}` : ''}`, { big: true, cor: c?.cor })
      if (x.up) note(`${c?.nome ?? 'Classe'} subiu para o nível ${x.up}!${x.up >= EVO_NIVEL && !classEvo(x.save, r.classe) ? ' Escolha a evolução no quadro das classes.' : ''}`, { big: true, cor: c?.cor })
      syncRpg(x.save)
    } else if (r.tipo === 'comprar') {
      if (s.moedas < r.preco) return
      commit(giveGood({ ...s, moedas: s.moedas - r.preco }, r.id))
    }
  }
  // ---------------------------------------------------------------- ferramentas (Espaço / C / clique no quadradinho)
  const fxRef = useRef(null) // efeitinho no mapa (terra voando, água) — o motor do jogo preenche
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

  useEffect(() => {
    if (!room) return undefined
    let alive = true
    let raf = 0
    setReady(false)
    setMissing(null)
    const canvas = canvasRef.current
    const box = boxRef.current
    const ctx = canvas.getContext('2d')
    const start = arriveRef.current ?? room.spawn
    arriveRef.current = null
    // o boneco anda solto, pixel a pixel (como no Stardew): px, py = o meio do pé, em pixels.
    // x, y = o quadradinho do pé; fx, fy = a posição "em quadradinhos" do desenho (16x32, pé no fundo)
    const me = { px: start[0] * T + T / 2, py: start[1] * T + 13, x: start[0], y: start[1], fx: start[0], fy: start[1], dir: 'down', path: [], anim: 0, moving: false, stuck: 0 }
    const sync = () => {
      me.x = Math.floor(me.px / T)
      me.y = Math.floor((me.py - 1) / T)
      me.fx = me.px / T - 0.5
      me.fy = me.py / T - 1
    }
    sync()
    let fade = 1 // escurecido ao chegar: clareia; ao entrar numa porta: escurece e troca de lugar
    let leaving = null
    const held = []
    let adj = 0
    try {
      adj = Number(localStorage.getItem(ZOOM_KEY)) || 0
    } catch {
      /* sem localStorage */
    }
    const view = { zoom: 3, ox: 0, oy: 0, cx: null, cy: null, adj }
    let run = false // Shift: correr
    const hover = { x: 0, y: 0, at: 0 } // quadradinho embaixo do mouse (e quando mexeu)

    const resize = () => {
      const rect = box.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.round(rect.width * dpr)
      canvas.height = Math.round(rect.height * dpr)
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      // zoom inteiro (pixel art sem borrar), como no Stardew: no computador uns 36 x 20 quadradinhos à vista
      // (em tela cheia também; antes ficava perto demais), no celular uns 20 de largura
      const wide = rect.width >= 700
      let auto = Math.max(1, Math.floor(Math.min(canvas.width / ((wide ? 36 : 20) * T), canvas.height / ((wide ? 20 : 11) * T))))
      // dentro de casa: mais perto, a sala (com uma folga de 1 quadradinho) enche a tela, como no Stardew
      if (!room.outdoor) auto = Math.max(auto, Math.min(8, Math.floor(Math.min(canvas.width / (room.w + (wide ? 2 * T : 0)), canvas.height / (room.h + 2 * T)))))
      // mapa grande: nunca afasta a ponto de aparecer o fundo em volta (a faixa escura do lado);
      // casa pequena, que não enche a tela nem bem perto, continua no meio
      const cover = Math.ceil(Math.max(canvas.width / room.w, canvas.height / room.h))
      // (só lá fora: dentro de casa a sala inteira aparece, com o escuro em volta)
      view.min = cover <= (room.outdoor ? 8 : 12) ? cover : 1
      view.auto = auto
      view.zoom = Math.max(view.min, Math.min(8, auto + view.adj))
    }
    const observer = new ResizeObserver(resize)
    observer.observe(box)
    resize()

    const toWorld = (event) => {
      const rect = canvas.getBoundingClientRect()
      const dpr = canvas.width / rect.width
      return [((event.clientX - rect.left) * dpr - view.ox) / view.zoom, ((event.clientY - rect.top) * dpr - view.oy) / view.zoom]
    }
    const near = (tx, ty) => Math.abs(tx - me.x) <= REACH && Math.abs(ty - me.y) <= REACH
    /** o quadradinho alvo: o do mouse (se estiver perto e mexeu há pouco) ou o da frente */
    const target = () => {
      if (performance.now() - hover.at < 2500 && near(hover.x, hover.y)) return [hover.x, hover.y]
      return [me.x + DIRV[me.dir][0], me.y + DIRV[me.dir][1]]
    }
    const zoomBy = (d) => {
      // não deixa o ajuste "passar do limite" (senão o zoom demora a voltar ao apertar o outro lado)
      view.adj = Math.max(-3, (view.min ?? 1) - (view.auto ?? 0), Math.min(4, view.adj + d))
      try {
        localStorage.setItem(ZOOM_KEY, String(view.adj))
      } catch {
        /* sem localStorage */
      }
      resize()
    }
    const onKey = (event) => {
      const tg = event.target?.tagName
      if (tg === 'INPUT' || tg === 'TEXTAREA' || tg === 'SELECT') return // digitando no chat
      run = event.shiftKey
      if (event.type === 'keydown' && (event.code === 'Minus' || event.code === 'NumpadSubtract')) return zoomBy(-1)
      if (event.type === 'keydown' && (event.code === 'Equal' || event.code === 'NumpadAdd')) return zoomBy(1)
      if (TOOL_KEYS.includes(event.code)) {
        event.preventDefault()
        if (event.type === 'keydown' && !event.repeat && !leaving) {
          const [tx, ty] = target()
          if (useItemRef.current(tx, ty)) swing = Math.max(swing, 0.01)
        }
        return
      }
      const step = KEYS[event.code]
      if (!step) return
      event.preventDefault()
      const i = held.findIndex((st) => st === step)
      if (event.type === 'keydown') {
        if (i < 0) held.push(step)
        me.path = []
      } else if (i >= 0) held.splice(i, 1)
    }
    const onBlur = () => {
      held.length = 0
      run = false
    }
    const onWheel = (event) => {
      event.preventDefault()
      zoomBy(event.deltaY < 0 ? 1 : -1)
    }
    const onMove = (event) => {
      const [px, py] = toWorld(event)
      hover.x = Math.floor(px / T)
      hover.y = Math.floor(py / T)
      hover.at = performance.now()
    }
    const onPointer = (event) => {
      box.focus({ preventScroll: true })
      onMove(event)
      // clique perto do boneco: usa o item da barra ali; longe: anda até lá
      if (near(hover.x, hover.y) && !(hover.x === me.x && hover.y === me.y) && useItemRef.current(hover.x, hover.y)) {
        me.dir = Math.abs(hover.x - me.x) >= Math.abs(hover.y - me.y) ? (hover.x > me.x ? 'right' : 'left') : hover.y > me.y ? 'down' : 'up'
        swing = Math.max(swing, 0.01)
        return
      }
      me.path = findPath(room, { x: me.x, y: me.y }, { x: hover.x, y: hover.y })
    }
    let swing = 0 // o boneco "usando" a ferramenta (tempo que falta)
    let swingTool = null // qual ferramenta (o desenho dela aparece na mão)
    const TOOL_TIME = 0.32
    let useT = 0 // tempo desde que começou a usar (animação da ferramenta)
    let reel = false // vara: recolhendo a linha (a pesca acabou)
    let fishT = 0 // tempo pescando (lança e fica esperando)
    const heldTool = () => {
      const s = saveRef.current
      const key = s?.hot?.[s.sel]
      const id = key && s.inv.find((it) => it.key === key)?.bem
      return id && TOOL_ANIMS[id]?.anda ? id : null
    }
    loadToolAnims().catch(() => {})
    box.addEventListener('keydown', onKey)
    box.addEventListener('keyup', onKey)
    box.addEventListener('blur', onBlur)
    canvas.addEventListener('pointerdown', onPointer)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('wheel', onWheel, { passive: false })

    let floor = null
    let objs = null
    let sea = null
    const atl = new Map() // mapas do editor: uma imagem por tema de peças
    const sheets = new Map() // folhas dos animados (do pacote, em /limezu/me; do editor, caminho completo)
    const sheetFiles = [...new Set([...(room.anims ?? []).map((a) => a[2]), ...(room.boats ?? []).map((b) => b[0]), ...(room.patrols ?? []).flatMap((p) => [p[0], p[1]])])]
    const waters = room.water ?? []
    const atlasKeys = Object.keys(room.atlases ?? {})
    Promise.all([
      room.floorCanvas ?? loadImage(`${room.code}_chao`),
      room.atlases ? true : loadImage(room.atlas ?? `${room.code}_obj`),
      heroRef.current ?? (charRef.current ? composeChar(charRef.current) : loadImage(DATA.character)),
      room.sea ? loadImage(room.sea.file) : null,
      ...waters.map((w) => w.img ?? loadImage(w.file)),
      ...sheetFiles.map((f) => loadImage(f.startsWith('/') ? f : `/limezu/me/${f.replace(/\.png$/, '')}.png`)),
      ...atlasKeys.map((k) => loadImage(room.atlases[k])),
    ])
      .then(([a, b, c, d, ...rest]) => {
        if (!alive) return
        floor = a
        objs = b
        heroRef.current = c
        sea = d
        waters.forEach((w, i) => (w.img = rest[i]))
        sheetFiles.forEach((f, i) => sheets.set(f, rest[waters.length + i]))
        atlasKeys.forEach((k, i) => atl.set(k, rest[waters.length + sheetFiles.length + i]))
        setReady(true)
      })
      .catch((error) => alive && setMissing(error.message))

    // o que anda sozinho: carros na rua (freiam e buzinam se você estiver na frente) e barcos no mar
    const cars = (room.movers ?? []).map(([name, fy, speed, x0]) => ({ name, fy, speed, x: x0, honk: 0 }))
    // (mapas do editor: ax, ay dizem onde fica a fita de quadros dentro da folha)
    const boats = (room.boats ?? []).map(([file, fy, speed, fw, fh, frames, x0, ax = 0, ay = 0]) => ({ file, fy, speed, fw, fh, frames, x: x0, ax, ay }))
    // vai e volta entre dois pontos (o barco do lago): folha para a direita e para a esquerda
    // (mapas do editor: rx, ry, lx, ly dizem onde fica a fita de quadros dentro da folha)
    const patrols = (room.patrols ?? []).map(([right, left, fw, fh, frames, x0, x1, fy, speed, rx = 0, ry = 0, lx = 0, ly = 0]) => ({ right, left, fw, fh, frames, x0, x1, fy, speed, rx, ry, lx, ly, x: x0, dirR: true }))
    // personagens do mapa (NPCs): parados, passeando, sentados ou no celular; falam quando você chega perto
    const npcs = (room.npcs ?? []).map((n) => ({ ...n, hx: n.x, hy: n.y, fx: n.x, fy: n.y, next: null, wait: 1 + Math.random() * 2, img: null, dir: n.dir ?? 'down', talk: false, route: [], stop: null, hidden: false }))
    // rotina dos NPCs (pelo relógio da turma): a parada da hora; ao abrir o mapa, já começa lá
    const stopNow = (n, hour) => {
      const r = [...(n.rotina ?? [])].sort((a, b) => a[0] - b[0])
      if (!r.length) return null
      return [...r].reverse().find((st) => st[0] <= hour) ?? r[r.length - 1]
    }
    {
      const hour = gameTime().hour
      for (const n of npcs) {
        const st = stopNow(n, hour)
        if (!st) continue
        n.stop = st
        n.x = n.hx = st[1]
        n.y = n.hy = st[2]
        n.fx = n.x
        n.fy = n.y
        n.hidden = !!st[3]
      }
    }
    npcs.forEach((n) => {
      if (n.bicho) {
        // bicho da fazenda: folha de 24 colunas (4 direções x 6 quadros); anda devagar e "fala" o som dele
        loadBichos()
          .then((all) => {
            // variação que não existe mais no pacote (ex.: duck_white): usa outra do mesmo bicho
            const kind = n.bicho.split('_')[0]
            const info = all[n.bicho] ?? Object.entries(all).find(([k]) => k.split('_')[0] === kind)?.[1]
            if (!info) return
            n.fw = info.fw
            if (info.fw >= 32 && (n.dir === 'up' || n.dir === 'down')) n.dir = Math.random() < 0.5 ? 'left' : 'right'
            n.fh = info.fh
            n.nome = n.nome ?? info.nome.replace(/ \(.*\)$/, '')
            n.fala = n.fala ?? info.som
            return loadImage(info.file).then((img) => (n.img = img))
          })
          .catch(() => {})
        return
      }
      composeChar(n.c).then((img) => (n.img = img)).catch(() => {})
    })
    // itens para pegar (mapas do editor): moedas e peças da biblioteca; somem quando você pega
    const items = (room.items ?? []).filter((it) => !isTaken(saveRef.current, room.code, it.id))
    let coin = null
    if (items.some((it) => it.tipo === 'moeda')) loadImage(`${HUD}i_moeda.png`).then((img) => (coin = img)).catch(() => {})
    const occupied = (x, y, self) => npcs.some((n) => n !== self && !n.hidden && ((n.x === x && n.y === y) || (n.next && n.next.x === x && n.next.y === y)))
    const canStep = (x, y) => free(room, x, y) && !occupied(x, y)
    // o pé do boneco: uma caixinha de 10 x 5 pixels; bate no que não dá para andar e nos NPCs/bichos
    const boxFree = (px, py) => {
      const x0 = Math.floor((px - 5) / T)
      const x1 = Math.floor((px + 4.99) / T)
      const y0 = Math.floor((py - 5) / T)
      const y1 = Math.floor((py - 0.01) / T)
      for (let y = y0; y <= y1; y += 1) for (let x = x0; x <= x1; x += 1) if (!(me.pass > 0.35 ? free(room, x, y) : canStep(x, y))) return false
      return true
    }
    // o pé do boneco está em cima de alguém? (para continuar passando até sair de cima)
    const blockedByNpc = () => {
      const x0 = Math.floor((me.px - 5) / T)
      const x1 = Math.floor((me.px + 4.99) / T)
      const y0 = Math.floor((me.py - 5) / T)
      const y1 = Math.floor((me.py - 0.01) / T)
      for (let y = y0; y <= y1; y += 1) for (let x = x0; x <= x1; x += 1) if (occupied(x, y)) return true
      return false
    }
    // atividades: onde dá para fazer o quê (a até 1 quadradinho da peça), horta e beira da água
    const actNear = new Map()
    for (const a of room.acts ?? []) {
      for (const [cx, cy] of a.cells) {
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            const k = `${cx + dx},${cy + dy}`
            if (!actNear.has(k)) actNear.set(k, [])
            actNear.get(k).push(a)
          }
        }
      }
    }
    const hortaSet = new Set((room.horta ?? []).map(([x, y]) => `${x},${y}`))
    worldRef.current = { room, npcs, me, acts: room.acts ?? [], hortaSet }
    hudRef.current.act(null)
    // o que quebrou: cada peça de conserto tem a sua sorte (sempre a mesma); depois de consertada, volta a quebrar com o tempo
    const hash = (t) => [...t].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)
    const broken = (a) => {
      if (hash(`${room.code}${a.id}`) % 100 >= 18) return false
      const at = saveRef.current.consertos?.[room.code]?.[a.id]
      return !at || Date.now() - at > FIX_AGAIN_MS
    }
    const ghostAway = (id) => {
      const t = ghostGone.get(`${room.code}:${id}`)
      return !!t && Date.now() - t < GHOST_BACK_MS
    }
    // figurinhas da biblioteca (plantas da horta) e o ícone de moeda das lojas
    const sprites = new Map()
    const sprite = (src, t, n) => {
      const k = `${src}/${t}/${n}`
      if (!sprites.has(k)) {
        sprites.set(k, null)
        const r = libRef.current?.[src]?.[t]?.[n]
        if (r) loadImage(atlasUrl(src, t)).then((img) => sprites.set(k, { img, r })).catch(() => {})
        else sprites.delete(k)
      }
      return sprites.get(k)
    }
    let shopIcon = null
    loadImage(`${HUD}i_moeda_p.png`).then((img) => (shopIcon = img)).catch(() => {})
    /** o que dá para fazer agora, parado onde está */
    const findAct = (night) => {
      const s = saveRef.current
      const cfg = skillsRef.current
      const here = `${me.x},${me.y}`
      const e = s.entrega
      if (e && e.mapa === room.code) {
        const n = e.para.tipo === 'npc' ? npcs.find((x) => x.id === e.para.id) : null
        const cells = n ? [[n.x, n.y]] : (room.acts ?? []).find((x) => x.id === e.para.id)?.cells ?? []
        if (cells.some(([x, y]) => Math.abs(x - me.x) <= 1 && Math.abs(y - me.y) <= 1)) return { key: 'entregar', tipo: 'entregar', label: `Entregar o pacote para ${e.nome}` }
      }
      const today = gameTime().day
      // presente: conversando com alguém e com um item (que não seja ferramenta) na mão
      const talking = npcs.find((n) => n.talk)
      if (talking) {
        const hk = s.hot[s.sel]
        const id = hk && s.inv.find((it) => it.key === hk)?.bem
        if (id && BENS[id] && BENS[id].tipo !== 'ferramenta' && friendOf(s, room.code, talking.id).presente !== today) {
          return { key: `presente:${talking.id}:${id}`, tipo: 'presente', id: talking.id, label: `Dar ${BENS[id].nome} para ${talking.nome}` }
        }
      }
      // bichos perto: coletar, dar feno ou fazer carinho
      // perto do monte de feno sem feno na mochila: o monte vem antes dos bichos com fome
      const hayFirst = !countOf(s, 'feno') && [...(actNear.get(here) ?? [])].some((a) => a.tipo === 'feno')
      for (const n of npcs) {
        if (hayFirst || !n.bicho || !n.near || !n.img) continue
        const st = animalState(s, room.code, n.id, n.bicho, today)
        const prod = productOf(n.bicho)
        const base = { key: `bicho:${n.id}:${st}`, tipo: 'bicho', id: n.id, npc: n.id, bicho: n.bicho, step: st }
        if (st === 'coletar') return { ...base, label: `Coletar ${BENS[prod].nome.toLowerCase()} (${n.nome})` }
        if (st === 'alimentar') return countOf(s, 'feno') ? { ...base, label: `Dar feno para ${n.nome.toLowerCase()}` } : { ...base, off: true, label: `${n.nome} está com fome`, sub: 'precisa de feno' }
        if (st === 'carinho') return { ...base, label: `Fazer carinho (${n.nome.toLowerCase()})` }
        return { ...base, off: true, label: `${n.nome} está feliz ♥` }
      }
      // horta: o quadradinho alvo (o da frente ou o do mouse) com planta ou irrigador
      const [tx, ty] = target()
      const tk = `${tx},${ty}`
      const plots = s.horta?.[room.code] ?? {}
      const plot = plots[tk]
      if (plot?.irrigador !== undefined) return { key: `irrigador:${tk}`, tipo: 'irrigador', cell: tk, label: 'Recolher o irrigador' }
      if (plot?.planta) {
        const since = sprinklerSince(plots, tk)
        const nome = BENS[plot.planta].nome
        if (growth(s, cfg, plot, today, since) >= 1) return { key: `colher:${tk}`, tipo: 'colher', cell: tk, label: `Colher ${nome}` }
        const wet = wetToday(plot, today, since)
        return { key: `planta:${tk}:${wet}`, tipo: 'planta', off: true, label: `${nome} · dia ${grownDays(plot, today, since) + 1} de ${cropDays(s, cfg, plot.planta)}`, sub: wet ? (since !== null ? 'irrigador ✓' : 'regada hoje ✓') : 'precisa de água' }
      }
      for (const a of [...(actNear.get(here) ?? [])].sort((p, q) => ACT_ORDER.indexOf(p.tipo) - ACT_ORDER.indexOf(q.tipo))) {
        if (a.tipo === 'portal') return { key: `portal:${a.id}`, tipo: 'portal', id: a.id, label: 'Portal dos Monstros' }
        if (a.tipo === 'oficina') return { key: `oficina:${a.id}`, tipo: 'oficina', id: a.id, label: 'Oficina (equipamentos)' }
        if (a.tipo === 'classes') return { key: `classes:${a.id}`, tipo: 'classes', id: a.id, label: 'Quadro das classes' }
        if (a.tipo === 'venda') return { key: `venda:${a.id}`, tipo: 'venda', id: a.id, label: 'Caixa de venda' }
        if (a.tipo === 'fruta' && fruitReady(s, room.code, a.id, today)) return { key: `fruta:${a.id}`, tipo: 'fruta', id: a.id, fruta: a.fruta, label: `Colher ${BENS[a.fruta].nome.toLowerCase()}` }
        if (a.tipo === 'feno') return s.fenoDia === today ? { key: 'feno:x', tipo: 'feno', off: true, label: 'Já pegou feno hoje' } : { key: `feno:${a.id}`, tipo: 'feno', id: a.id, label: 'Pegar feno' }
        if (a.tipo === 'cama') return { key: `cama:${a.id}:${s.dormiu === today}`, tipo: 'cama', id: a.id, label: s.dormiu === today ? 'Já dormiu hoje' : 'Dormir (enche a energia)', off: s.dormiu === today }
        if (a.tipo === 'bau') return { key: `bau:${a.id}`, tipo: 'bau', id: a.id, label: 'Abrir o baú' }
        if (a.tipo === 'loja') return { key: `loja:${a.id}`, tipo: 'loja', id: a.id, label: 'Abrir a loja' }
        if (a.tipo === 'cozinha') return { key: `cozinha:${a.id}`, tipo: 'cozinha', id: a.id, label: 'Cozinhar' }
        if (a.tipo === 'correio') return s.entrega ? { key: 'correio:x', tipo: 'correio', off: true, label: 'Você já está com um pacote' } : { key: `correio:${a.id}`, tipo: 'correio', id: a.id, label: 'Pegar uma entrega' }
        if (a.tipo === 'conserto' && broken(a)) return { key: `conserto:${a.id}`, tipo: 'conserto', id: a.id, label: 'Consertar' }
        if (a.tipo === 'coragem' && night && !ghostAway(a.id)) return { key: `coragem:${a.id}`, tipo: 'coragem', id: a.id, label: 'Enfrentar o fantasma' }
      }
      return null
    }
    const shade = document.createElement('canvas') // a escuridão da noite, com "buracos" onde tem luz
    // terra arada (autotile da fazenda) e as plantas crescendo
    let tiles = null
    loadAutotiles(null).then((t) => (tiles = t)).catch(() => {})
    let fenceImg = null
    if (room.gates?.length) loadImage(FENCES).then((img) => (fenceImg = img)).catch(() => {})
    const gateSet = new Set((room.gates ?? []).map(([x, y]) => `${x},${y}`))
    // porteira animada (Modern Farm: fz_stable_gate, 2 quadradinhos; abre e fecha quando alguém chega perto)
    let gateAnim = null
    const gateOpen = new Map() // "x,y" da metade esquerda → 0 (fechada) a 1 (aberta)
    const gatePairs = (room.gates ?? []).filter((g, i, all) => all.some((o) => o[0] === g[0] + 1 && o[1] === g[1])).map(([x, y]) => [x, y])
    if (gatePairs.length) {
      loadLibrary()
        .then((lib) => {
          const r = lib.anims.fz_stable_gate
          if (r) return loadImage(animAtlasUrl(r[0])).then((img) => (gateAnim = { img, sx: r[1], sy: r[2], fw: r[3], fh: r[4], frames: r[5] }))
          return null
        })
        .catch(() => {})
    }
    let cropImg = null
    loadImage(atlasUrl('pecas', 'fazenda_crescimento')).then((img) => (cropImg = img)).catch(() => {})
    let cropsAtlas = null // peças da fazenda (o irrigador parado)
    loadImage(atlasUrl('pecas', 'fazenda_construcoes')).then((img) => (cropsAtlas = img)).catch(() => {})
    let sprinklerImg = null
    loadImage('/limezu/editor/animados_fz0.png').then((img) => (sprinklerImg = img)).catch(() => {})
    // efeitinhos (terra voando, gotas d'água, brilho da colheita)
    const effects = []
    fxRef.current = (kind, k) => {
      const [x, y] = k.split(',').map(Number)
      effects.push({ kind, x: x * T + T / 2, y: y * T + T / 2, t: 0 })
    }
    // multiplayer: quem está neste mapa agora (Supabase Realtime)
    const peers = new Map()
    const peerImg = (p) => {
      const c = p.char
      ;(c ? composeChar(c) : loadImage(DATA.character)).then((img) => (p.img = img)).catch(() => {})
    }
    const onPeers = (list) => {
      const ids = new Set(list.map((p) => p.id))
      for (const id of [...peers.keys()]) if (!ids.has(id)) peers.delete(id)
      for (const p of list) {
        const cur = peers.get(p.id)
        if (!cur) {
          const np = { id: p.id, nome: p.nome ?? 'Alguém', char: p.char ?? null, img: null, px: null, py: null, tx: 0, ty: 0, dir: 'down', mv: 0, anim: 0 }
          peers.set(p.id, np)
          peerImg(np)
        } else if (JSON.stringify(cur.char) !== JSON.stringify(p.char ?? null) || cur.nome !== p.nome) {
          cur.char = p.char ?? null
          cur.nome = p.nome ?? cur.nome
          peerImg(cur)
        }
      }
    }
    const onPos = (id, pos) => {
      let p = peers.get(id)
      if (!p) {
        p = { id, nome: '…', char: null, img: null, px: null, py: null, dir: 'down', mv: 0, anim: 0 }
        peers.set(id, p)
        peerImg(p)
      }
      p.tx = pos.x
      p.ty = pos.y
      p.dir = pos.dir ?? p.dir
      p.mv = pos.mv
      p.fz = pos.fz
      if (p.px === null) {
        p.px = pos.x
        p.py = pos.y
      }
    }
    const onEvent = (id, ev) => {
      const p = peers.get(id)
      if (!p) return
      const until = performance.now() + (ev.k === 'chat' ? 6000 : 2600)
      if (ev.k === 'emote' && emoteById[ev.e]) p.bubble = { emote: ev.e, until }
      if (ev.k === 'chat') {
        const texto = cleanChat(ev.texto)
        if (!texto) return
        p.bubble = { texto, until }
        hudRef.current.chat({ nome: p.nome, texto })
      }
      if (ev.k === 'acao' && (BENS[ev.item] || TOOL_ANIMS[ev.item])) {
        p.swing = ev.recolhe ? (FISH.recolhe[1] - FISH.recolhe[0]) / TOOL_ANIMS.vara.fps : useTime(ev.item) || TOOL_TIME
        p.tool = ev.item
        p.useT = 0
        p.reel = !!ev.recolhe
      }
    }
    const live = liveMeRef.current ? joinMapLive(room.code, liveMeRef.current, { onPeers, onPos, onEvent }) : null
    let emotesImg = null
    loadImage(EMOTES_URL).then((img) => (emotesImg = img)).catch(() => {})
    socialRef.current = {
      say: (text) => {
        const texto = cleanChat(text)
        if (!texto) return
        me.bubble = { texto, until: performance.now() + 6000 }
        live?.event({ k: 'chat', texto })
        hudRef.current.chat({ nome: liveMeRef.current?.nome ?? 'Você', texto, eu: true })
      },
      emote: (e, npcId) => {
        const until = performance.now() + 2600
        if (npcId) {
          const n = npcs.find((x) => x.id === npcId)
          if (n) n.bubble = { emote: e, until }
          return
        }
        me.bubble = { emote: e, until }
        live?.event({ k: 'emote', e })
      },
      tool: (id) => {
        swing = useTime(id) || TOOL_TIME
        swingTool = id
        useT = 0
        reel = false
        live?.event({ k: 'acao', item: id })
      },
    }
    if (window.__ROOM_TEST__) {
      // só nos testes: andar até um quadradinho, teletransportar e simular outra pessoa no mapa
      window.__t2 = {
        me,
        room,
        view,
        peers,
        npcs,
        go: (x, y) => (me.path = findPath(room, { x: me.x, y: me.y }, { x, y })),
        tp: (x, y, dir) => {
          me.px = x * T + T / 2
          me.py = y * T + 13
          me.path = []
          if (dir) me.dir = dir
          sync()
        },
        peer: (list, pos) => (list ? onPeers(list) : onPos(pos.id, pos)),
      }
    }

    /** a ferramenta na mão: gira de cima para a frente (k: 0 a 1 do movimento) */
    const drawTool = (px, py, dir, id, k) => {
      const ic = BENS[id]?.icone
      const sp = ic && sprite(ic.src, ic.t, ic.n)
      if (!sp) return
      const [sx, sy, sw, sh] = sp.r
      const side = dir === 'left' ? -1 : 1
      const ang = (-1.2 + k * 1.9) * side
      const hx = dir === 'left' ? px - 5 : dir === 'right' ? px + 5 : px + 4
      const hy = py - 14
      ctx.save()
      ctx.translate(Math.round(hx), Math.round(hy))
      ctx.rotate(dir === 'down' || dir === 'up' ? (-0.6 + k * 1.2) : ang)
      if (dir === 'left') ctx.scale(-1, 1)
      const sc = 12 / Math.max(sw, sh)
      ctx.drawImage(sp.img, sx, sy, sw, sh, -2, -sh * sc + 2, sw * sc, sh * sc)
      ctx.restore()
    }
    /** balão em cima de alguém: emote (2 quadros) ou mensagem do chat */
    const drawBubble = (cx, top, b, time) => {
      if (!b) return
      if (b.emote) {
        const e = emoteById[b.emote]
        if (!e || !emotesImg) return
        const f = Math.floor(time * 2.5) % 2
        ctx.drawImage(emotesImg, (e.x + f) * 16, e.y * 16, 16, 16, Math.round(cx - 8), Math.round(top - 16), 16, 16)
        return
      }
      ctx.font = '6px sans-serif'
      ctx.textAlign = 'center'
      const words = b.texto.split(' ')
      const lines = []
      let cur = ''
      for (const wd of words) {
        const t = cur ? `${cur} ${wd}` : wd
        if (ctx.measureText(t).width > 84 && cur) {
          lines.push(cur)
          cur = wd
        } else cur = t
      }
      if (cur) lines.push(cur)
      const shown = lines.slice(0, 3)
      const w = Math.min(92, Math.max(...shown.map((l) => ctx.measureText(l).width)) + 8)
      const h = shown.length * 7 + 4
      const bx = Math.round(cx - w / 2)
      const by = Math.round(top - h - 4)
      ctx.fillStyle = '#fffaf0'
      ctx.fillRect(bx, by, Math.round(w), h)
      ctx.beginPath()
      ctx.moveTo(cx - 2, by + h)
      ctx.lineTo(cx + 2, by + h)
      ctx.lineTo(cx, by + h + 3)
      ctx.fill()
      ctx.strokeStyle = 'rgba(59, 36, 25, 0.5)'
      ctx.lineWidth = 0.5
      ctx.strokeRect(bx + 0.25, by + 0.25, Math.round(w) - 0.5, h - 0.5)
      ctx.fillStyle = '#3b2419'
      shown.forEach((l, i) => ctx.fillText(l, cx, by + 7 + i * 7))
    }

    let last = performance.now()
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      // com uma atividade aberta o boneco fica parado
      if (jobRef.current) {
        held.length = 0
        me.path = []
      }
      // andar solto (pixel a pixel, 8 direções); só o pé colide. Clique longe: segue o caminho até lá
      let vx = 0
      let vy = 0
      if (!leaving) {
        for (const k of held) {
          vx += k[0]
          vy += k[1]
        }
        vx = Math.sign(vx)
        vy = Math.sign(vy)
        if (vx || vy) {
          const key = held[held.length - 1]
          me.dir = dirOf(key[0], key[1])
          me.path = []
        } else if (me.path.length) {
          const wp = me.path[0]
          const dx = wp.x * T + T / 2 - me.px
          const dy = wp.y * T + 13 - me.py
          if (Math.abs(dx) < 1.5 && Math.abs(dy) < 1.5) me.path.shift()
          else {
            vx = Math.abs(dx) < 1.5 ? 0 : Math.sign(dx)
            vy = Math.abs(dy) < 1.5 ? 0 : Math.sign(dy)
            me.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up'
          }
        }
      }
      const speed = (run ? RUN : SPEED) * T * (1 + bonus(saveRef.current, skillsRef.current, 'entregas', 'rapido') / 100) * (perk(saveRef.current, 'atleta') ? 1.15 : 1) * dt
      const len = Math.hypot(vx, vy) || 1
      const sx = (vx / len) * speed
      const sy = (vy / len) * speed
      const ox = me.px
      const oy = me.py
      if (sx) {
        if (boxFree(me.px + sx, me.py)) me.px += sx
        else if (!sy) {
          // escorrega na quina (como no Stardew): se dá para passar um pouco acima ou abaixo, ajeita
          for (let off = 1; off <= 8; off += 1) {
            if (boxFree(me.px + sx, me.py - off)) {
              me.py -= Math.min(off, speed)
              break
            }
            if (boxFree(me.px + sx, me.py + off)) {
              me.py += Math.min(off, speed)
              break
            }
          }
        }
      }
      if (sy) {
        if (boxFree(me.px, me.py + sy)) me.py += sy
        else if (!sx) {
          for (let off = 1; off <= 8; off += 1) {
            if (boxFree(me.px - off, me.py + sy)) {
              me.px -= Math.min(off, speed)
              break
            }
            if (boxFree(me.px + off, me.py + sy)) {
              me.px += Math.min(off, speed)
              break
            }
          }
        }
      }
      me.moving = Math.abs(me.px - ox) + Math.abs(me.py - oy) > 0.01
      // empacou em alguém (gente ou bicho parado no caminho) por um instante: passa por ele, como num corredor cheio
      if ((sx || sy) && !me.moving) me.pass = (me.pass ?? 0) + dt
      else if (me.moving && me.pass > 0.35) {
        if (boxFree(me.px, me.py) && !blockedByNpc()) me.pass = 0
      } else me.pass = 0
      if (me.path.length && !me.moving) {
        me.stuck += dt
        if (me.stuck > 0.4) me.path = [] // tem alguém no caminho
      } else me.stuck = 0
      const ptx = me.x
      const pty = me.y
      sync()
      if (me.x !== ptx || me.y !== pty) {
        // entrou num quadradinho novo: pega o item e vê se é porta
        const gotIdx = items.findIndex((it) => it.x === me.x && it.y === me.y)
        if (gotIdx >= 0) hudRef.current.collect(room.code, items.splice(gotIdx, 1)[0])
        const door = (room.doors ?? []).find((d) => d.x === me.x && d.y === me.y)
        if (door && !leaving) {
          leaving = door
          me.path = []
          held.length = 0
        }
      }
      // fz: pescando, ou a ferramenta na mão (os outros veem segurando)
      const fishing = jobRef.current?.tipo === 'pesca'
      if (fishing) fishT += dt
      else if (fishT) {
        // a pesca acabou: recolhe a linha
        fishT = 0
        swing = (FISH.recolhe[1] - FISH.recolhe[0]) / TOOL_ANIMS.vara.fps
        swingTool = 'vara'
        useT = 0
        reel = true
        live?.event({ k: 'acao', item: 'vara', recolhe: 1 })
      }
      live?.send({ x: me.px, y: me.py, dir: me.dir, mv: me.moving, fz: fishing ? 'pesca' : heldTool() ?? '' })
      for (const p of peers.values()) {
        if (p.px === null) continue
        const k = Math.min(1, dt * 10)
        p.px += (p.tx - p.px) * k
        p.py += (p.ty - p.py) * k
        p.anim += dt * (p.mv ? 10 : 6)
      }
      if (me.moving && swingTool && TOOL_ANIMS[swingTool]) swing = 0 // andou: para de usar
      swing = Math.max(0, swing - dt)
      useT += dt
      if (!swing) swingTool = null
      for (const p of peers.values()) {
        if (p.swing) p.swing = Math.max(0, p.swing - dt)
        p.useT = (p.useT ?? 0) + dt
        p.fishT = p.fz === 'pesca' ? (p.fishT ?? 0) + dt : 0
      }
      if (me.bubble && me.bubble.until < now) me.bubble = null
      for (const p of peers.values()) if (p.bubble && p.bubble.until < now) p.bubble = null
      for (const n of npcs) if (n.bubble && n.bubble.until < now) n.bubble = null
      for (let i = effects.length - 1; i >= 0; i -= 1) {
        effects[i].t += dt
        if (effects[i].t > 0.5) effects.splice(i, 1)
      }
      const walking = me.moving
      if (leaving) {
        fade = Math.min(1, fade + dt * 3)
        if (fade >= 1 && alive) {
          arriveRef.current = leaving.spawn
          const to = leaving.to
          leaving = null
          setCode(to)
        }
      } else fade = Math.max(0, fade - dt * 2.5)
      me.anim += dt * (walking ? 10 : 6)
      let talking = null
 {
        // rotina: mudou a hora da parada → vai andando até lá (e some se for "casa")
        const hour = gameTime().hour
        for (const n of npcs) {
          const st = stopNow(n, hour)
          if (!st || st === n.stop) continue
          n.stop = st
          n.hidden = false
          n.hx = st[1]
          n.hy = st[2]
          n.route = findPath(room, { x: n.x, y: n.y }, { x: st[1], y: st[2] })
        }
      }
      for (const n of npcs) {
        n.near = !n.hidden && Math.abs(n.fx - me.fx) <= 1.6 && Math.abs(n.fy - me.fy) <= 1.6
        n.talk = !!n.fala && n.near && !n.bicho // bicho não abre conversa: só faz o barulho dele num balãozinho
        if (n.talk && !talking) talking = n
        const stand = n.modo !== 'senta' && n.modo !== 'celular'
        if (n.next) {
          const dx = n.next.x - n.fx
          const dy = n.next.y - n.fy
          const d = Math.hypot(dx, dy)
          const mv = (n.bicho ? 1.1 : 2.2) * dt
          if (d <= mv) {
            n.fx = n.x = n.next.x
            n.fy = n.y = n.next.y
            n.next = null
            n.wait = 1 + Math.random() * 2.5
            // bicho grande parado fica de lado (de frente/costas a vaca parece "em pé")
            if (n.bicho && (n.fw ?? 16) >= 32 && (n.dir === 'up' || n.dir === 'down')) n.dir = n.side ?? (Math.random() < 0.5 ? 'left' : 'right')
          } else {
            n.fx += (dx / d) * mv
            n.fy += (dy / d) * mv
          }
        } else if (n.talk && stand && !n.bicho) {
          const dx = me.fx - n.fx
          const dy = me.fy - n.fy
          n.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up'
        } else if (n.route.length) {
          // seguindo a rotina, um quadradinho por vez (espera se o caminho estiver ocupado)
          const st = n.route[0]
          const meBusy = Math.abs(st.x * T + T / 2 - me.px) < 14 && Math.abs(st.y * T + 10 - me.py) < 12
          if (!occupied(st.x, st.y, n) && !meBusy) {
            n.route.shift()
            n.dir = dirOf(st.x - n.x, st.y - n.y)
            n.next = { x: st.x, y: st.y }
          }
          if (!n.route.length && n.stop?.[3]) n.hidden = true
        } else if (n.stop?.[3] && n.x === n.stop[1] && n.y === n.stop[2]) {
          n.hidden = true
        } else if (n.modo === 'passeia') {
          n.wait -= dt
          if (n.wait <= 0) {
            n.wait = 0.6
            const [sx, sy] = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(Math.random() * 4)]
            const tx = n.x + sx
            const ty = n.y + sy
            const r = n.raio ?? 3
            // não entra onde o boneco está (o pé pode estar em cima de dois quadradinhos)
            const meBusy = Math.abs(tx * T + T / 2 - me.px) < 14 && Math.abs(ty * T + 10 - me.py) < 12
            // bicho largo (vaca: 3 quadradinhos de desenho) precisa dos vizinhos livres, senão "entra" na cerca
            const wide = n.bicho && (n.fw ?? 16) >= 48
            // bicho não passa pela porteira (só gente)
            const roomy = !gateSet.has(`${tx},${ty}`) && (!wide || (free(room, tx - 1, ty) && free(room, tx + 1, ty)))
            if (Math.abs(tx - n.hx) <= r && Math.abs(ty - n.hy) <= r && free(room, tx, ty) && roomy && !occupied(tx, ty, n) && !meBusy) {
              n.next = { x: tx, y: ty }
              n.dir = dirOf(sx, sy)
              if (n.bicho && sx) n.side = n.dir
            }
          }
        }
      }

      hudRef.current.talk(talking)
      // relógio da turma (1 dia = 1 hora real): luz do céu e noite
      const clock = gameTime()
      const light = room.outdoor ? skyLight(clock) : { dark: 0, dusk: 0, mode: 'dia' }
      const isNight = light.mode === 'noite' && room.outdoor
      hudRef.current.act(!leaving ? findAct(isNight) : null)

      // câmera: segue o boneco sem sair da sala (sala menor que a tela fica no meio)
      const z = view.zoom
      const fit = (screen, size, focus) => (size * z <= screen ? Math.round((screen - size * z) / 2) : Math.round(Math.min(0, Math.max(screen - size * z, screen / 2 - focus * z))))
      // a câmera vai atrás do boneco com suavidade (sem tremer), como no Stardew
      if (view.cx === null) {
        view.cx = me.px
        view.cy = me.py - 8
      }
      const follow = Math.min(1, dt * 7)
      view.cx += (me.px - view.cx) * follow
      view.cy += (me.py - 8 - view.cy) * follow
      view.ox = fit(canvas.width, room.w, view.cx)
      view.oy = fit(canvas.height, room.h, view.cy)

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height) // fora da sala: o fundo da página aparece
      const hero = heroRef.current
      if (floor && objs && hero) {
        ctx.imageSmoothingEnabled = false
        ctx.setTransform(z, 0, 0, z, view.ox, view.oy)
        // sombra suave em volta da sala, para ela "flutuar" sobre o fundo
        ctx.shadowColor = 'rgba(0, 0, 0, 0.55)'
        ctx.shadowBlur = 24 * z
        ctx.shadowOffsetY = 6 * z
        ctx.drawImage(floor, 0, 0)
        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
        ctx.shadowOffsetY = 0
        const time = now / 1000
        if (sea && room.sea) {
          const f = Math.floor(time * room.sea.fps) % room.sea.frames
          ctx.drawImage(sea, 0, f * room.sea.h, room.w, room.sea.h, 0, room.sea.y, room.w, room.sea.h)
        }
        for (const w of waters) {
          if (!w.img) continue
          const f = Math.floor(time * w.fps) % w.frames
          ctx.drawImage(w.img, 0, f * w.h, w.w, w.h, w.x, w.y, w.w, w.h)
        }
        // horta: a terra arada (molhada se regou hoje); as plantas entram na lista de quem fica de pé
        const today = clock.day
        const myPlots = saveRef.current.horta?.[room.code] ?? {}
        const crops = []
        if (tiles) {
          const tilled = (x, y) => !!myPlots[`${x},${y}`]
          for (const [k, plot] of Object.entries(myPlots)) {
            if (!hortaSet.has(k)) continue
            const [px, py] = k.split(',').map(Number)
            const since = sprinklerSince(myPlots, k)
            if (plot.irrigador === undefined) drawTilled(ctx, tiles, tilled, px, py, wetToday(plot, today, since))
            if (plot.planta) crops.push([px, py, plot, since])
            if (plot.irrigador !== undefined) crops.push([px, py, plot, null, true])
          }
        }
        // carros e barcos andam; o carro para se você estiver logo na frente dele
        const meFoot = me.py
        const meX = me.px
        for (const car of cars) {
          const spr = room.sprites[car.name]
          const ahead = car.speed > 0 ? meX - (car.x + spr[2]) : car.x - meX
          const blocked = Math.abs(meFoot - car.fy) < 14 && ahead > -6 && ahead < 26
          if (blocked) car.honk = 1.2
          // fila: não encosta no carro da frente (mesma faixa)
          const queued = cars.some((other) => {
            if (other === car || other.fy !== car.fy) return false
            const ow = room.sprites[other.name][2]
            const gap = car.speed > 0 ? other.x - (car.x + spr[2]) : car.x - (other.x + ow)
            return gap > -spr[2] / 2 && gap < 10
          })
          if (!blocked && !queued) car.x += car.speed * dt
          car.honk = Math.max(0, car.honk - dt)
          const span = room.w + 240
          if (car.x > room.w + 120) car.x -= span
          if (car.x < -120 - spr[2]) car.x += span
        }
        for (const boat of boats) {
          boat.x += boat.speed * dt
          if (boat.x > room.w + 60) boat.x = -boat.fw - 60
          if (boat.x < -boat.fw - 60) boat.x = room.w + 60
        }
        // tudo que fica de pé é desenhado de cima para baixo (quem está mais embaixo fica na frente)
        const list = []
        // o[8]: peça "no chão" (deque, tapete): fica sempre por baixo de quem passa
        for (const o of room.objects) list.push([o[8] ? o[1] : o[1] + o[3], 0, o])
        for (const a of room.anims ?? []) {
          if (a[8] === 'n' && (!isNight || ghostAway(a[11]))) continue // fantasmas: só à noite (e somem um tempo depois de enfrentados)
          if (a[8] === 'd' && isNight) continue // corvos: só de dia
          list.push([a[1] + a[4], 1, a])
        }
        for (const p of patrols) list.push([p.fy, 5, p])
        for (const d of room.doorSprites ?? []) {
          // a porta abre quando você chega perto
          if (Math.abs(me.fx - d.near[0]) <= 1.5 && Math.abs(me.fy - d.near[1]) <= 1.5) list.push([d.y + d.h + 0.1, 6, d])
        }
        for (const car of cars) list.push([car.fy, 2, car])
        for (const boat of boats) list.push([boat.fy, 3, boat])
        for (const n of npcs) if (n.img && !n.hidden) list.push([(n.fy + 1) * T, 7, n])
        for (const c of crops) list.push([(c[1] + 1) * T - 1, 9, c])
        for (const p of peers.values()) if (p.img && p.px !== null) list.push([p.py, 10, p])
        for (const it of items) list.push([(it.y + 1) * T - 0.5, 8, it])
        // porteira fechada (abre quando você está do lado)
        if (gateAnim) {
          // abre quando você, outro jogador ou um morador está do lado; fecha devagar quando todos saem
          const nearGate = (gx, gy, x, y) => x >= gx - 1 && x <= gx + 2 && Math.abs(y - gy) <= 1
          for (const [gx, gy] of gatePairs) {
            const k = `${gx},${gy}`
            let near = nearGate(gx, gy, me.x, me.y)
            if (!near) for (const pp of peers.values()) if (pp.px !== null && nearGate(gx, gy, Math.floor(pp.px / T), Math.floor((pp.py - 1) / T))) near = true
            if (!near) for (const n of npcs) if (!n.bicho && !n.hidden && nearGate(gx, gy, Math.round(n.fx), Math.round(n.fy))) near = true
            const v = Math.max(0, Math.min(1, (gateOpen.get(k) ?? 0) + (near ? dt : -dt) / 0.35))
            gateOpen.set(k, v)
            list.push([(gy + 1) * T - 1, 12, [gx, gy, v]])
          }
        } else if (fenceImg) for (const g of room.gates ?? []) if (!(Math.abs(g[0] - me.x) <= 1 && Math.abs(g[1] - me.y) <= 1)) list.push([(g[1] + 1) * T - 1, 11, g])
        list.push([me.py + 0.5, 4, null])
        list.sort((p, q) => p[0] - q[0])
        for (const [, kind, it] of list) {
          if (kind === 0) {
            const [x, y, w, h, sx0, sy0, key, flip, , alt, oid] = it
            // árvore frutífera que você já colheu: desenho sem fruta até dar de novo
            const bare = alt && !fruitReady(saveRef.current, room.code, oid, today)
            const sx = bare ? alt[0] : sx0
            const sy = bare ? alt[1] : sy0
            const img = key ? atl.get(key) : objs
            if (!img) continue
            // passou atrás de uma peça alta (copa de árvore, telhado): ela fica meio transparente para você se ver
            const behind = h >= 40 && me.py < y + h - 2 && me.py > y + 8 && me.px > x + 2 && me.px < x + w - 2
            if (behind) ctx.globalAlpha = 0.5
            if (flip) {
              ctx.save()
              ctx.translate(x + w, y)
              ctx.scale(-1, 1)
              ctx.drawImage(img, sx, sy, w, h, 0, 0, w, h)
              ctx.restore()
            } else ctx.drawImage(img, sx, sy, w, h, x, y, w, h)
            if (behind) ctx.globalAlpha = 1
          } else if (kind === 1) {
            const [x, y, file, fw, fh, frames, fps, , , ax = 0, ay = 0] = it
            const img = sheets.get(file)
            if (img) ctx.drawImage(img, ax + (Math.floor(time * fps + x * 0.37) % frames) * fw, ay, fw, fh, x, y, fw, fh)
          } else if (kind === 2) {
            const [sx, sy, w, h, key] = room.sprites[it.name]
            const img = key ? atl.get(key) : objs
            if (img) ctx.drawImage(img, sx, sy, w, h, Math.round(it.x), it.fy - h, w, h)
            if (it.honk > 0) {
              ctx.font = 'bold 8px sans-serif'
              ctx.textAlign = 'center'
              const bx = Math.round(it.x + w / 2)
              ctx.fillStyle = '#fffaf0'
              ctx.fillRect(bx - 18, it.fy - h - 14, 36, 11)
              ctx.fillStyle = '#060b14'
              ctx.fillText('bi-bi!', bx, it.fy - h - 5)
            }
          } else if (kind === 5) {
            const img = sheets.get(it.dirR ? it.right : it.left)
            const fx = (Math.floor(time * 8) % it.frames) * it.fw
            // mesma folha para os dois lados: espelha quando volta
            const mirror = !it.dirR && it.right === it.left && it.rx === it.lx && it.ry === it.ly
            if (img && mirror) {
              ctx.save()
              ctx.translate(Math.round(it.x) + it.fw, it.fy - it.fh)
              ctx.scale(-1, 1)
              ctx.drawImage(img, it.lx + fx, it.ly, it.fw, it.fh, 0, 0, it.fw, it.fh)
              ctx.restore()
            } else if (img) ctx.drawImage(img, (it.dirR ? it.rx : it.lx) + fx, it.dirR ? it.ry : it.ly, it.fw, it.fh, Math.round(it.x), it.fy - it.fh, it.fw, it.fh)
          } else if (kind === 6) {
            const img = it.key ? atl.get(it.key) : objs
            if (img) ctx.drawImage(img, it.sx, it.sy, it.w, it.h, it.x, it.y, it.w, it.h)
          } else if (kind === 3) {
            const img = sheets.get(it.file)
            if (img) ctx.drawImage(img, it.ax + (Math.floor(time * 8) % it.frames) * it.fw, it.ay, it.fw, it.fh, Math.round(it.x), it.fy - it.fh, it.fw, it.fh)
          } else if (kind === 8) {
            // item: flutua devagar e brilha
            const bob = Math.round(Math.sin(time * 3 + it.x) * 1.5)
            const cx = it.x * T + T / 2
            const foot = (it.y + 1) * T - 2
            ctx.fillStyle = 'rgba(0,0,0,0.22)'
            ctx.fillRect(cx - 4, foot - 1, 8, 2)
            if (it.tipo === 'moeda') {
              if (coin) ctx.drawImage(coin, Math.round(cx - 7), foot - 14 + bob, 15, 13)
            } else {
              const img = atl.get(it.key)
              if (img) {
                const [sx, sy, w, h] = it.rect
                const sc = Math.min(1, 16 / Math.max(w, h)) // item grande vira miniatura no chão
                ctx.drawImage(img, sx, sy, w, h, Math.round(cx - (w * sc) / 2), Math.round(foot - h * sc + bob - 1), Math.round(w * sc), Math.round(h * sc))
              }
            }
            if (Math.floor(time * 2 + it.x * 0.7) % 3 === 0) {
              ctx.fillStyle = '#fffbe0'
              const sp = (time * 4 + it.y) % 6
              ctx.fillRect(Math.round(cx + 4 - sp / 2), foot - 14 + Math.round(sp), 1, 3)
              ctx.fillRect(Math.round(cx + 3 - sp / 2), foot - 13 + Math.round(sp), 3, 1)
            }
          } else if (kind === 9) {
            // planta: quadro da folha de crescimento (0 a 5 crescendo, 6 = pronta)
            const [px, py, plot, since, isSprinkler] = it
            if (isSprinkler) {
              // irrigador: parado; de manhã (6:00 às 6:40) gira jogando água
              const lib = libRef.current
              const r = lib?.pecas?.fazenda_construcoes?.sprinkler
              const an = lib?.anims?.fz_sprinkler
              const morning = clock.hour === 6 && clock.min < 40
              if (morning && an && sprinklerImg) {
                const f = Math.floor(time * 10) % an[5]
                ctx.drawImage(sprinklerImg, an[1] + f * an[3], an[2], an[3], an[4], px * T + T / 2 - an[3] / 2, py * T + T / 2 - an[4] / 2, an[3], an[4])
              } else if (r && cropsAtlas) ctx.drawImage(cropsAtlas, r[0], r[1], r[2], r[3], px * T, py * T, r[2], r[3])
              continue
            }
            const g = growth(saveRef.current, skillsRef.current, plot, today, since)
            const r = libRef.current?.pecas?.fazenda_crescimento?.[CROPS[plot.planta]?.folha]
            const img = r && cropImg
            if (img) {
              const f = g >= 1 ? 6 : Math.min(5, Math.floor(g * 6))
              ctx.drawImage(img, r[0] + f * 16, r[1], 16, r[3], px * T, (py + 1) * T - r[3] - 2, 16, r[3])
            }
            if (g >= 1 && Math.floor(time * 2 + px) % 3 === 0) {
              ctx.fillStyle = '#fffbe0'
              ctx.fillRect(px * T + 12, (py + 1) * T - r[3] + 2, 1, 3)
              ctx.fillRect(px * T + 11, (py + 1) * T - r[3] + 3, 3, 1)
            }
          } else if (kind === 10) {
            // outra pessoa no mapa (multiplayer): mesmo boneco 16x32 e o nome em cima
            const frame = DIRS[it.dir] * 6 + (Math.floor(it.anim) % 6)
            const puse = it.fz === 'pesca' ? { id: 'vara', t: it.fishT } : it.swing && TOOL_ANIMS[it.tool] && !it.mv ? { id: it.tool, t: it.useT, recolhe: it.reel } : null
            const fancy = drawWithTool(ctx, it.img, { dir: it.dir, walking: !!it.mv, frame: Math.floor(it.anim), held: it.fz, use: puse, skin: skinOf(it.char) }, it.px - 8, it.py - 30)
            const ptool = fancy ? null : it.swing ? it.tool : null
            const pk = it.swing ? 1 - it.swing / TOOL_TIME : 0.5
            if (ptool && it.dir === 'up') drawTool(it.px, it.py, it.dir, ptool, pk)
            if (!fancy) ctx.drawImage(it.img, frame * T, it.mv ? 32 : 0, T, 32, Math.round(it.px - 8), Math.round(it.py - 30), T, 32)
            if (ptool && it.dir !== 'up') drawTool(it.px, it.py, it.dir, ptool, pk)
            ctx.font = 'bold 6px sans-serif'
            ctx.textAlign = 'center'
            const w = Math.min(70, ctx.measureText(it.nome).width + 6)
            ctx.fillStyle = 'rgba(20, 14, 10, 0.7)'
            ctx.fillRect(Math.round(it.px - w / 2), Math.round(it.py - 40), w, 8)
            ctx.fillStyle = '#fff3d6'
            ctx.fillText(it.nome, Math.round(it.px), Math.round(it.py - 34))
          } else if (kind === 12) {
            // quadros 0 (fechada) até a metade (aberta); a 2ª metade da folha é o fechar
            const open = Math.round(it[2] * (Math.floor(gateAnim.frames / 2) - 1))
            ctx.drawImage(gateAnim.img, gateAnim.sx + open * gateAnim.fw, gateAnim.sy, gateAnim.fw, gateAnim.fh, it[0] * T, (it[1] + 1) * T - gateAnim.fh, gateAnim.fw, gateAnim.fh)
          } else if (kind === 11) {
            ctx.drawImage(fenceImg, it[2], it[3], T, T, it[0] * T, it[1] * T, T, T)
          } else if (kind === 7 && it.bicho) {
            // bicho: linha 1 = parado (respirando), linha 2 = andando; 4 direções x 6 quadros
            const row = it.next ? 2 : 1
            const col = DIRS[it.dir] * 6 + (Math.floor(time * (it.next ? 8 : 4) + it.hx) % 6)
            ctx.drawImage(it.img, col * it.fw, row * it.fh, it.fw, it.fh, Math.round(it.fx * T + T / 2 - it.fw / 2), Math.round((it.fy + 1) * T - it.fh + Math.round(it.fh / 8)), it.fw, it.fh)
          } else if (kind === 7) {
            const pose = n7pose(it)
            drawChar(ctx, it.img, pose, pose === 'senta' && it.dir !== 'left' ? 'right' : it.dir, time + it.hx * 0.37, it.fx * T, it.fy * T - T)
          } else {
            // boneco: 16x32, o pé no fundo do quadradinho
            const frame = DIRS[me.dir] * 6 + (Math.floor(me.anim) % 6)
            const k = swing > 0 ? 1 - swing / TOOL_TIME : 0
            const fishing = jobRef.current?.tipo === 'pesca'
            // ferramenta com animação do pacote (enxada, regador, vara, colher): segurando ou usando
            const myUse = fishing ? { id: 'vara', t: fishT } : swingTool && TOOL_ANIMS[swingTool] ? { id: swingTool, t: useT, recolhe: reel } : null
            const animTool = !!myUse || (!swingTool && !!heldTool())
            const hop = swing > 0 && !animTool ? -Math.round(Math.sin(k * Math.PI) * 2) : 0 // "pulinho" ao usar a ferramenta
            const toolId = animTool ? null : swingTool
            if (toolId && me.dir === 'up') drawTool(me.px, me.py, me.dir, toolId, swingTool ? k : 0.5) // de costas: a ferramenta fica atrás
            // arma do RPG: um brilho pulsando no chão, em volta do pé (a cor diz o nível)
            const glow = weaponGlow(saveRef.current)
            if (glow) {
              const pulse = 0.35 + Math.sin(time * 3) * 0.12
              ctx.save()
              ctx.globalAlpha = pulse
              ctx.fillStyle = glow
              ctx.beginPath()
              ctx.ellipse(Math.round(me.px), Math.round(me.py), 9, 4, 0, 0, Math.PI * 2)
              ctx.fill()
              ctx.globalAlpha = pulse * 0.6
              for (let i = 0; i < 3; i += 1) {
                const a = time * 1.6 + (i * Math.PI * 2) / 3
                ctx.fillRect(Math.round(me.px + Math.cos(a) * 8), Math.round(me.py - 10 - Math.sin(time * 2 + i) * 6), 1, 1)
              }
              ctx.restore()
            }
            const drawn = animTool && drawWithTool(ctx, hero, { dir: me.dir, walking, frame: Math.floor(me.anim), held: heldTool(), use: myUse, skin: skinOf(charRef.current) }, me.px - 8, me.py - 30)
            if (!drawn) ctx.drawImage(hero, frame * T, walking ? 32 : 0, T, 32, Math.round(me.px - 8), Math.round(me.py - 30) + hop, T, 32)
            if (toolId && me.dir !== 'up') drawTool(me.px, me.py, me.dir, toolId, swingTool ? k : 0.5)
          }
        }
        // susto: à noite, chegar perto de um fantasma
        if (isNight) {
          for (const a of room.anims ?? []) {
            if (a[8] !== 'n' || ghostAway(a[11])) continue
            const gx = a[0] + a[3] / 2
            const gy = a[1] + a[4]
            if (Math.abs(gx - meX) < 30 && Math.abs(gy - meFoot) < 30) {
              ctx.font = 'bold 9px sans-serif'
              ctx.textAlign = 'center'
              ctx.fillStyle = '#e8fff8'
              ctx.fillRect(gx - 24, a[1] - 4, 48, 13)
              ctx.fillStyle = '#063'
              ctx.fillText('BUUU!', gx, a[1] + 6)
            }
          }
        }
        // fim de tarde e noite: escurece e acende as luzes (postes, quiosques, palco e o farol girando)
        // a luz vem do relógio da turma: amanhecer, dia, fim de tarde (alaranjado) e noite (as luzes acendem)
        if (light.dark > 0.01 || light.dusk > 0.01) {
          const night = light.dark > 0.3
          const lit = Math.min(1, light.dark / 0.6) // quanto as luzes aparecem
          if (shade.width !== canvas.width || shade.height !== canvas.height) {
            shade.width = canvas.width
            shade.height = canvas.height
          }
          const sctx = shade.getContext('2d')
          sctx.setTransform(1, 0, 0, 1, 0, 0)
          sctx.globalCompositeOperation = 'source-over'
          sctx.clearRect(0, 0, shade.width, shade.height)
          sctx.fillStyle = `rgba(6, 10, 38, ${light.dark})`
          sctx.fillRect(0, 0, shade.width, shade.height)
          if (light.dusk > 0.01) {
            sctx.fillStyle = `rgba(150, 60, 30, ${light.dusk})`
            sctx.fillRect(0, 0, shade.width, shade.height)
          }
          sctx.setTransform(z, 0, 0, z, view.ox, view.oy)
          sctx.globalCompositeOperation = 'destination-out'
          for (const [lx, ly, r] of room.lights ?? []) {
            const flick = 1 + Math.sin(time * 3 + lx) * 0.04
            const g = sctx.createRadialGradient(lx, ly, 0, lx, ly, r * flick)
            g.addColorStop(0, `rgba(0,0,0,${0.95 * lit})`)
            g.addColorStop(1, 'rgba(0,0,0,0)')
            sctx.fillStyle = g
            sctx.fillRect(lx - r, ly - r, r * 2, r * 2)
          }
          ctx.setTransform(1, 0, 0, 1, 0, 0)
          ctx.drawImage(shade, 0, 0)
          ctx.setTransform(z, 0, 0, z, view.ox, view.oy)
          ctx.globalCompositeOperation = 'lighter'
          for (const [lx, ly, r, color] of room.lights ?? []) {
            const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, r * 0.7)
            g.addColorStop(0, `rgba(${color},${0.32 * lit})`)
            g.addColorStop(1, `rgba(${color},0)`)
            ctx.fillStyle = g
            ctx.fillRect(lx - r, ly - r, r * 2, r * 2)
          }
          if (night && room.beacon) {
            // o farol varrendo o mar
            const [bx, by] = room.beacon
            const ang = time * 0.9
            ctx.save()
            ctx.translate(bx, by)
            ctx.rotate(ang)
            const g = ctx.createLinearGradient(0, 0, 420, 0)
            g.addColorStop(0, 'rgba(255,240,180,0.35)')
            g.addColorStop(1, 'rgba(255,240,180,0)')
            ctx.fillStyle = g
            ctx.beginPath()
            ctx.moveTo(0, 0)
            ctx.lineTo(420, -46)
            ctx.lineTo(420, 46)
            ctx.closePath()
            ctx.fill()
            ctx.restore()
          }
          ctx.globalCompositeOperation = 'source-over'
        }
        // alvo da ferramenta (o quadradinho da frente ou o do mouse), quando tem algo na mão que se usa no chão
        {
          const s = saveRef.current
          const key = s.hot[s.sel]
          const id = key && s.inv.find((it) => it.key === key)?.bem
          const b = id && BENS[id]
          if (b && (b.tipo === 'ferramenta' || b.tipo === 'semente') && id !== 'panela' && id !== 'caixa' && !jobRef.current) {
            const [tx, ty] = target()
            const k = `${tx},${ty}`
            const plot = myPlots[k]
            const ok =
              id === 'enxada' ? hortaSet.has(k) && !plot : id === 'regador' ? !!plot && plot.irrigador === undefined && !wetToday(plot, today, sprinklerSince(myPlots, k)) : id === 'vara' ? !!room.wet?.has(k) : !!plot && !plot.planta
            ctx.strokeStyle = ok ? 'rgba(255, 246, 210, 0.95)' : 'rgba(255, 120, 100, 0.55)'
            ctx.lineWidth = 1
            ctx.strokeRect(tx * T + 0.5, ty * T + 0.5, T - 1, T - 1)
            if (ok) {
              ctx.fillStyle = 'rgba(255, 246, 210, 0.16)'
              ctx.fillRect(tx * T + 1, ty * T + 1, T - 2, T - 2)
            }
          }
        }
        for (const e of effects) {
          const k = e.t / 0.5
          for (let i = 0; i < 6; i += 1) {
            const ang = (i / 6) * Math.PI * 2 + e.x
            const r = 2 + k * 7
            ctx.fillStyle = e.kind === 'agua' ? `rgba(120, 190, 255, ${1 - k})` : e.kind === 'colher' ? `rgba(255, 246, 180, ${1 - k})` : `rgba(110, 72, 40, ${1 - k})`
            ctx.fillRect(Math.round(e.x + Math.cos(ang) * r), Math.round(e.y + Math.sin(ang) * r * 0.6 - k * (e.kind === 'agua' ? -3 : 4)), 2, 2)
          }
        }
        // marcadores das atividades (por cima de tudo, até à noite): o que quebrou, as lojas e o destino da entrega
        for (const a of room.acts ?? []) {
          const bob = Math.round(Math.sin(time * 3 + a.cx) * 1.5)
          if (a.tipo === 'conserto' && broken(a)) {
            const bx = Math.round(a.cx)
            const by = a.top - 6 + bob
            ctx.fillStyle = '#ffd166'
            ctx.beginPath()
            ctx.arc(bx, by, 5, 0, Math.PI * 2)
            ctx.fill()
            ctx.fillStyle = '#3a2a00'
            ctx.fillRect(bx - 0.75, by - 3, 1.5, 4)
            ctx.fillRect(bx - 0.75, by + 2, 1.5, 1.5)
          } else if (a.tipo === 'loja' && shopIcon) ctx.drawImage(shopIcon, Math.round(a.cx - 6), a.top - 14 + bob, 12, 11)
        }
        const ent = saveRef.current.entrega
        if (ent && ent.mapa === room.code) {
          const n = ent.para.tipo === 'npc' ? npcs.find((x) => x.id === ent.para.id) : null
          const dest = n ? { x: n.fx * T + T / 2, y: n.fy * T - T - 8 } : (() => {
            const a = (room.acts ?? []).find((x) => x.id === ent.para.id)
            return a && { x: a.cx, y: a.top - 4 }
          })()
          if (dest) {
            const by = Math.round(dest.y - 10 + Math.abs(Math.sin(time * 4)) * -5)
            ctx.fillStyle = '#ff8a3d'
            ctx.beginPath()
            ctx.moveTo(dest.x - 6, by)
            ctx.lineTo(dest.x + 6, by)
            ctx.lineTo(dest.x, by + 8)
            ctx.closePath()
            ctx.fill()
            ctx.strokeStyle = '#fffaf0'
            ctx.lineWidth = 1
            ctx.stroke()
          }
        }
        // balão de fala de quem está perto
        // quem tem algo para falar mostra um balãozinho; a conversa aparece embaixo (Turma2Hud)
        for (const n of npcs) {
          if (!n.fala || !n.img || n.hidden) continue
          if (n.bicho) {
            if (!n.near) continue
            ctx.font = 'bold 7px sans-serif'
            ctx.textAlign = 'center'
            const bx = Math.round(n.fx * T + T / 2)
            const by = Math.round((n.fy + 1) * T - n.fh - 2)
            const w = ctx.measureText(n.fala).width + 8
            ctx.fillStyle = '#fffaf0'
            ctx.fillRect(Math.round(bx - w / 2), by - 10, Math.round(w), 11)
            ctx.fillStyle = '#3b2419'
            ctx.fillText(n.fala, bx, by - 2)
            continue
          }
          const bx = Math.round(n.fx * T + T / 2)
          const by = Math.round(n.fy * T - T - 6 + (n.talk ? 0 : Math.sin(time * 4 + n.hx) * 1.2))
          ctx.fillStyle = '#fffaf0'
          ctx.fillRect(bx - 5, by - 6, 10, 7)
          ctx.beginPath()
          ctx.moveTo(bx - 2, by + 1)
          ctx.lineTo(bx + 2, by + 1)
          ctx.lineTo(bx, by + 3)
          ctx.fill()
          ctx.fillStyle = n.talk ? '#0b6b5c' : '#060b14'
          for (let d = 0; d < 3; d += 1) ctx.fillRect(bx - 3 + d * 2.5, by - 3, 1.2, 1.2)
        }
        // emotes e falas do chat (você, os outros e os NPCs)
        drawBubble(me.px, me.py - 32, me.bubble, time)
        for (const p of peers.values()) if (p.px !== null) drawBubble(p.px, p.py - 42, p.bubble, time)
        for (const n of npcs) if (!n.hidden && n.bubble) drawBubble(n.fx * T + T / 2, (n.fy + 1) * T - (n.fh ?? 32) - 4, n.bubble, time)
        if (fade > 0) {
          ctx.setTransform(1, 0, 0, 1, 0, 0)
          ctx.fillStyle = `rgba(5, 8, 16, ${fade})`
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          ctx.setTransform(z, 0, 0, z, view.ox, view.oy)
        }
        if (gridRef.current) {
          ctx.globalAlpha = 0.35
          room.walk.forEach((line, y) => {
            for (let x = 0; x < line.length; x += 1) {
              ctx.fillStyle = line[x] === '.' ? '#3ddc84' : '#ff4d4d'
              ctx.fillRect(x * T + 1, y * T + 1, T - 2, T - 2)
            }
          })
          ctx.globalAlpha = 1
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    box.focus({ preventScroll: true })

    return () => {
      alive = false
      cancelAnimationFrame(raf)
      observer.disconnect()
      box.removeEventListener('keydown', onKey)
      box.removeEventListener('keyup', onKey)
      box.removeEventListener('blur', onBlur)
      canvas.removeEventListener('pointerdown', onPointer)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('wheel', onWheel)
      live?.close()
    }
  }, [room])

  const label = room?.label ?? rows.find((r) => r.code === code)?.name ?? code
  const maps = [
    ...DATA.rooms.filter((r) => !r.hidden).map((r) => ({ code: r.code, label: r.label })),
    ...rows.filter(isMapRow).map((r) => ({ code: r.code, label: r.name, draft: !r.published })),
  ]
  return (
    <div className="t2">
      <div ref={boxRef} className="t2-stage" tabIndex={0} aria-label={`${label}: ande com as setas ou WASD, ou clique no chão`}>
        <canvas ref={canvasRef} />
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
