import { Navigate, Outlet } from 'react-router-dom'
import { getToken } from '../hooks/useAuth'

export default function AuthGuard() {
  return getToken() ? <Outlet /> : <Navigate to="/login" replace />
}
