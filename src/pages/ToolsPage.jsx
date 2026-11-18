import { Link } from 'react-router-dom'
import { TOOLS } from '../lib/tools'

// /ferramentas: todas as ferramentas em cartões.
export default function ToolsPage() {
  return (
    <>
      <p className="muted tools-intro">Escolha uma:</p>
      <div className="tools-grid">
        {TOOLS.map((tool) => (
          <Link key={tool.slug} to={`/ferramentas/${tool.slug}`} className="card tool-card" style={{ '--tool': tool.color }}>
            <span className="tool-emoji" aria-hidden="true">
              {tool.emoji}
            </span>
            <span className="tool-text">
              <b>
                {tool.title}
                {tool.tag && <span className="xp-ai">{tool.tag}</span>}
              </b>
              <small className="muted">{tool.text}</small>
            </span>
            <span className="tool-open">Abrir →</span>
          </Link>
        ))}
      </div>
    </>
  )
}
