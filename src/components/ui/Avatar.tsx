import { cn, getInitials } from '@/lib/utils'
import { Profile } from '@/types'

interface AvatarProps {
  profile: Pick<Profile, 'display_name' | 'avatar_url' | 'is_local'>
  size?: 'xs' | 'sm' | 'md' | 'lg'
  showLocalBadge?: boolean
  className?: string
}

const sizeMap = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-lg',
}

export function Avatar({ profile, size = 'md', showLocalBadge, className }: AvatarProps) {
  return (
    <div className={cn('relative flex-shrink-0', className)}>
      <div className={cn(
        'rounded-full overflow-hidden bg-teal-100 flex items-center justify-center font-semibold text-teal-700',
        sizeMap[size]
      )}>
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.display_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span>{getInitials(profile.display_name)}</span>
        )}
      </div>
      {showLocalBadge && (
        <span className={cn(
          'absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-white text-[10px] leading-none',
          profile.is_local ? 'bg-teal-500' : 'bg-orange-400',
          size === 'xs' ? 'w-2 h-2' : 'w-3 h-3'
        )} title={profile.is_local ? 'Local' : 'Visitante'} />
      )}
    </div>
  )
}
