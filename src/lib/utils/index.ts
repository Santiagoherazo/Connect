import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow, differenceInMinutes, differenceInHours } from 'date-fns'
import { es } from 'date-fns/locale'

// ─── Tailwind class merger ─────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Time helpers ──────────────────────────────────────────────────

/** Returns human-readable countdown like "2h 15m" or "43m" */
export function getCountdown(expiresAt: string): string {
  const now = new Date()
  const expires = new Date(expiresAt)
  const totalMinutes = differenceInMinutes(expires, now)

  if (totalMinutes <= 0) return 'Expirado'
  if (totalMinutes < 60) return `${totalMinutes}m`

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
}

/** Returns urgency level based on time left */
export function getUrgencyLevel(expiresAt: string): 'critical' | 'warning' | 'normal' {
  const minutes = differenceInMinutes(new Date(expiresAt), new Date())
  if (minutes <= 15) return 'critical'
  if (minutes <= 45) return 'warning'
  return 'normal'
}

/** Relative time like "hace 5 min" */
export function timeAgo(date: string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: es })
}

/** Calculate expiry date from duration option */
export function getExpiryDate(duration: '1h' | '3h' | 'today'): Date {
  const now = new Date()
  if (duration === '1h') return new Date(now.getTime() + 1 * 60 * 60 * 1000)
  if (duration === '3h') return new Date(now.getTime() + 3 * 60 * 60 * 1000)
  // 'today' → end of day
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)
  return end
}

// ─── String helpers ────────────────────────────────────────────────

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function truncate(str: string, length: number): string {
  return str.length > length ? str.slice(0, length) + '…' : str
}

// ─── Geo helpers ───────────────────────────────────────────────────

/** Distance in km between two coordinates */
export function getDistanceKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`
  return `${km.toFixed(1)}km`
}

// Medellín center coordinates
export const MEDELLIN_CENTER: [number, number] = [-75.5636, 6.2442]
