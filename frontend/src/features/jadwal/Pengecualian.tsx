import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '../../lib/api'
import { useAuth } from '../../lib/auth-context'
import { formatDateLabel, todayIso } from '../../lib/format'
import { Button, Input, Textarea, Skeleton } from '../../components/ui'
import type { ScheduleException } from '../../lib/api-types'

const TYPES = [
  { value: 'sakit', label: 'Sakit' },
  { value: 'izin', label: 'Cuti' },
  { value: 'luar_kota', label: 'Libur' },
  { value: 'ujian', label: 'Ujian' },
  { value: 'lainnya', label: 'Lainnya' },
]

export default function Pengecualian() {
  const navigate = useNavigate()
  const { member } = useAuth()
  const queryClient = useQueryClient()

  const { data: exceptions, isLoading } = useQuery({
    queryKey: ['exceptions', member?.id],
    queryFn: () => api.get<ScheduleException[]>('/api/exceptions', { memberId: member!.id }),
    enabled: !!member,
  })

  const [type, setType] = useState('sakit')
  const [startDate, setStartDate] = useState(todayIso())
  const [endDate, setEndDate] = useState(todayIso())
  const [isAllDay, setIsAllDay] = useState(true)
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('10:00')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    setSubmitting(true)
    setError('')
    try {
      await api.post('/api/exceptions', {
        startDate,
        endDate,
        isAllDay,
        startTime: isAllDay ? undefined : startTime,
        endTime: isAllDay ? undefined : endTime,
        type,
        reason: reason || undefined,
      })
      await queryClient.invalidateQueries({ queryKey: ['exceptions'] })
      setReason('')
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal menyimpan pengecualian')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    await api.delete(`/api/exceptions/${id}`)
    await queryClient.invalidateQueries({ queryKey: ['exceptions'] })
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="px-5 pt-4 pb-4 border-b-[3px] border-ink">
        <button onClick={() => navigate(-1)} className="font-mono text-[11px] text-muted">
          ← kembali
        </button>
        <div className="text-2xl font-bold tracking-tight mt-1">Pengecualian</div>
      </div>

      <div className="flex-1 px-5 py-5 flex flex-col gap-5 max-w-lg mx-auto w-full">
        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : exceptions && exceptions.length > 0 ? (
          <div className="flex flex-col gap-2">
            <div className="font-mono text-[10.5px] tracking-wide text-brand">SUDAH ADA</div>
            {exceptions.map((ex) => (
              <div key={ex.id} className="flex items-center justify-between rounded-2xl hard-border bg-white px-3.5 py-3">
                <div>
                  <div className="text-[14px] font-bold">
                    {TYPES.find((t) => t.value === ex.type)?.label ?? ex.type}
                  </div>
                  <div className="font-mono text-[11px] text-muted">
                    {formatDateLabel(ex.startDate)} – {formatDateLabel(ex.endDate)}
                    {!ex.isAllDay && ex.startTime && ` · ${ex.startTime}–${ex.endTime}`}
                  </div>
                </div>
                <button onClick={() => handleDelete(ex.id)} className="text-sm font-semibold text-red-600">
                  Hapus
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <div className="flex flex-col gap-4">
          <div className="font-mono text-[10.5px] tracking-wide text-brand">TAMBAH BARU</div>

          <div>
            <div className="font-mono text-[10.5px] tracking-wide text-brand mb-2">TIPE</div>
            <div className="flex flex-wrap gap-2">
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setType(t.value)}
                  className={`rounded-full border-[3px] border-ink px-3.5 py-2 text-[13px] font-bold ${
                    type === t.value ? 'bg-purple text-white' : 'bg-white text-ink'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2.5">
            <div className="flex-1">
              <div className="font-mono text-[10.5px] tracking-wide text-brand mb-2">DARI</div>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="font-mono" />
            </div>
            <div className="flex-1">
              <div className="font-mono text-[10.5px] tracking-wide text-brand mb-2">SAMPAI</div>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="font-mono" />
            </div>
          </div>

          <label className="flex items-center justify-between rounded-2xl hard-border bg-white px-4 py-3.5">
            <span className="text-[15px] font-bold">Seharian penuh</span>
            <input type="checkbox" checked={isAllDay} onChange={(e) => setIsAllDay(e.target.checked)} className="h-5 w-5" />
          </label>

          {!isAllDay && (
            <div className="flex gap-2.5">
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="font-mono flex-1" />
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="font-mono flex-1" />
            </div>
          )}

          <div>
            <div className="font-mono text-[10.5px] tracking-wide text-brand mb-2">CATATAN (OPSIONAL)</div>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="contoh: rawat inap, balik Senin"
              className="h-20"
            />
          </div>

          {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
        </div>
      </div>

      <div className="flex gap-2.5 px-5 py-5 border-t-[3px] border-ink bg-white sticky bottom-0">
        <Button variant="secondary" className="flex-1" onClick={() => navigate('/jadwal')}>
          Selesai
        </Button>
        <Button variant="primary" className="flex-[2]" onClick={handleSubmit} disabled={submitting}>
          Simpan
        </Button>
      </div>
    </div>
  )
}
