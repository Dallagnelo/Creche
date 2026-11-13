// Móveis desenhados por código em pixel art (TV, sofá, fliperama...). Mais móveis em roomSprites2.js.
// Cada desenho é feito uma vez num canvas pequeno e depois só é copiado (ampliado) na cena.
// As partes que mudam (tela da TV, do fliperama, luz da luminária) são desenhadas a cada quadro em RoomScene.

import { EXTRA_SPRITES } from './roomSprites2'
import { MORE_SPRITES } from './roomSprites3'
import { THEME_SPRITES } from './roomSprites4'
import { DECOR_SPRITES } from './roomSprites5'

export const OUT = '#2a1b12'

export const shadeHex = (hex, amount) => {
  const n = parseInt(hex.slice(1), 16)
  const ch = (shift) => Math.max(0, Math.min(255, Math.round(((n >> shift) & 255) * (1 + amount))))
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`
}
export const DARK = '#1a1424'

export function sprite(w, h, paint) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  const r = (x, y, rw, rh, color) => {
    ctx.fillStyle = color
    ctx.fillRect(x, y, rw, rh)
  }
  paint(r, ctx)
  return canvas
}

// caixa com contorno, brilho em cima e sombra embaixo
export function box(r, x, y, w, h, base, light, shade, outline = OUT) {
  r(x, y, w, h, outline)
  r(x + 1, y + 1, w - 2, h - 2, base)
  if (light) r(x + 1, y + 1, w - 2, 1, light)
  if (shade) r(x + 1, y + h - 2, w - 2, 1, shade)
}

const SPRITES = {
  // ---- parede
  window: () =>
    sprite(18, 24, (r) => {
      box(r, 0, 0, 18, 22, '#9a6a40', '#c08a52', '#7a4c2a')
      r(2, 2, 14, 17, '#8ec8f0')
      r(2, 2, 14, 5, '#b8e0ff')
      r(4, 4, 4, 1, '#ffffff')
      r(10, 9, 5, 2, '#ffffff')
      r(2, 14, 14, 5, '#7ab0dc')
      r(8, 2, 2, 17, '#9a6a40')
      r(2, 10, 14, 1, '#9a6a40')
      // cortinas
      r(1, 1, 3, 19, '#e8915a')
      r(14, 1, 3, 19, '#e8915a')
      r(1, 1, 1, 19, '#c8703a')
      r(16, 1, 1, 19, '#c8703a')
      r(0, 0, 18, 2, '#5a361e')
      box(r, 0, 20, 18, 4, '#c08a52', '#d8a46a', null)
    }),
  frame: (variant = '0') =>
    sprite(12, 12, (r) => {
      box(r, 0, 0, 12, 12, '#d8a840', '#f2c860', '#a87820', '#5a361e')
      const v = Number(variant)
      const sky = ['#8ec8f0', '#f2a65a', '#a066d0'][v % 3]
      r(2, 2, 8, 8, sky)
      if (v % 3 === 0) {
        r(2, 7, 8, 3, '#38d27a')
        r(6, 3, 2, 2, '#ffe08a')
      } else if (v % 3 === 1) {
        r(2, 6, 8, 4, '#3a2a66')
        r(4, 3, 3, 2, '#ffe08a')
      } else {
        r(4, 4, 4, 4, '#f2c14e')
        r(5, 5, 2, 2, '#e05252')
      }
    }),
  clock: () =>
    sprite(12, 12, (r) => {
      r(3, 0, 6, 12, OUT)
      r(0, 3, 12, 6, OUT)
      r(1, 1, 10, 10, OUT)
      r(2, 1, 8, 10, '#f6f1e6')
      r(1, 2, 10, 8, '#f6f1e6')
      r(5, 3, 1, 3, DARK)
      r(6, 5, 3, 1, DARK)
      r(5, 5, 1, 1, '#e05252')
      r(5, 1, 2, 1, '#9a6a40')
    }),
  wallshelf: () =>
    sprite(24, 14, (r) => {
      r(3, 1, 3, 7, '#e05252')
      r(6, 2, 2, 6, '#4d7fc6')
      r(8, 0, 3, 8, '#f2c14e')
      r(14, 4, 5, 4, '#c8703a')
      r(15, 1, 1, 3, '#38d27a')
      r(17, 0, 1, 4, '#38d27a')
      r(16, 2, 1, 2, '#5ecb84')
      box(r, 0, 8, 24, 4, '#9a6a40', '#c08a52', '#7a4c2a')
      r(3, 12, 2, 2, '#5a361e')
      r(19, 12, 2, 2, '#5a361e')
    }),

  // ---- quarto
  bed: (color = '4d7fc6') =>
    sprite(32, 34, (r) => {
      const c = `#${color}`
      box(r, 0, 0, 32, 12, '#8a5a34', '#b4804c', '#6a4226')
      r(3, 3, 26, 1, '#a06a3c')
      box(r, 1, 8, 30, 25, '#e8eef2', '#ffffff', '#c0c8d0')
      box(r, 5, 9, 22, 8, '#ffffff', null, '#d8e0e8', '#9aa6b2')
      r(7, 11, 18, 1, '#eef2f6')
      box(r, 1, 17, 30, 16, c, shadeHex(c, 0.3), shadeHex(c, -0.3))
      r(1, 17, 30, 3, '#f6f1e6')
      r(1, 19, 30, 1, '#d8d0c0')
      ;[6, 14, 22].forEach((x) => r(x, 24, 4, 4, shadeHex(c, 0.15)))
      r(0, 32, 3, 2, OUT)
      r(29, 32, 3, 2, OUT)
    }),
  mirror: () =>
    sprite(14, 30, (r) => {
      r(2, 0, 10, 24, '#5a361e')
      r(1, 2, 12, 20, '#5a361e')
      r(3, 1, 8, 22, '#d8a840')
      r(2, 3, 10, 18, '#d8a840')
      r(4, 2, 6, 20, '#bfe3f2')
      r(3, 4, 8, 16, '#bfe3f2')
      r(5, 4, 1, 6, '#ffffff')
      r(6, 5, 1, 3, '#ffffff')
      r(9, 14, 1, 5, '#9ccde0')
      r(6, 24, 2, 3, '#5a361e')
      r(3, 27, 8, 3, '#5a361e')
      r(4, 27, 6, 1, '#8a5a34')
    }),
  plant: (variant = '0') =>
    sprite(14, 22, (r) => {
      const big = variant === '1'
      if (variant === '2') {
        // cacto
        r(5, 2, 4, 10, '#38a85a')
        r(6, 2, 1, 9, '#5ecb84')
        r(2, 5, 3, 2, '#38a85a')
        r(2, 3, 2, 3, '#38a85a')
        r(9, 6, 3, 2, '#38a85a')
        r(10, 4, 2, 3, '#38a85a')
        r(6, 1, 2, 1, '#e86aa0')
        box(r, 3, 12, 8, 8, '#d8c8a8', '#f6f1e6', '#b0a080')
        return
      }
      if (variant === '3') {
        // flores
        r(4, 6, 1, 6, '#24804a')
        r(7, 4, 1, 8, '#24804a')
        r(10, 6, 1, 6, '#24804a')
        ;[[3, 4, '#e05252'], [6, 2, '#f2c14e'], [9, 4, '#e86aa0'], [5, 7, '#a066d0'], [9, 8, '#f6f1e6']].forEach(([x, y, col]) => {
          r(x, y, 3, 3, col)
          r(x + 1, y + 1, 1, 1, '#f2c14e')
        })
        box(r, 2, 12, 10, 8, '#4d7fc6', '#7aa6e6', '#2f5c9e')
        return
      }
      const leaf = '#38a85a'
      const leafLight = '#5ecb84'
      const leafDark = '#24804a'
      if (big) {
        r(6, 1, 2, 12, leafDark)
        r(2, 2, 4, 5, leaf)
        r(8, 0, 4, 5, leaf)
        r(1, 7, 5, 4, leaf)
        r(8, 6, 5, 5, leaf)
        r(3, 3, 1, 3, leafLight)
        r(9, 1, 2, 2, leafLight)
        r(9, 7, 2, 2, leafLight)
      } else {
        r(3, 4, 8, 7, leaf)
        r(1, 6, 3, 4, leaf)
        r(10, 5, 3, 4, leaf)
        r(5, 1, 4, 4, leaf)
        r(4, 5, 2, 2, leafLight)
        r(8, 3, 2, 2, leafLight)
        r(6, 8, 3, 2, leafDark)
      }
      box(r, 2, 12, 10, 10, '#c8703a', '#e8915a', '#9a4a22')
      r(1, 12, 12, 2, '#a85a2a')
    }),

  // ---- cozinha e sala
  counter: () =>
    sprite(80, 26, (r) => {
      // armários de cima (na parede)
      box(r, 0, 0, 30, 9, '#e8eef2', '#ffffff', '#c0c8d0', '#5a6270')
      box(r, 50, 0, 30, 9, '#e8eef2', '#ffffff', '#c0c8d0', '#5a6270')
      ;[14, 64].forEach((x) => r(x, 3, 2, 3, '#9aa6b2'))
      // balcão
      box(r, 0, 12, 80, 14, '#e8eef2', '#ffffff', '#b9c3cc', '#5a6270')
      r(1, 12, 78, 3, '#8a96a6')
      r(1, 12, 78, 1, '#aab4c2')
      // pia
      r(6, 13, 14, 2, '#5a6270')
      r(12, 10, 2, 3, '#9aa6b2')
      // fogão
      r(32, 12, 18, 14, '#2b2f3c')
      r(32, 12, 18, 3, '#3a4156')
      r(35, 13, 3, 1, '#e05252')
      r(44, 13, 3, 1, '#e05252')
      r(34, 17, 14, 7, '#1b1f2b')
      r(35, 18, 12, 1, '#4a5060')
      // tábua com legumes
      r(56, 12, 12, 3, '#c08a52')
      r(58, 12, 2, 2, '#e05252')
      r(62, 12, 3, 2, '#f2c14e')
      r(66, 11, 2, 3, '#38d27a')
      // portas
      ;[3, 17, 53, 66].forEach((x) => {
        r(x, 17, 11, 7, '#d8e0e8')
        r(x + 9, 19, 1, 3, '#7a8592')
      })
    }),
  piano: () =>
    sprite(32, 32, (r) => {
      box(r, 0, 0, 32, 30, '#2b1f2a', '#3d2c3c', '#1a1218', DARK)
      r(2, 2, 28, 2, '#4a3848')
      box(r, 11, 4, 10, 7, '#f6f1e6', null, null, '#8a8070')
      r(13, 6, 6, 1, '#7a7060')
      r(13, 8, 4, 1, '#7a7060')
      r(1, 14, 30, 6, '#f6f1e6')
      for (let x = 3; x < 30; x += 3) r(x, 14, 1, 6, '#b8b0a0')
      for (let x = 2; x < 30; x += 3) if (x % 7 !== 0) r(x, 14, 2, 3, DARK)
      r(1, 20, 30, 1, '#1a1218')
      r(3, 22, 26, 6, '#3d2c3c')
      r(14, 27, 4, 1, '#d8a840')
      r(2, 30, 3, 2, DARK)
      r(27, 30, 3, 2, DARK)
    }),
  armchair: (color = 'e8915a') =>
    sprite(18, 20, (r) => {
      const base = `#${color}`
      const dark = shadeHex(base, -0.22)
      const light = shadeHex(base, 0.25)
      box(r, 2, 0, 14, 12, base, light, dark)
      box(r, 0, 6, 5, 11, base, light, dark)
      box(r, 13, 6, 5, 11, base, light, dark)
      box(r, 4, 10, 10, 7, base, light, dark)
      r(5, 11, 8, 1, light)
      r(1, 17, 2, 3, OUT)
      r(15, 17, 2, 3, OUT)
    }),
  chair: (side = 'l') =>
    sprite(12, 20, (r) => {
      const flip = side === 'r'
      const X = (x, w) => (flip ? 12 - x - w : x)
      r(X(1, 3), 0, 3, 13, OUT)
      r(X(2, 1), 1, 1, 11, '#b4804c')
      r(X(1, 10), 10, 10, 4, OUT)
      r(X(2, 8), 11, 8, 2, '#c08a52')
      r(X(3, 6), 10, 6, 1, '#e05252')
      r(X(2, 1), 14, 1, 6, OUT)
      r(X(9, 1), 14, 1, 6, OUT)
    }),
  table: () =>
    sprite(22, 18, (r) => {
      r(2, 0, 18, 12, OUT)
      r(0, 2, 22, 8, OUT)
      r(3, 1, 16, 10, '#c08a52')
      r(1, 3, 20, 6, '#c08a52')
      r(3, 1, 16, 2, '#d8a46a')
      r(8, 9, 6, 2, '#a06a3c')
      r(9, 11, 4, 6, OUT)
      r(6, 16, 10, 2, OUT)
      // vaso de flores
      r(9, 2, 4, 4, '#4d7fc6')
      r(10, 0, 1, 2, '#e86aa0')
      r(12, 0, 1, 2, '#f2c14e')
    }),
  speaker: () =>
    sprite(14, 28, (r) => {
      box(r, 0, 0, 14, 28, '#2b2f3c', '#3f4456', '#1b1f2b', DARK)
      r(4, 3, 6, 6, '#1b1f2b')
      r(5, 4, 4, 4, '#4a5060')
      r(6, 5, 2, 2, '#9aa0ad')
      r(2, 12, 10, 10, '#1b1f2b')
      r(3, 13, 8, 8, '#4a5060')
      r(5, 15, 4, 4, '#1b1f2b')
      r(6, 16, 2, 2, '#9aa0ad')
      r(6, 24, 2, 1, '#38d27a')
    }),
  rug: (color = 'e05252', w = '3', h = '2') =>
    sprite(Number(w) * 16, Number(h) * 16, (r) => {
      const W = Number(w) * 16
      const H = Number(h) * 16
      const base = `#${color}`
      const dark = shadeHex(base, -0.25)
      const light = shadeHex(base, 0.25)
      r(2, 2, W - 4, H - 4, dark)
      r(3, 3, W - 6, H - 6, base)
      r(6, 6, W - 12, H - 12, light)
      r(7, 7, W - 14, H - 14, base)
      for (let x = 10; x < W - 10; x += 6) r(x, H / 2 - 1, 2, 2, light)
      for (let x = 4; x < W - 4; x += 2) {
        r(x, 0, 1, 2, '#f6f1e6')
        r(x, H - 2, 1, 2, '#f6f1e6')
      }
    }),
  // TV em cima do rack (3 quadradinhos de largura). Tela: x 9..38, y 3..15
  tv: () =>
    sprite(48, 34, (r) => {
      // rack
      box(r, 0, 18, 48, 15, '#8a5a34', '#b4804c', '#6a4226')
      r(1, 19, 46, 2, '#c08a52')
      box(r, 3, 22, 13, 9, '#7a4c2a', '#94603a', null, '#4a2c18')
      box(r, 32, 22, 13, 9, '#7a4c2a', '#94603a', null, '#4a2c18')
      r(13, 26, 1, 2, '#e8c070')
      r(34, 26, 1, 2, '#e8c070')
      r(17, 22, 14, 9, '#3a2416')
      // videogame na prateleira do meio
      box(r, 18, 25, 12, 5, '#e6e9ef', '#ffffff', '#b8bcc6', DARK)
      r(20, 27, 1, 1, '#38d27a')
      r(24, 27, 4, 1, '#9aa0ad')
      // pés
      r(2, 33, 3, 1, OUT)
      r(43, 33, 3, 1, OUT)
      // TV
      r(22, 16, 4, 3, '#1b1f2b')
      r(18, 18, 12, 1, '#1b1f2b')
      box(r, 6, 0, 36, 18, '#262b3a', '#3a4156', '#1b1f2b', '#0c0e15')
      r(9, 3, 30, 12, '#121a26')
      r(39, 15, 2, 1, '#e05252')
    }),

  // sofá visto de costas (4 quadradinhos), virado para a TV
  sofa: (color = '3a6db4') =>
    sprite(64, 24, (r) => {
      const c = `#${color}`
      const arm = shadeHex(c, -0.12)
      box(r, 0, 4, 9, 18, arm, shadeHex(c, 0.15), shadeHex(c, -0.35))
      box(r, 55, 4, 9, 18, arm, shadeHex(c, 0.15), shadeHex(c, -0.35))
      box(r, 6, 0, 52, 21, c, shadeHex(c, 0.3), shadeHex(c, -0.25))
      r(7, 2, 50, 2, shadeHex(c, 0.12))
      r(23, 3, 1, 16, shadeHex(c, -0.25))
      r(40, 3, 1, 16, shadeHex(c, -0.25))
      // costura e reflexo
      r(9, 8, 12, 1, shadeHex(c, 0.18))
      r(26, 8, 12, 1, shadeHex(c, 0.18))
      r(43, 8, 12, 1, shadeHex(c, 0.18))
      // pés
      r(3, 22, 3, 2, OUT)
      r(58, 22, 3, 2, OUT)
      r(20, 21, 3, 3, OUT)
      r(41, 21, 3, 3, OUT)
    }),

  // mesinha de centro com caneca e controle
  coffee: () =>
    sprite(32, 14, (r) => {
      box(r, 0, 0, 32, 10, '#a06a3c', '#c48a54', '#7a4c2a')
      r(2, 10, 2, 4, OUT)
      r(28, 10, 2, 4, OUT)
      r(2, 2, 28, 1, '#d29a62')
      box(r, 6, 3, 5, 5, '#e8eef2', '#ffffff', '#c0c8d0', DARK)
      r(11, 4, 1, 2, DARK)
      box(r, 18, 4, 8, 3, '#2b2f3c', '#3f4456', null, DARK)
      r(20, 5, 1, 1, '#e05252')
      r(22, 5, 1, 1, '#38d27a')
    }),

  // fliperama. Tela: x 3..12, y 7..14
  arcade: () =>
    sprite(16, 32, (r) => {
      box(r, 0, 0, 16, 32, '#5b3aa0', '#7a56c4', '#43287c', DARK)
      box(r, 1, 1, 14, 5, '#f2c14e', '#ffe08a', '#c8962a', DARK)
      r(4, 3, 8, 1, '#e05252')
      r(2, 6, 12, 10, '#140f22')
      r(3, 7, 10, 8, '#0b1a2a')
      box(r, 1, 16, 14, 5, '#3a2a66', '#4a3880', null, DARK)
      r(4, 17, 2, 2, '#e05252')
      r(4, 19, 1, 1, '#9aa0ad')
      r(9, 18, 2, 1, '#38d27a')
      r(12, 18, 2, 1, '#5eead4')
      r(3, 23, 10, 6, '#43287c')
      r(6, 25, 4, 2, '#f2c14e')
      r(1, 31, 14, 1, DARK)
    }),

  // geladeira
  fridge: () =>
    sprite(16, 32, (r) => {
      box(r, 0, 0, 16, 32, '#e8eef2', '#ffffff', '#b9c3cc', '#3a4250')
      r(1, 11, 14, 1, '#9aa6b2')
      r(12, 4, 1, 5, '#7a8592')
      r(12, 14, 1, 9, '#7a8592')
      r(2, 2, 4, 2, '#f2c14e')
      r(3, 14, 3, 3, '#e05252')
      r(7, 15, 2, 2, '#5eead4')
      r(14, 1, 1, 30, '#cfd8e0')
    }),

  // estante com livros
  bookshelf: () =>
    sprite(32, 32, (r) => {
      box(r, 0, 0, 32, 32, '#7a4c2a', '#94603a', '#5a361e')
      const colors = ['#e05252', '#f2c14e', '#38d27a', '#4d7fc6', '#a066d0', '#5eead4', '#e8915a', '#e8eef2']
      ;[3, 13, 23].forEach((shelfY, row) => {
        r(2, shelfY, 28, 8, '#3a2416')
        let x = 3
        let i = row * 3
        while (x < 28) {
          const w = 2 + ((i * 7) % 3)
          const h = 5 + ((i * 5) % 3)
          r(x, shelfY + 8 - h, w, h, colors[i % colors.length])
          r(x, shelfY + 8 - h, w, 1, 'rgba(255,255,255,0.35)')
          x += w + 1
          i += 1
          if (row === 1 && x > 18 && x < 22) x += 4
        }
        r(1, shelfY + 8, 30, 2, '#a06a3c')
      })
      // vaso pequeno
      r(20, 18, 3, 3, '#5eead4')
      r(21, 15, 1, 3, '#38d27a')
    }),

  // quadro de cortiça com fotos (mural)
  board: () =>
    sprite(30, 20, (r) => {
      box(r, 0, 0, 30, 20, '#c99a5b', '#dcae70', '#b0824a', '#5a361e')
      r(1, 1, 28, 1, '#8a5a34')
      r(1, 18, 28, 1, '#8a5a34')
      const photos = [
        [3, 3, '#4d7fc6'], [11, 5, '#38d27a'], [19, 3, '#e8915a'], [5, 11, '#a066d0'], [14, 12, '#f2c14e'], [22, 11, '#e05252'],
      ]
      photos.forEach(([x, y, c]) => {
        r(x, y, 7, 6, '#f6f1e6')
        r(x + 1, y + 1, 5, 3, c)
        r(x + 3, y - 1, 1, 1, '#e05252')
      })
    }),

  // calendário de parede
  calendar: () =>
    sprite(12, 14, (r) => {
      box(r, 0, 0, 12, 14, '#f6f1e6', null, '#d8d0c0', '#5a361e')
      r(1, 1, 10, 3, '#e05252')
      r(3, 0, 1, 2, DARK)
      r(8, 0, 1, 2, DARK)
      for (let y = 6; y < 12; y += 2) for (let x = 2; x < 10; x += 2) r(x, y, 1, 1, '#7a8592')
      r(6, 8, 1, 1, '#e05252')
    }),

  // luminária de chão (a luz é desenhada à parte quando está ligada)
  lamp: () =>
    sprite(12, 30, (r) => {
      r(1, 0, 10, 8, '#5a361e')
      r(2, 1, 8, 6, '#f2d79a')
      r(2, 1, 8, 1, '#fff2c8')
      r(5, 8, 2, 19, '#3a4250')
      r(2, 27, 8, 3, '#2b2f3c')
      r(2, 27, 8, 1, '#4a5060')
    }),

  // vitrola (caixa de som)
  vinyl: () =>
    sprite(16, 16, (r) => {
      box(r, 0, 6, 16, 10, '#7a4c2a', '#94603a', '#5a361e')
      r(2, 8, 12, 6, '#3a2416')
      r(2, 0, 12, 7, OUT)
      r(3, 1, 10, 5, '#1b1f2b')
      r(6, 2, 4, 3, '#2b2f3c')
      r(7, 3, 2, 1, '#e05252')
      r(12, 1, 1, 4, '#c0c8d0')
    }),
}

Object.assign(SPRITES, EXTRA_SPRITES, MORE_SPRITES, THEME_SPRITES, DECOR_SPRITES)

const cache = new Map()
/** Nome com parâmetros separados por ":" (ex.: "rug:38a85a:3:2", "plant:1"). */
export function getSprite(name) {
  if (!cache.has(name)) {
    const [base, ...args] = name.split(':')
    cache.set(name, SPRITES[base]?.(...args) ?? null)
  }
  return cache.get(name)
}
