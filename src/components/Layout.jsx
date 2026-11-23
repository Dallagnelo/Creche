import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSettings } from '../contexts/SettingsContext'
import { RPG_SO_ADMIN, TURMA_SO_ADMIN } from '../lib/features'
import { LiveProvider, useLive } from '../contexts/LiveContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { usePhone } from '../hooks/useMediaQuery'
import { getCounters } from '../services/summary'
import { listEvents } from '../services/events'
import { listPolls } from '../services/polls'
import { isPollOpen } from '../lib/polls'
import { nextEvents } from './HomeNextEvent'
import Avatar from './Avatar'
import OnlineModal from './OnlineModal'
import NotificationBell from './NotificationBell'
import NewEventPopup from './NewEventPopup'
import PushPrompt from './PushPrompt'
import { useOnlineUsers } from '../hooks/useOnlineUsers'
import Icon from './Icon'
import { KEYS } from '../lib/dataCache'
import { prefetchAll } from '../lib/prefetch'
import { backdropClose } from '../lib/backdrop'

// `group` organiza o menu do computador em blocos; `short` é o nome usado na barra estreita do celular
const links = [
  { to: '/', label: 'Início', icon: 'home', end: true, group: 'Turma' },
  { to: '/mural', label: 'Mural', icon: 'photos', group: 'Turma' },
  { to: '/turma', label: 'Turma', icon: 'users', adminOnly: TURMA_SO_ADMIN, group: 'Turma' },
  // no celular só aparece quando alguém está ao vivo (transmitir exige computador)
  { to: '/ao-vivo', label: 'Ao vivo', icon: 'live', live: true, group: 'Turma' },
  { to: '/filmes', label: 'Filmes', icon: 'movies', group: 'Coleção' },
  { to: '/jogos', label: 'Jogos', icon: 'games', group: 'Coleção' },
  { to: '/eventos', label: 'Eventos', icon: 'calendar', group: 'Agenda' },
  { to: '/votacoes', label: 'Votações', icon: 'vote', group: 'Agenda' },
  { to: '/rpg', label: 'RPG', icon: 'dice', adminOnly: RPG_SO_ADMIN, group: 'Diversão' },
  { to: '/pokemon', label: 'Pokémon', icon: 'pokeball', group: 'Diversão' },
  { to: '/ferramentas', label: 'Ferramentas', icon: 'tools', group: 'Diversão' },
  { to: '/perfil', label: 'Perfil', icon: 'user', group: 'Conta' },
  { to: '/configuracoes', label: 'Configurações', short: 'Ajustes', icon: 'settings', group: 'Conta' },
]
const GROUPS = ['Turma', 'Coleção', 'Agenda', 'Diversão', 'Conta']

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
  const { user, profile, signOut, isAdmin } = useAuth()
  const { hosts } = useLive()
  const anyLive = hosts.length > 0
  const { pathname } = useLocation()
  const phone = usePhone()
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
  const online = useOnlineUsers({ userId: user?.id, name: name || 'Alguém', avatarUrl: profile?.avatar_url ?? null })
  const [showOnline, setShowOnline] = useState(false)
  // menu lateral compacto (só ícones) no computador: escolhido em Configurações > Aparência
  const { settings } = useSettings()
  const menuMini = !!settings.compactMenu
  // as páginas (ex.: a Turma) podem saber quem está online, sem abrir outra conexão
  const onlineKey = online.map((u) => u.userId).join(',')
  const outletContext = useMemo(() => ({ onlineIds: onlineKey ? onlineKey.split(',') : [] }), [onlineKey])

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

  const maxFaces = phone ? 2 : 4 // o quadrado tem tamanho fixo: o que não cabe vira "+N"
  const onlineCounter = (
    <div
      className="counter counter-online"
      role="button"
      tabIndex={0}
      aria-label={`${online.length} online agora. Ver quem está online`}
      onClick={() => setShowOnline(true)}
      onKeyDown={(event) => (event.key === 'Enter' || event.key === ' ') && (event.preventDefault(), setShowOnline(true))}
    >
      {online.length > 1 && <span className="online-pulse" role="img" aria-label="Mais de uma pessoa online" />}
      <dt className="counter-label">
        <span className={`online-dot${online.length ? ' is-on' : ''}`} aria-hidden="true" />
        {online.length}
        <span className="online-word"> online</span>
      </dt>
      <dd className="counter-value counter-online-value">
        {online.length === 0 ? (
          <span>–</span>
        ) : (
          <span className="online-faces" aria-hidden="true">
            {(online.length > maxFaces ? online.slice(0, maxFaces - 1) : online).map((person) => (
              <span key={person.userId} className="online-face">
                <Avatar name={person.name} src={person.avatarUrl} size="fill" />
              </span>
            ))}
            {online.length > maxFaces && <span className="online-face online-more">+{online.length - (maxFaces - 1)}</span>}
          </span>
        )}
      </dd>
    </div>
  )

  return (
    <div className={`app-shell${menuMini ? ' menu-mini' : ''}`}>
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

        <dl className="counters counters-desktop">
          {stats.map((stat) => (
            <div key={stat.label} className="counter">
              <dt className="counter-label">{stat.label}</dt>
              <dd className="counter-value">{stat.value}</dd>
            </div>
          ))}
          {onlineCounter}
        </dl>
        <NotificationBell />
      </header>

      <div className="shell">
        <aside className={`sidebar${menuMini ? ' is-mini' : ''}`}>
          <div>
            <p className="nav-label">Menu</p>
            <nav className="nav" aria-label="Navegação principal">
              {/* NavLink adiciona a classe "active" na página atual; no computador o menu vem em blocos */}
              {GROUPS.map((group) => {
                const items = links.filter((link) => link.group === group && !link.hidden && (!link.adminOnly || isAdmin))
                if (!items.length) return null
                return (
                  <div key={group} className={`nav-group${group === 'Conta' ? ' is-account' : ''}`} role="group" aria-label={group}>
                    {group !== 'Conta' && <span className="nav-group-label" aria-hidden="true">{group}</span>}
                    {items.map((link) => (
                      <NavLink
                        key={link.to}
                        to={link.to}
                        end={link.end}
                        className={`nav-item ${link.live ? (anyLive ? 'is-live' : 'nav-live-idle') : ''}`}
                        title={menuMini ? link.label : undefined}
                        aria-label={menuMini ? link.label : undefined}
                      >
                        <Icon name={link.icon} />
                        <span className="label-full">{link.label}</span>
                        <span className="label-short">{link.short ?? link.label}</span>
                        {link.live && anyLive && <span className="live-dot" role="img" aria-label="Alguém está ao vivo" />}
                      </NavLink>
                    ))}
                  </div>
                )
              })}
            </nav>
          </div>

          <div className="sidebar-foot">
            <button type="button" className="nav-item nav-logout" onClick={signOut} title={menuMini ? 'Sair' : undefined} aria-label={menuMini ? 'Sair' : undefined}>
              <Icon name="logout" />
              <span>Sair</span>
            </button>
          </div>
        </aside>

        <MobileNav hosts={hosts} signOut={signOut} />
        <NewEventPopup />
        <PushPrompt />
        {showOnline && <OnlineModal online={online} meId={user?.id} onClose={() => setShowOnline(false)} />}

        <main className="container">
          <Outlet context={outletContext} />
        </main>
      </div>
    </div>
  )
}

// Barra de baixo do celular: 4 atalhos + "Mais" (que abre uma folha com o resto).
const MAIN_PATHS = ['/', '/mural', '/filmes', '/jogos']
const moreLinks = [
  { to: '/eventos', label: 'Eventos', icon: 'calendar' },
  { to: '/votacoes', label: 'Votações', icon: 'vote' },
  { to: '/turma', label: 'Turma', icon: 'users', adminOnly: TURMA_SO_ADMIN },
  { to: '/rpg', label: 'RPG', icon: 'dice', adminOnly: RPG_SO_ADMIN, sub: RPG_SO_ADMIN ? 'Só adm · em teste' : 'Campanhas da turma' },
  { to: '/pokemon', label: 'Pokémon', icon: 'pokeball', sub: 'Pokédex e minijogo' },
  { to: '/ferramentas', label: 'Ferramentas', icon: 'tools', sub: 'Dividir contas' },
  { to: '/perfil', label: 'Perfil', icon: 'user' },
  { to: '/configuracoes', label: 'Ajustes', icon: 'settings', sub: 'Tema e fonte' },
]

function MobileNav({ hosts, signOut }) {
  const { isAdmin } = useAuth()
  const { viewersOf } = useLive()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const anyLive = hosts.length > 0
  const viewers = hosts.reduce((total, meta) => total + viewersOf(meta.userId).length, 0)
  const moreActive = !MAIN_PATHS.includes(pathname)
  const events = useAsyncData(listEvents, KEYS.events)
  const nextOne = nextEvents(events.data ?? [])[0]
  const polls = useAsyncData(listPolls, KEYS.polls)
  const openPolls = (polls.data ?? []).filter((poll) => isPollOpen(poll)).length
  // nome da página atual (aparece por um instante em cima da barra)
  const current = links.find((link) => (link.to === '/' ? pathname === '/' : pathname.startsWith(link.to)))
  const currentLabel = current?.short ?? current?.label ?? null
  const nextEventLabel = nextOne ? `Próximo: ${nextOne.event_date.slice(8, 10)}/${nextOne.event_date.slice(5, 7)}` : null

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
      {/* "hotbar": barra de itens de jogo. O espaço escolhido sobe e o nome aparece em cima por um instante */}
      {!open && currentLabel && (
        <div key={pathname} className="hotbar-tip" aria-hidden="true">
          {currentLabel}
        </div>
      )}
      <nav className={`mobile-nav hotbar${open ? ' has-sheet' : ''}`} aria-label="Navegação principal">
        {links
          .filter((link) => MAIN_PATHS.includes(link.to))
          .map((link, index) => (
            <NavLink key={link.to} to={link.to} end={link.end} className="mobile-nav-item">
              <span className="hotbar-num" aria-hidden="true">{index + 1}</span>
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
          <span className="hotbar-num" aria-hidden="true">5</span>
          <Icon name="bag" />
          <span>Mais</span>
          {anyLive && <span className="live-dot" role="img" aria-label="Alguém está ao vivo" />}
        </button>
      </nav>

      {open && (
        <div className="more-backdrop" {...backdropClose(() => setOpen(false))}>
          <div className="more-sheet inventory" role="dialog" aria-modal="true" aria-labelledby="inventory-title" onClick={(event) => event.stopPropagation()}>
            <div className="inventory-head">
              <h2 id="inventory-title">Inventário</h2>
              <button type="button" className="inventory-close" aria-label="Fechar" onClick={() => setOpen(false)}>
                ×
              </button>
            </div>
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
              {moreLinks.filter((link) => !link.hidden && (!link.adminOnly || isAdmin)).map((link) => {
                const sub = link.to === '/eventos' ? nextEventLabel : link.to === '/votacoes' ? 'Filmes da turma' : link.sub
                return (
                  <NavLink key={link.to} to={link.to} className="more-tile">
                    <Icon name={link.icon} />
                    <span>{link.label}</span>
                    {sub && <small className="more-tile-sub">{sub}</small>}
                    {link.to === '/votacoes' && openPolls > 0 && <span className="more-tile-badge">{openPolls} {openPolls === 1 ? 'ABERTA' : 'ABERTAS'}</span>}
                  </NavLink>
                )
              })}
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
