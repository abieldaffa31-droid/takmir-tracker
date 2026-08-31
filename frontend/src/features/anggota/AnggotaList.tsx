import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '../../lib/api'
import { useActivePeriod } from '../../hooks/useActivePeriod'
import { useAuth } from '../../lib/auth-context'
import { initialsOf } from '../../lib/format'
import { Button, Input, Sheet, Skeleton } from '../../components/ui'
import type { MemberSummary } from '../../lib/api-types'

export default function AnggotaList() {
  const navigate = useNavigate()
  const { data: period } = useActivePeriod()
  const { role, member: self } = useAuth()
  const [search, setSearch] = useState('')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const queryClient = useQueryClient()

  const { data: members, isLoading } = useQuery({
    queryKey: ['members', period?.id],
    queryFn: () => api.get<MemberSummary[]>('/api/members', { periodId: period?.id }),
  })

  const filtered = members?.filter((m) => m.fullName.toLowerCase().includes(search.toLowerCase()))
  const belumNgisi = members?.filter((m) => m.scheduleCompletion && m.scheduleCompletion.activityCount === 0).length ?? 0

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function exitSelectMode() {
    setSelectMode(false)
    setSelectedIds(new Set())
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return
    const sure = window.confirm(
      `Hapus permanen ${selectedIds.size} anggota terpilih? Semua jadwal dan riwayatnya ikut terhapus. Tindakan ini tidak bisa dibatalkan.`,
    )
    if (!sure) return
    setDeleting(true)
    try {
      await api.post('/api/members/bulk-delete', { ids: [...selectedIds] })
      await queryClient.invalidateQueries({ queryKey: ['members'] })
      exitSelectMode()
    } catch (e) {
      window.alert(e instanceof ApiError ? e.message : 'Gagal menghapus anggota terpilih')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="p-5 pb-28 flex flex-col gap-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Anggota</h1>
          <p className="font-mono text-[11px] text-muted mt-1">
            {members?.length ?? 0} total · {belumNgisi} belum ngisi
          </p>
        </div>
        <div className="flex gap-2">
          {role === 'admin' && (
            <Button
              variant="secondary"
              className="rounded-full !px-4 !py-2.5 text-[13px]"
              onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
            >
              {selectMode ? 'Batal' : 'Pilih'}
            </Button>
          )}
          <Button variant="accent" className="rounded-full !px-4 !py-2.5 text-[13px]" onClick={() => setInviteOpen(true)}>
            + Undang
          </Button>
        </div>
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
          {filtered?.map((m) => {
            const isSelf = m.id === self?.id
            const checked = selectedIds.has(m.id)
            return (
              <button
                key={m.id}
                onClick={() => (selectMode ? (isSelf ? undefined : toggleSelected(m.id)) : navigate(`/anggota/${m.id}`))}
                disabled={selectMode && isSelf}
                className={`flex items-center gap-3 rounded-2xl hard-border bg-white px-3.5 py-2.5 text-left ${
                  checked ? 'ring-2 ring-brand' : ''
                } ${selectMode && isSelf ? 'opacity-40' : ''}`}
              >
                {selectMode && (
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-ink text-xs font-bold ${
                      checked ? 'bg-brand text-white' : 'bg-white'
                    }`}
                  >
                    {checked ? '✓' : ''}
                  </div>
                )}
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
                {!selectMode && (
                  <div
                    className={`rounded-full border-2 border-ink px-2.5 py-1 font-mono text-[10px] ${
                      m.scheduleCompletion?.activityCount ? 'bg-white' : 'bg-accent'
                    }`}
                  >
                    {m.scheduleCompletion?.activityCount ? 'terisi' : 'belum ngisi'}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}

      <InviteSheet open={inviteOpen} onClose={() => setInviteOpen(false)} />

      {selectMode && (
        <div className="fixed bottom-0 left-0 right-0 lg:left-60 z-30 flex items-center justify-between gap-3 border-t-[3px] border-ink bg-white px-5 py-4">
          <span className="text-sm font-semibold">{selectedIds.size} dipilih</span>
          <Button variant="danger" onClick={handleBulkDelete} disabled={selectedIds.size === 0 || deleting}>
            {deleting ? 'Menghapus…' : `Hapus permanen (${selectedIds.size})`}
          </Button>
        </div>
      )}
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
