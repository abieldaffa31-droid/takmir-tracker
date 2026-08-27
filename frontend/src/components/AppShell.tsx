import { useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'
import { signOut } from '../lib/auth-client'
import { coordinatorMore, coordinatorSidebar, coordinatorTabs, memberTabs, type NavItem } from '../lib/nav'
import { Sheet } from './ui'

function isActive(pathname: string, to: string) {
  if (to === '/grid') return pathname.startsWith('/grid')
  if (to === '/jadwal') return pathname === '/jadwal'
  return pathname.startsWith(to)
}

function BottomNavItem({ item, active, onClick }: { item: NavItem; active: boolean; onClick?: () => void }) {
  const content = (
    <div
      className={`flex-1 text-center pt-3.5 pb-5 text-xs font-semibold border-t-4 ${
        active ? 'text-ink border-accent' : 'text-muted-2 border-transparent'
      }`}
    >
      {item.label}
    </div>
  )
  if (onClick) {
    return (
      <button onClick={onClick} className="flex-1">
        {content}
      </button>
    )
  }
  return (
    <Link to={item.to} className="flex-1">
      {content}
    </Link>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const { isCoordinator, member } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [moreOpen, setMoreOpen] = useState(false)

  const tabs = isCoordinator ? coordinatorTabs : memberTabs

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-paper-deep">
      {/* Sidebar desktop */}
      {isCoordinator ? (
        <aside className="hidden lg:flex w-60 shrink-0 flex-col gap-1 bg-ink py-6">
          <div className="px-5 pb-6 text-2xl font-bold leading-[0.95] text-white">
            TAKMIR
            <br />
            TRACKER
          </div>
          {coordinatorSidebar.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`mx-3 rounded-xl px-3.5 py-3 text-sm font-semibold ${
                isActive(pathname, item.to) ? 'bg-accent text-ink' : 'text-white/65 hover:text-white'
              }`}
            >
              {item.label}
            </Link>
          ))}
          <div className="flex-1" />
          <button
            onClick={() => signOut()}
            className="mx-3 rounded-xl px-3.5 py-3 text-left font-mono text-xs text-white/40"
          >
            keluar
          </button>
        </aside>
      ) : (
        <aside className="hidden lg:flex w-60 shrink-0 flex-col gap-1 bg-ink py-6">
          <div className="px-5 pb-6 text-2xl font-bold leading-[0.95] text-white">
            TAKMIR
            <br />
            TRACKER
          </div>
          {memberTabs.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`mx-3 rounded-xl px-3.5 py-3 text-sm font-semibold ${
                isActive(pathname, item.to) ? 'bg-accent text-ink' : 'text-white/65 hover:text-white'
              }`}
            >
              {item.label}
            </Link>
          ))}
          <div className="flex-1" />
          <button
            onClick={() => signOut()}
            className="mx-3 rounded-xl px-3.5 py-3 text-left font-mono text-xs text-white/40"
          >
            keluar
          </button>
        </aside>
      )}

      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0">
        <main className="flex-1 min-w-0">{children}</main>
      </div>

      {/* Bottom nav mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 flex border-t-[3px] border-ink bg-white">
        {tabs.map((item) =>
          item.to === '#lainnya' ? (
            <BottomNavItem key={item.to} item={item} active={false} onClick={() => setMoreOpen(true)} />
          ) : (
            <BottomNavItem key={item.to} item={item} active={isActive(pathname, item.to)} />
          ),
        )}
      </nav>

      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="Lainnya">
        <div className="flex flex-col gap-2">
          {coordinatorMore.map((item) => (
            <button
              key={item.to}
              onClick={() => {
                setMoreOpen(false)
                navigate(item.to)
              }}
              className="rounded-2xl hard-border bg-white px-4 py-3.5 text-left font-semibold"
            >
              {item.label}
            </button>
          ))}
          <button
            onClick={() => signOut()}
            className="rounded-2xl hard-border bg-white px-4 py-3.5 text-left font-semibold text-red-600"
          >
            Keluar {member ? `(${member.nickname})` : ''}
          </button>
        </div>
      </Sheet>
    </div>
  )
}
