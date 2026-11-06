import { useEffect, useRef, useState } from 'react'
import { cropStyle, isDefaultCrop } from '../lib/imageCrop'

// <img> que mostra só o quadrado escolhido por quem postou, preenchendo 100% da moldura.
// A moldura em volta precisa ser QUADRADA, com position: relative e overflow: hidden.
export default function AdjImg({ src, alt = '', crop, className = '', ...rest }) {
  const ref = useRef(null)
  const [size, setSize] = useState(null) // tamanho original da imagem, necessário para o recorte

  const read = (img) => img.naturalWidth && setSize({ width: img.naturalWidth, height: img.naturalHeight })

  // Imagem que já estava em cache pode ter carregado antes do React perceber.
  useEffect(() => {
    setSize(null)
    if (ref.current?.complete) read(ref.current)
  }, [src])

  const custom = !isDefaultCrop(crop) && size
  return (
    <img
      ref={ref}
      className={`adj-img ${className}`.trim()}
      src={src}
      alt={alt}
      draggable={false}
      style={custom ? cropStyle(crop, size.width, size.height) : undefined}
      onLoad={(event) => read(event.currentTarget)}
      {...rest}
    />
  )
}
