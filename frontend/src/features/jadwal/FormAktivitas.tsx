import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '../../lib/api'
import { useActivePeriod } from '../../hooks/useActivePeriod'
import { useAuth } from '../../lib/auth-context'
import { CATEGORY_LABELS, DAY_LABELS } from '../../lib/format'
import { Button, Input, Textarea, Skeleton } from '../../components/ui'
import type { Activity } from '../../lib/api-types'

const CATEGORIES = Object.keys(CATEGORY_LABELS) as (keyof typeof CATEGORY_LABELS)[]

export default function FormAktivitas() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { member } = useAuth()
  const { data: period } = useActivePeriod()

  const { data: existingActivities } = useQuery({
    queryKey: ['activities', member?.id, period?.id],
    queryFn: () => api.get<Activity[]>('/api/activities', { periodId: period!.id, memberId: member!.id }),
    enabled: !!member && !!period,
  })
  const existing = isEdit ? existingActivities?.find((a) => a.id === id) : undefined

  const [category, setCategory] = useState<string>('kuliah')
  const [title, setTitle] = useState('')
  const [days, setDays] = useState<number[]>([])
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('10:00')
  const [isOutsideArea, setIsOutsideArea] = useState(false)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    if (!existing) return
    setCategory(existing.category)
    setTitle(existing.title ?? '')
    setDays(existing.schedules.map((s) => s.weekday))
    setStartTime(existing.schedules[0]?.startTime ?? '08:00')
    setEndTime(existing.schedules[0]?.endTime ?? '10:00')
    setIsOutsideArea(existing.isOutsideArea)
    setNote(existing.note ?? '')
  }, [existing])

  const schedules = useMemo(
    () => days.map((weekday) => ({ weekday, startTime, endTime, recurrence: 'weekly' as const })),
    [days, startTime, endTime],
  )

  const canCheck = !!period && !!member && days.length > 0 && startTime !== endTime
  const { data: conflicts } = useQuery({
    queryKey: ['activities', 'check-conflict', member?.id, period?.id, schedules, id],
    queryFn: () =>
      api.post<{ withActivity: { title: string; weekday: number; startTime: string; endTime: string } }[]>(
        '/api/activities/check-conflict',
        { periodId: period!.id, memberId: member!.id, excludeActivityId: id, schedules },
      ),
    enabled: canCheck,
  })

  async function handleSubmit() {
    if (!period || !member || days.length === 0) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const payload = {
        periodId: period.id,
        category,
        title: title || CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS],
        isOutsideArea,
        note: note || undefined,
        schedules,
      }
      if (isEdit) {
        await api.patch(`/api/activities/${id}`, payload)
      } else {
        await api.post('/api/activities', payload)
      }
      await queryClient.invalidateQueries({ queryKey: ['activities'] })
      await queryClient.invalidateQueries({ queryKey: ['availability'] })
      navigate('/jadwal')
    } catch (e) {
      setSubmitError(e instanceof ApiError ? e.message : 'Gagal menyimpan jadwal')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!id) return
    setSubmitting(true)
    try {
      await api.delete(`/api/activities/${id}`)
      await queryClient.invalidateQueries({ queryKey: ['activities'] })
      await queryClient.invalidateQueries({ queryKey: ['availability'] })
      navigate('/jadwal')
    } catch (e) {
      setSubmitError(e instanceof ApiError ? e.message : 'Gagal menghapus jadwal')
      setSubmitting(false)
    }
  }

  if (isEdit && !existingActivities) {
    return (
      <div className="p-5 flex flex-col gap-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="px-5 pt-4 pb-4 border-b-[3px] border-ink">
        <button onClick={() => navigate(-1)} className="font-mono text-[11px] text-muted">
          ← kembali
        </button>
        <div className="text-2xl font-bold tracking-tight mt-1">{isEdit ? 'Ubah aktivitas' : 'Tambah aktivitas'}</div>
      </div>

      <div className="flex-1 px-5 py-5 flex flex-col gap-4 max-w-lg mx-auto w-full">
        <Field label="JENIS">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`rounded-full border-[3px] border-ink px-3.5 py-2 text-[13px] font-bold ${
                  category === c ? 'bg-brand text-white' : 'bg-white text-ink'
                }`}
              >
                {CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
        </Field>

        <Field label="NAMA / KETERANGAN">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="contoh: Kalkulus II" />
        </Field>

        <Field label="HARI">
          <div className="flex flex-wrap gap-1.5">
            {DAY_LABELS.map((d, i) => {
              const weekday = i + 1
              const active = days.includes(weekday)
              return (
                <button
                  key={d}
                  onClick={() => setDays((prev) => (active ? prev.filter((w) => w !== weekday) : [...prev, weekday]))}
                  className={`rounded-full border-[2.5px] border-ink px-3.5 py-2 text-[13px] font-bold ${
                    active ? 'bg-brand text-white' : 'bg-white text-ink'
                  }`}
                >
                  {d}
                </button>
              )
            })}
          </div>
        </Field>

        <div className="flex gap-2.5">
          <Field label="MULAI" className="flex-1">
            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="font-mono" />
          </Field>
          <Field label="SELESAI" className="flex-1">
            <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="font-mono" />
          </Field>
        </div>

        <label className="flex items-center justify-between rounded-2xl hard-border bg-white px-4 py-3.5">
          <span className="text-[14px] font-semibold">Sering di luar area masjid</span>
          <input type="checkbox" checked={isOutsideArea} onChange={(e) => setIsOutsideArea(e.target.checked)} className="h-5 w-5" />
        </label>

        <Field label="CATATAN (OPSIONAL)">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} className="h-20" />
        </Field>

        {conflicts && conflicts.length > 0 && (
          <div className="rounded-2xl hard-border bg-accent p-3.5">
            <div className="text-[14px] font-bold">Bentrok, nih.</div>
            <div className="text-[13px] mt-1 leading-relaxed">
              {conflicts.map((c, i) => (
                <div key={i}>
                  {DAY_LABELS[c.withActivity.weekday - 1]} {c.withActivity.startTime}–{c.withActivity.endTime} sudah
                  keisi "{c.withActivity.title}". Tetap bisa disimpan — keduanya akan ditandai.
                </div>
              ))}
            </div>
          </div>
        )}

        {submitError && <p className="text-sm font-semibold text-red-600">{submitError}</p>}
      </div>

      <div className="flex gap-2.5 px-5 py-5 border-t-[3px] border-ink bg-white sticky bottom-0">
        {isEdit && (
          <Button variant="danger" onClick={handleDelete} disabled={submitting}>
            Hapus
          </Button>
        )}
        <Button variant="secondary" className="flex-1" onClick={() => navigate(-1)} disabled={submitting}>
          Batal
        </Button>
        <Button variant="primary" className="flex-[2]" onClick={handleSubmit} disabled={submitting || days.length === 0}>
          {isEdit ? 'Simpan perubahan' : 'Simpan jadwal'}
        </Button>
      </div>
    </div>
  )
}

function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="font-mono text-[10.5px] tracking-wide text-brand mb-2">{label}</div>
      {children}
    </div>
  )
}
