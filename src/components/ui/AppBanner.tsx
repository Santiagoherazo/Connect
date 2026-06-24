'use client'

import { useState, useEffect } from 'react'

const APK_URL = 'https://github.com/Santiagoherazo/Connect/releases/latest/download/app-debug.apk'

export function AppBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const isAndroid = /android/i.test(navigator.userAgent)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    const dismissed = sessionStorage.getItem('app-banner-dismissed')
    if (isAndroid && !isStandalone && !dismissed) setVisible(true)
  }, [])

  if (!visible) return null

  const dismiss = () => {
    sessionStorage.setItem('app-banner-dismissed', '1')
    setVisible(false)
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 animate-in slide-in-from-bottom duration-300">
      <div className="bg-zinc-900 rounded-2xl p-4 flex items-center gap-3 shadow-xl max-w-sm mx-auto">
        <div className="text-3xl flex-shrink-0">📍</div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold leading-tight">¡Descarga Parche!</p>
          <p className="text-zinc-400 text-xs mt-0.5">Mejor experiencia en la app nativa</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <a
            href={APK_URL}
            className="bg-teal-500 hover:bg-teal-400 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
          >
            Descargar
          </a>
          <button
            onClick={dismiss}
            className="text-zinc-500 hover:text-zinc-300 text-lg leading-none px-1"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  )
}
