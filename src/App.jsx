import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import SetupNotice from './components/SetupNotice';
import { isSupabaseConfigured } from './lib/supabase';
import EventsPage from './pages/EventsPage'
import FeedPage from './pages/FeedPage';
import GamesPage from './pages/GamesPage';
import HomePage from './pages/HomePage';
import LivePage from './pages/LivePage';
import LoginPage from './pages/LoginPage';
import MoviesPage from './pages/MoviesPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import PollsPage from './pages/PollsPage';
import PatchNotesPage from './pages/PatchNotesPage';
import TurmaPage from './pages/TurmaPage';
import PokemonPage from './pages/PokemonPage';
import Turma2Page from './pages/Turma2Page';
import ToolsLayout from './pages/ToolsLayout';
import ToolsPage from './pages/ToolsPage';
import SplitsPage from './pages/SplitsPage';
import AdminOnly from './components/AdminOnly';
import { TURMA2_SO_ADMIN, TURMA_SO_ADMIN } from './lib/features';

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
          <Route path="votacoes" element={<PollsPage />} />
          <Route path="ao-vivo" element={<LivePage />} />
          <Route path="turma" element={TURMA_SO_ADMIN ? <AdminOnly><TurmaPage /></AdminOnly> : <TurmaPage />} />
          <Route path="pokemon" element={<PokemonPage />} />
          <Route path="turma-2" element={TURMA2_SO_ADMIN ? <AdminOnly><Turma2Page /></AdminOnly> : <Turma2Page />} />
          <Route path="ferramentas" element={<ToolsLayout />}>
            <Route index element={<ToolsPage />} />
            <Route path="contas" element={<SplitsPage />} />
          </Route>
          <Route path="perfil" element={<ProfilePage />} />
          <Route path="patch-notes" element={<PatchNotesPage />} />
          <Route path="configuracoes" element={<SettingsPage />} />
        </Route>
      </Route>

      {/* Qualquer outra URL volta para o início */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
