import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ErrorBox } from '../components/Feedback';
import { useAuth } from '../contexts/AuthContext';

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
    <div className="center-page">
      <div className="login-intro phone-only-block">
        <span className="screen-label">Bem-vindo</span>
        <h1>Memórias da Turma</h1>
        <p>Entre com o e-mail da sua conta.</p>
      </div>
      <form className="card login-card" onSubmit={handleSubmit}>
        <h1 className="desk-only-block">Creche </h1>
        <p className="muted desk-only-block">Só para quem é da turma.</p>

        <label className="field">
          <span><span className="desk-only">Email</span><span className="phone-only">E-mail</span></span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>

        <label className="field">
          <span>Senha</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        {error && <ErrorBox error={error} />}

        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
      <p className="login-foot phone-only-block">Não tem conta? Peça para o admin da turma criar a sua.</p>
    </div>
  );
}
