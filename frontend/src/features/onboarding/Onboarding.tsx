import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '../../lib/api'
import { useActivePeriod, useBands } from '../../hooks/useActivePeriod'
import { useAuth } from '../../lib/auth-context'
import { CATEGORY_LABELS, DAY_LABELS } from '../../lib/format'
import { Button, Input, Skeleton } from '../../components/ui'

type ScheduleDraft = { weekday: number; startTime: string; endTime: string; recurrence: 'weekly' }
type ActivityDraft = { category: string; title: string; schedules: ScheduleDraft[] }

const STEP_TITLES = ['Kapan kamu kuliah atau kerja?', 'Ada amanah atau kegiatan rutin lain?', 'Tandai kapan kamu biasanya luang']
const STEP_SUB = [
  'Yang rutin tiap pekan aja. Bisa diubah kapan pun.',
  'Amanah masjid, organisasi, atau kegiatan pribadi rutin — boleh dilewati.',
  'Ketuk sel yang biasanya luang. Ini bantu koordinator cari orang lebih cepat.',
]

export default function Onboarding() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { member } = useAuth()
  const { data: period } = useActivePeriod()
  const { data: bands } = useBands(period?.id)

  const [step, setStep] = useState(1)
  const [draft, setDraft] = useState<ActivityDraft[]>([])
  const [freeCells, setFreeCells] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  function addDraft(category: string, title: string, days: number[], startTime: string, endTime: string) {
    if (days.length === 0) return
    setDraft((prev) => [
      ...prev,
      { category, title, schedules: days.map((weekday) => ({ weekday, startTime, endTime, recurrence: 'weekly' as const })) },
    ])
  }

  function toggleFreeCell(key: string) {
    setFreeCells((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function finish() {
    if (!period || !member) return
    setSubmitting(true)
    setError('')
    try {
      const activities: ActivityDraft[] = [...draft]
      if (freeCells.size > 0 && bands) {
        const schedules: ScheduleDraft[] = [...freeCells].map((key) => {
          const [weekdayStr, bandKey] = key.split('|')
          const band = bands.find((b) => b.key === bandKey)!
          return { weekday: Number(weekdayStr), startTime: band.startTime, endTime: band.endTime, recurrence: 'weekly' }
        })
        activities.push({ category: 'luang_preferred', title: 'Waktu luang preferred', schedules })
      }
      if (activities.length > 0) {
        await api.post('/api/activities/bulk', {
          activities: activities.map((a) => ({ periodId: period.id, category: a.category, title: a.title, schedules: a.schedules })),
        })
        await queryClient.invalidateQueries({ queryKey: ['activities'] })
        await queryClient.invalidateQueries({ queryKey: ['availability'] })
      }
      navigate('/jadwal')
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal menyimpan jadwal')
    } finally {
      setSubmitting(false)
    }
  }

  function next() {
    if (step < 3) setStep(step + 1)
    else void finish()
  }

  if (!period) {
    return (
      <div className="p-5">
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="px-5 pt-4">
        <div className="flex gap-1.5 mb-5">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`flex-1 h-2 rounded-full border-2 border-ink ${s <= step ? 'bg-accent' : 'bg-white'}`} />
          ))}
        </div>
        <div className="font-mono text-[11px] tracking-wide text-brand">LANGKAH {step} DARI 3</div>
        <div className="text-[26px] font-bold tracking-tight mt-2 leading-tight">{STEP_TITLES[step - 1]}</div>
        <p className="text-sm text-muted mt-2 leading-relaxed">{STEP_SUB[step - 1]}</p>
      </div>

      <div className="flex-1 px-5 py-5">
        {step === 1 && <ActivityStep categories={['kuliah', 'kerja']} draft={draft} onAdd={addDraft} onRemove={(i) => setDraft((d) => d.filter((_, idx) => idx !== i))} />}
        {step === 2 && <ActivityStep categories={['amanah_masjid', 'organisasi', 'pribadi']} draft={draft} onAdd={addDraft} onRemove={(i) => setDraft((d) => d.filter((_, idx) => idx !== i))} />}
        {step === 3 && bands && <FreeCellGrid bands={bands} selected={freeCells} onToggle={toggleFreeCell} />}
        {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
      </div>

      <div className="flex gap-2.5 px-5 py-5 border-t-[3px] border-ink bg-white sticky bottom-0">
        <Button variant="secondary" className="flex-1" onClick={() => (step < 3 ? setStep(step + 1) : finish())} disabled={submitting}>
          Lewati
        </Button>
        <Button variant="primary" className="flex-[2]" onClick={next} disabled={submitting}>
          {step < 3 ? 'Lanjut →' : submitting ? 'Menyimpan…' : 'Selesai'}
        </Button>
      </div>
    </div>
  )
}

function ActivityStep({
  categories,
  draft,
  onAdd,
  onRemove,
}: {
  categories: string[]
  draft: ActivityDraft[]
  onAdd: (category: string, title: string, days: number[], startTime: string, endTime: string) => void
  onRemove: (index: number) => void
}) {
  const [category, setCategory] = useState(categories[0])
  const [title, setTitle] = useState('')
  const [days, setDays] = useState<number[]>([])
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('10:00')

  const relevantDraft = draft.filter((d) => categories.includes(d.category))

  return (
    <div className="flex flex-col gap-3">
      {relevantDraft.length > 0 && (
        <div className="flex flex-col gap-2 mb-1">
          {draft.map((d, i) =>
            categories.includes(d.category) ? (
              <div key={i} className="flex items-center gap-2.5 rounded-2xl hard-border bg-white px-3.5 py-2.5">
                <div className="flex-1">
                  <div className="text-sm font-bold">{d.title}</div>
                  <div className="font-mono text-[10.5px] text-muted">
                    {d.schedules.map((s) => `${DAY_LABELS[s.weekday - 1]} ${s.startTime}-${s.endTime}`).join(', ')}
                  </div>
                </div>
                <button onClick={() => onRemove(i)} className="text-sm font-semibold text-red-600">
                  Hapus
                </button>
              </div>
            ) : null,
          )}
        </div>
      )}

      <div className="flex gap-2">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`rounded-full border-[2.5px] border-ink px-3.5 py-2 text-[13px] font-bold ${
              category === c ? 'bg-brand text-white' : 'bg-white text-ink'
            }`}
          >
            {CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>
      <Input placeholder="Nama (contoh: Kalkulus II)" value={title} onChange={(e) => setTitle(e.target.value)} />
      <div className="flex flex-wrap gap-1.5">
        {DAY_LABELS.map((d, i) => {
          const weekday = i + 1
          const active = days.includes(weekday)
          return (
            <button
              key={d}
              onClick={() => setDays((prev) => (active ? prev.filter((w) => w !== weekday) : [...prev, weekday]))}
              className={`rounded-full border-2 border-ink px-3 py-1.5 text-xs font-bold ${active ? 'bg-brand text-white' : 'bg-white text-ink'}`}
            >
              {d}
            </button>
          )
        })}
      </div>
      <div className="flex gap-2.5">
        <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="font-mono flex-1" />
        <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="font-mono flex-1" />
      </div>
      <button
        onClick={() => {
          if (!title || days.length === 0) return
          onAdd(category, title, days, startTime, endTime)
          setTitle('')
          setDays([])
        }}
        disabled={!title || days.length === 0}
        className="flex items-center gap-2.5 rounded-2xl hard-border bg-white px-4 py-3.5 text-[15px] font-semibold disabled:opacity-50"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-white font-bold">+</span>
        Tambah ke daftar
      </button>
    </div>
  )
}

function FreeCellGrid({
  bands,
  selected,
  onToggle,
}: {
  bands: { key: string; label: string; startTime: string; endTime: string; sortOrder: number }[]
  selected: Set<string>
  onToggle: (key: string) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      {bands
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((band) => (
          <div key={band.key} className="rounded-2xl hard-border bg-white p-2.5">
            <div className="text-[13px] font-bold mb-1.5 px-1">{band.label}</div>
            <div className="flex gap-1">
              {DAY_LABELS.map((d, i) => {
                const weekday = i + 1
                const key = `${weekday}|${band.key}`
                const active = selected.has(key)
                return (
                  <button
                    key={d}
                    onClick={() => onToggle(key)}
                    className={`flex-1 rounded-lg border-2 border-ink py-2 text-[11px] font-bold ${
                      active ? 'bg-accent' : 'bg-paper'
                    }`}
                  >
                    {d}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
    </div>
  )
}
