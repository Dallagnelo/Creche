// Móveis dos temas da sala da turma (um tema por dia da semana). Mesmo estilo pixel dos outros arquivos.
// Partes animadas (telão, pipoca, LED, globo, lago, fogueira) são desenhadas a cada quadro em RoomScene.
import { drawAvatar } from './avatar'
import { box, OUT, shadeHex, sprite } from './roomSprites'

const hex = (color) => `#${color}`
const WOOD = '#a06a3c'
const WOOD_L = '#c48a54'
const WOOD_D = '#7a4c2a'

// visual do DJ da sala (personagem fixo que coloca vídeos do YouTube no telão)
export const DJ_LOOK = {
  body: 'masc', skin: '#c58456', eyes: 'feliz', eyeColor: '#1a1424', mouth: 'sorrisao', blush: false, beard: 'nenhuma', marks: 'nenhum',
  hair: 'afro', hairColor: '#1f1a1a', outfit: 'jaqueta', shirt: '#a066d0', detail: '#5eead4', bottom: 'calca', pants: '#2b2f3c',
  shoes: '#e8eef2', hat: 'fone', face: 'escuros', neck: 'nenhum', extra: 'nenhum', extraColor: '#c83a4a', photo: false,
}


// TV de parede da sala da turma (o vídeo do YouTube aparece por cima da tela, que fica em dx+3, 3, 62x35)
function paintWallTv(r, ox, frame) {
  const [outline, bezel, light, dark] = frame
  r(ox + 1, 1, 68, 42, 'rgba(0,0,0,0.28)') // sombra na parede
  r(ox, 0, 68, 42, outline)
  r(ox + 1, 1, 66, 40, bezel)
  r(ox + 1, 1, 66, 1, light)
  r(ox + 1, 40, 66, 1, dark)
  // tela desligada: azul bem escuro com um reflexo na diagonal
  r(ox + 3, 3, 62, 35, '#0b0f1a')
  r(ox + 3, 3, 62, 1, '#1b2333')
  for (let i = 0; i < 14; i += 1) {
    r(ox + 34 + i, 4 + i * 2, 5, 2, 'rgba(255,255,255,0.05)')
    r(ox + 46 + i, 4 + i * 2, 2, 2, 'rgba(255,255,255,0.04)')
  }
  // logo no meio da borda de baixo
  r(ox + 31, 39, 6, 1, light)
}

export const THEME_SPRITES = {
  djnpc: () => drawAvatar(DJ_LOOK, { dir: 'down' }),
  teletv: () => sprite(70, 43, (r) => paintWallTv(r, 0, ['#07080c', '#1d1f27', '#3a3e4c', '#121318'])),
  // luau e piquenique: moldura de bambu
  teletvwood: () =>
    sprite(70, 43, (r) => {
      paintWallTv(r, 0, ['#5a3a1e', '#a06a3c', '#d6a464', '#7a4c2a'])
      for (const y of [8, 20, 32]) {
        r(0, y, 3, 1, '#5a3a1e')
        r(65, y, 3, 1, '#5a3a1e')
      }
      for (const x of [12, 28, 44, 56]) r(x, 0, 1, 3, '#5a3a1e')
    }),
  // cinema: TV entre cortinas vermelhas
  teletvcine: () =>
    sprite(128, 43, (r) => {
      paintWallTv(r, 30, ['#07080c', '#1d1f27', '#3a3e4c', '#121318'])
      for (const [x0, flip] of [[0, false], [100, true]]) {
        r(x0, 0, 28, 43, '#7a1a28')
        for (let i = 0; i < 28; i += 4) {
          const x = flip ? x0 + 27 - i : x0 + i
          r(x, 0, 2, 43, '#c83a4a')
          r(x + (flip ? -1 : 1), 0, 1, 43, '#e05252')
        }
        // amarrador dourado
        r(x0 + 4, 26, 20, 3, '#f2c14e')
        r(x0 + 4, 28, 20, 1, '#b8862a')
      }
      // bandô em cima
      r(0, 0, 128, 4, '#a8283a')
      r(0, 4, 128, 1, '#f2c14e')
      for (let x = 2; x < 128; x += 8) r(x, 5, 4, 1, '#f2c14e')
    }),
  // ================= segunda: cafeteria
  cafecounter: () =>
    sprite(48, 30, (r) => {
      // máquina de espresso, caixinha e bolos em cima do balcão
      box(r, 3, 0, 12, 12, '#c0c8d0', '#e8eef2', '#9aa6b2', '#4a5060')
      r(5, 3, 8, 2, '#2b2f3c')
      r(6, 7, 2, 3, '#4a5060')
      r(10, 7, 2, 3, '#4a5060')
      r(6, 10, 2, 2, '#f6f1e6')
      r(10, 10, 2, 2, '#f6f1e6')
      box(r, 20, 5, 9, 7, '#2b2f3c', '#4a5060', '#1b1f2b')
      r(22, 6, 5, 2, '#38d27a')
      r(33, 8, 10, 1, '#c0c8d0')
      r(34, 5, 8, 3, '#e8a0b0')
      r(34, 5, 8, 1, '#f6f1e6')
      r(37, 3, 2, 2, '#e05252')
      // balcão
      box(r, 0, 12, 48, 18, WOOD, WOOD_L, WOOD_D)
      r(0, 12, 48, 3, '#e8eef2')
      r(0, 12, 48, 1, '#ffffff')
      for (let x = 8; x < 48; x += 10) r(x, 17, 1, 11, WOOD_D)
    }),
  pastrycase: () =>
    sprite(32, 26, (r) => {
      box(r, 0, 0, 32, 26, WOOD_D, WOOD, '#5a361e', OUT)
      r(2, 2, 28, 14, '#d8eef8')
      r(2, 2, 28, 1, '#ffffff')
      r(2, 9, 28, 1, '#9aa6b2')
      // doces
      ;[[4, '#e86aa0'], [10, '#7a4c2a'], [16, '#f2c14e'], [22, '#e05252']].forEach(([x, c]) => {
        r(x, 5, 5, 4, c)
        r(x, 5, 5, 1, '#f6f1e6')
      })
      ;[[5, '#5a361e'], [12, '#e8915a'], [19, '#a066d0'], [25, '#f6f1e6']].forEach(([x, c]) => r(x, 12, 4, 3, c))
      r(3, 18, 26, 6, '#5a361e')
      r(4, 19, 24, 1, WOOD)
    }),
  chalkboard: () =>
    sprite(30, 22, (r) => {
      box(r, 0, 0, 30, 22, '#2f3b2f', '#3a4a3a', '#243024', '#8a5a34')
      r(0, 0, 30, 2, '#8a5a34')
      r(0, 20, 30, 2, '#8a5a34')
      // "cardápio" em linhas de giz
      r(4, 4, 14, 1, '#f6f1e6')
      r(4, 8, 10, 1, '#f2c14e')
      r(20, 8, 5, 1, '#f6f1e6')
      r(4, 11, 12, 1, '#e8a0b0')
      r(20, 11, 5, 1, '#f6f1e6')
      r(4, 14, 9, 1, '#5eead4')
      r(20, 14, 5, 1, '#f6f1e6')
      r(23, 3, 3, 3, '#f6f1e6')
      r(24, 2, 1, 1, '#f6f1e6')
    }),

  // ================= terça: cinema
  cinemascreen: () =>
    sprite(128, 30, (r) => {
      // cortinas vermelhas e o telão no meio
      r(0, 0, 128, 3, '#5a1f2a')
      for (let x = 0; x < 128; x += 4) r(x, 3, 2, 2, '#c83a4a')
      r(0, 0, 14, 30, '#a02a3a')
      r(114, 0, 14, 30, '#a02a3a')
      for (let x = 2; x < 14; x += 3) {
        r(x, 3, 1, 27, '#7a1f2a')
        r(114 + x, 3, 1, 27, '#7a1f2a')
      }
      r(14, 3, 100, 26, '#1b1f2b')
      r(16, 5, 96, 22, '#2b2f3c')
    }),
  cinemaseat: (color = 'c83a4a') =>
    sprite(16, 22, (r) => {
      const c = hex(color)
      // poltrona vista de trás (todo mundo olhando para o telão)
      box(r, 1, 0, 14, 14, c, shadeHex(c, 0.25), shadeHex(c, -0.25))
      r(3, 2, 10, 1, shadeHex(c, 0.35))
      r(2, 14, 12, 4, shadeHex(c, -0.3))
      r(0, 8, 2, 10, '#2b2f3c')
      r(14, 8, 2, 10, '#2b2f3c')
      r(2, 18, 2, 4, OUT)
      r(12, 18, 2, 4, OUT)
    }),
  popcorn: () =>
    sprite(18, 32, (r) => {
      box(r, 0, 0, 18, 4, '#c83a4a', '#e85a6a', '#a02a3a', OUT)
      r(3, 1, 12, 1, '#f2c14e')
      r(0, 4, 18, 16, OUT)
      r(1, 4, 16, 15, '#fff2c8')
      r(1, 13, 16, 6, '#f6e8a8')
      ;[[3, 14], [7, 15], [11, 13], [14, 15], [5, 17], [9, 17], [13, 17]].forEach(([x, y]) => r(x, y, 2, 2, '#ffffff'))
      r(1, 4, 1, 15, 'rgba(255,255,255,0.4)')
      box(r, 0, 20, 18, 12, '#c83a4a', '#e85a6a', '#a02a3a', OUT)
      for (let x = 2; x < 16; x += 4) r(x, 22, 2, 8, '#f6f1e6')
    }),
  ticketbooth: () =>
    sprite(32, 36, (r) => {
      box(r, 0, 0, 32, 8, '#f2c14e', '#ffe08a', '#c8962a', OUT)
      ;[4, 9, 14, 19, 24].forEach((x) => r(x, 3, 3, 2, '#c83a4a'))
      box(r, 0, 8, 32, 28, '#c83a4a', '#e85a6a', '#a02a3a', OUT)
      r(4, 11, 24, 12, '#2b2f3c')
      r(5, 12, 22, 10, '#8ec8f0')
      r(6, 13, 4, 6, '#d8eef8')
      r(4, 23, 24, 3, '#d8a840')
      r(12, 23, 8, 1, '#f6f1e6')
      r(4, 28, 24, 6, '#a02a3a')
      r(14, 29, 4, 4, '#f2c14e')
    }),
  candycounter: () =>
    sprite(32, 24, (r) => {
      box(r, 0, 0, 32, 24, '#5a3a8a', '#7a5aaa', '#3e2862', OUT)
      r(2, 2, 28, 10, '#d8eef8')
      const candy = ['#e05252', '#f2c14e', '#38d27a', '#e86aa0', '#4d7fc6', '#e8915a']
      for (let i = 0; i < 12; i += 1) r(3 + (i % 6) * 4 + (i > 5 ? 2 : 0), 4 + (i > 5 ? 4 : 0), 3, 3, candy[i % candy.length])
      r(2, 14, 28, 8, '#3e2862')
      r(4, 16, 24, 1, '#f2c14e')
    }),
  sconce: () =>
    sprite(10, 14, (r) => {
      r(4, 8, 2, 6, '#c8962a')
      r(2, 12, 6, 2, '#c8962a')
      r(1, 2, 8, 6, '#c8962a')
      r(2, 0, 6, 7, '#ffe08a')
      r(3, 1, 2, 4, '#fff6d0')
    }),

  // ================= quarta: fliperama
  scoreboard: () =>
    sprite(44, 22, (r) => {
      box(r, 0, 0, 44, 22, '#1b1f2b', '#2b2f3c', '#0b0f1a', '#5eead4')
      // "TOP" + três linhas de recordes
      const T = ['111', '010', '010', '010', '010']
      const O = ['111', '101', '101', '101', '111']
      const P = ['111', '101', '111', '100', '100']
      ;[T, O, P].forEach((g, i) => g.forEach((row, y) => [...row].forEach((b, x) => b === '1' && r(16 + i * 4 + x, 3 + y, 1, 1, '#f2c14e'))))
      ;[['#e86aa0', 26], ['#5eead4', 20], ['#38d27a', 15]].forEach(([c, w], i) => {
        r(4, 10 + i * 4, 3, 2, c)
        r(9, 10 + i * 4, w, 2, shadeHex(c, -0.2))
      })
    }),
  airhockey: () =>
    sprite(48, 26, (r) => {
      box(r, 0, 0, 48, 18, '#2b2f3c', '#4a5060', '#1b1f2b', OUT)
      r(3, 3, 42, 12, '#d8eef8')
      r(23, 3, 2, 12, '#e05252')
      r(3, 6, 2, 6, '#4d7fc6')
      r(43, 6, 2, 6, '#e05252')
      r(10, 7, 4, 4, '#e05252')
      r(34, 8, 4, 4, '#4d7fc6')
      r(27, 9, 2, 2, '#1b1f2b')
      r(3, 18, 4, 8, '#2b2f3c')
      r(41, 18, 4, 8, '#2b2f3c')
      r(20, 18, 8, 6, '#1b1f2b')
      r(22, 20, 4, 2, '#f2c14e')
    }),
  prizecounter: () =>
    sprite(48, 30, (r) => {
      // prateleira de prêmios atrás do balcão
      r(0, 0, 48, 14, '#5a361e')
      r(0, 6, 48, 1, '#3a2416')
      const prizes = ['#f2c14e', '#e86aa0', '#5eead4', '#a066d0', '#e05252', '#38d27a', '#4d7fc6', '#e8915a']
      for (let i = 0; i < 8; i += 1) {
        r(2 + i * 6, 1, 4, 5, prizes[i])
        r(3 + i * 6, 8, 3, 5, prizes[(i + 3) % 8])
      }
      box(r, 0, 14, 48, 16, '#c83a4a', '#e85a6a', '#a02a3a', OUT)
      r(0, 14, 48, 3, '#f2c14e')
      r(4, 20, 40, 1, '#f6f1e6')
      r(20, 22, 8, 5, '#f6f1e6')
      r(22, 23, 4, 1, '#c83a4a')
    }),

  // ================= quinta: luau
  palm: () =>
    sprite(26, 46, (r) => {
      // tronco curvinho
      for (let y = 14; y < 44; y += 1) {
        const x = 12 + Math.round(Math.sin((y - 14) / 10) * 2)
        r(x, y, 3, 1, y % 4 < 2 ? '#a06a3c' : '#8a5a34')
      }
      r(10, 43, 7, 3, '#8a5a34')
      // folhas
      const leaf = '#38a85a'
      const dark = '#24804a'
      r(4, 8, 18, 3, leaf)
      r(1, 10, 6, 3, leaf)
      r(19, 10, 6, 3, leaf)
      r(0, 13, 3, 3, dark)
      r(23, 13, 3, 3, dark)
      r(8, 4, 10, 4, leaf)
      r(11, 1, 4, 3, dark)
      r(6, 11, 4, 4, dark)
      r(16, 11, 4, 4, dark)
      r(11, 12, 2, 2, '#8a5a34')
      r(14, 13, 2, 2, '#8a5a34')
    }),
  campfire: () =>
    sprite(32, 24, (r) => {
      // pedras em roda e lenha (o fogo é animado por cima)
      ;[[2, 18], [8, 20], [16, 21], [24, 20], [28, 18]].forEach(([x, y]) => {
        r(x, y, 5, 4, '#9aa6b2')
        r(x, y, 5, 1, '#c0c8d0')
      })
      r(6, 17, 20, 3, '#6a4024')
      r(9, 15, 14, 3, '#8a5a34')
      r(10, 15, 3, 1, '#c48a54')
    }),
  log: () =>
    sprite(32, 12, (r) => {
      r(1, 2, 30, 9, '#8a5a34')
      r(1, 2, 30, 2, '#a06a3c')
      r(1, 9, 30, 2, '#6a4024')
      r(0, 2, 3, 9, '#c48a54')
      r(1, 4, 1, 4, '#8a5a34')
      for (let x = 6; x < 30; x += 7) r(x, 5, 3, 1, '#6a4024')
    }),
  parasol: (color = 'e05252') =>
    sprite(32, 38, (r) => {
      const c = hex(color)
      // gomos alternados
      for (let y = 0; y < 10; y += 1) {
        const half = Math.round(4 + (y / 10) * 12)
        for (let x = 16 - half; x < 16 + half; x += 1) r(x, y + 2, 1, 1, Math.floor((x - 16 + 32) / 4) % 2 ? c : '#f6f1e6')
      }
      r(15, 0, 2, 3, c)
      r(0, 12, 32, 2, shadeHex(c, -0.3))
      r(15, 12, 2, 24, '#e8eef2')
      r(13, 35, 6, 3, '#c8b48a')
    }),
  beachtowel: (color = 'e86aa0') =>
    sprite(16, 30, (r) => {
      const c = hex(color)
      r(1, 1, 14, 28, c)
      for (let y = 4; y < 28; y += 6) r(1, y, 14, 2, '#f6f1e6')
      r(1, 1, 14, 1, shadeHex(c, 0.3))
      r(4, 2, 8, 5, '#f6f1e6')
    }),
  juicestand: () =>
    sprite(48, 40, (r) => {
      // telhadinho de palha
      for (let x = 0; x < 48; x += 3) r(x, 0, 3, 8 + (x % 6 ? 1 : 0), x % 6 ? '#e8c870' : '#d8b050')
      r(0, 8, 48, 1, '#a8803a')
      r(3, 9, 2, 16, '#8a5a34')
      r(43, 9, 2, 16, '#8a5a34')
      // frutas e sucos no balcão
      ;[[8, '#f2c14e'], [14, '#e8915a'], [20, '#38d27a'], [26, '#e05252']].forEach(([x, c]) => {
        r(x, 18, 4, 6, '#d8eef8')
        r(x, 20, 4, 4, c)
        r(x + 2, 16, 1, 3, '#e86aa0')
      })
      r(33, 19, 4, 4, '#f2c14e')
      r(37, 20, 4, 3, '#38a85a')
      box(r, 0, 24, 48, 16, '#c48a54', '#d8a46a', '#8a5a34', OUT)
      for (let x = 4; x < 48; x += 6) r(x, 27, 2, 11, '#a06a3c')
    }),
  cooler: () =>
    sprite(16, 14, (r) => {
      box(r, 0, 2, 16, 12, '#3a6db4', '#5a8dd4', '#24477a', OUT)
      box(r, 0, 0, 16, 5, '#f6f1e6', '#ffffff', '#d8d0c0', OUT)
      r(5, 0, 6, 1, '#4a5060')
    }),
  sandcastle: () =>
    sprite(18, 18, (r) => {
      const s = '#e2c88c'
      const d = '#c8ac6c'
      r(1, 10, 16, 8, s)
      r(1, 16, 16, 2, d)
      r(1, 6, 4, 5, s)
      r(13, 6, 4, 5, s)
      r(6, 3, 6, 8, s)
      ;[1, 3, 13, 15].forEach((x) => r(x, 5, 1, 1, s))
      r(7, 13, 4, 5, d)
      r(8, 0, 1, 3, '#8a5a34')
      r(9, 0, 3, 2, '#e05252')
    }),
  surfboard: () =>
    sprite(12, 34, (r) => {
      r(4, 0, 4, 2, '#5eead4')
      r(2, 2, 8, 28, '#5eead4')
      r(3, 31, 6, 2, '#5eead4')
      r(5, 2, 2, 29, '#f6f1e6')
      r(2, 10, 8, 2, '#e8915a')
      r(4, 33, 4, 1, '#3ab8a8')
    }),

  // ================= sexta: balada
  ledwall: () =>
    sprite(96, 26, (r) => {
      box(r, 0, 0, 96, 26, '#1b1f2b', '#2b2f3c', '#0b0f1a', '#5a3a8a')
      r(2, 2, 92, 22, '#0b0f1a')
    }),
  djbooth: () =>
    sprite(64, 30, (r) => {
      // toca-discos e mixer em cima da mesa
      r(4, 4, 18, 8, '#2b2f3c')
      r(42, 4, 18, 8, '#2b2f3c')
      r(8, 5, 10, 6, '#1b1f2b')
      r(46, 5, 10, 6, '#1b1f2b')
      r(12, 7, 2, 2, '#e05252')
      r(50, 7, 2, 2, '#5eead4')
      r(26, 5, 12, 7, '#4a5060')
      for (let x = 28; x < 37; x += 3) r(x, 6, 1, 5, '#f2c14e')
      // fone
      r(30, 0, 6, 2, '#e86aa0')
      r(29, 1, 2, 4, '#e86aa0')
      r(35, 1, 2, 4, '#e86aa0')
      // mesa iluminada
      box(r, 0, 12, 64, 18, '#2b2f3c', '#4a5060', '#1b1f2b', OUT)
      for (let x = 4; x < 60; x += 8) r(x, 16, 4, 2, ['#e86aa0', '#5eead4', '#f2c14e', '#a066d0'][(x / 8) % 4])
      r(4, 22, 56, 1, '#5a3a8a')
    }),
  discoball: () =>
    sprite(16, 22, (r) => {
      r(7, 0, 2, 6, '#9aa6b2')
      r(4, 6, 8, 1, '#c0c8d0')
      r(2, 7, 12, 12, '#c0c8d0')
      r(4, 19, 8, 2, '#c0c8d0')
      for (let y = 7; y < 20; y += 2) for (let x = 2 + (y % 4 ? 1 : 0); x < 14; x += 3) r(x, y, 2, 1, '#e8eef2')
      r(4, 9, 2, 2, '#ffffff')
    }),

  // ================= domingo: jardim
  tree: () =>
    sprite(40, 52, (r) => {
      // copa grandona
      const g = ['#2f7a3a', '#38a85a', '#5ecb84']
      r(6, 4, 28, 26, g[0])
      r(2, 10, 36, 16, g[0])
      r(10, 0, 20, 6, g[0])
      r(8, 6, 22, 18, g[1])
      r(4, 12, 10, 10, g[1])
      r(26, 12, 10, 10, g[1])
      ;[[12, 3], [22, 8], [8, 14], [28, 16], [16, 18]].forEach(([x, y]) => r(x, y, 4, 3, g[2]))
      ;[[10, 10], [24, 20], [30, 10]].forEach(([x, y]) => r(x, y, 2, 2, '#e05252'))
      // tronco
      r(17, 28, 7, 22, '#8a5a34')
      r(17, 28, 2, 22, '#a06a3c')
      r(14, 48, 13, 4, '#6a4024')
      r(23, 36, 1, 3, '#6a4024')
    }),
  swing: () =>
    sprite(18, 36, (r) => {
      r(0, 0, 18, 3, '#8a5a34')
      r(0, 0, 18, 1, '#a06a3c')
      r(0, 3, 2, 33, '#8a5a34')
      r(16, 3, 2, 33, '#8a5a34')
      r(4, 3, 1, 22, '#d8c8a8')
      r(13, 3, 1, 22, '#d8c8a8')
      r(3, 25, 12, 3, '#e05252')
      r(3, 25, 12, 1, '#ff8a8a')
    }),
  picnic: () =>
    sprite(64, 48, (r) => {
      for (let y = 2; y < 46; y += 6) for (let x = 2; x < 62; x += 6) r(x, y, 6, 6, (Math.floor((x - 2) / 6) + Math.floor((y - 2) / 6)) % 2 ? '#e05252' : '#f6f1e6')
      ;[[0, 0], [60, 0], [0, 44], [60, 44]].forEach(([x, y]) => r(x, y, 4, 4, '#c83a4a'))
      // pratinhos e frutas
      ;[[12, 12], [44, 30]].forEach(([x, y]) => {
        r(x, y, 8, 5, '#ffffff')
        r(x + 2, y + 1, 4, 3, '#f2c14e')
      })
      r(46, 10, 4, 4, '#e05252')
      r(14, 32, 5, 3, '#38a85a')
    }),
  picnicbasket: () =>
    sprite(16, 16, (r) => {
      r(3, 0, 10, 2, '#a06a3c')
      r(2, 1, 2, 6, '#a06a3c')
      r(12, 1, 2, 6, '#a06a3c')
      box(r, 0, 6, 16, 10, '#d8b47a', '#e8c890', '#b08a50')
      for (let x = 3; x < 15; x += 3) r(x, 7, 1, 8, '#c8a06a')
      r(1, 5, 14, 2, '#e05252')
      r(4, 4, 3, 2, '#f2c14e')
    }),
  pond: () =>
    sprite(80, 48, (r) => {
      // lago com borda de pedras (água animada por cima)
      const rows = [[10, 60], [4, 72], [1, 78], [0, 80], [0, 80], [1, 78], [4, 72], [10, 60]]
      rows.forEach(([x, w], i) => r(x, i * 6, w, 6, '#9aa6b2'))
      const inner = [[14, 52], [8, 64], [5, 70], [4, 72], [4, 72], [5, 70], [8, 64], [14, 52]]
      inner.forEach(([x, w], i) => r(x, i * 6 + 2, w, i === 7 ? 2 : 6, '#3a8ad0'))
      r(6, 18, 4, 6, '#38a85a')
      r(70, 22, 4, 8, '#38a85a')
      r(71, 20, 2, 2, '#f2c14e')
    }),
  veggies: () =>
    sprite(48, 20, (r) => {
      box(r, 0, 8, 48, 12, '#8a5a34', '#a06a3c', '#6a4024', OUT)
      r(2, 10, 44, 6, '#5a361e')
      // alfaces, cenouras e tomates
      ;[[4, '#38a85a'], [12, '#5ecb84'], [20, '#38a85a']].forEach(([x, c]) => {
        r(x, 4, 6, 6, c)
        r(x + 2, 2, 2, 2, c)
      })
      ;[30, 35].forEach((x) => {
        r(x, 3, 2, 5, '#38a85a')
        r(x, 8, 2, 3, '#e8915a')
      })
      r(40, 2, 1, 7, '#24804a')
      r(41, 5, 3, 3, '#e05252')
      r(39, 7, 3, 3, '#e05252')
    }),
  grill: () =>
    sprite(18, 26, (r) => {
      r(2, 0, 4, 3, '#e05252')
      r(8, 1, 6, 2, '#a83232')
      r(0, 3, 18, 1, '#9aa6b2')
      box(r, 0, 4, 18, 8, '#2b2f3c', '#4a5060', '#1b1f2b', OUT)
      r(2, 6, 14, 2, '#e8915a')
      r(3, 12, 2, 12, '#4a5060')
      r(13, 12, 2, 12, '#4a5060')
      r(1, 22, 16, 2, '#4a5060')
      r(1, 24, 4, 2, '#2b2f3c')
      r(13, 24, 4, 2, '#2b2f3c')
    }),

  // ================= corredor: estação espacial
  doorsci: (color = '5eead4') =>
    sprite(18, 30, (r) => {
      const c = hex(color)
      r(0, 0, 18, 30, '#4a5468')
      r(1, 1, 16, 28, '#6a7488')
      r(2, 2, 14, 2, c) // faixa de luz em cima
      r(3, 5, 12, 25, '#2b3346')
      r(8, 5, 2, 25, '#1b2030') // porta de correr (duas folhas)
      r(4, 7, 3, 6, '#0b1030')
      r(11, 7, 3, 6, '#0b1030')
      r(4, 8, 3, 1, c)
      r(11, 8, 3, 1, c)
      r(5, 18, 2, 1, '#8a96aa')
      r(11, 18, 2, 1, '#8a96aa')
      r(0, 6, 1, 18, c)
      r(17, 6, 1, 18, c)
    }),
  porthole: (variant = '0') =>
    sprite(16, 16, (r) => {
      r(4, 0, 8, 16, '#8a96aa')
      r(0, 4, 16, 8, '#8a96aa')
      r(2, 2, 12, 12, '#8a96aa')
      r(5, 2, 6, 12, '#0b1030')
      r(3, 4, 10, 8, '#0b1030')
      r(4, 3, 8, 10, '#0b1030')
      ;[[5, 5], [10, 4], [8, 10], [11, 9]].forEach(([x, y]) => r(x, y, 1, 1, '#ffffff'))
      const v = Number(variant) % 4
      if (v === 0) {
        r(6, 6, 4, 4, '#e8915a')
        r(5, 7, 6, 1, '#f2c14e')
      } else if (v === 1) {
        r(7, 6, 4, 4, '#4d9ad8')
        r(7, 7, 2, 1, '#38a85a')
      } else if (v === 2) {
        r(5, 8, 3, 3, '#a066d0')
        r(9, 5, 2, 2, '#e8eef2')
      } else {
        r(4, 6, 8, 1, '#e86aa0')
        r(6, 7, 4, 2, '#5eead4')
      }
      r(5, 3, 2, 1, '#c8d2e0')
    }),
  lightbar: () =>
    sprite(48, 7, (r) => {
      r(6, 0, 2, 3, '#4a5468')
      r(40, 0, 2, 3, '#4a5468')
      r(1, 3, 46, 4, '#4a5468')
      r(2, 4, 44, 2, '#bff8f0')
      r(2, 4, 44, 1, '#ffffff')
    }),
  conveyor: (w = '22') =>
    sprite(Number(w) * 16, 16, (r) => {
      const W = Number(w) * 16
      r(0, 2, W, 12, '#2b3346')
      r(0, 2, W, 2, '#8a96aa')
      r(0, 12, W, 2, '#8a96aa')
      r(0, 4, W, 8, '#1b2030')
      for (let x = 0; x < W; x += 8) r(x, 4, 1, 8, '#262d40')
    }),
  teleport: (color = 'a066d0') =>
    sprite(32, 14, (r) => {
      const c = hex(color)
      r(4, 2, 24, 10, '#4a5468')
      r(1, 4, 30, 6, '#4a5468')
      r(6, 3, 20, 8, '#6a7488')
      r(3, 5, 26, 4, '#6a7488')
      r(8, 4, 16, 6, c)
      r(5, 6, 22, 2, c)
      r(10, 5, 12, 4, shadeHex(c, 0.35))
      ;[2, 15, 28].forEach((x) => r(x, 6, 2, 2, '#f2c14e'))
      r(2, 12, 28, 2, '#2b3346')
    }),
  hologram: () =>
    sprite(48, 32, (r) => {
      r(10, 24, 28, 6, '#4a5468')
      r(6, 28, 36, 4, '#2b3346')
      r(12, 24, 24, 1, '#8a96aa')
      r(16, 22, 16, 2, '#5eead4')
      r(14, 26, 4, 1, '#38d27a')
      r(30, 26, 4, 1, '#e05252')
    }),
  podchair: (color = 'e86aa0') =>
    sprite(20, 24, (r) => {
      const c = hex(color)
      // poltrona-ovo branca, aberta para a frente
      r(4, 0, 12, 2, '#e8eef2')
      r(2, 2, 16, 4, '#e8eef2')
      r(1, 6, 18, 12, '#e8eef2')
      r(2, 18, 16, 2, '#c8d2e0')
      r(4, 4, 12, 13, '#c8d2e0')
      r(5, 6, 10, 10, c)
      r(5, 6, 10, 2, shadeHex(c, 0.3))
      r(6, 13, 8, 3, shadeHex(c, -0.2))
      r(9, 20, 2, 2, '#8a96aa')
      r(5, 22, 10, 2, '#8a96aa')
    }),
  spacesuit: () =>
    sprite(18, 34, (r) => {
      r(3, 30, 12, 4, '#4a5468')
      r(8, 26, 2, 4, '#8a96aa')
      // capacete com viseira
      r(5, 0, 8, 8, '#e8eef2')
      r(6, 2, 6, 4, '#f2c14e')
      r(6, 2, 2, 1, '#fff6c0')
      // corpo
      r(3, 8, 12, 10, '#e8eef2')
      r(6, 10, 6, 4, '#c8d2e0')
      r(7, 11, 1, 1, '#e05252')
      r(9, 11, 1, 1, '#38d27a')
      r(1, 9, 2, 8, '#e8eef2')
      r(15, 9, 2, 8, '#e8eef2')
      r(4, 18, 4, 8, '#e8eef2')
      r(10, 18, 4, 8, '#e8eef2')
      r(3, 9, 12, 1, '#4d7fc6')
    }),
  rocket: () =>
    sprite(16, 36, (r) => {
      r(7, 0, 2, 3, '#e05252')
      r(5, 3, 6, 4, '#e05252')
      r(4, 7, 8, 18, '#f6f1e6')
      r(4, 7, 2, 18, '#ffffff')
      r(6, 10, 4, 4, '#4d9ad8')
      r(7, 11, 1, 1, '#ffffff')
      r(4, 18, 8, 2, '#e05252')
      r(1, 20, 3, 6, '#e05252')
      r(12, 20, 3, 6, '#e05252')
      r(5, 25, 6, 2, '#6a7488')
      r(3, 30, 10, 6, '#4a5468')
      r(4, 30, 8, 1, '#8a96aa')
      r(7, 27, 2, 3, '#8a96aa')
    }),
  alienplant: () =>
    sprite(14, 30, (r) => {
      r(2, 0, 10, 2, '#8a96aa')
      r(2, 2, 10, 22, '#bfe3f2')
      r(3, 3, 1, 20, '#e8f6ff')
      // planta alienígena brilhante
      r(6, 10, 2, 13, '#38d27a')
      r(4, 8, 6, 3, '#5eead4')
      r(3, 5, 3, 3, '#a066d0')
      r(8, 4, 3, 3, '#e86aa0')
      r(5, 14, 2, 2, '#5eead4')
      r(8, 17, 2, 2, '#5eead4')
      r(2, 22, 10, 2, '#38d27a')
      r(1, 24, 12, 6, '#4a5468')
      r(2, 25, 10, 1, '#5eead4')
    }),
  foodcapsule: () =>
    sprite(18, 34, (r) => {
      box(r, 0, 0, 18, 34, '#c8d2e0', '#e8eef2', '#9aa6b2', '#4a5468')
      r(2, 2, 14, 3, '#2b3346')
      r(3, 3, 3, 1, '#5eead4')
      r(2, 6, 10, 20, '#0b1030')
      const caps = ['#f2c14e', '#e86aa0', '#5eead4', '#a066d0', '#e8915a', '#38d27a']
      for (let i = 0; i < 9; i += 1) {
        const x = 3 + (i % 3) * 3
        const y = 8 + Math.floor(i / 3) * 6
        r(x, y, 2, 4, caps[i % caps.length])
        r(x, y, 2, 1, '#ffffff')
      }
      r(13, 8, 3, 2, '#2b3346')
      r(14, 12, 1, 1, '#5eead4')
      r(14, 14, 1, 1, '#e86aa0')
      r(3, 28, 12, 4, '#2b3346')
    }),
}

