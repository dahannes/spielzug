import { Navigate, Outlet } from 'react-router'
import { Loading } from '../components/ui'
import { useAuth } from '../features/auth/useAuth'

export function RequireAuth() {
  const { session, loading } = useAuth()
  if (loading) return <Loading />
  if (!session) return <Navigate to="/login" replace />
  return <Outlet />
}
