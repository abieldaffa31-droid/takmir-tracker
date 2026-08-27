import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { DAY_LABELS_FULL } from '../../lib/format'
import { Badge, Sheet, Skeleton } from '../../components/ui'
import type { SlotDetailResponse } from '../../lib/api-types'
import { useAuth } from '../../lib/auth-context'

export function SlotSheet({
  periodId,
  date,
  weekday,
  bandLabel,
  startTime,
  endTime,
  onClose,
}: {
  periodId: string
  date: string
  weekday: number
  bandLabel: string
  startTime: string
  endTime: string
  onClose: () => void
}) {
  const navigate = useNavigate()
  const { isCoordinator } = useAuth()
  const { data, isLoading } = useQuery({
    queryKey: ['availability', 'slot', periodId, date, startTime, endTime],
    queryFn: () =>
      api.get<SlotDetailResponse>('/api/availability/slot', { periodId, date, startTime, endTime }),
  })

  return (
    <Sheet open onClose={onClose}>
      <div className="flex flex-col gap-1 -mx-5 -mt-2 px-5 pt-1 pb-4">
        <Badge className="self-start -rotate-1 bg-accent">{DAY_LABELS_FULL[weekday - 1].toUpperCase()}</Badge>
        <div className="text-2xl font-bold leading-tight">{bandLabel}</div>
        <div className="font-mono text-xs text-muted">
          {startTime}–{endTime}
        </div>
      </div>

      {isLoading || !data ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      ) : data.outOfRange ? (
        <div className="text-sm text-muted">Tanggal ini di luar rentang periode aktif.</div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="font-mono text-[10.5px] tracking-wide text-brand">BISA DITUGASKAN · {data.ready.length}</div>
          {data.ready.map((c) => (
            <CandidateRow key={c.id} c={c} dashed={false} />
          ))}

          {data.maybe.length > 0 && (
            <div className="mt-1.5 font-mono text-[10.5px] tracking-wide text-brand">
              PERLU DIKONFIRMASI · {data.maybe.length}
            </div>
          )}
          {data.maybe.map((c) => (
            <CandidateRow key={c.id} c={c} dashed />
          ))}

          {data.unavailable.length > 0 && (
            <div className="mt-1.5 flex items-center justify-between border-t-2 border-dashed border-line pt-3 text-sm font-semibold text-muted">
              <span>Tidak bisa · {data.unavailable.length}</span>
            </div>
          )}
          {data.unavailable.map((c) => (
            <CandidateRow key={c.id} c={c} dashed muted />
          ))}

          {isCoordinator && (
            <button
              onClick={() => navigate('/cari')}
              className="mt-3 rounded-2xl hard-border hard-shadow bg-accent px-4 py-3.5 text-sm font-bold"
            >
              Cari personel
            </button>
          )}
        </div>
      )}
    </Sheet>
  )
}

function CandidateRow({
  c,
  dashed,
  muted,
}: {
  c: { id: string; fullName: string; nickname: string; initials: string; tag: string | null }
  dashed: boolean
  muted?: boolean
}) {
  return (
    <div
      className={`flex items-center gap-2.5 rounded-2xl px-3 py-2.5 bg-white border-2 border-ink ${
        dashed ? 'border-dashed' : ''
      } ${muted ? 'opacity-70' : ''}`}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-tint-1 text-xs font-bold">
        {c.initials}
      </div>
      <div className="flex-1 text-sm font-semibold">{c.fullName}</div>
      {c.tag && <div className="font-mono text-[10px] text-muted">{c.tag}</div>}
    </div>
  )
}
