// Ajuste de enquadramento das imagens (capas de jogos, miniaturas do mural, foto de perfil).
//
// Um "ajuste" é { zoom, x, y }:
//   zoom = 1  -> a imagem aparece INTEIRA dentro da moldura (sem cortar nada)
//   zoom > 1  -> aproxima; o que passa da moldura fica de fora
//   x, y      -> de 0 a 100: que ponto da imagem fica "parado" ao aproximar
//                (50, 50 = centro; 0, 0 = canto de cima à esquerda)
// Quando `zoom` é 1, x e y não mudam nada.

export const DEFAULT_ADJUST = { zoom: 1, x: 50, y: 50 }

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

/** Lê o ajuste de uma linha do banco (ex.: prefixo "cover" -> cover_zoom, cover_x, cover_y). */
export function adjustFromRow(row, prefix) {
  const zoom = Number(row?.[`${prefix}_zoom`])
  const x = Number(row?.[`${prefix}_x`])
  const y = Number(row?.[`${prefix}_y`])
  return {
    zoom: Number.isFinite(zoom) && zoom >= 1 ? zoom : 1,
    x: Number.isFinite(x) ? clamp(x, 0, 100) : 50,
    y: Number.isFinite(y) ? clamp(y, 0, 100) : 50,
  }
}

/** Colunas do banco para gravar um ajuste (arredondado para não guardar números enormes). */
export function adjustToRow(adjust, prefix) {
  const a = normalizeAdjust(adjust)
  return {
    [`${prefix}_zoom`]: Math.round(a.zoom * 100) / 100,
    [`${prefix}_x`]: Math.round(a.x * 10) / 10,
    [`${prefix}_y`]: Math.round(a.y * 10) / 10,
  }
}

export function normalizeAdjust(adjust) {
  return {
    zoom: clamp(Number(adjust?.zoom) || 1, 1, 8),
    x: clamp(Number(adjust?.x ?? 50), 0, 100),
    y: clamp(Number(adjust?.y ?? 50), 0, 100),
  }
}

export function isDefaultAdjust(adjust) {
  const a = normalizeAdjust(adjust)
  return a.zoom === 1 && a.x === 50 && a.y === 50
}

/** Estilo CSS que aplica o ajuste em uma <img> (a moldura em volta precisa ter overflow: hidden). */
export function adjustStyle(adjust) {
  const a = normalizeAdjust(adjust)
  if (a.zoom === 1) return undefined
  return { transform: `scale(${a.zoom})`, transformOrigin: `${a.x}% ${a.y}%` }
}

/** Zoom necessário para a imagem PREENCHER a moldura (sem faixas vazias). */
export function fillZoom(imageWidth, imageHeight, frameAspect) {
  const imageAspect = imageWidth / imageHeight
  return Math.max(frameAspect / imageAspect, imageAspect / frameAspect, 1)
}
