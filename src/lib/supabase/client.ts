import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    // En producción logear el error sin crashear
    console.error(
      '[Parche] Faltan variables de entorno de Supabase.\n' +
      'Agrega NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en Vercel → Settings → Environment Variables'
    )
    // Retornar cliente con placeholder para evitar crash en build
    return createBrowserClient(
      url ?? 'https://placeholder.supabase.co',
      key ?? 'placeholder-key-not-valid'
    )
  }

  return createBrowserClient(url, key)
}
