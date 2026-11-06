// Três pequenos componentes para os estados que toda tela tem:
// carregando, erro e "ainda não tem nada aqui".

export function Spinner({ label = 'Carregando...' }) {
  return (
    <div className="spinner-wrap" role="status">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}

export function ErrorBox({ error, onRetry }) {
  return (
    <div className="error-box" role="alert">
      <p>{error?.message || 'Algo deu errado.'}</p>
      {onRetry && (
        <button type="button" className="btn btn-ghost" onClick={onRetry}>
          Tentar de novo
        </button>
      )}
    </div>
  )
}

export function EmptyState({ icon, title, children }) {
  return (
    <div className="empty-state">
      <span className="empty-icon" aria-hidden="true">
        {icon}
      </span>
      <h3>{title}</h3>
      <p className="muted">{children}</p>
    </div>
  )
}
