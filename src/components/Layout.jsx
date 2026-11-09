import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { LiveProvider, useLive } from '../contexts/LiveContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { getCounters } from '../services/summary'
import Avatar from './Avatar'
import Icon from './Icon'
import { KEYS } from '../lib/dataCache'
import { prefetchAll } from '../lib/prefetch'

const links = [
  { to: '/', label: 'Início', icon: 'home', end: true },
  { to: '/mural', label: 'Mural', icon: 'photos' },
  { to: '/filmes', label: 'Filmes', icon: 'movies' },
  { to: '/jogos', label: 'Jogos', icon: 'games' },
  { to: '/eventos', label: 'Eventos', icon: 'calendar' },
  // no celular só aparece quando alguém está ao vivo (transmitir exige computador)
  { to: '/ao-vivo', label: 'Ao vivo', icon: 'live', live: true },
  { to: '/turma', label: 'Turma', icon: 'users' },
  { to: '/perfil', label: 'Perfil', icon: 'user' },
  // `short` é o nome usado na barra estreita do celular
  { to: '/configuracoes', label: 'Configurações', short: 'Ajustes', icon: 'settings' },
]

// Moldura compartilhada por todas as páginas logadas:
// "placar" no topo (jogador + contadores), menu à esquerda e o conteúdo.
// No celular, o menu vira uma barra de abas fixa embaixo.
export default function Layout() {
  return (
    <LiveProvider>
      <LayoutContent />
    </LiveProvider>
  )
}

function LayoutContent() {
  const { user, profile, signOut } = useAuth()
  const { hosts } = useLive()
  const anyLive = hosts.length > 0
  const { pathname } = useLocation()
  const counters = useAsyncData(getCounters, KEYS.counters)

  // Busca os dados das telas principais em segundo plano, já no login, e de
  // novo a cada 40 min / ao voltar para a aba (os links das fotos vencem em 1 h).
  useEffect(() => {
    prefetchAll()
    const timer = setInterval(prefetchAll, 40 * 60 * 1000)
    function onVisible() {
      if (document.visibilityState === 'visible') prefetchAll()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])
  const name = profile?.display_name ?? user?.email ?? ''

  // Ao trocar de página, atualiza os números (você pode ter postado algo).
  const { reload } = counters
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false // a primeira busca já foi feita pelo hook
      return
    }
    reload()
  }, [pathname, reload])

  const data = counters.data
  const stats = [
    { label: 'Fotos', value: data?.photos ?? '–' },
    { label: 'Filmes', value: data?.movies ?? '–' },
    { label: 'Jogos', value: data?.games ?? '–' },
  ]

  return (
    <div className="app-shell">
      <header className={`scoreboard${pathname === '/' ? ' is-home' : ''}`}>
        <Link to="/perfil" className="player" aria-label="Meu perfil">
          <span className="player-photo">
            <Avatar name={name} src={profile?.avatar_url} size="fill" />
          </span>
          <span className="player-text">
            <span className="player-label">Jogador</span>
            <span className="player-name">{name}</span>
          </span>
        </Link>

        {anyLive && (
          <Link to="/ao-vivo" className="topbar-live">
            <span className="live-dot live-dot-static" aria-hidden="true" /> AO VIVO · {hosts.length}
          </Link>
        )}

        <dl className="counters">
          {stats.map((stat) => (
            <div key={stat.label} className="counter">
              <dt className="counter-label">{stat.label}</dt>
              <dd className="counter-value">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </header>

      <div className="shell">
        <aside className="sidebar">
          <div>
            <p className="nav-label">Menu</p>
            <nav className="nav" aria-label="Navegação principal">
              {/* NavLink adiciona a classe "active" na página atual */}
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={`nav-item ${link.live ? (anyLive ? 'is-live' : 'nav-live-idle') : ''}`}
                >
                  <Icon name={link.icon} />
                  <span className="label-full">{link.label}</span>
                  <span className="label-short">{link.short ?? link.label}</span>
                  {link.live && anyLive && <span className="live-dot" role="img" aria-label="Alguém está ao vivo" />}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="sidebar-foot">
            <button type="button" className="nav-item nav-logout" onClick={signOut}>
              <Icon name="logout" />
              <span>Sair</span>
            </button>
          </div>
        </aside>

        <MobileNav hosts={hosts} signOut={signOut} />

        <main className="container">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

// Barra de baixo do celular: 4 atalhos + "Mais" (que abre uma folha com o resto).
const MAIN_PATHS = ['/', '/mural', '/filmes', '/jogos']
const moreLinks = [
  { to: '/eventos', label: 'Eventos', icon: 'calendar' },
  { to: '/turma', label: 'Turma', icon: 'users' },
  { to: '/perfil', label: 'Perfil', icon: 'user' },
  { to: '/configuracoes', label: 'Ajustes', icon: 'settings' },
]

function MobileNav({ hosts, signOut }) {
  const { viewersOf } = useLive()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const anyLive = hosts.length > 0
  const viewers = hosts.reduce((total, meta) => total + viewersOf(meta.userId).length, 0)
  const moreActive = !MAIN_PATHS.includes(pathname)

  // Fecha a folha ao trocar de página ou apertar Esc.
  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => event.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <nav className={`mobile-nav${open ? ' has-sheet' : ''}`} aria-label="Navegação principal">
        {links
          .filter((link) => MAIN_PATHS.includes(link.to))
          .map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className="mobile-nav-item">
              <Icon name={link.icon} />
              <span>{link.label}</span>
            </NavLink>
          ))}
        <button
          type="button"
          className={`mobile-nav-item is-more${moreActive || open ? ' active' : ''}`}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <Icon name="more" />
          <span>Mais</span>
          {anyLive && <span className="live-dot" role="img" aria-label="Alguém está ao vivo" />}
        </button>
      </nav>

      {open && (
        <div className="more-backdrop" onClick={() => setOpen(false)}>
          <div className="more-sheet" role="dialog" aria-modal="true" aria-label="Mais opções" onClick={(event) => event.stopPropagation()}>
            <div className="more-grip" aria-hidden="true" />
            {anyLive && (
              <Link to="/ao-vivo" className="more-live">
                <Icon name="live" />
                <span className="more-live-text">
                  <strong>Ao vivo agora</strong>
                  <span>
                    {hosts.length} transmitindo · {viewers} assistindo
                  </span>
                </span>
                <span className="more-live-cta">Assistir</span>
              </Link>
            )}
            <div className="more-grid">
              {moreLinks.map((link) => (
                <NavLink key={link.to} to={link.to} className="more-tile">
                  <Icon name={link.icon} />
                  <span>{link.label}</span>
                </NavLink>
              ))}
            </div>
            <button type="button" className="more-logout" onClick={signOut}>
              <Icon name="logout" />
              Sair da conta
            </button>
          </div>
        </div>
      )}
    </>
  )
}
