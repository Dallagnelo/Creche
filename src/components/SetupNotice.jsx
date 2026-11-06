// Mostrado quando o arquivo .env ainda não foi preenchido.
export default function SetupNotice() {
  return (
    <div className="center-page">
      <div className="card setup-card">
        <h1>Quase lá! 🛠️</h1>
        <p>O app ainda não sabe onde está o seu banco de dados.</p>
        <ol>
          <li>
            Copie o arquivo <code>.env.example</code> para <code>.env</code>
          </li>
          <li>
            Preencha <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code>
          </li>
          <li>Pare o servidor (Ctrl+C) e rode <code>npm run dev</code> de novo</li>
        </ol>
        <p className="muted">O passo a passo completo está no README.md.</p>
      </div>
    </div>
  )
}
