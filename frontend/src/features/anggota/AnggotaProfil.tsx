import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '../../lib/api'
import { useActivePeriod } from '../../hooks/useActivePeriod'
import { initialsOf } from '../../lib/format'
import { Button, Skeleton, ErrorState } from '../../components/ui'
import { IndividualGrid } from '../grid/IndividualGrid'
import { useMemberGrid } from '../../hooks/useMemberGrid'
import type { MemberSummary } from '../../lib/api-types'

export default function AnggotaProfil() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: period } = useActivePeriod()
  const [notice, setNotice] = useState('')

  const { data: member, isLoading } = useQuery({
    queryKey: ['members', id],
    queryFn: () => api.get<MemberSummary>(`/api/members/${id}`),
    enabled: !!id,
  })
  const { data: grid } = useMemberGrid(id, period?.id)

  async function handleResendInvite() {
    try {
      await api.post(`/api/members/${id}/resend-invite`)
      setNotice('Undangan dikirim ulang.')
    } catch (e) {
      setNotice(e instanceof ApiError ? e.message : 'Gagal mengirim ulang undangan')
    }
  }

  async function handleToggleActive() {
    if (!member) return
    await api.post(`/api/members/${id}/${member.isActive ? 'deactivate' : 'reactivate'}`)
    await queryClient.invalidateQueries({ queryKey: ['members'] })
  }

  if (isLoading || !member) {
    return (
      <div className="p-5 flex flex-col gap-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  const freeBlocks = grid?.cells.filter((c) => c.status === 'implicit_free' || c.status === 'preferred_free').length ?? 0

  return (
    <div className="flex flex-col min-h-screen">
      <div className="bg-brand border-b-[3px] border-ink px-5 pt-4 pb-5">
        <button onClick={() => navigate('/anggota')} className="font-mono text-[11px] text-white/70">
          ← anggota
        </button>
        <div className="flex items-center gap-3.5 mt-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-[3px] border-ink bg-accent text-lg font-bold">
            {initialsOf(member.fullName)}
          </div>
          <div>
            <div className="text-2xl font-bold text-white leading-tight">{member.fullName}</div>
            <div className="font-mono text-[11px] text-white/75 mt-1">
              {member.isActive ? 'anggota' : 'nonaktif'} · {member.email ?? '—'}
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-3.5 flex-wrap">
          <span className="rounded-full border-2 border-ink bg-white px-2.5 py-1 text-[11px] font-bold">
            {member.division ?? 'tanpa divisi'}
          </span>
          <span className="rounded-full border-2 border-ink bg-accent px-2.5 py-1 text-[11px] font-bold">
            {freeBlocks} blok luang
          </span>
        </div>
      </div>

      <div className="px-5 py-5 flex flex-col gap-4 max-w-lg mx-auto w-full flex-1">
        {period ? (
          <IndividualGrid period={period} memberId={member.id} />
        ) : (
          <ErrorState message="Belum ada periode aktif." />
        )}
        {notice && <p className="text-sm font-semibold text-brand">{notice}</p>}
      </div>

      <div className="flex gap-2.5 px-5 py-5 border-t-[3px] border-ink bg-white sticky bottom-0">
        <Button variant="secondary" className="flex-1" onClick={handleResendInvite}>
          Kirim pengingat
        </Button>
        <Button variant={member.isActive ? 'danger' : 'primary'} className="flex-1" onClick={handleToggleActive}>
          {member.isActive ? 'Nonaktifkan' : 'Aktifkan'}
        </Button>
      </div>
    </div>
  )
}
