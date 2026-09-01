import { useState, type FormEvent } from 'react'
import { authClient } from '../../lib/auth-client'
import { Button, Input } from '../../components/ui'

export default function Login() {
  const [mode, setMode] = useState<'magic' | 'password'>('magic')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')

  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [pwStatus, setPwStatus] = useState<'idle' | 'sending' | 'error'>('idle')
  const [pwError, setPwError] = useState('')

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

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault()
    setPwStatus('sending')
    setPwError('')
    const { error: err } = await authClient.signIn.email({ email: adminEmail, password: adminPassword })
    if (err) {
      setPwStatus('error')
      setPwError(err.message ?? 'Email atau password salah')
      return
    }
    // Reload penuh (bukan navigate SPA) supaya AuthProvider mount ulang dan
    // fetch sesi dari nol — menghindari race sesaat setelah signIn.email
    // sukses, sebelum session store better-auth sempat ter-refresh, yang
    // bisa membuat RequireAuth mikir belum login dan mental balik ke /masuk.
    window.location.href = '/'
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

        {mode === 'magic' ? (
          <>
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
            <button
              type="button"
              onClick={() => setMode('password')}
              className="font-mono text-[11px] text-white/60 underline text-left"
            >
              masuk sebagai admin →
            </button>
          </>
        ) : (
          <>
            <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-2.5">
              <Input
                type="email"
                required
                placeholder="email admin"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
              />
              <Input
                type="password"
                required
                placeholder="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
              />
              <Button type="submit" variant="accent" className="py-4 text-base" disabled={pwStatus === 'sending'}>
                {pwStatus === 'sending' ? 'Masuk…' : 'Masuk →'}
              </Button>
              {pwStatus === 'error' && <p className="text-sm font-semibold text-accent">{pwError}</p>}
            </form>
            <button
              type="button"
              onClick={() => setMode('magic')}
              className="font-mono text-[11px] text-white/60 underline text-left"
            >
              ← masuk pakai email biasa
            </button>
          </>
        )}
      </div>
    </div>
  )
}
