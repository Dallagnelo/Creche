import { useEffect, useMemo, useRef, useState } from 'react'
import DATA from '../../lib/turma2Rooms.json'
import { composeChar, drawChar } from '../../lib/turma2/character'
import { atlasUrl, loadLibrary } from '../../lib/turma2/assets'
import { compileMap } from '../../lib/turma2/compile'
import { HUD_CODE, isMapRow } from '../../lib/turma2/hudConfig'
import { SKILLS_CODE, addXp, applyLook, bonus, levelIn, normalizeSkills, skillById } from '../../lib/turma2/skills'
import { BENS, CROPS, FIX_AGAIN_MS, GHOST_BACK_MS, countOf, giveGood, giveKit, growth, sellPrice, takeGood } from '../../lib/turma2/economy'
import { addItem, dropItem, emptySave, fixSave, isTaken, loadSave, writeSave } from '../../lib/turma2/save'
import { useAuth } from '../../contexts/AuthContext'
import Turma2Hud, { HUD } from './Turma2Hud'
import { START_CODE, listMaps } from '../../services/turma2Maps'
import { loadRemoteSave, queueRemoteSave } from '../../services/turma2Save'

// Turma 2.0 (teste): as salas prontas do museu do LimeZu, desenhadas só com os sprites do pacote.
// Camadas: chão e paredes → objetos atrás do boneco → boneco → objetos na frente dele
// (cada objeto tem a "linha do pé": se o pé do boneco está mais embaixo, ele passa na frente).
// Anda com as setas / WASD ou clicando no chão. Por enquanto é só você na sala (modo de teste).

const T = 16
const ACT_ORDER = ['correio', 'loja', 'cozinha', 'conserto', 'coragem'] // perto de duas coisas: vale a primeira
const ghostGone = new Map() // fantasmas enfrentados há pouco ("mapa:id" → quando)
const SPEED = 4.5 // quadradinhos por segundo
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
  const { user, profile } = useAuth()
  const uid = user?.id
  const [save, setSave] = useState(() => giveKit(loadSave(uid)))
  const saveRef = useRef(save)
  saveRef.current = save
  // o visual liberado de uma habilidade (vestido na janela Habilidades) vai por cima do personagem
  const character = rawCharacter ? applyLook(rawCharacter, save, skillsCfg) : null
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
  const [sky, setSky] = useState('dia') // lugares ao ar livre: dia, fim de tarde ou noite (as luzes acendem)
  const skyRef = useRef(sky)
  skyRef.current = sky
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
    talk: (n) => setTalk((cur) => ((cur?.id ?? null) === (n?.id ?? null) ? cur : n && { id: n.id, nome: n.nome, fala: n.fala, c: n.c })),
    act: (a) => setAct((cur) => (cur?.key === a?.key && cur?.label === a?.label ? cur : a)),
    collect: (roomCode, item) => {
      commit(addItem(saveRef.current, roomCode, item))
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
    if (['pesca', 'cozinha', 'conserto', 'loja', 'coragem'].includes(a.tipo)) setJob({ tipo: a.tipo, id: a.id })
    else if (a.tipo === 'horta') {
      const plots = s.horta?.[w.room.code] ?? {}
      const plot = plots[a.cell]
      if (a.step === 'plantar') setJob({ tipo: 'plantar', cell: a.cell })
      else if (a.step === 'regar') {
        commit({ ...s, horta: { ...s.horta, [w.room.code]: { ...plots, [a.cell]: { ...plot, regado: 1 } } } })
        note('Regou! Vai crescer mais rápido.')
      } else if (a.step === 'colher') {
        const qtd = Math.random() * 100 < bonus(s, cfg, 'jardinagem', 'dobro') ? 2 : 1
        const { [a.cell]: _gone, ...rest } = plots
        let next = giveGood({ ...s, horta: { ...s.horta, [w.room.code]: rest } }, plot.planta, qtd)
        next = gainXp(next, 'jardinagem', CROPS[plot.planta].xp * qtd)
        commit(next)
        note(`Colheu ${qtd > 1 ? '2× ' : ''}${BENS[plot.planta].nome}`)
      }
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
      const coins = Math.max(1, Math.round((4 + e.dist / 3) * (1 + bonus(s, cfg, 'entregas', 'moedas') / 100) * (late ? 0.5 : 1)))
      const next = gainXp({ ...s, entrega: null, moedas: s.moedas + coins }, 'entregas', Math.round((10 + e.dist / 2) * (late ? 0.5 : 1)))
      commit(next)
      note(`Entregue! +${coins} moedas${late ? ' (atrasou: metade)' : ''}`)
    }
  }
  const jobResult = (r) => {
    const s = saveRef.current
    const cfg = skillsRef.current
    const room = worldRef.current?.room
    if (r.tipo === 'pesca') {
      commit(gainXp(giveGood(s, r.fish.id, r.fish.qtd), 'pesca', r.fish.xp * r.fish.qtd))
    } else if (r.tipo === 'cozinha') {
      let next = s
      for (const u of r.uses) next = takeGood(next, u)
      commit(gainXp(giveGood(next, r.dish, r.qtd), 'culinaria', r.xp))
    } else if (r.tipo === 'conserto') {
      const lv = levelIn(s, 'mecanica')
      const dbl = Math.random() * 100 < bonus(s, cfg, 'mecanica', 'dobro') ? 2 : 1
      const coins = Math.round((4 + lv / 4) * (1 + bonus(s, cfg, 'mecanica', 'moedas') / 100) * dbl)
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
    } else if (r.tipo === 'plantar') {
      const planta = BENS[r.semente].planta
      const plots = s.horta?.[room.code] ?? {}
      commit({ ...takeGood(s, r.semente), horta: { ...s.horta, [room.code]: { ...plots, [job.cell]: { planta, t: Date.now(), regado: 0 } } } })
      note(`Plantou ${BENS[planta].nome}. Volte quando estiver pronta!`)
      setJob(null)
    } else if (r.tipo === 'vender') {
      const have = countOf(s, r.id)
      const qtd = Math.min(have, r.qtd)
      if (!qtd) return
      const total = sellPrice(s, cfg, r.id) * qtd
      commit(gainXp({ ...takeGood(s, r.id, qtd), moedas: s.moedas + total }, 'comercio', Math.max(1, Math.round(total * 0.8))))
    } else if (r.tipo === 'comprar') {
      if (s.moedas < r.preco) return
      commit(giveGood({ ...s, moedas: s.moedas - r.preco }, r.id))
    }
  }
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
    if (room?.custom && room.sky) setSky(room.sky)
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
    const me = { x: start[0], y: start[1], fx: start[0], fy: start[1], dir: 'up', next: null, path: [], anim: 0 }
    if (window.__ROOM_TEST__) window.__t2 = { me, room, go: (x, y) => (me.path = findPath(room, { x: me.x, y: me.y }, { x, y })) } // só nos testes
    let fade = 1 // escurecido ao chegar: clareia; ao entrar numa porta: escurece e troca de lugar
    let leaving = null
    const held = []
    let view = { zoom: 3, ox: 0, oy: 0 }

    const resize = () => {
      const rect = box.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.round(rect.width * dpr)
      canvas.height = Math.round(rect.height * dpr)
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      // zoom inteiro (pixel art sem borrar), o maior que cabe: a sala ocupa a caixa toda na largura
      // ou na altura (o resto a câmera mostra andando); no mínimo 2x, no máximo 6x
      const fitW = canvas.width / room.w
      const fitH = canvas.height / room.h
      view.zoom = Math.max(2, Math.min(6, Math.floor(Math.max(Math.min(fitW, fitH * 1.6), Math.min(fitW, fitH)))))
    }
    const observer = new ResizeObserver(resize)
    observer.observe(box)
    resize()

    const onKey = (event) => {
      const step = KEYS[event.code]
      if (!step) return
      event.preventDefault()
      const i = held.findIndex((s) => s === step)
      if (event.type === 'keydown') {
        if (i < 0) held.push(step)
        me.path = []
      } else if (i >= 0) held.splice(i, 1)
    }
    const onBlur = () => (held.length = 0)
    const onPointer = (event) => {
      box.focus({ preventScroll: true })
      const rect = canvas.getBoundingClientRect()
      const dpr = canvas.width / rect.width
      const px = ((event.clientX - rect.left) * dpr - view.ox) / view.zoom
      const py = ((event.clientY - rect.top) * dpr - view.oy) / view.zoom
      const target = { x: Math.floor(px / T), y: Math.floor(py / T) }
      const start = me.next ?? { x: me.x, y: me.y }
      me.path = findPath(room, start, target)
    }
    box.addEventListener('keydown', onKey)
    box.addEventListener('keyup', onKey)
    box.addEventListener('blur', onBlur)
    canvas.addEventListener('pointerdown', onPointer)

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
    const npcs = (room.npcs ?? []).map((n) => ({ ...n, hx: n.x, hy: n.y, fx: n.x, fy: n.y, next: null, wait: 1 + Math.random() * 2, img: null, dir: n.dir ?? 'down', talk: false }))
    npcs.forEach((n) => {
      composeChar(n.c).then((img) => (n.img = img)).catch(() => {})
    })
    // itens para pegar (mapas do editor): moedas e peças da biblioteca; somem quando você pega
    const items = (room.items ?? []).filter((it) => !isTaken(saveRef.current, room.code, it.id))
    let coin = null
    if (items.some((it) => it.tipo === 'moeda')) loadImage(`${HUD}i_moeda.png`).then((img) => (coin = img)).catch(() => {})
    const occupied = (x, y, self) => npcs.some((n) => n !== self && ((n.x === x && n.y === y) || (n.next && n.next.x === x && n.next.y === y)))
    const canStep = (x, y) => free(room, x, y) && !occupied(x, y)
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
    const fishSet = room.fish ?? new Set()
    worldRef.current = { room, npcs, me, acts: room.acts ?? [] }
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
      if (hortaSet.has(here)) {
        const plot = s.horta?.[room.code]?.[here]
        if (!plot) return { key: `horta:${here}`, tipo: 'horta', step: 'plantar', cell: here, label: 'Plantar' }
        const g = growth(s, cfg, plot)
        const nome = BENS[plot.planta].nome
        if (g >= 1) return { key: `horta:${here}:c`, tipo: 'horta', step: 'colher', cell: here, label: `Colher ${nome}` }
        const pct = `${Math.floor(g * 100)}%`
        if (!plot.regado && countOf(s, 'regador')) return { key: `horta:${here}:r`, tipo: 'horta', step: 'regar', cell: here, label: `Regar ${nome}`, sub: pct }
        return { key: `horta:${here}:w`, tipo: 'horta', off: true, label: `${nome} crescendo…`, sub: pct }
      }
      for (const a of [...(actNear.get(here) ?? [])].sort((p, q) => ACT_ORDER.indexOf(p.tipo) - ACT_ORDER.indexOf(q.tipo))) {
        if (a.tipo === 'loja') return { key: `loja:${a.id}`, tipo: 'loja', id: a.id, label: 'Abrir a loja' }
        if (a.tipo === 'cozinha') return { key: `cozinha:${a.id}`, tipo: 'cozinha', id: a.id, label: 'Cozinhar' }
        if (a.tipo === 'correio') return s.entrega ? { key: 'correio:x', tipo: 'correio', off: true, label: 'Você já está com um pacote' } : { key: `correio:${a.id}`, tipo: 'correio', id: a.id, label: 'Pegar uma entrega' }
        if (a.tipo === 'conserto' && broken(a)) return { key: `conserto:${a.id}`, tipo: 'conserto', id: a.id, label: 'Consertar' }
        if (a.tipo === 'coragem' && night && !ghostAway(a.id)) return { key: `coragem:${a.id}`, tipo: 'coragem', id: a.id, label: 'Enfrentar o fantasma' }
      }
      if (fishSet.has(here)) return { key: 'pesca', tipo: 'pesca', label: 'Pescar' }
      return null
    }
    const shade = document.createElement('canvas') // a escuridão da noite, com "buracos" onde tem luz

    let last = performance.now()
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      // com uma atividade aberta o boneco fica parado
      if (jobRef.current) {
        held.length = 0
        me.path = []
      }
      // andar: de quadradinho em quadradinho, deslizando
      if (!me.next && !leaving) {
        const key = held[held.length - 1]
        if (key) {
          me.dir = dirOf(key[0], key[1])
          if (canStep(me.x + key[0], me.y + key[1])) me.next = { x: me.x + key[0], y: me.y + key[1] }
        } else if (me.path.length) {
          const step = me.path.shift()
          me.dir = dirOf(step.x - me.x, step.y - me.y)
          if (canStep(step.x, step.y)) me.next = step
          else me.path = [] // tem alguém no caminho
        }
      }
      if (me.next) {
        const dx = me.next.x - me.fx
        const dy = me.next.y - me.fy
        const dist = Math.hypot(dx, dy)
        const move = SPEED * (1 + bonus(saveRef.current, skillsRef.current, 'entregas', 'rapido') / 100) * dt
        if (dist <= move) {
          me.fx = me.x = me.next.x
          me.fy = me.y = me.next.y
          me.next = null
          // pisou numa porta: escurece e vai para o outro lugar
          const gotIdx = items.findIndex((it) => it.x === me.x && it.y === me.y)
          if (gotIdx >= 0) hudRef.current.collect(room.code, items.splice(gotIdx, 1)[0])
          const door = (room.doors ?? []).find((d) => d.x === me.x && d.y === me.y)
          if (door && !leaving) {
            leaving = door
            me.path = []
            held.length = 0
          }
        } else {
          me.fx += (dx / dist) * move
          me.fy += (dy / dist) * move
        }
      }
      const walking = !!me.next
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
      for (const n of npcs) {
        n.talk = !!n.fala && Math.abs(n.fx - me.fx) <= 1.6 && Math.abs(n.fy - me.fy) <= 1.6
        if (n.talk && !talking) talking = n
        const stand = n.modo !== 'senta' && n.modo !== 'celular'
        if (n.next) {
          const dx = n.next.x - n.fx
          const dy = n.next.y - n.fy
          const d = Math.hypot(dx, dy)
          const mv = 2.2 * dt
          if (d <= mv) {
            n.fx = n.x = n.next.x
            n.fy = n.y = n.next.y
            n.next = null
            n.wait = 1 + Math.random() * 2.5
          } else {
            n.fx += (dx / d) * mv
            n.fy += (dy / d) * mv
          }
        } else if (n.talk && stand) {
          const dx = me.fx - n.fx
          const dy = me.fy - n.fy
          n.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up'
        } else if (n.modo === 'passeia') {
          n.wait -= dt
          if (n.wait <= 0) {
            n.wait = 0.6
            const [sx, sy] = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(Math.random() * 4)]
            const tx = n.x + sx
            const ty = n.y + sy
            const r = n.raio ?? 3
            const meBusy = (me.x === tx && me.y === ty) || (me.next && me.next.x === tx && me.next.y === ty)
            if (Math.abs(tx - n.hx) <= r && Math.abs(ty - n.hy) <= r && free(room, tx, ty) && !occupied(tx, ty, n) && !meBusy) {
              n.next = { x: tx, y: ty }
              n.dir = dirOf(sx, sy)
            }
          }
        }
      }

      hudRef.current.talk(talking)
      hudRef.current.act(!me.next && !leaving ? findAct(room.outdoor && skyRef.current === 'noite') : null)

      // câmera: segue o boneco sem sair da sala (sala menor que a tela fica no meio)
      const z = view.zoom
      const fit = (screen, size, focus) => (size * z <= screen ? Math.round((screen - size * z) / 2) : Math.round(Math.min(0, Math.max(screen - size * z, screen / 2 - focus * z))))
      view.ox = fit(canvas.width, room.w, me.fx * T + T / 2)
      view.oy = fit(canvas.height, room.h, me.fy * T)

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
        // horta: o que cada um plantou (broto → planta → pronta para colher)
        const myPlots = saveRef.current.horta?.[room.code]
        if (myPlots) {
          for (const [k, plot] of Object.entries(myPlots)) {
            if (!hortaSet.has(k)) continue
            const [px, py] = k.split(',').map(Number)
            const g = growth(saveRef.current, skillsRef.current, plot)
            if (plot.regado) {
              ctx.fillStyle = 'rgba(40, 22, 8, 0.35)'
              ctx.fillRect(px * T + 1, py * T + 1, T - 2, T - 2)
            }
            const icon = g >= 1 ? BENS[plot.planta].icone : g < 0.5 ? { src: 'pecas', t: 'graveyard', n: 'little_sprout_1' } : { src: 'pecas', t: 'camping', n: 'sprout_4' }
            const sp = sprite(icon.src, icon.t, icon.n)
            if (sp) {
              const [sx, sy, sw, sh] = sp.r
              const sc = Math.min(1, 14 / Math.max(sw, sh))
              const dw = Math.round(sw * sc)
              const dh = Math.round(sh * sc)
              ctx.drawImage(sp.img, sx, sy, sw, sh, px * T + Math.round((T - dw) / 2), (py + 1) * T - dh - 1, dw, dh)
            }
            if (g >= 1 && Math.floor(time * 2 + px) % 3 === 0) {
              ctx.fillStyle = '#fffbe0'
              ctx.fillRect(px * T + 12, py * T + 2, 1, 3)
              ctx.fillRect(px * T + 11, py * T + 3, 3, 1)
            }
          }
        }
        for (const p of patrols) {
          p.x += (p.dirR ? 1 : -1) * p.speed * dt
          if (p.x > p.x1) p.dirR = false
          if (p.x < p.x0) p.dirR = true
        }
        // carros e barcos andam; o carro para se você estiver logo na frente dele
        const meFoot = (me.fy + 1) * T
        const meX = me.fx * T + T / 2
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
        const isNight = room.outdoor && skyRef.current === 'noite'
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
        for (const n of npcs) if (n.img) list.push([(n.fy + 1) * T, 7, n])
        for (const it of items) list.push([(it.y + 1) * T - 0.5, 8, it])
        list.push([meFoot + 0.5, 4, null])
        list.sort((p, q) => p[0] - q[0])
        for (const [, kind, it] of list) {
          if (kind === 0) {
            const [x, y, w, h, sx, sy, key, flip] = it
            const img = key ? atl.get(key) : objs
            if (!img) continue
            if (flip) {
              ctx.save()
              ctx.translate(x + w, y)
              ctx.scale(-1, 1)
              ctx.drawImage(img, sx, sy, w, h, 0, 0, w, h)
              ctx.restore()
            } else ctx.drawImage(img, sx, sy, w, h, x, y, w, h)
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
          } else if (kind === 7) {
            const pose = n7pose(it)
            drawChar(ctx, it.img, pose, pose === 'senta' && it.dir !== 'left' ? 'right' : it.dir, time + it.hx * 0.37, it.fx * T, it.fy * T - T)
          } else {
            // boneco: 16x32, o pé no fundo do quadradinho
            const frame = DIRS[me.dir] * 6 + (Math.floor(me.anim) % 6)
            if (!walking && me.poseUntil > time && hero.height >= 128) drawChar(ctx, hero, 'celular', me.dir, time - me.poseStart, me.fx * T, me.fy * T - T)
            else ctx.drawImage(hero, frame * T, walking ? 32 : 0, T, 32, Math.round(me.fx * T), Math.round(me.fy * T - T), T, 32)
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
        const mode = room.outdoor ? skyRef.current : 'dia'
        if (mode !== 'dia') {
          const night = mode === 'noite'
          if (shade.width !== canvas.width || shade.height !== canvas.height) {
            shade.width = canvas.width
            shade.height = canvas.height
          }
          const sctx = shade.getContext('2d')
          sctx.setTransform(1, 0, 0, 1, 0, 0)
          sctx.globalCompositeOperation = 'source-over'
          sctx.clearRect(0, 0, shade.width, shade.height)
          sctx.fillStyle = night ? 'rgba(6, 10, 38, 0.8)' : 'rgba(150, 60, 30, 0.3)'
          sctx.fillRect(0, 0, shade.width, shade.height)
          sctx.setTransform(z, 0, 0, z, view.ox, view.oy)
          sctx.globalCompositeOperation = 'destination-out'
          for (const [lx, ly, r] of room.lights ?? []) {
            const flick = 1 + Math.sin(time * 3 + lx) * 0.04
            const g = sctx.createRadialGradient(lx, ly, 0, lx, ly, r * flick)
            g.addColorStop(0, `rgba(0,0,0,${night ? 0.95 : 0.6})`)
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
            g.addColorStop(0, `rgba(${color},${night ? 0.32 : 0.14})`)
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
          if (!n.fala || !n.img) continue
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
                Confira se a pasta <code>public/limezu/t2</code> subiu com os PNGs.
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
            sky={sky}
            onSky={setSky}
            grid={showGrid}
            onGrid={setShowGrid}
            talk={talk}
            save={save}
            toast={toast}
            onSave={(fn) => commit(fn(saveRef.current))}
            onDrop={(key) => commit(dropItem(saveRef.current, key))}
            onResetSave={() => {
              commit(giveKit(emptySave()))
              setCompiled({}) // os itens voltam para os mapas
            }}
          />
        )}
      </div>
    </div>
  )
}
