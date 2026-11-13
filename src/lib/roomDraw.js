// Desenho da sala: sons, cabeça com foto, fundo (parede e chão) e as telinhas animadas.
import { WALL_ROWS, WALL_TOP, TILE, itemRect } from './room'
import { getSprite } from './roomSprites'

export const HEAD = 12
export const hueOf = (name) => [...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 360
export const pick = (list) => list[Math.floor(Math.random() * list.length)]
export const spriteOf = (item) => (item.sprite ? getSprite(item.sprite) : null)

export function drawItem(ctx, item) {
  const sprite = spriteOf(item)
  if (!sprite) return
  const rect = itemRect(item, sprite)
  ctx.drawImage(sprite, rect.x, rect.y)
}

// ---------- sons (só toca para quem usou o móvel)
let audioCtx = null
export function playNotes(notes, { wave = 'triangle', gap = 0.18, volume = 0.12 } = {}) {
  try {
    audioCtx = audioCtx ?? new (window.AudioContext || window.webkitAudioContext)()
    const start = audioCtx.currentTime + 0.02
    notes.forEach((freq, i) => {
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.type = wave
      osc.frequency.value = freq
      const t = start + i * gap
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(volume, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, t + gap * 1.8)
      osc.connect(gain).connect(audioCtx.destination)
      osc.start(t)
      osc.stop(t + gap * 2)
    })
  } catch {
    // navegador sem som: segue sem tocar
  }
}
export const MELODIES = [
  [523, 659, 784, 1047, 784, 659, 523],
  [392, 440, 494, 523, 587, 523, 494, 392],
  [659, 587, 523, 587, 659, 659, 659],
  [523, 523, 784, 784, 880, 880, 784],
]

// A foto de perfil vira a cabeça do boneco: reduzida em duas etapas (fica "pixelada") e recortada em círculo.
export function makeHead(player) {
  const paint = (source) => {
    const canvas = document.createElement('canvas')
    canvas.width = HEAD
    canvas.height = HEAD
    const ctx = canvas.getContext('2d')
    ctx.beginPath()
    ctx.arc(HEAD / 2, HEAD / 2, HEAD / 2, 0, Math.PI * 2)
    ctx.clip()
    if (source) {
      const mid = document.createElement('canvas')
      mid.width = HEAD * 2
      mid.height = HEAD * 2
      mid.getContext('2d').drawImage(source, 0, 0, HEAD * 2, HEAD * 2)
      ctx.drawImage(mid, 0, 0, HEAD, HEAD)
    } else {
      ctx.fillStyle = `hsl(${hueOf(player.name)} 55% 42%)`
      ctx.fillRect(0, 0, HEAD, HEAD)
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 9px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText((player.name.trim()[0] ?? '?').toUpperCase(), HEAD / 2, HEAD / 2 + 1)
    }
    player.head = canvas
  }
  paint(null)
  if (!player.avatarUrl) return
  const img = new Image()
  img.onload = () => paint(img)
  img.src = player.avatarUrl
}

// ---------- telinhas animadas
export function drawTvScreen(ctx, s, on, t) {
  if (!on) {
    ctx.fillStyle = '#121a26'
    ctx.fillRect(s.x, s.y, s.w, s.h)
    ctx.fillStyle = 'rgba(255,255,255,0.12)'
    for (let i = 0; i < 6; i += 1) ctx.fillRect(s.x + 3 + i, s.y + 8 - i, 1, 1)
    return
  }
  const scene = Math.floor(t / 4) % 3
  if (scene === 0) {
    ;['#f2a65a', '#e8915a', '#d2645a', '#a04a6a'].forEach((c, i) => {
      ctx.fillStyle = c
      ctx.fillRect(s.x, s.y + i * 2, s.w, 2)
    })
    ctx.fillStyle = '#a04a6a'
    ctx.fillRect(s.x, s.y + 8, s.w, s.h - 8)
    ctx.fillStyle = '#ffe08a'
    ctx.fillRect(s.x + 18, s.y + 4, 5, 3)
    ctx.fillStyle = '#3a2a66'
    for (let x = 0; x < s.w; x += 1) {
      const h = 3 + Math.round(2 + Math.sin((x + t * 4) * 0.5) * 2)
      ctx.fillRect(s.x + x, s.y + s.h - h, 1, h)
    }
  } else if (scene === 1) {
    ctx.fillStyle = '#2f9e5a'
    ctx.fillRect(s.x, s.y, s.w, s.h)
    ctx.fillStyle = '#5ecb84'
    for (let x = 0; x < s.w; x += 6) ctx.fillRect(s.x + x, s.y, 3, s.h)
    ctx.fillStyle = '#fff'
    ctx.fillRect(s.x + s.w / 2, s.y, 1, s.h)
    const bx = Math.round(s.w / 2 + Math.sin(t * 2) * 11)
    const by = Math.round(s.h / 2 + Math.cos(t * 3) * 3)
    ctx.fillRect(s.x + bx, s.y + by, 2, 2)
    ctx.fillStyle = '#e05252'
    ctx.fillRect(s.x + Math.max(0, bx - 4), s.y + by - 2, 2, 3)
    ctx.fillStyle = '#4d7fc6'
    ctx.fillRect(s.x + Math.min(s.w - 2, bx + 4), s.y + by + 1, 2, 3)
  } else {
    ctx.fillStyle = '#5bc0eb'
    ctx.fillRect(s.x, s.y, s.w, s.h)
    ctx.fillStyle = '#fff'
    const cx = Math.round((t * 6) % (s.w + 8)) - 8
    ctx.fillRect(s.x + Math.max(0, cx), s.y + 2, Math.max(0, Math.min(7, s.w - Math.max(0, cx))), 2)
    ctx.fillStyle = '#38d27a'
    ctx.fillRect(s.x, s.y + s.h - 3, s.w, 3)
    ctx.fillStyle = '#f2c14e'
    ctx.fillRect(s.x + 13, s.y + s.h - 7 - Math.round(Math.abs(Math.sin(t * 4)) * 4), 4, 4)
  }
  ctx.fillStyle = 'rgba(0,0,0,0.12)'
  for (let y = 0; y < s.h; y += 2) ctx.fillRect(s.x, s.y + y, s.w, 1)
}
export function drawArcadeScreen(ctx, s, t) {
  ctx.fillStyle = '#0b1a2a'
  ctx.fillRect(s.x, s.y, s.w, s.h)
  const shift = Math.floor(t * 2) % 3
  ctx.fillStyle = '#38d27a'
  for (let i = 0; i < 2; i += 1) ctx.fillRect(s.x + 1 + i * 3 + shift, s.y + 1, 2, 1)
  ctx.fillStyle = '#f2c14e'
  for (let i = 0; i < 2; i += 1) ctx.fillRect(s.x + 2 + i * 3 + (2 - shift), s.y + 3, 2, 1)
  ctx.fillStyle = '#5eead4'
  ctx.fillRect(s.x + 4 + Math.round(Math.sin(t * 3) * 3), s.y + s.h - 2, 2, 1)
  if (Math.floor(t * 4) % 2) {
    ctx.fillStyle = '#fff'
    ctx.fillRect(s.x + 5, s.y + s.h - 4 - (Math.floor(t * 8) % 3), 1, 1)
  }
}

export const roundRect = (ctx, x, y, w, h, r) => {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}


export function drawPcScreen(ctx, s, on, t) {
  ctx.fillStyle = on ? '#0b1a2a' : '#121a26'
  ctx.fillRect(s.x, s.y, s.w, s.h)
  if (!on) return
  const lines = ['#5eead4', '#a066d0', '#f2c14e', '#38d27a']
  for (let i = 0; i < 4; i += 1) {
    const w = 4 + ((i * 5 + Math.floor(t * 3)) % 10)
    ctx.fillStyle = lines[i]
    ctx.fillRect(s.x + 2, s.y + 1 + i * 2, Math.min(w, s.w - 4), 1)
  }
  if (Math.floor(t * 2) % 2) {
    ctx.fillStyle = '#fff'
    ctx.fillRect(s.x + 2 + Math.min(12, s.w - 4), s.y + 9, 2, 1)
  }
}
export function drawFishScreen(ctx, s, t) {
  const fish = [['#f2c14e', 0.6, 3], ['#e05252', 0.9, 6], ['#5eead4', 0.45, 8]]
  fish.forEach(([color, speed, y], i) => {
    const span = s.w - 4
    const p = (t * speed * 10 + i * 9) % (span * 2)
    const forward = p < span
    const x = s.x + 1 + (forward ? p : span * 2 - p)
    ctx.fillStyle = color
    ctx.fillRect(Math.round(x), s.y + y, 3, 2)
    ctx.fillRect(Math.round(forward ? x - 1 : x + 3), s.y + y, 1, 2)
  })
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  const b = (t * 6) % s.h
  ctx.fillRect(s.x + 22, s.y + s.h - 1 - Math.round(b), 1, 1)
}
export function drawFireScreen(ctx, s, on, t) {
  if (!on) return
  const colors = ['#e05252', '#e8915a', '#f2c14e', '#ffe08a']
  for (let x = 0; x < s.w; x += 2) {
    const h = 4 + Math.round(Math.abs(Math.sin(t * 7 + x * 0.9)) * (s.h - 5))
    colors.forEach((color, i) => {
      const hh = Math.max(0, h - i * 3)
      ctx.fillStyle = color
      ctx.fillRect(s.x + x + (i % 2), s.y + s.h - hh, 2, hh)
    })
  }
}
export function drawXmasLights(ctx, s, t) {
  const spots = [[9, 5], [7, 10], [12, 11], [5, 16], [10, 17], [15, 16], [3, 22], [8, 23], [13, 23], [17, 22]]
  const colors = ['#e05252', '#f2c14e', '#5eead4', '#e86aa0', '#4d7fc6']
  spots.forEach(([x, y], i) => {
    if ((Math.floor(t * 3) + i) % 3 === 0) return
    ctx.fillStyle = colors[(i + Math.floor(t * 2)) % colors.length]
    ctx.fillRect(s.x + x, s.y + y, 1, 1)
  })
}

/** Fundo fixo de um ambiente (parede, chão e enfeites que não mudam), desenhado uma vez só. */
export function paintBackground(scene, decor) {
  const W = scene.cols * TILE
  const H = scene.rows * TILE
  const T = WALL_TOP
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H + T
  const ctx = canvas.getContext('2d')
  ctx.translate(0, T) // o (0,0) da sala fica abaixo da faixa extra de parede
  const r = (x, y, w, h, color) => {
    ctx.fillStyle = color
    ctx.fillRect(x, y, w, h)
  }
  const base = WALL_ROWS * TILE
  const wall = scene.wall
  const floor = scene.floor

  // parede: papel listrado em cima (começando na faixa extra), lambri de madeira embaixo
  r(0, -T, W, base + T, wall.base)
  for (let x = 0; x < W; x += 8) r(x, -T, 3, 20 + T, wall.stripe)
  r(0, -T, W, 3, '#6a4426')
  r(0, -T + 3, W, 1, '#a06a3c')
  const ceiling = ctx.createLinearGradient(0, -T + 4, 0, -T + 12)
  ceiling.addColorStop(0, 'rgba(40,20,8,0.22)')
  ceiling.addColorStop(1, 'rgba(40,20,8,0)')
  ctx.fillStyle = ceiling
  ctx.fillRect(0, -T + 4, W, 8)
  r(0, 19, W, 2, '#8a5a34')
  r(0, 21, W, base - 21, '#a06a3c')
  for (let x = 0; x < W; x += 24) {
    r(x + 3, 23, 18, 6, '#8a5a34')
    r(x + 4, 24, 16, 4, '#ae7646')
  }
  r(0, 21, W, 1, '#c08a52')

  // chão
  if (floor.tile) {
    for (let y = base, j = 0; y < H; y += 8, j += 1) {
      for (let x = 0, i = 0; x < W; x += 8, i += 1) {
        r(x, y, 8, 8, floor.tones[(i + j) % floor.tones.length])
        r(x, y, 8, 1, floor.seam)
        r(x, y, 1, 8, floor.seam)
      }
    }
  } else if (floor.carpet) {
    r(0, base, W, H - base, floor.tones[0])
    for (let y = base; y < H; y += 2) for (let x = (y / 2) % 2; x < W; x += 3) r(x, y, 1, 1, floor.seam)
  } else {
    const plank = 6
    for (let y = base, row = 0; y < H; y += plank, row += 1) {
      r(0, y, W, plank, floor.tones[row % floor.tones.length])
      r(0, y, W, 1, 'rgba(255,240,210,0.18)')
      r(0, y + plank - 1, W, 1, floor.seam)
      const offset = ((row * 37) % 5) * 9
      for (let x = offset; x < W; x += 46) r(x, y, 1, plank - 1, floor.seam)
      for (let x = (row * 13) % 23; x < W; x += 31) r(x, y + 2, 2, 1, 'rgba(110,60,25,0.25)')
    }
  }
  // rodapé e sombra da parede no chão
  r(0, base - 3, W, 3, '#5a361e')
  r(0, base - 3, W, 1, '#7a4c2a')
  const shadeGrad = ctx.createLinearGradient(0, base, 0, base + 10)
  shadeGrad.addColorStop(0, 'rgba(40,20,8,0.3)')
  shadeGrad.addColorStop(1, 'rgba(40,20,8,0)')
  ctx.fillStyle = shadeGrad
  ctx.fillRect(0, base, W, 10)

  decor.forEach((item) => drawItem(ctx, item))
  scene.furniture.filter((item) => item.sprite === 'window').forEach((item) => {
    const x = item.px + 1
    const light = ctx.createLinearGradient(0, base, 0, base + TILE * 3.5)
    light.addColorStop(0, 'rgba(255,240,190,0.24)')
    light.addColorStop(1, 'rgba(255,240,190,0)')
    ctx.fillStyle = light
    ctx.beginPath()
    ctx.moveTo(x + 2, base)
    ctx.lineTo(x + 14, base)
    ctx.lineTo(x + 26, base + TILE * 3.5)
    ctx.lineTo(x - 10, base + TILE * 3.5)
    ctx.closePath()
    ctx.fill()
  })
  return canvas
}

export function drawJukeboxScreen(ctx, s, on, t) {
  ctx.fillStyle = '#3a2a66'
  ctx.fillRect(s.x, s.y, s.w, s.h)
  const colors = ['#5eead4', '#f2c14e', '#e86aa0', '#38d27a', '#e05252']
  for (let i = 0; i < s.w; i += 2) {
    const h = on ? 1 + Math.round(Math.abs(Math.sin(t * 6 + i * 1.3)) * (s.h - 1)) : 1
    ctx.fillStyle = colors[(i / 2) % colors.length]
    ctx.fillRect(s.x + i, s.y + s.h - h, 1, h)
  }
}

/** Ponteiros do relógio com a hora de verdade. */
export function drawClockHands(ctx, rect, now) {
  const cx = rect.x + 6
  const cy = rect.y + 6
  ctx.fillStyle = '#f6f1e6'
  ctx.fillRect(rect.x + 2, rect.y + 2, 8, 8)
  const hand = (angle, length, color) => {
    ctx.fillStyle = color
    for (let i = 0; i <= length; i += 0.5) ctx.fillRect(Math.round(cx + Math.sin(angle) * i - 0.5), Math.round(cy - Math.cos(angle) * i - 0.5), 1, 1)
  }
  const h = (now.getHours() % 12) + now.getMinutes() / 60
  hand((h / 12) * Math.PI * 2, 2.5, '#1a1424')
  hand((now.getMinutes() / 60) * Math.PI * 2, 4, '#1a1424')
  ctx.fillStyle = '#e05252'
  ctx.fillRect(cx - 0.5, cy - 0.5, 1, 1)
}

/** À noite o céu das janelas fica escuro e estrelado. */
export function drawNightWindow(ctx, item, t) {
  const x = item.px + 4
  const y = item.py + 2
  ctx.fillStyle = '#16223e'
  ctx.fillRect(x, y, 10, 17)
  ctx.fillStyle = '#24345a'
  ctx.fillRect(x, y + 11, 10, 6)
  ctx.fillStyle = '#f6f1e6'
  ;[[1, 2], [7, 4], [3, 7], [8, 12], [2, 14]].forEach(([sx, sy], i) => {
    if ((Math.floor(t * 1.5) + i) % 4 !== 0) ctx.fillRect(x + sx, y + sy, 1, 1)
  })
  ctx.fillStyle = '#ffe08a'
  ctx.fillRect(x + 6, y + 1, 2, 2)
  ctx.fillStyle = '#9a6a40'
  ctx.fillRect(item.px + 8, y, 2, 17)
  ctx.fillRect(x, item.py + 10, 10, 1)
}

export function drawLavaScreen(ctx, s, on, t) {
  ctx.fillStyle = on ? '#a066d0' : '#5a3a7a'
  ctx.fillRect(s.x, s.y, s.w, s.h)
  if (!on) return
  ctx.fillStyle = '#ff8ac0'
  ;[0, 1.7, 3.1].forEach((phase, i) => {
    const y = s.y + s.h - 3 - ((Math.sin(t * 0.8 + phase) + 1) / 2) * (s.h - 4)
    ctx.fillRect(s.x + (i % 2), Math.round(y), 3 - (i % 2), 3)
  })
}
export function drawFanScreen(ctx, s, on, t) {
  const cx = s.x + s.w / 2
  const cy = s.y + s.h / 2
  const a = on ? t * 14 : 0.3
  ctx.fillStyle = '#9aa6b2'
  for (let i = 0; i < 3; i += 1) {
    const angle = a + (i * Math.PI * 2) / 3
    for (let k = 1; k <= 4; k += 1) ctx.fillRect(Math.round(cx + Math.cos(angle) * k - 1), Math.round(cy + Math.sin(angle) * k - 1), 2, 2)
  }
  ctx.fillStyle = '#4a5060'
  ctx.fillRect(cx - 1, cy - 1, 2, 2)
}
export function drawFairyLights(ctx, s, t) {
  const colors = ['#ffe08a', '#ff8ac0', '#7af0e0', '#a8f07a']
  for (let i = 0; i < 12; i += 1) {
    const x = s.x + 2 + i * 4
    const y = s.y + 2 + Math.round(Math.abs(Math.sin(((x - s.x) / 12) * Math.PI)) * 4)
    if ((Math.floor(t * 2) + i) % 3 === 0) continue
    ctx.fillStyle = colors[i % colors.length]
    ctx.fillRect(x, y, 2, 2)
  }
}
