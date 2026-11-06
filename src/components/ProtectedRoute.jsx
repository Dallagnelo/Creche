import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Spinner } from './Feedback'

// "Porteiro" das páginas privadas: se não há sessão, manda para o login.
// <Outlet /> é o lugar onde o React Router desenha as páginas filhas.
export default function ProtectedRoute() {
  const { session, loading } = useAuth()

  if (loading) return <Spinner label="Verificando acesso..." />
  return session ? <Outlet /> : <Navigate to="/login" replace />
}
