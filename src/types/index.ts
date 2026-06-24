// ─────────────────────────────────────────────────────────────────
// Parche App — Global Types
// ─────────────────────────────────────────────────────────────────

export type PinCategory =
  | 'tech'
  | 'arte'
  | 'naturaleza'
  | 'social'
  | 'food'
  | 'nuevos_comienzos'

export type PinStatus = 'active' | 'full' | 'expired' | 'cancelled'
export type PinDuration = '1h' | '3h' | 'today'
export type FriendshipStatus = 'pending' | 'accepted' | 'blocked'

export interface Profile {
  id: string
  username: string | null
  display_name: string
  avatar_url: string | null
  bio: string | null
  languages: string[]
  interests: string[]
  mood_tags: string[]
  is_local: boolean
  home_country: string | null
  verified: boolean
  pro_until: string | null
  created_at: string
  // Ubicación en tiempo real
  lat: number | null
  lng: number | null
  last_seen_at: string | null
  location_sharing: boolean
}

export interface Pin {
  id: string
  creator_id: string
  title: string
  description: string | null
  category: PinCategory
  lat: number
  lng: number
  venue_id: string | null
  venue_name: string | null
  max_members: number
  expires_at: string
  status: PinStatus
  meeting_point: string | null
  created_at: string
  // Joined
  creator?: Profile
  member_count?: number
  members?: PinMember[]
  is_member?: boolean
}

export interface PinMember {
  pin_id: string
  user_id: string
  joined_at: string
  status: 'active' | 'left'
  confirmed_attendance: boolean
  profile?: Profile
}

export interface Message {
  id: string
  pin_id: string
  sender_id: string
  content: string
  type: 'text' | 'system' | 'icebreaker'
  created_at: string
  sender?: Profile
}

export interface Friendship {
  id: string
  requester_id: string
  addressee_id: string
  status: FriendshipStatus
  created_at: string
  updated_at: string
  // Joined
  requester?: Profile
  addressee?: Profile
}

export interface PinInvite {
  id: string
  pin_id: string
  inviter_id: string
  invitee_id: string
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
  // Joined
  pin?: Pin
  inviter?: Profile
}

export interface Venue {
  id: string
  name: string
  category: string
  lat: number
  lng: number
  address: string | null
  discount_pct: number
  partner_tier: 'basic' | 'premium'
  active: boolean
}

// ─── UI helpers ───────────────────────────────────────────────────

export const CATEGORY_META: Record<
  PinCategory,
  { label: string; emoji: string; color: string; bg: string }
> = {
  tech:             { label: 'Tech & Networking', emoji: '💻', color: '#1D9E75', bg: '#E1F5EE' },
  arte:             { label: 'Arte & Cultura',    emoji: '🎨', color: '#534AB7', bg: '#EEEDFE' },
  naturaleza:       { label: 'Naturaleza',        emoji: '🌿', color: '#639922', bg: '#EAF3DE' },
  social:           { label: 'Social',            emoji: '🎉', color: '#EF9F27', bg: '#FAEEDA' },
  food:             { label: 'Food & Coffee',     emoji: '☕', color: '#D85A30', bg: '#FAECE7' },
  nuevos_comienzos: { label: 'Nuevos Comienzos',  emoji: '🌱', color: '#378ADD', bg: '#E6F1FB' },
}

export const DURATION_OPTIONS: { value: PinDuration; label: string; hours: number }[] = [
  { value: '1h',    label: '1 hora',    hours: 1  },
  { value: '3h',    label: '3 horas',   hours: 3  },
  { value: 'today', label: 'Hasta hoy', hours: 12 },
]

