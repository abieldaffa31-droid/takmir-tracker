import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth-context'
import { signOut } from '../../lib/auth-client'
import { initialsOf } from '../../lib/format'
import { Button, Skeleton } from '../../components/ui'

export default function ProfilSaya() {
  const { member, isLoading, role } = useAuth()
  const queryClient = useQueryClient()
  const [notice, setNotice] = useState('')

  async function handleMarkReviewed() {
    await api.post('/api/members/me/mark-reviewed')
    await queryClient.invalidateQueries({ queryKey: ['members', 'me'] })
    setNotice('Jadwal ditandai sudah ditinjau.')
  }

  if (isLoading || !member) {
    return (
      <div className="p-5">
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  return (
    <div className="p-5 pb-8 flex flex-col gap-5 max-w-lg mx-auto">
      <div className="flex items-center gap-3.5">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-[3px] border-ink bg-accent text-lg font-bold">
          {initialsOf(member.fullName)}
        </div>
        <div>
          <div className="text-2xl font-bold leading-tight">{member.fullName}</div>
          <div className="font-mono text-[11px] text-muted mt-1">
            {role} · {member.email}
          </div>
        </div>
      </div>

      <div className="rounded-2xl hard-border bg-white p-4 flex flex-col gap-1">
        <div className="text-sm font-bold">Status peninjauan jadwal</div>
        <p className="text-[13px] text-muted leading-relaxed">
          {member.lastReviewedAt
            ? `Terakhir ditinjau ${new Date(member.lastReviewedAt).toLocaleDateString('id-ID')}.`
            : 'Belum pernah ditinjau.'}
        </p>
        <Button variant="secondary" className="mt-2 self-start" onClick={handleMarkReviewed}>
          Tandai sudah ditinjau
        </Button>
      </div>

      {member.domicileZone && (
        <div className="rounded-2xl hard-border bg-white p-4">
          <div className="text-sm font-bold mb-1">Domisili</div>
          <p className="text-[13px] text-muted">{member.domicileZone.replace('_', ' ')}</p>
        </div>
      )}

      {notice && <p className="text-sm font-semibold text-brand">{notice}</p>}

      <Button variant="danger" onClick={() => signOut()}>
        Keluar
      </Button>
    </div>
  )
}
