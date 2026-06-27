// Supabase Edge Function: expire-pins
// Se ejecuta cada minuto via pg_cron o Supabase scheduled functions
// Marca como 'expired' todos los pines cuyo expires_at ya pasó

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (_req) => {
  try {
    // Expirar pines vencidos
    const { data, error } = await supabase
      .from('pins')
      .update({ status: 'expired' })
      .in('status', ['active', 'full'])
      .lt('expires_at', new Date().toISOString())
      .select('id, title')

    if (error) throw error

    const count = data?.length ?? 0
    console.log(`Expired ${count} pins`)

    return new Response(
      JSON.stringify({ expired: count, pins: data?.map(p => p.id) }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Error expiring pins:', err)
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
