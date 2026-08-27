import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { useActivePeriod } from '../../hooks/useActivePeriod'
import { useMemberGrid } from '../../hooks/useMemberGrid'
import { useAuth } from '../../lib/auth-context'
import { CATEGORY_LABELS, CATEGORY_SWATCH, DAY_LABELS } from '../../lib/format'
import { Button, EmptyState, Skeleton, ErrorState } from '../../components/ui'
import { IndividualGrid } from '../grid/IndividualGrid'
import type { Activity } from '../../lib/api-types'

export default function JadwalSaya() {
  const { member } = useAuth()
  const { data: period, isLoading: periodLoading } = useActivePeriod()
  const navigate = useNavigate()

  const { data: activities, isLoading: actLoading, error } = useQuery({
    queryKey: ['activities', member?.id, period?.id],
    queryFn: () => api.get<Activity[]>('/api/activities', { periodId: period!.id, memberId: member!.id }),
    enabled: !!member && !!period,
  })
  const { data: grid } = useMemberGrid(member?.id, period?.id)

  if (periodLoading || actLoading) {
    return (
      <div className="p-5 flex flex-col gap-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }
  if (!period) {
    return (
      <div className="p-5">
        <ErrorState message="Belum ada periode aktif." />
      </div>
    )
  }
  if (error) {
    return (
      <div className="p-5">
        <ErrorState message="Gagal memuat jadwal." />
      </div>
    )
  }

  const freeBlocks = grid?.cells.filter((c) => c.status === 'implicit_free' || c.status === 'preferred_free').length ?? 0

  return (
    <div className="p-5 pb-8 flex flex-col gap-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Jadwal Saya</h1>
          <p className="font-mono text-[11px] text-muted mt-1">
            {activities?.length ?? 0} aktivitas rutin · {freeBlocks} blok luang
          </p>
        </div>
        <Button variant="accent" className="rounded-full !px-4 !py-2.5 text-[13px]" onClick={() => navigate('/jadwal/tambah')}>
          + Tambah
        </Button>
      </div>

      {period && <IndividualGrid period={period} memberId={member!.id} />}

      <div className="flex flex-col gap-2">
        {activities && activities.length === 0 ? (
          <EmptyState
            title="Belum ada jadwal rutin. Tambah satu, baru kelihatan hasilnya di grid."
            action={
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => navigate('/jadwal/tambah')}>
                  + Tambah aktivitas
                </Button>
                <Button variant="accent" onClick={() => navigate('/onboarding')}>
                  Pakai wizard
                </Button>
              </div>
            }
          />
        ) : (
          activities?.map((a) => (
            <button
              key={a.id}
              onClick={() => navigate(`/jadwal/${a.id}/ubah`)}
              className="flex items-center gap-3 rounded-2xl hard-border bg-white px-3.5 py-3 text-left"
            >
              <div className="h-9 w-2.5 rounded-full border-2 border-ink" style={{ background: CATEGORY_SWATCH[a.category] }} />
              <div className="flex-1">
                <div className="text-[15px] font-bold">{a.title ?? CATEGORY_LABELS[a.category]}</div>
                <div className="font-mono text-[11px] text-muted">
                  {a.schedules.map((s) => `${DAY_LABELS[s.weekday - 1]} ${s.startTime}–${s.endTime}`).join(', ')}
                </div>
              </div>
              <span className="text-lg">›</span>
            </button>
          ))
        )}
      </div>

      <Button variant="secondary" onClick={() => navigate('/jadwal/pengecualian')}>
        Kelola pengecualian (izin/cuti/libur)
      </Button>
    </div>
  )
}
