# Despliegue: Cloudflare Pages + Supabase

El juego es una app estática (Vite). Cloudflare Pages la sirve; Supabase solo se usa para el modo online (`?online`). El modo local funciona sin Supabase.

## Qué quedó preparado (ya hecho)
- `.env.local` (ignorado por Git) con `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`. Son claves **públicas por diseño**; nunca pongas la `service_role` ni una clave `sb_secret_` en el frontend.
- `public/_headers`: cabeceras de seguridad básicas y caché larga para `/assets/*`.
- La compilación (`npm run build`) genera `dist/` y ya incorpora la configuración de Supabase.
- Comprobado contra tu proyecto: el servidor responde y **Anonymous sign-ins está activado**.
- Comprobado: **las migraciones aún no están aplicadas** (no existe `online_snapshot`).

## Parte A — Supabase (lo haces tú, ~5 minutos)
1. En el panel del proyecto: **SQL Editor → New query**.
2. Pega y ejecuta, en este orden, el contenido de:
   1. `supabase/migrations/202610180001_online_foundation.sql`
   2. `supabase/migrations/202610180002_online_lobby.sql`
3. **Realtime → Settings**: desactiva **Allow public access** (ver ADR-0011).
4. **Authentication → Sign In / Providers**: confirma que «Allow anonymous sign-ins» sigue activo.
5. Después de desplegar, en **Authentication → URL Configuration** agrega tu dominio de Cloudflare como *Site URL* (opcional para el modo anónimo).

## Parte B — Cloudflare Pages (lo haces tú; el inicio de sesión es tuyo)
Opción 1, sin GitHub (la más rápida):
```bash
npm run build
npx wrangler login          # abre el navegador; inicias sesión tú
npx wrangler pages deploy dist --project-name draft-legends
```
Opción 2, conectada a GitHub (despliegue automático en cada push):
1. Sube el repositorio a GitHub (no hay remoto configurado todavía).
2. Cloudflare → **Workers & Pages → Create → Pages → Connect to Git**.
3. Framework: **Vite**. Build command: `npm run build`. Output: `dist`. Node 20+.
4. En **Settings → Environment variables** (Production) crea `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` con los mismos valores de `.env.local`.

## Parte C — Verificación posterior
1. Abre la URL `*.pages.dev`: deben aparecer el tutorial y el duelo local.
2. Abre `https://TU-URL/?online`: debe poder crear una sala (si falla con «no configurado», faltan las variables; si falla al crear sala, faltan las migraciones).
3. Prueba desde dos navegadores distintos (cada uno es una identidad anónima distinta; dos pestañas del mismo navegador comparten identidad).

## Qué hago yo y qué no
| Yo (ya hecho / puedo hacer) | Tú |
|---|---|
| Configuración local, cabeceras, build, guía, pruebas | Ejecutar el SQL en Supabase |
| Verificar el proyecto y las variables | Iniciar sesión en Cloudflare (`wrangler login`) |
| Corregir fallos que aparezcan tras el despliegue | Subir a GitHub si eliges la opción 2 |
