# 📍 Parche

Plataforma de micro-comunidades efímeras en Medellín. Conecta personas por afinidad real con pines en el mapa que expiran automáticamente.

## Stack (100% gratuito)

- **Next.js 15** — frontend + API routes
- **Supabase** — PostgreSQL + Auth + Realtime
- **MapLibre GL + Carto** — mapa interactivo sin API key
- **Groq + Llama 3.1** — icebreakers IA (6K req/día gratis)
- **Capacitor** — empaquetado iOS/Android
- **Vercel** — deploy + CDN

## Setup local

```bash
npm install
cp .env.local.example .env.local   # completar variables
npm run dev
```

## Variables de entorno

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GROQ_API_KEY=
NEXT_PUBLIC_APP_URL=
```

## Base de datos

Ejecutar en Supabase SQL Editor:
1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_cron_expire_pins.sql`

## Deploy

Push a `main` → GitHub Actions corre CI → deploy automático a Vercel.

Secrets necesarios en GitHub:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`, `VERCEL_TOKEN`, `NEXT_PUBLIC_APP_URL`
