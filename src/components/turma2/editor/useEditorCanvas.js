import { loadImage, loadBichos, T, atlasUrl, animAtlasUrl } from '../../../lib/turma2/assets'
import { useRef, useState, useEffect, useMemo } from 'react'
import { composeChar, drawChar } from '../../../lib/turma2/character'
import { waterFrames, walkGrid } from '../../../lib/turma2/compile'
import { trafficSize, lightAt, boxOf, placeAt } from './editorHelpers'

// Desenho do editor: chão, peças, água, personagens, grade, onde dá para andar e a seleção (a cada quadro).
export function useEditorCanvas({ imgs, waterCache, lib, map, showWalk, tool, sel, chosen, libMode, showGrid, sky, snap, terrainId, brush, erase, testing, canvasRef, boxRef, viewRef, floorRef, itemOf, hoverRef, dragRef, meta }) {
  // ---------- desenhar ----------
  const getImg = (url) => {
    const c = imgs.current
    if (!c.has(url)) {
      c.set(url, null)
      loadImage(url).then((img) => c.set(url, img)).catch(() => {})
    }
    return c.get(url)
  }
  const chars = useRef(new Map())
  const [bichos, setBichos] = useState(null)
  const bichosRef = useRef(null)
  bichosRef.current = bichos
  useEffect(() => {
    loadBichos().then(setBichos).catch(() => {})
  }, [])
  const getChar = (c) => {
    const k = JSON.stringify(c)
    const m = chars.current
    if (!m.has(k)) {
      m.set(k, null)
      composeChar(c).then((img) => m.set(k, img)).catch(() => {})
    }
    return m.get(k)
  }
  const getWater = (w) => {
    const k = `${w.w}x${w.h}:${w.kind}`
    const c = waterCache.current
    if (!c.has(k)) {
      c.set(k, null)
      waterFrames(w).then((cv) => c.set(k, cv))
    }
    return c.get(k)
  }

  const walk = useMemo(() => (lib && map && (showWalk || tool === 'block') ? walkGrid(map, lib) : null), [lib, map, showWalk, tool])
  const live = useRef({})
  live.current = { map, lib, tool, sel, chosen, libMode, showGrid, walk, sky, snap, terrainId, brush, erase }

  useEffect(() => {
    // durante o "Testar" o canvas do editor sai da tela; ao voltar é um canvas novo, então recomeça aqui
    if (!map || testing) return undefined
    const canvas = canvasRef.current
    const box = boxRef.current
    const ctx = canvas.getContext('2d')
    const shade = document.createElement('canvas')
    let raf = 0
    const frame = (now) => {
      const L = live.current
      const m = L.map
      const r = box.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      const W = Math.round(r.width * dpr)
      const H = Math.round(r.height * dpr)
      if (canvas.width !== W || canvas.height !== H) {
        canvas.width = W
        canvas.height = H
        canvas.style.width = `${r.width}px`
        canvas.style.height = `${r.height}px`
      }
      const { zoom: z, ox, oy } = viewRef.current
      const time = now / 1000
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, W, H)
      ctx.setTransform(z, 0, 0, z, ox, oy)
      ctx.imageSmoothingEnabled = false
      if (floorRef.current) ctx.drawImage(floorRef.current, 0, 0)
      const wf = Math.floor(time * 5) % 8
      for (const w of m.water) {
        const cv = getWater(w)
        if (cv) ctx.drawImage(cv, 0, wf * w.h * T, w.w * T, w.h * T, w.x * T, w.y * T, w.w * T, w.h * T)
      }
      // coisas de pé, de cima para baixo
      const list = []
      for (const o of m.objects) {
        const rr = L.lib[o.src ?? 'pecas']?.[o.t]?.[o.n]
        // peça "no chão" fica sempre por baixo
        if (rr) list.push([o.chao ? o.y : o.y + rr[3], 0, o, rr])
      }
      for (const a of m.anims) {
        const rr = L.lib.anims[a.n]
        if (rr) list.push([a.y + rr[4], 1, a, rr])
      }
      for (const p of m.patrols) {
        const rr = L.lib.anims[p.r]
        if (rr) list.push([p.y, 2, p, rr])
      }
      for (const n of m.npcs) list.push([(n.y + 1) * T, 3, n, null])
      for (const c of m.traffic ?? []) {
        const [, th] = trafficSize(c, L.lib)
        list.push([c.y + th, 4, c, null])
      }
      list.sort((p, q) => p[0] - q[0])
      for (const [, kind, it, rr] of list) {
        if (kind === 0) {
          const img = getImg(atlasUrl(it.src ?? 'pecas', it.t))
          if (!img) continue
          ctx.globalAlpha = it.porta ? 0.5 : 1
          if (it.f) {
            ctx.save()
            ctx.translate(it.x + rr[2], it.y)
            ctx.scale(-1, 1)
            ctx.drawImage(img, rr[0], rr[1], rr[2], rr[3], 0, 0, rr[2], rr[3])
            ctx.restore()
          } else ctx.drawImage(img, rr[0], rr[1], rr[2], rr[3], it.x, it.y, rr[2], rr[3])
          ctx.globalAlpha = 1
        } else if (kind === 4) {
          // trânsito: o carro (ou barco) parado onde começa e a faixa por onde ele passa
          const [tw, th] = trafficSize(it, L.lib)
          const foot = it.y + th
          if (it.a) {
            const ra = L.lib.anims[it.a]
            const img = ra && getImg(animAtlasUrl(ra[0]))
            if (img) ctx.drawImage(img, ra[1] + (Math.floor(time * 8) % (it.fr ?? ra[5])) * tw, ra[2], tw, th, it.x, it.y, tw, th)
          } else {
            const rp = L.lib[it.src ?? 'pecas']?.[it.t]?.[it.n]
            const img = rp && getImg(atlasUrl(it.src ?? 'pecas', it.t))
            if (img) ctx.drawImage(img, rp[0], rp[1], rp[2], rp[3], it.x, it.y, rp[2], rp[3])
          }
          ctx.strokeStyle = 'rgba(255,209,102,0.55)'
          ctx.lineWidth = 1 / z
          ctx.setLineDash([6 / z, 4 / z])
          ctx.beginPath()
          ctx.moveTo(0, foot - 1)
          ctx.lineTo(m.w * T, foot - 1)
          ctx.stroke()
          ctx.setLineDash([])
          ctx.font = '8px sans-serif'
          ctx.textAlign = 'center'
          ctx.fillStyle = '#ffd166'
          ctx.fillText((it.speed ?? 60) < 0 ? '◀◀' : '▶▶', it.x + tw / 2, it.y - 2)
        } else if (kind === 1) {
          const img = getImg(animAtlasUrl(rr[0]))
          if (!img) continue
          const fw = it.fw ?? rr[3]
          const frames = it.fr ?? rr[5]
          const f = Math.floor(time * (it.fps ?? 8)) % frames
          const night = L.sky === 'noite'
          ctx.globalAlpha = (it.w === 'n' && !night) || (it.w === 'd' && night) ? 0.35 : 1
          ctx.drawImage(img, rr[1] + f * fw, rr[2], fw, rr[4], it.x, it.y, fw, rr[4])
          ctx.globalAlpha = 1
        } else if (kind === 3 && it.bicho) {
          // bicho da fazenda: primeiro quadro de "parado", virado para o lado escolhido
          const b = bichosRef.current?.[it.bicho]
          const img = b && getImg(b.file)
          const col = { right: 0, up: 1, left: 2, down: 3 }[it.dir ?? 'down'] * 6
          if (img) ctx.drawImage(img, col * b.fw, b.fh, b.fw, b.fh, it.x * T + T / 2 - b.fw / 2, (it.y + 1) * T - b.fh + Math.round(b.fh / 8), b.fw, b.fh)
          if (it.modo === 'passeia') {
            const r = it.raio ?? 3
            ctx.strokeStyle = 'rgba(255,209,102,0.6)'
            ctx.lineWidth = 1 / z
            ctx.strokeRect((it.x - r) * T, (it.y - r) * T, (2 * r + 1) * T, (2 * r + 1) * T)
          }
        } else if (kind === 3) {
          const img = getChar(it.c)
          const pose = it.modo === 'senta' ? 'senta' : it.modo === 'celular' ? 'celular' : 'parado'
          if (img) drawChar(ctx, img, pose, pose === 'senta' && it.dir !== 'left' ? 'right' : it.dir ?? 'down', time, it.x * T, it.y * T - T)
          if (it.nome) {
            ctx.font = '6px sans-serif'
            ctx.textAlign = 'center'
            ctx.fillStyle = '#fff'
            ctx.fillText(it.nome, it.x * T + T / 2, it.y * T - T - 2)
          }
          if (it.modo === 'passeia') {
            const r = it.raio ?? 3
            ctx.strokeStyle = 'rgba(255,209,102,0.6)'
            ctx.lineWidth = 1 / z
            ctx.strokeRect((it.x - r) * T, (it.y - r) * T, (2 * r + 1) * T, (2 * r + 1) * T)
          }
        } else {
          const img = getImg(animAtlasUrl(rr[0]))
          if (!img) continue
          const f = Math.floor(time * 8) % rr[5]
          ctx.drawImage(img, rr[1] + f * rr[3], rr[2], rr[3], rr[4], it.x0, it.y - rr[4], rr[3], rr[4])
          ctx.globalAlpha = 0.4
          ctx.drawImage(img, rr[1], rr[2], rr[3], rr[4], it.x1, it.y - rr[4], rr[3], rr[4])
          ctx.globalAlpha = 1
          ctx.strokeStyle = '#ffd166'
          ctx.lineWidth = 1 / z
          ctx.setLineDash([4 / z, 3 / z])
          ctx.beginPath()
          ctx.moveTo(it.x0 + rr[3] / 2, it.y - 1)
          ctx.lineTo(it.x1 + rr[3] / 2, it.y - 1)
          ctx.stroke()
          ctx.setLineDash([])
        }
      }
      // luzes (todas as fontes)
      const lights = m.lights.map((l) => [l.x, l.y, l.r, l.c])
      for (const o of m.objects) {
        const rr = L.lib[o.src ?? 'pecas']?.[o.t]?.[o.n]
        if (o.l && rr) lights.push(lightAt(o.x, o.y, rr[2], rr[3], o.l))
      }
      for (const a of m.anims) {
        const rr = L.lib.anims[a.n]
        if (a.l && rr) lights.push(lightAt(a.x, a.y, a.fw ?? rr[3], rr[4], a.l))
      }
      if (L.sky !== 'dia') {
        const night = L.sky === 'noite'
        if (shade.width !== W || shade.height !== H) {
          shade.width = W
          shade.height = H
        }
        const s = shade.getContext('2d')
        s.setTransform(1, 0, 0, 1, 0, 0)
        s.globalCompositeOperation = 'source-over'
        s.clearRect(0, 0, W, H)
        s.setTransform(z, 0, 0, z, ox, oy)
        s.fillStyle = night ? 'rgba(6, 10, 38, 0.8)' : 'rgba(150, 60, 30, 0.3)'
        s.fillRect(0, 0, m.w * T, m.h * T)
        s.globalCompositeOperation = 'destination-out'
        for (const [lx, ly, lr] of lights) {
          const g = s.createRadialGradient(lx, ly, 0, lx, ly, lr)
          g.addColorStop(0, `rgba(0,0,0,${night ? 0.95 : 0.6})`)
          g.addColorStop(1, 'rgba(0,0,0,0)')
          s.fillStyle = g
          s.fillRect(lx - lr, ly - lr, lr * 2, lr * 2)
        }
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.drawImage(shade, 0, 0)
        ctx.setTransform(z, 0, 0, z, ox, oy)
        ctx.globalCompositeOperation = 'lighter'
        for (const [lx, ly, lr, c] of lights) {
          const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, lr * 0.7)
          g.addColorStop(0, `rgba(${c},${night ? 0.32 : 0.14})`)
          g.addColorStop(1, `rgba(${c},0)`)
          ctx.fillStyle = g
          ctx.fillRect(lx - lr, ly - lr, lr * 2, lr * 2)
        }
        ctx.globalCompositeOperation = 'source-over'
      }
      // ajudas do editor
      ctx.lineWidth = 1 / z
      if (L.walk) {
        ctx.globalAlpha = 0.33
        L.walk.forEach((line, y) => {
          for (let x = 0; x < line.length; x += 1) {
            const forced = m.block[`${x},${y}`]
            ctx.fillStyle = line[x] === '.' ? '#3ddc84' : '#ff4d4d'
            ctx.fillRect(x * T + 1, y * T + 1, T - 2, T - 2)
            if (forced !== undefined) {
              ctx.globalAlpha = 0.9
              ctx.strokeStyle = '#fff'
              ctx.strokeRect(x * T + 3, y * T + 3, T - 6, T - 6)
              ctx.globalAlpha = 0.33
            }
          }
        })
        ctx.globalAlpha = 1
      }
      if (L.showGrid && z >= 1) {
        ctx.strokeStyle = 'rgba(255,255,255,0.12)'
        ctx.beginPath()
        for (let x = 0; x <= m.w; x += 1) {
          ctx.moveTo(x * T, 0)
          ctx.lineTo(x * T, m.h * T)
        }
        for (let y = 0; y <= m.h; y += 1) {
          ctx.moveTo(0, y * T)
          ctx.lineTo(m.w * T, y * T)
        }
        ctx.stroke()
      }
      ctx.strokeStyle = 'rgba(94,234,212,0.7)'
      ctx.strokeRect(0, 0, m.w * T, m.h * T)
      if (L.tool === 'water' || L.sel?.kind === 'water') {
        ctx.strokeStyle = '#7cc4ff'
        for (const w of m.water) ctx.strokeRect(w.x * T, w.y * T, w.w * T, w.h * T)
      }
      if (L.tool === 'light' || L.sel?.kind === 'light' || L.sky !== 'dia') {
        for (const l of m.lights) {
          ctx.strokeStyle = `rgba(${l.c},0.9)`
          ctx.beginPath()
          ctx.arc(l.x, l.y, l.r, 0, Math.PI * 2)
          ctx.stroke()
          ctx.fillStyle = `rgb(${l.c})`
          ctx.fillRect(l.x - 3, l.y - 3, 6, 6)
        }
      }
      for (const it of m.items) {
        const cx = it.x * T + T / 2
        const foot = (it.y + 1) * T - 2
        if (it.tipo === 'moeda') {
          const img = getImg('/limezu/editor/hud/i_moeda.png')
          if (img) ctx.drawImage(img, cx - 7, foot - 13, 15, 13)
        } else {
          const rr = L.lib[it.src ?? 'pecas']?.[it.t]?.[it.n]
          const img = rr && getImg(atlasUrl(it.src ?? 'pecas', it.t))
          if (img) {
            const sc = Math.min(1, 16 / Math.max(rr[2], rr[3]))
            ctx.drawImage(img, rr[0], rr[1], rr[2], rr[3], Math.round(cx - (rr[2] * sc) / 2), Math.round(foot - rr[3] * sc), Math.round(rr[2] * sc), Math.round(rr[3] * sc))
          }
        }
        ctx.strokeStyle = 'rgba(255,230,120,0.8)'
        ctx.strokeRect(it.x * T + 0.5, it.y * T + 0.5, T - 1, T - 1)
      }
      ctx.font = '6px sans-serif'
      ctx.textAlign = 'center'
      for (const d of m.doors) {
        ctx.fillStyle = 'rgba(255,140,60,0.45)'
        ctx.fillRect(d.x * T, d.y * T, T, T)
        ctx.strokeStyle = '#ff8c3c'
        ctx.strokeRect(d.x * T + 0.5, d.y * T + 0.5, T - 1, T - 1)
        ctx.fillStyle = '#fff'
        ctx.fillText(`→ ${d.to || '?'}`, d.x * T + T / 2, d.y * T - 2)
      }
      // onde nasce
      const [sx, sy] = m.spawn
      ctx.fillStyle = 'rgba(94,234,212,0.5)'
      ctx.fillRect(sx * T, sy * T, T, T)
      ctx.fillStyle = '#060b14'
      ctx.fillText('início', sx * T + T / 2, sy * T + 10)
      // seleção
      const it = itemOf(m, L.sel)
      if (it) {
        const [bx, by, bw, bh] = boxOf(L.sel.kind, it, L.lib)
        ctx.strokeStyle = '#5eead4'
        ctx.lineWidth = 2 / z
        ctx.setLineDash([5 / z, 3 / z])
        ctx.lineDashOffset = -time * 20 / z
        ctx.strokeRect(bx - 1, by - 1, bw + 2, bh + 2)
        ctx.setLineDash([])
        ctx.lineWidth = 1 / z
      }
      // prévia do que vai ser colocado / pintado
      const hv = hoverRef.current
      const dg = dragRef.current
      if (hv) {
        const pick = L.chosen[L.tool === 'anim' || L.tool === 'patrol' ? 'anims' : L.libMode === 'anims' ? 'pecas' : L.libMode]
        if (L.tool === 'object' && pick && !dg) {
          const rr = L.lib[pick.src]?.[pick.t]?.[pick.n]
          if (rr) {
            const [px, py] = placeAt(hv, rr[2], rr[3], L.snap)
            const img = getImg(atlasUrl(pick.src, pick.t))
            ctx.globalAlpha = 0.6
            if (img) ctx.drawImage(img, rr[0], rr[1], rr[2], rr[3], px, py, rr[2], rr[3])
            ctx.globalAlpha = 1
          }
        } else if (L.tool === 'anim' && pick && !dg) {
          const rr = L.lib.anims[pick.n]
          if (rr) {
            const [px, py] = placeAt(hv, rr[3], rr[4], L.snap)
            const img = getImg(animAtlasUrl(rr[0]))
            ctx.globalAlpha = 0.6
            if (img) ctx.drawImage(img, rr[1], rr[2], rr[3], rr[4], px, py, rr[3], rr[4])
            ctx.globalAlpha = 1
          }
        } else if (L.tool === 'terrain' || L.tool === 'block') {
          const n = L.tool === 'terrain' ? L.brush : 1
          const tx = Math.floor(hv.x / T) - Math.floor((n - 1) / 2)
          const ty = Math.floor(hv.y / T) - Math.floor((n - 1) / 2)
          ctx.strokeStyle = '#fff'
          ctx.strokeRect(tx * T, ty * T, n * T, n * T)
        } else if (L.tool === 'door' || L.tool === 'spawn') {
          ctx.strokeStyle = '#fff'
          ctx.strokeRect(Math.floor(hv.x / T) * T, Math.floor(hv.y / T) * T, T, T)
        }
      }
      if (dg?.rect) {
        const [ax, ay, bx2, by2] = dg.rect
        ctx.strokeStyle = '#fff'
        ctx.setLineDash([4 / z, 3 / z])
        if (dg.type === 'water') ctx.strokeRect(Math.min(ax, bx2) * T, Math.min(ay, by2) * T, (Math.abs(bx2 - ax) + 1) * T, (Math.abs(by2 - ay) + 1) * T)
        else {
          ctx.beginPath()
          ctx.moveTo(ax, ay)
          ctx.lineTo(bx2, ay)
          ctx.stroke()
        }
        ctx.setLineDash([])
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
    // o desenho lê tudo de live.current; só recomeça quando abre outro mapa
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!map, meta?.code, testing])
  return { bichos }
}
