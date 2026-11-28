import { TILE, itemRect, WALL_ROWS, WALL_TOP } from '../../lib/room'
import { avatarSprite } from '../../lib/avatar'
import { HEAD, spriteOf, drawTvScreen, drawArcadeScreen, drawPcScreen, drawFishScreen, drawFireScreen, drawXmasLights, drawJukeboxScreen, drawLavaScreen, drawFanScreen, drawFairyLights, drawClawScreen, drawDanceScreen, drawPopcornScreen, drawEqScreen, drawDiscoScreen, drawPondScreen, drawConveyorScreen, drawTeleportScreen, drawHologramScreen, drawPendulumScreen, drawRaceScreen, drawBalloonScreen, drawBubbleScreen, drawRobotScreen, drawFountainScreen, drawItem, drawClockHands, pick, drawNightWindow, roundRect } from '../../lib/roomDraw'
import { petImage, followStep } from '../../lib/pokePet'
import { DJ_LOOK } from '../../lib/roomSprites4'
import { brasiliaToday } from '../../lib/rooms'
import { petSpot, PETS, petSprite } from '../../lib/roomPets'
import { buildItem, catalogEntry } from '../../lib/roomCatalog'
import { getPreviewDay, isSleep, seatAt, Y_OFF, SPEED, isNightNow, makeScene, seatOver, isCinemaSeatItem, isLightColor } from './roomHelpers'

// Desenho da sala (personagens, móveis, telão, efeitos). Chamado a cada quadro pelo RoomScene.
export function createRoomRenderer({ st, isOn, players, me, act, fx, canvasRef, decoRef, applyScene, membersRef, user, onlineRef }) {
  let last = performance.now()
  const drawPlayer = (ctx, p) => {
    const px = Math.round(p.x * TILE)
    const py = Math.round(p.y * TILE)
    const usePhoto = p.look.photo && p.avatarUrl && p.head
    const look = usePhoto ? { ...p.look, hair: 'careca', hat: 'nenhum', face: 'nenhum', beard: 'nenhuma' } : p.look
    // pisca de vez em quando (cada pessoa num ritmo)
    const blink = !p.path.length && (Math.floor(st.time * 10) + (p.id.charCodeAt(0) % 30)) % 38 === 0
    if (isSleep(p.pose)) {
      const sprite = avatarSprite(look, { dir: p.pose === 'sleepu' ? 'up' : 'down', withFace: !usePhoto })
      const head = (hx, hy) => {
        ctx.drawImage(sprite, 0, 0, 16, 14, hx, hy, 16, 14)
        if (usePhoto && p.pose !== 'sleepu') ctx.drawImage(p.head, hx + 2, hy + 2, HEAD, HEAD)
      }
      // largura do cobertor: a da cama (camas de solteiro são mais estreitas)
      const bwide = seatAt(st.scene, p)?.bw ?? 28
      const blanket = (bx, by, bw, bh, foldX) => {
        ctx.fillStyle = '#4d7fc6'
        ctx.fillRect(bx, by, bw, bh)
        ctx.fillStyle = '#f6f1e6'
        if (foldX === undefined) ctx.fillRect(bx, p.pose === 'sleepu' ? by + bh - 3 : by, bw, 3)
        else ctx.fillRect(foldX, by, 3, bh)
      }
      if (p.pose === 'sleepu') {
        // cabeça embaixo (cama girada 180°)
        blanket(px + 8 - bwide / 2, py - 10, bwide, 12)
        head(px, py)
      } else if (p.pose === 'sleepl') {
        // deitado de lado, cabeça à esquerda
        head(px, py - 7)
        blanket(px + 11, py - 6, 20, 12, px + 11)
      } else if (p.pose === 'sleepr') {
        head(px, py - 7)
        blanket(px - 15, py - 6, 20, 12, px + 2)
      } else {
        head(px, py - 7)
        blanket(px + 8 - bwide / 2, py + 6, bwide, 12)
      }
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
  // Pokémon que segue a pessoa: pulinho ao andar, respira parado, vira para o lado que anda
  const drawPokePet = (ctx, p) => {
    const art = petImage(p.pet)
    if (!art) return
    const hop = p.petMoving ? Math.round(Math.abs(Math.sin(st.time * 11)) * 2) : 0
    const bob = !p.petMoving && Math.floor(st.time * 1.6 + p.id.charCodeAt(0)) % 2 === 0 ? 1 : 0 // parado, dá pulinhos
    const footX = Math.round(p.petX * TILE + 8)
    const footY = Math.round(p.petY * TILE + TILE - 1)
    ctx.fillStyle = 'rgba(20,10,4,0.28)'
    ctx.beginPath()
    ctx.ellipse(footX, footY, Math.max(4, art.w / 3), 2, 0, 0, Math.PI * 2)
    ctx.fill()
    const x = Math.round(footX - art.w / 2)
    const y = footY - art.h - hop - bob
    if (p.petFlip) {
      ctx.save()
      ctx.translate(x + art.w, y)
      ctx.scale(-1, 1)
      ctx.drawImage(art.canvas, 0, 0)
      ctx.restore()
    } else ctx.drawImage(art.canvas, x, y)
  }
  const headTop = (p) => {
    if (isSleep(p.pose)) return p.y * TILE - 8
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
  // contorno de destaque: no telão, só a moldura da TV (sem as cortinas e o espaço em volta)
  const hoverRect = (item) => {
    const sc = item.screen
    if (sc?.kind === 'teletv') return { x: sc.x - 3, y: sc.y - 3, w: sc.w + 6, h: sc.h + 7 }
    return itemRect(item, spriteOf(item))
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

    // Pokémon de estimação seguindo cada pessoa
    players.forEach((p) => {
      if (p.pet) followStep(p, dt)
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
      if (isSleep(p.pose) && Math.random() < dt * 0.9) fx('zzz', p.x * TILE + 12, p.y * TILE - 4, 'z')
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
        if (scene.key === 'turma' && getPreviewDay() === null && scene.day !== brasiliaToday().weekday) {
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
          depth: isSleep(p.pose) ? (p.y + 2) * TILE : seatOver(scene, p) ?? p.y * TILE + TILE + 0.5,
          draw: () => drawPlayer(ctx, p),
        })),
        ...(decorating
          ? []
          : Array.from(players.values())
              .filter((p) => p.pet && petImage(p.pet) && Number.isFinite(p.petX))
              .map((p) => ({
                depth: p.petY * TILE + TILE + 0.25,
                draw: () => drawPokePet(ctx, p),
              }))),
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
        const r = hoverRect(outlined)
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

      // cinema com vídeo no telão: as luzes da sala apagam (o telão continua aceso)
      if (st.items.yt && scene.furniture.some(isCinemaSeatItem)) {
        const tv = scene.furniture.find((item) => item.screen?.kind === 'teletv')?.screen
        ctx.save()
        ctx.beginPath()
        ctx.rect(0, -WALL_TOP, W, H + WALL_TOP)
        if (tv) ctx.rect(tv.x, tv.y, tv.w, tv.h)
        ctx.fillStyle = 'rgba(4,4,14,0.55)'
        ctx.fill('evenodd')
        if (tv) {
          // luz do telão batendo na plateia
          const glow = ctx.createRadialGradient(tv.x + tv.w / 2, tv.y + tv.h, 4, tv.x + tv.w / 2, tv.y + tv.h, H * 0.55)
          glow.addColorStop(0, 'rgba(170,200,255,0.16)')
          glow.addColorStop(1, 'rgba(170,200,255,0)')
          ctx.fillStyle = glow
          ctx.fillRect(0, tv.y + tv.h, W, H)
        }
        ctx.restore()
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

      // nome logo acima da cabeça (letra menor) e balões de fala saindo para o lado, para ocupar pouco espaço
      const nameSize = Math.max(10, Math.round(size * 0.8))
      const nameFont = `700 ${nameSize}px system-ui, -apple-system, Segoe UI, sans-serif`
      const bubbleSize = Math.max(9, Math.round(size * 0.68)) // balão pequeno, para não tampar a sala
      const bubbleFont = `700 ${bubbleSize}px system-ui, -apple-system, Segoe UI, sans-serif`
      // balão saindo da boca: fica ao lado do rosto (direita; se não couber, esquerda), um pouco acima,
      // e a pontinha desce até a boca do personagem
      const sideBubble = (p, w, h) => {
        const cx = (p.x * TILE + 8) * s
        const mouthY = (headTop(p) + 12) * s
        const midY = mouthY - h * 0.45
        const gap = 6.5 * s
        const right = cx + gap + w <= ctx.canvas.width - 4 || cx - gap - w < 4
        const x = right ? cx + gap : cx - gap - w
        const tipX = right ? cx + 3.5 * s : cx - 3.5 * s
        const baseX = right ? x + 3 : x + w - 3 // onde a pontinha sai do balão (perto do canto de baixo)
        const baseY = midY + h / 2 - 1
        const tail = () => {
          ctx.beginPath()
          ctx.moveTo(baseX, baseY - h * 0.45)
          ctx.lineTo(tipX, mouthY)
          ctx.lineTo(right ? baseX + h * 0.5 : baseX - h * 0.5, baseY)
        }
        ctx.fillStyle = '#fff'
        ctx.strokeStyle = '#0c1626'
        ctx.lineWidth = 1.5
        tail()
        ctx.closePath()
        ctx.fill()
        tail()
        ctx.stroke()
        roundRect(ctx, x, midY - h / 2, w, h, Math.min(5, h / 2))
        ctx.fill()
        ctx.stroke()
        // apaga a borda do balão onde a pontinha encosta (balão e ponta viram uma peça só)
        tail()
        ctx.closePath()
        ctx.fill()
        return { x, midY }
      }
      players.forEach((p) => {
        const cx = (p.x * TILE + 8) * s
        ctx.font = nameFont
        const w = ctx.measureText(p.name).width + nameSize * 1
        const h = nameSize * 1.4
        const cy = headTop(p) * s - h / 2 - 1
        roundRect(ctx, cx - w / 2, cy - h / 2, w, h, h / 2)
        ctx.fillStyle = p === me ? 'rgba(94,234,212,0.95)' : 'rgba(12,18,32,0.82)'
        ctx.fill()
        ctx.fillStyle = p === me ? '#0c1626' : '#fff'
        ctx.fillText(p.name, cx, cy + 1)
        ctx.font = bubbleFont
        if (p.bubble && p.bubble.until > st.time) {
          const bw = ctx.measureText(p.bubble.text).width + bubbleSize * 0.9
          const { x, midY } = sideBubble(p, bw, bubbleSize * 1.55)
          ctx.fillStyle = '#0c1626'
          ctx.fillText(p.bubble.text, x + bw / 2, midY + 1)
        } else if (p.typing > st.time) {
          // três pontinhos pulando: está escrevendo no chat
          const bw = bubbleSize * 2.7
          const { x, midY } = sideBubble(p, bw, bubbleSize * 1.4)
          ctx.fillStyle = '#0c1626'
          for (let i = 0; i < 3; i += 1) {
            const hop = Math.max(0, Math.sin(st.time * 7 - i * 0.9)) * bubbleSize * 0.22
            ctx.beginPath()
            ctx.arc(x + bw / 2 + (i - 1) * bubbleSize * 0.7, midY - hop, bubbleSize * 0.18, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      })
      ctx.font = `700 ${size}px system-ui, -apple-system, Segoe UI, sans-serif`

      if (!decorating && st.hoverItem?.label && st.hoverItem.act !== 'door' && !st.hoverItem.plate) {
        const r = hoverRect(st.hoverItem)
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
  return { headTop, drawFrame }
}
