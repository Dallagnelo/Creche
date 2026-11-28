import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AvatarEditor from '../AvatarEditor'
import DecorPanel from '../DecorPanel'
import { ErrorBox } from '../Feedback'
import { useAuth } from '../../contexts/AuthContext'
import { useLive } from '../../contexts/LiveContext'
import { normalizeAvatar } from '../../lib/avatar'
import { besideItem, buildBlocked, findPath, nearestFree, spawnPoint, TILE, WALL_ROWS, WALL_TOP, wallSpan } from '../../lib/room'
import { nextVariant, rotated } from '../../lib/roomCatalog'
import { makeHead, paintBackground, pick, playNotes } from '../../lib/roomDraw'
import { PETS } from '../../lib/roomPets'
import { petImage } from '../../lib/pokePet'
import YouTubeScreen from '../YouTubeScreen'
import { presenceSent, presenceWait } from '../../lib/presenceBudget'
import { brasiliaToday, CINEMA_KEY, emptyLayout, personalScene, roomOwner } from '../../lib/rooms'
import { openChannel, releaseChannel } from '../../lib/realtimeChannel'
import { getRoomLayout } from '../../services/profiles'
import { createRoomRenderer } from './roomRenderer'
import { firstTodayCheck, readSpot, getPreviewDay, isDecor, makeScene, cleanHold, writeSpot } from './roomHelpers'
import { createRoomActions } from './roomActions'
import RoomPanel from './RoomPanel'
import { useRoomControls } from './useRoomControls'
import { useRoomCinema } from './useRoomCinema'
import RoomChat from './RoomChat'
import RoomBar from './RoomBar'

/**
 * Os ambientes da turma: a sala da turma, o corredor e o quarto de cada pessoa (que ela mesma decora).
 * Quem está no mesmo ambiente aparece, anda e usa os móveis em tempo real (Presence + broadcast, sem gravar no banco).
 * Só a arrumação do quarto é salva (no perfil), e só quando a pessoa clica em "Salvar".
 */
export default function RoomScene({ members = [], onlineIds = [], onSelectPerson, onPeopleChange, onRoomChange }) {
  const { user, profile, isAdmin } = useAuth()
  const navigate = useNavigate()
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const stateRef = useRef({
    players: new Map(), cineListeners: new Set(), cineThrown: 0, cineReceived: 0, scale: 1, scene: null, blocked: [[]], bg: null, items: {}, fx: [], time: 0,
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
  const [hallPreview, setHallPreview] = useState(getPreviewDay)
  const onlineRef = useRef(new Set())
  onlineRef.current = new Set(onlineIds)
  const [sceneName, setSceneName] = useState('Sala da turma')
  // avisa a página em que sala você está (para os cartõezinhos mostrarem onde cada um anda)
  useEffect(() => {
    roomChangeRef.current?.(sceneName)
  }, [sceneName])
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
  const mePet = Number.isInteger(profile?.poke_pet) ? profile.poke_pet : null // Pokémon que segue o boneco
  const meRef = useRef({ name: meName, avatarUrl: meAvatar, look: meLook, pet: mePet })
  meRef.current = { name: meName, avatarUrl: meAvatar, look: meLook, pet: mePet }
  const membersRef = useRef(members)
  membersRef.current = members
  const peopleRef = useRef(onPeopleChange)
  peopleRef.current = onPeopleChange
  const roomChangeRef = useRef(onRoomChange)
  roomChangeRef.current = onRoomChange
  const navRef = useRef(navigate)
  navRef.current = navigate
  const decoRef = useRef(deco)
  decoRef.current = deco

  const myRoom = user ? `quarto:${user.id}` : null
  const inMyRoom = roomKey === myRoom
  const canDecorate = inMyRoom
  // ambiente montado a partir de uma arrumação (rascunho do modo decorar ou a salva)
  const sceneFromLayout = (layout, opts = {}) => personalScene(user.id, meName, layout, opts)

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
    const owner = roomOwner(roomKey)
    const loadLayout = () => getRoomLayout(owner)
    applyScene(makeScene(roomKey, membersRef.current, user.id, owner === user.id ? st.myLayout : null))
    if (owner) {
      loadLayout()
        .then((layout) => {
          if (!alive) return
          st.savedLayout = layout ?? emptyLayout()
          if (owner === user.id) st.myLayout = st.savedLayout
          if (!decoRef.current) applyScene(makeScene(roomKey, membersRef.current, user.id, st.savedLayout))
          if (owner) setRoomEmpty(!st.savedLayout.items?.length)
        })
        .catch((err) => alive && setError(err))
    }

    // o canal é aberto mais abaixo (connect): espera um canal antigo com o mesmo nome terminar de fechar
    const topicName = roomKey === 'turma' ? 'turma-room' : `room:${roomKey}`
    let channel = null
    let joined = false

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
      if (p.hold === undefined) p.hold = cleanHold(data.hold) // depois, o que tem na mão chega por broadcast
      if (p.away === undefined) {
        // quem chega depois já vê quem está no banheiro, no celular ou cochilando
        p.away = !!data.away
        p.awayAt = Number.isFinite(data.awayAt) ? data.awayAt : 0
        p.phone = !!data.phone
        p.nap = !!data.nap
      }
      p.pet = Number.isInteger(data.pet) && data.pet >= 1 && data.pet <= 1025 ? data.pet : null
      if (p.pet) petImage(p.pet) // já começa a baixar
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
    const share = (event, payload) => {
      if (channel && joined) channel.send({ type: 'broadcast', event, payload: { id: user.id, ...payload } })
    }
    const { doFx, act, applyFx, isOn } = createRoomActions({ st, user, players, fx, headTop: (p) => headTop(p), setYtVideo, share, navRef, setPanel, sitDown, setEditingAvatar, setDjError })

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
    // testes automáticos (só quando o teste liga essa chave antes de abrir a página; nunca no uso normal)
    if (window.__ROOM_TEST__) window.__room = st
    emitPeople()

    let trackTimer = 0
    let trackUrgent = false
    st.track = (urgent = false) => {
      writeSpot(user.id, { room: roomKey, x: me.pose ? me.standX : Math.round(me.x), y: me.pose ? me.standY : Math.round(me.y) })
      if (!channel || !joined) return Promise.resolve()
      trackUrgent = trackUrgent || urgent
      // presença tem limite no Supabase (5 a cada 30 s por conexão): ver lib/presenceBudget.js.
      // Andar e usar móveis já vão por broadcast; a presença só guarda "onde estou" para quem chega.
      const wait = presenceWait(trackUrgent)
      if (wait > 0) {
        // sem vaga agora: manda uma vez só quando liberar, já com a posição mais nova
        if (!trackTimer) {
          trackTimer = setTimeout(() => {
            trackTimer = 0
            if (alive) st.track()
          }, wait)
        }
        return Promise.resolve()
      }
      clearTimeout(trackTimer)
      trackTimer = 0
      trackUrgent = false
      presenceSent()
      return channel.track({
        ...meRef.current,
        x: me.pose ? me.standX : Math.round(me.x),
        y: me.pose ? me.standY : Math.round(me.y),
        pose: me.pose ?? null,
        dir: me.dir,
        px: me.pose ? me.x : null,
        py: me.pose ? me.y : null,
        items: st.items,
        hold: me.hold ?? null,
        away: !!me.away,
        awayAt: me.awayAt || 0,
        phone: !!me.phone,
        nap: !!me.nap,
      })
    }
    // brincadeiras da plateia (modo cinema): jogar pipoca, cutucar, pedir silêncio, puxar a ola
    let lastCine = 0
    st.cine = (act, to = null, extra = {}) => {
      if (act === 'away' || act === 'phone' || act === 'nap') {
        // "ir ao banheiro" (continua sentado na sala, mas a poltrona aparece vazia na plateia),
        // "mexer no celular" e "cochilar": só mudam como o boneco aparece no telão
        if (!!me[act] === !!extra.v) return 'ok'
        doFx({ kind: 'cine', act, v: !!extra.v, t: Date.now() })
        st.track()
        return 'ok'
      }
      if (act === 'chart') {
        // fim do vídeo: manda a linha do tempo da nota para a sala inteira ver o mesmo gráfico
        doFx({ kind: 'cine', act: 'chart', key: extra.key, pts: extra.pts, crew: extra.crew ?? null })
        return 'ok'
      }
      if (act === 'mood') {
        // nota ao vivo: não gasta nada e não entra no limite das brincadeiras (o overlay já manda devagar)
        doFx({ kind: 'cine', act: 'mood', v: Math.max(-2, Math.min(2, Math.round(Number(extra.v) || 0))) })
        return 'ok'
      }
      if (!['popcorn', 'poke', 'shh', 'wave', 'screen'].includes(act)) return 'no'
      if (Date.now() - lastCine < (act === 'screen' ? 1000 : 700)) return 'wait'
      if (act === 'popcorn' || act === 'screen') {
        if (!(me.hold?.popcorn > 0)) return 'empty'
        me.hold = { ...me.hold, popcorn: me.hold.popcorn - 1 }
        doFx({ kind: 'hold', hold: me.hold })
        st.cineThrown += 1
      }
      lastCine = Date.now()
      // pipoca na tela: o ponto onde bate é sorteado aqui e vai igual para todo mundo
      const spot = act === 'screen' ? { x: 0.15 + Math.random() * 0.7, y: 0.12 + Math.random() * 0.5 } : {}
      doFx({ kind: 'cine', act, to, ...spot })
      return 'ok'
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

    const current = () => channel
    const bind = (channel) => {
      channel.on('presence', { event: 'sync' }, () => {
        if (channel !== current()) return // canal antigo fechando: não apaga ninguém
        const state = channel.presenceState()
        const ids = Object.keys(state)
        ids.forEach((id) => {
          if (id === user.id) return
          const meta = state[id][state[id].length - 1]
          const isNew = !players.has(id)
          const p = upsert(id, meta)
          if (isNew && meta.items) {
            const mine = st.items.yt
            Object.assign(st.items, meta.items) // quem chega vê TV/luzes (e o vídeo do telão) como estão
            const theirs = meta.items.yt
            if (theirs?.type === 'yt' && mine?.type === 'yt' && mine.id === theirs.id) {
              st.items.yt = mine // já está tocando o mesmo vídeo aqui: mantém o ponto daqui
            } else if (theirs !== undefined) {
              // o horário da presença vem no relógio do outro aparelho: usa por enquanto e pergunta o ponto certo
              st.items.yt = theirs?.type === 'yt' ? { ...theirs, synced: false } : theirs
              setYtVideo(st.items.yt ?? null)
              if (theirs?.type === 'yt') share('ytask', {})
            }
          }
          const metaKey = [meta.x, meta.y, meta.pose ?? '', meta.px ?? '', meta.py ?? ''].join(',')
          if (!isNew && p.metaKey === metaKey) return // nada mudou: não puxa a pessoa de volta para um lugar antigo
          p.metaKey = metaKey
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
      // alguém chegou e quer saber em que ponto está o vídeo do telão
      channel.on('broadcast', { event: 'ytask' }, () => {
        const yt = st.items.yt
        if (yt?.type === 'yt') share('ytsync', { vid: yt.id, start: yt.at, elapsed: Date.now() - yt.at })
      })
      channel.on('broadcast', { event: 'ytsync' }, ({ payload }) => {
        const yt = st.items.yt
        if (yt?.type !== 'yt' || yt.id !== payload.vid || yt.synced) return
        const fixed = { ...yt, at: Date.now() - Math.max(0, payload.elapsed), synced: true }
        st.items.yt = fixed
        setYtVideo(fixed)
      })
      // o dono salvou uma arrumação nova: quem está visitando vê na hora
      channel.on('broadcast', { event: 'layout' }, () => {
        if (!owner) return
        loadLayout().then((layout) => {
          if (!alive) return
          st.savedLayout = layout ?? emptyLayout()
          applyScene(makeScene(roomKey, membersRef.current, user.id, st.savedLayout))
        })
      })
    }

    // ---------- conexão: abre, e se o canal cair (rede, celular dormindo, sessão renovada) abre de novo
    let joinedAt = 0
    let lostAt = performance.now()
    let reconnectTimer = 0
    const connect = async () => {
      const ch = await openChannel(topicName, { config: { presence: { key: user.id }, broadcast: { self: false } } })
      if (!alive) {
        releaseChannel(ch)
        return
      }
      channel = ch
      joined = false
      bind(ch)
      ch.subscribe((status) => {
        if (ch !== channel || !alive) return
        if (status === 'SUBSCRIBED') {
          joined = true
          joinedAt = performance.now()
          st.track(true)
        } else {
          if (joined) lostAt = performance.now()
          joined = false
          // fechado pelo servidor não volta sozinho: reabre
          if (status === 'CLOSED' || status === 'TIMED_OUT') reconnect(1500)
        }
      })
    }
    const reconnect = (delay = 0) => {
      if (!alive || reconnectTimer) return
      reconnectTimer = setTimeout(async () => {
        reconnectTimer = 0
        if (!alive) return
        const old = channel
        channel = null
        joined = false
        lostAt = performance.now()
        if (old) await releaseChannel(old)
        if (alive) connect()
      }, delay)
    }
    connect()
    // vigia: sem conexão há mais de 12 s, refaz o canal; conectado, republica a presença de vez em quando
    const watchdog = setInterval(() => {
      if (!alive) return
      if (!joined && channel && performance.now() - lostAt > 12000) reconnect()
      else if (joined && performance.now() - joinedAt > 60000) {
        joinedAt = performance.now()
        st.track()
      }
    }, 5000)
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || !alive) return
      if (!joined) reconnect()
      else st.track()
    }
    document.addEventListener('visibilitychange', onVisible)
    st.shareLayout = () => share('layout', {})
    // DJ: coloca (ou tira) um vídeo do YouTube no telão para todo mundo da sala
    st.setYouTube = (on) => {
      doFx({ kind: 'item', item: 'yt', on })
      st.track(true)
    }
    let typingSent = { v: false, at: 0 }
    st.say = (text) => {
      doFx({ kind: 'bubble', text, long: true })
      typingSent = { v: false, at: 0 }
    }
    // avisa quem está no ambiente que você está escrevendo no chat (só manda quando muda ou a cada 3 s)
    st.setTyping = (v) => {
      const now = Date.now()
      if (v === typingSent.v && (!v || now - typingSent.at < 3000)) return
      typingSent = { v, at: now }
      doFx({ kind: 'typing', v })
    }
    st.petPet = (item) => {
      doFx({ kind: 'pet', item: item.id, text: pick(item.says ?? PETS[item.pet.kind]?.says ?? ['💕']) })
      playNotes([880, 660], { gap: 0.12, volume: 0.05 })
    }

    // ---------- desenho
    const { headTop, drawFrame } = createRoomRenderer({ st, isOn, players, me, act, fx, canvasRef, decoRef, applyScene, membersRef, user, onlineRef })
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
    raf = requestAnimationFrame(frame)
    // a placa de vídeo pode "perder" o desenho (ex.: ao entrar/sair da tela cheia): refaz o fundo quando voltar
    const canvasEl = canvasRef.current
    const restore = () => st.scene && applyScene(st.scene)
    canvasEl?.addEventListener('contextrestored', restore)

    return () => {
      canvasEl?.removeEventListener('contextrestored', restore)
      alive = false
      cancelAnimationFrame(raf)
      clearInterval(watchdog)
      clearTimeout(reconnectTimer)
      clearTimeout(trackTimer)
      document.removeEventListener('visibilitychange', onVisible)
      if (channel) releaseChannel(channel)
      channel = null
      joined = false
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
    if (roomKey === 'corredor') applyScene(makeScene('corredor', members, user.id))
    else if (roomOwner(roomKey) && !decoRef.current) applyScene(makeScene(roomKey, members, user.id, stateRef.current.savedLayout))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, roomKey])

  // modo decorar: cada mudança no rascunho redesenha o quarto na hora
  useEffect(() => {
    if (!deco || !canDecorate) return
    applyScene(sceneFromLayout(deco.draft, { hide: deco.dragging ?? -1 }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deco?.draft, deco?.dragging])

  // o perfil chega depois do primeiro desenho: atualiza nome, foto e avatar do seu boneco
  useEffect(() => {
    const st = stateRef.current
    if (!st.me) return
    st.me.name = meName
    st.me.avatarUrl = meAvatar
    st.me.look = normalizeAvatar(meLook, user?.id)
    st.me.pet = mePet
    if (mePet) petImage(mePet)
    makeHead(st.me)
    st.track?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meName, meAvatar, meLook, mePet])

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

  const { startDecor, handlePointer, handleDown, handleUp, handleMove, handleKey, toolbarSpot, decoAction, commit, undo, redo, saveDecor, cancelDecor } = useRoomControls({ stateRef, canvasRef, decoRef, selectPerson: (id) => selectPerson(id), setDeco, deco, stageRef, setPanel, fullscreen, toggleFullscreen, applyScene, sceneFromLayout, setSaving, setError, user, setRoomEmpty })
  // balão de fala e emotes: aparecem para todo mundo no mesmo ambiente (nada fica salvo)
  // ENTER em qualquer lugar da sala abre o chat para digitar (como nos jogos); ENTER vazio ou ESC volta a andar
  const chatInputRef = useRef(null)
  const hasKeyboard = typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: fine)').matches
  useEffect(() => {
    if (deco) return undefined
    const onEnter = (event) => {
      if (event.key !== 'Enter' || event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return
      if (event.target.closest?.('input, textarea, select, button, a, [contenteditable="true"], [role="dialog"]')) return
      if (document.querySelector('[aria-modal="true"]')) return // alguma janela aberta (perfil, Pokédex...)
      const input = chatInputRef.current
      if (!input || !input.offsetParent) return
      event.preventDefault()
      input.focus()
    }
    window.addEventListener('keydown', onEnter)
    return () => window.removeEventListener('keydown', onEnter)
  }, [deco])
  // ESC fecha o pop-up aberto da sala (TV, DJ, móveis), quando não está digitando
  useEffect(() => {
    if (!panel) return undefined
    const onEsc = (event) => {
      if (event.key !== 'Escape' || event.target.closest?.('input, textarea, select')) return
      if (document.querySelector('[aria-modal="true"]')) return
      setPanel(null)
    }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [panel])
  const leaveChat = () => {
    chatInputRef.current?.blur()
    canvasRef.current?.focus({ preventScroll: true })
  }

  const { cinemaPeople, seated, standUpFromCinema, cineApi } = useRoomCinema({ stateRef, roomKey })
  // "digitando...": enquanto a caixa do chat está em foco e tem texto, aparece um balãozinho na sua cabeça
  const [chatFocus, setChatFocus] = useState(false)
  const typingNow = chatFocus && !!message.trim()
  useEffect(() => {
    stateRef.current.setTyping?.(typingNow)
    if (!typingNow) return undefined
    const timer = setInterval(() => stateRef.current.setTyping?.(true), 3000) // renova enquanto escreve
    return () => clearInterval(timer)
  }, [typingNow])
  useEffect(() => () => stateRef.current.setTyping?.(false), [])

  const speak = (text) => {
    const clean = text.trim().slice(0, 80)
    if (!clean || Date.now() - lastSaid.current < 1200) return false
    lastSaid.current = Date.now()
    stateRef.current.say?.(clean)
    setMessage('')
    return true
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
    stateRef.current.prevRoom = key.startsWith('quarto:') || key === CINEMA_KEY ? 'corredor' : null // chega pela porta
    setDeco(null)
    setRoomKey(key)
  }

  return (
    <div className="room" ref={wrapRef}>
      <div className="room-frame">
        <RoomBar sceneName={sceneName} isAdmin={isAdmin} roomKey={roomKey} hallPreview={hallPreview} setHallPreview={setHallPreview} applyScene={applyScene} membersRef={membersRef} user={user} goRoom={goRoom} inMyRoom={inMyRoom} myRoom={myRoom} canDecorate={canDecorate} deco={deco} startDecor={startDecor} toggleFullscreen={toggleFullscreen} fullscreen={fullscreen} meLook={meLook} setEditingAvatar={setEditingAvatar} count={count} />
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
            {(roomKey === 'turma' || roomKey === CINEMA_KEY) && ytVideo && tvRect && (
              <YouTubeScreen
                video={ytVideo}
                rect={tvRect}
                onStop={() => stateRef.current.setYouTube?.(null)}
                onControl={(next) => stateRef.current.setYouTube?.(next)}
                audience={roomKey === CINEMA_KEY ? cinemaPeople : null}
                cinema={seated}
                onCinemaClose={standUpFromCinema}
                onReact={speak}
                onChat={speak}
                cine={cineApi}
              />
            )}
            </div>
          </div>
          {(() => {
            const spot = toolbarSpot()
            if (!spot) return null
            return (
              <div className="decor-toolbar" style={{ left: spot.left, top: spot.top }} role="toolbar" aria-label={spot.item.label}>
                <span className="decor-toolbar-name">{spot.item.label}</span>
                {deco.note && <span className="decor-toolbar-note">{deco.note}</span>}
                <button type="button" onClick={() => decoAction('move')} title="Mover (ou arraste)">
                  ✥ Mover
                </button>
                {nextVariant(spot.item.key) && (
                  <button type="button" onClick={() => decoAction('color')} title="Trocar a cor">
                    🎨 Cor
                  </button>
                )}
                {rotated(spot.item.key) && (
                  <button type="button" onClick={() => decoAction('rotate')} title="Girar (tecla R)">
                    ⟳ Girar
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
            <RoomPanel panel={panel} setPanel={setPanel} djTab={djTab} setDjTab={setDjTab} live={live} djLink={djLink} setDjError={setDjError} stateRef={stateRef} meName={meName} setDjLink={setDjLink} djError={djError} ytVideo={ytVideo} navRef={navRef} user={user} />
          )}
        </div>
        {!deco && (
          <RoomChat speak={speak} message={message} leaveChat={leaveChat} chatInputRef={chatInputRef} hasKeyboard={hasKeyboard} setMessage={setMessage} setChatFocus={setChatFocus} />
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
