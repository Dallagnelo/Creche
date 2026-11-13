// Lote grande de decoração para o quarto (coleções: zen, gamer, infantil, música, natureza, ciência, parede e tapetes).
// Mesmo estilo pixel dos outros arquivos. Partes animadas são desenhadas em RoomScene (telas).
import { box, OUT, shadeHex, sprite } from './roomSprites'

const hex = (color) => `#${color}`
const WOOD = '#a06a3c'
const WOOD_L = '#c48a54'
const WOOD_D = '#7a4c2a'
const METAL = '#9aa6b2'
const METAL_D = '#6a7280'

export const DECOR_SPRITES = {
  // ================= zen
  sakura: () =>
    sprite(28, 44, (r) => {
      const p = ['#f4b6c8', '#e88aa8', '#fcd6e2']
      r(4, 4, 20, 14, p[0])
      r(1, 8, 26, 8, p[0])
      r(7, 1, 14, 5, p[0])
      r(6, 6, 8, 6, p[2])
      r(16, 9, 7, 5, p[1])
      r(3, 12, 6, 4, p[1])
      ;[[9, 3], [19, 6], [5, 10], [14, 14], [22, 12]].forEach(([x, y]) => r(x, y, 2, 2, '#ffffff'))
      // tronco torto
      r(13, 18, 3, 6, '#6a4024')
      r(11, 22, 3, 6, '#6a4024')
      r(12, 28, 4, 6, '#6a4024')
      r(16, 20, 4, 2, '#6a4024')
      box(r, 6, 34, 16, 10, '#3a3f4c', '#5a6070', '#2b2f3c', OUT)
      r(8, 34, 12, 2, '#5a361e')
    }),
  kotatsu: () =>
    sprite(32, 20, (r) => {
      // mesa baixinha com cobertor e uma fruteira
      r(2, 8, 28, 12, '#c83a4a')
      for (let x = 4; x < 30; x += 6) r(x, 9, 3, 10, '#e05252')
      r(2, 18, 28, 2, '#a02a3a')
      box(r, 0, 4, 32, 6, WOOD, WOOD_L, WOOD_D)
      r(12, 0, 8, 4, '#f6f1e6')
      r(13, 1, 2, 2, '#e8915a')
      r(16, 1, 2, 2, '#e8915a')
      r(15, 0, 2, 1, '#38a85a')
    }),
  lanternpaper: (color = 'e05252') =>
    sprite(14, 24, (r) => {
      const c = hex(color)
      r(6, 0, 2, 5, '#2b2f3c')
      r(3, 5, 8, 2, '#2b2f3c')
      r(1, 7, 12, 12, c)
      r(2, 7, 10, 12, shadeHex(c, 0.25))
      for (let y = 9; y < 19; y += 3) r(1, y, 12, 1, shadeHex(c, -0.25))
      r(5, 10, 4, 5, '#fff2c8')
      r(3, 19, 8, 2, '#2b2f3c')
      r(6, 21, 2, 3, c)
    }),

  // ================= gamer / streamer
  racingsim: () =>
    sprite(36, 34, (r) => {
      // três telas em cima
      ;[0, 12, 24].forEach((x) => {
        r(x, 0, 12, 10, '#1b1f2b')
        r(x + 1, 1, 10, 8, '#2b2f3c')
      })
      r(17, 10, 2, 6, METAL_D)
      // banco de corrida
      r(2, 14, 12, 16, '#e05252')
      r(4, 16, 8, 12, '#2b2f3c')
      r(2, 12, 12, 3, '#e05252')
      r(6, 13, 4, 1, '#ffffff')
      // volante e pedais
      r(20, 16, 10, 2, '#2b2f3c')
      r(19, 14, 12, 6, '#1b1f2b')
      r(23, 15, 4, 4, '#e05252')
      r(22, 20, 6, 10, METAL_D)
      r(1, 30, 34, 4, '#2b2f3c')
      r(26, 27, 6, 3, '#4a5060')
    }),
  streamsetup: () =>
    sprite(36, 32, (r) => {
      // ring light, monitor, câmera e microfone de braço
      for (let a = 0; a < 24; a += 1) {
        const ang = (a / 24) * Math.PI * 2
        r(Math.round(5 + Math.cos(ang) * 4), Math.round(5 + Math.sin(ang) * 4), 2, 2, '#fff6d0')
      }
      r(5, 11, 2, 8, METAL_D)
      r(12, 2, 16, 11, '#1b1f2b')
      r(13, 3, 14, 9, '#5a3a8a')
      r(14, 4, 4, 2, '#e05252')
      r(15, 9, 10, 1, '#e86aa0')
      r(19, 13, 2, 3, METAL_D)
      r(30, 3, 4, 3, '#2b2f3c')
      r(31, 4, 2, 1, '#e05252')
      r(28, 6, 1, 6, METAL_D)
      r(26, 11, 3, 5, '#2b2f3c')
      box(r, 0, 16, 36, 16, '#2b2f3c', '#4a5060', '#1b1f2b', OUT)
      r(2, 18, 32, 1, '#e86aa0')
      r(8, 20, 20, 3, '#1b1f2b')
      r(4, 26, 4, 6, '#1b1f2b')
      r(28, 26, 4, 6, '#1b1f2b')
    }),
  robotbuddy: () =>
    sprite(16, 24, (r) => {
      r(7, 0, 2, 3, METAL_D)
      r(6, 0, 4, 1, '#e05252')
      box(r, 2, 3, 12, 9, '#c8d2e0', '#e8eef2', METAL, '#4a5060')
      r(4, 5, 8, 5, '#1b2030')
      r(3, 12, 10, 8, '#c8d2e0')
      r(4, 13, 8, 6, '#9aa6b2')
      r(6, 14, 4, 3, '#4d9ad8')
      r(0, 13, 3, 6, METAL)
      r(13, 13, 3, 6, METAL)
      r(4, 20, 3, 4, '#4a5060')
      r(9, 20, 3, 4, '#4a5060')
    }),

  // ================= infantil
  rockinghorse: () =>
    sprite(24, 22, (r) => {
      r(1, 18, 22, 2, '#c83a4a')
      r(0, 16, 3, 3, '#c83a4a')
      r(21, 16, 3, 3, '#c83a4a')
      r(5, 14, 2, 4, WOOD_D)
      r(17, 14, 2, 4, WOOD_D)
      r(4, 8, 14, 7, '#f2c14e')
      r(5, 9, 6, 3, '#e05252')
      r(15, 2, 6, 8, '#f2c14e')
      r(20, 5, 3, 3, '#f2c14e')
      r(18, 4, 1, 1, OUT)
      r(14, 1, 3, 9, '#8a5a34')
      r(2, 8, 3, 5, '#8a5a34')
    }),
  slide: () =>
    sprite(32, 30, (r) => {
      // escada à esquerda, rampa descendo para a direita
      r(1, 2, 2, 28, '#3a6db4')
      r(9, 2, 2, 28, '#3a6db4')
      for (let y = 6; y < 30; y += 5) r(1, y, 10, 2, '#4d9ad8')
      r(0, 0, 12, 3, '#e05252')
      for (let i = 0; i < 22; i += 1) r(11 + i, 3 + i, 4, 3, '#f2c14e')
      for (let i = 0; i < 22; i += 1) r(11 + i, 3 + i, 4, 1, '#ffe08a')
      r(28, 26, 4, 4, '#e8915a')
    }),
  toybox: () =>
    sprite(18, 18, (r) => {
      r(2, 0, 5, 4, '#e05252')
      r(9, 1, 4, 4, '#38a85a')
      r(13, 0, 3, 5, '#f2c14e')
      r(4, 2, 1, 1, '#ffffff')
      box(r, 0, 4, 18, 14, '#4d9ad8', '#7ab8e8', '#2f5c9e', OUT)
      r(0, 4, 18, 3, '#2f5c9e')
      ;[[3, 9, '#f2c14e'], [8, 11, '#e86aa0'], [13, 9, '#38d27a']].forEach(([x, y, c]) => r(x, y, 3, 3, c))
    }),
  balloons: () =>
    sprite(20, 40, (r) => {
      // só os cordões e o pesinho; os balões flutuam (animados)
      r(9, 22, 1, 14, '#c8d2e0')
      r(6, 24, 1, 12, '#c8d2e0')
      r(13, 24, 1, 12, '#c8d2e0')
      r(6, 36, 8, 4, '#e86aa0')
      r(7, 35, 6, 1, '#f2a0c8')
    }),
  blocks: () =>
    sprite(18, 18, (r) => {
      const block = (x, y, c, ch) => {
        box(r, x, y, 7, 7, c, shadeHex(c, 0.3), shadeHex(c, -0.3), OUT)
        r(x + 2, y + 2, 3, 3, '#ffffff')
        r(x + 3, y + 3, 1, 1, ch)
      }
      block(0, 11, '#e05252', '#e05252')
      block(7, 11, '#4d9ad8', '#4d9ad8')
      block(4, 4, '#f2c14e', '#c8962a')
      r(13, 14, 4, 4, '#38a85a')
    }),

  // ================= música
  amp: () =>
    sprite(16, 18, (r) => {
      box(r, 0, 0, 16, 18, '#2b2f3c', '#4a5060', '#1b1f2b', OUT)
      r(1, 1, 14, 3, '#c8962a')
      ;[3, 6, 9, 12].forEach((x) => r(x, 2, 1, 1, '#2b2f3c'))
      r(2, 5, 12, 11, '#3a3f4c')
      for (let y = 6; y < 16; y += 2) r(2, y, 12, 1, '#2b2f3c')
      r(6, 9, 4, 4, '#1b1f2b')
    }),
  recordshelf: () =>
    sprite(32, 26, (r) => {
      box(r, 0, 0, 32, 26, WOOD, WOOD_L, WOOD_D, OUT)
      r(2, 2, 28, 10, '#3a2416')
      r(2, 14, 28, 10, '#3a2416')
      const covers = ['#e05252', '#f2c14e', '#4d9ad8', '#38a85a', '#a066d0', '#e86aa0', '#e8915a', '#f6f1e6']
      for (let i = 0; i < 9; i += 1) r(3 + i * 3, 3, 2, 9, covers[i % covers.length])
      for (let i = 0; i < 6; i += 1) r(3 + i * 3, 15, 2, 9, covers[(i + 3) % covers.length])
      r(22, 16, 7, 7, '#1b1f2b')
      r(24, 18, 3, 3, '#e05252')
    }),

  // ================= natureza
  saguaro: () =>
    sprite(22, 40, (r) => {
      const g = '#38a85a'
      const d = '#24804a'
      r(8, 2, 6, 30, g)
      r(9, 1, 4, 1, g)
      r(10, 3, 1, 28, '#5ecb84')
      r(2, 12, 4, 10, g)
      r(2, 20, 6, 3, g)
      r(16, 8, 4, 10, g)
      r(14, 16, 6, 3, g)
      ;[[9, 6], [12, 12], [9, 20], [12, 26], [3, 14], [17, 10]].forEach(([x, y]) => r(x, y, 1, 1, d))
      r(10, 0, 2, 2, '#e86aa0')
      box(r, 3, 32, 16, 8, '#e8915a', '#f2b080', '#c06a3a', OUT)
    }),
  terrarium: () =>
    sprite(16, 18, (r) => {
      r(3, 0, 10, 2, METAL_D)
      r(1, 2, 14, 13, '#bfe3f2')
      r(2, 3, 1, 10, '#e8f6ff')
      r(1, 11, 14, 4, '#8a5a34')
      r(4, 7, 3, 4, '#38a85a')
      r(9, 5, 3, 6, '#5ecb84')
      r(7, 9, 2, 2, '#e86aa0')
      r(11, 10, 2, 1, '#9aa6b2')
      r(0, 15, 16, 3, WOOD)
    }),
  fountain: () =>
    sprite(32, 30, (r) => {
      // bacia de pedra em dois andares (a água é animada)
      r(2, 18, 28, 10, '#9aa6b2')
      r(0, 20, 32, 8, '#9aa6b2')
      r(3, 19, 26, 5, '#4d9ad8')
      r(0, 27, 32, 3, '#6a7280')
      r(14, 8, 4, 10, '#9aa6b2')
      r(9, 6, 14, 4, '#9aa6b2')
      r(10, 6, 12, 2, '#4d9ad8')
      r(15, 2, 2, 4, '#c8d2e0')
    }),

  // ================= ciência
  labbench: () =>
    sprite(32, 28, (r) => {
      // frascos (o borbulhar é animado)
      r(3, 4, 6, 8, '#bfe3f2')
      r(5, 0, 2, 4, '#bfe3f2')
      r(3, 8, 6, 4, '#38d27a')
      r(12, 6, 4, 6, '#bfe3f2')
      r(12, 9, 4, 3, '#e86aa0')
      r(19, 2, 8, 10, '#bfe3f2')
      r(22, 0, 2, 2, '#bfe3f2')
      r(19, 7, 8, 5, '#a066d0')
      r(28, 8, 3, 4, '#f2c14e')
      box(r, 0, 12, 32, 16, '#e8eef2', '#ffffff', '#c0c8d0', '#5a6270')
      r(0, 12, 32, 2, '#2b2f3c')
      r(4, 18, 8, 6, '#c0c8d0')
      r(20, 18, 8, 6, '#c0c8d0')
      r(7, 20, 2, 1, METAL_D)
      r(23, 20, 2, 1, METAL_D)
    }),
  grandclock: () =>
    sprite(16, 44, (r) => {
      box(r, 0, 0, 16, 44, '#6a4024', '#8a5a34', '#4a2c18', OUT)
      r(1, 0, 14, 2, '#8a5a34')
      // mostrador
      r(3, 3, 10, 10, '#f6f1e6')
      r(4, 4, 8, 8, '#fff8e8')
      r(7, 5, 1, 4, OUT)
      r(8, 8, 3, 1, OUT)
      // janelinha do pêndulo (o pêndulo balança, animado)
      r(4, 16, 8, 20, '#3a2416')
      r(4, 16, 8, 1, '#c8962a')
      r(3, 38, 10, 4, '#4a2c18')
    }),

  // ================= parede
  moonlamp: () =>
    sprite(16, 16, (r) => {
      r(4, 0, 8, 16, '#8a7a50')
      r(0, 4, 16, 8, '#8a7a50')
      r(2, 2, 12, 12, '#8a7a50')
      r(5, 1, 6, 14, '#f2e6b8')
      r(1, 5, 14, 6, '#f2e6b8')
      r(3, 3, 10, 10, '#f2e6b8')
      ;[[4, 4, 3], [9, 7, 2], [5, 10, 2], [11, 3, 1]].forEach(([x, y, s]) => r(x, y, s, s, '#d8c890'))
      r(4, 2, 4, 1, '#fffbe8')
    }),
  dreamcatcher: () =>
    sprite(16, 28, (r) => {
      r(7, 0, 2, 2, '#8a5a34')
      r(4, 2, 8, 1, '#c8962a')
      r(2, 3, 2, 10, '#c8962a')
      r(12, 3, 2, 10, '#c8962a')
      r(4, 13, 8, 1, '#c8962a')
      r(3, 3, 10, 1, '#c8962a')
      ;[[5, 6], [8, 5], [10, 8], [6, 10], [8, 8]].forEach(([x, y]) => r(x, y, 1, 1, '#f6f1e6'))
      r(7, 7, 2, 2, '#5eead4')
      ;[[3, '#e86aa0'], [7, '#5eead4'], [11, '#f2c14e']].forEach(([x, c]) => {
        r(x, 14, 1, 6, '#c8962a')
        r(x - 1, 20, 3, 6, c)
        r(x, 26, 1, 2, c)
      })
    }),
  jerseyframe: () =>
    sprite(18, 20, (r) => {
      box(r, 0, 0, 18, 20, '#2b2f3c', '#4a5060', '#1b1f2b', '#c8962a')
      // camisa amarela de time
      r(5, 4, 8, 12, '#f2c14e')
      r(3, 4, 3, 4, '#f2c14e')
      r(12, 4, 3, 4, '#f2c14e')
      r(7, 4, 4, 1, '#38a85a')
      r(8, 8, 2, 4, '#38a85a')
      r(5, 15, 8, 1, '#c8962a')
    }),
  controllerswall: () =>
    sprite(32, 16, (r) => {
      r(0, 13, 32, 3, WOOD_D)
      r(0, 13, 32, 1, WOOD_L)
      const pad = (x, c) => {
        r(x, 6, 12, 6, c)
        r(x - 1, 8, 2, 4, c)
        r(x + 11, 8, 2, 4, c)
        r(x + 2, 8, 3, 1, '#1b1f2b')
        r(x + 3, 7, 1, 3, '#1b1f2b')
        r(x + 8, 7, 1, 1, '#e05252')
        r(x + 9, 9, 1, 1, '#38d27a')
      }
      pad(2, '#2b2f3c')
      pad(18, '#e8eef2')
      r(14, 2, 4, 2, '#5eead4')
    }),
  skatewall: () =>
    sprite(32, 30, (r) => {
      const deck = (x, c, g) => {
        r(x + 1, 0, 6, 2, c)
        r(x, 2, 8, 26, c)
        r(x + 1, 28, 6, 2, c)
        r(x + 2, 8, 4, 12, g)
        r(x + 1, 4, 1, 1, '#c8d2e0')
        r(x + 6, 4, 1, 1, '#c8d2e0')
        r(x + 1, 25, 1, 1, '#c8d2e0')
        r(x + 6, 25, 1, 1, '#c8d2e0')
      }
      deck(2, '#e05252', '#f2c14e')
      deck(12, '#2b2f3c', '#5eead4')
      deck(22, '#a066d0', '#f6f1e6')
    }),
  plantwall: () =>
    sprite(32, 28, (r) => {
      box(r, 0, 0, 32, 28, WOOD_D, WOOD, '#5a361e', OUT)
      r(2, 2, 28, 24, '#24804a')
      for (let y = 2; y < 26; y += 3) for (let x = 2 + (y % 2) * 2; x < 30; x += 4) r(x, y, 3, 2, (x + y) % 3 ? '#38a85a' : '#5ecb84')
      ;[[6, 6, '#e86aa0'], [20, 4, '#f2c14e'], [12, 16, '#f6f1e6'], [25, 20, '#e05252']].forEach(([x, y, c]) => r(x, y, 2, 2, c))
    }),
  recordswall: () =>
    sprite(34, 16, (r) => {
      ;[0, 12, 24].forEach((x, i) => {
        r(x + 2, 0, 6, 1, '#1b1f2b')
        r(x + 1, 1, 8, 1, '#1b1f2b')
        r(x, 2, 10, 6, '#1b1f2b')
        r(x + 1, 8, 8, 1, '#1b1f2b')
        r(x + 2, 9, 6, 1, '#1b1f2b')
        r(x + 3, 4, 4, 2, ['#e05252', '#f2c14e', '#5eead4'][i])
        r(x + 2, 3, 2, 1, '#4a5060')
      })
      r(6, 12, 22, 2, WOOD_D)
    }),

  // ================= tapetes
  rugheart: (color = 'e86aa0') =>
    sprite(32, 32, (r) => {
      const c = hex(color)
      const rows = [[4, 10, 18, 10], [2, 14, 16, 14], [1, 30], [1, 30], [1, 30], [2, 28], [3, 26], [5, 22], [7, 18], [9, 14], [11, 10], [13, 6], [15, 2]]
      rows.forEach((row, i) => {
        if (row.length === 4) {
          r(row[0], 4 + i * 2, row[1], 2, c)
          r(row[2], 4 + i * 2, row[3], 2, c)
        } else r(row[0], 4 + i * 2, row[1], 2, c)
      })
      r(6, 8, 4, 2, shadeHex(c, 0.35))
    }),
  rugstar: (color = 'f2c14e') =>
    sprite(48, 48, (r) => {
      const c = hex(color)
      const cx = 24
      const cy = 25
      const outer = 23
      const inner = 10
      // estrela de 5 pontas: o raio vai e volta entre a ponta e o "vale" a cada 36°
      const radius = (ang) => {
        const deg = ((((ang * 180) / Math.PI + 90) % 72) + 72) % 72
        const t = deg <= 36 ? deg / 36 : (72 - deg) / 36
        return outer * (1 - t) + inner * t
      }
      for (let y = 0; y < 48; y += 1) {
        for (let x = 0; x < 48; x += 1) {
          const dist = Math.hypot(x + 0.5 - cx, y + 0.5 - cy)
          const lim = radius(Math.atan2(y + 0.5 - cy, x + 0.5 - cx))
          if (dist < lim) r(x, y, 1, 1, dist < lim - 2.5 ? c : shadeHex(c, -0.25))
        }
      }
      r(20, 18, 4, 2, shadeHex(c, 0.4))
    }),
  rugcat: () =>
    sprite(48, 32, (r) => {
      const c = '#4a5060'
      r(4, 6, 40, 22, c)
      r(2, 10, 44, 14, c)
      r(6, 0, 8, 8, c)
      r(34, 0, 8, 8, c)
      r(8, 2, 4, 4, '#e86aa0')
      r(36, 2, 4, 4, '#e86aa0')
      r(14, 12, 6, 5, '#f2c14e')
      r(28, 12, 6, 5, '#f2c14e')
      r(16, 13, 2, 3, '#1a1424')
      r(30, 13, 2, 3, '#1a1424')
      r(22, 18, 4, 2, '#e86aa0')
      ;[[4, 18], [4, 22], [40, 18], [40, 22]].forEach(([x, y]) => r(x, y, 6, 1, '#c8d2e0'))
    }),
}
