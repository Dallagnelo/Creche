import { clampCrop, DEFAULT_CROP } from './imageCrop'

/**
 * Recorta a imagem em quadrado (centralizado) e reduz para `size` x `size`,
 * devolvendo um Blob JPEG leve. Assim a foto de perfil carrega rápido
 * e nunca fica esticada.
 */
export async function cropToSquare(file, size = 512, crop = null) {
  let bitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error('Não consegui abrir essa imagem. Tente um arquivo JPG, PNG ou WEBP.')
  }


  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff' // fundo para imagens com transparência
  ctx.fillRect(0, 0, size, size)
  // Quadrado escolhido (centro e tamanho como fração da imagem); sem escolha, o maior quadrado central.
  const c = clampCrop(crop ?? DEFAULT_CROP, bitmap.width, bitmap.height)
  const side = c.size * Math.min(bitmap.width, bitmap.height)
  const sx = c.cx * bitmap.width - side / 2
  const sy = c.cy * bitmap.height - side / 2
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size)
  bitmap.close()

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Não foi possível processar a imagem.'))),
      'image/jpeg',
      0.88,
    )
  })
}

/**
 * Reduz uma imagem (não animada) para caber em `maxSide` pixels no maior lado e devolve um Blob WEBP leve.
 * Usada nas imagens do chat ao vivo.
 */
export async function shrinkImage(file, maxSide = 900) {
  let bitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error('Não consegui abrir essa imagem.')
  }
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Não foi possível processar a imagem.'))),
      'image/webp',
      0.85,
    )
  })
}
