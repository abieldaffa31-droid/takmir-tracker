import { createAuthClient } from 'better-auth/react'
import { magicLinkClient } from 'better-auth/client/plugins'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

export const authClient = createAuthClient({
  baseURL: BASE_URL,
  plugins: [magicLinkClient()],
})

export const { useSession, signOut } = authClient
