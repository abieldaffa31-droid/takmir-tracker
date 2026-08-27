import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { MemberGridResponse } from '../lib/api-types'

export function useMemberGrid(memberId: string | undefined, periodId: string | undefined) {
  return useQuery({
    queryKey: ['availability', 'member', memberId, periodId],
    queryFn: () => api.get<MemberGridResponse>(`/api/availability/member/${memberId}`, { periodId }),
    enabled: !!memberId && !!periodId,
  })
}
