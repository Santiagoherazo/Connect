'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { AppBanner } from '@/components/ui/AppBanner'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLocal, setIsLocal] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLocal === null) { setError('Indica si eres local o visitante'); return }
    setLoading(true)
    setError('')
    const supabase = createClient()

    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: displayName } },
    })

    if (err) { setError(err.message); setLoading(false); return }

    if (data.user) {
      await supabase.from('profiles')
        .update({ display_name: displayName, is_local: isLocal })
        .eq('id', data.user.id)
    }

    // Si la sesión ya está activa (email confirm desactivado) → ir al mapa
    // Si no → el usuario debe confirmar su email primero
    if (data.session) {
      router.push('/map')
    } else {
      setEmailSent(true)
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/callback` },
    })
  }

  if (emailSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-white flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="text-5xl mb-4">📬</div>
          <h2 className="text-xl font-bold text-zinc-900 mb-2">Revisa tu email</h2>
          <p className="text-sm text-zinc-500 mb-6">
            Te enviamos un link de confirmación a <span className="font-medium text-zinc-700">{email}</span>.
            Ábrelo y luego vuelve a iniciar sesión.
          </p>
          <a href="/login" className="text-teal-600 font-medium text-sm hover:underline">Ir al login →</a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-white flex items-center justify-center p-4">
      <AppBanner />
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">📍</div>
          <h1 className="text-3xl font-bold text-zinc-900">Parche</h1>
          <p className="text-sm text-zinc-500 mt-1">Conecta con personas que vibran igual</p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-zinc-100 p-6">
          <h2 className="text-lg font-semibold text-zinc-800 mb-5">Crear cuenta gratis</h2>

          <Button onClick={handleGoogle} variant="secondary" size="lg" className="w-full mb-4">
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuar con Google
          </Button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-100" /></div>
            <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-zinc-400">o con email</span></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input type="text" placeholder="Tu nombre" value={displayName}
              onChange={e => setDisplayName(e.target.value)} required
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            <input type="email" placeholder="Email" value={email}
              onChange={e => setEmail(e.target.value)} required
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            <input type="password" placeholder="Contraseña (mín. 6 caracteres)" value={password}
              onChange={e => setPassword(e.target.value)} required minLength={6}
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />

            <div>
              <p className="text-xs font-medium text-zinc-600 mb-2">¿Eres local o visitante en Medellín?</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: true, label: '🏠 Soy local', desc: 'Vivo en Medellín' },
                  { value: false, label: '✈️ Soy visitante', desc: 'Nómada / turista' },
                ].map(opt => (
                  <button key={String(opt.value)} type="button" onClick={() => setIsLocal(opt.value)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${isLocal === opt.value ? 'border-teal-500 bg-teal-50' : 'border-zinc-100 hover:border-zinc-200'}`}>
                    <div className="text-sm font-medium text-zinc-800">{opt.label}</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}
            <Button type="submit" loading={loading} size="lg" className="w-full">Crear mi cuenta</Button>
          </form>

          <p className="text-center text-xs text-zinc-400 mt-4">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-teal-600 font-medium hover:underline">Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
