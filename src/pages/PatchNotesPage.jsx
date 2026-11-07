import { LATEST_VERSION, PATCH_NOTES } from '../lib/patchNotes'

const TYPE_LABEL = { novo: 'Novo', melhoria: 'Melhoria', correcao: 'Correção' }

// Lista de novidades do sistema (os textos ficam em src/lib/patchNotes.js).
export default function PatchNotesPage() {
  return (
    <section className="stack patch-notes">
      <header className="page-head">
        <div>
          <h1>Patch notes</h1>
          <p className="muted">Tudo que mudou e melhorou no sistema da turma.</p>
        </div>
      </header>

      {PATCH_NOTES.map((release) => (
        <article key={release.version} className="card panel patch-release" aria-labelledby={`patch-${release.version}`}>
          <header className="patch-head">
            <h2 id={`patch-${release.version}`}>
              Versão {release.version}
              {release.version === LATEST_VERSION && <span className="patch-latest">mais recente</span>}
            </h2>
            {release.date && <time className="muted">{release.date}</time>}
          </header>
          <p className="patch-title">{release.title}</p>
          <ul className="patch-list">
            {release.changes.map((change) => (
              <li key={change.text}>
                <span className={`patch-tag patch-tag-${change.type}`}>{TYPE_LABEL[change.type]}</span>
                <span>{change.text}</span>
              </li>
            ))}
          </ul>
        </article>
      ))}
    </section>
  )
}
