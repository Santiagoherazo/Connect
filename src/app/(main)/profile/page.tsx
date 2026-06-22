'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/types'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { ArrowLeft, LogOut, Edit3, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'

const INTERESTS = [
  'Startups', 'Tecnología', 'Diseño', 'Arte', 'Música', 'Fotografía',
  'Senderismo', 'Café', 'Gastronomía', 'Idiomas', 'Yoga', 'Viajes',
  'IA / ML', 'Cripto', 'Literatura', 'Cine', 'Gaming', 'Podcast',
]

const LANGUAGES = ['Español', 'English', 'Français', 'Português', 'Deutsch']

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [bio, setBio] = useState('')
  const [interests, setInterests] = useState<string[]>([])
  const [languages, setLanguages] = useState<string[]>([])
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        setProfile(data as Profile)
        setBio(data.bio ?? '')
        setInterests(data.interests ?? [])
        setLanguages(data.languages ?? [])
      }
    }
    load()
  }, [])

  const handleSave = async () => {
    if (!profile) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('profiles').update({ bio, interests, languages }).eq('id', profile.id)
    setProfile(p => p ? { ...p, bio, interests, languages } : null)
    setEditing(false)
    setSaving(false)
  }

  const handleLogout = async () => {
    await createClient().auth.signOut()
    router.push('/login')
  }

  const toggle = (arr: string[], setArr: (v: string[]) => void, item: string) => {
    setArr(arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item])
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="bg-white border-b border-zinc-100 sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-zinc-100">
            <ArrowLeft className="w-5 h-5 text-zinc-600" />
          </button>
          <h1 className="text-base font-semibold">Mi perfil</h1>
          <button onClick={editing ? handleSave : () => setEditing(true)} className="p-2 rounded-xl hover:bg-zinc-100">
            {editing ? <Check className="w-5 h-5 text-teal-600" /> : <Edit3 className="w-5 h-5 text-zinc-500" />}
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-md mx-auto pb-10">
        {/* Avatar */}
        <div className="bg-white rounded-2xl p-5 flex flex-col items-center text-center">
          <Avatar profile={profile} size="lg" showLocalBadge className="mb-3" />
          <h2 className="text-xl font-bold text-zinc-900">{profile.display_name}</h2>
          <span className={`mt-1 text-xs font-medium px-2.5 py-1 rounded-full ${profile.is_local ? 'bg-teal-100 text-teal-700' : 'bg-orange-100 text-orange-700'}`}>
            {profile.is_local ? '🏠 Local de Medellín' : '✈️ Visitante'}
          </span>
          {editing ? (
            <textarea value={bio} onChange={e => setBio(e.target.value)}
              placeholder="Cuéntanos quién eres..." maxLength={200} rows={3}
              className="mt-3 w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none text-center" />
          ) : (
            <p className="text-sm text-zinc-500 mt-2">{profile.bio || 'Sin bio todavía'}</p>
          )}
        </div>

        {/* Languages */}
        <div className="bg-white rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-zinc-800 mb-3">Idiomas</h3>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map(lang => (
              <button key={lang} onClick={() => editing && toggle(languages, setLanguages, lang)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${languages.includes(lang) ? 'bg-teal-600 text-white' : 'bg-zinc-100 text-zinc-500'} ${!editing && !languages.includes(lang) ? 'opacity-40' : ''}`}>
                {lang}
              </button>
            ))}
          </div>
        </div>

        {/* Interests */}
        <div className="bg-white rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-zinc-800 mb-3">Intereses</h3>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map(item => (
              <button key={item} onClick={() => editing && toggle(interests, setInterests, item)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${interests.includes(item) ? 'bg-zinc-800 text-white' : 'bg-zinc-100 text-zinc-500'} ${!editing && !interests.includes(item) ? 'opacity-40' : ''}`}>
                {item}
              </button>
            ))}
          </div>
          {editing && <p className="text-xs text-zinc-400 mt-2">Tus intereses mejoran los icebreakers de IA</p>}
        </div>

        {editing ? (
          <Button onClick={handleSave} loading={saving} size="lg" className="w-full">Guardar cambios</Button>
        ) : (
          <Button onClick={handleLogout} variant="ghost" size="md" className="w-full text-zinc-500">
            <LogOut className="w-4 h-4" /> Cerrar sesión
          </Button>
        )}
      </div>
    </div>
  )
}
