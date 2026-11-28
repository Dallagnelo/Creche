// Personagem da sala: desenhado em pixel art por código, a partir das escolhas da pessoa
// (pele, rosto, cabelo, roupa, acessórios). O contorno escuro é calculado sozinho em volta do desenho.
// Três vistas: de frente ('down'), de costas ('up') e de lado ('right'; 'left' é o espelho).
import { SKINS, EYE_COLORS, HAIR_COLORS, OUTFITS, CLOTH_COLORS, PANTS_COLORS, SHOE_COLORS, EXTRA_COLORS, EYES, MOUTHS, BEARDS, MARKS, HAIR_STYLES, BOTTOMS, HATS, FACES, NECKS, EXTRAS, AVATAR_W, AVATAR_H } from './avatar/catalog'
import { DARK, shade } from './avatar/color'
import { paintEyes, paintMarks, paintMouth, paintBeard, paintFace } from './avatar/face'
import { paintHairSide, paintHairBack, paintHairFront } from './avatar/hair'
import { paintExtraBehind, paintExtraFront, paintNeck, paintHat } from './avatar/wear'

// as listas de opções continuam saindo daqui (quem importa de lib/avatar não muda)
export * from './avatar/catalog'

const seedOf = (text) => [...String(text)].reduce((sum, ch) => (sum * 31 + ch.charCodeAt(0)) >>> 0, 7)

const FEM_HAIR = ['longo', 'rabo', 'chiquinhas', 'trancas', 'coque', 'chanel', 'ondulado', 'cacheado', 'afro', 'pixie', 'franja', 'dreads']
const MASC_HAIR = ['curto', 'topete', 'espetado', 'moicano', 'lateral', 'raspado', 'mullet', 'careca', 'dreads', 'afro', 'cacheado', 'franja']
const LONG_HAIR = ['longo', 'rabo', 'chiquinhas', 'trancas', 'coque', 'chanel', 'ondulado']

/** Avatar padrão (quem ainda não montou o seu): sorteado a partir do id, sempre o mesmo para a pessoa. */
export function defaultAvatar(seedText = '') {
  const n = seedOf(seedText)
  const at = (list, k) => list[Math.floor(n / k) % list.length]
  const body = n % 2 ? 'fem' : 'masc'
  return {
    body,
    skin: at(SKINS, 1),
    eyes: 'normal',
    eyeColor: EYE_COLORS[0],
    mouth: 'sorriso',
    blush: body === 'fem' || n % 3 === 0,
    beard: 'nenhuma',
    marks: 'nenhum',
    hair: at(body === 'fem' ? FEM_HAIR : MASC_HAIR, 7),
    hairColor: at(HAIR_COLORS, 13),
    outfit: at(OUTFITS.slice(0, 8), 17).id,
    shirt: at(CLOTH_COLORS, 19),
    detail: at(CLOTH_COLORS, 37),
    bottom: 'calca',
    pants: at(PANTS_COLORS, 23),
    shoes: at(SHOE_COLORS, 29),
    hat: 'nenhum',
    face: 'nenhum',
    neck: 'nenhum',
    extra: 'nenhum',
    extraColor: EXTRA_COLORS[0],
    photo: false,
  }
}

/** Sorteia um visual completo, combinando o tipo de corpo com cabelo/roupa que costumam combinar. */
export function randomAvatar() {
  const look = defaultAvatar(String(Math.random()))
  const pick = (list) => list[Math.floor(Math.random() * list.length)]
  const pickId = (list) => pick(list).id
  const chance = (p) => Math.random() < p
  const body = chance(0.5) ? 'fem' : 'masc'
  const fem = body === 'fem'
  const outfits = OUTFITS.map((o) => o.id).filter((id) => fem || id !== 'vestido')
  return {
    ...look,
    body,
    skin: pick(SKINS),
    eyes: pickId(EYES),
    eyeColor: chance(0.6) ? EYE_COLORS[0] : pick(EYE_COLORS),
    mouth: chance(0.55) ? 'sorriso' : pickId(MOUTHS),
    blush: fem ? chance(0.7) : chance(0.25),
    beard: !fem && chance(0.35) ? pickId(BEARDS.slice(1)) : 'nenhuma',
    marks: chance(0.25) ? pickId(MARKS.slice(1)) : 'nenhum',
    hair: chance(0.85) ? pick(fem ? FEM_HAIR : MASC_HAIR) : pickId(HAIR_STYLES),
    hairColor: pick(HAIR_COLORS),
    outfit: pick(outfits),
    shirt: pick(CLOTH_COLORS),
    detail: pick(CLOTH_COLORS),
    bottom: fem ? pickId(BOTTOMS) : pick(['calca', 'calca', 'bermuda', 'shorts']),
    pants: pick(PANTS_COLORS),
    shoes: pick(SHOE_COLORS),
    hat: chance(0.35) ? pickId(HATS.slice(1)) : 'nenhum',
    face: chance(0.25) ? pickId(FACES.slice(1)) : 'nenhum',
    neck: chance(0.2) ? pickId(NECKS.slice(1)) : 'nenhum',
    extra: chance(0.2) ? pickId(EXTRAS.slice(1)) : 'nenhum',
    extraColor: pick(EXTRA_COLORS),
  }
}

/** Junta o que a pessoa salvou com o padrão. Avatares antigos continuam funcionando (e ganham um corpo coerente). */
export function normalizeAvatar(config, seedText) {
  const base = defaultAvatar(seedText)
  if (!config || typeof config !== 'object') return base
  const look = { ...base, ...config }
  if (config.accessory && !config.hat && !config.face) {
    if (['oculos', 'escuros'].includes(config.accessory)) look.face = config.accessory
    else if (config.accessory !== 'nenhum') look.hat = config.accessory
  }
  delete look.accessory
  // campos que surgiram depois: não sortear para quem já tinha avatar salvo
  if (!config.body) look.body = config.outfit === 'vestido' || LONG_HAIR.includes(config.hair) ? 'fem' : 'masc'
  if (!config.bottom) look.bottom = 'calca'
  if (!('blush' in config)) look.blush = false
  return look
}

// ---------- desenho
export function outline(canvas, { soft = false } = {}) {
  const ctx = canvas.getContext('2d')
  const { width: w, height: h } = canvas
  const img = ctx.getImageData(0, 0, w, h)
  const at = (x, y) => (x >= 0 && y >= 0 && x < w && y < h && img.data[(y * w + x) * 4 + 3] > 0 ? (y * w + x) * 4 : -1)
  const edge = []
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (at(x, y) >= 0) continue
      const above = at(x, y - 1)
      const n = [at(x - 1, y), at(x + 1, y), above, at(x, y + 1)].find((i) => i >= 0)
      if (n === undefined) continue
      if (!soft || (above >= 0 && at(x, y + 1) < 0 && at(x - 1, y) < 0 && at(x + 1, y) < 0)) {
        edge.push([x, y, DARK])
        continue
      }
      // contorno "colorido": a cor do vizinho bem escurecida (fica mais suave que o preto puro)
      const k = 0.32
      const mix = (c, d) => Math.round(c * k + d * (1 - k))
      edge.push([x, y, `rgb(${mix(img.data[n], 26)},${mix(img.data[n + 1], 20)},${mix(img.data[n + 2], 36)})`])
    }
  }
  edge.forEach(([x, y, color]) => {
    ctx.fillStyle = color
    ctx.fillRect(x, y, 1, 1)
  })
}

/**
 * Desenha o personagem.
 * dir: 'down' (frente), 'up' (costas), 'right' ou 'left' (lado). frame: 0 parado, 1 e 2 passos.
 * pose: null | 'sit'. blink: olhos fechados neste quadro. withFace=false deixa o rosto em branco (foto no lugar).
 */
export function drawAvatar(config, { dir = 'down', frame = 0, pose = null, withFace = true, blink = false } = {}) {
  const canvas = document.createElement('canvas')
  canvas.width = AVATAR_W
  canvas.height = AVATAR_H
  const ctx = canvas.getContext('2d')
  const r = (x, y, w, h, color) => {
    if (w <= 0 || h <= 0) return
    if (color === null) {
      ctx.clearRect(x, y, w, h)
      return
    }
    ctx.fillStyle = color
    ctx.fillRect(x, y, w, h)
  }
  const side = dir === 'right' || dir === 'left'
  const view = side ? 'side' : dir === 'up' ? 'back' : 'front'
  paint(r, config, { view, frame, sit: pose === 'sit', withFace, blink })
  outline(canvas, { soft: true })
  if (dir === 'left') {
    const flipped = document.createElement('canvas')
    flipped.width = AVATAR_W
    flipped.height = AVATAR_H
    const fctx = flipped.getContext('2d')
    fctx.translate(AVATAR_W, 0)
    fctx.scale(-1, 1)
    fctx.drawImage(canvas, 0, 0)
    return flipped
  }
  return canvas
}

function paint(r, c, { view, frame, sit, withFace, blink }) {
  const Y = 3 + (sit ? 2 : 0) // tudo desce 3px para caber cabelo alto e chapéu; sentado desce mais 2
  const front = view === 'front'
  const back = view === 'back'
  const sideView = view === 'side'
  const fem = c.body === 'fem'
  const skin = c.skin
  const skinDark = shade(skin, -0.18)
  const hair = c.hairColor
  const hairLight = shade(hair, 0.28)
  const hairDark = shade(hair, -0.25)
  const shirt = c.shirt
  const shirtDark = shade(shirt, -0.22)
  const shirtLight = shade(shirt, 0.18)
  const detail = c.detail ?? '#f6f1e6'
  const pants = c.pants
  const o = c.outfit
  const dress = o === 'vestido'
  const overalls = o === 'macacao'
  const bottom = dress ? 'vestido' : c.bottom || 'calca'
  const skirt = bottom === 'saia' || bottom === 'longa'
  // quantas linhas da perna (das 3 abaixo da cintura) ficam cobertas pela calça
  const pantsRows = { calca: 3, bermuda: 2, shorts: 1 }[bottom] ?? 0
  const swing = frame === 1 ? 1 : frame === 2 ? -1 : 0

  // ===== coisas atrás do corpo (capa, asas, rabinho)
  paintExtraBehind(r, c, Y, view, sit)

  // ===== pernas e sapatos
  if (sit) {
    r(4, Y + 18, 8, 2, pantsRows >= 2 ? pants : skin)
    if (!dress) r(4, Y + 18, 8, 1, pants)
    if (bottom === 'longa') r(3, Y + 18, 10, 2, pants)
    r(4, Y + 20, 3, 1, c.shoes)
    r(9, Y + 20, 3, 1, c.shoes)
  } else if (sideView) {
    // passada de lado: uma perna à frente e outra atrás
    const legA = frame === 1 ? 2 : frame === 2 ? -1 : 0
    const legB = frame === 1 ? -1 : frame === 2 ? 2 : 0
    const rows = pantsRows ? pantsRows + 1 : 0
    const leg = (x, dark) => {
      r(x, Y + 18, 3, 4, dark ? shade(skin, -0.15) : skin)
      r(x, Y + 18, 3, rows, dark ? shade(pants, -0.15) : pants)
    }
    leg(6 + legB, true)
    leg(7 + legA, false)
    r(6 + legB, Y + 22, 4, 1, shade(c.shoes, -0.1))
    r(7 + legA, Y + 22, 4, 1, c.shoes)
    if (bottom === 'saia') {
      r(4, Y + 18, 8, 2, pants)
      r(4, Y + 19, 8, 1, shade(pants, -0.2))
    }
    if (bottom === 'longa') {
      r(4, Y + 18, 8, 4, pants)
      r(4, Y + 21, 8, 1, shade(pants, -0.2))
    }
  } else {
    const liftL = frame === 1 ? 1 : 0
    const liftR = frame === 2 ? 1 : 0
    if (!dress && !skirt) {
      r(4, Y + 18, 8, 1, shade(pants, -0.28)) // cinto
      if (front) r(7, Y + 18, 2, 1, '#d8a840') // fivela
    }
    const leg = (x, lift, inner) => {
      r(x, Y + 19, 3, 3 - lift, skin)
      r(x, Y + 19, 3, Math.min(pantsRows, 3 - lift), pants)
      // sombrinha do lado de dentro da perna
      r(inner, Y + 19, 1, Math.min(pantsRows, 3 - lift), shade(pants, -0.18))
      if (pantsRows < 3 - lift) r(inner, Y + 19 + pantsRows, 1, 3 - lift - pantsRows, shade(skin, -0.12))
    }
    leg(5, liftL, 7)
    leg(8, liftR, 8)
    const shoe = (x, y) => {
      r(x, y, 4, 1, c.shoes)
      r(front ? x + 1 : x, y, 2, 1, shade(c.shoes, 0.35)) // bico claro do tênis
    }
    shoe(4, Y + 22 - liftL)
    shoe(8, Y + 22 - liftR)
    if (bottom === 'saia') {
      r(3, Y + 18, 10, 2, pants)
      r(4, Y + 18, 8, 1, shade(pants, 0.12))
      r(3, Y + 19, 10, 1, shade(pants, -0.2))
    }
    if (bottom === 'longa') {
      r(3, Y + 18, 10, 4, pants)
      r(4, Y + 18, 8, 1, shade(pants, 0.12))
      r(3, Y + 21, 10, 1, shade(pants, -0.2))
    }
  }

  // ===== corpo
  // corpo feminino: tronco mais estreito e quadril marcado; braços acompanham
  const slim = fem && !sideView
  const bx = sideView || slim ? 5 : 4
  const bw = sideView || slim ? 6 : 8
  const ax1 = slim ? 4 : 3
  const ax2 = slim ? 11 : 12
  r(bx + 1, Y + 11, bw - 2, 1, shirt)
  r(bx, Y + 12, bw, 6, shirt)
  r(bx, Y + 12, bw, 1, shirtLight)
  r(bx, Y + 17, bw, 1, shirtDark)
  // volume: luz vindo da esquerda (lado direito do tronco mais escuro)
  if (!sideView) {
    r(bx + bw - 1, Y + 12, 1, 6, shade(shirt, -0.16))
    r(bx, Y + 13, 1, 4, shade(shirt, 0.08))
  } else r(bx, Y + 12, 1, 6, shade(shirt, -0.16))
  // decote (roupas sem gola)
  if (front && ['camiseta', 'listrada', 'xadrez', 'time', 'regata', 'vestido', 'havaiana'].includes(o)) {
    r(7, Y + 11, 2, 1, skin)
    r(7, Y + 12, 2, 1, shade(skin, -0.1))
  }
  if (o === 'listrada') [13, 15].forEach((dy) => r(bx, Y + dy, bw, 1, detail))
  if (o === 'xadrez') {
    for (let yy = 12; yy < 18; yy += 2) for (let xx = (yy / 2) % 2; xx < bw; xx += 2) r(bx + xx, Y + yy, 1, 1, detail)
    for (let xx = 1; xx < bw; xx += 3) r(bx + xx, Y + 12, 1, 6, shade(shirt, -0.12))
  }
  if (o === 'moletom') {
    if (front) {
      r(7, Y + 12, 1, 3, detail)
      r(9, Y + 12, 1, 3, detail)
      r(5, Y + 15, 6, 2, shirtDark)
    } else if (back) r(5, Y + 11, 6, 3, shirtDark)
    else r(5, Y + 11, 2, 3, shirtDark)
  }
  if (o === 'jaqueta') {
    if (front) {
      r(7, Y + 11, 2, 7, detail)
      r(6, Y + 12, 1, 6, shirtDark)
      r(9, Y + 12, 1, 6, shirtDark)
    } else if (sideView) r(10, Y + 12, 1, 6, detail)
  }
  if (o === 'terno') {
    if (front) {
      r(7, Y + 11, 2, 6, '#f6f1e6')
      r(7, Y + 12, 2, 4, detail)
      r(6, Y + 11, 1, 3, shirtDark)
      r(9, Y + 11, 1, 3, shirtDark)
    } else if (sideView) r(10, Y + 11, 1, 3, '#f6f1e6')
  }
  if (o === 'time') {
    r(bx, Y + 12, bw, 1, detail)
    if (front) {
      r(7, Y + 14, 2, 1, detail)
      r(8, Y + 14, 1, 3, detail)
      r(7, Y + 16, 2, 1, detail)
    }
    if (back) {
      r(6, Y + 13, 1, 3, detail)
      r(9, Y + 13, 1, 3, detail)
      r(6, Y + 13, 4, 1, detail)
    }
  }
  if (o === 'polo') {
    if (front) {
      r(5, Y + 11, 2, 1, detail)
      r(9, Y + 11, 2, 1, detail)
      r(7, Y + 12, 2, 2, shirtLight)
      r(8, Y + 12, 1, 2, detail)
    } else if (back) r(5, Y + 11, 6, 1, detail)
    else r(8, Y + 11, 3, 1, detail)
  }
  if (o === 'havaiana') {
    const dots = sideView ? [[5, 13], [8, 12], [7, 15], [9, 16]] : [[4, 13], [7, 12], [10, 13], [5, 16], [8, 15], [11, 16]]
    dots.forEach(([x, y]) => {
      r(x, Y + y, 1, 1, detail)
      r(x + 1, Y + y, 1, 1, '#f6f1e6')
      r(x, Y + y + 1, 1, 1, '#f6f1e6')
    })
    if (front) r(7, Y + 11, 2, 2, shirtDark)
  }
  if (o === 'colete') {
    if (front) {
      r(7, Y + 11, 2, 5, detail)
      r(7, Y + 13, 1, 1, shirtDark)
      r(7, Y + 15, 1, 1, shirtDark)
    } else if (sideView) r(9, Y + 11, 2, 3, detail)
  }
  if (o === 'casaco' && !sit) {
    if (front) {
      r(4, Y + 18, 2, 3, shirt)
      r(10, Y + 18, 2, 3, shirt)
      r(7, Y + 11, 2, 7, detail)
      r(6, Y + 12, 1, 9, shirtDark)
      r(9, Y + 12, 1, 9, shirtDark)
    } else if (back) {
      r(4, Y + 18, 8, 3, shirt)
      r(7, Y + 18, 2, 3, shirtDark)
    } else r(5, Y + 18, 6, 3, shirt)
    r(bx, Y + 15, bw, 1, shade(shirt, -0.1))
  }
  if (o === 'quimono') {
    if (front) {
      ;[[5, 11], [6, 12], [7, 13], [8, 14]].forEach(([x, y]) => r(x, Y + y, 1, 1, detail))
      ;[[10, 11], [9, 12]].forEach(([x, y]) => r(x, Y + y, 1, 1, detail))
    } else if (sideView) r(9, Y + 11, 2, 1, detail)
    r(bx, Y + 15, bw, 1, shade(detail, -0.25))
  }
  if (o === 'marinheiro') {
    if (front) {
      r(5, Y + 11, 6, 2, detail)
      r(7, Y + 12, 2, 1, shirt)
      r(7, Y + 13, 2, 1, '#e05252')
    } else if (back) {
      r(5, Y + 11, 6, 3, detail)
      r(5, Y + 13, 6, 1, '#f6f1e6')
    } else r(5, Y + 11, 3, 3, detail)
  }
  if (overalls) {
    r(bx, Y + 14, bw, 4, pants)
    if (front) {
      r(5, Y + 11, 1, 3, pants)
      r(10, Y + 11, 1, 3, pants)
      r(5, Y + 14, 1, 1, '#f2c14e')
      r(10, Y + 14, 1, 1, '#f2c14e')
      r(7, Y + 15, 2, 2, shade(pants, -0.2))
    } else r(bx + 1, Y + 11, 1, 3, pants)
  }
  if (dress) {
    r(sideView ? 4 : 3, Y + 16, sideView ? 8 : 10, 3, shirt)
    r(sideView ? 4 : 3, Y + 18, sideView ? 8 : 10, 1, shirtDark)
    r(bx, Y + 15, bw, 1, detail)
  }
  if (slim && !dress && !sit) r(4, Y + 17, 8, 1, o === 'casaco' ? shirt : shirtDark)

  // ===== braços
  const sleeve = o === 'regata' ? skinDark : o === 'colete' ? shade(detail, -0.1) : shade(shirt, -0.14)
  if (sideView) {
    // um braço visível, balançando para frente e para trás
    r(7 + swing, Y + 12, 2, 3, sleeve)
    r(7 + swing, Y + 12, 1, 3, shade(sleeve, 0.12))
    r(7 + swing * 2, Y + 15, 2, 2, skin)
    r(7 + swing * 2, Y + 16, 2, 1, skinDark)
  } else {
    // braços com 2 pixels de largura (mais encorpados), manga com volume e mãos na cor da pele
    const la = Math.max(0, swing)
    const ra = Math.max(0, -swing)
    const lx = ax1 - 1
    const rx = ax2
    r(lx, Y + 12 + la, 2, 3, sleeve)
    r(lx, Y + 12 + la, 1, 3, shade(sleeve, 0.12))
    r(rx, Y + 12 + ra, 2, 3, shade(sleeve, -0.08))
    r(rx + 1, Y + 12 + ra, 1, 3, shade(sleeve, -0.2))
    r(lx, Y + 15 + la, 2, 2, skin)
    r(rx, Y + 15 + ra, 2, 2, skin)
    r(lx, Y + 16 + la, 2, 1, skinDark)
    r(rx, Y + 16 + ra, 2, 1, skinDark)
    if (o === 'regata') {
      r(ax1 - 1, Y + 12, 2, 1, skin)
      r(ax2, Y + 12, 2, 1, skin)
    }
  }

  // ===== extras por cima do corpo (mochila, capa vista de costas, pirulito na mão)
  paintExtraFront(r, c, Y, view, swing, sit, slim)

  // ===== cabeça
  if (sideView) {
    r(7, Y + 10, 2, 1, skinDark)
    r(5, Y + 1, 6, 1, skin)
    r(4, Y + 2, 8, 7, skin)
    r(5, Y + 9, fem ? 5 : 6, 1, skin)
    r(12, Y + 5, 1, 2, skin) // nariz
    r(12, Y + 6, 1, 1, skinDark)
    r(4, Y + 3, 1, 6, skinDark) // nuca
    r(6, Y + 5, 2, 2, skinDark) // orelha
    r(6, Y + 5, 1, 1, skin)
  } else {
    r(7, Y + 10, 2, 1, skinDark)
    r(5, Y + 1, 6, 1, skin)
    r(4, Y + 2, 8, 1, skin)
    r(3, Y + 3, 10, 6, skin)
    if (fem) r(5, Y + 9, 6, 1, skin)
    else r(4, Y + 9, 8, 1, skin)
    // orelhas e volume do rosto (lado direito um pouco mais escuro)
    r(2, Y + 5, 1, 2, skin)
    r(13, Y + 5, 1, 2, skinDark)
    r(12, Y + 4, 1, 5, shade(skin, -0.08))
    r(fem ? 10 : 11, Y + 9, 1, 1, skinDark)
  }

  // ===== rosto
  if (withFace && !back) {
    paintEyes(r, c, Y, sideView, blink, skinDark, fem)
    if (c.blush) {
      if (sideView) r(9, Y + 8, 2, 1, '#f09a9a')
      else {
        r(4, Y + 8, 1, 1, '#f09a9a')
        r(11, Y + 8, 1, 1, '#f09a9a')
      }
    }
    paintMarks(r, c.marks, Y, sideView, skin)
    paintMouth(r, c.mouth, Y, sideView, fem ? '#c8586a' : skinDark)
    paintBeard(r, c.beard, Y, sideView, hair, skin)
  }

  // ===== cabelo
  const h = c.hair
  if (h !== 'careca') {
    if (sideView) paintHairSide(r, h, Y, hair, hairLight, hairDark)
    else if (back) paintHairBack(r, h, Y, hair, hairLight, hairDark)
    else paintHairFront(r, h, Y, hair, hairLight, hairDark)
  }

  // ===== acessórios
  paintNeck(r, c.neck, Y, view, detail)
  if (withFace && !back) paintFace(r, c.face, Y, sideView)
  paintHat(r, c.hat, Y, view)
}

const cache = new Map()
/** Mesmo desenho, guardado para não redesenhar a cada quadro. */
export function avatarSprite(config, opts = {}) {
  const key = JSON.stringify([config, opts.dir, opts.frame, opts.pose, opts.withFace, opts.blink])
  if (!cache.has(key)) {
    if (cache.size > 600) cache.clear()
    cache.set(key, drawAvatar(config, opts))
  }
  return cache.get(key)
}

/** Miniatura (imagem) do personagem, usada nas opções do editor. */
const thumbs = new Map()
export function avatarThumb(config, opts = {}) {
  const key = JSON.stringify([config, opts])
  if (!thumbs.has(key)) {
    if (thumbs.size > 400) thumbs.clear()
    const sprite = avatarSprite(config, opts)
    if (opts.crop) {
      const canvas = document.createElement('canvas')
      canvas.width = 16
      canvas.height = opts.crop
      canvas.getContext('2d').drawImage(sprite, 0, 0)
      thumbs.set(key, canvas.toDataURL())
    } else thumbs.set(key, sprite.toDataURL())
  }
  return thumbs.get(key)
}
