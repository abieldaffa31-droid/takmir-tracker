import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '../../lib/api'
import { useActivePeriod } from '../../hooks/useActivePeriod'
import { initialsOf } from '../../lib/format'
import { Button, Input, Sheet, Skeleton } from '../../components/ui'
import type { MemberSummary } from '../../lib/api-types'

export default function AnggotaList() {
  const navigate = useNavigate()
  const { data: period } = useActivePeriod()
  const [search, setSearch] = useState('')
  const [inviteOpen, setInviteOpen] = useState(false)

  const { data: members, isLoading } = useQuery({
    queryKey: ['members', period?.id],
    queryFn: () => api.get<MemberSummary[]>('/api/members', { periodId: period?.id }),
  })

  const filtered = members?.filter((m) => m.fullName.toLowerCase().includes(search.toLowerCase()))
  const belumNgisi = members?.filter((m) => m.scheduleCompletion && m.scheduleCompletion.activityCount === 0).length ?? 0

  return (
    <div className="p-5 pb-8 flex flex-col gap-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Anggota</h1>
          <p className="font-mono text-[11px] text-muted mt-1">
            {members?.length ?? 0} total · {belumNgisi} belum ngisi
          </p>
        </div>
        <Button variant="accent" className="rounded-full !px-4 !py-2.5 text-[13px]" onClick={() => setInviteOpen(true)}>
          + Undang
        </Button>
      </div>

      <Input placeholder="cari nama…" value={search} onChange={(e) => setSearch(e.target.value)} className="rounded-full" />

      {isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered?.map((m) => (
            <button
              key={m.id}
              onClick={() => navigate(`/anggota/${m.id}`)}
              className="flex items-center gap-3 rounded-2xl hard-border bg-white px-3.5 py-2.5 text-left"
            >
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-ink text-[13px] font-bold"
                style={{ background: m.scheduleCompletion?.activityCount ? '#DDE2FF' : '#FFF04A' }}
              >
                {initialsOf(m.fullName)}
              </div>
              <div className="flex-1">
                <div className="text-[15px] font-bold">{m.fullName}</div>
                <div className="font-mono text-[10.5px] text-muted">{m.isActive ? 'anggota' : 'nonaktif'}</div>
              </div>
              <div
                className={`rounded-full border-2 border-ink px-2.5 py-1 font-mono text-[10px] ${
                  m.scheduleCompletion?.activityCount ? 'bg-white' : 'bg-accent'
                }`}
              >
                {m.scheduleCompletion?.activityCount ? 'terisi' : 'belum ngisi'}
              </div>
            </button>
          ))}
        </div>
      )}

      <InviteSheet open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  )
}

function InviteSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [fullName, setFullName] = useState('')
  const [nickname, setNickname] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    setSubmitting(true)
    setError('')
    try {
      await api.post('/api/members', { fullName, nickname: nickname || fullName.split(' ')[0], email })
      await queryClient.invalidateQueries({ queryKey: ['members'] })
      setFullName('')
      setNickname('')
      setEmail('')
      onClose()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal mengundang anggota')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Undang anggota baru">
      <div className="flex flex-col gap-3">
        <Input placeholder="Nama lengkap" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <Input placeholder="Nama panggilan (opsional)" value={nickname} onChange={(e) => setNickname(e.target.value)} />
        <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
        <Button variant="accent" onClick={handleSubmit} disabled={submitting || !fullName || !email}>
          Kirim undangan
        </Button>
      </div>
    </Sheet>
  )
}
