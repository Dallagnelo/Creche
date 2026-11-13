// Ainda mais móveis em pixel art para o "modo decorar" (mesmo estilo de roomSprites.js e roomSprites2.js).
import { box, OUT, shadeHex, sprite } from './roomSprites'

const hex = (color) => `#${color}`
const WOOD = '#a06a3c'
const WOOD_L = '#c48a54'
const WOOD_D = '#7a4c2a'
const METAL = '#9aa6b2'
const METAL_D = '#6a7280'

// ---------- paredes internas (divisórias) e portas
// Estilos de parede: papel liso, azulejo de banheiro, tijolo e madeira.
export const WALL_STYLES = {
  creme: { label: 'creme', swatch: '#e9dcc0', base: '#e9dcc0', line: '#e0cfae' },
  azul: { label: 'azul', swatch: '#bcd4ea', base: '#bcd4ea', line: '#aec8e0' },
  rosa: { label: 'rosa', swatch: '#f2cfdc', base: '#f2cfdc', line: '#e8bfce' },
  verde: { label: 'verde', swatch: '#cfe6c8', base: '#cfe6c8', line: '#c0dab8' },
  cinza: { label: 'cinza', swatch: '#c8ccd4', base: '#c8ccd4', line: '#bcc0c8' },
  azulejo: { label: 'azulejo', swatch: '#eef3f6', base: '#eef3f6', line: '#b8c6d0', tiles: true },
  tijolo: { label: 'tijolo', swatch: '#b85a3a', base: '#b85a3a', line: '#d8a080', bricks: true },
  madeira: { label: 'madeira', swatch: '#a06a3c', base: '#a06a3c', line: '#7a4c2a', planks: true },
}
const FACE = 24 // altura da "frente" da parede interna
const CAP = 5 // espessura do topo visto de cima

function wallFace(r, x, y, w, h, styleId, { base = true } = {}) {
  const st = WALL_STYLES[styleId] ?? WALL_STYLES.creme
  r(x, y, w, h, st.base)
  if (st.tiles) {
    for (let yy = y + 3; yy < y + h; yy += 4) r(x, yy, w, 1, st.line)
    for (let yy = y, row = 0; yy < y + h; yy += 4, row += 1) for (let xx = x + (row % 2) * 2; xx < x + w; xx += 4) r(xx, yy, 1, 3, st.line)
  } else if (st.bricks) {
    for (let yy = y + 3; yy < y + h; yy += 4) r(x, yy, w, 1, st.line)
    for (let yy = y, row = 0; yy < y + h; yy += 4, row += 1) for (let xx = x + (row % 2) * 4; xx < x + w; xx += 8) r(xx, yy, 1, 3, st.line)
  } else if (st.planks) {
    for (let xx = x + 3; xx < x + w; xx += 4) r(xx, y, 1, h, st.line)
  } else {
    for (let xx = x + 1; xx < x + w; xx += 4) r(xx, y, 2, base ? h - 6 : h, st.line)
    if (base) {
      // lambri embaixo
      r(x, y + h - 7, w, 7, '#a06a3c')
      r(x, y + h - 7, w, 1, '#c08a52')
    }
  }
  if (base) r(x, y + h - 2, w, 2, '#5a361e') // rodapé
  else r(x, y + h - 1, w, 1, shadeHex(st.base, -0.25)) // borda de baixo do vão
}
function wallCap(r, x, y, w, h) {
  r(x, y, w, h, '#f6f1e6')
  r(x, y, w, 1, '#ffffff')
  r(x, y + h - 1, w, 1, '#c8bca4')
}
// join: 'L' e/ou 'R' = encosta numa parede em pé daquele lado; o desenho ganha 4px para fechar a emenda
// (o canvas fica 8px mais largo e centralizado; o lado sem emenda fica transparente).
const horizontalWall = (len, style, join = '') =>
  sprite(len * 16 + (join ? 8 : 0), FACE + CAP, (r) => {
    const W = len * 16 + (join ? 8 : 0)
    const x0 = !join || join.includes('L') ? 0 : 4
    const x1 = !join || join.includes('R') ? W : W - 4
    wallCap(r, x0, 0, x1 - x0, CAP)
    wallFace(r, x0, CAP, x1 - x0, FACE, style)
  })
// join 'j' = continua numa parede logo abaixo (sem a frente); extra 'e' = um quadradinho a mais para fechar o canto
const verticalWall = (baseLen, style, join, extra) =>
  sprite(16, (baseLen + (extra === 'e' ? 1 : 0)) * 16 + FACE - 16 + CAP, (r) => {
    const len = baseLen + (extra === 'e' ? 1 : 0)
    const H = len * 16 + FACE - 16 + CAP
    if (join === 'j') {
      // tem outra parede em pé logo abaixo: só o topo, emendando com ela (sem a "frente" no meio)
      r(4, 0, 8, H, '#f6f1e6')
      r(4, 0, 1, H, '#ffffff')
      r(11, 0, 1, H, '#c8bca4')
      return
    }
    // topo da parede correndo de cima a baixo e, no fim, a frente
    // (a frente tem a mesma altura da parede deitada, para os cantos ficarem na mesma linha)
    r(4, 0, 8, H - FACE, '#f6f1e6')
    r(4, 0, 1, H - FACE, '#ffffff')
    r(11, 0, 1, H - FACE, '#c8bca4')
    r(4, H - FACE - 1, 8, 1, '#c8bca4')
    wallFace(r, 4, H - FACE, 8, FACE, style)
  })

export const MORE_SPRITES = {
  wallh: (style = 'creme', join = '') => horizontalWall(1, style, join),
  wallh2: (style = 'creme', join = '') => horizontalWall(2, style, join),
  wallh4: (style = 'creme', join = '') => horizontalWall(4, style, join),
  wallv: (style = 'creme', join = '', extra = '') => verticalWall(1, style, join, extra),
  wallv3: (style = 'creme', join = '', extra = '') => verticalWall(3, style, join, extra),
  // vão aberto na parede (dá para passar)
  archway: (style = 'creme') =>
    sprite(16, FACE + CAP, (r) => {
      wallCap(r, 0, 0, 16, CAP)
      wallFace(r, 0, CAP, 16, 7, style, { base: false })
      wallFace(r, 0, CAP, 3, FACE, style)
      wallFace(r, 13, CAP, 3, FACE, style)
    }),
  // porta aberta (dá para passar)
  doorin: (color = '8a5a34') =>
    sprite(16, FACE + CAP, (r) => {
      const c = hex(color)
      r(0, 0, 16, 4, OUT)
      r(1, 1, 14, 2, shadeHex(c, 0.2))
      r(0, 0, 2, FACE + CAP, OUT)
      r(14, 0, 2, FACE + CAP, OUT)
      r(1, 2, 1, FACE + CAP - 3, shadeHex(c, 0.2))
      r(14, 2, 1, FACE + CAP - 3, shadeHex(c, 0.2))
      // folha da porta aberta, encostada no batente
      r(2, 4, 4, FACE + CAP - 5, c)
      r(2, 4, 1, FACE + CAP - 5, shadeHex(c, 0.25))
      r(5, 4, 1, FACE + CAP - 5, shadeHex(c, -0.3))
      r(4, 16, 1, 2, '#f2c14e')
    }),
  // porta fechada (dá para passar também: ela abre quando alguém passa)
  doorclosed: (color = '8a5a34') =>
    sprite(16, FACE + CAP, (r) => {
      const c = hex(color)
      r(0, 0, 16, FACE + CAP, OUT)
      r(1, 1, 14, FACE + CAP - 2, c)
      box(r, 3, 3, 10, 8, c, shadeHex(c, 0.2), shadeHex(c, -0.25))
      box(r, 3, 13, 10, 12, c, shadeHex(c, 0.2), shadeHex(c, -0.25))
      r(11, 15, 2, 2, '#f2c14e')
    }),
  // cortina de miçangas (dá para passar)
  beads: () =>
    sprite(16, FACE + CAP, (r) => {
      r(0, 0, 16, 3, '#5a361e')
      r(0, 0, 2, FACE + CAP, '#5a361e')
      r(14, 0, 2, FACE + CAP, '#5a361e')
      const colors = ['#e05252', '#f2c14e', '#38d27a', '#4d7fc6', '#a066d0']
      for (let x = 3; x < 13; x += 2) for (let y = 4; y < FACE + 2; y += 3) r(x, y, 1, 2, colors[(x + y) % colors.length])
    }),
  // piso diferente (ex.: azulejo do banheiro), fica no chão
  tilepatch: (color = 'eef3f6', w = '2', h = '2') =>
    sprite(Number(w) * 16, Number(h) * 16, (r) => {
      const W = Number(w) * 16
      const H = Number(h) * 16
      const c = hex(color)
      r(0, 0, W, H, c)
      for (let y = 0; y < H; y += 8) r(0, y, W, 1, shadeHex(c, -0.15))
      for (let x = 0; x < W; x += 8) r(x, 0, 1, H, shadeHex(c, -0.15))
      for (let y = 2; y < H; y += 16) for (let x = 2; x < W; x += 16) r(x, y, 2, 1, shadeHex(c, 0.3))
    }),

  // ================= corredor divertido (também dá para pôr no quarto)
  vending: () =>
    sprite(18, 36, (r) => {
      box(r, 0, 0, 18, 36, '#c83a4a', '#e85a6a', '#a02a3a', OUT)
      r(2, 2, 14, 4, '#f6f1e6')
      ;[3, 6, 9, 12].forEach((x, i) => r(x, 3, 2, 2, ['#e05252', '#4d7fc6', '#38a85a', '#f2c14e'][i]))
      r(2, 7, 10, 20, '#1b1f2b')
      const cans = ['#e05252', '#4d7fc6', '#f2c14e', '#38a85a', '#e86aa0']
      for (let row = 0; row < 4; row += 1) for (let col = 0; col < 3; col += 1) {
        const c = cans[(row * 3 + col) % cans.length]
        r(3 + col * 3, 8 + row * 5, 2, 4, c)
        r(3 + col * 3, 8 + row * 5, 1, 4, shadeHex(c, 0.35))
      }
      r(2, 8, 1, 18, 'rgba(255,255,255,0.25)')
      r(13, 8, 3, 2, '#2b2f3c')
      r(14, 11, 1, 1, '#38d27a')
      r(14, 13, 1, 1, '#f2c14e')
      r(13, 16, 3, 1, '#d8a840')
      r(3, 29, 10, 4, '#1b1f2b')
      r(4, 30, 3, 2, '#4d7fc6')
    }),
  claw: () =>
    sprite(20, 38, (r) => {
      // letreiro
      box(r, 0, 0, 20, 7, '#e86aa0', '#ff9ac8', '#c84a80', OUT)
      ;[3, 7, 11, 15].forEach((x, i) => r(x, 3, 2, 1, i % 2 ? '#f2c14e' : '#ffffff'))
      // vitrine
      r(0, 7, 20, 19, OUT)
      r(1, 7, 18, 18, '#bfe3f2')
      r(1, 7, 18, 1, '#e8f6ff')
      // pilha de pelúcias no fundo
      const plush = ['#f2c14e', '#e05252', '#38a85a', '#a066d0', '#e8915a', '#4d7fc6']
      ;[[2, 20], [5, 19], [8, 21], [11, 19], [14, 20], [16, 21], [4, 22], [10, 22]].forEach(([x, y], i) => {
        r(x, y, 3, 3, plush[i % plush.length])
        r(x, y, 1, 1, '#ffffff')
      })
      r(1, 23, 18, 2, '#d8c8a8')
      // base com controle
      box(r, 0, 26, 20, 12, '#4d7fc6', '#7aa6e6', '#2f5c9e', OUT)
      r(4, 27, 1, 3, '#2b2f3c')
      r(3, 26, 3, 2, '#e05252')
      r(9, 28, 3, 2, '#f2c14e')
      r(14, 28, 4, 6, '#1b1f2b')
      r(2, 33, 8, 1, '#2f5c9e')
    }),
  photobooth: () =>
    sprite(32, 40, (r) => {
      box(r, 0, 0, 32, 8, '#f2c14e', '#ffe08a', '#c8962a', OUT)
      // "FOTO" em letrinhas
      const F = [[1, 1, 1], [1, 0, 0], [1, 1, 0], [1, 0, 0], [1, 0, 0]]
      const O = [[1, 1, 1], [1, 0, 1], [1, 0, 1], [1, 0, 1], [1, 1, 1]]
      const T = [[1, 1, 1], [0, 1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0]]
      ;[F, O, T, O].forEach((g, i) => g.forEach((row, y) => row.forEach((b, x) => b && r(9 + i * 4 + x, 2 + y, 1, 1, '#c83a4a'))))
      box(r, 0, 8, 32, 32, '#3a6db4', '#5a8dd4', '#24477a', OUT)
      // cortina
      r(2, 10, 14, 28, '#c83a4a')
      for (let x = 3; x < 16; x += 3) r(x, 10, 1, 28, '#a02a3a')
      r(2, 10, 14, 2, '#e85a6a')
      // lateral com tirinha de fotos e câmera
      r(19, 12, 10, 8, '#1b1f2b')
      r(22, 14, 4, 4, '#4a5060')
      r(23, 15, 2, 2, '#8ec8f0')
      r(27, 13, 1, 1, '#e05252')
      r(20, 23, 8, 14, '#f6f1e6')
      ;[24, 28, 32].forEach((y, i) => r(21, y, 6, 3, ['#e86aa0', '#5eead4', '#f2c14e'][i]))
    }),
  doormat: (color = 'e05252') =>
    sprite(16, 9, (r) => {
      const c = hex(color)
      r(1, 1, 14, 7, shadeHex(c, -0.3))
      r(0, 2, 16, 5, shadeHex(c, -0.3))
      r(2, 2, 12, 5, c)
      r(1, 3, 14, 3, c)
      // coraçãozinho no meio
      r(6, 3, 1, 1, '#f6f1e6')
      r(9, 3, 1, 1, '#f6f1e6')
      r(6, 4, 4, 1, '#f6f1e6')
      r(7, 5, 2, 1, '#f6f1e6')
    }),
  hopscotch: () =>
    sprite(32, 48, (r) => {
      const chalk = '#f6f1e6'
      const DIG = {
        1: ['010', '110', '010', '010', '111'], 2: ['111', '001', '111', '100', '111'], 3: ['111', '001', '111', '001', '111'],
        4: ['101', '101', '111', '001', '001'], 5: ['111', '100', '111', '001', '111'], 6: ['111', '100', '111', '101', '111'],
        7: ['111', '001', '010', '010', '010'], 8: ['111', '101', '111', '101', '111'],
      }
      const paint = ['#e86aa0', '#5eead4', '#f2c14e', '#a066d0']
      const cell = (x, y, w, n) => {
        r(x + 1, y + 1, w - 2, 6, paint[n % paint.length])
        r(x, y, w, 1, chalk)
        r(x, y + 7, w, 1, chalk)
        r(x, y, 1, 8, chalk)
        r(x + w - 1, y, 1, 8, chalk)
        const cx = x + Math.floor(w / 2) - 1
        DIG[n].forEach((row, yy) => [...row].forEach((b, xx) => b === '1' && r(cx + xx, y + 2 + yy - 1, 1, 1, chalk)))
      }
      // de baixo (1) para cima (8)
      cell(10, 40, 12, 1)
      cell(10, 32, 12, 2)
      cell(4, 24, 12, 3)
      cell(16, 24, 12, 4)
      cell(10, 16, 12, 5)
      cell(4, 8, 12, 6)
      cell(16, 8, 12, 7)
      cell(10, 0, 12, 8)
    }),
  mailboxes: () =>
    sprite(32, 30, (r) => {
      box(r, 0, 0, 32, 30, '#a06a3c', '#c48a54', '#7a4c2a', OUT)
      const colors = ['#e05252', '#4d7fc6', '#38a85a', '#f2c14e', '#a066d0', '#e8915a', '#5eead4', '#e86aa0']
      for (let row = 0; row < 2; row += 1) for (let col = 0; col < 4; col += 1) {
        const x = 2 + col * 7
        const y = 2 + row * 12
        const c = colors[row * 4 + col]
        box(r, x, y, 7, 11, c, shadeHex(c, 0.3), shadeHex(c, -0.3), '#3a2416')
        r(x + 3, y + 7, 1, 2, '#2b2f3c')
      }
      // carta saindo de uma das caixinhas
      r(17, 4, 6, 4, '#f6f1e6')
      r(19, 5, 2, 1, '#e05252')
      r(2, 26, 28, 2, '#5a361e')
    }),
  lostfound: () =>
    sprite(18, 22, (r) => {
      // coisas saindo da caixa
      r(2, 2, 4, 6, '#e05252')
      r(2, 7, 6, 2, '#e05252')
      r(9, 0, 5, 5, '#f2c14e')
      r(10, 1, 1, 1, '#ffffff')
      r(12, 3, 4, 3, '#38a85a')
      box(r, 0, 7, 18, 15, '#d8b47a', '#e8c890', '#b08a50')
      r(1, 7, 16, 2, '#c8a06a')
      // etiqueta "?"
      r(5, 12, 8, 7, '#f6f1e6')
      r(8, 13, 3, 1, '#2b2f3c')
      r(10, 14, 1, 1, '#2b2f3c')
      r(9, 15, 1, 1, '#2b2f3c')
      r(9, 17, 1, 1, '#2b2f3c')
    }),
  bench: () =>
    sprite(32, 20, (r) => {
      r(2, 0, 28, 3, WOOD)
      r(2, 0, 28, 1, WOOD_L)
      r(2, 4, 28, 3, WOOD)
      r(2, 4, 28, 1, WOOD_L)
      r(1, 9, 30, 3, WOOD)
      r(1, 9, 30, 1, WOOD_L)
      r(1, 12, 30, 1, WOOD_D)
      ;[3, 27].forEach((x) => {
        r(x, 0, 2, 20, '#2b2f3c')
        r(x - 1, 18, 4, 2, '#2b2f3c')
      })
    }),
  dancefloor: (w = '5', h = '3') =>
    sprite(Number(w) * 16, Number(h) * 16, (r) => {
      const W = Number(w) * 16
      const H = Number(h) * 16
      r(0, 0, W, H, '#1b1f2b')
      const colors = ['#5a3a8a', '#24477a', '#7a2f5a', '#2a5a5a']
      for (let y = 0; y < H; y += 8) for (let x = 0; x < W; x += 8) {
        r(x + 1, y + 1, 7, 7, colors[((x + y) / 8) % colors.length])
        r(x + 1, y + 1, 7, 1, 'rgba(255,255,255,0.15)')
      }
      r(0, 0, W, 1, '#f2c14e')
      r(0, H - 1, W, 1, '#f2c14e')
      r(0, 0, 1, H, '#f2c14e')
      r(W - 1, 0, 1, H, '#f2c14e')
    }),

  // ================= sala
  loveseat: (color = '3a6db4') =>
    sprite(32, 24, (r) => {
      const c = hex(color)
      const dark = shadeHex(c, -0.28)
      const light = shadeHex(c, 0.25)
      box(r, 3, 0, 26, 13, c, light, dark)
      r(16, 2, 1, 9, dark)
      box(r, 0, 7, 6, 14, shadeHex(c, -0.1), light, dark)
      box(r, 26, 7, 6, 14, shadeHex(c, -0.1), light, dark)
      box(r, 4, 11, 24, 10, c, light, dark)
      r(16, 12, 1, 8, dark)
      box(r, 6, 3, 6, 6, '#f6f1e6', '#ffffff', null)
      r(2, 21, 3, 3, OUT)
      r(27, 21, 3, 3, OUT)
    }),
  rocker: () =>
    sprite(18, 24, (r) => {
      // encosto de ripas
      r(3, 0, 12, 2, OUT)
      r(4, 1, 10, 1, WOOD_L)
      ;[4, 7, 10, 13].forEach((x) => r(x, 2, 1, 9, WOOD))
      r(3, 2, 1, 12, OUT)
      r(14, 2, 1, 12, OUT)
      // assento com almofada
      box(r, 2, 11, 14, 5, '#e8915a', '#f2b080', '#c06a3a')
      r(3, 16, 1, 4, OUT)
      r(14, 16, 1, 4, OUT)
      // base curva de balanço
      r(1, 20, 16, 2, WOOD_D)
      r(0, 19, 2, 2, WOOD_D)
      r(16, 19, 2, 2, WOOD_D)
      r(2, 20, 14, 1, WOOD_L)
    }),
  lamparc: () =>
    sprite(20, 34, (r) => {
      // cúpula pendurada à esquerda, haste curva saindo da base à direita
      r(1, 2, 10, 6, '#2b2f3c')
      r(2, 3, 8, 4, '#f2d79a')
      r(2, 3, 8, 1, '#fff2c8')
      r(5, 0, 2, 2, METAL_D)
      r(6, 0, 8, 1, METAL_D)
      r(13, 0, 2, 2, METAL_D)
      r(15, 2, 1, 4, METAL_D)
      r(16, 5, 1, 24, METAL_D)
      r(12, 29, 8, 5, '#2b2f3c')
      r(12, 29, 8, 1, '#4a5060')
    }),
  shelfcube: () =>
    sprite(32, 32, (r) => {
      box(r, 0, 0, 32, 30, '#e8eef2', '#ffffff', '#c0c8d0', '#5a6270')
      const fills = [
        ['#e05252', '#4d7fc6', '#f2c14e'],
        ['#38a85a', null, '#a066d0'],
        ['#e8915a', '#e86aa0', null],
      ]
      for (let row = 0; row < 3; row += 1) {
        for (let col = 0; col < 3; col += 1) {
          const x = 2 + col * 10
          const y = 2 + row * 9
          r(x, y, 8, 8, '#b8c2cc')
          const f = fills[row][col]
          if (!f) {
            // vasinho
            r(x + 3, y + 4, 3, 4, '#d8a840')
            r(x + 2, y + 1, 5, 3, '#38a85a')
          } else if (row === 1) {
            // caixinha
            box(r, x + 1, y + 2, 6, 6, f, shadeHex(f, 0.25), shadeHex(f, -0.25))
          } else {
            // livros
            r(x + 1, y + 1, 2, 7, f)
            r(x + 3, y + 2, 2, 6, shadeHex(f, 0.3))
            r(x + 5, y + 3, 2, 5, shadeHex(f, -0.25))
          }
        }
      }
      r(2, 30, 3, 2, OUT)
      r(27, 30, 3, 2, OUT)
    }),
  bookstack: () =>
    sprite(16, 14, (r) => {
      box(r, 1, 10, 14, 4, '#4d7fc6', '#7aa6e6', '#2f5c9e')
      box(r, 2, 6, 12, 4, '#e05252', '#ff8a8a', '#a83232')
      box(r, 3, 2, 10, 4, '#38a85a', '#5ecb84', '#24804a')
      r(4, 0, 6, 2, '#f2c14e')
      r(4, 0, 6, 1, '#ffe08a')
    }),
  radio: () =>
    sprite(18, 16, (r) => {
      r(6, 0, 1, 4, METAL_D)
      r(5, 0, 3, 1, METAL)
      box(r, 0, 3, 18, 13, '#a06a3c', '#c48a54', '#7a4c2a')
      r(2, 5, 8, 8, '#3a2416')
      for (let y = 6; y < 13; y += 2) r(3, y, 6, 1, '#5a361e')
      r(11, 5, 5, 3, '#f2d79a')
      r(13, 5, 1, 3, '#e05252')
      r(11, 10, 2, 2, '#d8a840')
      r(14, 10, 2, 2, '#d8a840')
    }),
  vase: () =>
    sprite(14, 26, (r) => {
      // galhos secos
      r(6, 0, 1, 10, '#8a5a34')
      r(3, 2, 1, 8, '#8a5a34')
      r(10, 3, 1, 7, '#8a5a34')
      ;[[5, 1], [2, 3], [9, 4], [7, 4], [4, 6]].forEach(([x, y]) => r(x, y, 2, 1, '#e8c870'))
      // vaso
      r(4, 10, 6, 2, OUT)
      r(3, 12, 8, 2, OUT)
      r(2, 14, 10, 10, OUT)
      r(3, 25, 8, 1, OUT)
      r(5, 11, 4, 1, '#4d9ad8')
      r(4, 12, 6, 2, '#4d9ad8')
      r(3, 14, 8, 10, '#4d9ad8')
      r(4, 24, 6, 1, '#4d9ad8')
      r(4, 14, 2, 8, '#8ec8f0')
      r(3, 18, 8, 1, '#f6f1e6')
    }),

  // ================= quarto
  bedcanopy: (color = 'e86aa0') =>
    sprite(34, 46, (r) => {
      const c = hex(color)
      // dossel
      r(0, 0, 34, 3, OUT)
      r(1, 1, 32, 1, WOOD_L)
      for (let x = 1; x < 33; x += 1) r(x, 3, 1, x % 6 < 3 ? 4 : 3, shadeHex(c, 0.2))
      r(0, 0, 2, 44, OUT)
      r(32, 0, 2, 44, OUT)
      r(1, 2, 1, 40, WOOD)
      r(32, 2, 1, 40, WOOD)
      // cortininhas presas nos cantos
      r(2, 6, 3, 18, shadeHex(c, 0.35))
      r(29, 6, 3, 18, shadeHex(c, 0.35))
      r(3, 24, 2, 2, shadeHex(c, 0.35))
      r(29, 24, 2, 2, shadeHex(c, 0.35))
      // cama
      box(r, 2, 12, 30, 10, WOOD, WOOD_L, WOOD_D)
      box(r, 3, 20, 28, 24, '#e8eef2', '#ffffff', '#c0c8d0')
      box(r, 7, 21, 20, 7, '#ffffff', null, '#d8e0e8', '#9aa6b2')
      box(r, 3, 29, 28, 15, c, shadeHex(c, 0.3), shadeHex(c, -0.3))
      r(3, 29, 28, 3, '#f6f1e6')
      ;[8, 15, 22].forEach((x) => r(x, 35, 4, 4, shadeHex(c, 0.15)))
    }),
  futon: (color = '38a85a') =>
    sprite(32, 18, (r) => {
      const c = hex(color)
      box(r, 0, 10, 32, 8, WOOD, WOOD_L, WOOD_D)
      box(r, 1, 4, 30, 9, c, shadeHex(c, 0.3), shadeHex(c, -0.3))
      for (let x = 6; x < 30; x += 6) r(x, 5, 1, 7, shadeHex(c, -0.2))
      box(r, 2, 0, 9, 6, '#f6f1e6', '#ffffff', '#d8d0c0')
    }),
  easel: () =>
    sprite(18, 32, (r) => {
      r(8, 0, 2, 4, WOOD_D)
      r(3, 26, 2, 6, WOOD_D)
      r(13, 26, 2, 6, WOOD_D)
      r(4, 4, 2, 24, WOOD)
      r(12, 4, 2, 24, WOOD)
      // tela com uma pintura
      box(r, 1, 3, 16, 14, '#f6f1e6', null, null, '#5a361e')
      r(2, 4, 14, 6, '#8ec8f0')
      r(11, 5, 3, 3, '#f2c14e')
      r(2, 10, 14, 6, '#38a85a')
      r(4, 8, 5, 3, '#24804a')
      r(2, 13, 14, 3, '#5ecb84')
      r(1, 17, 16, 2, WOOD_D)
      // paleta
      r(12, 20, 5, 3, '#d8b47a')
      r(13, 21, 1, 1, '#e05252')
      r(15, 21, 1, 1, '#4d7fc6')
    }),
  dino: () =>
    sprite(18, 18, (r) => {
      const g = '#38a85a'
      const gl = '#5ecb84'
      r(10, 0, 6, 5, g)
      r(11, 1, 4, 1, gl)
      r(13, 2, 1, 1, OUT)
      r(9, 4, 4, 6, g)
      r(2, 8, 11, 7, g)
      r(3, 9, 8, 2, gl)
      r(0, 10, 3, 2, g)
      r(3, 15, 3, 3, g)
      r(9, 15, 3, 3, g)
      ;[3, 6, 9].forEach((x) => r(x, 7, 2, 1, '#f2c14e'))
      r(12, 7, 2, 1, '#e86aa0')
    }),
  skate: () =>
    sprite(20, 8, (r) => {
      r(1, 1, 18, 3, OUT)
      r(0, 2, 20, 1, OUT)
      r(2, 2, 16, 1, '#e05252')
      r(4, 2, 2, 1, '#f2c14e')
      r(14, 2, 2, 1, '#f2c14e')
      r(3, 4, 4, 1, METAL_D)
      r(13, 4, 4, 1, METAL_D)
      r(2, 5, 3, 3, '#f6f1e6')
      r(15, 5, 3, 3, '#f6f1e6')
      r(5, 5, 2, 3, '#f6f1e6')
      r(13, 5, 2, 3, '#f6f1e6')
    }),
  bike: () =>
    sprite(32, 22, (r) => {
      const wheel = (cx) => {
        r(cx - 5, 11, 10, 1, OUT)
        r(cx - 5, 20, 10, 1, OUT)
        r(cx - 6, 12, 1, 8, OUT)
        r(cx + 5, 12, 1, 8, OUT)
        r(cx - 4, 12, 8, 1, '#2b2f3c')
        r(cx - 4, 19, 8, 1, '#2b2f3c')
        r(cx - 1, 15, 2, 2, METAL)
      }
      wheel(7)
      wheel(25)
      // quadro
      const frame = '#4d9ad8'
      for (let i = 0; i < 9; i += 1) r(8 + i, 15 - Math.floor(i / 1.5), 2, 1, frame)
      r(13, 9, 10, 2, frame)
      for (let i = 0; i < 6; i += 1) r(22 + Math.floor(i / 2), 10 + i, 2, 1, frame)
      r(13, 9, 2, 7, frame)
      r(11, 6, 5, 2, '#2b2f3c')
      r(21, 5, 2, 5, METAL_D)
      r(19, 4, 6, 2, '#2b2f3c')
      r(26, 14, 2, 2, METAL)
    }),
  keyboard: () =>
    sprite(32, 22, (r) => {
      box(r, 0, 2, 32, 9, '#2b2f3c', '#4a5060', '#1b1f2b')
      r(2, 4, 28, 5, '#f6f1e6')
      for (let x = 3; x < 30; x += 2) r(x, 4, 1, 5, '#d8d0c0')
      for (let x = 3; x < 29; x += 4) r(x, 4, 2, 3, '#1b1f2b')
      r(4, 2, 3, 1, '#e05252')
      r(9, 2, 3, 1, '#5eead4')
      r(3, 11, 2, 11, METAL_D)
      r(27, 11, 2, 11, METAL_D)
      r(5, 16, 22, 1, METAL_D)
    }),
  hamster: () =>
    sprite(18, 16, (r) => {
      box(r, 0, 12, 18, 4, '#e05252', '#ff8a8a', '#a83232')
      r(1, 1, 16, 1, METAL)
      r(0, 2, 1, 10, METAL)
      r(17, 2, 1, 10, METAL)
      for (let x = 3; x < 16; x += 3) r(x, 2, 1, 10, METAL)
      // roda e hamster
      r(10, 4, 6, 6, '#f2c14e')
      r(11, 5, 4, 4, '#ffe08a')
      r(3, 9, 5, 3, '#e8b070')
      r(3, 9, 2, 1, '#f6f1e6')
      r(4, 10, 1, 1, OUT)
    }),
  birdcage: () =>
    sprite(16, 30, (r) => {
      r(7, 0, 2, 3, '#d8a840')
      r(4, 3, 8, 1, '#d8a840')
      r(2, 4, 12, 1, '#d8a840')
      r(1, 5, 1, 12, '#d8a840')
      r(14, 5, 1, 12, '#d8a840')
      for (let x = 4; x < 14; x += 3) r(x, 5, 1, 12, '#d8a840')
      r(1, 17, 14, 2, '#b08a20')
      // passarinho
      r(6, 9, 4, 4, '#5eead4')
      r(9, 9, 2, 2, '#5eead4')
      r(10, 10, 1, 1, OUT)
      r(11, 10, 1, 1, '#f2c14e')
      r(5, 12, 2, 1, '#3ab8a8')
      r(4, 13, 8, 1, WOOD_D)
      // pedestal
      r(7, 19, 2, 8, METAL_D)
      r(3, 27, 10, 3, '#2b2f3c')
    }),
  fishbowl: () =>
    sprite(14, 14, (r) => {
      r(3, 1, 8, 1, '#bfe3f2')
      r(1, 2, 12, 9, '#bfe3f2')
      r(3, 11, 8, 1, '#bfe3f2')
      r(1, 5, 12, 6, '#5ab0e8')
      r(3, 11, 8, 1, '#5ab0e8')
      r(5, 6, 3, 2, '#e8915a')
      r(8, 6, 1, 2, '#e8915a')
      r(6, 6, 1, 1, OUT)
      r(2, 3, 2, 1, '#ffffff')
      r(2, 12, 10, 2, '#d8c8a8')
    }),

  // ================= cozinha e banho
  coffeemaker: () =>
    sprite(14, 18, (r) => {
      box(r, 1, 0, 12, 17, '#2b2f3c', '#4a5060', '#1b1f2b')
      r(3, 2, 8, 3, '#1b1f2b')
      r(4, 3, 2, 1, '#e05252')
      r(3, 8, 8, 1, '#1b1f2b')
      // jarra de café
      r(4, 10, 6, 5, '#bfe3f2')
      r(4, 12, 6, 3, '#5a361e')
      r(10, 11, 1, 3, '#bfe3f2')
      r(0, 17, 14, 1, OUT)
    }),
  bar: () =>
    sprite(32, 24, (r) => {
      // garrafas e copos em cima
      ;[[3, '#38a85a'], [7, '#a83232'], [11, '#e8b83a']].forEach(([x, c]) => {
        r(x, 0, 2, 3, c)
        r(x - 1, 3, 4, 6, c)
        r(x, 4, 1, 3, shadeHex(c, 0.4))
      })
      r(20, 5, 3, 4, '#bfe3f2')
      r(25, 5, 3, 4, '#bfe3f2')
      r(25, 7, 3, 2, '#e8915a')
      // balcão
      box(r, 0, 9, 32, 15, WOOD, WOOD_L, WOOD_D)
      r(0, 9, 32, 2, '#5a361e')
      r(0, 9, 32, 1, WOOD_L)
      for (let x = 6; x < 32; x += 8) r(x, 13, 1, 9, WOOD_D)
    }),
  washer: () =>
    sprite(16, 22, (r) => {
      box(r, 0, 0, 16, 22, '#e8eef2', '#ffffff', '#c0c8d0', '#5a6270')
      r(2, 2, 6, 2, '#c0c8d0')
      r(11, 2, 2, 2, '#4d7fc6')
      r(3, 7, 10, 10, '#5a6270')
      r(4, 8, 8, 8, '#8ec8f0')
      r(4, 12, 8, 4, '#5ab0e8')
      r(5, 9, 2, 1, '#ffffff')
    }),
  shower: () =>
    sprite(18, 38, (r) => {
      // vidro do box
      r(0, 2, 18, 34, '#5a6270')
      r(1, 3, 16, 32, '#cfeaf6')
      r(3, 5, 2, 12, '#ffffff')
      r(6, 5, 1, 6, '#ffffff')
      r(9, 2, 1, 34, '#9aa6b2')
      // chuveiro
      r(12, 0, 2, 4, METAL)
      r(10, 4, 6, 2, METAL_D)
      ;[11, 13, 15].forEach((x) => r(x, 7, 1, 2, '#8ec8f0'))
      r(0, 34, 18, 4, '#e8eef2')
      r(0, 34, 18, 1, '#ffffff')
    }),
  watercooler: () =>
    sprite(14, 30, (r) => {
      r(3, 0, 8, 1, '#8ec8f0')
      r(2, 1, 10, 9, '#8ec8f0')
      r(3, 2, 2, 6, '#cfeaf6')
      r(5, 10, 4, 2, '#5ab0e8')
      box(r, 1, 12, 12, 18, '#e8eef2', '#ffffff', '#c0c8d0', '#5a6270')
      r(3, 15, 2, 2, '#4d7fc6')
      r(9, 15, 2, 2, '#e05252')
      r(4, 19, 6, 1, '#9aa6b2')
    }),

  // ================= diversão
  foosball: () =>
    sprite(34, 22, (r) => {
      box(r, 0, 2, 34, 12, '#2b2f3c', '#4a5060', '#1b1f2b')
      r(2, 4, 30, 8, '#38a85a')
      r(16, 4, 1, 8, '#f6f1e6')
      ;[6, 12, 21, 27].forEach((x, i) => {
        r(x, 0, 1, 16, METAL)
        const c = i % 2 ? '#e05252' : '#4d7fc6'
        r(x - 1, 6, 3, 2, c)
        r(x - 1, 9, 3, 2, c)
      })
      r(17, 7, 2, 2, '#ffffff')
      r(2, 14, 3, 8, '#2b2f3c')
      r(29, 14, 3, 8, '#2b2f3c')
    }),
  pingpong: () =>
    sprite(48, 22, (r) => {
      box(r, 0, 2, 48, 11, '#2f5c9e', '#4d7fc6', '#24477a', '#1b1f2b')
      r(1, 7, 46, 1, '#f6f1e6')
      r(23, 1, 2, 12, '#f6f1e6')
      r(22, 0, 4, 2, '#2b2f3c')
      r(8, 4, 4, 3, '#e05252')
      r(11, 6, 2, 2, WOOD)
      r(35, 8, 4, 3, '#2b2f3c')
      r(34, 9, 2, 2, WOOD)
      r(30, 4, 1, 1, '#ffffff')
      r(3, 13, 2, 9, '#2b2f3c')
      r(43, 13, 2, 9, '#2b2f3c')
      r(22, 13, 4, 9, '#2b2f3c')
    }),

  // ================= plantas
  monstera: () =>
    sprite(18, 32, (r) => {
      const leaf = (x, y, w, h, c) => {
        r(x, y, w, h, c)
        r(x + Math.floor(w / 2), y + 1, 1, h - 1, shadeHex(c, -0.3))
      }
      leaf(1, 6, 7, 6, '#24804a')
      leaf(10, 4, 7, 7, '#38a85a')
      leaf(5, 0, 7, 7, '#38a85a')
      leaf(0, 13, 6, 5, '#38a85a')
      leaf(11, 12, 6, 6, '#24804a')
      r(2, 8, 1, 1, '#1a5a34')
      r(13, 6, 1, 2, '#5ecb84')
      r(8, 6, 2, 16, '#24804a')
      // vaso de palha
      box(r, 3, 21, 12, 11, '#d8b47a', '#e8c890', '#b08a50')
      for (let y = 23; y < 31; y += 3) r(4, y, 10, 1, '#b08a50')
    }),
  bonsai: () =>
    sprite(18, 16, (r) => {
      r(2, 1, 7, 4, '#38a85a')
      r(8, 0, 8, 4, '#24804a')
      r(3, 1, 3, 1, '#5ecb84')
      r(10, 1, 3, 1, '#38a85a')
      r(7, 4, 2, 5, '#6a4024')
      r(5, 5, 3, 1, '#6a4024')
      r(9, 6, 2, 3, '#6a4024')
      box(r, 1, 9, 16, 5, '#3a6db4', '#5a8dd4', '#24477a')
      r(3, 14, 2, 2, OUT)
      r(13, 14, 2, 2, OUT)
    }),
  sunflower: () =>
    sprite(14, 32, (r) => {
      // pétalas
      r(3, 1, 8, 1, '#f2c14e')
      r(1, 2, 12, 7, '#f2c14e')
      r(3, 9, 8, 1, '#f2c14e')
      r(4, 3, 6, 5, '#6a4024')
      r(5, 4, 2, 1, '#8a5a34')
      r(6, 10, 2, 13, '#38a85a')
      r(2, 13, 4, 2, '#38a85a')
      r(8, 16, 4, 2, '#24804a')
      box(r, 3, 23, 8, 9, '#e8915a', '#f2b080', '#c06a3a')
    }),
  planter: () =>
    sprite(32, 18, (r) => {
      const flowers = ['#e05252', '#f2c14e', '#e86aa0', '#a066d0', '#f6f1e6', '#e8915a']
      for (let i = 0; i < 6; i += 1) {
        const x = 2 + i * 5
        r(x + 1, 3 + (i % 2), 1, 6, '#24804a')
        r(x, 1 + (i % 2) * 2, 3, 3, flowers[i])
        r(x + 1, 2 + (i % 2) * 2, 1, 1, '#f2c14e')
      }
      r(1, 7, 30, 3, '#38a85a')
      box(r, 0, 9, 32, 9, WOOD, WOOD_L, WOOD_D)
      r(1, 13, 30, 1, WOOD_D)
    }),

  // ================= parede
  dartboard: () =>
    sprite(16, 16, (r) => {
      r(4, 0, 8, 16, OUT)
      r(0, 4, 16, 8, OUT)
      r(2, 2, 12, 12, OUT)
      r(5, 1, 6, 14, '#2b2f3c')
      r(1, 5, 14, 6, '#2b2f3c')
      r(3, 3, 10, 10, '#2b2f3c')
      r(4, 4, 8, 8, '#f2d79a')
      r(5, 5, 6, 6, '#e05252')
      r(6, 6, 4, 4, '#f2d79a')
      r(7, 7, 2, 2, '#38a85a')
      r(10, 3, 4, 1, '#f2c14e')
      r(12, 2, 2, 1, '#e86aa0')
    }),
  hoop: () =>
    sprite(20, 22, (r) => {
      box(r, 0, 0, 20, 14, '#f6f1e6', '#ffffff', '#d8d0c0', '#5a6270')
      r(6, 4, 8, 6, '#e05252')
      r(7, 5, 6, 4, '#f6f1e6')
      r(3, 13, 14, 2, '#e8915a')
      for (let y = 15; y < 22; y += 2) r(4 + (y - 15) / 2, y, 12 - (y - 15), 1, '#f6f1e6')
      ;[5, 9, 13].forEach((x) => r(x, 15, 1, 6, '#e8eef2'))
    }),
  tapestry: () =>
    sprite(30, 22, (r) => {
      r(0, 0, 30, 2, WOOD_D)
      r(1, 2, 28, 18, '#a066d0')
      r(1, 2, 28, 1, '#c090e8')
      // mandala simples
      r(11, 6, 8, 10, '#f2c14e')
      r(9, 8, 12, 6, '#f2c14e')
      r(12, 8, 6, 6, '#e86aa0')
      r(14, 10, 2, 2, '#f6f1e6')
      ;[[4, 5], [24, 5], [4, 15], [24, 15]].forEach(([x, y]) => r(x, y, 2, 2, '#5eead4'))
      for (let x = 2; x < 29; x += 3) r(x, 20, 1, 2, '#f2c14e')
    }),
  guitarwall: () =>
    sprite(14, 30, (r) => {
      r(6, 0, 2, 2, '#2b2f3c')
      r(6, 2, 2, 12, '#5a361e')
      for (let y = 3; y < 13; y += 3) r(6, y, 2, 1, METAL)
      r(3, 13, 8, 6, '#e05252')
      r(2, 16, 10, 2, '#e05252')
      r(1, 19, 12, 9, '#e05252')
      r(2, 28, 10, 2, '#e05252')
      r(4, 14, 2, 4, '#ff8a8a')
      r(5, 21, 4, 3, OUT)
      r(4, 26, 6, 1, '#2b2f3c')
    }),
  shelfplants: () =>
    sprite(32, 18, (r) => {
      r(0, 12, 32, 3, WOOD_D)
      r(0, 12, 32, 1, WOOD_L)
      r(2, 15, 2, 3, OUT)
      r(28, 15, 2, 3, OUT)
      // planta pendente
      box(r, 2, 6, 7, 6, '#e8eef2', '#ffffff', '#c0c8d0')
      r(1, 3, 9, 4, '#38a85a')
      r(2, 12, 2, 6, '#38a85a')
      r(6, 12, 2, 4, '#24804a')
      // cacto
      box(r, 13, 7, 6, 5, '#e8915a', '#f2b080', '#c06a3a')
      r(15, 1, 2, 6, '#38a85a')
      r(13, 3, 2, 2, '#38a85a')
      // livrinhos
      r(23, 3, 2, 9, '#4d7fc6')
      r(25, 4, 2, 8, '#f2c14e')
      r(27, 5, 2, 7, '#e05252')
    }),

  // ================= tapetes
  rugcheck: (color = 'e05252', w = '3', h = '2') =>
    sprite(Number(w) * 16, Number(h) * 16, (r) => {
      const W = Number(w) * 16
      const H = Number(h) * 16
      const c = hex(color)
      r(0, 0, W, H, '#f6f1e6')
      for (let y = 2; y < H - 2; y += 4) for (let x = 2 + ((y / 4) % 2) * 4; x < W - 2; x += 8) r(x, y, 4, 4, c)
      r(0, 0, W, 2, shadeHex(c, -0.2))
      r(0, H - 2, W, 2, shadeHex(c, -0.2))
      for (let x = 1; x < W; x += 3) {
        r(x, -0, 1, 1, '#f6f1e6')
        r(x, H - 1, 1, 1, '#f6f1e6')
      }
    }),
  rugstripe: (color = '3a6db4', w = '3', h = '2') =>
    sprite(Number(w) * 16, Number(h) * 16, (r) => {
      const W = Number(w) * 16
      const H = Number(h) * 16
      const c = hex(color)
      const tones = [c, '#f6f1e6', shadeHex(c, 0.3), '#f6f1e6']
      for (let x = 0, i = 0; x < W; x += 4, i += 1) r(x, 1, 4, H - 2, tones[i % 4])
      r(0, 0, W, 1, shadeHex(c, -0.3))
      r(0, H - 1, W, 1, shadeHex(c, -0.3))
    }),
}
