export type GridBand = { id: string; key: string; label: string; startTime: string; endTime: string; sortOrder: number }
export type GridCell = { weekday: number; bandKey: string; free: number; soft: number; total: number }
export type GridResponse = {
  periodId: string
  granularity: 'band' | 'slot'
  bands: GridBand[]
  cells: GridCell[]
  totalActiveMembers: number
}

export type SlotCandidate = { id: string; fullName: string; nickname: string; initials: string; tag: string | null }
export type SlotDetailResponse = {
  outOfRange: boolean
  ready: SlotCandidate[]
  maybe: SlotCandidate[]
  unavailable: SlotCandidate[]
}

export type SearchCandidate = { member: { id: string; fullName: string; nickname: string; initials: string }; score?: number; reasons?: string[]; conflictReason?: string | null; reason?: string | null }
export type SearchResponse = {
  full: SearchCandidate[]
  partial: SearchCandidate[]
  unavailable: SearchCandidate[]
  meta: { needed: number; fullCount: number; evaluated: number }
}

export type ActivitySchedule = { weekday: number; startTime: string; endTime: string; recurrence: string }
export type Activity = {
  id: string
  memberId: string
  category: string
  title: string | null
  location: string | null
  note: string | null
  isOutsideArea: boolean
  source: string
  schedules: ActivitySchedule[]
}

export type ScheduleException = {
  id: string
  memberId: string
  startDate: string
  endDate: string
  isAllDay: boolean
  startTime: string | null
  endTime: string | null
  type: string
  reason: string | null
  countsAgainstQuota: boolean
}

export type MemberSummary = {
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
  scheduleCompletion?: { activityCount: number; lastReviewedAt: string | null; isStale: boolean }
}

export type MemberGridCell = { weekday: number; slotIndex: number; status: string; category: string | null }
export type MemberGridResponse = { periodId: string; memberId: string; cells: MemberGridCell[] }
