// Recorte quadrado das imagens (capas de jogos, miniaturas do mural, foto de perfil).
//
// Um "recorte" é { cx, cy, size }, tudo entre 0 e 1:
//   cx, cy = centro do quadrado, como fração da largura e da altura da imagem
//   size   = lado do quadrado, como fração do MENOR lado da imagem (1 = o maior quadrado possível)
// O quadrado escolhido sempre preenche 100% da moldura: não existem bordas vazias.

export const DEFAULT_CROP = { cx: 0.5, cy: 0.5, size: 1 }
export const MIN_SIZE = 0.15

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

/** Mantém o quadrado dentro da imagem (precisa saber o tamanho da imagem). */
export function clampCrop(crop, width, height) {
  const side = Math.min(width, height)
  const size = clamp(Number(crop?.size) || 1, MIN_SIZE, 1)
  const halfW = (size * side) / width / 2
  const halfH = (size * side) / height / 2
  return {
    size,
    cx: clamp(Number(crop?.cx ?? 0.5), halfW, 1 - halfW),
    cy: clamp(Number(crop?.cy ?? 0.5), halfH, 1 - halfH),
  }
}

export function isDefaultCrop(crop) {
  return !crop || (Math.abs(crop.size - 1) < 0.001 && Math.abs(crop.cx - 0.5) < 0.001 && Math.abs(crop.cy - 0.5) < 0.001)
}

/** Lê o recorte de uma linha do banco (prefixo "cover" -> cover_crop_x, cover_crop_y, cover_crop_size). */
export function cropFromRow(row, prefix) {
  const cx = Number(row?.[`${prefix}_crop_x`])
  const cy = Number(row?.[`${prefix}_crop_y`])
  const size = Number(row?.[`${prefix}_crop_size`])
  if (![cx, cy, size].every(Number.isFinite) || size <= 0) return DEFAULT_CROP
  return { cx: clamp(cx, 0, 1), cy: clamp(cy, 0, 1), size: clamp(size, MIN_SIZE, 1) }
}

export function cropToRow(crop, prefix) {
  const round = (n) => Math.round(n * 10000) / 10000
  return {
    [`${prefix}_crop_x`]: round(crop.cx),
    [`${prefix}_crop_y`]: round(crop.cy),
    [`${prefix}_crop_size`]: round(crop.size),
  }
}

/**
 * Estilo CSS para uma <img> dentro de uma moldura QUADRADA com overflow: hidden:
 * posiciona e amplia a imagem para que só o quadrado escolhido apareça, preenchendo tudo.
 */
export function cropStyle(crop, width, height) {
  const c = clampCrop(crop, width, height)
  const side = Math.min(width, height)
  const imageW = (100 * width) / (c.size * side) // largura da imagem, em % da moldura
  const imageH = (100 * height) / (c.size * side)
  return {
    position: 'absolute',
    maxWidth: 'none',
    objectFit: 'fill',
    width: `${imageW}%`,
    height: `${imageH}%`,
    left: `${50 - c.cx * imageW}%`,
    top: `${50 - c.cy * imageH}%`,
  }
}
