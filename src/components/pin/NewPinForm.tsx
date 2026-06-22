'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PinCategory, CATEGORY_META, DURATION_OPTIONS } from '@/types'
import { Button } from '@/components/ui/Button'
import { useCreatePin } from '@/lib/hooks/usePins'
import { useMapStore } from '@/lib/stores'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import { useRouter } from 'next/navigation'

const schema = z.object({
  title: z.string().min(4, 'Mínimo 4 caracteres').max(60, 'Máximo 60 caracteres'),
  description: z.string().max(200).optional(),
  category: z.enum(['tech', 'arte', 'naturaleza', 'social', 'food', 'nuevos_comienzos'] as const),
  venue_name: z.string().max(80).optional(),
  max_members: z.number().min(2).max(12),
  duration: z.enum(['1h', '3h', 'today'] as const),
  meeting_point: z.string().max(120).optional(),
})

type FormData = z.infer<typeof schema>

interface NewPinFormProps {
  onClose: () => void
}

export function NewPinForm({ onClose }: NewPinFormProps) {
  const { newPinCoords } = useMapStore()
  const createPin = useCreatePin()
  const router = useRouter()

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      category: 'social',
      max_members: 6,
      duration: '3h',
    },
  })

  const selectedCategory = watch('category')

  const onSubmit = async (data: FormData) => {
    if (!newPinCoords) return

    try {
      const pin = await createPin.mutateAsync({
        ...data,
        lat: newPinCoords[1],
        lng: newPinCoords[0],
      })
      onClose()
      router.push(`/pin/${pin.id}`)
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-100">
          <h2 className="text-lg font-semibold text-zinc-900">Crear parche</h2>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-zinc-100 transition-colors">
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-5">

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">¿De qué va el parche?</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(CATEGORY_META) as [PinCategory, typeof CATEGORY_META[PinCategory]][]).map(([key, meta]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setValue('category', key)}
                  className={cn(
                    'flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 text-xs font-medium transition-all',
                    selectedCategory === key
                      ? 'border-transparent'
                      : 'border-zinc-100 bg-zinc-50 text-zinc-500 hover:border-zinc-200'
                  )}
                  style={selectedCategory === key
                    ? { backgroundColor: meta.bg, borderColor: meta.color, color: meta.color }
                    : {}}
                >
                  <span className="text-xl">{meta.emoji}</span>
                  <span className="leading-tight text-center">{meta.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">
              Título del parche <span className="text-red-400">*</span>
            </label>
            <input
              {...register('title')}
              placeholder="ej. Café y charla sobre startups"
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">Descripción (opcional)</label>
            <textarea
              {...register('description')}
              placeholder="¿De qué se va a tratar? ¿Qué esperas del grupo?"
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Venue */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">¿Dónde? (opcional)</label>
            <input
              {...register('venue_name')}
              placeholder="ej. Pergamino Laureles, Parque El Poblado..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>

          {/* Max members + Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                Máx. personas
              </label>
              <select
                {...register('max_members', { valueAsNumber: true })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              >
                {[2, 3, 4, 5, 6, 8, 10, 12].map(n => (
                  <option key={n} value={n}>{n} personas</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                Duración
              </label>
              <select
                {...register('duration')}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              >
                {DURATION_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Meeting point */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">
              Punto de encuentro (opcional)
            </label>
            <input
              {...register('meeting_point')}
              placeholder="ej. Entrada principal, mesa del fondo..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>

          <Button
            type="submit"
            size="lg"
            loading={createPin.isPending}
            className="w-full"
          >
            {createPin.isPending ? 'Creando parche...' : '📍 Publicar parche'}
          </Button>

          {createPin.isError && (
            <p className="text-xs text-red-500 text-center">
              Error al crear el parche. Intenta de nuevo.
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
