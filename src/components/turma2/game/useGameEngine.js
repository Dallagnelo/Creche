import { useEffect } from 'react'
import { T, REACH, DIRV, TOOL_KEYS, KEYS, findPath, loadImage, free, ghostGone, ACT_ORDER, dirOf, RUN, SPEED } from './gameHelpers'
import { TOOL_ANIMS, loadToolAnims, FISH, useTime } from '../../../lib/turma2/toolAnim'
import { composeChar } from '../../../lib/turma2/character'
import DATA from '../../../lib/turma2Rooms.json'
import { gameTime, skyLight } from '../../../lib/turma2/clock'
import { loadBichos, atlasUrl, loadLibrary, animAtlasUrl } from '../../../lib/turma2/assets'
import { isTaken } from '../../../lib/turma2/save'
import { HUD } from '../Turma2Hud'
import { FIX_AGAIN_MS, GHOST_BACK_MS, BENS, friendOf, countOf, animalState, productOf, sprinklerSince, growth, wetToday, grownDays, cropDays, fruitReady } from '../../../lib/turma2/economy'
import { loadAutotiles, FENCES } from '../../../lib/turma2/autotile'
import { makeCine } from '../../../lib/turma2/cine'
import { emoteById, cleanChat, EMOTES_URL } from '../../../lib/turma2/social'
import { joinMapLive } from '../../../services/turma2Live'
import { bonus } from '../../../lib/turma2/skills'
import { perk } from '../../../lib/turma2/rpg'
import { drawFrame } from './drawFrame'

// O "motor" do jogo: monta o mapa, lê teclado/toque, move gente e bichos, fala com os outros jogadores
// e chama o desenho a cada quadro. Roda de novo sempre que o mapa (room) muda.
export function useGameEngine({ room, setReady, setMissing, canvasRef, boxRef, arriveRef, useItemRef, saveRef, heroRef, charRef, worldRef, hudRef, libRef, skillsRef, fxRef, liveMeRef, setYtVideo, setSeated, cineRef, setTelaoOpen, socialRef, jobRef, setCode, gridRef }) {
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
    const view = { zoom: 3, ox: 0, oy: 0, cx: null, cy: null }
    let run = false // Shift: correr
    const hover = { x: 0, y: 0, at: 0 } // quadradinho embaixo do mouse (e quando mexeu)

    const resize = () => {
      const rect = box.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.round(rect.width * dpr)
      canvas.height = Math.round(rect.height * dpr)
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      // zoom inteiro (pixel art sem borrar) e fixo (o jogador não muda): no computador uns 30 quadradinhos
      // de largura, tanto em tela cheia (1920x1080: 30 x 17) quanto dentro da página (uns 31 x 14);
      // no celular uns 20 de largura
      const wide = rect.width >= 700
      const base = (cols, rows) => Math.max(1, Math.floor(Math.min(canvas.width / (cols * T), canvas.height / (rows * T))))
      // dentro de casa vale o mesmo zoom de lá fora (antes era quase o dobro e o boneco ficava enorme e borrado);
      // as salas são grandes (36 x 22) para ainda encherem a tela
      const auto = wide ? base(30, 13) : base(20, 11)
      // mapa grande: nunca afasta a ponto de aparecer o fundo em volta (a faixa escura do lado);
      // casa pequena, que não enche a tela nem bem perto, continua no meio
      const cover = Math.ceil(Math.max(canvas.width / room.w, canvas.height / room.h))
      // (só lá fora: dentro de casa a sala inteira aparece, com o escuro em volta)
      view.min = cover <= (room.outdoor ? 8 : 12) ? cover : 1
      view.zoom = Math.max(view.min, Math.min(8, auto))
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
    const onKey = (event) => {
      const tg = event.target?.tagName
      if (tg === 'INPUT' || tg === 'TEXTAREA' || tg === 'SELECT') return // digitando no chat
      run = event.shiftKey
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
      // cinema: em cima de uma poltrona (sentar / levantar)
      if (cine) {
        if (cine.st.sit) return { key: 'levantar', tipo: 'levantar', label: 'Levantar da poltrona' }
        const seat = (room.acts ?? []).find((a) => a.tipo === 'poltrona' && a.cells.some(([x, y]) => x === me.x && y === me.y))
        if (seat) {
          const taken = [...peers.values()].some((p) => p.sit && p.px !== null && Math.floor(p.px / T) === me.x && Math.floor((p.py - 1) / T) === me.y)
          return taken ? { key: 'poltrona:x', tipo: 'poltrona', off: true, label: 'Poltrona ocupada' } : { key: `poltrona:${seat.id}`, tipo: 'poltrona', id: seat.id, label: 'Sentar na poltrona' }
        }
      }
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
        if (a.tipo === 'telao' && cine) return { key: `telao:${a.id}`, tipo: 'telao', id: a.id, label: 'Cabine do telão (escolher o vídeo)' }
        if (a.tipo === 'pipoca' && cine) return { key: `pipoca:${a.id}`, tipo: 'pipoca', id: a.id, label: 'Pegar um balde de pipoca' }
        if (a.tipo === 'refri' && cine) return { key: `refri:${a.id}`, tipo: 'refri', id: a.id, label: 'Pegar um refri' }
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
    let signsAtlas = null // placas das plantações (aparecem em cima da planta que você está olhando)
    loadImage(atlasUrl('pecas', 'fazenda_plantacoes')).then((img) => (signsAtlas = img)).catch(() => {})
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
    let askedAt = -Infinity
    let cine = null
    if (room.telao && liveMeRef.current) {
      const out = { send: () => {}, track: () => {} }
      cine = makeCine({
        meId: liveMeRef.current.id,
        peers,
        send: (ev) => out.send(ev),
        track: (m) => out.track(m),
        onYt: (v) => setYtVideo(v),
        onSit: (v) => setSeated(v),
      })
      cine.bind = (o) => Object.assign(out, o)
      cine.peers = peers
    }
    cineRef.current = cine
    setYtVideo(null)
    setSeated(false)
    setTelaoOpen(false)
    const peerImg = (p) => {
      const c = p.char
      ;(c ? composeChar(c) : loadImage(DATA.character)).then((img) => (p.img = img)).catch(() => {})
    }
    const onPeers = (list) => {
      const ids = new Set(list.map((p) => p.id))
      for (const id of [...peers.keys()]) if (!ids.has(id)) peers.delete(id)
      // cinema: chegou e alguém já está com o telão ligado: pergunta em que ponto está o vídeo
      if (cine && !cine.st.yt && list.some((p) => p.yt) && performance.now() - askedAt > 4000) {
        askedAt = performance.now()
        cine.ask()
      }
      for (const p of list) {
        const cur0 = peers.get(p.id)
        if (cur0) Object.assign(cur0, { sit: !!p.sit, hold: p.hold ?? null, away: !!p.away, awayAt: p.awayAt || 0, phone: !!p.phone, nap: !!p.nap })
        const cur = cur0
        if (!cur) {
          const np = { id: p.id, nome: p.nome ?? 'Alguém', char: p.char ?? null, img: null, px: null, py: null, tx: 0, ty: 0, dir: 'down', mv: 0, anim: 0, sit: !!p.sit, hold: p.hold ?? null, away: !!p.away, awayAt: p.awayAt || 0, phone: !!p.phone, nap: !!p.nap }
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
      if (ev.k === 'fx') cine?.apply(id, ev.p, { sync: !!ev.sync })
      if (ev.k === 'ytask') cine?.answer()
      if (ev.k === 'acao' && (BENS[ev.item] || TOOL_ANIMS[ev.item])) {
        p.swing = ev.recolhe ? (FISH.recolhe[1] - FISH.recolhe[0]) / TOOL_ANIMS.vara.fps : useTime(ev.item) || TOOL_TIME
        p.tool = ev.item
        p.useT = 0
        p.reel = !!ev.recolhe
      }
    }
    const live = liveMeRef.current ? joinMapLive(room.code, liveMeRef.current, { onPeers, onPos, onEvent }) : null
    if (cine) {
      cine.bind({ send: (ev) => live?.event(ev), track: (m) => live?.track(m) })
      cine.st.me = me
    }
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
      if (cine?.st.sit && (me.moving || me.path.length)) cine.stand() // andou: levantou da poltrona
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
      if (room.telao) {
        // onde a tela do cinema está agora (em % do palco do jogo): o vídeo acompanha a câmera
        const [sx, sy, sw, sh] = room.telao
        const pct = (v, total) => `${((v / total) * 100).toFixed(3)}%`
        box.style.setProperty('--t2-sx', pct(view.ox + sx * view.zoom, canvas.width))
        box.style.setProperty('--t2-sy', pct(view.oy + sy * view.zoom, canvas.height))
        box.style.setProperty('--t2-sw', pct(sw * view.zoom, canvas.width))
        box.style.setProperty('--t2-sh', pct(sh * view.zoom, canvas.height))
      }

      drawFrame({ ctx, canvas, heroRef, floor, objs, z, view, now, room, cine, sea, waters, clock, saveRef, tiles, hortaSet, me, cars, dt, boats, isNight, ghostAway, patrols, npcs, peers, items, gateAnim, gatePairs, gateOpen, fenceImg, atl, sheets, coin, libRef, sprinklerImg, cropsAtlas, skillsRef, cropImg, TOOL_TIME, drawTool, swing, jobRef, fishT, swingTool, useT, reel, heldTool, walking, charRef, light, shade, signsAtlas, target, effects, broken, shopIcon, drawBubble, fade, gridRef })
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
      live?.close()
      if (cineRef.current === cine) cineRef.current = null
    }
  }, [room])
}
