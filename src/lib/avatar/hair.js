// Cabelo do personagem: frente, costas e lado.
export function topCap(r, Y, hair, light) {
  r(5, Y, 6, 1, hair)
  r(4, Y + 1, 8, 1, hair)
  r(3, Y + 2, 10, 2, hair)
  r(5, Y + 1, 3, 1, light)
}

export function paintHairFront(r, h, Y, hair, light, dark) {
  const sides = (rows) => {
    r(3, Y + 4, 1, rows, hair)
    r(12, Y + 4, 1, rows, hair)
  }
  switch (h) {
    case 'curto':
      topCap(r, Y, hair, light)
      r(3, Y + 4, 2, 1, hair)
      r(10, Y + 4, 3, 1, hair)
      sides(3)
      break
    case 'franja':
      topCap(r, Y, hair, light)
      r(3, Y + 4, 10, 1, hair)
      r(4, Y + 5, 3, 1, hair)
      r(9, Y + 5, 3, 1, hair)
      sides(4)
      break
    case 'topete':
      topCap(r, Y, hair, light)
      r(6, Y - 2, 6, 2, hair)
      r(7, Y - 2, 3, 1, light)
      r(10, Y + 4, 3, 1, hair)
      sides(2)
      break
    case 'espetado':
      topCap(r, Y, hair, light)
      ;[[3, -1], [5, -2], [7, -2], [9, -2], [11, -1]].forEach(([x, dy]) => r(x, Y + dy, 2, -dy + 1, hair))
      r(3, Y + 4, 3, 1, hair)
      r(10, Y + 4, 3, 1, hair)
      sides(2)
      break
    case 'moicano':
      r(6, Y - 2, 4, 5, hair)
      r(7, Y - 2, 2, 1, light)
      r(3, Y + 3, 1, 2, dark)
      r(12, Y + 3, 1, 2, dark)
      break
    case 'chanel':
      topCap(r, Y, hair, light)
      r(3, Y + 4, 10, 1, hair)
      r(2, Y + 3, 2, 7, hair)
      r(12, Y + 3, 2, 7, hair)
      break
    case 'longo':
      topCap(r, Y, hair, light)
      r(3, Y + 4, 2, 1, hair)
      r(10, Y + 4, 3, 1, hair)
      r(2, Y + 3, 2, 11, hair)
      r(12, Y + 3, 2, 11, hair)
      break
    case 'rabo':
      topCap(r, Y, hair, light)
      r(3, Y + 4, 2, 1, hair)
      r(10, Y + 4, 3, 1, hair)
      sides(2)
      r(13, Y + 3, 2, 7, hair)
      r(13, Y + 3, 2, 1, '#e86aa0')
      break
    case 'chiquinhas':
      topCap(r, Y, hair, light)
      r(3, Y + 4, 10, 1, hair)
      r(0, Y + 3, 3, 6, hair)
      r(13, Y + 3, 3, 6, hair)
      r(2, Y + 3, 1, 1, '#e05252')
      r(13, Y + 3, 1, 1, '#e05252')
      break
    case 'trancas':
      topCap(r, Y, hair, light)
      r(3, Y + 4, 2, 1, hair)
      r(10, Y + 4, 3, 1, hair)
      for (let yy = 4; yy < 15; yy += 2) {
        r(2, Y + yy, 2, 1, hair)
        r(12, Y + yy, 2, 1, hair)
        r(2, Y + yy + 1, 2, 1, dark)
        r(12, Y + yy + 1, 2, 1, dark)
      }
      break
    case 'coque':
      topCap(r, Y, hair, light)
      r(3, Y + 4, 2, 1, hair)
      r(10, Y + 4, 3, 1, hair)
      sides(2)
      r(6, Y - 3, 4, 3, hair)
      r(7, Y - 3, 2, 1, light)
      break
    case 'cacheado':
      r(3, Y - 1, 10, 1, hair)
      r(2, Y, 12, 4, hair)
      r(2, Y + 4, 2, 5, hair)
      r(12, Y + 4, 2, 5, hair)
      r(4, Y + 4, 1, 1, hair)
      r(11, Y + 4, 1, 1, hair)
      ;[3, 6, 9, 12].forEach((x) => r(x, Y, 1, 1, light))
      ;[2, 13].forEach((x) => r(x, Y + 6, 1, 1, light))
      break
    case 'afro':
      r(3, Y - 3, 10, 1, hair)
      r(1, Y - 2, 14, 6, hair)
      r(0, Y, 2, 7, hair)
      r(14, Y, 2, 7, hair)
      r(2, Y + 4, 2, 4, hair)
      r(12, Y + 4, 2, 4, hair)
      ;[[3, -2], [7, -3], [11, -2], [1, 1], [14, 2]].forEach(([x, dy]) => r(x, Y + dy, 1, 1, light))
      break
    case 'lateral':
      topCap(r, Y, hair, light)
      r(3, Y + 4, 6, 1, hair)
      r(3, Y + 5, 3, 1, hair)
      r(11, Y + 4, 2, 1, hair)
      r(9, Y + 1, 1, 2, dark)
      sides(3)
      break
    case 'ondulado':
      topCap(r, Y, hair, light)
      r(3, Y + 4, 3, 1, hair)
      r(10, Y + 4, 3, 1, hair)
      for (let yy = 3; yy < 13; yy += 1) {
        const off = yy % 4 < 2 ? 0 : 1
        r(2 - off, Y + yy, 2, 1, hair)
        r(12 + off, Y + yy, 2, 1, hair)
      }
      r(2, Y + 6, 1, 1, light)
      r(13, Y + 8, 1, 1, light)
      break
    case 'dreads':
      topCap(r, Y, hair, light)
      r(3, Y + 4, 2, 1, hair)
      r(10, Y + 4, 3, 1, hair)
      for (let yy = 3; yy < 13; yy += 1) {
        r(1, Y + yy, 1, 1, yy % 2 ? hair : dark)
        r(2, Y + yy, 1, 1, yy % 2 ? dark : hair)
        r(13, Y + yy, 1, 1, yy % 2 ? hair : dark)
        r(14, Y + yy, 1, 1, yy % 2 ? dark : hair)
      }
      break
    case 'pixie':
      topCap(r, Y, hair, light)
      r(4, Y - 1, 2, 1, hair)
      r(8, Y - 1, 3, 1, hair)
      r(3, Y + 4, 5, 1, hair)
      r(3, Y + 5, 2, 1, hair)
      r(11, Y + 4, 2, 1, hair)
      break
    case 'mullet':
      topCap(r, Y, hair, light)
      r(3, Y + 4, 2, 1, hair)
      r(10, Y + 4, 3, 1, hair)
      sides(5)
      r(2, Y + 7, 1, 4, hair)
      r(13, Y + 7, 1, 4, hair)
      break
    case 'raspado':
      r(5, Y + 1, 6, 1, hair)
      r(4, Y + 2, 8, 1, hair)
      r(3, Y + 3, 10, 1, hair)
      r(3, Y + 4, 1, 1, hair)
      r(12, Y + 4, 1, 1, hair)
      r(6, Y + 1, 2, 1, light)
      break
    default:
      topCap(r, Y, hair, light)
  }
}

export function paintHairBack(r, h, Y, hair, light, dark) {
  if (h === 'moicano') {
    r(6, Y - 2, 4, 11, hair)
    return
  }
  if (h === 'afro') {
    r(3, Y - 3, 10, 1, hair)
    r(1, Y - 2, 14, 9, hair)
    r(0, Y, 16, 6, hair)
    r(2, Y + 7, 12, 2, hair)
    return
  }
  if (h === 'raspado') {
    r(5, Y + 1, 6, 1, hair)
    r(4, Y + 2, 8, 1, hair)
    r(3, Y + 3, 10, 6, hair)
    r(4, Y + 9, 8, 1, hair)
    return
  }
  topCap(r, Y, hair, light)
  r(3, Y + 4, 10, 5, hair)
  r(4, Y + 9, 8, 1, hair)
  if (h === 'topete' || h === 'espetado') r(5, Y - 2, 6, 2, hair)
  if (h === 'pixie') r(4, Y - 1, 7, 1, hair)
  if (h === 'longo') r(3, Y + 9, 10, 5, hair)
  if (h === 'chanel') r(2, Y + 3, 12, 7, hair)
  if (h === 'mullet') r(3, Y + 9, 10, 3, hair)
  if (h === 'rabo') {
    r(7, Y + 9, 2, 5, hair)
    r(7, Y + 9, 2, 1, '#e86aa0')
  }
  if (h === 'chiquinhas') {
    r(0, Y + 3, 3, 6, hair)
    r(13, Y + 3, 3, 6, hair)
  }
  if (h === 'trancas') {
    for (let yy = 9; yy < 15; yy += 2) {
      r(4, Y + yy, 2, 1, hair)
      r(10, Y + yy, 2, 1, hair)
      r(4, Y + yy + 1, 2, 1, dark)
      r(10, Y + yy + 1, 2, 1, dark)
    }
  }
  if (h === 'ondulado') {
    for (let yy = 3; yy < 13; yy += 1) {
      const off = yy % 4 < 2 ? 0 : 1
      r(2 - off, Y + yy, 12 + off * 2, 1, hair)
    }
    r(5, Y + 10, 1, 1, dark)
    r(10, Y + 11, 1, 1, dark)
  }
  if (h === 'dreads') {
    for (let x = 2; x < 14; x += 2) {
      r(x, Y + 9, 1, 4, hair)
      r(x + 1, Y + 9, 1, 4, dark)
    }
  }
  if (h === 'coque') r(6, Y - 3, 4, 3, hair)
  if (h === 'cacheado') {
    r(2, Y + 1, 12, 8, hair)
    r(3, Y - 1, 10, 1, hair)
  }
}

export function paintHairSide(r, h, Y, hair, light, dark) {
  const cap = () => {
    r(5, Y, 6, 1, hair)
    r(4, Y + 1, 8, 2, hair)
    r(4, Y + 3, 4, 2, hair)
    r(5, Y + 1, 3, 1, light)
  }
  switch (h) {
    case 'moicano':
      r(5, Y - 2, 5, 4, hair)
      r(6, Y - 2, 3, 1, light)
      break
    case 'afro':
      r(2, Y - 3, 11, 9, hair)
      r(1, Y - 1, 2, 7, hair)
      r(4, Y + 6, 3, 2, hair)
      r(5, Y - 2, 2, 1, light)
      break
    case 'cacheado':
      r(3, Y - 1, 9, 4, hair)
      r(2, Y + 2, 4, 7, hair)
      r(4, Y, 1, 1, light)
      r(9, Y, 1, 1, light)
      break
    case 'raspado':
      r(5, Y + 1, 6, 1, hair)
      r(4, Y + 2, 7, 1, hair)
      r(4, Y + 3, 3, 3, hair)
      break
    default:
      cap()
      if (h === 'franja' || h === 'chanel' || h === 'chiquinhas') r(8, Y + 3, 4, 1, hair)
      if (h === 'lateral') r(8, Y + 3, 4, 2, hair)
      if (h === 'pixie') {
        r(9, Y + 3, 3, 1, hair)
        r(6, Y - 1, 4, 1, hair)
      }
      if (h === 'topete') {
        r(7, Y - 2, 6, 2, hair)
        r(8, Y - 2, 3, 1, light)
      }
      if (h === 'espetado') [[5, -1], [7, -2], [9, -2], [11, -1]].forEach(([x, dy]) => r(x, Y + dy, 2, -dy + 1, hair))
      if (h === 'chanel') r(3, Y + 3, 3, 7, hair)
      if (h === 'longo') r(3, Y + 3, 3, 11, hair)
      if (h === 'mullet') r(3, Y + 3, 3, 8, hair)
      if (h === 'ondulado') {
        for (let yy = 3; yy < 13; yy += 1) r(3 - (yy % 4 < 2 ? 0 : 1), Y + yy, 3, 1, hair)
      }
      if (h === 'dreads') {
        for (let yy = 3; yy < 13; yy += 1) {
          r(2, Y + yy, 1, 1, yy % 2 ? hair : dark)
          r(3, Y + yy, 1, 1, yy % 2 ? dark : hair)
          r(4, Y + yy, 1, 1, yy % 2 ? hair : dark)
        }
      }
      if (h === 'rabo') {
        r(2, Y + 3, 2, 7, hair)
        r(3, Y + 3, 1, 1, '#e86aa0')
      }
      if (h === 'chiquinhas') {
        r(1, Y + 3, 3, 6, hair)
        r(3, Y + 3, 1, 1, '#e05252')
      }
      if (h === 'trancas') {
        for (let yy = 4; yy < 15; yy += 2) {
          r(3, Y + yy, 2, 1, hair)
          r(3, Y + yy + 1, 2, 1, dark)
        }
      }
      if (h === 'coque') {
        r(3, Y - 2, 4, 3, hair)
        r(4, Y - 2, 2, 1, light)
      }
  }
}
