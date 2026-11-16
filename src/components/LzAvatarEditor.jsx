import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useBackClose } from '../lib/backClose'
import { backdropClose } from '../lib/backdrop'
import { LZ_H, LZ_STYLES, LZ_W, lzAvatarSprite, lzFrame, normalizeLzLook, onLzAvatarLoad, randomLzLook } from '../lib/lzAvatar'
import { saveRoomAvatar } from '../services/profiles'
import { ErrorBox } from './Feedback'

// Editor do boneco da Turma (nova): partes do gerador de personagens do pacote LimeZu.
const TABS = [
  { id: 'body', label: 'Pele', icon: '🧍' },
  { id: 'eyes', label: 'Olhos', icon: '👀' },
  { id: 'outfit', label: 'Roupa', icon: '👕' },
  { id: 'hair', label: 'Cabelo', icon: '💇' },
  { id: 'acc', label: 'Acessório', icon: '🎀' },
]
const NONE_OK = { outfit: false, hair: true, acc: true }

// redesenha quando alguma parte termina de carregar
function useLoadTick() {
  const [, setTick] = useState(0)
  useEffect(() => onLzAvatarLoad(() => setTick((t) => t + 1)), [])
}

/** Boneco parado de frente, ampliado (miniatura das opções). */
function Thumb({ look, scale = 3 }) {
  const ref = useRef(null)
  useLoadTick()
  const frame = lzFrame(look, 0, 3)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (frame) ctx.drawImage(frame, 0, 4, LZ_W, LZ_H - 4, 0, 0, LZ_W * scale, (LZ_H - 4) * scale)
  })
  return <canvas ref={ref} width={LZ_W * scale} height={(LZ_H - 4) * scale} className="lzav-thumb" aria-hidden="true" />
}

/** Prévia: as 4 direções andando. */
function Preview({ look }) {
  const ref = useRef(null)
  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const draw = (now) => {
      const canvas = ref.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      ctx.imageSmoothingEnabled = false
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const t = (now - start) / 1000
      ;['down', 'left', 'up', 'right'].forEach((dir, i) => {
        const frame = lzAvatarSprite(look, { dir, moving: true, walk: t, time: t })
        ctx.fillStyle = 'rgba(20,10,4,0.25)'
        ctx.beginPath()
        ctx.ellipse(i * 84 + 40, 150, 22, 6, 0, 0, Math.PI * 2)
        ctx.fill()
        if (frame) ctx.drawImage(frame, i * 84 + 8, 0, LZ_W * 5, LZ_H * 5)
      })
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [look])
  return <canvas ref={ref} width={336} height={162} className="lzav-preview" aria-label="Prévia do boneco" />
}

export default function LzAvatarEditor({ onClose }) {
  const { user, profile, refreshProfile } = useAuth()
  const [look, setLook] = useState(() => normalizeLzLook(profile?.room_avatar_lab, user.id))
  const [tab, setTab] = useState('outfit')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  useBackClose(onClose)

  const set = (kind, value) => setLook((current) => ({ ...current, [kind]: value }))
  const styles = LZ_STYLES[tab] ?? []
  const current = look[tab]

  async function save() {
    setSaving(true)
    setError(null)
    try {
      await saveRoomAvatar(user.id, look, { lab: true })
      await refreshProfile()
      onClose()
    } catch (err) {
      setError(err)
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" {...backdropClose(onClose)}>
      <div className="card modal lzav" role="dialog" aria-modal="true" aria-label="Meu boneco" onClick={(e) => e.stopPropagation()}>
        <div className="lzav-head">
          <h2>Meu boneco</h2>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Fechar
          </button>
        </div>
        <div className="lzav-top">
          <Preview look={look} />
          <button type="button" className="btn btn-ghost" onClick={() => setLook(randomLzLook())}>
            🎲 Aleatório
          </button>
        </div>
        <div className="lzav-tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={`lzav-tab${tab === t.id ? ' is-on' : ''}`} onClick={() => setTab(t.id)}>
              <span aria-hidden="true">{t.icon}</span> {t.label}
            </button>
          ))}
        </div>
        <ul className="lzav-grid">
          {NONE_OK[tab] && (
            <li>
              <button type="button" className={`lzav-option${!current ? ' is-on' : ''}`} onClick={() => set(tab, null)}>
                <span className="lzav-none">Nenhum</span>
              </button>
            </li>
          )}
          {styles.map(({ style, stems }) => {
            const chosen = stems.includes(current) ? current : stems[0]
            return (
              <li key={style}>
                <button type="button" className={`lzav-option${stems.includes(current) ? ' is-on' : ''}`} onClick={() => set(tab, chosen)}>
                  <Thumb look={{ ...look, [tab]: chosen }} />
                </button>
                {stems.length > 1 && (
                  <span className="lzav-colors">
                    {stems.map((stem, i) => (
                      <button
                        key={stem}
                        type="button"
                        className={`lzav-color${stem === current ? ' is-on' : ''}`}
                        title={`Cor ${i + 1}`}
                        aria-label={`Cor ${i + 1}`}
                        onClick={() => set(tab, stem)}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
        {error && <ErrorBox error={error} />}
        <div className="modal-actions">
          <span className="spacer" />
          <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar boneco'}
          </button>
        </div>
      </div>
    </div>
  )
}
