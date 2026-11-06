import { useEffect, useRef, useState } from 'react'
import { clampCrop, DEFAULT_CROP, isDefaultCrop, MIN_SIZE } from '../lib/imageCrop'

const CORNERS = [
  { id: 'nw', sx: -1, sy: -1 },
  { id: 'ne', sx: 1, sy: -1 },
  { id: 'sw', sx: -1, sy: 1 },
  { id: 'se', sx: 1, sy: 1 },
]

/**
 * Recorte quadrado, como na foto de perfil do WhatsApp: a imagem aparece inteira, com um quadrado por cima.
 * Arraste o quadrado para mover e os cantos (ou o controle de tamanho) para aumentar/diminuir.
 * O que está dentro do quadrado é exatamente o que aparece, sempre preenchendo a moldura.
 *  - value / onChange: o recorte { cx, cy, size } (veja lib/imageCrop.js)
 */
export default function ImageCropper({ src, value, onChange, round = false }) {
  const stageRef = useRef(null)
  const drag = useRef(null)
  const [natural, setNatural] = useState(null)

  useEffect(() => setNatural(null), [src])

  const crop = natural ? clampCrop(value, natural.width, natural.height) : value
  const side = natural ? Math.min(natural.width, natural.height) : 1
  // Tamanho do quadrado como fração da largura / altura da imagem mostrada.
  const boxW = natural ? (crop.size * side) / natural.width : 1
  const boxH = natural ? (crop.size * side) / natural.height : 1

  const emit = (next) => onChange(clampCrop(next, natural.width, natural.height))

  function stagePoint(event) {
    const rect = stageRef.current.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top, w: rect.width, h: rect.height }
  }

  function startMove(event) {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { type: 'move', start: stagePoint(event), crop }
  }

  function startResize(event, corner) {
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    const p = stagePoint(event)
    // O canto oposto fica parado enquanto o quadrado cresce ou diminui.
    const left = (crop.cx - boxW / 2) * p.w
    const right = (crop.cx + boxW / 2) * p.w
    const top = (crop.cy - boxH / 2) * p.h
    const bottom = (crop.cy + boxH / 2) * p.h
    drag.current = {
      type: 'resize',
      corner,
      anchorX: corner.sx > 0 ? left : right,
      anchorY: corner.sy > 0 ? top : bottom,
    }
  }

  function handleMove(event) {
    const d = drag.current
    if (!d || !natural) return
    const p = stagePoint(event)

    if (d.type === 'move') {
      emit({ ...d.crop, cx: d.crop.cx + (p.x - d.start.x) / p.w, cy: d.crop.cy + (p.y - d.start.y) / p.h })
      return
    }

    // Redimensionar: o lado é a maior distância do ponteiro ao canto parado (quadrado, em pixels).
    const { corner, anchorX, anchorY } = d
    const pxPerImagePx = p.w / natural.width
    const maxSide = Math.min(corner.sx > 0 ? p.w - anchorX : anchorX, corner.sy > 0 ? p.h - anchorY : anchorY)
    const minSide = MIN_SIZE * side * pxPerImagePx
    const wanted = Math.max((p.x - anchorX) * corner.sx, (p.y - anchorY) * corner.sy)
    const sidePx = Math.max(minSide, Math.min(maxSide, wanted))
    const x0 = corner.sx > 0 ? anchorX : anchorX - sidePx
    const y0 = corner.sy > 0 ? anchorY : anchorY - sidePx
    emit({
      cx: (x0 + sidePx / 2) / p.w,
      cy: (y0 + sidePx / 2) / p.h,
      size: sidePx / (side * pxPerImagePx),
    })
  }

  const stop = () => {
    drag.current = null
  }

  function handleKeyDown(event) {
    const step = 0.02
    const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }
    const delta = moves[event.key]
    if (!delta || !natural) return
    event.preventDefault()
    emit({ ...crop, cx: crop.cx + delta[0], cy: crop.cy + delta[1] })
  }

  return (
    <div className="cropper">
      <div
        ref={stageRef}
        className="cropper-stage"
        // A largura é limitada para a altura nunca passar de 60% da tela (imagens altas); a proporção fica exata.
        style={
          natural
            ? {
                aspectRatio: `${natural.width} / ${natural.height}`,
                width: `min(100%, 360px, ${(natural.width / natural.height) * 60}vh)`,
              }
            : { aspectRatio: '4 / 3' }
        }
      >
        <img
          className="cropper-image"
          src={src}
          alt="Imagem escolhida"
          draggable={false}
          onLoad={(event) => setNatural({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
        />

        {natural && (
          <div
            className={`cropper-box ${round ? 'is-round' : ''}`}
            style={{
              left: `${(crop.cx - boxW / 2) * 100}%`,
              top: `${(crop.cy - boxH / 2) * 100}%`,
              width: `${boxW * 100}%`,
              height: `${boxH * 100}%`,
            }}
            tabIndex={0}
            role="group"
            aria-label="Quadrado de recorte. Arraste ou use as setas para mover."
            onPointerDown={startMove}
            onPointerMove={handleMove}
            onPointerUp={stop}
            onPointerCancel={stop}
            onKeyDown={handleKeyDown}
          >
            <span className="cropper-grid" aria-hidden="true" />
            {CORNERS.map((corner) => (
              <span
                key={corner.id}
                className={`cropper-handle cropper-handle-${corner.id}`}
                onPointerDown={(event) => startResize(event, corner)}
                onPointerMove={handleMove}
                onPointerUp={stop}
                onPointerCancel={stop}
              />
            ))}
          </div>
        )}
      </div>

      <div className="adjuster-buttons">
        <button
          type="button"
          className="btn btn-ghost"
          disabled={!natural || isDefaultCrop(crop)}
          onClick={() => onChange(DEFAULT_CROP)}
          title="Volta ao maior quadrado possível, centralizado"
        >
          Restaurar original
        </button>
      </div>

      <label className="adjuster-zoom">
        <span>Tamanho</span>
        <input
          type="range"
          min={MIN_SIZE}
          max="1"
          step="0.01"
          value={crop.size}
          disabled={!natural}
          onChange={(event) => emit({ ...crop, size: Number(event.target.value) })}
          aria-label="Tamanho do quadrado de recorte"
        />
      </label>
      <p className="muted hint">Arraste o quadrado e os cantos para escolher a parte que aparece. Em fotos que não são quadradas, o maior quadrado possível é o tamanho máximo.</p>
    </div>
  )
}
