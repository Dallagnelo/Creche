import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AvatarEditor from './AvatarEditor'
import DecorPanel from './DecorPanel'
import { ErrorBox } from './Feedback'
import { useAuth } from '../contexts/AuthContext'
import { useLive } from '../contexts/LiveContext'
import { MAX_VIEWERS } from '../lib/live'
import { AVATAR_H, avatarSprite, normalizeAvatar } from '../lib/avatar'
import { besideItem, buildBlocked, findPath, itemRect, nearestFree, spawnPoint, TILE, WALL_ROWS, WALL_TOP, wallSpan } from '../lib/room'
import { buildItem, catalogEntry, flipped, nextVariant } from '../lib/roomCatalog'
import {
  drawArcadeScreen, drawClockHands, drawFairyLights, drawFanScreen, drawFireScreen, drawFishScreen, drawItem, drawJukeboxScreen, drawLavaScreen,
  drawNightWindow, drawPcScreen, drawTvScreen, drawXmasLights, HEAD, makeHead, MELODIES,
  paintBackground, pick, playNotes, roundRect, spriteOf, drawClawScreen, drawDanceScreen, drawDiscoScreen, drawEqScreen, drawPondScreen, drawPopcornScreen, drawConveyorScreen, drawTeleportScreen, drawHologramScreen, drawPendulumScreen, drawRaceScreen, drawBalloonScreen, drawBubbleScreen, drawRobotScreen, drawFountainScreen,
} from '../lib/roomDraw'
import { PETS, petSpot, petSprite } from '../lib/roomPets'
import YouTubeScreen, { youTubeId } from './YouTubeScreen'
import { DJ_LOOK } from '../lib/roomSprites4'
import { brasiliaToday, canPlace, corridorScene, emptyLayout, HALL_THEMES, hallScene, MAX_ITEMS, personalScene, placeAt, roomOwner } from '../lib/rooms'
import { supabase } from '../lib/supabase'
import { getRoomLayout, saveRoomLayout } from '../services/profiles'

const EMOTES = ['👋', '😂', '❤️', '🎉', '😮', '👍']
const isNightNow = () => {
  const h = new Date().getHours()
  return h >= 19 || h < 6
}

const SPEED = 3.6 // quadradinhos por segundo
const BODY_H = 24
const Y_OFF = TILE - AVATAR_H + 1 // o personagem fica com os pés na base do quadradinho
const DEFAULT_ON = { lamp: true, fire: true, fan: true, vending: true, claw: true }
// cor clara? (para escolher texto escuro ou claro na plaquinha)
function isLightColor(hex) {
  const n = parseInt(String(hex).replace('#', ''), 16)
  if (Number.isNaN(n)) return false
  return ((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114 > 165
}
const isDecor = (item) => item.floor || (item.wall && !item.act && !item.screen)

// Onde o boneco estava da última vez (ambiente e quadradinho), guardado só neste navegador.
const spotKey = (userId) => `turma-lugar:${userId}`
function readSpot(userId) {
  try {
    const spot = JSON.parse(localStorage.getItem(spotKey(userId)) ?? 'null')
    return spot && typeof spot.room === 'string' ? spot : null
  } catch {
    return null
  }
}
function writeSpot(userId, spot) {
  try {
    localStorage.setItem(spotKey(userId), JSON.stringify(spot))
  } catch {
    // navegador sem armazenamento: só não lembra o lugar
  }
}

function firstTodayCheck(userId) {
  try {
    return localStorage.getItem(`turma-dia:${userId}`) !== brasiliaToday().key
  } catch {
    return false
  }
}

// dia da sala da turma escolhido pelo admin para conferir (só neste navegador); null = o dia de hoje
let previewDay = null
function makeScene(key, members, meId, layout) {
  if (key === 'turma') return hallScene(previewDay ?? undefined)
  if (key === 'corredor') return corridorScene(members, meId)
  const owner = roomOwner(key)
  return personalScene(owner, members.find((m) => m.id === owner)?.name, layout)
}

/**
 * Os ambientes da turma: a sala da turma, o corredor e o quarto de cada pessoa (que ela mesma decora).
 * Quem está no mesmo ambiente aparece, anda e usa os móveis em tempo real (Presence + broadcast, sem gravar no banco).
 * Só a arrumação do quarto é salva (no perfil), e só quando a pessoa clica em "Salvar".
 */
export default function RoomScene({ members = [], onlineIds = [], onSelectPerson, onPeopleChange }) {
  const { user, profile, isAdmin } = useAuth()
  const navigate = useNavigate()
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const stateRef = useRef({
    players: new Map(), scale: 1, scene: null, blocked: [[]], bg: null, items: {}, fx: [], time: 0,
    hover: null, hoverItem: null, marker: null, ghost: null, prevRoom: null, savedLayout: null,
    petSpots: new Map(), petFlip: {}, petBubbles: {},
  })
  // primeira entrada do dia (horário de Brasília): começa no próprio quarto, e não direto na sala nova do dia
  const [roomKey, setRoomKey] = useState(() => {
    if (!user?.id) return 'turma'
    if (firstTodayCheck(user.id)) return `quarto:${user.id}`
    return readSpot(user.id)?.room ?? 'turma'
  })
  useEffect(() => {
    if (!user?.id) return
    try {
      localStorage.setItem(`turma-dia:${user.id}`, brasiliaToday().key)
    } catch {
      // sem armazenamento: tudo bem
    }
  }, [user?.id])
  const [hallPreview, setHallPreview] = useState(previewDay)
  const onlineRef = useRef(new Set())
  onlineRef.current = new Set(onlineIds)
  const [sceneName, setSceneName] = useState('Sala da turma')
  const live = useLive()
  const [djTab, setDjTab] = useState('yt') // painel do DJ: 'yt' (link do YouTube) ou 'live' (transmissão do Ao vivo)
  const [tvRect, setTvRect] = useState(null) // onde fica a tela do telão (em % da sala), para o vídeo ficar certinho em cima
  const [count, setCount] = useState(1)
  const [panel, setPanel] = useState(null)
  const [ytVideo, setYtVideo] = useState(null) // vídeo tocando no telão da sala
  // a live que estava no telão acabou: desliga (espera um pouco, a lista de quem está ao vivo demora a chegar)
  const liveOnTv = ytVideo?.type === 'live' ? ytVideo.host : null
  const liveOnAir = !!liveOnTv && live.hosts.some((meta) => meta.userId === liveOnTv)
  useEffect(() => {
    if (!liveOnTv || liveOnAir) return undefined
    const timer = setTimeout(() => {
      const current = stateRef.current.items?.yt
      if (current?.type === 'live' && current.host === liveOnTv) stateRef.current.setYouTube?.(null)
    }, 8000)
    return () => clearTimeout(timer)
  }, [liveOnTv, liveOnAir])
  const [djLink, setDjLink] = useState('')
  const [djError, setDjError] = useState('')
  const [editingAvatar, setEditingAvatar] = useState(false)
  const [deco, setDeco] = useState(null) // { draft, pick, selected } enquanto decora o próprio quarto
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [roomEmpty, setRoomEmpty] = useState(false)
  const [message, setMessage] = useState('')
  const [fullscreen, setFullscreen] = useState(false)
  const [stageH, setStageH] = useState(0)
  const stageRef = useRef(null)
  const lastSaid = useRef(0)

  const meName = profile?.display_name ?? user?.email?.split('@')[0] ?? 'Alguém'
  const meAvatar = profile?.avatar_url ?? null
  const meLook = profile?.room_avatar ?? null
  const meRef = useRef({ name: meName, avatarUrl: meAvatar, look: meLook })
  meRef.current = { name: meName, avatarUrl: meAvatar, look: meLook }
  const membersRef = useRef(members)
  membersRef.current = members
  const peopleRef = useRef(onPeopleChange)
  peopleRef.current = onPeopleChange
  const navRef = useRef(navigate)
  navRef.current = navigate
  const decoRef = useRef(deco)
  decoRef.current = deco

  const myRoom = user ? `quarto:${user.id}` : null
  const inMyRoom = roomKey === myRoom

  // troca o ambiente desenhado (sem reconectar)
  const applyScene = (scene) => {
    const st = stateRef.current
    st.scene = scene
    st.blocked = buildBlocked(scene.furniture, scene.cols, scene.rows)
    st.bg = paintBackground(scene, scene.furniture.filter(isDecor))
    // quem ficou "dentro" de um móvel (sala do dia mudou, móvel novo no lugar) vai para o quadradinho livre mais perto
    st.players.forEach((p) => {
      if (p.pose) return
      const x = Math.round(p.x)
      const y = Math.round(p.y)
      if (!st.blocked[y]?.[x] && st.blocked[y]?.[x] !== undefined) return
      const free = nearestFree(st.blocked, { x, y })
      p.x = free.x
      p.y = free.y
      p.path = []
    })
    st.resize?.()
    setSceneName(scene.name)
    const tv = scene.furniture.find((item) => item.screen?.kind === 'teletv')
    const W = scene.cols * TILE
    const FH = scene.rows * TILE + WALL_TOP
    setTvRect(
      tv
        ? { aspect: W / FH, left: (tv.screen.x / W) * 100, top: ((tv.screen.y + WALL_TOP) / FH) * 100, width: (tv.screen.w / W) * 100, height: (tv.screen.h / FH) * 100 }
        : null,
    )
  }

  // ---------- conexão com o ambiente atual
  useEffect(() => {
    if (!user?.id) return undefined
    const st = stateRef.current
    const { players } = st
    players.clear()
    st.items = {}
    st.fx = []
    st.petSpots = new Map()
    st.petBubbles = {}
    st.marker = null
    st.centered = false
    st.fadeOutAt = null
    st.fadeInAt = st.time ?? 0
    setPanel(null)
    setYtVideo(null)
    setError(null)
    setRoomEmpty(false)
    let alive = true
    let raf = 0
    let last = performance.now()
    const owner = roomOwner(roomKey)
    applyScene(makeScene(roomKey, membersRef.current, user.id, owner === user.id ? st.myLayout : null))
    if (owner) {
      getRoomLayout(owner)
        .then((layout) => {
          if (!alive) return
          st.savedLayout = layout ?? emptyLayout()
          if (owner === user.id) st.myLayout = st.savedLayout
          if (!decoRef.current) applyScene(makeScene(roomKey, membersRef.current, user.id, st.savedLayout))
          setRoomEmpty(!st.savedLayout.items?.length)
        })
        .catch((err) => alive && setError(err))
    }

    const channel = supabase.channel(roomKey === 'turma' ? 'turma-room' : `room:${roomKey}`, {
      config: { presence: { key: user.id }, broadcast: { self: false } },
    })

    // ---------- pessoas
    const upsert = (id, data) => {
      let p = players.get(id)
      if (!p) {
        const num = (v, fallback) => (Number.isFinite(v) ? v : fallback)
        p = { id, name: data.name ?? 'Alguém', avatarUrl: data.avatarUrl ?? null, x: num(data.x, 2), y: num(data.y, WALL_ROWS + 1), path: [], walk: 0, dir: 'down' }
        players.set(id, p)
        makeHead(p)
      } else if (p.avatarUrl !== (data.avatarUrl ?? null) || p.name !== (data.name ?? p.name)) {
        p.name = data.name ?? p.name
        p.avatarUrl = data.avatarUrl ?? null
        makeHead(p)
      }
      p.look = normalizeAvatar(data.look, id)
      return p
    }
    const emitPeople = () => {
      setCount(players.size)
      peopleRef.current?.(Array.from(players.keys()))
    }
    const standUp = (p) => {
      if (!p.pose) return
      p.x = p.standX ?? Math.round(p.x)
      p.y = p.standY ?? Math.round(p.y)
      p.pose = null
    }
    const sitDown = (p, seat, from) => {
      p.standX = from.x
      p.standY = from.y
      p.x = seat.x
      p.y = seat.y
      p.pose = seat.pose
      p.dir = seat.dir ?? 'down'
      p.path = []
    }
    const walk = (p, target) => {
      standUp(p)
      const start = p.path.length ? p.path[0] : { x: Math.round(p.x), y: Math.round(p.y) }
      const steps = findPath(st.blocked, start, target)
      p.path = p.path.length ? [p.path[0], ...steps] : steps
      return steps.length ? steps[steps.length - 1] : start
    }

    // ---------- efeitos (notas, zzz, fumaça, gotas, balões de fala)
    const fx = (kind, x, y, text) => st.fx.push({ kind, x, y, text, t: 0, dx: (Math.random() - 0.5) * 6 })
    const share = (event, payload) => channel.send({ type: 'broadcast', event, payload: { id: user.id, ...payload } })
    const findItem = (id) => st.scene.furniture.find((it) => it.id === id)
    const applyFx = (payload) => {
      const p = players.get(payload.id)
      const item = findItem(payload.item)
      const rect = item ? itemRect(item, spriteOf(item)) : null
      const top = rect ? { x: rect.x + rect.w / 2, y: rect.y } : null
      if (payload.kind === 'notes' && top) for (let i = 0; i < 4; i += 1) setTimeout(() => fx('note', top.x, top.y, pick(['♪', '♫'])), i * 260)
      if (payload.kind === 'steam' && top) for (let i = 0; i < 6; i += 1) setTimeout(() => fx('steam', top.x + (Math.random() - 0.5) * rect.w * 0.6, top.y + 4), i * 180)
      if (payload.kind === 'water' && top) for (let i = 0; i < 3; i += 1) setTimeout(() => fx('drop', top.x, top.y - 4, '💧'), i * 180)
      if (payload.kind === 'bubble' && p) p.bubble = { text: String(payload.text).slice(0, 80), until: st.time + (payload.long ? 5 : 3.2) }
      if (payload.kind === 'pet') st.petBubbles[payload.item] = { text: String(payload.text).slice(0, 40), until: st.time + 2.2 }
      if (payload.kind === 'item') {
        st.items[payload.item] = payload.on
        if (payload.item === 'yt') setYtVideo(payload.on ?? null)
      }
    }
    const doFx = (payload) => {
      applyFx({ id: user.id, ...payload })
      share('fx', payload)
    }
    const isOn = (item) => st.items[item.id] ?? item.on ?? DEFAULT_ON[item.act] ?? false

    // ---------- o que cada móvel faz
    const freeSeat = (item) =>
      item.seats?.find((seat) => ![...players.values()].some((p) => p.pose && Math.abs(p.x - seat.x) < 0.3 && Math.abs(p.y - seat.y) < 0.3))
    const act = (item, me) => {
      const go = (to, label) => ({ label, run: () => navRef.current(to) })
      const show = (data) => setPanel({ id: item.id, ...data })
      const say = (text) => doFx({ kind: 'bubble', text })
      const toggle = () => {
        const on = !isOn(item)
        doFx({ kind: 'item', item: item.id, on })
        return on
      }
      if (item.seats) {
        const seat = freeSeat(item)
        if (!seat) {
          say('Tá ocupado!')
          return
        }
        sitDown(me, seat, { x: Math.round(me.x), y: Math.round(me.y) })
        share('pose', { x: seat.x, y: seat.y, pose: seat.pose, dir: seat.dir, sx: me.standX, sy: me.standY })
      }
      setPanel(null)
      switch (item.act) {
        case 'door':
          st.leave?.(item.door)
          return
        case 'tv': {
          const on = toggle()
          show({
            title: 'TV',
            text: on ? 'TV ligada! Sente no sofá para assistir.' : 'TV desligada.',
            actions: [go('/filmes', 'Ver filmes da turma'), { label: on ? 'Desligar' : 'Ligar', run: () => act(item, me) }],
          })
          break
        }
        case 'sit':
          if (item.id === 'sofa') show({ title: 'Sofá', text: 'Assistindo TV com a turma 📺', actions: [go('/filmes', 'Ver filmes')] })
          break
        case 'bed':
          show({ title: item.label, text: 'Dormindo... toque no chão para levantar.' })
          break
        case 'arcade':
          say(pick(['Novo recorde! 🏆', 'Mais uma ficha!', 'Game over 😵']))
          playNotes([784, 988, 1175, 1568], { wave: 'square', gap: 0.08, volume: 0.05 })
          show({ title: 'Fliperama', text: 'Os jogos da turma estão aqui.', actions: [go('/jogos', 'Ver jogos')] })
          break
        case 'pc': {
          const on = toggle()
          if (on) say(pick(['Jogando no PC 🖥️', 'GG! 🎮', 'Só mais uma partida']))
          show({ title: 'PC', text: on ? 'PC ligado.' : 'PC desligado.', actions: [go('/jogos', 'Ver jogos da turma')] })
          break
        }
        case 'live':
          say(pick(['Testando, 1, 2, 3 🎤', 'Boa noite, turma! 🎤', 'Alguém liga o som?']))
          show({ title: 'Palco', text: 'Sobe no palco e chama a turma para a live!', actions: [go('/ao-vivo', 'Ir para o Ao vivo')] })
          break
        case 'vote':
          say('Votando 🗳️')
          show({ title: 'Urna', text: 'As votações da turma ficam aqui.', actions: [go('/votacoes', 'Ver votações')] })
          break
        case 'board':
          show({ title: 'Mural de fotos', text: 'As fotos e álbuns da turma.', actions: [go('/mural', 'Abrir o mural')] })
          break
        case 'calendar':
          show({
            title: 'Calendário',
            text: `Hoje é ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}.`,
            actions: [go('/eventos', 'Ver eventos')],
          })
          break
        case 'books':
          say(pick(['Lendo um livro 📖', 'Esse é bom!', 'Hmm, interessante...']))
          show({ title: 'Estante', text: 'Aqui fica o diário do site.', actions: [go('/patch-notes', 'Ver novidades')] })
          break
        case 'piano':
          playNotes(pick(MELODIES))
          doFx({ kind: 'notes', item: item.id })
          show({ title: 'Piano', text: 'Tocando uma música 🎹', actions: [{ label: 'Tocar de novo', run: () => act(item, me) }] })
          break
        case 'guitar':
          playNotes(pick([[330, 392, 494, 659, 494, 392], [294, 370, 440, 587, 440, 370]]), { gap: 0.13 })
          doFx({ kind: 'notes', item: item.id })
          say('Tocando violão 🎸')
          break
        case 'drums':
          playNotes([98, 196, 98, 98, 196, 147, 98], { wave: 'square', gap: 0.12, volume: 0.07 })
          doFx({ kind: 'notes', item: item.id })
          say('Tum tum tsss 🥁')
          break
        case 'music': {
          const on = !st.items.music
          doFx({ kind: 'item', item: 'music', on })
          if (on) playNotes([392, 523, 659, 523, 587, 494, 392], { wave: 'square', gap: 0.15, volume: 0.04 })
          show({ title: 'Som', text: on ? 'Som ligado 🎶' : 'Som desligado.', actions: [{ label: on ? 'Desligar' : 'Ligar', run: () => act(item, me) }] })
          break
        }
        case 'lamp':
        case 'fire':
        case 'fan':
          toggle()
          break
        case 'cook':
          doFx({ kind: 'steam', item: item.id })
          say(pick(['Cozinhando... 🍳', 'Fazendo um café ☕', 'Miojo de novo? 🍜']))
          break
        case 'fridge':
          say(pick(['Peguei um refri 🥤', 'Cadê o pudim? 🍮', 'Só tem água 💧']))
          break
        case 'coffee':
          say(pick(['Que café bom ☕', 'Um lanchinho 🍪', 'Cadê o controle?']))
          break
        case 'clock':
          say(`São ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} ⏰`)
          break
        case 'mirror':
          say(pick(['Tô bonito(a) hoje ✨', 'Ajeitando o cabelo', 'Que pessoa linda!']))
          break
        case 'wardrobe':
          say('Trocando de roupa 👕')
          setEditingAvatar(true)
          break
        case 'plant':
          doFx({ kind: 'water', item: item.id })
          say('Reguei a planta 🌱')
          break
        case 'dj':
          say(pick(['Manda o link que eu toco! 🎧', 'Bora fazer uma festa? 🎶', 'Qual vai ser a próxima? 💿']))
          setDjError('')
          show({ title: '🎧 DJ Creche', dj: true })
          break
        case 'teleport': {
          // teletransporte: luz, som de ficção científica e... zap, outro lugar
          const target = item.target === 'mine' ? `quarto:${user.id}` : item.target
          if (!target) {
            say('Bzzzt... sem destino 🌀')
            break
          }
          playNotes([262, 392, 523, 784, 1047, 1568], { wave: 'sine', gap: 0.06, volume: 0.06 })
          for (let i = 0; i < 5; i += 1) setTimeout(() => fx('note', me.x * TILE + 8 + (Math.random() - 0.5) * 14, me.y * TILE + 4, '✨'), i * 70)
          say(pick(['Energizar! ✨', 'Zap! 🌀', 'Teletransportando...']))
          setTimeout(() => st.leave?.(target), 450)
          break
        }
        case 'menu': {
          // cardápio da cafeteria: muda toda semana
          const menus = [
            'Cardápio: cappuccino + pão de queijo ☕🧀', 'Cardápio: chocolate quente + bolo de cenoura 🍫🥕', 'Cardápio: café gelado + cookie 🧊🍪',
            'Cardápio: chá de hibisco + torta de limão 🍋', 'Cardápio: mocha + brownie 🤎', 'Cardápio: latte + croissant 🥐',
          ]
          const week = Math.floor(Date.now() / (7 * 24 * 3600 * 1000))
          say(menus[week % menus.length])
          break
        }
        case 'vending':
          playNotes([523, 392, 262], { wave: 'square', gap: 0.09, volume: 0.05 })
          say(pick(['Caiu um refri! 🥤', 'Peguei um suco de uva 🍇', 'A máquina engoliu minha moeda 😤', 'Água com gás? Sério?']))
          break
        case 'claw': {
          const win = Math.random() < 0.3
          playNotes(win ? [523, 659, 784, 1047] : [392, 330, 262], { wave: 'square', gap: 0.1, volume: 0.05 })
          say(win ? `Peguei ${pick(['um ursinho 🧸', 'um dinossauro 🦖', 'um patinho 🐥', 'um unicórnio 🦄', 'um polvo 🐙'])}!` : pick(['Quase! 😩', 'A garra soltou...', 'Essa máquina é roubada! 😤', 'Mais uma ficha...']))
          if (win) doFx({ kind: 'notes', item: item.id })
          break
        }
        case 'photo':
          st.flashAt = st.time
          playNotes([1568, 2093], { wave: 'square', gap: 0.05, volume: 0.04 })
          say('Xiiis! 📸')
          show({ title: 'Cabine de fotos', text: 'Foto tirada! As fotos de verdade da turma ficam no mural.', actions: [go('/mural', 'Abrir o mural')] })
          break
        case 'say':
          if (item.says?.length) say(pick(item.says))
          break
        default:
      }
      st.track()
    }

    // ---------- entrada no ambiente (ao lado da porta por onde veio)
    const spawnAt = () => {
      // voltou para a página: aparece onde estava (se o lugar ainda estiver livre)
      const saved = !st.prevRoom ? readSpot(user.id) : null
      if (saved && saved.room === roomKey && st.blocked[saved.y]?.[saved.x] === false) return { x: saved.x, y: saved.y }
      const back = st.scene.furniture.find((it) => it.act === 'door' && it.door === st.prevRoom)
      if (back) return besideItem(st.blocked, back, { x: wallSpan(back)[0], y: WALL_ROWS + 1 })
      return spawnPoint(st.blocked, user.id)
    }
    const spawn = spawnAt()
    const me = upsert(user.id, { ...meRef.current, x: spawn.x, y: spawn.y })
    st.me = me
    emitPeople()

    st.track = () => {
      writeSpot(user.id, { room: roomKey, x: me.pose ? me.standX : Math.round(me.x), y: me.pose ? me.standY : Math.round(me.y) })
      return channel.track({
        ...meRef.current,
        x: me.pose ? me.standX : Math.round(me.x),
        y: me.pose ? me.standY : Math.round(me.y),
        pose: me.pose ?? null,
        dir: me.dir,
        px: me.pose ? me.x : null,
        py: me.pose ? me.y : null,
        items: st.items,
      })
    }
    st.goTo = (target, item = null) => {
      const end = walk(me, target)
      me.pending = item
      if (!item) setPanel(null)
      st.marker = { x: end.x, y: end.y, t: 0 }
      share('go', { tx: end.x, ty: end.y })
      if (!me.path.length) {
        me.pending = null
        if (item) act(item, me)
        else st.track()
      }
    }
    st.leave = (target) => {
      if (st.fadeOutAt != null) return // já está saindo
      st.fadeOutAt = st.time
      setTimeout(() => {
        st.prevRoom = roomKey
        setDeco(null)
        setRoomKey(target)
      }, 220)
    }

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState()
      const ids = Object.keys(state)
      ids.forEach((id) => {
        if (id === user.id) return
        const meta = state[id][state[id].length - 1]
        const isNew = !players.has(id)
        const p = upsert(id, meta)
        if (isNew && meta.items) {
          Object.assign(st.items, meta.items) // quem chega vê TV/luzes (e o vídeo do telão) como estão
          if (meta.items.yt !== undefined) setYtVideo(meta.items.yt ?? null)
        }
        if (p.path.length) return
        if (meta.pose) {
          p.pose = meta.pose
          p.dir = meta.dir ?? 'down'
          p.x = meta.px
          p.y = meta.py
          p.standX = meta.x
          p.standY = meta.y
        } else {
          p.pose = null
          p.x = meta.x
          p.y = meta.y
        }
      })
      Array.from(players.keys()).forEach((id) => {
        if (id !== user.id && !ids.includes(id)) players.delete(id)
      })
      emitPeople()
    })
    channel.on('broadcast', { event: 'go' }, ({ payload }) => {
      const p = players.get(payload.id)
      if (p) walk(p, { x: payload.tx, y: payload.ty })
    })
    channel.on('broadcast', { event: 'pose' }, ({ payload }) => {
      const p = players.get(payload.id)
      if (p) sitDown(p, { x: payload.x, y: payload.y, pose: payload.pose, dir: payload.dir }, { x: payload.sx, y: payload.sy })
    })
    channel.on('broadcast', { event: 'fx' }, ({ payload }) => applyFx(payload))
    // o dono salvou uma arrumação nova: quem está visitando vê na hora
    channel.on('broadcast', { event: 'layout' }, () => {
      if (!owner) return
      getRoomLayout(owner).then((layout) => {
        if (!alive) return
        st.savedLayout = layout ?? emptyLayout()
        applyScene(makeScene(roomKey, membersRef.current, user.id, st.savedLayout))
      })
    })
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') st.track()
    })
    st.shareLayout = () => share('layout', {})
    // DJ: coloca (ou tira) um vídeo do YouTube no telão para todo mundo da sala
    st.setYouTube = (on) => {
      doFx({ kind: 'item', item: 'yt', on })
      st.track()
    }
    st.say = (text) => {
      doFx({ kind: 'bubble', text, long: true })
    }
    st.petPet = (item) => {
      doFx({ kind: 'pet', item: item.id, text: pick(item.says ?? PETS[item.pet.kind]?.says ?? ['💕']) })
      playNotes([880, 660], { gap: 0.12, volume: 0.05 })
    }

    // ---------- desenho
    const drawPlayer = (ctx, p) => {
      const px = Math.round(p.x * TILE)
      const py = Math.round(p.y * TILE)
      const usePhoto = p.look.photo && p.avatarUrl && p.head
      const look = usePhoto ? { ...p.look, hair: 'careca', hat: 'nenhum', face: 'nenhum', beard: 'nenhuma' } : p.look
      // pisca de vez em quando (cada pessoa num ritmo)
      const blink = !p.path.length && (Math.floor(st.time * 10) + (p.id.charCodeAt(0) % 30)) % 38 === 0
      if (p.pose === 'sleep') {
        const sprite = avatarSprite(look, { dir: 'down', withFace: !usePhoto })
        ctx.drawImage(sprite, 0, 0, 16, 14, px, py - 7, 16, 14)
        if (usePhoto) ctx.drawImage(p.head, px + 2, py - 5, HEAD, HEAD)
        ctx.fillStyle = '#4d7fc6'
        ctx.fillRect(px - 6, py + 6, 28, 12)
        ctx.fillStyle = '#f6f1e6'
        ctx.fillRect(px - 6, py + 6, 28, 3)
        return
      }
      const moving = p.path.length > 0
      const frame = moving ? 1 + (Math.floor(p.walk * 7) % 2) : 0
      const top = py + Y_OFF + (moving && frame === 1 ? -1 : 0)
      if (!p.pose) {
        ctx.fillStyle = 'rgba(20,10,4,0.3)'
        ctx.beginPath()
        ctx.ellipse(px + 8, py + TILE - 1, 6, 2, 0, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.drawImage(avatarSprite(look, { dir: p.dir, frame, pose: p.pose, withFace: !usePhoto, blink }), px, top)
      if (usePhoto && p.dir !== 'up') {
        const y = top + (p.pose === 'sit' ? 5 : 3) - 1
        ctx.fillStyle = '#1a1424'
        ctx.beginPath()
        ctx.arc(px + 8, y + HEAD / 2, HEAD / 2 + 1, 0, Math.PI * 2)
        ctx.fill()
        ctx.drawImage(p.head, px + 2, y, HEAD, HEAD)
      }
    }
    const headTop = (p) => {
      if (p.pose === 'sleep') return p.y * TILE - 8
      const bob = p.path.length && 1 + (Math.floor(p.walk * 7) % 2) === 1 ? -1 : 0
      return p.y * TILE + Y_OFF + bob + (p.pose === 'sit' ? 2 : 0) - 1
    }
    const glow = (ctx, x, y, radius, color) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, radius)
      g.addColorStop(0, color)
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2)
    }
    const drawScreen = (ctx, item) => {
      const s = item.screen
      if (s.kind === 'tv') drawTvScreen(ctx, s, isOn(item), st.time)
      else if (s.kind === 'arcade') drawArcadeScreen(ctx, s, st.time)
      else if (s.kind === 'pc') drawPcScreen(ctx, s, isOn(item), st.time)
      else if (s.kind === 'fish') drawFishScreen(ctx, s, st.time)
      else if (s.kind === 'fire') drawFireScreen(ctx, s, isOn(item), st.time)
      else if (s.kind === 'xmas') drawXmasLights(ctx, s, st.time)
      else if (s.kind === 'jukebox') drawJukeboxScreen(ctx, s, !!st.items.music, st.time)
      else if (s.kind === 'lava') drawLavaScreen(ctx, s, isOn(item), st.time)
      else if (s.kind === 'fan') drawFanScreen(ctx, s, isOn(item), st.time)
      else if (s.kind === 'fairy') drawFairyLights(ctx, s, st.time)
      else if (s.kind === 'claw') drawClawScreen(ctx, s, st.time)
      else if (s.kind === 'dance') drawDanceScreen(ctx, s, !!st.items.music || !!st.scene?.party?.always, st.time)
      else if (s.kind === 'popcorn') drawPopcornScreen(ctx, s, st.time)
      else if (s.kind === 'eq') drawEqScreen(ctx, s, !!st.items.music, st.time)
      else if (s.kind === 'disco') drawDiscoScreen(ctx, s, st.time)
      else if (s.kind === 'pond') drawPondScreen(ctx, s, st.time)
      else if (s.kind === 'conveyor') drawConveyorScreen(ctx, s, st.time)
      else if (s.kind === 'teleport') drawTeleportScreen(ctx, s, st.time)
      else if (s.kind === 'hologram') drawHologramScreen(ctx, s, st.time)
      else if (s.kind === 'pendulum') drawPendulumScreen(ctx, s, st.time)
      else if (s.kind === 'race') drawRaceScreen(ctx, s, st.time)
      else if (s.kind === 'balloon') drawBalloonScreen(ctx, s, st.time)
      else if (s.kind === 'bubbles') drawBubbleScreen(ctx, s, st.time)
      else if (s.kind === 'robot') drawRobotScreen(ctx, s, st.time)
      else if (s.kind === 'fountain') drawFountainScreen(ctx, s, st.time)
      else if (s.kind === 'teletv') drawWallTv(ctx, s, !!st.items.yt, st.time)
    }
    // telão da parede: com vídeo, o player do YouTube fica atrás do canvas e a tela vira um buraco transparente;
    // desligado, um "play" pisca de leve para chamar o DJ
    const drawWallTv = (ctx, s, playing, time) => {
      if (playing) {
        // "buraco" na tela: o vídeo fica atrás do canvas e aparece por aqui (pessoas e balões passam por cima)
        ctx.clearRect(s.x, s.y, s.w, s.h)
      } else {
        ctx.globalAlpha = 0.25 + 0.2 * Math.sin(time * 2.5)
        ctx.fillStyle = '#f6f1e6'
        const cx = s.x + s.w / 2 - 2
        const cy = s.y + s.h / 2 - 4
        for (let i = 0; i < 4; i += 1) ctx.fillRect(cx + i, cy + i, 1, 9 - i * 2)
        ctx.globalAlpha = 1
      }
      ctx.fillStyle = playing ? '#5eead4' : '#e05252'
      ctx.fillRect(s.x + s.w - 4, s.y + s.h + 1, 2, 1)
    }
    let clockNow = new Date()
    const drawWithExtras = (ctx, item) => {
      if (item.key === 'djnpc') {
        // o DJ dança quando tem vídeo tocando
        const playing = !!st.items.yt
        const frame = playing ? 1 + (Math.floor(st.time * 4) % 2) : 0
        const rect = itemRect(item, spriteOf(item))
        ctx.drawImage(avatarSprite(DJ_LOOK, { dir: 'down', frame }), rect.x, rect.y - (playing && frame === 1 ? 1 : 0))
        return
      }
      drawItem(ctx, item)
      if (item.screen) drawScreen(ctx, item)
      if (item.sprite === 'clock') drawClockHands(ctx, itemRect(item, spriteOf(item)), clockNow)
    }


    let musicTimer = 0
    // Um quadro com erro (um móvel ou dado estranho) não pode parar a sala inteira:
    // o erro é mostrado uma vez e a animação continua no próximo quadro.
    let frameFailed = false
    const frame = (now) => {
      if (!alive) return
      try {
        drawFrame(now)
      } catch (err) {
        if (!frameFailed) {
          frameFailed = true
          console.error('[sala] erro ao desenhar', err)
          setError(new Error(`Algo deu errado ao desenhar a sala (${err?.message ?? err}). Tente recarregar a página.`))
        }
        try {
          const canvas = canvasRef.current
          const ctx = canvas?.getContext('2d')
          if (ctx && st.bg) {
            ctx.setTransform(st.scale, 0, 0, st.scale, 0, WALL_TOP * st.scale)
            ctx.drawImage(st.bg, 0, -WALL_TOP)
          }
        } catch {
          // sem fundo para mostrar
        }
      }
      raf = requestAnimationFrame(frame)
    }
    const drawFrame = (now) => {
      // alguém com posição inválida (dado velho ou corrompido) volta para perto da porta em vez de quebrar o desenho
      players.forEach((p) => {
        if (Number.isFinite(p.x) && Number.isFinite(p.y)) return
        p.x = 2
        p.y = WALL_ROWS + 1
        p.path = []
        p.pose = null
      })
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      st.time += dt
      const scene = st.scene
      const W = scene.cols * TILE
      const H = scene.rows * TILE

      players.forEach((p) => {
        if (!p.path.length) return
        const next = p.path[0]
        const dx = next.x - p.x
        const dy = next.y - p.y
        const dist = Math.hypot(dx, dy)
        const move = SPEED * dt
        p.walk += dt
        if (Math.abs(dy) > 0.01) p.dir = dy < 0 ? 'up' : 'down'
        else if (Math.abs(dx) > 0.01) p.dir = dx > 0 ? 'right' : 'left'
        if (dist <= move) {
          p.x = next.x
          p.y = next.y
          p.path.shift()
          if (!p.path.length && !p.pose) p.dir = 'down'
          if (!p.path.length && p === me) {
            const item = me.pending
            me.pending = null
            if (item) act(item, me)
            else st.track()
          }
        } else {
          p.x += (dx / dist) * move
          p.y += (dy / dist) * move
        }
      })

      if (st.items.music || st.items.yt) {
        musicTimer += dt
        if (musicTimer > 0.7) {
          musicTimer = 0
          const src = (st.items.yt && scene.furniture.find((it) => it.key === 'djnpc')) || scene.furniture.find((it) => it.sprite === 'jukebox' || it.sprite === 'vinyl') || scene.furniture.find((it) => it.act === 'music')
          if (src) fx('note', (src.x + src.w / 2) * TILE, src.y * TILE - 2, pick(['♪', '♫', '♬']))
        }
      }
      players.forEach((p) => {
        if (p.pose === 'sleep' && Math.random() < dt * 0.9) fx('zzz', p.x * TILE + 12, p.y * TILE - 4, 'z')
      })
      st.fx = st.fx.filter((f) => {
        f.t += dt
        return f.t < (f.kind === 'steam' ? 1.4 : 1.8)
      })

      const canvas = canvasRef.current
      if (canvas && st.bg) {
        const ctx = canvas.getContext('2d')
        const s = st.scale
        const decorating = !!decoRef.current
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.imageSmoothingEnabled = false
        ctx.setTransform(s, 0, 0, s, 0, WALL_TOP * s) // a sala começa abaixo da faixa extra de parede
        ctx.drawImage(st.bg, 0, -WALL_TOP)
        if (st.time - (st.clockAt ?? -9) > 1) {
          st.clockAt = st.time
          clockNow = new Date()
          st.night = isNightNow()
          // meia-noite em Brasília: a sala da turma vira a do novo dia (se o admin não estiver conferindo outro)
          if (scene.key === 'turma' && previewDay === null && scene.day !== brasiliaToday().weekday) {
            applyScene(makeScene('turma', membersRef.current, user.id, null))
          }
        }
        if (st.night) scene.furniture.forEach((item) => item.sprite === 'window' && drawNightWindow(ctx, item, st.time))

        if (decorating) {
          // grade para ajudar a alinhar
          ctx.fillStyle = 'rgba(255,255,255,0.08)'
          for (let x = 0; x <= scene.cols; x += 1) ctx.fillRect(x * TILE, WALL_ROWS * TILE, 0.5, H)
          for (let y = WALL_ROWS; y <= scene.rows; y += 1) ctx.fillRect(0, y * TILE, W, 0.5)
        } else if (st.hover && !st.hoverItem && !st.blocked[st.hover.y]?.[st.hover.x]) {
          ctx.fillStyle = 'rgba(255,255,255,0.12)'
          ctx.fillRect(st.hover.x * TILE, st.hover.y * TILE, TILE, TILE)
        }
        if (st.marker) {
          st.marker.t += dt
          const k = st.marker.t / 0.6
          if (k >= 1) st.marker = null
          else {
            ctx.strokeStyle = `rgba(94,234,212,${1 - k})`
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.ellipse(st.marker.x * TILE + 8, st.marker.y * TILE + 12, 3 + k * 5, 1.5 + k * 2.5, 0, 0, Math.PI * 2)
            ctx.stroke()
          }
        }

        scene.furniture.filter((item) => item.wall && (item.act || item.screen)).forEach((item) => drawWithExtras(ctx, item))
        // chão animado (pista de dança): por baixo de tudo, por cima do fundo
        scene.furniture.filter((item) => item.floor && item.screen).forEach((item) => drawScreen(ctx, item))

        const drawables = [
          ...scene.furniture.filter((item) => !item.wall && !item.floor && (!item.pet || decorating)).map((item) => ({
            depth: (item.y + item.h) * TILE,
            draw: () => {
              const r = itemRect(item, spriteOf(item))
              ctx.fillStyle = 'rgba(30,15,5,0.16)'
              ctx.fillRect(r.x + 1, (item.y + item.h) * TILE - 2, r.w - 2, 3)
              drawWithExtras(ctx, item)
            },
          })),
          ...Array.from(players.values()).map((p) => ({
            depth: p.pose === 'sleep' ? (p.y + 2) * TILE : p.y * TILE + TILE + 0.5,
            draw: () => drawPlayer(ctx, p),
          })),
          // bichinhos passeando (no modo decorar eles ficam parados onde foram colocados)
          ...(decorating
            ? []
            : scene.furniture.filter((item) => item.pet).map((item) => {
                const spot = petSpot(scene, st.blocked, item, Date.now() / 1000)
                if (spot.turn) st.petFlip[item.id] = spot.flip
                st.petSpots.set(item.id, spot)
                return {
                  depth: spot.y * TILE + TILE,
                  draw: () => {
                    const pet = item.pet
                    const frame = spot.moving ? 1 + (Math.floor(st.time * 8) % 2) : spot.rest ? 3 : 0
                    const hop = spot.moving ? (PETS[pet.kind]?.hop ? 3 : 1) * Math.abs(Math.sin(st.time * 10)) : 0
                    const look = petSprite(pet.kind, pet.color, frame)
                    const x = Math.round(spot.x * TILE) - 1
                    const y = Math.round(spot.y * TILE + TILE - 16 - hop)
                    ctx.fillStyle = 'rgba(20,10,4,0.25)'
                    ctx.fillRect(x + 3, Math.round(spot.y * TILE) + TILE - 2, 12, 2)
                    if (st.petFlip[item.id]) {
                      ctx.save()
                      ctx.translate(x + 18, y)
                      ctx.scale(-1, 1)
                      ctx.drawImage(look, 0, 0)
                      ctx.restore()
                    } else ctx.drawImage(look, x, y)
                  },
                }
              })),
        ].sort((a, b) => a.depth - b.depth)
        drawables.forEach((item) => item.draw())

        // móvel em destaque (mouse em cima, ou selecionado no modo decorar)
        const outlined = decorating
          ? scene.furniture.find((it) => it.index !== undefined && it.index === decoRef.current.selected)
          : st.hoverItem
        if (outlined) {
          const r = itemRect(outlined, spriteOf(outlined))
          ctx.strokeStyle = decorating ? '#f2c14e' : `rgba(94,234,212,${0.6 + Math.sin(st.time * 6) * 0.3})`
          ctx.lineWidth = 1
          ctx.strokeRect(r.x - 0.5, r.y - 0.5, r.w + 1, r.h + 1)
        }

        // prévia do móvel sendo colocado
        if (decorating && st.ghost) {
          const g = st.ghost
          const item = buildItem(g.key, g.x, g.y, 'ghost')
          if (item) {
            if (!catalogEntry(g.key).wall) {
              ctx.fillStyle = g.valid ? 'rgba(94,234,212,0.25)' : 'rgba(224,82,82,0.35)'
              ctx.fillRect(g.x * TILE, g.y * TILE, item.w * TILE, item.h * TILE)
            }
            ctx.globalAlpha = 0.75
            drawItem(ctx, item)
            ctx.globalAlpha = 1
            if (!g.valid) {
              const r = itemRect(item, spriteOf(item))
              ctx.strokeStyle = '#e05252'
              ctx.strokeRect(r.x - 0.5, r.y - 0.5, r.w + 1, r.h + 1)
            }
          }
        }

        // noite: a sala escurece um pouco e as luzes aparecem mais
        if (st.night) {
          ctx.fillStyle = 'rgba(18,24,60,0.32)'
          ctx.fillRect(0, -WALL_TOP, W, H + WALL_TOP)
        }

        // luzes
        ctx.globalCompositeOperation = 'lighter'
        // som ligado na sala da turma: luzes de festa na pista e no palco
        // corredor (e outros ambientes com "party"): luzes de festa girando em cima da pista
        if (scene.party && (st.items.music || scene.party.always)) {
          const spots = ['rgba(232,106,160,0.3)', 'rgba(94,234,212,0.28)', 'rgba(242,193,78,0.28)', 'rgba(160,110,255,0.28)']
          spots.forEach((color, i) => {
            const a = st.time * (1.1 + i * 0.3) + i * 1.6
            glow(ctx, scene.party.x + Math.cos(a) * scene.party.rx, scene.party.y + Math.sin(a * 1.4) * scene.party.ry, 24, color)
          })
        }
        if (scene.classic && st.items.music) {
          const spots = ['rgba(232,106,160,0.28)', 'rgba(94,234,212,0.26)', 'rgba(242,193,78,0.26)', 'rgba(160,110,255,0.26)']
          spots.forEach((color, i) => {
            const a = st.time * (0.9 + i * 0.25) + i * 1.7
            glow(ctx, 13 * TILE + Math.cos(a) * 44, 11.5 * TILE + Math.sin(a * 1.3) * 18, 26, color)
            glow(ctx, 21 * TILE + Math.sin(a) * 26, 3 * TILE + Math.cos(a) * 8, 18, color)
          })
        }
        scene.furniture.forEach((item) => {
          if (item.glow && isOn(item)) glow(ctx, item.glow.x, item.glow.y, item.glow.size ?? 36, item.glow.color ?? 'rgba(255,200,110,0.32)')
          if (item.screen?.kind === 'tv' && isOn(item)) {
            glow(ctx, item.screen.x + item.screen.w / 2, item.screen.y + item.screen.h + 14, 40 + Math.sin(st.time * 9) * 2, 'rgba(110,170,255,0.2)')
          }
          if (item.screen?.kind === 'arcade') glow(ctx, item.screen.x + item.screen.w / 2, item.screen.y + item.screen.h / 2 + 8, 18, 'rgba(160,110,255,0.18)')
          if (item.screen?.kind === 'pc' && isOn(item)) glow(ctx, item.screen.x + item.screen.w / 2, item.screen.y + item.screen.h, 26, 'rgba(94,234,212,0.18)')
          if (item.screen?.kind === 'xmas') glow(ctx, item.screen.x + 10, item.screen.y + 16, 22, 'rgba(242,193,78,0.12)')
        })
        ctx.globalCompositeOperation = 'source-over'

        st.fx.filter((f) => f.kind === 'steam').forEach((f) => {
          ctx.fillStyle = `rgba(255,255,255,${0.5 * (1 - f.t / 1.4)})`
          const size = 2 + f.t * 3
          ctx.fillRect(f.x + f.dx * f.t - size / 2, f.y - f.t * 14, size, size)
        })

        // a sala maior que a tela rola para o lado: mantém o seu boneco à vista
        const scroller = canvas.parentElement
        if (scroller && scroller.scrollWidth > scroller.clientWidth && (!st.centered || me.path.length)) {
          const px = (me.x * TILE + 8) * s
          const margin = scroller.clientWidth * 0.25
          if (!st.centered || px < scroller.scrollLeft + margin || px > scroller.scrollLeft + scroller.clientWidth - margin) {
            scroller.scrollLeft = px - scroller.clientWidth / 2
          }
          st.centered = true
        }

        const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, W * 0.62)
        vignette.addColorStop(0, 'rgba(10,14,26,0)')
        vignette.addColorStop(1, 'rgba(10,14,26,0.3)')
        ctx.fillStyle = vignette
        ctx.fillRect(0, -WALL_TOP, W, H + WALL_TOP)

        // ---- textos no tamanho real da tela (nítidos), ainda deslocados pela faixa de parede
        ctx.setTransform(1, 0, 0, 1, 0, WALL_TOP * s)
        const size = Math.max(12, Math.min(18, Math.round(s * 3.6)))
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        // placas das portas: plaquinha pendurada por dois fios num preguinho, na cor do dono (ou de madeira),
        // com ícone do destino, estrela no seu quarto e bolinha verde piscando se a pessoa está online
        const plateFont = Math.round(size * 0.95)
        ctx.font = `800 ${plateFont}px system-ui, -apple-system, Segoe UI, sans-serif`
        scene.furniture.forEach((item) => {
          if (!item.plate) return
          const r = itemRect(item, spriteOf(item))
          const ownerId = item.door?.startsWith('quarto:') ? item.door.slice(7) : null
          const online = ownerId && onlineRef.current.has(ownerId)
          const icon = item.mine ? '⭐' : item.plateIcon ?? (item.door === 'turma' ? '🏠' : item.door === 'corredor' ? '🚪' : '')
          const label = icon ? `${icon} ${item.plate}` : item.plate
          const base = item.plateColor ?? '#8a5a34'
          const textW = ctx.measureText(label).width
          const dot = online ? plateFont * 0.62 : 0
          const padX = plateFont * 0.55
          const w = textW + padX * 2 + (dot ? dot + plateFont * 0.35 : 0)
          const h = plateFont * 1.35
          const tx = (r.x + r.w / 2) * s
          const top = r.y * s - h * 0.55 + (item.wall ? 0 : -s * 2)
          const nailY = top - plateFont * 0.55
          // fios e preguinho
          ctx.strokeStyle = 'rgba(26,20,36,0.75)'
          ctx.lineWidth = Math.max(1, s * 0.35)
          ctx.beginPath()
          ctx.moveTo(tx - w * 0.32, top + 1)
          ctx.lineTo(tx, nailY)
          ctx.lineTo(tx + w * 0.32, top + 1)
          ctx.stroke()
          ctx.fillStyle = '#c8962a'
          ctx.beginPath()
          ctx.arc(tx, nailY, Math.max(2, s * 0.6), 0, Math.PI * 2)
          ctx.fill()
          // placa: sombra, borda escura, cor do dono e um brilho em cima
          roundRect(ctx, tx - w / 2 + 2, top + 2, w, h, 4)
          ctx.fillStyle = 'rgba(0,0,0,0.3)'
          ctx.fill()
          roundRect(ctx, tx - w / 2, top, w, h, 4)
          ctx.fillStyle = item.mine ? '#f2c14e' : '#1a1424'
          ctx.fill()
          roundRect(ctx, tx - w / 2 + 2, top + 2, w - 4, h - 4, 3)
          ctx.fillStyle = base
          ctx.fill()
          ctx.fillStyle = 'rgba(255,255,255,0.22)'
          ctx.fillRect(tx - w / 2 + 4, top + 3, w - 8, Math.max(1, h * 0.14))
          const light = isLightColor(base)
          const textX = tx - (dot ? (dot + plateFont * 0.35) / 2 : 0)
          ctx.fillStyle = light ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)'
          ctx.fillText(label, textX + 1, top + h / 2 + 2)
          ctx.fillStyle = light ? '#1a1424' : '#ffffff'
          ctx.fillText(label, textX, top + h / 2 + 1)
          if (dot) {
            const dx = textX + textW / 2 + plateFont * 0.35 + dot / 2
            const pulse = 0.55 + 0.45 * Math.abs(Math.sin(st.time * 3))
            ctx.fillStyle = `rgba(56,210,122,${0.35 * pulse})`
            ctx.beginPath()
            ctx.arc(dx, top + h / 2, dot * 0.85, 0, Math.PI * 2)
            ctx.fill()
            ctx.fillStyle = '#ffffff'
            ctx.beginPath()
            ctx.arc(dx, top + h / 2, dot / 2 + 1.5, 0, Math.PI * 2)
            ctx.fill()
            ctx.fillStyle = '#38d27a'
            ctx.beginPath()
            ctx.arc(dx, top + h / 2, dot / 2, 0, Math.PI * 2)
            ctx.fill()
          }
        })

        // plaquinha de nome do DJ
        scene.furniture.forEach((item) => {
          if (item.key !== 'djnpc' || decorating) return
          const r = itemRect(item, spriteOf(item))
          const label = st.items.yt ? '🎧 DJ Creche ♪' : '🎧 DJ Creche'
          ctx.font = `700 ${Math.round(size * 0.8)}px system-ui, -apple-system, Segoe UI, sans-serif`
          const w = ctx.measureText(label).width + size * 0.9
          const cx = (r.x + r.w / 2) * s
          const cy = r.y * s - size * 0.5
          roundRect(ctx, cx - w / 2, cy - size * 0.62, w, size * 1.24, size * 0.6)
          ctx.fillStyle = '#a066d0'
          ctx.fill()
          ctx.fillStyle = '#ffffff'
          ctx.fillText(label, cx, cy + 1)
        })

        // nome e balão dos bichinhos
        if (!decorating) {
          scene.furniture.forEach((item) => {
            const spot = item.pet && st.petSpots.get(item.id)
            if (!spot) return
            const cx = (spot.x * TILE + 8) * s
            const top = (spot.y * TILE) * s
            const bubble = st.petBubbles[item.id]
            const label = bubble && bubble.until > st.time ? bubble.text : item.name ?? (st.hoverPet === item.id ? item.label : null)
            if (!label) return
            const isBubble = bubble && bubble.until > st.time
            const w = ctx.measureText(label).width + size
            roundRect(ctx, cx - w / 2, top - size * 0.9, w, size * 1.35, isBubble ? 6 : size * 0.6)
            ctx.fillStyle = isBubble ? '#fff' : 'rgba(12,18,32,0.75)'
            ctx.fill()
            ctx.fillStyle = isBubble ? '#0c1626' : '#ffe08a'
            ctx.fillText(label, cx, top - size * 0.2)
          })
        }

        st.fx.filter((f) => f.kind !== 'steam').forEach((f) => {
          ctx.globalAlpha = Math.max(0, 1 - f.t / 1.8)
          ctx.font = `700 ${Math.round(size * (f.kind === 'zzz' ? 0.8 + f.t * 0.4 : 1.1))}px system-ui, sans-serif`
          ctx.fillStyle = f.kind === 'note' ? '#ffe08a' : f.kind === 'zzz' ? '#cfe3ff' : '#5bc0eb'
          ctx.strokeStyle = 'rgba(12,18,32,0.8)'
          ctx.lineWidth = 3
          const x = (f.x + f.dx * f.t + (f.kind === 'zzz' ? f.t * 6 : Math.sin(f.t * 5) * 3)) * s
          const y = (f.y - f.t * (f.kind === 'drop' ? -10 : 14)) * s
          ctx.strokeText(f.text, x, y)
          ctx.fillText(f.text, x, y)
        })
        ctx.globalAlpha = 1

        ctx.font = `700 ${size}px system-ui, -apple-system, Segoe UI, sans-serif`
        players.forEach((p) => {
          const cx = (p.x * TILE + 8) * s
          const cy = headTop(p) * s - size * 0.9
          const w = ctx.measureText(p.name).width + size * 1.1
          const h = size * 1.55
          roundRect(ctx, cx - w / 2, cy - h / 2, w, h, h / 2)
          ctx.fillStyle = p === me ? 'rgba(94,234,212,0.95)' : 'rgba(12,18,32,0.82)'
          ctx.fill()
          ctx.fillStyle = p === me ? '#0c1626' : '#fff'
          ctx.fillText(p.name, cx, cy + 1)
          if (p.bubble && p.bubble.until > st.time) {
            const by = cy - h * 1.4
            const bw = ctx.measureText(p.bubble.text).width + size * 1.4
            const bh = size * 1.8
            roundRect(ctx, cx - bw / 2, by - bh / 2, bw, bh, 6)
            ctx.fillStyle = '#fff'
            ctx.fill()
            ctx.strokeStyle = '#0c1626'
            ctx.lineWidth = 2
            ctx.stroke()
            ctx.beginPath()
            ctx.moveTo(cx - 5, by + bh / 2 - 1)
            ctx.lineTo(cx + 5, by + bh / 2 - 1)
            ctx.lineTo(cx, by + bh / 2 + 6)
            ctx.closePath()
            ctx.fillStyle = '#fff'
            ctx.fill()
            ctx.fillStyle = '#0c1626'
            ctx.fillText(p.bubble.text, cx, by + 1)
          }
        })

        if (!decorating && st.hoverItem?.label && st.hoverItem.act !== 'door' && !st.hoverItem.plate) {
          const r = itemRect(st.hoverItem, spriteOf(st.hoverItem))
          const tx = (r.x + r.w / 2) * s
          const ty = Math.max(size, r.y * s - size * 0.6)
          const w = ctx.measureText(st.hoverItem.label).width + size
          roundRect(ctx, tx - w / 2, ty - size * 0.7, w, size * 1.4, 4)
          ctx.fillStyle = 'rgba(12,18,32,0.9)'
          ctx.fill()
          ctx.fillStyle = '#5eead4'
          ctx.fillText(st.hoverItem.label, tx, ty + 1)
        }

        // troca de ambiente: escurece e clareia desenhando no próprio canvas
        // (antes era opacidade em CSS, que em tela cheia deixava a sala invisível em alguns navegadores)
        const fadeAlpha = st.fadeOutAt != null ? Math.min(1, (st.time - st.fadeOutAt) / 0.2) : st.fadeInAt != null ? Math.max(0, 1 - (st.time - st.fadeInAt) / 0.25) : 0
        if (fadeAlpha > 0) {
          ctx.setTransform(1, 0, 0, 1, 0, 0)
          ctx.fillStyle = `rgba(10,14,26,${fadeAlpha})`
          ctx.fillRect(0, 0, canvas.width, canvas.height)
        } else st.fadeInAt = null
        // flash da cabine de fotos
        if (st.flashAt != null) {
          const k = (st.time - st.flashAt) / 0.35
          if (k < 1) {
            ctx.setTransform(1, 0, 0, 1, 0, 0)
            ctx.fillStyle = `rgba(255,255,255,${0.85 * (1 - k)})`
            ctx.fillRect(0, 0, canvas.width, canvas.height)
          } else st.flashAt = null
        }
      }
    }
    raf = requestAnimationFrame(frame)
    // a placa de vídeo pode "perder" o desenho (ex.: ao entrar/sair da tela cheia): refaz o fundo quando voltar
    const canvasEl = canvasRef.current
    const restore = () => st.scene && applyScene(st.scene)
    canvasEl?.addEventListener('contextrestored', restore)

    return () => {
      canvasEl?.removeEventListener('contextrestored', restore)
      alive = false
      cancelAnimationFrame(raf)
      supabase.removeChannel(channel)
      players.clear()
      st.me = null
      st.goTo = null
      st.track = null
      st.leave = null
      st.shareLayout = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, roomKey])

  // a lista de membros chegou ou mudou: refaz as portas do corredor e o nome do quarto
  useEffect(() => {
    if (!user?.id) return
    if (roomKey === 'corredor') applyScene(corridorScene(members, user.id))
    else if (roomOwner(roomKey) && !decoRef.current) applyScene(makeScene(roomKey, members, user.id, stateRef.current.savedLayout))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, roomKey])

  // modo decorar: cada mudança no rascunho redesenha o quarto na hora
  useEffect(() => {
    if (!deco || !inMyRoom) return
    applyScene(personalScene(user.id, meName, deco.draft, { hide: deco.dragging ?? -1 }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deco?.draft, deco?.dragging])

  // o perfil chega depois do primeiro desenho: atualiza nome, foto e avatar do seu boneco
  useEffect(() => {
    const st = stateRef.current
    if (!st.me) return
    st.me.name = meName
    st.me.avatarUrl = meAvatar
    st.me.look = normalizeAvatar(meLook, user?.id)
    makeHead(st.me)
    st.track?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meName, meAvatar, meLook])

  // tamanho: ocupa a largura disponível sem passar da altura da tela; no celular rola para o lado
  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return undefined
    const st = stateRef.current
    const resize = () => {
      const scene = st.scene
      if (!scene) return
      const W = scene.cols * TILE
      const H = scene.rows * TILE
      const stage = stageRef.current
      const width = stage ? stage.clientWidth : wrap.clientWidth - 6 // área da sala (sem as bordas e sem o catálogo)
      const big = document.fullscreenElement === wrap || wrap.classList.contains('is-fullscreen')
      const chrome = (wrap.querySelector('.room-bar')?.offsetHeight ?? 0) + (wrap.querySelector('.room-chat')?.offsetHeight ?? 0)
      const maxH = big ? window.innerHeight - chrome - 40 : Math.max(360, window.innerHeight * 0.74)
      const fullH = H + WALL_TOP // altura desenhada de verdade (com a faixa extra de parede)
      // decorando no celular a sala fica menor, para ver quase tudo de uma vez
      const scale = st.decorating && width < 600 ? Math.max(1.6, width / W) : width < 600 ? 2.2 : Math.max(2, Math.min(width / W, maxH / fullH))
      st.scale = scale
      const canvas = canvasRef.current
      if (canvas) {
        const cw = Math.round(W * scale)
        const ch = Math.round(fullH * scale)
        // só mexe no canvas se o tamanho mudou de verdade (mudar o tamanho apaga o desenho)
        if (canvas.width !== cw || canvas.height !== ch) {
          canvas.width = cw
          canvas.height = ch
          canvas.style.width = `${cw}px`
          canvas.style.height = `${ch}px`
          setStageH(ch)
        }
      }
    }
    st.resize = resize
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(wrap)
    if (stageRef.current) observer.observe(stageRef.current)
    window.addEventListener('resize', resize)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', resize)
    }
  }, [])

  // ---------- toque e mouse
  const toRoom = (event) => {
    const st = stateRef.current
    const rect = canvasRef.current.getBoundingClientRect()
    return {
      lx: ((event.clientX - rect.left) / rect.width) * st.scene.cols * TILE,
      ly: ((event.clientY - rect.top) / rect.height) * (st.scene.rows * TILE + WALL_TOP) - WALL_TOP,
    }
  }
  const personAt = (lx, ly) => {
    let hit = null
    let best = Infinity
    stateRef.current.players.forEach((p) => {
      const cy = p.pose === 'sleep' ? p.y * TILE : p.y * TILE + TILE - BODY_H / 2
      const dist = Math.hypot(lx - (p.x * TILE + 8), ly - cy)
      if (dist < 12 && dist < best) {
        best = dist
        hit = p
      }
    })
    return hit
  }
  const petAt = (lx, ly) => {
    const st = stateRef.current
    return (
      st.scene.furniture.find((item) => {
        const spot = item.pet && st.petSpots.get(item.id)
        return spot && Math.hypot(lx - (spot.x * TILE + 8), ly - (spot.y * TILE + 9)) < 10
      }) ?? null
    )
  }
  const itemAt = (lx, ly, filter = (item) => item.act && !item.pet) => {
    const hits = stateRef.current.scene.furniture.filter((item) => {
      if (!filter(item)) return false
      const r = itemRect(item, spriteOf(item))
      return lx >= r.x && lx < r.x + r.w && ly >= r.y && ly < r.y + r.h
    })
    const depth = (item) => (item.floor ? -2 : item.wall ? -1 : item.y + item.h)
    hits.sort((a, b) => depth(b) - depth(a))
    return hits[0] ?? null
  }

  function handlePointer(event) {
    const st = stateRef.current
    if (!st.me || !st.scene) return
    const { lx, ly } = toRoom(event)
    if (decoRef.current) return // no modo decorar quem cuida é handleDown/handleUp
    const person = personAt(lx, ly)
    if (person && person !== st.me) {
      selectPerson(person.id)
      return
    }
    const pet = petAt(lx, ly)
    if (pet) {
      st.petPet?.(pet)
      return
    }
    const item = itemAt(lx, ly)
    if (item) {
      const me = st.me
      const from = me.pose ? { x: me.standX, y: me.standY } : { x: Math.round(me.x), y: Math.round(me.y) }
      st.goTo?.(besideItem(st.blocked, item, from), item)
      return
    }
    if (person) {
      selectPerson(person.id)
      return
    }
    st.goTo?.({ x: Math.floor(lx / TILE), y: Math.floor(ly / TILE) })
  }

  function handleMove(event) {
    const st = stateRef.current
    if (!st.scene) return
    const { lx, ly } = toRoom(event)
    st.hover = { x: Math.floor(lx / TILE), y: Math.floor(ly / TILE) }
    const current = decoRef.current
    if (current) {
      st.hoverItem = null
      if (st.drag) {
        const d = st.drag
        const x = Math.round(lx / TILE - d.offX)
        const y = d.wall ? 0 : Math.round(ly / TILE - d.offY)
        if (!d.moved && (x !== d.from.x || y !== d.from.y)) {
          d.moved = true
          setDeco((cur) => cur && { ...cur, dragging: d.index })
        }
        if (d.moved) st.ghost = { key: d.key, x, y, valid: canPlace(st.scene, d.key, x, y, d.index) }
        canvasRef.current.style.cursor = 'grabbing'
        return
      }
      if (current.pick) {
        const pos = placeAt(current.pick, lx, ly)
        st.ghost = pos ? { key: current.pick, ...pos, valid: canPlace(st.scene, current.pick, pos.x, pos.y) } : null
      } else st.ghost = null
      canvasRef.current.style.cursor = current.pick ? 'copy' : itemAt(lx, ly, (it) => it.index !== undefined) ? 'grab' : 'default'
      return
    }
    const person = personAt(lx, ly)
    const pet = person ? null : petAt(lx, ly)
    st.hoverPet = pet?.id ?? null
    st.hoverItem = (person && person !== st.me) || pet ? null : itemAt(lx, ly)
    canvasRef.current.style.cursor = person || pet || st.hoverItem ? 'pointer' : 'crosshair'
  }

  // ---------- modo decorar: colocar, arrastar e mexer nos móveis
  const commit = (change, extra = {}) =>
    setDeco((cur) => cur && { ...cur, ...extra, draft: change(cur.draft), history: [...cur.history, cur.draft].slice(-60), future: [] })
  const undo = () =>
    setDeco((cur) =>
      cur?.history.length ? { ...cur, draft: cur.history[cur.history.length - 1], history: cur.history.slice(0, -1), future: [cur.draft, ...cur.future], selected: null } : cur,
    )
  const redo = () =>
    setDeco((cur) => (cur?.future.length ? { ...cur, draft: cur.future[0], future: cur.future.slice(1), history: [...cur.history, cur.draft], selected: null } : cur))

  function handleDown(event) {
    const current = decoRef.current
    if (!current || current.pick) return
    const st = stateRef.current
    const { lx, ly } = toRoom(event)
    const item = itemAt(lx, ly, (it) => it.index !== undefined)
    if (!item) {
      setDeco((cur) => cur && { ...cur, selected: null })
      return
    }
    st.drag = { index: item.index, key: item.key, offX: lx / TILE - item.x, offY: ly / TILE - item.y, wall: item.wall, from: { x: item.x, y: item.y }, moved: false }
    canvasRef.current.setPointerCapture?.(event.pointerId)
    setDeco((cur) => cur && { ...cur, selected: item.index })
  }

  function handleUp(event) {
    const current = decoRef.current
    if (!current) return
    const st = stateRef.current
    const { lx, ly } = toRoom(event)
    if (st.drag) {
      const d = st.drag
      const g = st.ghost
      st.drag = null
      st.ghost = null
      if (d.moved && g?.valid) commit((draft) => ({ ...draft, items: draft.items.map((it, i) => (i === d.index ? [it[0], g.x, g.y] : it)) }), { dragging: null, selected: d.index })
      else if (d.moved) setDeco((cur) => cur && { ...cur, dragging: null })
      return
    }
    if (current.pick) {
      const key = current.pick
      const pos = placeAt(key, lx, ly)
      if (pos && canPlace(st.scene, key, pos.x, pos.y) && current.draft.items.length < MAX_ITEMS) {
        // Shift mantém o móvel escolhido para colocar outro igual
        commit((draft) => ({ ...draft, items: [...draft.items, [key, pos.x, pos.y]] }), { selected: event.shiftKey ? null : current.draft.items.length, pick: event.shiftKey ? key : null })
        st.ghost = null
      }
    }
  }

  function decoAction(kind) {
    const cur = decoRef.current
    if (!cur || cur.selected === null || cur.selected === undefined) return
    const i = cur.selected
    const [key, x, y] = cur.draft.items[i]
    const replace = (next) => commit((draft) => ({ ...draft, items: draft.items.map((it, j) => (j === i ? [next, x, y] : it)) }))
    if (kind === 'remove') commit((draft) => ({ ...draft, items: draft.items.filter((_, j) => j !== i) }), { selected: null })
    if (kind === 'move') commit((draft) => ({ ...draft, items: draft.items.filter((_, j) => j !== i) }), { selected: null, pick: key })
    if (kind === 'copy') setDeco((c) => c && { ...c, pick: key, selected: null })
    if (kind === 'color' && nextVariant(key)) replace(nextVariant(key))
    if (kind === 'flip' && flipped(key)) replace(flipped(key))
  }

  // atalhos do modo decorar
  useEffect(() => {
    if (!deco) return undefined
    const onKey = (event) => {
      if (event.target.closest?.('input, textarea')) return
      const ctrl = event.ctrlKey || event.metaKey
      if (ctrl && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
      } else if (ctrl && event.key.toLowerCase() === 'y') {
        event.preventDefault()
        redo()
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        decoAction('remove')
      } else if (event.key === 'Escape') {
        stateRef.current.ghost = null
        setDeco((cur) => cur && { ...cur, pick: null, selected: null })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!deco])

  // posição da barrinha de ações em cima do móvel selecionado
  function toolbarSpot() {
    const st = stateRef.current
    const canvas = canvasRef.current
    const stage = stageRef.current
    if (!deco || deco.pick || deco.dragging != null || deco.selected == null || !canvas || !stage || !st.scene) return null
    const entry = deco.draft.items[deco.selected]
    const item = entry && buildItem(entry[0], entry[1], entry[2], 'sel')
    if (!item) return null
    const r = itemRect(item, spriteOf(item))
    const c = canvas.getBoundingClientRect()
    const sr = stage.getBoundingClientRect()
    const k = c.width / (st.scene.cols * TILE)
    return { left: c.left - sr.left + (r.x + r.w / 2) * k, top: Math.max(4, c.top - sr.top + (r.y + WALL_TOP) * k - 8), item }
  }

  function handleKey(event) {
    const st = stateRef.current
    if (decoRef.current) return
    const dirs = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] }
    const dir = dirs[event.key]
    if (!dir || !st.me || decoRef.current) return
    event.preventDefault()
    const me = st.me
    let from = { x: Math.round(me.x), y: Math.round(me.y) }
    if (me.pose) from = { x: me.standX, y: me.standY }
    else if (me.path.length) from = me.path[me.path.length - 1]
    st.goTo?.({ x: from.x + dir[0], y: from.y + dir[1] })
  }

  // ---------- modo decorar
  function startDecor() {
    const st = stateRef.current
    setPanel(null)
    st.decorating = true
    setDeco({ draft: JSON.parse(JSON.stringify(st.savedLayout ?? emptyLayout())), pick: null, selected: null, dragging: null, history: [], future: [] })
    // no computador, decorar abre em tela cheia (mais espaço para o quarto e o catálogo)
    if (!fullscreen && window.innerWidth >= 900) {
      st.autoFullscreen = true
      toggleFullscreen()
    } else setTimeout(() => st.resize?.(), 60)
  }
  function endDecor() {
    const st = stateRef.current
    st.decorating = false
    st.drag = null
    st.ghost = null
    if (st.autoFullscreen && fullscreen) toggleFullscreen()
    st.autoFullscreen = false
    setTimeout(() => st.resize?.(), 60)
  }
  function cancelDecor() {
    const st = stateRef.current
    endDecor()
    setDeco(null)
    st.ghost = null
    applyScene(personalScene(user.id, meName, st.savedLayout))
  }
  async function saveDecor() {
    const st = stateRef.current
    setSaving(true)
    setError(null)
    try {
      await saveRoomLayout(user.id, deco.draft)
      st.savedLayout = deco.draft
      st.myLayout = deco.draft
      st.shareLayout?.()
      setRoomEmpty(!deco.draft.items.length)
      endDecor()
      setDeco(null)
      st.ghost = null
    } catch (err) {
      setError(err)
    } finally {
      setSaving(false)
    }
  }
  // balão de fala e emotes: aparecem para todo mundo no mesmo ambiente (nada fica salvo)
  const speak = (text) => {
    const clean = text.trim().slice(0, 80)
    if (!clean || Date.now() - lastSaid.current < 1200) return
    lastSaid.current = Date.now()
    stateRef.current.say?.(clean)
    setMessage('')
  }

  // tela cheia: usa a do navegador; onde não existe (iPhone), ocupa a tela toda dentro do site
  function toggleFullscreen() {
    const wrap = wrapRef.current
    if (!wrap) return
    if (fullscreen) {
      if (document.fullscreenElement) document.exitFullscreen?.()
      wrap.classList.remove('is-fullscreen')
      setFullscreen(false)
    } else if (wrap.requestFullscreen) {
      wrap.requestFullscreen().catch(() => {
        wrap.classList.add('is-fullscreen')
        setFullscreen(true)
      })
    } else {
      wrap.classList.add('is-fullscreen')
      setFullscreen(true)
    }
    setTimeout(() => stateRef.current.resize?.(), 120)
  }
  useEffect(() => {
    const sync = () => {
      const wrap = wrapRef.current
      setFullscreen(document.fullscreenElement === wrap || !!wrap?.classList.contains('is-fullscreen'))
      setTimeout(() => stateRef.current.resize?.(), 120)
    }
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])
  // o perfil de alguém abre fora da sala: sai da tela cheia antes
  const selectPerson = (id) => {
    if (fullscreen) toggleFullscreen()
    onSelectPerson?.(id)
  }

  const goRoom = (key) => {
    if (key === roomKey) return
    stateRef.current.prevRoom = key.startsWith('quarto:') ? 'corredor' : null
    setDeco(null)
    setRoomKey(key)
  }

  return (
    <div className="room" ref={wrapRef}>
      <div className="room-frame">
        <div className="room-bar">
          <span className="room-title">{sceneName}</span>
          <div className="room-bar-actions">
            {isAdmin && roomKey === 'turma' && (
              <label className="room-day-pick" title="Só você (admin) vê a troca">
                <span>Ver sala de</span>
                <select
                  value={hallPreview ?? 'hoje'}
                  onChange={(event) => {
                    const value = event.target.value === 'hoje' ? null : Number(event.target.value)
                    previewDay = value
                    setHallPreview(value)
                    applyScene(makeScene('turma', membersRef.current, user.id, null))
                  }}
                >
                  <option value="hoje">Hoje ({HALL_THEMES[brasiliaToday().weekday].dayName})</option>
                  {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                    <option key={day} value={day}>
                      {HALL_THEMES[day].dayName} · {HALL_THEMES[day].name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {roomKey !== 'turma' && (
              <button type="button" className="room-bar-btn" onClick={() => goRoom('turma')}>
                Sala da turma
              </button>
            )}
            {!inMyRoom && (
              <button type="button" className="room-bar-btn" onClick={() => goRoom(myRoom)}>
                Meu quarto
              </button>
            )}
            {inMyRoom && !deco && (
              <button type="button" className="room-bar-btn is-strong" onClick={startDecor}>
                Decorar
              </button>
            )}
            <button type="button" className="room-bar-btn" onClick={toggleFullscreen} aria-pressed={fullscreen}>
              {fullscreen ? 'Sair da tela cheia' : '⛶ Tela cheia'}
            </button>
            <button type="button" className={`room-bar-btn${meLook ? '' : ' is-new'}`} onClick={() => setEditingAvatar(true)}>
              {meLook ? 'Meu avatar' : 'Crie seu avatar!'}
            </button>
          </div>
          <span className="room-count">
            <span className="online-dot-inline" aria-hidden="true" />
            {count} aqui
          </span>
        </div>
        <div className={`room-body${deco ? ' is-decorating' : ''}`}>
        <div className="room-stage" ref={stageRef}>
          <div className="room-scroll">
            <div className="room-canvas-box">
            <canvas
              ref={canvasRef}
              className="room-canvas"
              tabIndex={0}
              aria-label={`${sceneName}. Toque no chão para andar, nos móveis para usar e nas pessoas para ver o perfil.`}
              onClick={handlePointer}
              onPointerDown={handleDown}
              onPointerUp={handleUp}
              onPointerMove={handleMove}
              onPointerLeave={() => {
                stateRef.current.hover = null
                stateRef.current.hoverItem = null
                stateRef.current.ghost = null
              }}
              onKeyDown={handleKey}
            />
            {roomKey === 'turma' && ytVideo && tvRect && (
              <YouTubeScreen video={ytVideo} rect={tvRect} onStop={() => stateRef.current.setYouTube?.(null)} />
            )}
            </div>
          </div>
          {(() => {
            const spot = toolbarSpot()
            if (!spot) return null
            return (
              <div className="decor-toolbar" style={{ left: spot.left, top: spot.top }} role="toolbar" aria-label={spot.item.label}>
                <span className="decor-toolbar-name">{spot.item.label}</span>
                <button type="button" onClick={() => decoAction('move')} title="Mover (ou arraste)">
                  ✥ Mover
                </button>
                {nextVariant(spot.item.key) && (
                  <button type="button" onClick={() => decoAction('color')} title="Trocar a cor">
                    🎨 Cor
                  </button>
                )}
                {flipped(spot.item.key) && (
                  <button type="button" onClick={() => decoAction('flip')} title="Virar para o outro lado">
                    ⇄ Virar
                  </button>
                )}
                <button type="button" onClick={() => decoAction('copy')} title="Colocar outro igual">
                  ⧉ Duplicar
                </button>
                <button type="button" className="is-danger" onClick={() => decoAction('remove')} title="Remover (Delete)">
                  🗑 Remover
                </button>
              </div>
            )
          })()}
          {inMyRoom && roomEmpty && !deco && (
            <div className="room-panel room-panel-top" role="status">
              <div className="room-panel-head">
                <strong>Seu quarto</strong>
              </div>
              <p>Está vazio por enquanto. Toque em Decorar e escolha os móveis!</p>
              <div className="room-panel-actions">
                <button type="button" className="btn btn-primary" onClick={startDecor}>
                  Decorar
                </button>
              </div>
            </div>
          )}
          {panel && !deco && (
            <div className="room-panel" role="status">
              <div className="room-panel-head">
                <strong>{panel.title}</strong>
                <button type="button" className="room-panel-close" aria-label="Fechar" onClick={() => setPanel(null)}>
                  ×
                </button>
              </div>
              {panel.text && <p>{panel.text}</p>}
              {panel.dj && (
                <div className="room-dj">
                  <div className="room-dj-tabs" role="tablist" aria-label="O que passar no telão">
                    <button type="button" role="tab" aria-selected={djTab === 'yt'} className={djTab === 'yt' ? 'is-on' : ''} onClick={() => setDjTab('yt')}>
                      ▶ YouTube
                    </button>
                    <button type="button" role="tab" aria-selected={djTab === 'live'} className={djTab === 'live' ? 'is-on' : ''} onClick={() => setDjTab('live')}>
                      📡 Ao vivo{live.hosts.length > 0 ? ` (${live.hosts.length})` : ''}
                    </button>
                  </div>
                  {djTab === 'yt' ? (
                    <form
                      className="room-dj-form"
                      onSubmit={(event) => {
                        event.preventDefault()
                        const id = youTubeId(djLink)
                        if (!id) {
                          setDjError('Esse link não parece do YouTube. Cole o link do vídeo (youtube.com ou youtu.be).')
                          return
                        }
                        stateRef.current.setYouTube?.({ type: 'yt', id, at: Date.now(), by: meName?.split(' ')[0] ?? '' })
                        setDjLink('')
                        setDjError('')
                        setPanel(null)
                      }}
                    >
                      <p>Cole o link de um vídeo do YouTube e ele toca no telão para todo mundo que está na sala, ao mesmo tempo.</p>
                      <input
                        type="url"
                        inputMode="url"
                        placeholder="https://youtu.be/..."
                        value={djLink}
                        onChange={(event) => {
                          setDjLink(event.target.value)
                          if (djError) setDjError('')
                        }}
                        aria-invalid={!!djError}
                      />
                      {djError && <p className="room-dj-error">{djError}</p>}
                      <div className="room-panel-actions">
                        <button type="submit" className="btn btn-primary">
                          ▶ Tocar no telão
                        </button>
                        {ytVideo && (
                          <button type="button" className="btn btn-ghost" onClick={() => { stateRef.current.setYouTube?.(null); setPanel(null) }}>
                            ⏻ Desligar
                          </button>
                        )}
                      </div>
                    </form>
                  ) : (
                    <div className="room-dj-form">
                      {live.hosts.length === 0 ? (
                        <p>
                          Ninguém está ao vivo agora. Comece uma transmissão na página{' '}
                          <button type="button" className="room-dj-link" onClick={() => navRef.current('/ao-vivo')}>
                            Ao vivo
                          </button>{' '}
                          e depois passe ela aqui no telão.
                        </p>
                      ) : (
                        <>
                          <p>Escolha uma transmissão para passar no telão. Todo mundo na sala assiste junto, em tempo real.</p>
                          <ul className="room-dj-lives">
                            {live.hosts.map((meta) => {
                              const onTv = ytVideo?.type === 'live' && ytVideo.host === meta.userId
                              return (
                                <li key={meta.userId}>
                                  <span className="room-dj-live-dot" aria-hidden="true" />
                                  <span className="room-dj-live-name">
                                    {meta.name ?? 'Alguém'}
                                    {meta.userId === user?.id ? ' (você)' : ''}
                                  </span>
                                  {onTv ? (
                                    <span className="room-dj-live-on">No telão</span>
                                  ) : (
                                    <button
                                      type="button"
                                      className="btn btn-primary"
                                      onClick={() => {
                                        stateRef.current.setYouTube?.({ type: 'live', host: meta.userId, name: meta.name ?? 'Alguém', by: meName?.split(' ')[0] ?? '' })
                                        setPanel(null)
                                      }}
                                    >
                                      📡 Passar
                                    </button>
                                  )}
                                </li>
                              )
                            })}
                          </ul>
                          <p className="room-dj-note">Cada pessoa na sala conta como espectador da live (máximo de {MAX_VIEWERS}).</p>
                        </>
                      )}
                      {ytVideo && (
                        <div className="room-panel-actions">
                          <button type="button" className="btn btn-ghost" onClick={() => { stateRef.current.setYouTube?.(null); setPanel(null) }}>
                            ⏻ Desligar o telão
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {panel.actions?.length > 0 && (
                <div className="room-panel-actions">
                  {panel.actions.map((action, index) => (
                    <button key={action.label} type="button" className={`btn ${index === 0 ? 'btn-primary' : 'btn-ghost'}`} onClick={action.run}>
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        {!deco && (
          <form
            className="room-chat"
            onSubmit={(event) => {
              event.preventDefault()
              speak(message)
            }}
          >
            <div className="room-emotes" role="group" aria-label="Emotes">
              {EMOTES.map((emote) => (
                <button key={emote} type="button" className="room-emote" onClick={() => speak(emote)}>
                  {emote}
                </button>
              ))}
            </div>
            <input
              className="room-chat-input"
              value={message}
              maxLength={80}
              placeholder="Falar algo para quem está aqui..."
              aria-label="Mensagem"
              onChange={(event) => setMessage(event.target.value)}
            />
            <button type="submit" className="btn btn-primary room-chat-send" disabled={!message.trim()}>
              Falar
            </button>
          </form>
        )}
        {deco && (
          <DecorPanel
            deco={deco}
            onPick={(key) => {
              stateRef.current.ghost = null
              setDeco((cur) => cur && { ...cur, pick: key, selected: null })
            }}
            onStyle={(change) => commit((draft) => ({ ...draft, ...change }))}
            onUndo={undo}
            onRedo={redo}
            onSave={saveDecor}
            onCancel={cancelDecor}
            saving={saving}
            maxHeight={stageH || undefined}
          />
        )}
        </div>
      </div>
      {error && <ErrorBox error={error} />}
      {editingAvatar && <AvatarEditor onClose={() => setEditingAvatar(false)} />}
      <p className="muted room-hint">
        Toque no chão para andar · nos móveis para usar · nas portas para trocar de ambiente · numa pessoa para ver o perfil
      </p>
    </div>
  )
}
