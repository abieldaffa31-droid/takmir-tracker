import { useState, type FormEvent } from 'react'
import { authClient } from '../../lib/auth-client'
import { Button, Input } from '../../components/ui'

export default function Login() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setStatus('sending')
    setError('')
    const { error: err } = await authClient.signIn.magicLink({
      email,
      callbackURL: `${window.location.origin}/`,
    })
    if (err) {
      setStatus('error')
      setError(err.message ?? 'Gagal mengirim tautan masuk')
      return
    }
    setStatus('sent')
  }

  return (
    <div className="min-h-screen flex flex-col justify-center bg-brand px-6 py-10">
      <div className="mx-auto w-full max-w-sm flex flex-col gap-6">
        <div className="text-[46px] font-bold leading-[0.92] tracking-tight text-white">
          JAGA
          <br />
          MASJID
          <br />
          <span className="text-accent">BARENG.</span>
        </div>
        <p className="text-[15px] leading-relaxed text-white/75">
          Isi jadwalmu sekali, memudahkan keberadaanmu.
        </p>

        {status === 'sent' ? (
          <div className="rounded-2xl hard-border bg-accent p-4 text-sm font-semibold text-ink">
            Tautan masuk terkirim ke {email}. Buka tautannya untuk lanjut.
            {import.meta.env.DEV && (
              <p className="mt-2 font-normal font-mono text-xs">
                Mode pengembangan: email belum tersambung ke provider asli — tautan dicetak di console server
                backend.
              </p>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
            <Input
              type="email"
              required
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button type="submit" variant="accent" className="py-4 text-base" disabled={status === 'sending'}>
              {status === 'sending' ? 'Mengirim…' : 'Kirim tautan masuk →'}
            </Button>
            {status === 'error' && <p className="text-sm font-semibold text-accent">{error}</p>}
          </form>
        )}

        <p className="font-mono text-[11px] text-white/60">tanpa password. tanpa ribet.</p>
      </div>
    </div>
  )
}
