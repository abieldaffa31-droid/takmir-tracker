import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { useActivePeriod } from '../../hooks/useActivePeriod'
import { DAY_LABELS, isoWeekday, resolveDateForWeekday, todayIso } from '../../lib/format'
import { Button, Input, Skeleton } from '../../components/ui'
import type { SearchResponse } from '../../lib/api-types'

export default function Cari() {
  const { data: period } = useActivePeriod()
  const [weekday, setWeekday] = useState(isoWeekday(todayIso()))
  const [needed, setNeeded] = useState(2)
  const [startTime, setStartTime] = useState('17:40')
  const [endTime, setEndTime] = useState('19:00')
  const [triggered, setTriggered] = useState(false)

  const date = period ? resolveDateForWeekday(period, weekday) : ''

  const { data, isFetching, refetch } = useQuery({
    queryKey: ['availability', 'search', period?.id, date, startTime, endTime, needed],
    queryFn: () =>
      api.post<SearchResponse>('/api/availability/search', {
        periodId: period!.id,
        date,
        startTime,
        endTime,
        needed,
      }),
    enabled: false,
  })

  async function handleSearch() {
    setTriggered(true)
    await refetch()
  }

  return (
    <div className="p-5 pb-8 flex flex-col gap-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold tracking-tight">Cari personel</h1>

      <div className="flex flex-col gap-2.5 rounded-2xl hard-border bg-white p-4">
        <div>
          <div className="font-mono text-[10px] text-muted mb-1.5">HARI</div>
          <div className="flex flex-wrap gap-1.5">
            {DAY_LABELS.map((d, i) => (
              <button
                key={d}
                onClick={() => setWeekday(i + 1)}
                className={`rounded-full border-2 border-ink px-3 py-1.5 text-xs font-bold ${
                  weekday === i + 1 ? 'bg-brand text-white' : 'bg-white text-ink'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2.5">
          <div className="flex-1">
            <div className="font-mono text-[10px] text-muted mb-1.5">BUTUH</div>
            <Input
              type="number"
              min={1}
              value={needed}
              onChange={(e) => setNeeded(Number(e.target.value))}
              className="tabular-nums"
            />
          </div>
          <div className="flex-1">
            <div className="font-mono text-[10px] text-muted mb-1.5">MULAI</div>
            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="font-mono" />
          </div>
          <div className="flex-1">
            <div className="font-mono text-[10px] text-muted mb-1.5">SELESAI</div>
            <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="font-mono" />
          </div>
        </div>
        <Button variant="accent" className="py-3.5" onClick={handleSearch} disabled={!period || isFetching}>
          {isFetching ? 'Mencari…' : 'Cari sekarang'}
        </Button>
      </div>

      {isFetching && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      )}

      {triggered && data && !isFetching && (
        <div className="flex flex-col gap-2">
          <div className="font-mono text-[10.5px] tracking-wide text-brand">
            BISA HADIR · {data.full.length}
            {data.meta.needed > data.full.length && <span className="ml-2 text-ink">(butuh {data.meta.needed})</span>}
          </div>
          {data.full.map((c) => (
            <CandidateRow key={c.member.id} name={c.member.fullName} tag={c.reasons?.includes('preferred_free') ? 'preferred' : 'luang'} dashed={false} />
          ))}

          {data.partial.length > 0 && (
            <div className="mt-1 font-mono text-[10.5px] tracking-wide text-brand">PERLU DIKONFIRMASI · {data.partial.length}</div>
          )}
          {data.partial.map((c) => (
            <CandidateRow key={c.member.id} name={c.member.fullName} tag={c.conflictReason ?? 'perlu dikonfirmasi'} dashed />
          ))}
        </div>
      )}
    </div>
  )
}

function CandidateRow({ name, tag, dashed }: { name: string; tag: string | null; dashed: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 rounded-2xl px-3 py-2.5 bg-white border-2 border-ink ${dashed ? 'border-dashed' : ''}`}>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-tint-1 text-xs font-bold">
        {name
          .split(' ')
          .slice(0, 2)
          .map((w) => w[0])
          .join('')}
      </div>
      <div className="flex-1 text-sm font-semibold">{name}</div>
      {tag && <div className="font-mono text-[10px] text-muted">{tag}</div>}
    </div>
  )
}
