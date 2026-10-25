# Sprint 6 — Verificación completa del online, guía de prueba y plan de publicación

## Hallazgo importante
El test de punta a punta contra el SQL real detectó un **error de `verifyDuelState`**: compara estados con `JSON.stringify`, pero PostgreSQL guarda `jsonb` con otro orden de claves, así que **todo estado recibido del servidor se habría marcado como inválido** («El estado de la sala no coincide con las reglas» en cada partida honesta). Los tests anteriores no lo vieron porque usaban objetos locales sin pasar por la base (y la aserción final del flujo de dos navegadores corría cuando ya se mostraba la pantalla del partido, sin banner). Corregido: la comparación ahora es por contenido con claves ordenadas (`canonical` en `verifyDuelState.ts`) y hay una prueba que invierte el orden de claves (falla sin la corrección).

## Parte A — Prueba de punta a punta (`onlineDuel.endToEnd.test.ts`)
PGlite con las cinco migraciones en orden y dos identidades reales (anfitrión e invitado). Recorre: crear sala (código corto), unirse, listos, iniciar, moneda del servidor, subasta completa (con descartes), técnicos y suplentes de cada uno, estrategias secretas (`online_set_strategy`/`reveal`), partido y resultado. Tras cada cambio **ambos clientes** leen el snapshot y pasan `verifyDuelState` sin avisos; el resultado final es idéntico para los dos.
Trampas: precio alterado (el servidor lo acepta, el navegador del rival lo marca `replay`), resultado de partido alterado (`match_result`), cambio de moneda (rechazado `INVALID_ACTION`), jugar fuera de turno (rechazado `NOT_YOUR_TURN`).
Inactividad: reclamo antes del plazo (`INVALID_PHASE`), por el moroso (`NOT_YOUR_TURN`), después del plazo (`FINISHED`, `forfeitBy` y `timedOut`), y en la fase de estrategias (solo quien ya eligió, y tras 5 min). Sin esperas: se retrocede `deadline_at`. Duración del archivo: ~5 s.

## Parte B — `docs/qa/MANUAL-PLAYTEST.md`
Guía con casillas, «qué debería pasar» y espacio para anotar: contra la CPU en celular (9 pasos), online entre dos dispositivos (11), y lectura de pantalla (6).

## Parte C — Publicación con vuelta atrás
- `docs/RELEASE-CHECKLIST.md`: orden (mezclar, migraciones 202610250001 y 202610250002 juntas y en orden, build, deploy del Worker, verificación por hash), cómo volver atrás en cada paso y la versión previa del Worker (7d7b523a-7317-4150-a1bb-f51cab9ad4d8, etiqueta ad155c9, según DEPLOY.md). Advierte la ventana en que la web vieja no puede tirar la moneda con las migraciones nuevas, y la posible publicación automática al empujar a `main` (las notas viejas dicen que existe; las recientes usan `wrangler deploy`).
- `supabase/rollback/rollback_sprint_2_3.sql` (idempotente, **no ejecutado**): quita `online_flip_coin`, `online_claim_timeout`, el trigger y sus funciones, limpia `deadline_at` y restaura `online_submit_state` y `online_snapshot` a la versión de 202610190001. Conserva todos los datos.
- `onlineDuel.rollback.test.ts`: aplica todo, luego la reversa (dos veces), y comprueba que la moneda desde el cliente vuelve a funcionar, que desaparecen las funciones nuevas, que no hay plazo ni `serverNow`, y que las migraciones se pueden reaplicar.

## No verificado
`wrangler rollback` no se ejecutó (la receta usa el comando documentado de Wrangler; hay alternativa de republicar el commit anterior). Nada se mezcló en `main`, ni se aplicó en Supabase, ni se desplegó.
