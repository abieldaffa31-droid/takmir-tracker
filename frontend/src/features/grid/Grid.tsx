import { Fragment, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { useActivePeriod } from '../../hooks/useActivePeriod'
import { useAuth } from '../../lib/auth-context'
import { CRITICAL_THRESHOLD, DAY_LABELS, cellColorFor, isoWeekday, resolveDateForWeekday, todayIso } from '../../lib/format'
import { Skeleton, ErrorState } from '../../components/ui'
import type { GridResponse } from '../../lib/api-types'
import { SlotSheet } from './SlotSheet'
import { IndividualGrid } from './IndividualGrid'

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block h-3 w-3 border-2 border-ink" style={{ background: color }} />
      {label}
    </span>
  )
}

export default function Grid() {
  const { data: period, isLoading: periodLoading } = useActivePeriod()
  const { member } = useAuth()
  const [params, setParams] = useSearchParams()
  const mode = params.get('mode') === 'individu' ? 'individu' : 'tim'
  const [selectedWeekday, setSelectedWeekday] = useState(isoWeekday(todayIso()))
  const [openSlot, setOpenSlot] = useState<{ weekday: number; bandKey: string } | null>(null)

  const { data: grid, isLoading: gridLoading, error } = useQuery({
    queryKey: ['availability', 'grid', period?.id],
    queryFn: () => api.get<GridResponse>('/api/availability/grid', { periodId: period!.id, granularity: 'band' }),
    enabled: !!period,
  })

  const cellsByWeekday = useMemo(() => {
    const map = new Map<number, GridResponse['cells']>()
    if (!grid) return map
    for (const c of grid.cells) {
      if (!map.has(c.weekday)) map.set(c.weekday, [])
      map.get(c.weekday)!.push(c)
    }
    const sortOrderByKey = new Map(grid.bands.map((b) => [b.key, b.sortOrder]))
    for (const arr of map.values()) {
      arr.sort((a, b) => (sortOrderByKey.get(a.bandKey) ?? 0) - (sortOrderByKey.get(b.bandKey) ?? 0))
    }
    return map
  }, [grid])

  if (periodLoading || gridLoading) {
    return (
      <div className="p-5 flex flex-col gap-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }
  if (!period) {
    return (
      <div className="p-5">
        <ErrorState message="Belum ada periode aktif. Minta koordinator membuat periode dulu." />
      </div>
    )
  }
  if (error || !grid) {
    return (
      <div className="p-5">
        <ErrorState message="Gagal memuat grid. Coba lagi." />
      </div>
    )
  }

  const bandByKey = new Map(grid.bands.map((b) => [b.key, b]))
  const openBand = openSlot ? bandByKey.get(openSlot.bandKey) : null

  return (
    <div className="p-5 pb-8 flex flex-col gap-4 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl lg:text-[28px] font-bold tracking-tight">Grid Tim</h1>
          <p className="font-mono text-[11.5px] text-muted mt-1">
            {period.name} · {grid.totalActiveMembers} anggota aktif
          </p>
        </div>
        <div className="flex rounded-full border-[2.5px] border-ink overflow-hidden">
          <button
            onClick={() => setParams({})}
            className={`px-4 py-2 text-xs font-bold ${mode === 'tim' ? 'bg-brand text-white' : 'bg-white text-ink'}`}
          >
            Tim
          </button>
          <button
            onClick={() => setParams({ mode: 'individu' })}
            className={`px-4 py-2 text-xs font-bold ${mode === 'individu' ? 'bg-brand text-white' : 'bg-white text-ink'}`}
          >
            Individu
          </button>
        </div>
      </div>

      {mode === 'individu' ? (
        member && <IndividualGrid period={period} memberId={member.id} />
      ) : (
        <>
          {/* Mobile: pemilih hari + daftar band harian */}
          <div className="lg:hidden flex flex-col gap-3">
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {DAY_LABELS.map((d, i) => {
                const weekday = i + 1
                return (
                  <button
                    key={d}
                    onClick={() => setSelectedWeekday(weekday)}
                    className={`shrink-0 rounded-full border-2 border-ink px-3.5 py-2 text-[13px] font-bold ${
                      selectedWeekday === weekday ? 'bg-brand text-white' : 'bg-white text-ink'
                    }`}
                  >
                    {d}
                  </button>
                )
              })}
            </div>
            <div className="flex flex-col gap-2">
              {(cellsByWeekday.get(selectedWeekday) ?? []).map((cell) => {
                const band = bandByKey.get(cell.bandKey)!
                const critical = cell.free < CRITICAL_THRESHOLD
                return (
                  <button
                    key={cell.bandKey}
                    onClick={() => setOpenSlot({ weekday: selectedWeekday, bandKey: cell.bandKey })}
                    className={`text-left rounded-2xl hard-border px-4 py-3 ${critical ? 'bg-accent hard-shadow' : 'bg-white'}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[15px] font-bold">{band.label}</div>
                        <div className="font-mono text-[11px] text-muted">
                          {band.startTime}–{band.endTime}
                        </div>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold tabular-nums">{cell.free}</span>
                        <span className="font-mono text-[11px] text-muted">orang</span>
                      </div>
                    </div>
                    {critical && (
                      <div className="mt-2 font-mono text-[10.5px]">
                        GAWAT — di bawah ambang {CRITICAL_THRESHOLD} orang
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Desktop: tabel penuh */}
          <div className="hidden lg:block rounded-2xl hard-border overflow-hidden bg-ink max-w-[900px]">
            <div className="grid" style={{ gridTemplateColumns: `160px repeat(7, 1fr)`, gap: '2px' }}>
              <div className="bg-ink" />
              {DAY_LABELS.map((d) => (
                <div key={d} className="bg-ink text-center font-mono text-xs py-2 text-white">
                  {d}
                </div>
              ))}
              {grid.bands.map((band) => (
                <Fragment key={band.key}>
                  <div className="bg-ink flex items-center px-2.5 text-[13px] font-semibold text-white">
                    {band.label}
                  </div>
                  {Array.from({ length: 7 }, (_, i) => i + 1).map((weekday) => {
                    const cell = (cellsByWeekday.get(weekday) ?? []).find((c) => c.bandKey === band.key)
                    const free = cell?.free ?? 0
                    const { bg, fg } = cellColorFor(free)
                    return (
                      <button
                        key={`${band.key}-${weekday}`}
                        onClick={() => setOpenSlot({ weekday, bandKey: band.key })}
                        className="h-14 flex items-center justify-center text-[17px] font-bold tabular-nums"
                        style={{ background: bg, color: fg }}
                      >
                        {free}
                      </button>
                    )
                  })}
                </Fragment>
              ))}
            </div>
          </div>
          <div className="hidden lg:flex items-center gap-4 font-mono text-[10.5px] text-muted">
            <LegendSwatch color="#DDE2FF" label="dikit" />
            <LegendSwatch color="#8E9BFF" label="sedang" />
            <LegendSwatch color="#2438FF" label="rame" />
            <LegendSwatch color="#FFF04A" label="gawat" />
          </div>
        </>
      )}

      {openSlot && openBand && (
        <SlotSheet
          periodId={period.id}
          date={resolveDateForWeekday(period, openSlot.weekday)}
          weekday={openSlot.weekday}
          bandLabel={openBand.label}
          startTime={openBand.startTime}
          endTime={openBand.endTime}
          onClose={() => setOpenSlot(null)}
        />
      )}
    </div>
  )
}
