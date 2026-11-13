import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  avatarSprite, avatarThumb, BEARDS, BODIES, BOTTOMS, CLOTH_COLORS, EXTRA_COLORS, EXTRAS, EYE_COLORS, EYES, FACES, HAIR_COLORS, HAIR_STYLES,
  HATS, MARKS, MOUTHS, NECKS, normalizeAvatar, OUTFITS, PANTS_COLORS, randomAvatar, SHOE_COLORS, SKINS,
} from '../lib/avatar'
import { useBackClose } from '../lib/backClose'
import { saveRoomAvatar } from '../services/profiles'
import { ErrorBox } from './Feedback'
import '../styles/avatar-editor.css'

const SCALE = 6
const VIEWS = [
  { dir: 'down', label: 'Frente' },
  { dir: 'right', label: 'Lado' },
  { dir: 'up', label: 'Costas' },
]
const TABS = [
  { id: 'corpo', label: 'Corpo', icon: '🧍' },
  { id: 'rosto', label: 'Rosto', icon: '🙂' },
  { id: 'cabelo', label: 'Cabelo', icon: '💇' },
  { id: 'roupa', label: 'Roupa', icon: '👕' },
  { id: 'acessorios', label: 'Acessórios', icon: '🎩' },
  { id: 'extras', label: 'Extras', icon: '✨' },
]

// Prévia: o personagem de frente, de lado e de costas, andando (ou parado), num pedacinho de chão.
function Preview({ look, photoUrl, walking }) {
  const ref = useRef(null)
  const photoRef = useRef(null)
  useEffect(() => {
    photoRef.current = null
    if (!look.photo || !photoUrl) return
    const img = new Image()
    img.onload = () => {
      photoRef.current = img
    }
    img.src = photoUrl
  }, [look.photo, photoUrl])

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
      const frame = walking ? 1 + (Math.floor(t * 5) % 2) : 0
      const blink = !walking && Math.floor(t * 10) % 32 === 0
      const usePhoto = look.photo && photoRef.current
      const shown = usePhoto ? { ...look, hair: 'careca', hat: 'nenhum', face: 'nenhum', beard: 'nenhuma' } : look
      VIEWS.forEach(({ dir }, i) => {
        const x = 6 + i * 19 * SCALE
        const bob = walking && frame === 1 ? -SCALE : 0
        ctx.fillStyle = 'rgba(0,0,0,0.22)'
        ctx.beginPath()
        ctx.ellipse(x + 8 * SCALE, 27 * SCALE, 6 * SCALE, 1.5 * SCALE, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.drawImage(avatarSprite(shown, { dir, frame, withFace: !usePhoto, blink }), x, SCALE + bob, 16 * SCALE, 27 * SCALE)
        if (usePhoto && dir !== 'up') {
          ctx.save()
          ctx.beginPath()
          ctx.arc(x + 8 * SCALE, 9 * SCALE + bob, 6 * SCALE, 0, Math.PI * 2)
          ctx.clip()
          ctx.drawImage(photoRef.current, x + 2 * SCALE, 3 * SCALE + bob, 12 * SCALE, 12 * SCALE)
          ctx.restore()
        }
      })
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [look, walking])

  return <canvas ref={ref} className="ae-preview" width={12 + 3 * 19 * SCALE - 3 * SCALE} height={29 * SCALE} aria-label="Prévia do avatar" />
}

// Cores: bolinhas prontas + um seletor livre (qualquer cor)
function Colors({ label, hint, colors, value, onPick }) {
  return (
    <fieldset className="ae-field">
      <legend>
        {label}
        {hint && <small>{hint}</small>}
      </legend>
      <div className="ae-swatches">
        {colors.map((color) => (
          <button
            key={color}
            type="button"
            className={`ae-swatch${value === color ? ' is-on' : ''}`}
            style={{ background: color }}
            aria-label={color}
            aria-pressed={value === color}
            onClick={() => onPick(color)}
          />
        ))}
        <label className={`ae-swatch ae-custom${colors.includes(value) ? '' : ' is-on'}`} title="Outra cor">
          <input type="color" value={value?.startsWith('#') ? value : '#888888'} onChange={(event) => onPick(event.target.value)} />
          <span aria-hidden="true">+</span>
        </label>
      </div>
    </fieldset>
  )
}

// Opções com miniatura do próprio personagem usando cada opção
function Options({ label, options, field, look, onPick, crop = 14, dir = 'down', big = false }) {
  return (
    <fieldset className="ae-field">
      <legend>{label}</legend>
      <div className={`ae-grid${big ? ' is-big' : crop >= 24 ? ' is-tall' : ''}`}>
        {options.map((option) => {
          const preview = { ...look, [field]: option.id, photo: false }
          return (
            <button
              key={option.id}
              type="button"
              className={`ae-option${look[field] === option.id ? ' is-on' : ''}`}
              aria-pressed={look[field] === option.id}
              title={option.label}
              onClick={() => onPick(option.id)}
            >
              <span className="ae-thumb">
                <img src={avatarThumb(preview, { dir, crop })} alt="" />
              </span>
              <span className="ae-name">{option.label}</span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

/** Monta o personagem da sala: rosto, cabelo, roupa e acessórios. */
export default function AvatarEditor({ onClose }) {
  const { user, profile, refreshProfile } = useAuth()
  const saved = normalizeAvatar(profile?.room_avatar, user?.id)
  const [look, setLook] = useState(saved)
  const [tab, setTab] = useState('corpo')
  const [walking, setWalking] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  useBackClose(onClose)
  const set = (key) => (value) => setLook((current) => ({ ...current, [key]: value }))
  const changed = JSON.stringify(look) !== JSON.stringify(saved)

  async function save() {
    setSaving(true)
    setError(null)
    try {
      await saveRoomAvatar(user.id, look)
      await refreshProfile()
      onClose()
    } catch (err) {
      setError(err)
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="card modal ae" role="dialog" aria-modal="true" aria-labelledby="avatar-title" onClick={(event) => event.stopPropagation()}>
        <header className="ae-head">
          <div>
            <h2 id="avatar-title">Meu avatar</h2>
            <p>É assim que você aparece para a turma na sala.</p>
          </div>
          <button type="button" className="ae-close" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </header>

        <div className="ae-body">
          <section className="ae-side">
            <div className="ae-stage">
              <Preview look={look} photoUrl={profile?.avatar_url} walking={walking} />
              <div className="ae-views" aria-hidden="true">
                {VIEWS.map((view) => (
                  <span key={view.dir}>{view.label}</span>
                ))}
              </div>
            </div>
            <div className="ae-tools">
              <button type="button" className="ae-tool" onClick={() => setWalking((value) => !value)}>
                <b aria-hidden="true">{walking ? '⏸' : '▶'}</b>
                {walking ? 'Parar' : 'Andar'}
              </button>
              <button type="button" className="ae-tool" onClick={() => setLook({ ...randomAvatar(), photo: look.photo })}>
                <b aria-hidden="true">🎲</b>
                Sortear
              </button>
              <button type="button" className="ae-tool" disabled={!changed} onClick={() => setLook(saved)}>
                <b aria-hidden="true">↶</b>
                Desfazer
              </button>
            </div>
            {profile?.avatar_url && (
              <Switch label="Usar minha foto como rosto" hint="Troca a cabeça pela sua foto de perfil" checked={!!look.photo} onChange={set('photo')} />
            )}
            <p className="ae-tip">
              <b>Dica:</b> as miniaturas mostram você mesmo com cada opção. Quando salvar, todo mundo na sala já vê o visual novo.
            </p>
          </section>

          <section className="ae-panel">
            <div className="ae-tabs" role="tablist">
              {TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === item.id}
                  className={`ae-tab${tab === item.id ? ' is-on' : ''}`}
                  onClick={() => setTab(item.id)}
                >
                  <b aria-hidden="true">{item.icon}</b>
                  {item.label}
                </button>
              ))}
            </div>

            <div className="ae-scroll" key={tab}>
              {tab === 'corpo' && (
                <>
                  <Options label="Tipo de corpo" options={BODIES} field="body" look={look} onPick={set('body')} crop={27} big />
                  <Colors label="Pele" colors={SKINS} value={look.skin} onPick={set('skin')} />
                  <Switch label="Bochechas rosadas" checked={!!look.blush} onChange={set('blush')} />
                </>
              )}
              {tab === 'rosto' && (
                <>
                  <Options label="Olhos" options={EYES} field="eyes" look={look} onPick={set('eyes')} crop={13} />
                  <Colors label="Cor dos olhos" colors={EYE_COLORS} value={look.eyeColor} onPick={set('eyeColor')} />
                  <Options label="Boca" options={MOUTHS} field="mouth" look={look} onPick={set('mouth')} crop={13} />
                  <Options label="Barba" options={BEARDS} field="beard" look={look} onPick={set('beard')} crop={14} />
                  <Options label="Detalhes no rosto" options={MARKS} field="marks" look={look} onPick={set('marks')} crop={13} />
                </>
              )}
              {tab === 'cabelo' && (
                <>
                  <Options label="Estilo" options={HAIR_STYLES} field="hair" look={look} onPick={set('hair')} crop={18} />
                  <Colors label="Cor do cabelo e da barba" colors={HAIR_COLORS} value={look.hairColor} onPick={set('hairColor')} />
                </>
              )}
              {tab === 'roupa' && (
                <>
                  <Options label="Modelo" options={OUTFITS} field="outfit" look={look} onPick={set('outfit')} crop={27} />
                  <Colors label="Cor principal" colors={CLOTH_COLORS} value={look.shirt} onPick={set('shirt')} />
                  <Colors label="Cor do detalhe" hint="listras, gola, gravata, cachecol…" colors={CLOTH_COLORS} value={look.detail} onPick={set('detail')} />
                  <Options label="Parte de baixo" options={BOTTOMS} field="bottom" look={look} onPick={set('bottom')} crop={27} />
                  <Colors label="Cor da calça / saia" colors={PANTS_COLORS} value={look.pants} onPick={set('pants')} />
                  <Colors label="Sapato" colors={SHOE_COLORS} value={look.shoes} onPick={set('shoes')} />
                </>
              )}
              {tab === 'acessorios' && (
                <>
                  <Options label="Na cabeça" options={HATS} field="hat" look={look} onPick={set('hat')} crop={14} />
                  <Options label="No rosto" options={FACES} field="face" look={look} onPick={set('face')} crop={13} />
                  <Options label="No pescoço" options={NECKS} field="neck" look={look} onPick={set('neck')} crop={21} />
                </>
              )}
              {tab === 'extras' && (
                <>
                  <Options label="Nas costas e nas mãos" options={EXTRAS} field="extra" look={look} onPick={set('extra')} crop={27} dir="right" />
                  <Colors label="Cor do extra" hint="mochila, capa e rabinho" colors={EXTRA_COLORS} value={look.extraColor} onPick={set('extraColor')} />
                </>
              )}
            </div>
          </section>
        </div>

        {error && <ErrorBox error={error} />}
        <footer className="ae-foot">
          <span className={`ae-status${changed ? ' is-dirty' : ''}`}>{changed ? '● Alterações não salvas' : '✓ Tudo salvo'}</span>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primary" disabled={saving || !changed} onClick={save}>
            {saving ? 'Salvando...' : 'Salvar avatar'}
          </button>
        </footer>
      </div>
    </div>
  )
}

// Liga/desliga no estilo do site (sem o checkbox gigante padrão)
function Switch({ label, hint, checked, onChange }) {
  return (
    <label className="ae-switch">
      <span>
        {label}
        {hint && <small>{hint}</small>}
      </span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <i aria-hidden="true" />
    </label>
  )
}
