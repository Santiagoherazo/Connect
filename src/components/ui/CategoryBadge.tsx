import { cn } from '@/lib/utils'
import { PinCategory, CATEGORY_META } from '@/types'

interface CategoryBadgeProps {
  category: PinCategory
  size?: 'sm' | 'md'
  className?: string
}

export function CategoryBadge({ category, size = 'md', className }: CategoryBadgeProps) {
  const meta = CATEGORY_META[category]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1',
        className
      )}
      style={{ backgroundColor: meta.bg, color: meta.color }}
    >
      <span>{meta.emoji}</span>
      <span>{meta.label}</span>
    </span>
  )
}

// Filter pills row — used on map
interface CategoryFilterProps {
  selected: PinCategory | null
  onChange: (cat: PinCategory | null) => void
}

export function CategoryFilter({ selected, onChange }: CategoryFilterProps) {
  const categories = Object.entries(CATEGORY_META) as [PinCategory, typeof CATEGORY_META[PinCategory]][]

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
      <button
        onClick={() => onChange(null)}
        className={cn(
          'flex-shrink-0 rounded-full text-xs font-medium px-3 py-1.5 border transition-all',
          !selected
            ? 'bg-zinc-800 text-white border-zinc-800'
            : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'
        )}
      >
        Todos
      </button>
      {categories.map(([key, meta]) => (
        <button
          key={key}
          onClick={() => onChange(selected === key ? null : key)}
          className={cn(
            'flex-shrink-0 flex items-center gap-1 rounded-full text-xs font-medium px-3 py-1.5 border transition-all',
            selected === key
              ? 'text-white border-transparent'
              : 'bg-white border-zinc-200 hover:border-zinc-400'
          )}
          style={selected === key ? { backgroundColor: meta.color, borderColor: meta.color } : { color: meta.color }}
        >
          <span>{meta.emoji}</span>
          <span>{meta.label}</span>
        </button>
      ))}
    </div>
  )
}
