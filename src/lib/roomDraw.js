// Desenho da sala: sons, cabeça com foto, fundo (parede e chão) e as telinhas animadas.
import { WALL_ROWS, WALL_TOP, TILE, itemRect } from './room'
import { getSprite, shadeHex } from './roomSprites'

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

// ---------- papel de parede: listras (padrão), bolinhas, xadrez, céu estrelado ou arco-íris
function paintPaper(r, W, T, wall) {
  const top = -T
  const h = 20 + T
  if (wall.pattern === 'dots') {
    for (let y = top + 3, row = 0; y < top + h; y += 6, row += 1) for (let x = (row % 2) * 4 + 2; x < W; x += 8) r(x, y, 2, 2, wall.stripe)
  } else if (wall.pattern === 'gingham') {
    for (let x = 0; x < W; x += 8) r(x, top, 4, h, wall.stripe)
    for (let y = top; y < top + h; y += 8) r(0, y, W, 4, wall.stripe)
    for (let y = top; y < top + h; y += 8) for (let x = 0; x < W; x += 8) r(x, y, 4, 4, shadeHex(wall.stripe, -0.1))
  } else if (wall.pattern === 'stars') {
    for (let x = 3; x < W; x += 1) {
      const n = (x * 7919) % 101
      if (n < 9) r(x, top + 2 + ((x * 13) % (h - 4)), 1, 1, n < 3 ? '#fff6c0' : '#ffffff')
    }
    for (let x = 40; x < W; x += 150) {
      r(x, top + 3, 6, 8, '#fff6c0')
      r(x + 3, top + 3, 4, 7, wall.base)
    }
  } else if (wall.pattern === 'rainbow') {
    const bands = ['#e05252', '#e8915a', '#f2c14e', '#38a85a', '#4d9ad8', '#a066d0']
    const bh = Math.ceil(h / bands.length)
    bands.forEach((c, i) => r(0, top + i * bh, W, bh, shadeHex(c, 0.45)))
  } else {
    for (let x = 0; x < W; x += 8) r(x, top, 3, h, wall.stripe)
  }
}
// Tijolinho à vista na parede toda
function paintBrick(r, W, T, base, wall) {
  r(0, -T, W, base + T, wall.stripe)
  for (let y = -T, row = 0; y < base; y += 5, row += 1) {
    for (let x = row % 2 ? -6 : 0; x < W; x += 12) {
      const tone = (x * 3 + row * 7) % 5 === 0 ? shadeHex(wall.base, -0.12) : (x + row) % 3 === 0 ? shadeHex(wall.base, 0.08) : wall.base
      r(x + 1, y + 1, 11, 4, tone)
    }
  }
  r(0, base - 3, W, 3, '#5a361e')
}
// Madeira (lambri) na parede toda
function paintWoodWall(r, W, T, base) {
  const tones = ['#a87a52', '#9c6e48', '#b4865c']
  for (let x = 0, i = 0; x < W; x += 6, i += 1) {
    r(x, -T, 6, base + T, tones[i % 3])
    r(x, -T, 1, base + T, '#6a4426')
    if (i % 4 === 1) r(x + 3, -T + ((i * 17) % 20), 1, 2, '#6a4426')
  }
  r(0, -T, W, 3, '#5a361e')
  r(0, base - 3, W, 3, '#5a361e')
}
// Cidade à noite: céu escuro, lua e prédios com janelas acesas
function paintCity(r, W, T, base) {
  r(0, -T, W, base + T, '#1b1f3a')
  r(0, -T, W, 8, '#141830')
  for (let x = 5; x < W; x += 23) r(x, -T + 2 + (x % 7), 1, 1, '#ffffff')
  r(W - 60, -T + 3, 7, 7, '#fff6c0')
  r(W - 57, -T + 3, 4, 6, '#1b1f3a')
  let x = 0
  let i = 0
  while (x < W) {
    const w = 14 + ((i * 7) % 12)
    const h = 14 + ((i * 11) % 18)
    const c = i % 2 ? '#2b3250' : '#353d5e'
    r(x, base - h - 2, w, h + 2, c)
    for (let wy = base - h + 1; wy < base - 4; wy += 4) for (let wx = x + 2; wx < x + w - 2; wx += 4) {
      if ((wx * 31 + wy * 17 + i) % 5 < 2) r(wx, wy, 2, 2, '#f2d27a')
    }
    x += w + 1
    i += 1
  }
  r(0, base - 3, W, 3, '#141830')
}
// Floresta pintada: céu, montanhas e pinheiros em camadas
function paintForest(r, W, T, base) {
  r(0, -T, W, base + T, '#bfe3f2')
  r(0, -T, W, 6, '#a8d8f0')
  for (let x = 0; x < W; x += 1) {
    const h = 10 + Math.round(Math.sin(x / 31) * 5 + Math.sin(x / 11) * 2)
    r(x, 14 - h, 1, h + 4, '#8aaec8')
  }
  const pine = (cx, bottom, size, c) => {
    for (let y = 0; y < size; y += 1) {
      const half = Math.round((y / size) * (size / 2.2)) + 1
      r(cx - half, bottom - size + y, half * 2, 1, c)
    }
    r(cx - 1, bottom, 2, 2, '#6a4024')
  }
  for (let x = 4; x < W; x += 13) pine(x, 20 + (x % 3), 14 + (x % 5), '#4a8a5a')
  for (let x = 10; x < W; x += 17) pine(x, base - 3, 18 + (x % 7), '#2f6a3a')
  r(0, base - 3, W, 3, '#24502a')
}
// Fundo do mar: água em degradê, algas, bolhas e peixinhos
function paintOcean(r, W, T, base) {
  const bands = ['#5ab8e8', '#4aa6dc', '#3a92cc', '#2f80ba', '#276ea6']
  const bh = Math.ceil((base + T) / bands.length)
  bands.forEach((c, i) => r(0, -T + i * bh, W, bh, c))
  for (let x = 0; x < W; x += 9) r(x, -T + 1, 5, 1, '#8ad4f4')
  for (let x = 6; x < W; x += 29) {
    for (let y = base - 3; y > base - 16 - (x % 9); y -= 2) r(x + ((y / 2) % 2), y, 2, 2, '#38a85a')
  }
  for (let x = 12; x < W; x += 41) {
    r(x, -T + 8 + (x % 13), 5, 3, '#f2c14e')
    r(x + 5, -T + 9 + (x % 13), 2, 1, '#f2c14e')
    r(x + 1, -T + 9 + (x % 13), 1, 1, '#1a1424')
  }
  for (let x = 30; x < W; x += 53) {
    r(x, 2 + (x % 9), 4, 2, '#e8915a')
    r(x - 2, 2 + (x % 9), 2, 2, '#e8915a')
  }
  for (let x = 20; x < W; x += 37) [0, 5, 11].forEach((dy) => r(x + (dy % 2), -T + 12 + dy, 2, 2, '#bfe8fb'))
  r(0, base - 3, W, 3, '#d8c08a')
}
// Chão com padrões: tacos, mármore, ladrilho hidráulico, tatame e deck
function paintFloorPattern(r, W, H, base, floor) {
  const [a, b, c] = floor.tones
  if (floor.pattern === 'parquet') {
    // blocos de 16px com 4 tacos, alternando a direção (efeito "tabuleiro")
    for (let y = base, row = 0; y < H; y += 16, row += 1) for (let x = 0, col = 0; x < W; x += 16, col += 1) {
      const vertical = (row + col) % 2
      r(x, y, 16, 16, vertical ? a : b)
      for (let k = 0; k < 16; k += 4) {
        if (vertical) r(x + k, y, 1, 16, floor.seam)
        else r(x, y + k, 16, 1, floor.seam)
      }
      r(x, y, 16, 1, shadeHex(floor.seam, -0.15))
      r(x, y, 1, 16, shadeHex(floor.seam, -0.15))
    }
  } else if (floor.pattern === 'marble') {
    r(0, base, W, H - base, a)
    for (let y = base; y < H; y += 16) r(0, y, W, 1, floor.seam)
    for (let x = 0; x < W; x += 16) r(x, base, 1, H - base, floor.seam)
    for (let i = 0; i < W / 14; i += 1) {
      let x = (i * 37) % W
      let y = base + ((i * 23) % (H - base))
      for (let k = 0; k < 9; k += 1) {
        r(x, y, 1, 1, b)
        x += (k + i) % 3 === 0 ? -1 : 1
        y += 1
      }
    }
  } else if (floor.pattern === 'mosaic') {
    for (let y = base; y < H; y += 16) for (let x = 0; x < W; x += 16) {
      r(x, y, 16, 16, a)
      r(x, y, 16, 1, floor.seam)
      r(x, y, 1, 16, floor.seam)
      r(x + 6, y + 2, 4, 12, b)
      r(x + 2, y + 6, 12, 4, b)
      r(x + 7, y + 7, 2, 2, c)
      ;[[1, 1], [13, 1], [1, 13], [13, 13]].forEach(([dx, dy]) => r(x + dx, y + dy, 2, 2, c))
    }
  } else if (floor.pattern === 'tatami') {
    for (let y = base, row = 0; y < H; y += 16, row += 1) for (let x = row % 2 ? -16 : 0; x < W; x += 32) {
      r(x, y, 32, 16, (x / 32 + row) % 2 ? a : b)
      r(x, y, 32, 1, floor.seam)
      r(x, y, 1, 16, floor.seam)
      for (let k = 3; k < 16; k += 3) r(x + 1, y + k, 31, 1, shadeHex(a, -0.05))
    }
  } else {
    // deck: tábuas largas na horizontal com pregos
    for (let y = base, row = 0; y < H; y += 8, row += 1) {
      r(0, y, W, 8, row % 2 ? a : b)
      r(0, y + 7, W, 1, floor.seam)
      for (let x = (row * 23) % 40; x < W; x += 40) {
        r(x, y, 1, 7, floor.seam)
        r(x + 3, y + 2, 1, 1, floor.seam)
        r(x + 3, y + 5, 1, 1, floor.seam)
      }
    }
  }
}

// ---------- paredes de cenário (sem papel de parede)
// Estação espacial: painéis de metal, uma janela comprida para o espaço e faixa de atenção no rodapé.
function paintStation(r, W, T, base) {
  r(0, -T, W, base + T, '#2b3346')
  // janelão para o espaço
  r(0, -T + 2, W, 1, '#8a96aa')
  r(0, -T + 3, W, 21, '#0b1030')
  for (let x = 0; x < W; x += 1) {
    const n = (x * 9301 + 49297) % 233280
    if (n % 7 === 0) r(x, -T + 4 + (n % 19), 1, 1, n % 3 ? '#ffffff' : '#bfe3f2')
  }
  for (let x = 30; x < W; x += 140) {
    r(x, -T + 8, 40, 6, 'rgba(160,102,208,0.35)')
    r(x + 14, -T + 6, 24, 4, 'rgba(94,234,212,0.25)')
  }
  for (let x = 90; x < W; x += 170) {
    r(x, -T + 6, 9, 9, '#e8915a')
    r(x - 2, -T + 10, 13, 1, '#f2c14e')
    r(x + 2, -T + 7, 3, 2, '#f2b080')
  }
  r(0, -T + 24, W, 2, '#8a96aa')
  for (let x = 0; x < W; x += 64) r(x, -T + 2, 2, 24, '#8a96aa')
  // painéis de baixo
  r(0, 14, W, base - 14, '#3a4256')
  for (let x = 0; x < W; x += 32) {
    r(x, 14, 1, base - 20, '#2b3346')
    ;[[3, 17], [28, 17]].forEach(([dx, dy]) => r(x + dx, dy, 1, 1, '#8a96aa'))
  }
  for (let x = 0; x < W; x += 8) r(x, base - 6, 4, 3, x % 16 ? '#1b1f2b' : '#f2c14e')
  r(0, base - 3, W, 3, '#1b2030')
}
// Praia: céu de pôr do sol em faixas, sol, mar com ondinhas e areia molhada.
function paintBeach(r, W, T, base) {
  const sky = ['#4a3a7a', '#7a4a8a', '#b4568a', '#e06a7a', '#f2905a', '#f8b46a']
  const top = -T
  const skyH = 18 + T
  sky.forEach((c, i) => r(0, top + Math.floor((i * skyH) / sky.length), W, Math.ceil(skyH / sky.length) + 1, c))
  // estrelinhas no alto e o sol se pondo
  for (let x = 7; x < W; x += 37) r(x, top + 2 + (x % 5), 1, 1, '#ffffff')
  const sx = Math.round(W * 0.68)
  for (let y = 0; y < 9; y += 1) {
    const half = Math.round(Math.sqrt(81 - (9 - y) * (9 - y)) * 1.4)
    r(sx - half, 9 + y, half * 2, 1, y < 5 ? '#ffe08a' : '#ffc860')
  }
  // mar
  r(0, 18, W, base - 21, '#3a7ac0')
  r(0, 18, W, 1, '#f8c070')
  for (let x = sx - 14; x < sx + 14; x += 3) r(x, 20 + (x % 2), 2, 1, '#ffd890')
  for (let y = 21; y < base - 3; y += 3) for (let x = (y * 5) % 11; x < W; x += 13) r(x, y, 4, 1, '#5a9ad8')
  r(0, base - 4, W, 2, '#f6f1e6')
  r(0, base - 2, W, 2, '#c8ac6c')
}
// Jardim: céu azul com nuvens, morrinhos verdes e uma cerca de madeira.
function paintGarden(r, W, T, base) {
  r(0, -T, W, base + T, '#9fd4f2')
  r(0, -T, W, 6, '#8ac8ec')
  for (let x = 10; x < W; x += 70) {
    const y = -T + 6 + ((x / 70) % 3) * 4
    r(x, y + 2, 22, 5, '#ffffff')
    r(x + 4, y, 12, 3, '#ffffff')
    r(x + 2, y + 6, 20, 1, '#e8f4fc')
  }
  for (let x = 0; x < W; x += 1) {
    const h = 6 + Math.round(Math.sin(x / 23) * 3 + Math.sin(x / 9) * 1.5)
    r(x, 20 - h, 1, h + 4, x % 47 < 30 ? '#6ab45a' : '#5ea050')
  }
  // cerca
  r(0, 18, W, base - 18, '#7cc06a')
  for (let x = 2; x < W; x += 8) {
    r(x, 12, 5, base - 13, '#d8b47a')
    r(x + 1, 11, 3, 1, '#d8b47a')
    r(x, 12, 1, base - 13, '#e8c890')
    r(x + 4, 12, 1, base - 13, '#b08a50')
  }
  r(0, 16, W, 3, '#c8a06a')
  r(0, 25, W, 3, '#c8a06a')
  r(0, 16, W, 1, '#e8c890')
  r(0, 25, W, 1, '#e8c890')
  r(0, base - 2, W, 2, '#5ea050')
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

  if (wall.scenery === 'station') paintStation(r, W, T, base)
  else if (wall.scenery === 'brick') paintBrick(r, W, T, base, wall)
  else if (wall.scenery === 'planks') paintWoodWall(r, W, T, base)
  else if (wall.scenery === 'city') paintCity(r, W, T, base)
  else if (wall.scenery === 'forest') paintForest(r, W, T, base)
  else if (wall.scenery === 'ocean') paintOcean(r, W, T, base)
  else if (wall.scenery === 'beach') paintBeach(r, W, T, base)
  else if (wall.scenery === 'garden') paintGarden(r, W, T, base)
  else {
    // parede: papel listrado em cima (começando na faixa extra), lambri de madeira embaixo
    r(0, -T, W, base + T, wall.base)
    paintPaper(r, W, T, wall)
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
  }

  // chão
  if (floor.tile) {
    for (let y = base, j = 0; y < H; y += 8, j += 1) {
      for (let x = 0, i = 0; x < W; x += 8, i += 1) {
        r(x, y, 8, 8, floor.tones[(i + j) % floor.tones.length])
        r(x, y, 8, 1, floor.seam)
        r(x, y, 1, 8, floor.seam)
      }
    }
  } else if (floor.pattern) {
    paintFloorPattern(r, W, H, base, floor)
  } else if (floor.sand) {
    r(0, base, W, H - base, floor.tones[0])
    for (let y = base; y < H; y += 2) for (let x = ((y * 7) % 5); x < W; x += 5 + (y % 3)) r(x, y, 1, 1, (x + y) % 3 ? floor.tones[1] : floor.seam)
    for (let x = 6; x < W; x += 41) r(x, base + ((x * 13) % (H - base - 6)), 3, 2, '#f6f1e6') // conchinhas
  } else if (floor.grass) {
    r(0, base, W, H - base, floor.tones[0])
    for (let y = base; y < H; y += 3) for (let x = ((y * 5) % 7); x < W; x += 6 + (y % 4)) {
      r(x, y, 1, 2, floor.seam)
      r(x + 1, y + 1, 1, 1, floor.tones[1])
    }
    // florzinhas no gramado
    for (let i = 0; i < W / 9; i += 1) {
      const x = (i * 53) % W
      const y = base + 6 + ((i * 37) % (H - base - 10))
      r(x, y, 2, 2, ['#f6f1e6', '#f2c14e', '#e86aa0'][i % 3])
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
  if (!wall.scenery) {
    r(0, base - 3, W, 3, '#5a361e')
    r(0, base - 3, W, 1, '#7a4c2a')
  }
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

// garra da máquina de pelúcia: anda de um lado para o outro e às vezes desce
export function drawClawScreen(ctx, s, t) {
  const cycle = t % 6
  const x = s.x + Math.round((Math.sin(t * 0.9) * 0.5 + 0.5) * (s.w - 4))
  const drop = cycle > 4 ? Math.round(Math.sin(((cycle - 4) / 2) * Math.PI) * (s.h - 4)) : 0
  ctx.fillStyle = '#6a7280'
  ctx.fillRect(s.x, s.y, s.w, 1)
  ctx.fillRect(x + 1, s.y + 1, 1, 2 + drop)
  ctx.fillStyle = '#d8a840'
  ctx.fillRect(x, s.y + 3 + drop, 3, 1)
  ctx.fillRect(x, s.y + 4 + drop, 1, 2)
  ctx.fillRect(x + 2, s.y + 4 + drop, 1, 2)
}

// pista de dança: os quadrados acendem em ondas (mais forte com o som ligado)
export function drawDanceScreen(ctx, s, on, t) {
  const colors = ['#e86aa0', '#5eead4', '#f2c14e', '#a066d0', '#4d9ad8', '#38d27a']
  const speed = on ? 4 : 1.2
  for (let y = 0; y < s.h; y += 8) {
    for (let x = 0; x < s.w; x += 8) {
      const wave = Math.sin(t * speed + x * 0.18 + y * 0.27) + Math.sin(t * speed * 0.7 - x * 0.11)
      if (wave < (on ? 0.4 : 1.2)) continue
      ctx.globalAlpha = on ? 0.75 : 0.45
      ctx.fillStyle = colors[Math.floor((x + y) / 8 + t * (on ? 3 : 0.5)) % colors.length]
      ctx.fillRect(s.x + x + 1, s.y + y + 1, 7, 7)
    }
  }
  ctx.globalAlpha = 1
}

// pipoca estourando dentro da máquina
export function drawPopcornScreen(ctx, s, t) {
  for (let i = 0; i < 7; i += 1) {
    const k = (t * 1.3 + i * 0.37) % 1
    const x = s.x + 1 + ((i * 5) % (s.w - 3))
    const y = s.y + s.h - 4 - Math.round(Math.sin(k * Math.PI) * (s.h - 5))
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(x, y, 2, 2)
    ctx.fillStyle = '#ffe08a'
    ctx.fillRect(x + 1, y + 1, 1, 1)
  }
}
// telão de LED: equalizador (mais forte com o som ligado)
export function drawEqScreen(ctx, s, on, t) {
  const colors = ['#38d27a', '#f2c14e', '#e86aa0']
  for (let x = 0; x < s.w; x += 4) {
    const amp = on ? 1 : 0.35
    const h = Math.max(2, Math.round((Math.abs(Math.sin(t * (on ? 6 : 2) + x * 0.35)) * 0.6 + Math.abs(Math.sin(t * 3.1 + x * 0.12)) * 0.4) * s.h * amp))
    for (let y = 0; y < h; y += 2) {
      ctx.fillStyle = colors[Math.min(2, Math.floor((y / s.h) * 3))]
      ctx.fillRect(s.x + x, s.y + s.h - 1 - y, 3, 1)
    }
  }
}
// brilhinhos girando no globo espelhado
export function drawDiscoScreen(ctx, s, t) {
  for (let i = 0; i < 5; i += 1) {
    const a = t * 1.8 + i * 1.25
    const x = s.x + s.w / 2 + Math.cos(a) * (s.w / 2 - 1)
    if (Math.sin(a) < 0) continue
    const y = s.y + 2 + ((i * 3) % (s.h - 3))
    ctx.fillStyle = ['#ffffff', '#5eead4', '#e86aa0', '#f2c14e', '#ffffff'][i]
    ctx.fillRect(Math.round(x), y, 1, 1)
  }
}
// laguinho: ondinhas e dois patinhos nadando
export function drawPondScreen(ctx, s, t) {
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  for (let i = 0; i < 6; i += 1) {
    const x = s.x + ((i * 17 + Math.floor(t * 4)) % (s.w - 8))
    const y = s.y + 6 + ((i * 11) % (s.h - 12))
    ctx.fillRect(x, y, 5, 1)
  }
  ;[['#f2c14e', 0.35, 0], ['#f6f1e6', 0.27, 2.1]].forEach(([c, speed, off]) => {
    const a = t * speed + off
    const x = Math.round(s.x + s.w / 2 + Math.cos(a) * (s.w / 2 - 10))
    const y = Math.round(s.y + s.h / 2 + Math.sin(a) * (s.h / 2 - 9))
    const left = Math.sin(a) > 0
    ctx.fillStyle = c
    ctx.fillRect(x, y + 2, 6, 3)
    ctx.fillRect(left ? x : x + 3, y, 3, 3)
    ctx.fillStyle = '#e8915a'
    ctx.fillRect(left ? x - 1 : x + 6, y + 1, 1, 1)
    ctx.fillStyle = '#1a1424'
    ctx.fillRect(left ? x + 1 : x + 4, y + 1, 1, 1)
  })
}

// esteira rolante: setinhas andando para a direita
export function drawConveyorScreen(ctx, s, t) {
  ctx.fillStyle = '#f2c14e'
  const off = Math.floor((t * 18) % 12)
  for (let x = off; x < s.w - 3; x += 12) {
    ctx.fillRect(s.x + x, s.y + 2, 1, 1)
    ctx.fillRect(s.x + x + 1, s.y + 3, 1, 1)
    ctx.fillRect(s.x + x + 2, s.y + 4, 1, 1)
    ctx.fillRect(s.x + x + 1, s.y + 5, 1, 1)
    ctx.fillRect(s.x + x, s.y + 6, 1, 1)
  }
}
// teletransporte: anéis de luz subindo
export function drawTeleportScreen(ctx, s, t) {
  for (let i = 0; i < 3; i += 1) {
    const k = (t * 0.8 + i / 3) % 1
    ctx.globalAlpha = 0.7 * (1 - k)
    ctx.fillStyle = '#bff8f0'
    const w = Math.round(s.w * (0.5 + k * 0.5))
    ctx.fillRect(s.x + Math.round((s.w - w) / 2), Math.round(s.y + s.h - k * s.h), w, 1)
  }
  ctx.globalAlpha = 1
  if (Math.floor(t * 6) % 4 === 0) {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(s.x + ((Math.floor(t * 7) * 7) % s.w), s.y + ((Math.floor(t * 5) * 5) % s.h), 1, 1)
  }
}
// holograma: planeta com anel girando, em cima do projetor
export function drawHologramScreen(ctx, s, t) {
  const cx = s.x + s.w / 2
  const cy = s.y + s.h / 2
  ctx.globalAlpha = 0.75
  for (let y = -7; y <= 7; y += 1) {
    const half = Math.round(Math.sqrt(49 - y * y))
    const band = Math.floor((y + 7 + t * 4) / 3) % 2
    ctx.fillStyle = band ? '#5eead4' : '#3ab8a8'
    ctx.fillRect(Math.round(cx - half), Math.round(cy + y), half * 2, 1)
  }
  ctx.fillStyle = '#bff8f0'
  const a = t * 1.5
  for (let i = 0; i < 24; i += 1) {
    const ang = (i / 24) * Math.PI * 2 + a
    const x = cx + Math.cos(ang) * 13
    const y = cy + Math.sin(ang) * 3
    if (Math.sin(ang) < 0 && Math.abs(x - cx) < 7) continue
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1)
  }
  ctx.globalAlpha = 0.18
  ctx.fillStyle = '#5eead4'
  ctx.fillRect(Math.round(cx - 8), Math.round(cy + 8), 16, Math.round(s.y + s.h - cy - 8))
  ctx.globalAlpha = 1
}

// relógio de pêndulo: o pêndulo balança na janelinha
export function drawPendulumScreen(ctx, s, t) {
  const ang = Math.sin(t * 3.2) * 0.38
  const cx = s.x + s.w / 2
  ctx.fillStyle = '#c8962a'
  for (let k = 0; k < s.h - 5; k += 1) ctx.fillRect(Math.round(cx + Math.sin(ang) * k) - 0.5, s.y + k, 1, 1)
  const bx = Math.round(cx + Math.sin(ang) * (s.h - 5))
  ctx.fillStyle = '#f2c14e'
  ctx.fillRect(bx - 2, s.y + s.h - 6, 4, 4)
  ctx.fillStyle = '#fff2a0'
  ctx.fillRect(bx - 1, s.y + s.h - 5, 1, 1)
}
// simulador de corrida: estrada andando nas três telas
export function drawRaceScreen(ctx, s, t) {
  ;[0, 12, 24].forEach((ox, i) => {
    const x0 = s.x + ox
    ctx.fillStyle = '#5bc0eb'
    ctx.fillRect(x0, s.y, 10, 3)
    ctx.fillStyle = '#38a85a'
    ctx.fillRect(x0, s.y + 3, 10, 5)
    ctx.fillStyle = '#4a5060'
    const shift = i === 0 ? 3 : i === 2 ? -3 : 0
    for (let y = 0; y < 5; y += 1) {
      const half = 1 + y
      ctx.fillRect(x0 + 5 - half + Math.round((shift * (5 - y)) / 5), s.y + 3 + y, half * 2, 1)
    }
    if (i === 1) {
      ctx.fillStyle = '#ffffff'
      const k = Math.floor(t * 8) % 3
      ctx.fillRect(x0 + 5, s.y + 3 + k * 2, 1, 1)
      ctx.fillStyle = '#e05252'
      ctx.fillRect(x0 + 4, s.y + 6, 3, 2)
    }
  })
}
// balões flutuando
export function drawBalloonScreen(ctx, s, t) {
  ;[[3, 3, '#e05252'], [6, 0, '#f2c14e'], [10, 4, '#4d9ad8']].forEach(([dx, dy, c], i) => {
    const y = s.y + dy + Math.round(Math.sin(t * 1.6 + i * 1.3) * 1.5)
    const x = s.x + dx + Math.round(Math.sin(t * 1.1 + i) * 0.8)
    ctx.fillStyle = c
    ctx.fillRect(x + 1, y, 4, 1)
    ctx.fillRect(x, y + 1, 6, 5)
    ctx.fillRect(x + 1, y + 6, 4, 1)
    ctx.fillRect(x + 2, y + 7, 2, 1)
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.fillRect(x + 1, y + 1, 1, 2)
  })
}
// bolhinhas saindo dos frascos
export function drawBubbleScreen(ctx, s, t) {
  ;[[5, '#5ecb84'], [13, '#f2a0c8'], [22, '#c8a0f0']].forEach(([dx, c], i) => {
    for (let k = 0; k < 3; k += 1) {
      const p = (t * 0.9 + k / 3 + i * 0.21) % 1
      ctx.fillStyle = c
      ctx.fillRect(s.x + dx + Math.round(Math.sin(p * 9 + i) * 1.5), Math.round(s.y + s.h - p * s.h), 1 + (k % 2), 1 + (k % 2))
    }
  })
}
// robozinho: olhos que piscam e "boca" de luz
export function drawRobotScreen(ctx, s, t) {
  const blink = Math.floor(t * 10) % 37 === 0
  ctx.fillStyle = '#5eead4'
  ctx.fillRect(s.x + 1, s.y + (blink ? 2 : 1), 2, blink ? 1 : 2)
  ctx.fillRect(s.x + 5, s.y + (blink ? 2 : 1), 2, blink ? 1 : 2)
  ctx.fillStyle = Math.floor(t * 2) % 2 ? '#38d27a' : '#5eead4'
  ctx.fillRect(s.x + 2, s.y + 4, 4, 1)
}
// chafariz: gotinhas subindo e caindo dos dois lados
export function drawFountainScreen(ctx, s, t) {
  ctx.fillStyle = '#bfe8fb'
  for (let i = 0; i < 10; i += 1) {
    const p = (t * 0.9 + i / 10) % 1
    const side = i % 2 ? 1 : -1
    const x = s.x + s.w / 2 + side * p * (s.w / 2 - 2)
    const y = s.y + 2 + (p * p * 4 - p * 2.6) * 6 + p * (s.h - 6)
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1)
  }
  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  ctx.fillRect(s.x + s.w / 2 - 1, s.y, 2, 3)
}
