// Personagem da sala: desenhado em pixel art por código, a partir das escolhas da pessoa
// (pele, rosto, cabelo, roupa, acessórios). O contorno escuro é calculado sozinho em volta do desenho.
// Três vistas: de frente ('down'), de costas ('up') e de lado ('right'; 'left' é o espelho).

export const AVATAR_W = 16
export const AVATAR_H = 27

export const SKINS = ['#ffe0c7', '#f5c9a0', '#e3a97c', '#d0946a', '#c58456', '#9a6038', '#7a4a2a', '#5a341c']
export const HAIR_COLORS = ['#1f1a1a', '#4a2c1a', '#8a5a34', '#d9a85a', '#f2d79a', '#c8462e', '#e8eef2', '#7a56c4', '#4d7fc6', '#e86aa0', '#38a85a', '#5eead4']
export const CLOTH_COLORS = ['#3a6db4', '#e05252', '#38d27a', '#f2c14e', '#a066d0', '#5eead4', '#e8915a', '#2b2f3c', '#e8eef2', '#e86aa0', '#8a5a34', '#24804a']
export const PANTS_COLORS = ['#2b3a5a', '#3a2a22', '#4a5060', '#1f1a1a', '#6a7a3a', '#c8b48a', '#7a2f3a', '#4d7fc6', '#e8eef2']
export const SHOE_COLORS = ['#1f1a1a', '#e8eef2', '#e05252', '#8a5a34', '#3a6db4', '#f2c14e', '#38d27a']
export const EYE_COLORS = ['#1a1424', '#5a3a22', '#8a5a34', '#3a6db4', '#38a85a', '#7a56c4', '#c83a4a', '#8a9aaa']
export const EXTRA_COLORS = ['#c83a4a', '#3a6db4', '#38d27a', '#f2c14e', '#a066d0', '#2b2f3c', '#e8eef2', '#e86aa0', '#8a5a34', '#5eead4']

export const BODIES = [
  { id: 'masc', label: 'Masculino' },
  { id: 'fem', label: 'Feminino' },
]

export const HAIR_STYLES = [
  { id: 'curto', label: 'Curto' },
  { id: 'franja', label: 'Franja' },
  { id: 'topete', label: 'Topete' },
  { id: 'espetado', label: 'Espetado' },
  { id: 'moicano', label: 'Moicano' },
  { id: 'chanel', label: 'Chanel' },
  { id: 'longo', label: 'Longo' },
  { id: 'rabo', label: 'Rabo de cavalo' },
  { id: 'chiquinhas', label: 'Maria-chiquinha' },
  { id: 'trancas', label: 'Tranças' },
  { id: 'coque', label: 'Coque' },
  { id: 'cacheado', label: 'Cacheado' },
  { id: 'afro', label: 'Black power' },
  { id: 'lateral', label: 'Repartido' },
  { id: 'ondulado', label: 'Ondulado' },
  { id: 'dreads', label: 'Dreads' },
  { id: 'pixie', label: 'Joãozinho' },
  { id: 'mullet', label: 'Mullet' },
  { id: 'raspado', label: 'Raspado' },
  { id: 'careca', label: 'Careca' },
]
export const EYES = [
  { id: 'normal', label: 'Normal' },
  { id: 'grandes', label: 'Grandes' },
  { id: 'cilios', label: 'Cílios' },
  { id: 'feliz', label: 'Feliz' },
  { id: 'sono', label: 'Com sono' },
  { id: 'brabo', label: 'Bravo' },
  { id: 'brilho', label: 'Brilhando' },
  { id: 'piscadinha', label: 'Piscadinha' },
  { id: 'surpreso', label: 'Surpreso' },
  { id: 'coracao', label: 'Apaixonado' },
]
export const MOUTHS = [
  { id: 'sorriso', label: 'Sorriso' },
  { id: 'neutro', label: 'Sério' },
  { id: 'aberta', label: 'Boca aberta' },
  { id: 'lingua', label: 'Língua' },
  { id: 'triste', label: 'Triste' },
  { id: 'sorrisao', label: 'Sorrisão' },
  { id: 'dentes', label: 'Dentes' },
  { id: 'batom', label: 'Batom' },
  { id: 'assobio', label: 'Assobio' },
]
export const BEARDS = [
  { id: 'nenhuma', label: 'Nenhuma' },
  { id: 'bigode', label: 'Bigode' },
  { id: 'cavanhaque', label: 'Cavanhaque' },
  { id: 'barba', label: 'Barba' },
  { id: 'bigodao', label: 'Bigodão' },
  { id: 'costeleta', label: 'Costeletas' },
  { id: 'rala', label: 'Por fazer' },
]
export const MARKS = [
  { id: 'nenhum', label: 'Nada' },
  { id: 'sardas', label: 'Sardas' },
  { id: 'pinta', label: 'Pinta' },
  { id: 'cicatriz', label: 'Cicatriz' },
  { id: 'curativo', label: 'Curativo' },
  { id: 'pintura', label: 'Pintura' },
  { id: 'estrela', label: 'Estrelinha' },
]
export const OUTFITS = [
  { id: 'camiseta', label: 'Camiseta' },
  { id: 'listrada', label: 'Listrada' },
  { id: 'xadrez', label: 'Xadrez' },
  { id: 'moletom', label: 'Moletom' },
  { id: 'jaqueta', label: 'Jaqueta' },
  { id: 'terno', label: 'Terno' },
  { id: 'time', label: 'Camisa de time' },
  { id: 'macacao', label: 'Macacão' },
  { id: 'vestido', label: 'Vestido' },
  { id: 'regata', label: 'Regata' },
  { id: 'polo', label: 'Polo' },
  { id: 'havaiana', label: 'Havaiana' },
  { id: 'colete', label: 'Colete' },
  { id: 'casaco', label: 'Sobretudo' },
  { id: 'quimono', label: 'Quimono' },
  { id: 'marinheiro', label: 'Marinheiro' },
]
export const BOTTOMS = [
  { id: 'calca', label: 'Calça' },
  { id: 'bermuda', label: 'Bermuda' },
  { id: 'shorts', label: 'Shorts' },
  { id: 'saia', label: 'Saia' },
  { id: 'longa', label: 'Saia longa' },
]
export const HATS = [
  { id: 'nenhum', label: 'Nada' },
  { id: 'bone', label: 'Boné' },
  { id: 'gorro', label: 'Gorro' },
  { id: 'chapeu', label: 'Chapéu de palha' },
  { id: 'coroa', label: 'Coroa' },
  { id: 'tiara', label: 'Tiara' },
  { id: 'laco', label: 'Laço' },
  { id: 'fone', label: 'Fone' },
  { id: 'gato', label: 'Orelhas de gato' },
  { id: 'chifres', label: 'Chifrinhos' },
  { id: 'cartola', label: 'Cartola' },
  { id: 'bruxa', label: 'Chapéu de bruxa' },
  { id: 'cowboy', label: 'Cowboy' },
  { id: 'boina', label: 'Boina' },
  { id: 'bandana', label: 'Bandana' },
  { id: 'flor', label: 'Flor' },
  { id: 'aureola', label: 'Auréola' },
  { id: 'antenas', label: 'Antenas' },
]
export const FACES = [
  { id: 'nenhum', label: 'Nada' },
  { id: 'oculos', label: 'Óculos' },
  { id: 'redondos', label: 'Óculos redondos' },
  { id: 'escuros', label: 'Óculos escuros' },
  { id: 'tapaolho', label: 'Tapa-olho' },
  { id: 'coracao', label: 'Óculos de coração' },
  { id: 'visor', label: 'Visor gamer' },
  { id: 'monoculo', label: 'Monóculo' },
  { id: 'heroi', label: 'Máscara de herói' },
  { id: 'palhaco', label: 'Nariz de palhaço' },
]
export const NECKS = [
  { id: 'nenhum', label: 'Nada' },
  { id: 'cachecol', label: 'Cachecol' },
  { id: 'colar', label: 'Colar' },
  { id: 'gravata', label: 'Gravata' },
  { id: 'borboleta', label: 'Gravata-borboleta' },
  { id: 'lenco', label: 'Lenço' },
  { id: 'perolas', label: 'Pérolas' },
  { id: 'medalha', label: 'Medalha' },
]
export const EXTRAS = [
  { id: 'nenhum', label: 'Nada' },
  { id: 'mochila', label: 'Mochila' },
  { id: 'capa', label: 'Capa' },
  { id: 'asas', label: 'Asas' },
  { id: 'cauda', label: 'Rabinho' },
  { id: 'pirulito', label: 'Pirulito' },
]
// mantém o nome antigo para quem importava ACCESSORIES
export const ACCESSORIES = HATS

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
const DARK = '#1a1424'

const shade = (hex, amount) => {
  if (!hex?.startsWith('#')) return hex
  const n = parseInt(hex.slice(1), 16)
  const ch = (shift) => Math.max(0, Math.min(255, Math.round(((n >> shift) & 255) * (1 + amount))))
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`
}

export function outline(canvas) {
  const ctx = canvas.getContext('2d')
  const { width: w, height: h } = canvas
  const img = ctx.getImageData(0, 0, w, h)
  const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && img.data[(y * w + x) * 4 + 3] > 0
  const edge = []
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (solid(x, y)) continue
      if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) edge.push([x, y])
    }
  }
  ctx.fillStyle = DARK
  edge.forEach(([x, y]) => ctx.fillRect(x, y, 1, 1))
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
  outline(canvas)
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
    if (!dress && !skirt) r(4, Y + 18, 8, 1, pants)
    const leg = (x, lift) => {
      r(x, Y + 19, 3, 3 - lift, skin)
      r(x, Y + 19, 3, Math.min(pantsRows, 3 - lift), pants)
    }
    leg(5, liftL)
    leg(8, liftR)
    r(4, Y + 22 - liftL, 4, 1, c.shoes)
    r(8, Y + 22 - liftR, 4, 1, c.shoes)
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
    r(7 + swing * 2, Y + 15, 2, 2, skinDark)
  } else {
    r(ax1, Y + 12 + Math.max(0, swing), 1, 3, sleeve)
    r(ax2, Y + 12 + Math.max(0, -swing), 1, 3, sleeve)
    r(ax1, Y + 15 + Math.max(0, swing), 1, 2, skinDark)
    r(ax2, Y + 15 + Math.max(0, -swing), 1, 2, skinDark)
    if (o === 'regata') {
      r(ax1 + 1, Y + 12, 1, 1, skin)
      r(ax2 - 1, Y + 12, 1, 1, skin)
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
  } else {
    r(7, Y + 10, 2, 1, skinDark)
    r(5, Y + 1, 6, 1, skin)
    r(4, Y + 2, 8, 1, skin)
    r(3, Y + 3, 10, 6, skin)
    if (fem) r(5, Y + 9, 6, 1, skin)
    else r(4, Y + 9, 8, 1, skin)
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

function paintEyes(r, c, Y, sideView, blink, skinDark, fem) {
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

function paintMouth(r, mouth, Y, sideView, lip) {
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

function paintBeard(r, beard, Y, sideView, hair, skin) {
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

function paintMarks(r, marks, Y, sideView, skin) {
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

function topCap(r, Y, hair, light) {
  r(5, Y, 6, 1, hair)
  r(4, Y + 1, 8, 1, hair)
  r(3, Y + 2, 10, 2, hair)
  r(5, Y + 1, 3, 1, light)
}

function paintHairFront(r, h, Y, hair, light, dark) {
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

function paintHairBack(r, h, Y, hair, light, dark) {
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

function paintHairSide(r, h, Y, hair, light, dark) {
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

function paintHat(r, hat, Y, view) {
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

function paintFace(r, face, Y, side) {
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

function paintNeck(r, neck, Y, view, detail) {
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
function paintExtraBehind(r, c, Y, view, sit) {
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

function paintExtraFront(r, c, Y, view, swing, sit, slim) {
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
        candy(x - 1, Y + 9 + h)
      } else {
        const h = Math.max(0, -swing)
        const x = slim ? 12 : 13
        r(x, Y + 12 + h, 1, 3, '#f6f1e6')
        candy(x - 1, Y + 9 + h)
      }
      break
    }
    default:
  }
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
