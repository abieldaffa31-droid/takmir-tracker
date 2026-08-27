import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../lib/auth-context'
import { AppShell } from './AppShell'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-muted">Memuat…</div>
  }
  if (!isAuthenticated) {
    return <Navigate to="/masuk" state={{ from: location }} replace />
  }
  return <AppShell>{children}</AppShell>
}

export function RequireCoordinator({ children }: { children: ReactNode }) {
  const { isCoordinator } = useAuth()
  if (!isCoordinator) return <Navigate to="/jadwal" replace />
  return <>{children}</>
}
