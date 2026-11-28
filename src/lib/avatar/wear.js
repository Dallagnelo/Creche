import { shade } from './color'

// O que o personagem veste por cima: chapéu, pescoço e extras (mochila, asas...).
export function paintHat(r, hat, Y, view) {
  const side = view === 'side'
  const back = view === 'back'
  switch (hat) {
    case 'bone':
      r(4, Y, 8, 1, '#e05252')
      r(3, Y + 1, 10, 3, '#e05252')
      r(5, Y + 1, 3, 1, '#ff8a8a')
      if (side) r(10, Y + 3, 5, 1, '#a83232')
      else if (!back) r(3, Y + 4, 10, 1, '#a83232')
      else r(6, Y + 4, 4, 1, '#a83232')
      break
    case 'gorro':
      r(7, Y - 2, 2, 2, '#f6f1e6')
      r(4, Y, 8, 1, '#4d7fc6')
      r(3, Y + 1, 10, 3, '#4d7fc6')
      r(3, Y + 3, 10, 1, '#2f5c9e')
      break
    case 'chapeu':
      r(5, Y - 2, 6, 3, '#e8c870')
      r(5, Y - 1, 6, 1, '#e05252')
      r(1, Y + 1, 14, 2, '#e8c870')
      r(1, Y + 2, 14, 1, '#c8a050')
      break
    case 'coroa':
      r(4, Y - 1, 8, 2, '#f2c14e')
      ;[4, 7, 10].forEach((x) => r(x, Y - 3, 2, 2, '#f2c14e'))
      r(7, Y - 1, 2, 1, '#e05252')
      r(4, Y, 8, 1, '#c8962a')
      break
    case 'tiara':
      r(3, Y + 2, 10, 1, '#e86aa0')
      if (!back) r(7, Y, 2, 2, '#f6f1e6')
      break
    case 'laco':
      if (side) {
        r(3, Y, 2, 2, '#e86aa0')
        r(3, Y + 2, 2, 1, '#c84a80')
      } else if (back) {
        r(6, Y + 2, 2, 2, '#e86aa0')
        r(9, Y + 2, 2, 2, '#e86aa0')
      } else {
        r(2, Y, 2, 2, '#e86aa0')
        r(5, Y, 2, 2, '#e86aa0')
        r(4, Y + 1, 1, 1, '#c84a80')
      }
      break
    case 'fone':
      r(3, Y - 1, 10, 1, '#2b2f3c')
      if (side) {
        r(6, Y, 1, 4, '#2b2f3c')
        r(5, Y + 4, 3, 3, '#e05252')
      } else {
        r(2, Y, 1, 4, '#2b2f3c')
        r(13, Y, 1, 4, '#2b2f3c')
        r(1, Y + 4, 2, 4, '#e05252')
        r(13, Y + 4, 2, 4, '#e05252')
      }
      break
    case 'gato':
      r(3, Y - 2, 3, 3, '#2b2f3c')
      r(10, Y - 2, 3, 3, '#2b2f3c')
      if (!back) {
        r(4, Y - 1, 1, 1, '#e86aa0')
        r(11, Y - 1, 1, 1, '#e86aa0')
      }
      break
    case 'chifres':
      r(3, Y - 2, 2, 3, '#e05252')
      r(11, Y - 2, 2, 3, '#e05252')
      r(3, Y - 3, 1, 1, '#e05252')
      r(12, Y - 3, 1, 1, '#e05252')
      break
    case 'cartola':
      r(5, Y - 3, 6, 4, '#2b2f3c')
      r(5, Y - 1, 6, 1, '#c83a4a')
      r(6, Y - 3, 1, 2, '#4a5060')
      r(3, Y + 1, 10, 1, '#2b2f3c')
      break
    case 'bruxa':
      r(8, Y - 3, 2, 1, '#5a3a8a')
      r(6, Y - 2, 4, 1, '#5a3a8a')
      r(5, Y - 1, 6, 1, '#5a3a8a')
      r(4, Y, 8, 1, '#f2c14e')
      r(1, Y + 1, 14, 1, '#5a3a8a')
      r(2, Y + 2, 12, 1, '#3e2862')
      break
    case 'cowboy':
      r(4, Y - 2, 8, 3, '#8a5a34')
      r(7, Y - 2, 2, 1, '#6a4024')
      r(4, Y, 8, 1, '#4a2c1a')
      r(1, Y + 1, 14, 1, '#8a5a34')
      r(0, Y, 1, 1, '#8a5a34')
      r(15, Y, 1, 1, '#8a5a34')
      break
    case 'boina':
      r(8, Y - 2, 1, 1, '#7a2f3a')
      r(4, Y - 1, 8, 1, '#7a2f3a')
      r(3, Y, 10, 2, '#7a2f3a')
      r(3, Y + 1, 10, 1, '#5a1f2a')
      r(5, Y - 1, 3, 1, '#9a4a54')
      break
    case 'bandana':
      r(4, Y, 8, 1, '#e05252')
      r(3, Y + 1, 10, 3, '#e05252')
      r(5, Y + 1, 1, 1, '#f6f1e6')
      r(9, Y + 2, 1, 1, '#f6f1e6')
      r(7, Y, 1, 1, '#f6f1e6')
      if (side) r(2, Y + 2, 2, 3, '#e05252')
      if (back) r(7, Y + 4, 2, 3, '#e05252')
      break
    case 'flor': {
      const x = side ? 6 : back ? 2 : 11
      r(x, Y, 3, 3, '#e86aa0')
      r(x + 1, Y - 1, 1, 1, '#e86aa0')
      r(x + 1, Y + 1, 1, 1, '#f2c14e')
      break
    }
    case 'aureola':
      r(5, Y - 3, 6, 1, '#f2e070')
      r(4, Y - 2, 1, 1, '#f2e070')
      r(11, Y - 2, 1, 1, '#f2e070')
      r(5, Y - 2, 6, 1, '#fff6c0')
      break
    case 'antenas':
      if (side) {
        r(7, Y - 2, 1, 2, '#2b2f3c')
        r(7, Y - 3, 2, 1, '#38d27a')
      } else {
        r(5, Y - 2, 1, 2, '#2b2f3c')
        r(10, Y - 2, 1, 2, '#2b2f3c')
        r(4, Y - 3, 2, 1, '#38d27a')
        r(10, Y - 3, 2, 1, '#38d27a')
      }
      break
    default:
  }
}

export function paintNeck(r, neck, Y, view, detail) {
  const side = view === 'side'
  const front = view === 'front'
  switch (neck) {
    case 'cachecol':
      r(side ? 5 : 4, Y + 10, side ? 6 : 8, 2, detail)
      if (front) r(9, Y + 12, 2, 4, detail)
      if (side) r(4, Y + 12, 2, 3, detail)
      break
    case 'colar':
      if (front) {
        r(6, Y + 11, 4, 1, '#f2c14e')
        r(7, Y + 12, 2, 1, '#f2c14e')
      }
      break
    case 'gravata':
      if (front) {
        r(7, Y + 11, 2, 1, detail)
        r(7, Y + 12, 2, 4, detail)
        r(7, Y + 15, 1, 1, shade(detail, -0.2))
      } else if (side) r(10, Y + 11, 1, 4, detail)
      break
    case 'borboleta':
      if (front) {
        r(5, Y + 11, 2, 2, detail)
        r(9, Y + 11, 2, 2, detail)
        r(7, Y + 11, 2, 1, shade(detail, -0.25))
      } else if (side) r(10, Y + 11, 1, 2, detail)
      break
    case 'lenco':
      if (front) {
        r(5, Y + 11, 6, 1, detail)
        r(6, Y + 12, 4, 1, detail)
        r(7, Y + 13, 2, 1, detail)
        r(7, Y + 12, 1, 1, '#f6f1e6')
      } else if (side) r(9, Y + 11, 2, 2, detail)
      else r(6, Y + 11, 4, 1, detail)
      break
    case 'perolas':
      if (front) {
        r(5, Y + 11, 1, 1, '#f6f1e6')
        r(10, Y + 11, 1, 1, '#f6f1e6')
        r(6, Y + 12, 4, 1, '#f6f1e6')
        r(7, Y + 12, 1, 1, '#d8d0e0')
      } else if (side) r(9, Y + 11, 2, 1, '#f6f1e6')
      break
    case 'medalha':
      if (front) {
        r(6, Y + 11, 1, 2, '#e05252')
        r(9, Y + 11, 1, 2, '#4d7fc6')
        r(7, Y + 13, 2, 2, '#f2c14e')
        r(7, Y + 13, 1, 1, '#fff2a0')
      } else if (side) r(10, Y + 13, 1, 2, '#f2c14e')
      break
    default:
  }
}

// Atrás do corpo: aparece pelos lados (de frente e de lado). De costas é pintado por cima, em paintExtraFront.
export function paintExtraBehind(r, c, Y, view, sit) {
  const color = c.extraColor || '#c83a4a'
  const dark = shade(color, -0.25)
  if (view === 'back') return
  const side = view === 'side'
  switch (c.extra) {
    case 'capa':
      if (side) {
        r(2, Y + 11, 4, sit ? 7 : 9, color)
        r(2, Y + 11, 1, sit ? 7 : 9, dark)
      } else r(2, Y + 12, 12, sit ? 6 : 8, dark)
      break
    case 'asas':
      if (side) {
        r(1, Y + 9, 4, 6, '#f6f1e6')
        r(2, Y + 11, 3, 1, '#c8d8f0')
        r(2, Y + 13, 2, 1, '#c8d8f0')
      } else {
        r(0, Y + 9, 3, 7, '#f6f1e6')
        r(13, Y + 9, 3, 7, '#f6f1e6')
        r(1, Y + 11, 2, 1, '#c8d8f0')
        r(13, Y + 11, 2, 1, '#c8d8f0')
        r(1, Y + 13, 2, 1, '#c8d8f0')
        r(13, Y + 13, 2, 1, '#c8d8f0')
      }
      break
    case 'cauda':
      if (sit) break
      if (side) [[4, 17], [3, 16], [2, 15], [2, 14], [3, 13]].forEach(([x, y]) => r(x, Y + y, 1, 1, color))
      else [[12, 18], [13, 17], [14, 16], [14, 15], [13, 14]].forEach(([x, y]) => r(x, Y + y, 1, 1, color))
      break
    default:
  }
}

export function paintExtraFront(r, c, Y, view, swing, sit, slim) {
  const color = c.extraColor || '#c83a4a'
  const dark = shade(color, -0.25)
  const back = view === 'back'
  const side = view === 'side'
  switch (c.extra) {
    case 'mochila':
      if (back) {
        r(5, Y + 12, 6, 6, color)
        r(5, Y + 12, 6, 1, shade(color, 0.15))
        r(6, Y + 15, 4, 2, dark)
        r(7, Y + 15, 2, 1, '#f2c14e')
      } else if (side) {
        r(2, Y + 12, 3, 6, color)
        r(2, Y + 15, 2, 2, dark)
        r(5, Y + 12, 1, 4, dark)
      } else {
        r(5, Y + 12, 1, 4, dark)
        r(10, Y + 12, 1, 4, dark)
      }
      break
    case 'capa':
      if (back) {
        r(3, Y + 11, 10, sit ? 7 : 10, color)
        r(3, Y + 11, 10, 1, shade(color, 0.15))
        r(7, Y + 13, 1, sit ? 5 : 8, dark)
      } else if (!side) {
        r(5, Y + 11, 1, 1, '#f2c14e')
        r(10, Y + 11, 1, 1, '#f2c14e')
      }
      break
    case 'asas':
      if (back) {
        r(1, Y + 9, 5, 8, '#f6f1e6')
        r(10, Y + 9, 5, 8, '#f6f1e6')
        r(2, Y + 11, 3, 1, '#c8d8f0')
        r(11, Y + 11, 3, 1, '#c8d8f0')
        r(2, Y + 14, 3, 1, '#c8d8f0')
        r(11, Y + 14, 3, 1, '#c8d8f0')
      }
      break
    case 'cauda':
      if (back && !sit) [[8, 17], [9, 18], [10, 17], [11, 16], [12, 15], [13, 14], [13, 13], [12, 12]].forEach(([x, y]) => r(x, Y + y, 1, 1, color))
      break
    case 'pirulito': {
      const candy = (x, y) => {
        r(x, y, 3, 3, '#e86aa0')
        r(x + 1, y + 1, 1, 1, '#f6f1e6')
        r(x, y, 1, 1, '#f2a0c8')
      }
      if (side) {
        const hx = 7 + swing * 2
        r(hx + 1, Y + 13, 1, 2, '#f6f1e6')
        candy(hx, Y + 10)
      } else if (back) {
        const h = Math.max(0, swing)
        const x = slim ? 3 : 2
        r(x, Y + 12 + h, 1, 3, '#f6f1e6')
        candy(Math.max(0, x - 2), Y + 9 + h)
      } else {
        const h = Math.max(0, -swing)
        const x = slim ? 12 : 13
        r(x, Y + 12 + h, 1, 3, '#f6f1e6')
        candy(Math.min(13, x), Y + 9 + h)
      }
      break
    }
    default:
  }
}
