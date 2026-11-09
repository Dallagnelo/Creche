import { useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../components/Icon'
import SuggestionsPanel from '../components/SuggestionsPanel'
import { ErrorBox } from '../components/Feedback'
import { useAuth } from '../contexts/AuthContext'
import { useSettings } from '../contexts/SettingsContext'
import { changePassword } from '../services/account'

const MIN_PASSWORD = 6

// Interruptor liga/desliga.
function Toggle({ label, hint, checked, onChange, deskOnly }) {
  return (
    <label className={`toggle${deskOnly ? ' desk-only-block' : ''}`}>
      <span className="toggle-text">
        <strong>{label}</strong>
        <small className="muted toggle-hint">{hint}</small>
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
    <section className="stack">
      <div className="page-head">
        <div>
          <h1>
            <span className="desk-only">Configurações</span>
            <span className="phone-only">Ajustes</span>
          </h1>
        </div>
      </div>

      <div className="settings-cols">
      <div className="stack settings-main">
      <Link to="/patch-notes" className="patch-link desk-only-block">
        <span className="patch-link-icon" aria-hidden="true">
          <Icon name="sparkle" />
        </span>
        <span className="patch-link-text">
          <strong>Patch notes</strong>
          <span className="muted">Veja o que mudou</span>
        </span>
        <span className="patch-link-cta" aria-hidden="true">
          Abrir &gt;
        </span>
      </Link>

      <section className="card panel settings-group" aria-labelledby="settings-look">
        <div className="panel-head">
          <h2 id="settings-look">Aparência</h2>
        </div>

        <Toggle
          label="Tema escuro"
          hint="Ligado: fundo azul-noite. Desligado: fundo claro."
          checked={settings.theme === 'dark'}
          onChange={(value) => updateSetting('theme', value ? 'dark' : 'light')}
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
        <Toggle
          label="Mostrar rankings"
          hint={'Ligado: mostra "Quem mais postou" no Mural e "Por plataforma" em Jogos. Desligado: some, e a lista ocupa a página toda.'}
          checked={settings.showStats}
          onChange={(value) => updateSetting('showStats', value)}
        />
        <Toggle
          deskOnly
          label="Eventos em calendário"
          hint="Ligado: mostra o mês com os dias marcados. Desligado: mostra o próximo evento em destaque e os demais em cards."
          checked={settings.eventsView === 'calendar'}
          onChange={(value) => updateSetting('eventsView', value ? 'calendar' : 'cards')}
        />
        <Toggle
          deskOnly
          label="Adicionar filmes e jogos em janela"
          hint="Ligado: o botão do topo abre uma janela. Desligado: o formulário fica ao lado da lista."
          checked={settings.modalForms}
          onChange={(value) => updateSetting('modalForms', value)}
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
      </div>

      <SuggestionsPanel />
      </div>
    </section>
  )
}
