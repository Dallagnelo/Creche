import { useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../components/Icon'
import SuggestionsPanel from '../components/SuggestionsPanel'
import { ErrorBox } from '../components/Feedback'
import { useAuth } from '../contexts/AuthContext'
import { useSettings } from '../contexts/SettingsContext'
import { changePassword } from '../services/account'
import InstallApp from '../components/InstallApp'
import NotificationSettings from '../components/NotificationSettings'
import AdminBroadcast from '../components/AdminBroadcast'

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
const SETTINGS_TABS = [
  { id: 'aparencia', label: 'Aparência' },
  { id: 'notificacoes', label: 'Notificações' },
  { id: 'conta', label: 'Conta' },
  { id: 'sugestoes', label: 'Sugestões' },
]

export default function SettingsPage() {
  const { user, signOut } = useAuth()
  const { settings, updateSetting, resetSettings } = useSettings()
  const [tab, setTabState] = useState(() => {
    try {
      const saved = sessionStorage.getItem('settings-tab')
      return SETTINGS_TABS.some((t) => t.id === saved) ? saved : 'aparencia'
    } catch {
      return 'aparencia'
    }
  })
  const setTab = (id) => {
    setTabState(id)
    try {
      sessionStorage.setItem('settings-tab', id)
    } catch {
      // sem armazenamento
    }
  }

  return (
    <section className="stack">
      <div className="page-head">
        <div>
          <h1>
            <span className="desk-only">Configurações</span>
            <span className="phone-only">Ajustes</span>
          </h1>
          <p className="page-sub">Aparência, avisos e a sua conta.</p>
        </div>
      </div>

      <div className="movies-views settings-tabs" role="tablist" aria-label="Seções das configurações">
        {SETTINGS_TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'is-on' : ''} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="settings-cols">
      <div className="stack settings-main">
      {tab === 'aparencia' && (
      <section className="card panel settings-group" aria-labelledby="settings-look">
        <div className="panel-head">
          <h2 id="settings-look">Aparência</h2>
          <button type="button" className="panel-link settings-reset" onClick={resetSettings}>
            Restaurar padrões
          </button>
        </div>

        <Toggle
          label="Tema escuro"
          hint="Fundo azul-noite. Desligado: fundo claro."
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
          hint={'"Quem mais postou" no Mural e "Por plataforma" em Jogos.'}
          checked={settings.showStats}
          onChange={(value) => updateSetting('showStats', value)}
        />
        <Toggle
          deskOnly
          label="Menu lateral compacto"
          hint="Deixa o menu só com os ícones e dá mais espaço para o conteúdo."
          checked={settings.compactMenu}
          onChange={(value) => updateSetting('compactMenu', value)}
        />
        <Toggle
          deskOnly
          label="Eventos em calendário"
          hint="Mostra o mês com os dias marcados."
          checked={settings.eventsView === 'calendar'}
          onChange={(value) => updateSetting('eventsView', value ? 'calendar' : 'cards')}
        />
        <Toggle
          deskOnly
          label="Adicionar filmes e jogos em janela"
          hint="O botão do topo abre uma janela, em vez do formulário ao lado."
          checked={settings.modalForms}
          onChange={(value) => updateSetting('modalForms', value)}
        />

        <InstallApp />

      </section>
      )}

      {tab === 'notificacoes' && (
        <>
          <NotificationSettings />
          <AdminBroadcast />
        </>
      )}

      {tab === 'conta' && (
        <>
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

      <section className="card panel settings-group" aria-labelledby="settings-credits">
        <div className="panel-head">
          <h2 id="settings-credits">Créditos</h2>
        </div>
        <p className="muted settings-credits">
          Ícones do RPG:{' '}
          <a href="https://game-icons.net" target="_blank" rel="noopener noreferrer">
            game-icons.net
          </a>{' '}
          (Icons made by Lorc, Delapouite e outros autores,{' '}
          <a href="/rpg/icons/CREDITOS.txt" target="_blank" rel="noopener noreferrer">
            lista completa
          </a>
          ), licença CC BY 3.0.
        </p>
      </section>
        </>
      )}

      {tab === 'sugestoes' && <SuggestionsPanel />}
      </div>

      <div className="stack settings-side">
        <Link to="/patch-notes" className="card settings-news">
          <span className="settings-news-icon" aria-hidden="true">
            <Icon name="sparkle" />
          </span>
          <span className="settings-news-text">
            <strong>Novidades</strong>
            <span className="muted">Veja o que mudou no site</span>
          </span>
          <span className="settings-news-cta" aria-hidden="true">&gt;</span>
        </Link>
        {tab !== 'sugestoes' && (
          <section className="card panel" aria-labelledby="settings-sugg">
            <div className="panel-head">
              <h2 id="settings-sugg">Sugestões</h2>
            </div>
            <p className="muted">Ideia ou problema? Manda aqui.</p>
            <button type="button" className="btn btn-ghost settings-sugg-btn" onClick={() => setTab('sugestoes')}>
              <Icon name="plus" />
              Nova sugestão
            </button>
          </section>
        )}
      </div>
      </div>
    </section>
  )
}
