import { DARK, shade } from './color'

// Rosto do personagem: olhos, boca, barba, marcas e acessórios de rosto.
export function paintEyes(r, c, Y, sideView, blink, skinDark, fem) {
  const ec = c.eyeColor || DARK
  const style = c.eyes
  const inward = (x) => (sideView ? -1 : x < 8 ? 1 : -1) // direção do meio do rosto
  const outward = (x) => (sideView ? 1 : x < 8 ? -1 : 1)
  const lash = (x, y = Y + 5) => r(x + outward(x), y, 1, 1, DARK)
  const wing = (x) => r(x + outward(x), Y + 6, 1, 1, DARK)
  const eye = (x) => {
    if (blink || style === 'sono') {
      r(x, Y + 7, 1, 1, DARK)
      if (fem) lash(x, Y + 7)
      return
    }
    switch (style) {
      case 'feliz':
        r(x - 1, Y + 7, 1, 1, DARK)
        r(x, Y + 6, 1, 1, DARK)
        r(x + 1, Y + 7, 1, 1, DARK)
        return
      case 'piscadinha':
        if (sideView || x < 8) {
          r(x - 1, Y + 7, 3, 1, DARK)
          r(x + outward(x), Y + 6, 1, 1, DARK)
          return
        }
        r(x, Y + 6, 1, 2, ec)
        if (fem) wing(x)
        return
      case 'grandes':
        r(x, Y + 5, 1, 3, ec)
        r(x + inward(x), Y + 5, 1, 3, ec)
        r(x, Y + 5, 1, 1, '#ffffff')
        if (fem) lash(x)
        return
      case 'brilho':
        r(x, Y + 5, 1, 3, ec)
        r(x + inward(x), Y + 5, 1, 3, ec)
        r(x, Y + 5, 1, 1, '#ffffff')
        r(x + inward(x), Y + 7, 1, 1, '#c8e8ff')
        r(x + outward(x), Y + 4, 1, 1, '#f2e070')
        return
      case 'surpreso':
        r(x, Y + 6, 1, 2, '#ffffff')
        r(x + inward(x), Y + 6, 1, 2, ec)
        r(x, Y + 4, 2, 1, DARK)
        return
      case 'coracao':
        r(x - 1, Y + 5, 1, 1, '#e05252')
        r(x + 1, Y + 5, 1, 1, '#e05252')
        r(x - 1, Y + 6, 3, 1, '#e05252')
        r(x, Y + 7, 1, 1, '#e05252')
        return
      default:
        r(x, Y + 6, 1, 2, ec)
        if (style === 'cilios') lash(x)
        if (fem) wing(x)
        if (style === 'brabo') r(x + (x < 8 && !sideView ? -1 : 0), Y + 5, 2, 1, DARK)
    }
  }
  if (sideView) eye(10)
  else {
    eye(5)
    eye(10)
  }
  if (style === 'sono' && !blink) {
    if (sideView) r(9, Y + 6, 2, 1, skinDark)
    else {
      r(5, Y + 6, 1, 1, skinDark)
      r(10, Y + 6, 1, 1, skinDark)
    }
  }
}

export function paintMouth(r, mouth, Y, sideView, lip) {
  const mx = sideView ? 10 : 7
  const mw = sideView ? 1 : 2
  const corners = (dy, color) => {
    if (sideView) return
    r(6, Y + dy, 1, 1, color)
    r(9, Y + dy, 1, 1, color)
  }
  switch (mouth) {
    case 'sorriso':
      r(mx, Y + 8, mw, 1, lip)
      corners(7, lip)
      break
    case 'aberta':
      r(mx, Y + 8, mw, 1, '#8a2a3a')
      break
    case 'lingua':
      r(mx, Y + 8, mw, 1, lip)
      r(mx + (sideView ? 0 : 1), Y + 9, 1, 1, '#e86aa0')
      break
    case 'triste':
      r(mx, Y + 8, mw, 1, lip)
      corners(9, lip)
      break
    case 'sorrisao':
      if (sideView) r(10, Y + 8, 2, 1, '#8a2a3a')
      else {
        r(6, Y + 8, 4, 1, '#8a2a3a')
        r(7, Y + 9, 2, 1, '#e86aa0')
        corners(7, lip)
      }
      break
    case 'dentes':
      if (sideView) r(10, Y + 8, 2, 1, '#f6f1e6')
      else {
        r(6, Y + 8, 4, 1, '#f6f1e6')
        corners(7, lip)
      }
      break
    case 'batom':
      if (sideView) r(10, Y + 8, 1, 1, '#c8283a')
      else {
        r(6, Y + 8, 4, 1, '#c8283a')
        r(7, Y + 8, 2, 1, '#e8506a')
      }
      break
    case 'assobio':
      r(sideView ? 11 : 8, Y + 8, 1, 1, '#8a2a3a')
      break
    default:
      r(mx, Y + 8, mw, 1, lip)
  }
}

export function paintBeard(r, beard, Y, sideView, hair, skin) {
  switch (beard) {
    case 'bigode':
      r(sideView ? 9 : 6, Y + 7, sideView ? 3 : 4, 1, hair)
      break
    case 'bigodao':
      if (sideView) {
        r(9, Y + 7, 3, 1, hair)
        r(9, Y + 8, 1, 1, hair)
      } else {
        r(5, Y + 7, 6, 1, hair)
        r(4, Y + 8, 1, 1, hair)
        r(11, Y + 8, 1, 1, hair)
      }
      break
    case 'cavanhaque':
      r(sideView ? 9 : 7, Y + 9, 2, 1, hair)
      r(sideView ? 9 : 6, Y + 7, sideView ? 3 : 4, 1, hair)
      break
    case 'costeleta':
      if (sideView) r(6, Y + 4, 1, 4, hair)
      else {
        r(3, Y + 4, 1, 4, hair)
        r(12, Y + 4, 1, 4, hair)
      }
      break
    case 'rala': {
      const dot = shade(skin, -0.32)
      const dots = sideView ? [[6, 8], [8, 9], [10, 9], [7, 7]] : [[4, 7], [5, 9], [7, 9], [9, 9], [11, 7], [10, 9], [6, 8]]
      dots.forEach(([x, y]) => r(x, Y + y, 1, 1, dot))
      break
    }
    case 'barba':
      if (sideView) {
        r(5, Y + 6, 2, 3, hair)
        r(6, Y + 9, 6, 1, hair)
        r(9, Y + 7, 3, 1, hair)
      } else {
        r(3, Y + 6, 1, 3, hair)
        r(12, Y + 6, 1, 3, hair)
        r(4, Y + 8, 2, 2, hair)
        r(10, Y + 8, 2, 2, hair)
        r(5, Y + 9, 6, 1, hair)
        r(6, Y + 7, 4, 1, hair)
      }
      break
    default:
  }
}

export function paintMarks(r, marks, Y, sideView, skin) {
  switch (marks) {
    case 'sardas': {
      const spot = shade(skin, -0.3)
      const dots = sideView ? [[9, 8], [10, 7], [8, 8]] : [[4, 7], [5, 8], [3, 8], [11, 7], [10, 8], [12, 8]]
      dots.forEach(([x, y]) => r(x, Y + y, 1, 1, spot))
      break
    }
    case 'pinta':
      r(sideView ? 9 : 10, Y + 9, 1, 1, DARK)
      break
    case 'cicatriz':
      r(sideView ? 9 : 11, Y + 4, 1, 1, '#c8586a')
      r(sideView ? 10 : 10, Y + 5, 1, 1, '#c8586a')
      r(sideView ? 9 : 11, Y + 8, 1, 1, '#c8586a')
      break
    case 'curativo':
      r(sideView ? 8 : 10, Y + 8, 3, 1, '#f2d7a0')
      r(sideView ? 9 : 11, Y + 8, 1, 1, '#d8b070')
      break
    case 'pintura':
      if (sideView) {
        r(9, Y + 8, 2, 1, '#4d7fc6')
        r(8, Y + 9, 2, 1, '#e05252')
      } else {
        r(3, Y + 8, 2, 1, '#4d7fc6')
        r(11, Y + 8, 2, 1, '#4d7fc6')
        r(4, Y + 9, 1, 1, '#e05252')
        r(11, Y + 9, 1, 1, '#e05252')
      }
      break
    case 'estrela': {
      const x = sideView ? 11 : 11
      r(x, Y + 3, 1, 3, '#f2c14e')
      r(x - 1, Y + 4, 3, 1, '#f2c14e')
      break
    }
    default:
  }
}

export function paintFace(r, face, Y, side) {
  const frame = (x) => {
    r(x, Y + 5, 3, 1, DARK)
    r(x, Y + 8, 3, 1, DARK)
    r(x, Y + 5, 1, 4, DARK)
    r(x + 2, Y + 5, 1, 4, DARK)
  }
  const ring = (x, color) => {
    r(x, Y + 5, 3, 1, color)
    r(x, Y + 8, 3, 1, color)
    r(x, Y + 6, 1, 2, color)
    r(x + 2, Y + 6, 1, 2, color)
  }
  const heart = (x) => {
    r(x, Y + 5, 1, 1, '#e86aa0')
    r(x + 2, Y + 5, 1, 1, '#e86aa0')
    r(x, Y + 6, 3, 1, '#e86aa0')
    r(x + 1, Y + 7, 1, 1, '#e86aa0')
    r(x, Y + 6, 1, 1, '#ffb0d0')
  }
  switch (face) {
    case 'oculos':
      if (side) {
        frame(9)
        r(6, Y + 6, 3, 1, DARK)
      } else {
        frame(4)
        frame(9)
        r(7, Y + 6, 2, 1, DARK)
      }
      break
    case 'redondos':
      if (side) ring(9, '#d8a840')
      else {
        ring(4, '#d8a840')
        ring(9, '#d8a840')
        r(7, Y + 6, 2, 1, '#d8a840')
      }
      break
    case 'escuros':
      if (side) {
        r(9, Y + 5, 3, 3, DARK)
        r(6, Y + 5, 3, 1, DARK)
      } else {
        r(4, Y + 5, 3, 3, DARK)
        r(9, Y + 5, 3, 3, DARK)
        r(7, Y + 6, 2, 1, DARK)
        r(5, Y + 5, 1, 1, '#6a7a9a')
        r(10, Y + 5, 1, 1, '#6a7a9a')
      }
      break
    case 'tapaolho':
      if (side) r(9, Y + 5, 3, 3, DARK)
      else {
        r(9, Y + 5, 3, 3, DARK)
        r(3, Y + 4, 6, 1, DARK)
      }
      break
    case 'coracao':
      if (side) {
        heart(9)
        r(6, Y + 6, 3, 1, DARK)
      } else {
        heart(4)
        heart(9)
        r(7, Y + 6, 2, 1, DARK)
      }
      break
    case 'visor':
      if (side) {
        r(8, Y + 5, 5, 2, '#5eead4')
        r(9, Y + 5, 2, 1, '#c8fff4')
        r(5, Y + 5, 3, 1, '#2b2f3c')
      } else {
        r(3, Y + 5, 10, 2, '#5eead4')
        r(4, Y + 5, 3, 1, '#c8fff4')
        r(2, Y + 5, 1, 2, '#2b2f3c')
        r(13, Y + 5, 1, 2, '#2b2f3c')
      }
      break
    case 'monoculo':
      ring(9, '#d8a840')
      if (!side) r(11, Y + 9, 1, 3, '#d8a840')
      else r(10, Y + 9, 1, 2, '#d8a840')
      break
    case 'heroi':
      if (side) {
        r(8, Y + 5, 5, 3, '#2b2f3c')
        r(10, Y + 6, 1, 1, '#f6f1e6')
        r(5, Y + 5, 3, 1, '#2b2f3c')
      } else {
        r(3, Y + 5, 10, 3, '#2b2f3c')
        r(5, Y + 6, 1, 1, '#f6f1e6')
        r(10, Y + 6, 1, 1, '#f6f1e6')
        r(2, Y + 5, 1, 1, '#2b2f3c')
        r(13, Y + 5, 1, 1, '#2b2f3c')
      }
      break
    case 'palhaco':
      if (side) r(12, Y + 6, 2, 2, '#e05252')
      else r(7, Y + 6, 2, 2, '#e05252')
      r(side ? 12 : 7, Y + 6, 1, 1, '#ff9a9a')
      break
    default:
  }
}
