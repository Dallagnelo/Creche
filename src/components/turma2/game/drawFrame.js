import { sprinklerSince, wetToday, fruitReady, growth, CROPS, BENS } from '../../../lib/turma2/economy'
import { drawTilled } from '../../../lib/turma2/autotile'
import { TOOL_ANIMS, drawWithTool, skinOf } from '../../../lib/turma2/toolAnim'
import { drawChar } from '../../../lib/turma2/character'
import { weaponGlow } from '../../../lib/turma2/rpg'
import { T, DIRS, n7pose } from './gameHelpers'

// Desenha um quadro do mapa (chão, peças, gente, bichos, noite, efeitos). Recebe tudo o que precisa a cada quadro.
export function drawFrame({ ctx, canvas, heroRef, floor, objs, z, view, now, room, cine, sea, waters, clock, saveRef, tiles, hortaSet, me, cars, dt, boats, isNight, ghostAway, patrols, npcs, peers, items, gateAnim, gatePairs, gateOpen, fenceImg, atl, sheets, coin, libRef, sprinklerImg, cropsAtlas, skillsRef, cropImg, TOOL_TIME, drawTool, swing, jobRef, fishT, swingTool, useT, reel, heldTool, walking, charRef, light, shade, signsAtlas, target, effects, broken, shopIcon, drawBubble, fade, gridRef }) {
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
    if (room.telao) {
      // a tela do cinema (o vídeo do YouTube aparece por cima dela): moldura escura e a tela branca quando desligada
      const [sx, sy, sw, sh] = room.telao
      ctx.fillStyle = '#0b0c12'
      ctx.fillRect(sx - 5, sy - 4, sw + 10, sh + 9)
      ctx.fillStyle = '#2a2d3a'
      ctx.fillRect(sx - 3, sy - 2, sw + 6, sh + 5)
      if (cine?.st.yt) {
        ctx.fillStyle = '#000'
        ctx.fillRect(sx, sy, sw, sh)
      } else {
        const g = ctx.createRadialGradient(sx + sw / 2, sy + sh / 2, 4, sx + sw / 2, sy + sh / 2, sw * 0.6)
        g.addColorStop(0, '#f4f2ff')
        g.addColorStop(1, '#bdbccc')
        ctx.fillStyle = g
        ctx.fillRect(sx, sy, sw, sh)
        ctx.fillStyle = 'rgba(40, 40, 60, 0.55)'
        ctx.font = 'bold 9px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('CINE PLANETA', sx + sw / 2, sy + sh / 2 - 2)
        ctx.font = '6px sans-serif'
        ctx.fillText('escolha o filme no projetor lá atrás', sx + sw / 2, sy + sh / 2 + 9)
      }
    }
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
    // cinema com vídeo no telão: as luzes da sala apagam (o telão continua aceso)
    if (room.telao && cine?.st.yt) {
      const [sx, sy, sw, sh] = room.telao
      ctx.fillStyle = 'rgba(4, 4, 12, 0.55)'
      ctx.fillRect(0, 0, room.w, sy - 5)
      ctx.fillRect(0, sy + sh + 5, room.w, room.h - sy - sh - 5)
      ctx.fillRect(0, sy - 5, sx - 5, sh + 10)
      ctx.fillRect(sx + sw + 5, sy - 5, room.w - sx - sw - 5, sh + 10)
    }
    // estação do ano (efeito em código, o pacote não tem neve): no inverno o mundo fica mais frio e neva;
    // no outono caem folhas
    if (room.outdoor && (clock.season === 'Inverno' || clock.season === 'Outono')) {
      const winter = clock.season === 'Inverno'
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      if (winter) {
        ctx.fillStyle = 'rgba(200, 225, 255, 0.18)'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }
      const W = canvas.width
      const H = canvas.height
      const n = winter ? 150 : 26
      const px = Math.max(2, Math.round(z * 1.5))
      for (let i = 0; i < n; i++) {
        const seed = (i * 9301 + 49297) % 233280
        const sp = winter ? 18 + (seed % 23) : 26 + (seed % 17) // velocidade (px por segundo, em pixels do jogo)
        const y = ((seed * 7 + time * sp * z) % (H + 40)) - 20
        const x = ((seed * 13) % W) + Math.sin(time * 0.8 + i) * 10 * z * 0.5
        if (winter) {
          ctx.fillStyle = i % 3 ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.55)'
          ctx.fillRect(Math.round(x), Math.round(y), px, px)
        } else {
          ctx.fillStyle = ['#d9822b', '#c4561f', '#e3b341'][i % 3]
          ctx.fillRect(Math.round(x), Math.round(y), px * 2, px)
        }
      }
      ctx.setTransform(z, 0, 0, z, view.ox, view.oy)
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
    // placa da plantação: em cima da planta da frente (ou a do mouse), diz o que está plantado
    if (signsAtlas && !jobRef.current) {
      const [tx, ty] = target()
      const plot = myPlots[`${tx},${ty}`]
      const crop = plot?.planta && CROPS[plot.planta]
      const r = crop?.placa && libRef.current?.pecas?.fazenda_plantacoes?.[`sign_${crop.placa}`]
      const g = libRef.current?.pecas?.fazenda_crescimento?.[crop?.folha]
      if (r && g) {
        const bob = Math.round(Math.sin(time * 3) * 1)
        ctx.drawImage(signsAtlas, r[0], r[1], r[2], r[3], tx * T + T / 2 - r[2] / 2, (ty + 1) * T - g[3] - 2 - r[3] - 1 + bob, r[2], r[3])
      }
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
}
