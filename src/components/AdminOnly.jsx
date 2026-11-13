import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Spinner } from './Feedback'

/** Página fechada para todo mundo menos admin (quem não é volta para o início). */
export default function AdminOnly({ children }) {
  const { isAdmin, adminReady } = useAuth()
  if (!adminReady) return <Spinner />
  if (!isAdmin) return <Navigate to="/" replace />
  return children
}
