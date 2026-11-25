// Efeitos visuais das habilidades da Turma 2.0 (desenhados em código, no estilo pixel).
// Cada efeito nasce em cima de quem usou (alguns seguem a pessoa) e some sozinho.
// Por enquanto é só visual: não mexe em vida, energia nem em ninguém.

const T = 16
export const FX_DUR = { cura: 1.5, escudo: 3, velocidade: 1.6, area: 1.1, projetil: 1.2, agua: 1.4, ajudante: 6, revelar: 2.2, humor: 2.2, hacker: 1.6, comida: 2.2 }
const DIR_V = { right: [1, 0], left: [-1, 0], up: [0, -1], down: [0, 1] }
// efeitos que acompanham a pessoa enquanto duram
const FOLLOW = new Set(['escudo', 'velocidade', 'ajudante', 'humor', 'hacker', 'comida', 'cura'])

const rgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a))})`
}
// número pseudoaleatório fixo por partícula (o efeito não "treme" de um quadro para o outro)
const rnd = (seed) => {
  const x = Math.sin(seed * 9301 + 49297) * 233280
  return x - Math.floor(x)
}

function cross(ctx, x, y, c) {
  ctx.fillStyle = c
  ctx.fillRect(Math.round(x) - 1, Math.round(y) - 3, 3, 7)
  ctx.fillRect(Math.round(x) - 3, Math.round(y) - 1, 7, 3)
}
function heart(ctx, x, y, c) {
  ctx.fillStyle = c
  const X = Math.round(x)
  const Y = Math.round(y)
  ctx.fillRect(X - 3, Y - 2, 2, 2)
  ctx.fillRect(X + 1, Y - 2, 2, 2)
  ctx.fillRect(X - 3, Y, 6, 2)
  ctx.fillRect(X - 2, Y + 2, 4, 1)
  ctx.fillRect(X - 1, Y + 3, 2, 1)
}
function star(ctx, x, y, c, s = 1) {
  ctx.fillStyle = c
  const X = Math.round(x)
  const Y = Math.round(y)
  ctx.fillRect(X, Y - 2 * s, s, 5 * s)
  ctx.fillRect(X - 2 * s, Y, 5 * s, s)
}
function note(ctx, x, y, c) {
  ctx.fillStyle = c
  const X = Math.round(x)
  const Y = Math.round(y)
  ctx.fillRect(X, Y - 5, 1, 6)
  ctx.fillRect(X + 1, Y - 5, 3, 1)
  ctx.fillRect(X + 3, Y - 5, 1, 2)
  ctx.fillRect(X - 2, Y, 3, 2)
}
function ellipse(ctx, x, y, rx, ry) {
  ctx.beginPath()
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2)
}

/**
 * desenha um efeito; fx = { kind, color, range, name, t0, x, y, dir }, me = posição atual de quem usou.
 * Retorna false quando o efeito acabou.
 */
export function drawEffect(ctx, fx, me, now, sprites = {}) {
  const dur = FX_DUR[fx.kind] ?? 1.2
  const t = now - fx.t0
  if (t > dur + 0.9) return false
  const k = Math.min(1, t / dur)
  const follow = FOLLOW.has(fx.kind)
  const px = (follow ? me.fx : fx.x) * T + T / 2
  const foot = ((follow ? me.fy : fx.y) + 1) * T - 2
  const body = foot - 14
  const c = fx.color
  const fade = t > dur ? 1 - (t - dur) / 0.4 : 1

  if (t <= dur) {
    switch (fx.kind) {
      case 'cura': {
        ctx.strokeStyle = rgba(c, 0.6 * (1 - k))
        ctx.lineWidth = 1.5
        ellipse(ctx, px, foot, 6 + k * 12, 3 + k * 5)
        ctx.stroke()
        for (let i = 0; i < 9; i += 1) {
          const life = (k * 1.4 + rnd(i) * 0.6) % 1
          const x = px + (rnd(i + 7) - 0.5) * 22
          const y = foot - 4 - life * 28
          const a = Math.sin(life * Math.PI)
          if (i % 3 === 0) heart(ctx, x, y, rgba('#ff6b7a', a))
          else cross(ctx, x, y, rgba(c, a))
        }
        break
      }
      case 'escudo': {
        const pulse = 0.5 + Math.sin(t * 8) * 0.15
        const r = 13 + Math.min(1, t * 6) * 2
        ctx.fillStyle = rgba(c, 0.14 * pulse * 2)
        ellipse(ctx, px, body, r, r + 2)
        ctx.fill()
        ctx.strokeStyle = rgba(c, 0.85)
        ctx.lineWidth = 1.5
        ctx.stroke()
        for (let i = 0; i < 6; i += 1) {
          const a = t * 2.4 + (i * Math.PI) / 3
          ctx.fillStyle = rgba('#ffffff', 0.9)
          ctx.fillRect(Math.round(px + Math.cos(a) * r) - 1, Math.round(body + Math.sin(a) * (r + 2)) - 1, 2, 2)
        }
        break
      }
      case 'velocidade': {
        const [vx, vy] = DIR_V[me.dir] ?? [0, 1]
        for (let i = 0; i < 6; i += 1) {
          const off = 6 + ((t * 60 + i * 9) % 26)
          const side = (rnd(i) - 0.5) * 14
          const x = px - vx * off + (vy ? side : 0)
          const y = body + 4 - vy * off + (vx ? side : 0)
          ctx.fillStyle = rgba(c, 0.8 * (1 - off / 32))
          if (vx) ctx.fillRect(Math.round(x), Math.round(y), 6, 1)
          else ctx.fillRect(Math.round(x), Math.round(y), 1, 6)
        }
        for (let i = 0; i < 4; i += 1) {
          const life = (t * 2 + rnd(i + 3)) % 1
          ctx.fillStyle = rgba('#e9d7b5', 0.7 * (1 - life))
          ellipse(ctx, px - vx * (4 + life * 10) + (rnd(i) - 0.5) * 6, foot - life * 3, 2 + life * 3, 1 + life * 2)
          ctx.fill()
        }
        break
      }
      case 'area': {
        const R = fx.range * T * Math.min(1, k * 1.3)
        ctx.strokeStyle = rgba(c, 0.9 * (1 - k))
        ctx.lineWidth = 2
        ellipse(ctx, px, foot, R, R * 0.55)
        ctx.stroke()
        ctx.fillStyle = rgba(c, 0.18 * (1 - k))
        ctx.fill()
        ctx.strokeStyle = rgba('#ffffff', 0.5 * (1 - k))
        ctx.lineWidth = 1
        ellipse(ctx, px, foot, R * 0.6, R * 0.33)
        ctx.stroke()
        break
      }
      case 'projetil': {
        const [vx, vy] = DIR_V[fx.dir] ?? [0, 1]
        const fly = 0.55
        const dist = fx.range * T
        if (t < fly) {
          const p = t / fly
          const x = px + vx * dist * p
          const y = body + vy * dist * p - Math.sin(p * Math.PI) * 14
          ctx.fillStyle = rgba('#ffffff', 0.9)
          ctx.fillRect(Math.round(x) - 2, Math.round(y) - 3, 4, 6)
          ctx.fillStyle = rgba(c, 1)
          ctx.fillRect(Math.round(x) - 2, Math.round(y), 4, 3)
          ctx.fillRect(Math.round(x) - 1, Math.round(y) - 5, 2, 2)
        } else {
          const p = (t - fly) / (dur - fly)
          const x = px + vx * dist
          const y = body + vy * dist + 10
          ctx.fillStyle = rgba(c, 0.35 * (1 - p))
          ellipse(ctx, x, y, 6 + p * 14, 3 + p * 7)
          ctx.fill()
          for (let i = 0; i < 10; i += 1) {
            const a = (i / 10) * Math.PI * 2
            ctx.fillStyle = rgba(i % 2 ? c : '#ffffff', 1 - p)
            ctx.fillRect(Math.round(x + Math.cos(a) * p * 16), Math.round(y - 4 + Math.sin(a) * p * 9 - p * 6), 2, 2)
          }
        }
        break
      }
      case 'agua': {
        const [vx, vy] = DIR_V[fx.dir] ?? [0, 1]
        const dist = fx.range * T
        for (let i = 0; i < 22; i += 1) {
          const life = (t * 1.6 + rnd(i)) % 1
          if (t < life * 0.4) continue
          const d = life * dist
          const spread = (rnd(i + 11) - 0.5) * (4 + d * 0.25)
          const x = px + vx * d + (vy ? spread : 0)
          const y = body + 2 + vy * d + (vx ? spread : 0) - Math.sin(life * Math.PI) * 6 + life * 4
          ctx.fillStyle = rgba(i % 4 ? c : '#ffffff', 0.9 * (1 - life * 0.5))
          ctx.fillRect(Math.round(x), Math.round(y), 2, 2)
        }
        break
      }
      case 'ajudante': {
        const a = t * 2.2
        const x = px + Math.cos(a) * 16
        const y = body - 14 + Math.sin(a * 2) * 3
        ctx.fillStyle = 'rgba(0,0,0,0.25)'
        ellipse(ctx, px + Math.cos(a) * 16, foot, 5, 2)
        ctx.fill()
        const d = sprites.drone
        if (d) {
          const f = Math.floor(t * 12) % d.frames
          ctx.drawImage(d.img, d.x + f * d.fw, d.y, d.fw, d.fh, Math.round(x - d.fw / 2), Math.round(y - d.fh / 2), d.fw, d.fh)
        } else {
          ctx.fillStyle = '#3b4a63'
          ctx.fillRect(Math.round(x) - 4, Math.round(y) - 2, 8, 4)
          ctx.fillStyle = rgba(c, 1)
          ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2)
          ctx.fillStyle = 'rgba(220,230,255,0.8)'
          ctx.fillRect(Math.round(x) - 7, Math.round(y) - 4, 5, 1)
          ctx.fillRect(Math.round(x) + 2, Math.round(y) - 4, 5, 1)
        }
        if (Math.floor(t * 4) % 2) star(ctx, x + 6, y - 6, rgba(c, 0.9))
        break
      }
      case 'revelar': {
        const R = fx.range * T
        const a = t * 3
        ctx.strokeStyle = rgba(c, 0.5 * (1 - k))
        ctx.lineWidth = 1
        ellipse(ctx, px, foot, R, R * 0.55)
        ctx.stroke()
        ctx.strokeStyle = rgba(c, 0.8 * (1 - k * 0.6))
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(px, foot)
        ctx.lineTo(px + Math.cos(a) * R, foot + Math.sin(a) * R * 0.55)
        ctx.stroke()
        for (let i = 0; i < 8; i += 1) {
          const life = (k * 2 + rnd(i)) % 1
          const ang = rnd(i + 3) * Math.PI * 2
          const rr = rnd(i + 5) * R
          star(ctx, px + Math.cos(ang) * rr, foot + Math.sin(ang) * rr * 0.55 - 4, rgba('#fffbe0', Math.sin(life * Math.PI)))
        }
        // lupa em cima da cabeça
        const lx = Math.round(px + 7)
        const ly = Math.round(body - 16 + Math.sin(t * 5) * 1.5)
        ctx.strokeStyle = '#4a2e22'
        ctx.lineWidth = 1.5
        ellipse(ctx, lx, ly, 3.5, 3.5)
        ctx.stroke()
        ctx.fillStyle = 'rgba(190,230,255,0.8)'
        ctx.fill()
        ctx.fillStyle = '#4a2e22'
        ctx.fillRect(lx + 2, ly + 3, 2, 2)
        ctx.fillRect(lx + 4, ly + 5, 2, 2)
        break
      }
      case 'humor': {
        for (let i = 0; i < 8; i += 1) {
          const life = (k * 1.5 + rnd(i)) % 1
          const x = px + (rnd(i + 2) - 0.5) * 26 + Math.sin(life * 6 + i) * 3
          const y = body - 6 - life * 26
          const a = Math.sin(life * Math.PI)
          if (i % 2) note(ctx, x, y, rgba(c, a))
          else star(ctx, x, y, rgba('#ffe28a', a))
        }
        break
      }
      case 'hacker': {
        ctx.font = 'bold 6px monospace'
        ctx.textAlign = 'center'
        for (let i = 0; i < 10; i += 1) {
          const life = (k * 1.8 + rnd(i)) % 1
          const x = px + (rnd(i + 4) - 0.5) * 24
          const y = body - life * 24
          ctx.fillStyle = rgba(c, Math.sin(life * Math.PI))
          ctx.fillText(rnd(i + Math.floor(t * 6)) > 0.5 ? '1' : '0', x, y)
        }
        for (let i = 0; i < 3; i += 1) {
          if (rnd(i + Math.floor(t * 14)) < 0.5) continue
          const x = px + (rnd(i * 3 + Math.floor(t * 14)) - 0.5) * 18
          const y = body - 4 + (rnd(i * 5) - 0.5) * 10
          ctx.fillStyle = rgba('#ffffff', 0.9)
          ctx.fillRect(Math.round(x), Math.round(y), 3, 1)
          ctx.fillRect(Math.round(x) + 1, Math.round(y) - 1, 1, 3)
        }
        break
      }
      case 'comida': {
        for (let i = 0; i < 6; i += 1) {
          const life = (k * 1.3 + rnd(i)) % 1
          const x = px + (rnd(i + 1) - 0.5) * 16 + Math.sin(life * 8 + i) * 2
          const y = body - 4 - life * 22
          ctx.fillStyle = rgba('#ffffff', 0.55 * Math.sin(life * Math.PI))
          ellipse(ctx, x, y, 2 + life * 2, 1.5 + life)
          ctx.fill()
        }
        for (let i = 0; i < 3; i += 1) {
          const life = (k * 1.1 + rnd(i + 9)) % 1
          heart(ctx, px + (rnd(i + 6) - 0.5) * 18, body - 8 - life * 18, rgba(c, Math.sin(life * Math.PI)))
        }
        break
      }
      default:
        break
    }
  }

  // nome da habilidade em cima da cabeça
  if (fx.name && t < 1.1) {
    const p = Math.min(1, t / 0.15)
    const y = Math.round(body - 22 - p * 4)
    ctx.font = 'bold 7px sans-serif'
    ctx.textAlign = 'center'
    ctx.lineWidth = 2.5
    ctx.strokeStyle = rgba('#1a1009', 0.9 * Math.min(1, (1.1 - t) * 3))
    ctx.strokeText(fx.name, px, y)
    ctx.fillStyle = rgba(c, Math.min(1, (1.1 - t) * 3))
    ctx.fillText(fx.name, px, y)
  }
  void fade
  return true
}
