import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

export type Period = {
  id: string
  name: string
  startDate: string
  endDate: string
  status: 'draft' | 'active' | 'archived'
  operationalStart: string
  operationalEnd: string
  slotMinutes: number
  bufferMinutes: number
  staleAfterDays: number
  availabilityVersion: number
}

export function useActivePeriod() {
  return useQuery({
    queryKey: ['periods', 'active'],
    queryFn: () => api.get<Period | null>('/api/periods/active'),
  })
}

export type Band = {
  id: string
  key: string
  label: string
  startTime: string
  endTime: string
  sortOrder: number
}

export function useBands(periodId: string | undefined) {
  return useQuery({
    queryKey: ['periods', periodId, 'bands'],
    queryFn: () => api.get<Band[]>(`/api/periods/${periodId}/bands`),
    enabled: !!periodId,
  })
}
