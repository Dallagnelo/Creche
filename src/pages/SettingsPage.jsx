import { useState } from 'react'
import { ErrorBox } from '../components/Feedback'
import { useAuth } from '../contexts/AuthContext'
import { useSettings } from '../contexts/SettingsContext'
import { changePassword } from '../services/account'

const THEMES = [
  { value: 'dark', label: 'Escuro', hint: 'Fundo azul-noite' },
  { value: 'light', label: 'Claro', hint: 'Fundo claro' },
  { value: 'auto', label: 'Automático', hint: 'Igual ao aparelho' },
]

const TEXT_SIZES = [
  { value: 'normal', label: 'Normal' },
  { value: 'large', label: 'Grande' },
]

const MIN_PASSWORD = 6

// Grupo de opções "escolha uma" (tema, tamanho do texto).
function Choice({ legend, name, options, value, onChange }) {
  return (
    <fieldset className="choice">
      <legend>{legend}</legend>
      <div className="choice-options">
        {options.map((option) => (
          <label key={option.value} className={value === option.value ? 'choice-option is-on' : 'choice-option'}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span className="choice-label">{option.label}</span>
            {option.hint && <small className="muted">{option.hint}</small>}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

// Interruptor liga/desliga.
function Toggle({ label, hint, checked, onChange }) {
  return (
    <label className="toggle">
      <span className="toggle-text">
        <strong>{label}</strong>
        <small className="muted">{hint}</small>
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="toggle-track" aria-hidden="true" />
    </label>
  )
}

function PasswordForm() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState(null)

  const mismatch = confirm !== '' && password !== confirm
  const canSave = password.length >= MIN_PASSWORD && password === confirm && !saving

  async function handleSubmit(event) {
    event.preventDefault()
    if (!canSave) return

    setSaving(true)
    setError(null)
    setDone(false)
    try {
      await changePassword(password)
      setPassword('')
      setConfirm('')
      setDone(true)
    } catch (err) {
      setError(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="form-row">
        <label className="field">
          <span>Nova senha</span>
          <input
            type="password"
            autoComplete="new-password"
            minLength={MIN_PASSWORD}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <label className="field">
          <span>Repita a nova senha</span>
          <input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
          />
        </label>
      </div>

      <p className={mismatch ? 'hint error-text' : 'muted hint'}>
        {mismatch ? 'As senhas não são iguais.' : `Use pelo menos ${MIN_PASSWORD} caracteres.`}
      </p>

      {error && <ErrorBox error={error} />}
      {done && <p className="success">Senha alterada!</p>}

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={!canSave}>
          {saving ? 'Salvando...' : 'Trocar senha'}
        </button>
      </div>
    </form>
  )
}

// Aparência e conta. A aparência é salva no aparelho, na hora em que você escolhe.
export default function SettingsPage() {
  const { user, signOut } = useAuth()
  const { settings, updateSetting, resetSettings } = useSettings()

  return (
    <section className="stack narrow">
      <div className="page-head">
        <div>
          <h1>Configurações</h1>
          <p className="muted">As opções de aparência ficam salvas neste aparelho.</p>
        </div>
      </div>

      <section className="card panel settings-group" aria-labelledby="settings-look">
        <div className="panel-head">
          <h2 id="settings-look">Aparência</h2>
        </div>

        <Choice
          legend="Tema"
          name="theme"
          options={THEMES}
          value={settings.theme}
          onChange={(value) => updateSetting('theme', value)}
        />
        <Choice
          legend="Tamanho do texto"
          name="textSize"
          options={TEXT_SIZES}
          value={settings.textSize}
          onChange={(value) => updateSetting('textSize', value)}
        />
        <Toggle
          label="Fonte pixel nos títulos"
          hint="Desligue para usar uma fonte simples, mais fácil de ler."
          checked={settings.pixelFont}
          onChange={(value) => updateSetting('pixelFont', value)}
        />
        <Toggle
          label="Reduzir animações"
          hint="Tira os movimentos e transições da tela."
          checked={settings.reduceMotion}
          onChange={(value) => updateSetting('reduceMotion', value)}
        />

        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={resetSettings}>
            Restaurar padrões
          </button>
        </div>
      </section>

      <section className="card panel settings-group" aria-labelledby="settings-account">
        <div className="panel-head">
          <h2 id="settings-account">Conta</h2>
        </div>

        <p className="settings-email">
          <span className="muted">E-mail de acesso</span>
          <strong>{user?.email}</strong>
        </p>

        <PasswordForm />

        <div className="form-actions">
          <button type="button" className="btn btn-danger-ghost" onClick={signOut}>
            Sair da conta
          </button>
        </div>
      </section>
    </section>
  )
}
