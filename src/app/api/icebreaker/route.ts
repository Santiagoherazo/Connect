import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/server'

// Rate limiting por pin en memoria (10 min entre generaciones)
const cooldownMap = new Map<string, number>()
const COOLDOWN_MS = 10 * 60 * 1000

export async function POST(req: NextRequest) {
  try {
    const { pinId } = await req.json()
    if (!pinId) return NextResponse.json({ error: 'pinId requerido' }, { status: 400 })

    const supabase = await createClient()

    // Auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // Verificar membresía
    const { data: membership } = await supabase
      .from('pin_members')
      .select('pin_id')
      .eq('pin_id', pinId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!membership) return NextResponse.json({ error: 'No eres miembro' }, { status: 403 })

    // Rate limit por pin
    const lastGen = cooldownMap.get(pinId)
    if (lastGen && Date.now() - lastGen < COOLDOWN_MS) {
      const mins = Math.ceil((COOLDOWN_MS - (Date.now() - lastGen)) / 60000)
      return NextResponse.json(
        { error: `Espera ${mins} minuto${mins !== 1 ? 's' : ''} para generar otro` },
        { status: 429 }
      )
    }

    // Retornar cacheado si es reciente
    const { data: cached } = await supabase
      .from('icebreakers')
      .select('content, generated_at')
      .eq('pin_id', pinId)
      .single()

    if (cached) {
      const age = Date.now() - new Date(cached.generated_at).getTime()
      if (age < COOLDOWN_MS) {
        return NextResponse.json({ content: cached.content, cached: true })
      }
    }

    // Obtener pin + miembros
    const { data: pin } = await supabase
      .from('pins')
      .select(`
        title, category, description,
        members:pin_members(
          profile:profiles(display_name, interests, is_local, home_country)
        )
      `)
      .eq('id', pinId)
      .single()

    if (!pin) return NextResponse.json({ error: 'Pin no encontrado' }, { status: 404 })

    const members = (pin.members as any[])
      .filter((m: any) => m.profile)
      .map((m: any) => ({
        name: m.profile.display_name,
        interests: (m.profile.interests ?? []).join(', ') || 'variados',
        origin: m.profile.is_local
          ? 'local de Medellín'
          : `visitante de ${m.profile.home_country ?? 'otro país'}`,
      }))

    // Gemini Flash — gratis, rápido
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: { maxOutputTokens: 200, temperature: 0.85 },
    })

    const prompt = `Eres el asistente de Parche, una app de conexión social en Medellín, Colombia.
Genera UN icebreaker en ESPAÑOL para este grupo que se va a encontrar en persona.

Parche: "${pin.title}" (${pin.category})
${pin.description ? `Contexto: ${pin.description}` : ''}

Miembros:
${members.map(m => `- ${m.name} (${m.origin}): ${m.interests}`).join('\n')}

Requisitos:
- Una sola pregunta o dinámica concreta y divertida
- Conecta los intereses del grupo con el contexto del parche  
- Aprovecha el mix local/visitante si existe
- Máximo 2-3 oraciones
- Solo el icebreaker, sin saludos ni explicaciones`

    const result = await model.generateContent(prompt)
    const content = result.response.text().trim()

    if (!content) throw new Error('Respuesta vacía')

    cooldownMap.set(pinId, Date.now())

    // Guardar en DB
    await supabase.from('pin_messages').insert({
      pin_id: pinId,
      sender_id: user.id,
      content,
      type: 'icebreaker',
    })

    await supabase.from('icebreakers').upsert({
      pin_id: pinId,
      content,
      generated_at: new Date().toISOString(),
      model_used: 'gemini-1.5-flash',
    })

    return NextResponse.json({ content })

  } catch (err: any) {
    console.error('Icebreaker error:', err)
    if (err?.status === 429) {
      return NextResponse.json(
        { error: 'Límite de Gemini alcanzado. Intenta en unos minutos.' },
        { status: 429 }
      )
    }
    return NextResponse.json({ error: 'Error generando icebreaker' }, { status: 500 })
  }
}
