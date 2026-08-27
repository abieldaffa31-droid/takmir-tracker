import { Navigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth-context'

export default function RoleRedirect() {
  const { isCoordinator } = useAuth()
  return <Navigate to={isCoordinator ? '/grid' : '/jadwal'} replace />
}
