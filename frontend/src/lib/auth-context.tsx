import { createContext, useContext, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSession } from './auth-client'
import { api } from './api'

export type Role = 'admin' | 'coordinator' | 'member' | 'viewer'

export type MemberProfile = {
  id: string
  fullName: string
  nickname: string
  photoUrl: string | null
  memberStatus: string
  division: string | null
  isActive: boolean
  lastReviewedAt: string | null
  email: string | null
  phone: string | null
  domicileZone: string | null
}

type AuthState = {
  isLoading: boolean
  isAuthenticated: boolean
  role: Role | null
  isCoordinator: boolean
  member: MemberProfile | null
}

const AuthContext = createContext<AuthState>({
  isLoading: true,
  isAuthenticated: false,
  role: null,
  isCoordinator: false,
  member: null,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending } = useSession()
  const authenticated = !!session?.user

  const { data: member, isLoading: memberLoading } = useQuery({
    queryKey: ['members', 'me'],
    queryFn: () => api.get<MemberProfile>('/api/members/me'),
    enabled: authenticated,
    retry: false,
  })

  const role = ((session?.user as { role?: Role } | undefined)?.role ?? null) as Role | null

  const value: AuthState = {
    isLoading: isPending || (authenticated && memberLoading),
    isAuthenticated: authenticated,
    role,
    isCoordinator: role === 'coordinator' || role === 'admin',
    member: member ?? null,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
