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
    <div className="center-page login-page">
      <form className="card login-card" onSubmit={handleSubmit}>
        <h1>Creche </h1>
        <p className="muted">Só para quem é da turma. (teste de alteração do Claude)</p>

        <label className="field">
          <span>Email</span>
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
    </div>
  );
}
