import { NavLink, Outlet } from 'react-router-dom'
import { TOOLS } from '../lib/tools'

// Moldura da página Ferramentas: título + barra com as ferramentas, e a ferramenta aberta embaixo.
export default function ToolsLayout() {
  return (
    <section className="stack tools-page">
      <div className="page-head">
        <div>
          <h1>Ferramentas</h1>
        </div>
      </div>
      <nav className="tools-nav" aria-label="Ferramentas">
        <NavLink to="/ferramentas" end className={({ isActive }) => `tools-nav-item${isActive ? ' is-on' : ''}`}>
          <span aria-hidden="true">🧰</span> Todas
        </NavLink>
        {TOOLS.map((tool) => (
          <NavLink key={tool.slug} to={`/ferramentas/${tool.slug}`} className={({ isActive }) => `tools-nav-item${isActive ? ' is-on' : ''}`}>
            <span aria-hidden="true">{tool.emoji}</span> {tool.title}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </section>
  )
}

/** Cabeçalho de cada ferramenta (ícone, nome, explicação e o botão principal). */
export function ToolHeader({ slug, children }) {
  const tool = TOOLS.find((item) => item.slug === slug)
  return (
    <header className="card tool-header" style={{ '--tool': tool.color }}>
      <span className="tool-emoji" aria-hidden="true">
        {tool.emoji}
      </span>
      <div className="tool-text">
        <h2>
          {tool.title}
          {tool.tag && <span className="xp-ai">{tool.tag}</span>}
        </h2>
        <p className="muted">{tool.text}</p>
      </div>
      {children && <div className="tool-header-actions">{children}</div>}
    </header>
  )
}
