'use client'

import { use, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/types'
import { Avatar } from '@/components/ui/Avatar'
import { FriendButton } from '@/components/friends/FriendButton'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface PageProps { params: Promise<{ id: string }> }

export default function PublicProfilePage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [myUserId, setMyUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const [{ data: authData }, { data: profileData }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('profiles').select('*').eq('id', id).single(),
      ])
      setMyUserId(authData.user?.id ?? null)
      setProfile(profileData as Profile)
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-3">
        <p className="text-2xl">😕</p>
        <p className="text-sm text-zinc-500">Perfil no encontrado</p>
        <button onClick={() => router.back()} className="text-teal-600 text-sm font-medium">Volver</button>
      </div>
    )
  }

  const isOwnProfile = myUserId === profile.id

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="bg-white border-b border-zinc-100 sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-zinc-100">
            <ArrowLeft className="w-5 h-5 text-zinc-600" />
          </button>
          <h1 className="text-base font-semibold text-zinc-900 flex-1">Perfil</h1>
        </div>
      </div>

      <div className="p-4 max-w-md mx-auto space-y-4">
        {/* Card principal */}
        <div className="bg-white rounded-2xl p-5 flex flex-col items-center text-center">
          <Avatar profile={profile} size="lg" showLocalBadge className="mb-3" />
          <h2 className="text-xl font-bold text-zinc-900">{profile.display_name}</h2>
          <span className={`mt-1 text-xs font-medium px-2.5 py-1 rounded-full ${
            profile.is_local ? 'bg-teal-100 text-teal-700' : 'bg-orange-100 text-orange-700'
          }`}>
            {profile.is_local ? '🏠 Local de Medellín' : `✈️ ${profile.home_country ?? 'Visitante'}`}
          </span>

          {profile.bio && (
            <p className="text-sm text-zinc-500 mt-3">{profile.bio}</p>
          )}

          {/* Friend action */}
          {!isOwnProfile && myUserId && (
            <div className="mt-4">
              <FriendButton otherUserId={profile.id} myUserId={myUserId} />
            </div>
          )}
          {isOwnProfile && (
            <button
              onClick={() => router.push('/profile')}
              className="mt-4 text-sm text-teal-600 font-medium hover:underline"
            >
              Editar mi perfil
            </button>
          )}
        </div>

        {/* Idiomas */}
        {profile.languages?.length > 0 && (
          <div className="bg-white rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-zinc-800 mb-3">Idiomas</h3>
            <div className="flex flex-wrap gap-2">
              {profile.languages.map(lang => (
                <span key={lang} className="text-xs px-3 py-1.5 rounded-full bg-teal-100 text-teal-700 font-medium">
                  {lang}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Intereses */}
        {profile.interests?.length > 0 && (
          <div className="bg-white rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-zinc-800 mb-3">Intereses</h3>
            <div className="flex flex-wrap gap-2">
              {profile.interests.map(item => (
                <span key={item} className="text-xs px-3 py-1.5 rounded-full bg-zinc-100 text-zinc-700 font-medium">
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
