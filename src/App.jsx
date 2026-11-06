import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import SetupNotice from './components/SetupNotice';
import { isSupabaseConfigured } from './lib/supabase';
import EventsPage from './pages/EventsPage'
import FeedPage from './pages/FeedPage';
import GamesPage from './pages/GamesPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import MoviesPage from './pages/MoviesPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import TurmaPage from './pages/TurmaPage';

// Mapa do site: qual URL mostra qual página.
export default function App() {
  if (!isSupabaseConfigured) return <SetupNotice />;

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Tudo dentro do ProtectedRoute exige login; o Layout desenha o menu do topo */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="mural" element={<FeedPage />} />
          <Route path="filmes" element={<MoviesPage />} />
          <Route path="jogos" element={<GamesPage />} />
          <Route path="eventos" element={<EventsPage />} />
          <Route path="turma" element={<TurmaPage />} />
          <Route path="perfil" element={<ProfilePage />} />
          <Route path="configuracoes" element={<SettingsPage />} />
        </Route>
      </Route>

      {/* Qualquer outra URL volta para o início */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
