# Despliegue: producción actual y antecedentes

## Sprint 8 — 25/10/2026

Código bc7648c, integrado en main mediante fast-forward (a7679dc con documentación). Worker reclutador-app, versión b194ae0d-fad8-45d4-bfce-31417c721539 al 100 %, etiqueta bc7648c. [Abrir juego](https://reclutador-app.rea-04.workers.dev/). HTML y nueve bundles coinciden con dist por SHA-256; [evidencia](qa/SPRINT-8-deployment.json) y [registro](logs/SPRINT-8-PUBLICACION.md). Claude conserva su carpeta original para integrar los sprints posteriores; [guía](PARALLEL_WORK.md).

## Publicación GAMEPLAY-POLISH-010 — 22/10/2026

Commit **ff15376** en main (push fast-forward). Worker **reclutador-app**, versión **a134976d-df2e-4186-9467-883b15bf8a11** al 100%, etiqueta ff15376; Wrangler 4.151.3, --keep-vars --no-autoconfig. HTML y assets coinciden con dist. [Registro](logs/GAMEPLAY-POLISH-010.md).

## Publicación SIM-MINI-002/003 + RANK-REVEAL-009 — 22/10/2026

Commit **3d458fa** en `main` (push fast-forward). Worker **reclutador-app**, versión **05e99a73-495a-41f9-80ee-63980e59f3e0** al 100%, etiqueta 3d458fa; Wrangler 4.151.3, `--keep-vars --no-autoconfig`, sin cambios de bindings ni secretos. HTTP 200 y SHA-256 de HTML y assets coinciden con dist. [Registro](logs/SIM-MINI-002-003.md). Las secciones siguientes son antecedentes.

## Publicación SIM-005R-05 — 21/10/2026

Última verificación de esta entrega: **76d23cd**, Worker existente **reclutador-app**, https://reclutador-app.rea-04.workers.dev/. Versión **9d03e991-e554-4e5b-bf9e-3644ed73aaf1** al 100%, etiqueta 76d23cd. Build, dry-run y deploy con Wrangler 4.151.3, `--keep-vars --no-autoconfig`, sin cambios de bindings, secretos ni migraciones.

Push autorizado realizado a `origin/codex/sim-005`; `main` quedó sin cambios porque la revisión automática rechazó incluir la rama predeterminada sin autorización explícita. El Worker se publicó directamente, sin depender de un push a main ni configurar despliegue automático. HTTP 200 y SHA-256 de HTML y cinco bundles coinciden con dist. [Registro y límites](logs/SIM-005R-05.md), [evidencia](qa/SIM-005R-05-deployment.json). No acredita QA visual ni E2E online. Las secciones siguientes son antecedentes históricos.

## Producción verificada — 19/10/2026

- URL usada por el usuario: https://reclutador-app.rea-04.workers.dev/.
- Servicio real: **Cloudflare Worker `reclutador-app` con assets estáticos**, no el antiguo proyecto Pages `draft-legends`.
- Código publicado: **e19296f**, rama de trabajo/remota `codex/current-club-audit`.
- Rama predeterminada GitHub comprobada: `main`, en `dbffe2f` al diagnosticar. Las dos ramas no son equivalentes. Los pushes recientes a la rama de trabajo no actualizaron el Worker.
- Publicación autorizada expresamente por el usuario después del diagnóstico. Build nuevo y dry-run aprobados. Versión activa al 100%: `f5d7bd6b-abce-4759-822b-c679339ba8e6`, etiqueta `e19296f`, 19/10/2026 a las **02:01:59 de Argentina**.
- Verificación HTTP posterior: HTML coincide con dist; bundles públicos contienen action-v2, categoryTree e import_arg_; el bundle online conserva URL/clave pública de Supabase. No equivale a un E2E de dos usuarios reales ni a QA visual.

Procedimiento usado (no cambia ramas ni configura despliegue automático):

```powershell
npm run build
npx --no-install wrangler deploy --name reclutador-app --assets ./dist --compatibility-date 2026-10-12 --keep-vars --no-autoconfig --tag e19296f --message "Publish e19296f: category tree and action-v2" --dry-run
npx --no-install wrangler deploy --name reclutador-app --assets ./dist --compatibility-date 2026-10-12 --keep-vars --no-autoconfig --tag e19296f --message "Publish e19296f: category tree and action-v2"
npx --no-install wrangler deployments status --name reclutador-app
```

Para publicaciones futuras usar la etiqueta/hash del commit realmente compilado y verificar la URL pública. No subir a Pages esperando que cambie este Worker. No se modificaron bindings, secretos, migraciones ni la rama `main`. Wrangler gestiona su sesión; no leer ni extraer tokens para llamadas manuales.

## Antecedentes de Pages y propuestas anteriores

El texto siguiente se conserva como historial. Sus instrucciones de Pages, rama main, ausencia de remoto y migraciones pendientes describen etapas anteriores; no acreditan la configuración de producción actual indicada arriba.

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

## Actualización 19/10/2026 — duelo online
Para jugar online hay que ejecutar también, en el editor SQL de Supabase, `supabase/migrations/202610190001_online_duel.sql` (después de las dos anteriores). Sin esa migración la app muestra el aviso «El servidor todavía no tiene la última versión del modo online». La migración es nueva (no modifica los datos de salas existentes) y es segura de ejecutar una vez.
Prueba: abrir la app en dos navegadores, crear la sala en uno, pegar el enlace en el otro, marcar «Estoy listo» en ambos e «Iniciar sala» en el anfitrión.

## Despliegue automático desde GitHub (repositorio `rubenci04/reclutador_app`)
El código vive en https://github.com/rubenci04/reclutador_app (rama `main`; es la rama local `codex/current-club-audit`, con `git push`).
Cloudflare no permite convertir un proyecto creado por subida directa (`draft-legends`) en uno conectado a Git, así que hay que crear un proyecto nuevo:
1. Cloudflare → **Workers & Pages → Create → Pages → Connect to Git** → elegir `reclutador_app`.
2. Rama de producción: `main`. Framework: **Vite**. Build command: `npm run build`. Output directory: `dist`. Variable `NODE_VERSION` = `22`.
3. **Environment variables** (Production y Preview): `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` (los valores de `.env.local`; son claves públicas).
4. Cada `git push` a `main` desplegará solo. Si se quiere conservar la dirección `draft-legends.pages.dev`, hay que eliminar primero el proyecto antiguo y nombrar el nuevo igual.
Mientras tanto, la subida directa sigue funcionando: `npm run build && npx wrangler pages deploy dist --project-name draft-legends --branch codex/current-club-audit`.

## Publicación SIM-005R-07 — 21/10/2026

Código publicado en main: **8e88a137d1424a010efe564c5193f13d0e62b6d0**. Worker **reclutador-app**, [producción](https://reclutador-app.rea-04.workers.dev/). Deployment **78dc5851-81ba-4110-9837-beec992ed703**, versión **4d12b451-4452-4368-97e3-ae496ea72b3f** al 100%, etiqueta SHA completa. Push fast-forward autorizado directamente, build/dry-run/deploy con Wrangler 4.151.3, compatibility-date 2026-10-12, --keep-vars --no-autoconfig, sin cambios de bindings/variables.

HTML y cinco bundles con HTTP 200 y SHA-256 idénticos a dist; ?online carga HTML correcto. [Registro](logs/SIM-005R-07.md), [evidencia](qa/SIM-005R-07-deployment.json). Smoke funcional de navegador posterior bloqueado por Work settings; sin escucha real ni E2E online. La documentación posterior conserva el SHA del código compilado.
