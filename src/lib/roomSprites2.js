// Mais móveis em pixel art (catálogo do "modo decorar"). Mesmo estilo de roomSprites.js.
// Partes animadas (telas, fogo, peixes, luzinhas) são desenhadas a cada quadro em RoomScene.
import { petSprite } from './roomPets'
import { box, DARK, OUT, shadeHex, sprite } from './roomSprites'

const hex = (color) => `#${color}`

export const EXTRA_SPRITES = {
  // ================= bichinhos (quadro parado, usado no catálogo e no modo decorar)
  pet: (kind = 'gato', color = 'e8915a') => petSprite(kind, color, 0),

  // ================= mais decoração
  ruground: (color = 'e86aa0', size = '2') =>
    sprite(Number(size) * 16, Number(size) * 16, (r) => {
      const S = Number(size) * 16
      const c = hex(color)
      const rings = [c, shadeHex(c, 0.25), c, shadeHex(c, -0.2)]
      for (let i = 0; i < 4; i += 1) {
        const rad = S / 2 - 1 - i * (S / 10)
        for (let y = -rad; y <= rad; y += 1) {
          const half = Math.floor(Math.sqrt(rad * rad - y * y))
          r(S / 2 - half, S / 2 + y, half * 2, 1, rings[i])
        }
      }
    }),
  cushion: (color = 'e8b83a') =>
    sprite(16, 12, (r) => {
      const c = hex(color)
      box(r, 1, 2, 14, 9, c, shadeHex(c, 0.3), shadeHex(c, -0.3))
      r(7, 5, 2, 2, shadeHex(c, -0.25))
      r(0, 3, 2, 2, c)
      r(14, 3, 2, 2, c)
      r(0, 8, 2, 2, c)
      r(14, 8, 2, 2, c)
    }),
  hammock: () =>
    sprite(32, 22, (r) => {
      r(0, 0, 2, 22, '#7a4c2a')
      r(30, 0, 2, 22, '#7a4c2a')
      r(2, 3, 28, 1, '#c8a06a')
      for (let x = 3; x < 29; x += 1) {
        const sag = Math.round(Math.sin(((x - 3) / 26) * Math.PI) * 7)
        r(x, 4 + sag, 1, 5, x % 4 < 2 ? '#e05252' : '#f2c14e')
      }
      r(0, 20, 4, 2, OUT)
      r(28, 20, 4, 2, OUT)
    }),
  teepee: () =>
    sprite(32, 34, (r) => {
      for (let y = 0; y < 30; y += 1) {
        const half = Math.round((y / 30) * 15) + 1
        r(16 - half, y + 3, half * 2, 1, y % 8 < 4 ? '#f6f1e6' : '#e8d4a8')
      }
      r(15, 0, 2, 5, '#8a5a34')
      r(12, 1, 1, 4, '#8a5a34')
      r(19, 1, 1, 4, '#8a5a34')
      for (let y = 18; y < 33; y += 1) {
        const half = Math.round(((y - 18) / 15) * 5)
        r(16 - half, y, half * 2, 1, '#3a2416')
      }
      r(4, 26, 24, 1, '#e05252')
      r(8, 16, 16, 1, '#4d7fc6')
      r(13, 31, 6, 2, '#f2c14e')
    }),
  basket: () =>
    sprite(16, 16, (r) => {
      r(2, 0, 4, 4, '#4d7fc6')
      r(6, 1, 5, 3, '#e05252')
      r(10, 0, 4, 3, '#f6f1e6')
      box(r, 1, 3, 14, 13, '#d8b47a', '#e8c890', '#b08a50')
      for (let y = 6; y < 15; y += 3) r(2, y, 12, 1, '#b08a50')
      for (let x = 4; x < 14; x += 3) r(x, 4, 1, 11, '#c8a06a')
    }),
  globe: () =>
    sprite(14, 22, (r) => {
      r(4, 0, 6, 1, OUT)
      r(2, 1, 10, 1, OUT)
      r(1, 2, 12, 8, OUT)
      r(2, 10, 10, 1, OUT)
      r(4, 11, 6, 1, OUT)
      r(3, 1, 8, 1, '#4d9ad8')
      r(2, 2, 10, 8, '#4d9ad8')
      r(3, 10, 8, 1, '#4d9ad8')
      r(3, 3, 3, 3, '#38a85a')
      r(7, 5, 4, 3, '#38a85a')
      r(5, 8, 2, 2, '#38a85a')
      r(12, 1, 1, 12, '#d8a840')
      r(6, 12, 2, 6, '#8a5a34')
      r(3, 18, 8, 3, '#8a5a34')
      r(3, 18, 8, 1, '#a06a3c')
    }),
  telescope: () =>
    sprite(18, 26, (r) => {
      r(2, 4, 14, 4, OUT)
      r(3, 5, 12, 2, '#d8a840')
      r(14, 3, 4, 6, OUT)
      r(15, 4, 2, 4, '#8ec8f0')
      r(1, 5, 2, 2, '#2b2f3c')
      r(8, 8, 2, 4, '#2b2f3c')
      r(8, 12, 2, 10, '#4a5060')
      r(3, 22, 2, 4, '#4a5060')
      r(13, 22, 2, 4, '#4a5060')
      r(5, 20, 8, 2, '#4a5060')
    }),
  lavalamp: () =>
    sprite(10, 22, (r) => {
      r(3, 0, 4, 2, '#4a5060')
      r(2, 2, 6, 13, OUT)
      r(3, 3, 4, 11, '#a066d0')
      r(1, 15, 8, 7, '#4a5060')
      r(2, 15, 6, 1, '#6a7280')
    }),
  fan: () =>
    sprite(18, 30, (r) => {
      r(3, 0, 12, 12, OUT)
      r(4, 1, 10, 10, '#d8e0e8')
      r(8, 5, 2, 2, '#4a5060')
      r(8, 12, 2, 14, '#9aa6b2')
      r(4, 26, 10, 4, '#6a7280')
      r(4, 26, 10, 1, '#9aa6b2')
    }),
  coatrack: () =>
    sprite(14, 30, (r) => {
      r(6, 2, 2, 25, '#7a4c2a')
      r(3, 0, 8, 3, '#7a4c2a')
      r(2, 3, 4, 10, '#e05252')
      r(2, 3, 4, 2, '#ff8a8a')
      r(8, 3, 4, 7, '#4d7fc6')
      r(9, 1, 3, 3, '#f2c14e')
      r(2, 27, 10, 3, '#5a361e')
    }),
  ballpit: () =>
    sprite(32, 26, (r) => {
      box(r, 0, 6, 32, 20, '#4d7fc6', '#7aa6e6', '#2f5c9e', DARK)
      r(2, 6, 28, 8, '#2b2f3c')
      const colors = ['#e05252', '#f2c14e', '#38d27a', '#e86aa0', '#5eead4', '#a066d0']
      for (let y = 2; y < 13; y += 3) for (let x = 2 + (y % 2) * 2; x < 29; x += 4) r(x, y, 3, 3, colors[(x * 7 + y) % colors.length])
    }),
  trophies: () =>
    sprite(32, 24, (r) => {
      box(r, 0, 12, 32, 12, '#7a4c2a', '#94603a', '#5a361e')
      r(2, 15, 28, 6, '#3a2416')
      ;[[4, '#f2c14e'], [14, '#c0c8d0'], [24, '#c8703a']].forEach(([x, c], i) => {
        const h = i === 0 ? 10 : 8
        r(x, 12 - h, 5, 4, c)
        r(x - 1, 12 - h, 1, 2, c)
        r(x + 5, 12 - h, 1, 2, c)
        r(x + 2, 16 - h, 1, h - 5, c)
        r(x + 1, 11, 3, 1, c)
      })
      r(6, 17, 20, 2, '#f2c14e')
    }),
  cattree: () =>
    sprite(16, 34, (r) => {
      box(r, 0, 28, 16, 6, '#c8a06a', '#dcb880', '#a07a48')
      r(3, 6, 3, 22, '#d8c8a0')
      for (let y = 8; y < 28; y += 2) r(3, y, 3, 1, '#b8a070')
      r(10, 16, 3, 12, '#d8c8a0')
      box(r, 0, 4, 10, 4, '#a066d0', '#c08ae0', null)
      box(r, 7, 14, 9, 4, '#a066d0', '#c08ae0', null)
      r(12, 18, 1, 5, '#f2c14e')
      r(11, 23, 3, 3, '#e05252')
    }),

  // ---- parede
  hangingplant: () =>
    sprite(14, 22, (r) => {
      r(6, 0, 1, 6, '#8a5a34')
      r(3, 5, 7, 1, '#8a5a34')
      box(r, 2, 6, 10, 6, '#c8703a', '#e8915a', null)
      r(1, 10, 3, 8, '#38a85a')
      r(4, 11, 2, 11, '#24804a')
      r(8, 11, 2, 9, '#38a85a')
      r(10, 10, 3, 6, '#24804a')
      r(2, 13, 1, 2, '#5ecb84')
      r(9, 14, 1, 2, '#5ecb84')
    }),
  photos: () =>
    sprite(46, 16, (r) => {
      for (let x = 0; x < 46; x += 1) r(x, 2 + Math.round(Math.sin((x / 45) * Math.PI) * 3), 1, 1, '#5a361e')
      ;[[3, '#4d7fc6'], [14, '#e8915a'], [25, '#38a85a'], [36, '#a066d0']].forEach(([x, c], i) => {
        const y = 3 + Math.round(Math.sin(((x + 3) / 45) * Math.PI) * 3)
        r(x, y + 1, 8, 9, '#f6f1e6')
        r(x + 1, y + 2, 6, 5, c)
        r(x + 3, y, 2, 2, i % 2 ? '#e05252' : '#f2c14e')
      })
    }),
  fairylights: () =>
    sprite(48, 10, (r) => {
      for (let x = 0; x < 48; x += 1) r(x, 1 + Math.round(Math.abs(Math.sin((x / 12) * Math.PI)) * 4), 1, 1, '#3a4250')
    }),
  worldmap: () =>
    sprite(34, 22, (r) => {
      box(r, 0, 0, 34, 22, '#bfe3f2', null, null, '#8a5a34')
      r(1, 1, 32, 20, '#9ccde0')
      r(4, 4, 7, 5, '#5ecb84')
      r(7, 9, 4, 7, '#5ecb84')
      r(15, 4, 5, 4, '#5ecb84')
      r(16, 8, 4, 8, '#38a85a')
      r(22, 4, 9, 6, '#5ecb84')
      r(26, 13, 4, 3, '#38a85a')
      r(9, 12, 1, 1, '#e05252')
    }),
  flag: () =>
    sprite(26, 18, (r) => {
      r(0, 0, 26, 18, '#24804a')
      r(1, 1, 24, 16, '#38a85a')
      for (let i = 0; i < 7; i += 1) r(13 - (i * 10) / 7 - 1, 3 + i, ((i * 10) / 7) * 2 + 2, 1, '#f2c14e')
      for (let i = 0; i < 6; i += 1) r(4 + i * 1.5, 10 + i, 18 - i * 3, 1, '#f2c14e')
      r(9, 5, 8, 8, '#2f5c9e')
      r(8, 6, 10, 6, '#2f5c9e')
      r(8, 8, 10, 1, '#f6f1e6')
      r(11, 7, 1, 1, '#f6f1e6')
      r(15, 10, 1, 1, '#f6f1e6')
    }),
  glowstars: () =>
    sprite(40, 18, (r) => {
      ;[[3, 3], [14, 1], [26, 4], [35, 2], [8, 11], [20, 12], [31, 13]].forEach(([x, y], i) => {
        const c = i % 2 ? '#e8f6a8' : '#d8f0b0'
        r(x + 1, y, 1, 3, c)
        r(x, y + 1, 3, 1, c)
      })
      r(18, 5, 4, 4, '#e8f6a8')
      r(19, 4, 2, 1, '#e8f6a8')
    }),
  // ================= sala da turma
  sign: () => {
    // letreiro neon "A CRECHE": letras de 3x5 pixels desenhadas em dobro (cada ponto vira 2x2)
    const FONT = {
      A: ['010', '101', '111', '101', '101'], C: ['111', '100', '100', '100', '111'], R: ['110', '101', '110', '101', '101'],
      E: ['111', '100', '110', '100', '111'], H: ['101', '101', '111', '101', '101'], ' ': ['00', '00', '00', '00', '00'],
    }
    const text = 'A CRECHE'
    const K = 2
    const width = [...text].reduce((sum, ch) => sum + (FONT[ch][0].length + 1) * K, -K)
    const W = width + 10
    const H = 5 * K + 8
    return sprite(W, H, (r) => {
      r(0, 0, W, H, '#1a1424')
      r(1, 1, W - 2, H - 2, '#2a1f3a')
      let x = 5
      ;[...text].forEach((ch, i) => {
        const glyph = FONT[ch]
        const color = i < 1 ? '#ff8ac0' : '#7af0e0'
        const shade = i < 1 ? '#c85a90' : '#3ab8a8'
        glyph.forEach((row, y) =>
          [...row].forEach((bit, gx) => {
            if (bit !== '1') return
            r(x + gx * K, 4 + y * K, K, K, color)
            r(x + gx * K, 4 + y * K + K - 1, K, 1, shade) // sombrinha embaixo de cada ponto
          }),
        )
        x += (glyph[0].length + 1) * K
      })
      r(2, 2, 2, 1, '#ffe08a')
      r(W - 4, H - 3, 2, 1, '#ffe08a')
    })
  },
  stage: () =>
    sprite(64, 32, (r) => {
      r(0, 0, 64, 32, '#5a361e')
      r(1, 1, 62, 26, '#8a5a34')
      for (let y = 4; y < 27; y += 5) r(1, y, 62, 1, '#7a4c2a')
      for (let x = 10; x < 63; x += 17) r(x, 1, 1, 26, '#7a4c2a')
      r(0, 27, 64, 5, '#3a2416')
      r(0, 27, 64, 1, '#c08a52')
      ;[6, 22, 38, 54].forEach((x) => r(x, 29, 4, 1, '#f2c14e'))
    }),
  mic: () =>
    sprite(10, 26, (r) => {
      r(3, 0, 4, 5, '#2b2f3c')
      r(4, 1, 2, 3, '#6a7280')
      r(4, 5, 2, 1, '#1a1424')
      r(4, 6, 2, 16, '#4a5060')
      r(1, 22, 8, 2, '#2b2f3c')
      r(0, 24, 10, 2, '#1a1424')
    }),
  ballot: () =>
    sprite(18, 22, (r) => {
      box(r, 2, 10, 14, 12, '#a06a3c', '#c48a54', '#7a4c2a')
      box(r, 0, 4, 18, 8, '#4d7fc6', '#7aa6e6', '#2f5c9e', DARK)
      r(5, 6, 8, 2, '#1a1424')
      r(7, 0, 5, 6, '#f6f1e6')
      r(8, 2, 3, 1, '#9aa6b2')
      r(6, 14, 6, 4, '#f6f1e6')
      r(7, 15, 1, 2, '#38d27a')
      r(8, 16, 1, 1, '#38d27a')
      r(9, 15, 2, 1, '#38d27a')
    }),
  jukebox: () =>
    sprite(18, 32, (r) => {
      r(3, 0, 12, 2, DARK)
      r(1, 2, 16, 2, DARK)
      r(0, 4, 18, 28, DARK)
      r(4, 1, 10, 2, '#e05252')
      r(2, 3, 14, 2, '#e05252')
      r(1, 5, 16, 26, '#8a3a6a')
      r(3, 6, 12, 9, '#f2c14e')
      r(4, 7, 10, 7, '#3a2a66')
      r(3, 16, 12, 2, '#d8a840')
      for (let x = 4; x < 14; x += 2) r(x, 19, 1, 6, '#5eead4')
      r(3, 26, 12, 3, '#3a2416')
      r(1, 5, 1, 26, '#e86aa0')
      r(16, 5, 1, 26, '#e86aa0')
    }),
  // ================= sala
  sofafront: (color = 'e05252') =>
    sprite(48, 26, (r) => {
      const c = hex(color)
      const dark = shadeHex(c, -0.28)
      const light = shadeHex(c, 0.25)
      box(r, 3, 0, 42, 14, c, light, dark)
      r(16, 2, 1, 10, dark)
      r(31, 2, 1, 10, dark)
      box(r, 0, 8, 7, 15, shadeHex(c, -0.1), light, dark)
      box(r, 41, 8, 7, 15, shadeHex(c, -0.1), light, dark)
      box(r, 5, 12, 38, 10, c, light, dark)
      r(18, 13, 1, 8, dark)
      r(29, 13, 1, 8, dark)
      // almofadas
      box(r, 7, 4, 7, 7, '#f2c14e', '#ffe08a', null)
      box(r, 34, 4, 7, 7, '#f6f1e6', '#ffffff', null)
      r(2, 23, 3, 3, OUT)
      r(43, 23, 3, 3, OUT)
    }),
  sidetable: () =>
    sprite(16, 18, (r) => {
      box(r, 1, 4, 14, 10, '#a06a3c', '#c48a54', '#7a4c2a')
      r(3, 14, 2, 4, OUT)
      r(11, 14, 2, 4, OUT)
      r(6, 0, 4, 5, '#e8eef2')
      r(5, 0, 6, 1, OUT)
      r(7, 1, 2, 1, '#5ecb84')
    }),
  crt: () =>
    sprite(20, 25, (r, ctx) => {
      ctx.translate(0, 1)
      box(r, 2, 15, 16, 9, '#7a4c2a', '#94603a', '#5a361e')
      box(r, 0, 0, 20, 16, '#8a8478', '#a8a296', '#6a6458', DARK)
      r(2, 2, 13, 11, '#1b1f2b')
      r(16, 3, 2, 2, '#e05252')
      r(16, 7, 2, 1, '#4a4438')
      r(16, 9, 2, 1, '#4a4438')
      r(7, -1, 1, 1, DARK)
    }),
  walltv: () =>
    sprite(38, 22, (r) => {
      box(r, 0, 0, 38, 22, '#262b3a', '#3a4156', '#1b1f2b', '#0c0e15')
      r(2, 2, 34, 17, '#121a26')
      r(33, 19, 2, 1, '#e05252')
    }),
  console: () =>
    sprite(16, 12, (r) => {
      box(r, 0, 4, 16, 8, '#2b2f3c', '#3f4456', '#1b1f2b', DARK)
      r(3, 7, 2, 1, '#38d27a')
      r(8, 6, 6, 1, '#4a5060')
      // controle
      box(r, 3, 0, 10, 5, '#e8eef2', '#ffffff', '#b8bcc6', DARK)
      r(5, 2, 1, 1, '#e05252')
      r(10, 2, 1, 1, '#4d7fc6')
    }),
  fireplace: () =>
    sprite(34, 39, (r, ctx) => {
      ctx.translate(0, 7)
      box(r, 0, 2, 34, 30, '#b4564a', '#c8705e', '#8a3a30')
      for (let y = 5; y < 30; y += 4) for (let x = (y % 8 === 1 ? 1 : 4); x < 33; x += 7) r(x, y, 5, 1, '#8a3a30')
      box(r, -1, 0, 36, 4, '#5a361e', '#8a5a34', null)
      r(7, 12, 20, 18, '#1a1214')
      r(8, 13, 18, 17, '#2a1a18')
      r(9, 26, 16, 3, '#4a2c1a')
      r(11, 25, 12, 2, '#6a4226')
      // enfeites em cima
      r(4, -4, 4, 4, '#f2c14e')
      r(26, -6, 3, 6, '#e8eef2')
      r(27, -7, 1, 1, '#f2c14e')
    }),
  aquarium: () =>
    sprite(32, 28, (r) => {
      box(r, 1, 17, 30, 11, '#2b2f3c', '#3f4456', '#1b1f2b', DARK)
      r(4, 20, 10, 6, '#3a4156')
      r(18, 20, 10, 6, '#3a4156')
      box(r, 0, 0, 32, 18, '#bfe3f2', '#e8f6ff', null, '#3a4250')
      r(1, 1, 30, 2, '#9ccde0')
      r(1, 3, 30, 14, '#4aa8d8')
      r(1, 14, 30, 3, '#d8c8a0')
      r(4, 9, 1, 5, '#38a85a')
      r(5, 7, 1, 7, '#24804a')
      r(26, 8, 1, 6, '#38a85a')
      r(20, 12, 4, 2, '#8a96a6')
    }),
  bookshelflow: () =>
    sprite(32, 20, (r) => {
      box(r, 0, 0, 32, 20, '#7a4c2a', '#94603a', '#5a361e')
      r(2, 2, 28, 7, '#3a2416')
      r(2, 11, 28, 7, '#3a2416')
      const colors = ['#e05252', '#4d7fc6', '#f2c14e', '#38d27a', '#a066d0', '#e8915a']
      let x = 3
      for (let i = 0; x < 28; i += 1) {
        const w = 2 + (i % 2)
        r(x, 3 + (i % 3), w, 6 - (i % 3), colors[i % colors.length])
        x += w + 1
      }
      r(4, 13, 6, 5, '#f6f1e6')
      r(5, 14, 4, 3, '#4d7fc6')
      r(14, 14, 4, 4, '#c8703a')
      r(15, 12, 2, 2, '#38a85a')
      r(22, 15, 6, 3, '#e05252')
      r(22, 13, 6, 2, '#f2c14e')
      r(1, 9, 30, 2, '#a06a3c')
    }),

  // ================= quarto
  bedsingle: (color = 'e86aa0') =>
    sprite(18, 34, (r) => {
      const c = hex(color)
      box(r, 0, 0, 18, 10, '#8a5a34', '#b4804c', '#6a4226')
      box(r, 1, 7, 16, 26, '#e8eef2', '#ffffff', '#c0c8d0')
      box(r, 3, 8, 12, 7, '#ffffff', null, '#d8e0e8', '#9aa6b2')
      box(r, 1, 16, 16, 17, c, shadeHex(c, 0.3), shadeHex(c, -0.3))
      r(1, 16, 16, 3, '#f6f1e6')
      r(5, 23, 3, 3, shadeHex(c, 0.18))
      r(11, 27, 3, 3, shadeHex(c, 0.18))
      r(0, 32, 2, 2, OUT)
      r(16, 32, 2, 2, OUT)
    }),
  nightstand: () =>
    sprite(14, 26, (r) => {
      box(r, 0, 12, 14, 14, '#a06a3c', '#c48a54', '#7a4c2a')
      r(2, 18, 10, 1, '#7a4c2a')
      r(6, 15, 2, 1, '#e8c070')
      r(6, 21, 2, 1, '#e8c070')
      // abajur
      r(3, 0, 8, 6, '#5a361e')
      r(4, 1, 6, 4, '#f2d79a')
      r(4, 1, 6, 1, '#fff2c8')
      r(6, 6, 2, 4, '#3a4250')
      r(4, 10, 6, 2, '#2b2f3c')
    }),
  wardrobe: () =>
    sprite(32, 38, (r) => {
      box(r, 0, 0, 32, 38, '#8a5a34', '#b4804c', '#6a4226')
      r(1, 1, 30, 3, '#a06a3c')
      box(r, 2, 5, 13, 29, '#9a6a40', '#b07a48', null, '#5a361e')
      box(r, 17, 5, 13, 29, '#9a6a40', '#b07a48', null, '#5a361e')
      r(13, 17, 1, 4, '#e8c070')
      r(18, 17, 1, 4, '#e8c070')
      r(4, 8, 9, 1, '#a87648')
      r(19, 8, 9, 1, '#a87648')
      r(2, 35, 3, 3, OUT)
      r(27, 35, 3, 3, OUT)
    }),
  dresser: () =>
    sprite(32, 26, (r) => {
      box(r, 0, 6, 32, 20, '#c08a52', '#d8a46a', '#9a6a40')
      ;[9, 15, 20].forEach((y) => {
        r(2, y, 28, 5, '#b07a48')
        r(2, y + 4, 28, 1, '#8a5a34')
        r(15, y + 2, 2, 1, '#5a361e')
      })
      // perfume, porta-retrato e plantinha
      r(3, 2, 3, 4, '#e86aa0')
      r(4, 1, 1, 1, '#f6f1e6')
      box(r, 12, 0, 8, 6, '#f6f1e6', null, null, '#5a361e')
      r(14, 2, 4, 2, '#4d7fc6')
      r(25, 3, 4, 3, '#c8703a')
      r(26, 0, 2, 3, '#38a85a')
    }),
  vanity: () =>
    sprite(24, 34, (r) => {
      r(5, 0, 14, 16, '#d8a840')
      r(6, 1, 12, 14, '#bfe3f2')
      r(7, 2, 2, 5, '#ffffff')
      box(r, 0, 16, 24, 8, '#f6f1e6', '#ffffff', '#d8d0c0')
      r(2, 24, 2, 10, '#d8d0c0')
      r(20, 24, 2, 10, '#d8d0c0')
      r(3, 13, 3, 3, '#e86aa0')
      r(18, 13, 2, 3, '#a066d0')
      r(11, 19, 2, 1, '#d8a840')
    }),
  desk: () =>
    sprite(32, 27, (r, ctx) => {
      ctx.translate(0, 5)
      box(r, 0, 0, 32, 6, '#c08a52', '#d8a46a', '#9a6a40')
      r(1, 6, 2, 16, OUT)
      box(r, 20, 6, 12, 16, '#b07a48', '#c08a52', '#8a5a34')
      r(22, 10, 8, 1, '#8a5a34')
      r(22, 15, 8, 1, '#8a5a34')
      r(25, 8, 2, 1, '#5a361e')
      r(25, 13, 2, 1, '#5a361e')
      // livros e caneca
      r(3, -3, 6, 3, '#4d7fc6')
      r(4, -5, 5, 2, '#e05252')
      r(13, -3, 3, 3, '#f6f1e6')
    }),
  deskpc: () =>
    sprite(32, 34, (r) => {
      // monitor
      box(r, 4, 0, 22, 15, '#262b3a', '#3a4156', '#1b1f2b', '#0c0e15')
      r(6, 2, 18, 10, '#121a26')
      r(13, 15, 4, 2, '#1b1f2b')
      r(10, 16, 10, 1, '#1b1f2b')
      // mesa
      box(r, 0, 17, 32, 6, '#2b2f3c', '#4a5060', '#1b1f2b', DARK)
      r(6, 18, 14, 2, '#4a5060')
      for (let x = 7; x < 19; x += 2) r(x, 18, 1, 1, '#5eead4')
      r(23, 18, 4, 2, '#e8eef2')
      r(1, 23, 2, 11, DARK)
      // gabinete com luz
      box(r, 22, 23, 9, 11, '#1b1f2b', '#2b2f3c', null, DARK)
      r(24, 25, 5, 1, '#a066d0')
      r(24, 28, 5, 1, '#5eead4')
    }),
  gamerchair: (color = 'e05252') =>
    sprite(16, 26, (r) => {
      const c = hex(color)
      box(r, 2, 0, 12, 14, '#1b1f2b', '#2b2f3c', null, DARK)
      r(4, 2, 2, 10, c)
      r(10, 2, 2, 10, c)
      r(6, 1, 4, 2, c)
      box(r, 1, 12, 14, 6, '#1b1f2b', '#2b2f3c', null, DARK)
      r(3, 13, 10, 1, c)
      r(0, 9, 2, 6, '#2b2f3c')
      r(14, 9, 2, 6, '#2b2f3c')
      r(7, 18, 2, 5, '#4a5060')
      r(2, 23, 12, 1, '#4a5060')
      r(1, 24, 2, 2, DARK)
      r(7, 24, 2, 2, DARK)
      r(13, 24, 2, 2, DARK)
    }),
  beanbag: (color = 'a066d0') =>
    sprite(18, 16, (r) => {
      const c = hex(color)
      r(3, 1, 12, 1, OUT)
      r(1, 2, 16, 1, OUT)
      r(0, 3, 18, 12, OUT)
      r(1, 15, 16, 1, OUT)
      r(3, 2, 12, 1, c)
      r(1, 3, 16, 12, c)
      r(3, 3, 6, 2, shadeHex(c, 0.3))
      r(4, 8, 10, 4, shadeHex(c, -0.15))
      r(1, 13, 16, 2, shadeHex(c, -0.3))
    }),
  teddy: () =>
    sprite(14, 14, (r) => {
      const c = '#c8904a'
      r(1, 0, 4, 4, OUT)
      r(9, 0, 4, 4, OUT)
      r(2, 1, 2, 2, c)
      r(10, 1, 2, 2, c)
      r(2, 2, 10, 7, OUT)
      r(3, 3, 8, 5, c)
      r(5, 5, 1, 1, DARK)
      r(8, 5, 1, 1, DARK)
      r(6, 6, 2, 2, '#f2d0a0')
      r(1, 8, 12, 6, OUT)
      r(2, 9, 10, 4, c)
      r(5, 9, 4, 2, '#e05252')
    }),
  bunk: (color = '4d7fc6') =>
    sprite(32, 46, (r) => {
      const c = hex(color)
      const c2 = '#e05252'
      r(0, 0, 2, 46, '#8a5a34')
      r(30, 0, 2, 46, '#8a5a34')
      // cama de cima
      box(r, 1, 6, 30, 12, '#e8eef2', '#ffffff', null)
      box(r, 3, 6, 9, 5, '#ffffff', null, null, '#9aa6b2')
      box(r, 12, 7, 18, 10, c, shadeHex(c, 0.3), shadeHex(c, -0.3))
      r(1, 18, 30, 2, '#8a5a34')
      r(1, 3, 30, 3, '#a06a3c')
      // escada
      r(26, 20, 1, 8, '#a06a3c')
      r(29, 20, 1, 8, '#a06a3c')
      r(26, 22, 4, 1, '#a06a3c')
      r(26, 25, 4, 1, '#a06a3c')
      // cama de baixo
      box(r, 1, 28, 30, 14, '#e8eef2', '#ffffff', null)
      box(r, 3, 28, 9, 6, '#ffffff', null, null, '#9aa6b2')
      box(r, 12, 29, 18, 12, c2, shadeHex(c2, 0.3), shadeHex(c2, -0.3))
      r(1, 42, 30, 2, '#8a5a34')
    }),

  // ================= cozinha e banheiro
  kitchenette: () =>
    sprite(32, 26, (r) => {
      box(r, 0, 10, 32, 16, '#e8eef2', '#ffffff', '#b9c3cc', '#5a6270')
      r(1, 10, 30, 3, '#8a96a6')
      r(3, 11, 10, 2, '#5a6270')
      r(7, 7, 2, 3, '#9aa6b2')
      r(17, 10, 14, 16, '#2b2f3c')
      r(19, 11, 3, 1, '#e05252')
      r(26, 11, 3, 1, '#e05252')
      r(18, 15, 12, 9, '#1b1f2b')
      r(19, 16, 10, 1, '#4a5060')
      r(3, 16, 11, 7, '#d8e0e8')
      r(12, 18, 1, 3, '#7a8592')
      // panela
      r(19, 6, 8, 5, '#9aa6b2')
      r(18, 7, 1, 1, '#9aa6b2')
      r(27, 7, 1, 1, '#9aa6b2')
    }),
  tablelong: () =>
    sprite(32, 22, (r) => {
      box(r, 0, 0, 32, 12, '#c08a52', '#d8a46a', '#9a6a40')
      r(2, 2, 28, 1, '#d8a46a')
      r(2, 12, 2, 10, OUT)
      r(28, 12, 2, 10, OUT)
      // pratos e frutas
      r(5, 4, 6, 4, '#f6f1e6')
      r(21, 4, 6, 4, '#f6f1e6')
      r(14, 3, 4, 4, '#e8915a')
      r(15, 2, 2, 1, '#38a85a')
    }),
  stool: () =>
    sprite(12, 16, (r) => {
      box(r, 0, 0, 12, 5, '#e05252', '#ff8a8a', '#a83232')
      r(2, 5, 1, 11, '#4a5060')
      r(9, 5, 1, 11, '#4a5060')
      r(2, 11, 8, 1, '#4a5060')
    }),
  microwave: () =>
    sprite(18, 22, (r) => {
      box(r, 0, 10, 18, 12, '#e8eef2', '#ffffff', '#b9c3cc', '#5a6270')
      r(2, 12, 10, 8, '#2b2f3c')
      r(3, 13, 4, 2, '#4a5060')
      r(14, 12, 2, 2, '#38d27a')
      r(14, 16, 2, 1, '#9aa6b2')
      r(14, 18, 2, 1, '#9aa6b2')
      box(r, 1, 0, 16, 10, '#a06a3c', '#c48a54', null)
    }),
  bathtub: () =>
    sprite(34, 22, (r) => {
      r(2, 0, 30, 2, OUT)
      r(0, 2, 34, 16, OUT)
      r(2, 18, 30, 2, OUT)
      r(2, 2, 30, 16, '#f6f1e6')
      r(1, 3, 32, 14, '#f6f1e6')
      r(4, 4, 26, 11, '#8ec8f0')
      r(4, 4, 26, 2, '#b8e0ff')
      r(8, 6, 4, 2, '#ffffff')
      r(18, 9, 3, 2, '#ffffff')
      r(25, 6, 2, 2, '#f2c14e')
      r(28, 1, 2, 3, '#9aa6b2')
      r(3, 20, 3, 2, OUT)
      r(28, 20, 3, 2, OUT)
    }),
  toilet: () =>
    sprite(14, 22, (r) => {
      box(r, 2, 0, 10, 8, '#f6f1e6', '#ffffff', '#d8d0c0', '#5a6270')
      r(9, 2, 2, 1, '#9aa6b2')
      r(1, 8, 12, 10, '#5a6270')
      r(2, 9, 10, 8, '#f6f1e6')
      r(4, 10, 6, 5, '#d8e0e8')
      r(4, 18, 6, 4, '#5a6270')
      r(5, 18, 4, 3, '#f6f1e6')
    }),
  sink: () =>
    sprite(16, 30, (r) => {
      r(3, 0, 10, 12, '#5a6270')
      r(4, 1, 8, 10, '#bfe3f2')
      r(5, 2, 2, 4, '#ffffff')
      box(r, 0, 13, 16, 6, '#f6f1e6', '#ffffff', '#d8d0c0', '#5a6270')
      r(3, 14, 10, 2, '#d8e0e8')
      r(7, 11, 2, 3, '#9aa6b2')
      r(6, 19, 4, 11, '#d8d0c0')
      r(6, 19, 1, 11, '#5a6270')
      r(9, 19, 1, 11, '#5a6270')
    }),

  // ================= diversão
  guitar: () =>
    sprite(12, 28, (r) => {
      r(5, 0, 2, 3, '#3a2416')
      r(5, 3, 2, 10, '#5a361e')
      r(2, 12, 8, 8, OUT)
      r(1, 15, 10, 9, OUT)
      r(3, 13, 6, 6, '#e8915a')
      r(2, 16, 8, 7, '#e8915a')
      r(5, 17, 2, 2, '#3a2416')
      r(3, 21, 6, 1, '#c8703a')
      r(1, 25, 10, 1, '#2b2f3c')
      r(2, 24, 1, 4, '#2b2f3c')
      r(9, 24, 1, 4, '#2b2f3c')
    }),
  drums: () =>
    sprite(32, 26, (r) => {
      // pratos
      r(1, 2, 8, 1, '#f2c14e')
      r(4, 3, 1, 12, '#9aa6b2')
      r(23, 0, 8, 1, '#f2c14e')
      r(27, 1, 1, 14, '#9aa6b2')
      // tambores
      box(r, 3, 12, 9, 6, '#e05252', '#ff8a8a', '#a83232', DARK)
      box(r, 20, 12, 9, 6, '#e05252', '#ff8a8a', '#a83232', DARK)
      r(4, 12, 7, 1, '#f6f1e6')
      r(21, 12, 7, 1, '#f6f1e6')
      box(r, 9, 10, 14, 14, '#e05252', '#ff8a8a', '#a83232', DARK)
      r(11, 13, 10, 8, '#f6f1e6')
      r(14, 15, 4, 4, '#e05252')
      r(9, 24, 2, 2, DARK)
      r(21, 24, 2, 2, DARK)
    }),
  pooltable: () =>
    sprite(50, 32, (r) => {
      box(r, 0, 0, 50, 26, '#7a4c2a', '#94603a', '#5a361e')
      r(3, 3, 44, 20, '#2f9e5a')
      r(3, 3, 44, 1, '#5ecb84')
      ;[[2, 2], [24, 2], [46, 2], [2, 22], [24, 22], [46, 22]].forEach(([x, y]) => r(x, y, 2, 2, DARK))
      r(12, 12, 2, 2, '#f6f1e6')
      ;[[32, 10, '#e05252'], [34, 12, '#f2c14e'], [32, 14, '#4d7fc6'], [36, 10, '#1a1424'], [36, 14, '#a066d0'], [38, 12, '#e8915a']].forEach(([x, y, c]) =>
        r(x, y, 2, 2, c),
      )
      r(14, 13, 16, 1, '#d8a46a')
      r(3, 26, 4, 6, '#5a361e')
      r(43, 26, 4, 6, '#5a361e')
    }),
  weights: () =>
    sprite(22, 16, (r) => {
      r(1, 4, 20, 2, '#4a5060')
      r(1, 10, 20, 2, '#4a5060')
      r(2, 4, 1, 12, '#4a5060')
      r(19, 4, 1, 12, '#4a5060')
      ;[4, 9, 14].forEach((x) => {
        r(x, 1, 3, 6, '#2b2f3c')
        r(x, 8, 3, 5, '#e05252')
      })
    }),
  boxes: () =>
    sprite(18, 20, (r) => {
      box(r, 0, 8, 18, 12, '#c8a06a', '#dcb880', '#a07a48', '#5a361e')
      r(8, 8, 2, 12, '#e8d4a8')
      box(r, 3, 0, 12, 9, '#c8a06a', '#dcb880', '#a07a48', '#5a361e')
      r(8, 0, 2, 9, '#e8d4a8')
    }),
  trash: () =>
    sprite(12, 16, (r) => {
      box(r, 0, 0, 12, 3, '#4a5060', '#6a7280', null, DARK)
      box(r, 1, 3, 10, 13, '#3a4250', '#4a5060', '#2b2f3c', DARK)
      r(3, 5, 1, 9, '#2b2f3c')
      r(6, 5, 1, 9, '#2b2f3c')
      r(9, 5, 1, 9, '#2b2f3c')
    }),
  xmastree: () =>
    sprite(20, 34, (r) => {
      r(9, 0, 2, 2, '#f2c14e')
      r(8, 1, 4, 1, '#f2c14e')
      ;[[7, 3, 6], [5, 8, 10], [3, 14, 14], [1, 20, 18]].forEach(([x, y, w]) => {
        r(x, y, w, 7, '#24804a')
        r(x + 1, y, w - 2, 2, '#38a85a')
      })
      r(8, 27, 4, 3, '#5a361e')
      box(r, 2, 28, 7, 6, '#e05252', null, null)
      r(5, 28, 1, 6, '#f2c14e')
      box(r, 11, 29, 7, 5, '#4d7fc6', null, null)
      r(14, 29, 1, 5, '#f6f1e6')
    }),
  cat: (color = 'e8915a') =>
    sprite(16, 14, (r) => {
      const c = hex(color)
      r(2, 0, 2, 2, OUT)
      r(8, 0, 2, 2, OUT)
      r(1, 2, 10, 7, OUT)
      r(2, 1, 1, 2, c)
      r(9, 1, 1, 2, c)
      r(2, 3, 8, 5, c)
      r(4, 5, 1, 1, DARK)
      r(7, 5, 1, 1, DARK)
      r(5, 6, 2, 1, '#e86aa0')
      r(1, 8, 12, 6, OUT)
      r(2, 9, 10, 4, c)
      r(3, 10, 3, 2, shadeHex(c, 0.3))
      r(12, 6, 2, 6, OUT)
      r(13, 4, 2, 3, OUT)
    }),
  dogbed: () =>
    sprite(24, 16, (r) => {
      r(0, 6, 24, 10, OUT)
      r(1, 7, 22, 8, '#4d7fc6')
      r(3, 9, 18, 5, '#7aa6e6')
      // cachorro dormindo
      r(5, 4, 14, 8, OUT)
      r(6, 5, 12, 6, '#c8904a')
      r(15, 3, 6, 6, OUT)
      r(16, 4, 4, 4, '#c8904a')
      r(16, 4, 2, 4, '#8a5a34')
      r(19, 6, 1, 1, DARK)
      r(8, 6, 4, 2, '#e8b070')
    }),

  // ================= parede
  door: () =>
    sprite(18, 30, (r) => {
      box(r, 0, 0, 18, 30, '#6a4226', '#8a5a34', null, '#3a2416')
      box(r, 2, 2, 14, 28, '#a06a3c', '#c08a52', null, '#5a361e')
      r(4, 4, 10, 10, '#8a5a34')
      r(5, 5, 8, 8, '#ae7646')
      r(4, 17, 10, 10, '#8a5a34')
      r(5, 18, 8, 8, '#ae7646')
      r(13, 15, 2, 2, '#f2c14e')
    }),
  poster: (variant = '0') =>
    sprite(14, 20, (r) => {
      const v = Number(variant) % 4
      const bg = ['#1b1f2b', '#e86aa0', '#4d7fc6', '#f2c14e'][v]
      box(r, 0, 0, 14, 20, bg, null, null, '#f6f1e6')
      if (v === 0) {
        // jogo espacial
        r(5, 4, 4, 3, '#38d27a')
        r(4, 5, 6, 1, '#38d27a')
        r(6, 10, 2, 4, '#e05252')
        r(5, 13, 4, 1, '#e05252')
        r(3, 16, 8, 1, '#f6f1e6')
      } else if (v === 1) {
        // banda
        r(4, 3, 6, 6, '#1a1424')
        r(5, 4, 4, 4, '#f6f1e6')
        r(3, 12, 8, 2, '#1a1424')
        r(3, 15, 6, 1, '#1a1424')
      } else if (v === 2) {
        // filme
        r(2, 3, 10, 9, '#f2a65a')
        r(2, 9, 10, 3, '#3a2a66')
        r(8, 4, 3, 2, '#ffe08a')
        r(3, 14, 8, 1, '#f6f1e6')
        r(4, 16, 6, 1, '#f6f1e6')
      } else {
        // smile
        r(3, 4, 8, 8, '#1a1424')
        r(4, 5, 6, 6, '#f2c14e')
        r(5, 7, 1, 1, '#1a1424')
        r(8, 7, 1, 1, '#1a1424')
        r(5, 9, 4, 1, '#1a1424')
        r(3, 15, 8, 1, '#1a1424')
      }
    }),
  neon: (variant = '0') =>
    sprite(24, 14, (r) => {
      const v = Number(variant) % 7
      const c = ['#e86aa0', '#5eead4', '#f2c14e', '#c8b4ff', '#f2c14e', '#38d27a', '#ff8ac0'][v]
      if (v === 0) {
        // coração
        ;[[4, 2, 4], [12, 2, 4], [3, 3, 6], [11, 3, 6], [3, 4, 14], [4, 6, 12], [6, 8, 8], [8, 10, 4], [9, 11, 2]].forEach(([x, y, w]) => r(x + 2, y, w, 1, c))
        r(5, 3, 1, 3, c)
        r(18, 3, 1, 3, c)
      } else if (v === 1) {
        // "GG"
        ;[2, 13].forEach((x) => {
          r(x, 2, 8, 1, c)
          r(x, 2, 1, 10, c)
          r(x, 11, 8, 1, c)
          r(x + 7, 7, 1, 5, c)
          r(x + 4, 7, 4, 1, c)
        })
      } else if (v === 3) {
        // lua crescente com estrelinha
        r(7, 1, 6, 1, c)
        r(5, 2, 3, 1, c)
        r(4, 3, 2, 8, c)
        r(5, 11, 3, 1, c)
        r(7, 12, 6, 1, c)
        r(6, 4, 1, 6, c)
        r(17, 3, 1, 3, c)
        r(16, 4, 3, 1, c)
      } else if (v === 5) {
        // controle de videogame
        r(5, 4, 14, 1, c)
        r(4, 5, 1, 6, c)
        r(19, 5, 1, 6, c)
        r(5, 11, 4, 1, c)
        r(15, 11, 4, 1, c)
        r(9, 10, 6, 1, c)
        r(7, 6, 1, 3, c)
        r(6, 7, 3, 1, c)
        r(15, 6, 1, 1, c)
        r(17, 8, 1, 1, c)
      } else if (v === 6) {
        // nota musical
        r(9, 1, 1, 10, c)
        r(9, 1, 7, 1, c)
        r(15, 1, 1, 8, c)
        r(6, 10, 4, 3, c)
        r(12, 8, 4, 3, c)
      } else if (v === 4) {
        // raio
        r(13, 1, 4, 1, c)
        r(12, 2, 3, 2, c)
        r(10, 4, 3, 2, c)
        r(8, 6, 8, 1, c)
        r(12, 7, 3, 2, c)
        r(10, 9, 3, 2, c)
        r(9, 11, 2, 2, c)
      } else {
        // estrela
        r(11, 1, 2, 3, c)
        r(3, 5, 18, 1, c)
        r(6, 6, 12, 1, c)
        r(8, 7, 8, 2, c)
        r(7, 9, 3, 2, c)
        r(14, 9, 3, 2, c)
        r(6, 11, 2, 2, c)
        r(16, 11, 2, 2, c)
      }
    }),
  garland: () =>
    sprite(40, 10, (r) => {
      r(0, 1, 40, 1, '#5a361e')
      const colors = ['#e05252', '#f2c14e', '#38d27a', '#4d7fc6', '#a066d0']
      for (let i = 0; i < 6; i += 1) {
        const x = 1 + i * 6 + (i > 2 ? 2 : 0)
        const c = colors[i % colors.length]
        r(x, 2, 5, 2, c)
        r(x + 1, 4, 3, 2, c)
        r(x + 2, 6, 1, 2, c)
      }
    }),
  mirrorround: () =>
    sprite(16, 16, (r) => {
      r(4, 0, 8, 16, '#d8a840')
      r(0, 4, 16, 8, '#d8a840')
      r(2, 2, 12, 12, '#d8a840')
      r(4, 2, 8, 12, '#bfe3f2')
      r(2, 4, 12, 8, '#bfe3f2')
      r(4, 4, 2, 4, '#ffffff')
    }),
}
