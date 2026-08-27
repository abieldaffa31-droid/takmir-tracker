import { Fragment } from 'react'
import { CATEGORY_LABELS, CATEGORY_SWATCH, DAY_LABELS } from '../../lib/format'
import { Skeleton } from '../../components/ui'
import { useMemberGrid } from '../../hooks/useMemberGrid'
import type { Period } from '../../hooks/useActivePeriod'

export function IndividualGrid({ period, memberId }: { period: Period; memberId: string }) {
  const { data, isLoading } = useMemberGrid(memberId, period.id)

  if (isLoading || !data) return <Skeleton className="h-64 w-full" />

  const totalSlots = Math.max(...data.cells.map((c) => c.slotIndex)) + 1
  const byKey = new Map(data.cells.map((c) => [`${c.weekday}:${c.slotIndex}`, c]))

  // Kelompokkan per baris band-ish sederhana: tiap 4 slot (2 jam) jadi satu baris ringkas untuk mobile.
  const rowsPerGroup = 4
  const groupCount = Math.ceil(totalSlots / rowsPerGroup)

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl hard-border overflow-hidden bg-ink">
        <div
          className="grid gap-[1.5px]"
          style={{ gridTemplateColumns: `56px repeat(7, 1fr)` }}
        >
          <div className="bg-ink" />
          {DAY_LABELS.map((d) => (
            <div key={d} className="bg-ink text-center font-mono text-[10px] py-1.5 text-white">
              {d}
            </div>
          ))}
          {Array.from({ length: groupCount }, (_, g) => g).map((g) => {
            const startSlot = g * rowsPerGroup
            return (
              <Fragment key={g}>
                <div className="bg-ink flex items-center px-1 text-[9px] font-semibold text-white">
                  {formatHour(startSlot, period)}
                </div>
                {DAY_LABELS.map((_, dIdx) => {
                  const weekday = dIdx + 1
                  const cellsInGroup = Array.from({ length: rowsPerGroup }, (_, i) => byKey.get(`${weekday}:${startSlot + i}`))
                  const category = cellsInGroup.find((c) => c?.category)?.category ?? null
                  const swatch = category ? CATEGORY_SWATCH[category] : '#fff'
                  return (
                    <div
                      key={`${weekday}-${g}`}
                      className="h-9 flex items-center justify-center text-[9px] font-bold"
                      style={{ background: swatch, color: category ? '#fff' : '#0B0F2B' }}
                      title={category ? CATEGORY_LABELS[category] : 'luang'}
                    >
                      {category ? category.slice(0, 3) : ''}
                    </div>
                  )
                })}
              </Fragment>
            )
          })}
        </div>
      </div>
      <div className="flex flex-wrap gap-2.5 font-mono text-[10.5px] text-muted">
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
          <span key={key} className="inline-flex items-center gap-1">
            <span
              className="inline-block h-2.5 w-2.5 border border-ink"
              style={{ background: CATEGORY_SWATCH[key] }}
            />
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}

function formatHour(slotIndex: number, period: Period) {
  const [h, m] = period.operationalStart.split(':').map(Number)
  const totalMinutes = h * 60 + m + slotIndex * period.slotMinutes
  const hh = Math.floor(totalMinutes / 60) % 24
  const mm = totalMinutes % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}
