import { useEffect, useRef, useState } from 'react'
import { adjustStyle, fillZoom, normalizeAdjust } from '../lib/imageAdjust'

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

/**
 * Editor de enquadramento: arraste a imagem para mover, use o controle para aproximar,
 * ou os botões "Inteira" / "Preencher".
 *  - src: endereço da imagem
 *  - aspect: proporção da moldura (largura / altura), a mesma do card onde ela aparece
 *  - value / onChange: o ajuste { zoom, x, y }
 *  - initial: "fit" (inteira) ou "fill" (preenchida) quando a imagem é nova
 */
export default function ImageAdjuster({ src, aspect = 4 / 3, value, onChange, initial = 'fit', round = false }) {
  const frameRef = useRef(null)
  const drag = useRef(null)
  const startedFor = useRef(null)
  const [natural, setNatural] = useState(null)

  const adjust = normalizeAdjust(value)
  const fill = natural ? fillZoom(natural.width, natural.height, aspect) : 1
  const maxZoom = Math.max(4, Math.ceil(fill * 2))

  // Imagem nova: começa inteira (ou preenchida, no caso da foto de perfil).
  useEffect(() => {
    setNatural(null)
    startedFor.current = null
  }, [src])

  function handleLoad(event) {
    const { naturalWidth: width, naturalHeight: height } = event.currentTarget
    setNatural({ width, height })
    if (startedFor.current !== src) {
      startedFor.current = src
      if (initial === 'fill') onChange({ zoom: fillZoom(width, height, aspect), x: 50, y: 50 })
    }
  }

  function move(dx, dy) {
    const rect = frameRef.current.getBoundingClientRect()
    const span = adjust.zoom - 1
    if (span <= 0.001) return
    // Arrastar para a direita faz o ponto "parado" andar para a esquerda, e vice-versa.
    onChange({
      ...adjust,
      x: clamp(drag.current.x - (dx * 100) / (span * rect.width), 0, 100),
      y: clamp(drag.current.y - (dy * 100) / (span * rect.height), 0, 100),
    })
  }

  function handlePointerDown(event) {
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { startX: event.clientX, startY: event.clientY, x: adjust.x, y: adjust.y }
  }
  function handlePointerMove(event) {
    if (!drag.current) return
    move(event.clientX - drag.current.startX, event.clientY - drag.current.startY)
  }
  function handlePointerUp() {
    drag.current = null
  }

  function handleKeyDown(event) {
    const step = 4
    const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }
    const delta = moves[event.key]
    if (!delta || adjust.zoom <= 1) return
    event.preventDefault()
    onChange({ ...adjust, x: clamp(adjust.x + delta[0], 0, 100), y: clamp(adjust.y + delta[1], 0, 100) })
  }

  const isFit = adjust.zoom === 1
  const isFill = fill > 1 && Math.abs(adjust.zoom - fill) < 0.02

  return (
    <div className="adjuster">
      <div
        ref={frameRef}
        className={`adjuster-frame ${round ? 'is-round' : ''} ${adjust.zoom > 1 ? 'can-drag' : ''}`}
        style={{ aspectRatio: aspect }}
        tabIndex={0}
        role="group"
        aria-label="Área de ajuste da imagem. Arraste ou use as setas para mover."
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
      >
        <img className="adj-img" src={src} alt="Pré-visualização" draggable={false} style={adjustStyle(adjust)} onLoad={handleLoad} />
      </div>

      <div className="adjuster-controls">
        <label className="adjuster-zoom">
          <span>Zoom</span>
          <input
            type="range"
            min="1"
            max={maxZoom}
            step="0.01"
            value={adjust.zoom}
            onChange={(event) => onChange({ ...adjust, zoom: Number(event.target.value) })}
            aria-label="Zoom da imagem"
          />
        </label>
        <div className="adjuster-buttons">
          <button type="button" className={`btn btn-ghost ${isFit ? 'is-on' : ''}`} onClick={() => onChange({ zoom: 1, x: 50, y: 50 })}>
            Inteira
          </button>
          <button
            type="button"
            className={`btn btn-ghost ${isFill ? 'is-on' : ''}`}
            disabled={!natural}
            onClick={() => onChange({ zoom: fill, x: 50, y: 50 })}
          >
            Preencher
          </button>
        </div>
      </div>
      <p className="muted hint">{adjust.zoom > 1 ? 'Arraste a imagem para escolher o que aparece.' : 'A imagem aparece inteira. Use o zoom para aproximar.'}</p>
    </div>
  )
}
