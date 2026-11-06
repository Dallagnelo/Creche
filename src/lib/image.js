/**
 * Recorta a imagem em quadrado (centralizado) e reduz para `size` x `size`,
 * devolvendo um Blob JPEG leve. Assim a foto de perfil carrega rápido
 * e nunca fica esticada.
 */
export async function cropToSquare(file, size = 512) {
  let bitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error('Não consegui abrir essa imagem. Tente um arquivo JPG, PNG ou WEBP.')
  }

  const side = Math.min(bitmap.width, bitmap.height)
  const sx = (bitmap.width - side) / 2
  const sy = (bitmap.height - side) / 2

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff' // fundo para imagens com transparência
  ctx.fillRect(0, 0, size, size)
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
