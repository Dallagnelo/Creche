import { useEffect, useRef } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { getCounters } from '../services/summary'
import Avatar from './Avatar'
import Icon from './Icon'

const links = [
  { to: '/', label: 'Início', icon: 'home', end: true },
  { to: '/mural', label: 'Mural', icon: 'photos' },
  { to: '/filmes', label: 'Filmes', icon: 'movies' },
  { to: '/jogos', label: 'Jogos', icon: 'games' },
  { to: '/eventos', label: 'Eventos', icon: 'calendar' },
  { to: '/turma', label: 'Turma', icon: 'users' },
  { to: '/perfil', label: 'Perfil', icon: 'user' },
  // `short` é o nome usado na barra estreita do celular
  { to: '/configuracoes', label: 'Configurações', short: 'Ajustes', icon: 'settings' },
]

// Moldura compartilhada por todas as páginas logadas:
// "placar" no topo (jogador + contadores), menu à esquerda e o conteúdo.
// No celular, o menu vira uma barra de abas fixa embaixo.
export default function Layout() {
  const { user, profile, signOut } = useAuth()
  const { pathname } = useLocation()
  const counters = useAsyncData(getCounters)
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
      <header className="scoreboard">
        <Link to="/perfil" className="player" aria-label="Meu perfil">
          <span className="player-photo">
            <Avatar name={name} src={profile?.avatar_url} size="fill" />
          </span>
          <span className="player-text">
            <span className="player-label">Jogador</span>
            <span className="player-name">{name}</span>
          </span>
        </Link>

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
                <NavLink key={link.to} to={link.to} end={link.end} className="nav-item">
                  <Icon name={link.icon} />
                  <span className="label-full">{link.label}</span>
                  <span className="label-short">{link.short ?? link.label}</span>
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

        <main className="container">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
