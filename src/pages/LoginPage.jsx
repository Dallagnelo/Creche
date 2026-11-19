import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ErrorBox } from '../components/Feedback';
import InstallApp from '../components/InstallApp';
import GooseLogo from '../components/GooseLogo';
import { useAuth } from '../contexts/AuthContext';
import '../styles/login.css';

// posição (% da tela) e atraso das estrelinhas do fundo
const STARS = [
  [8, 12, 0], [18, 30, 0.6], [30, 8, 1.2], [44, 22, 0.3], [62, 10, 1.8], [76, 28, 0.9], [88, 14, 1.5],
  [94, 40, 0.2], [5, 55, 1.1], [92, 68, 0.7], [12, 82, 1.9], [85, 88, 0.4], [70, 6, 2.1], [24, 64, 1.4],
];

// Não existe tela de "criar conta" de propósito: o app é só para o grupo.
// Você cria as contas dos amigos no painel do Supabase (veja o README).
export default function LoginPage() {
  const { session, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Já está logado? Vai direto para o mural.
  if (session) return <Navigate to="/" replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const { error: signInError } = await signIn(email.trim(), password);
    if (signInError) {
      setError(new Error('Email ou senha incorretos.'));
      setSubmitting(false);
    }
    // Se deu certo, o AuthContext atualiza a sessão e o <Navigate> acima redireciona.
  }

  return (
    <main className="lg-page">
      {/* estrelinhas piscando no fundo (enfeite) */}
      {STARS.map(([x, y, delay]) => (
        <i key={`${x}-${y}`} className="lg-star" aria-hidden="true" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${delay}s` }} />
      ))}
      <div className="lg-column">
        <div className="lg-goose">
          <GooseLogo size={200} color="#5eead4" />
        </div>
        <div className="lg-title">
          <h1>Creche</h1>
          <p>Só para quem é da turma</p>
        </div>

        <section className="lg-box" aria-labelledby="lg-ficha">
          <div className="lg-box-head">
            <h2 id="lg-ficha">Insira sua ficha</h2>
            <span className="lg-blink" aria-hidden="true">1P</span>
          </div>
          <form className="lg-form" onSubmit={handleSubmit}>
            <label className="lg-field">
              <span>E-mail</span>
              <input
                type="email"
                autoComplete="email"
                placeholder="voce@email.com"
                required
                autoFocus
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label className="lg-field">
              <span>Senha</span>
              <input
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>

            {error && <ErrorBox error={error} />}

            <button type="submit" className="lg-go" disabled={submitting}>
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" shapeRendering="crispEdges">
                <path d="M2 1h3v1h2v1h2v1h2v1h2v4h-2v1h-2v1h-2v1h-2v1h-3z" fill="currentColor" />
              </svg>
              {submitting ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </section>

        <p className="lg-press lg-blink" aria-hidden="true">
          {submitting ? 'Carregando...' : 'Aperte Enter para jogar'}
        </p>
        <p className="lg-foot">Não tem conta? Peça para o admin da turma criar a sua.</p>
        <InstallApp className="install-login" />
      </div>
    </main>
  );
}
