import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '../../lib/api'
import { formatDateLabel } from '../../lib/format'
import { Button, Input, Sheet, Skeleton } from '../../components/ui'
import type { Period } from '../../hooks/useActivePeriod'

export default function Periode() {
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)

  const { data: periods, isLoading } = useQuery({
    queryKey: ['periods'],
    queryFn: () => api.get<Period[]>('/api/periods'),
  })

  async function handleActivate(id: string) {
    await api.post(`/api/periods/${id}/activate`)
    await queryClient.invalidateQueries({ queryKey: ['periods'] })
  }
  async function handleArchive(id: string) {
    await api.post(`/api/periods/${id}/archive`)
    await queryClient.invalidateQueries({ queryKey: ['periods'] })
  }

  const sorted = [...(periods ?? [])].sort((a, b) => (a.status === 'active' ? -1 : b.status === 'active' ? 1 : 0))

  return (
    <div className="p-5 pb-8 flex flex-col gap-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Periode</h1>
        <Button variant="accent" className="rounded-full !px-4 !py-2.5 text-[13px]" onClick={() => setCreateOpen(true)}>
          + Buat baru
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map((p) =>
            p.status === 'active' ? (
              <div key={p.id} className="rounded-2xl hard-border hard-shadow-lg bg-brand p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-[22px] font-bold text-white leading-tight">{p.name}</div>
                  <span className="rounded-full border-2 border-ink bg-accent px-2.5 py-1 text-[11px] font-bold rotate-2 shrink-0">
                    AKTIF
                  </span>
                </div>
                <div className="font-mono text-[11.5px] text-white/80 mt-2.5">
                  {formatDateLabel(p.startDate)} – {formatDateLabel(p.endDate)}
                </div>
                <button
                  onClick={() => handleArchive(p.id)}
                  className="mt-3.5 w-full rounded-xl hard-border bg-white py-3 text-[13px] font-bold"
                >
                  Arsipkan periode
                </button>
              </div>
            ) : (
              <div key={p.id} className="rounded-2xl hard-border bg-white p-4">
                <div className="flex items-center justify-between">
                  <div className="text-[17px] font-bold">{p.name}</div>
                  <span className="rounded-full border-2 border-line px-2.5 py-0.5 font-mono text-[10px] text-muted-2">
                    {p.status === 'draft' ? 'DRAF' : 'ARSIP'}
                  </span>
                </div>
                <div className="font-mono text-[11.5px] text-muted mt-1.5">
                  {formatDateLabel(p.startDate)} – {formatDateLabel(p.endDate)}
                </div>
                <button onClick={() => handleActivate(p.id)} className="mt-3 text-[13px] font-bold text-brand">
                  Aktifkan periode ini →
                </button>
              </div>
            ),
          )}
        </div>
      )}

      <CreatePeriodSheet open={createOpen} onClose={() => setCreateOpen(false)} periods={periods ?? []} />
    </div>
  )
}

function CreatePeriodSheet({ open, onClose, periods }: { open: boolean; onClose: () => void; periods: Period[] }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [copyFrom, setCopyFrom] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    setSubmitting(true)
    setError('')
    try {
      const body = { name, startDate, endDate }
      if (copyFrom) {
        await api.post(`/api/periods/${copyFrom}/rollover`, body)
      } else {
        await api.post('/api/periods', body)
      }
      await queryClient.invalidateQueries({ queryKey: ['periods'] })
      setName('')
      setStartDate('')
      setEndDate('')
      setCopyFrom('')
      onClose()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal membuat periode')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Buat periode baru">
      <div className="flex flex-col gap-3">
        <Input placeholder="Nama periode (contoh: Genap 2026/2027)" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="flex gap-2.5">
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="font-mono flex-1" />
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="font-mono flex-1" />
        </div>
        <div>
          <div className="font-mono text-[10.5px] text-muted mb-1.5">SALIN JADWAL DARI (OPSIONAL)</div>
          <select
            value={copyFrom}
            onChange={(e) => setCopyFrom(e.target.value)}
            className="w-full rounded-2xl hard-border bg-white px-4 py-3 text-sm"
          >
            <option value="">Mulai kosong</option>
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
        <Button variant="accent" onClick={handleSubmit} disabled={submitting || !name || !startDate || !endDate}>
          Buat periode
        </Button>
      </div>
    </Sheet>
  )
}
