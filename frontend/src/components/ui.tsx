import { type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger'

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-white hard-border hard-shadow',
  accent: 'bg-accent text-ink hard-border hard-shadow',
  secondary: 'bg-surface text-ink hard-border',
  ghost: 'bg-transparent text-ink border-2 border-transparent hover:border-line',
  danger: 'bg-white text-red-600 hard-border',
}

export function Button({
  variant = 'primary',
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={`rounded-2xl px-4 py-3 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-transform active:scale-[0.98] ${buttonVariants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full box-border rounded-2xl hard-border bg-white px-4 py-3.5 text-[15px] text-ink placeholder:text-muted-2 focus:outline-none focus:ring-2 focus:ring-brand ${className}`}
      {...props}
    />
  )
}

export function Textarea({ className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`w-full box-border rounded-2xl hard-border bg-white px-4 py-3.5 text-[14px] text-ink placeholder:text-muted-2 focus:outline-none focus:ring-2 focus:ring-brand resize-none ${className}`}
      {...props}
    />
  )
}

export function Pill({
  children,
  tone = 'default',
  active = false,
  className = '',
}: {
  children: ReactNode
  tone?: 'default' | 'accent' | 'brand' | 'warn'
  active?: boolean
  className?: string
}) {
  const tones: Record<string, string> = {
    default: 'bg-white text-ink',
    accent: 'bg-accent text-ink',
    brand: 'bg-brand text-white',
    warn: 'bg-accent text-ink',
  }
  return (
    <span
      className={`inline-flex items-center rounded-full border-2 border-ink px-2.5 py-1 text-[11px] font-mono font-bold ${
        active ? tones.brand : tones[tone]
      } ${className}`}
    >
      {children}
    </span>
  )
}

export function Badge({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border-2 border-ink bg-white px-2.5 py-1 text-[10.5px] font-mono text-ink ${className}`}
    >
      {children}
    </span>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl hard-border bg-white ${className}`}>{children}</div>
}

export function EmptyState({
  title,
  action,
}: {
  title: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-line p-6 text-center">
      <div className="text-sm text-muted leading-relaxed">{title}</div>
      {action}
    </div>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-tint-1/60 ${className}`} />
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl hard-border bg-accent/40 p-6 text-center">
      <div className="text-sm font-semibold text-ink">{message}</div>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Coba lagi
        </Button>
      )}
    </div>
  )
}

export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-2xl hard-border hard-shadow bg-ink px-5 py-3 text-sm font-semibold text-white">
      <button onClick={onClose} className="mr-2 opacity-60">
        ✕
      </button>
      {message}
    </div>
  )
}

export function Sheet({
  open,
  onClose,
  children,
  title,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
  title?: string
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 sm:items-center" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl hard-border bg-paper max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden">
          <div className="h-1.5 w-11 rounded-full bg-ink" />
        </div>
        {title && (
          <div className="flex items-center justify-between px-5 pt-2 pb-3">
            <h2 className="text-lg font-bold">{title}</h2>
            <button onClick={onClose} className="text-xl leading-none">
              ✕
            </button>
          </div>
        )}
        <div className="px-5 pb-6">{children}</div>
      </div>
    </div>
  )
}
