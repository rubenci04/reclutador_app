# Sprint 3 — Online sin trabas: tiempo por turno y reclamo de victoria

## Qué cambió
- **Migración `supabase/migrations/202610250002_online_turn_timer.sql`** (idempotente). Un trigger `BEFORE UPDATE OF state` sobre `public.game_state` escribe `deadline_at` según `state->>'phase'`: 120 s en `BIDDING` (se reinicia en cada escritura, o sea en cada turno), 5 min al entrar en `TEAMS_COMPLETED` (no se reinicia en actualizaciones posteriores de esa fase) y `null` en cualquier otra fase o si la sala terminó (`forfeitBy`). No se tocó `online_submit_state`.
- `online_claim_timeout(room, action_id)`: solo miembros; sala `IN_PROGRESS`; plazo vencido por el reloj del servidor más 5 s de gracia; el que reclama no puede ser el moroso. Moroso = `activeParticipant` en `BIDDING`; en `TEAMS_COMPLETED`, el asiento que no eligió estrategia mientras el que reclama sí (si ambos eligieron, no hay reclamo). Efecto como `online_forfeit` con `forfeitBy = moroso` y `timedOut: true`; acción `TIMEOUT_CLAIM`, idempotente por `action_id`.
- `online_snapshot` (reemplazada en la misma migración) agrega `serverNow`. `contracts.ts` lo tolera ausente (servidores sin migrar) y rechaza uno malformado.
- **Cliente:** `OnlineTurnClock` en el encabezado de la subasta online: «Te quedan mm:ss» / «Turno de <nombre>: mm:ss», barra, sin sonidos; la cuenta usa el desfase con `serverNow`. Lectores de pantalla: `role="timer"` (no anuncia cada segundo) y aviso educado (`aria-live="polite"`) solo a los 30 s y a los 10 s. Vencido el plazo (+5 s de gracia, igual que el servidor) a quien espera se le muestra «Reclamar victoria: <nombre> no respondió» con confirmación (`ConfirmNavigation`) y una línea que explica que la partida termina. El moroso conserva el control: si actúa antes del reclamo la partida sigue. Pantalla final propia para el desenlace por tiempo («no respondió a tiempo»).
- Si el servidor no tiene la función: `BACKEND_OUTDATED` (mismo patrón que `online_flip_coin`), mostrado dentro del duelo; el texto ahora nombra las tres migraciones.
- **Reconexión** (sin rediseñarla): el aviso «sin conexión» ahora desaparece apenas llega un snapshot válido (antes dependía solo del canal en vivo). Pruebas con eventos `online`, `focus` y `visibilitychange`.
- Textos en es-AR, en y pt-BR (cuenta regresiva, accesibilidad, reclamo, errores).

## Plazos elegidos
120 s por turno de puja; 5 min para elegir estrategia; 5 s de gracia. Están en tres funciones de `private` (`online_bid_seconds`, `online_strategy_seconds`, `online_grace_seconds`) en la migración; el cliente los refleja en `OnlineTurnClock.tsx` (solo para la barra y el momento de mostrar el botón; decide siempre el servidor).

## Límites
- **Sin presencia en tiempo real:** no se sabe si el rival sigue conectado; solo se sabe si dejó pasar el plazo.
- **Reclamo manual:** nadie reclama por el jugador; el servidor no termina la partida solo.
- **Sin pase automático:** al vencer el plazo no se juega ni se pasa por nadie; solo se habilita el reclamo.
- No hay plazo para otras fases (moneda, técnicos, formación); `TEAMS_COMPLETED` usa el plazo de la estrategia para todo el armado.
- El reclamo es definitivo: termina la sala como una rendición del moroso.

## Despliegue
Las migraciones **202610250001_online_fair_coin.sql** y **202610250002_online_turn_timer.sql** deben aplicarse juntas, en ese orden, al publicar la web nueva (la web nueva exige ambas funciones). Ninguna se ejecutó contra un servicio remoto.

## Pruebas
- SQL (PGlite): el trigger fija/limpia `deadline_at` por fase y no lo extiende dentro de `TEAMS_COMPLETED`; reclamo rechazado antes del plazo (con gracia), por el jugador al que le toca, fuera de `BIDDING`/`TEAMS_COMPLETED` y por no miembros; aceptado vencido (se retrocede `deadline_at`), con `forfeitBy` correcto en ambos sentidos, idempotente; caso de estrategias pendientes; migración reaplicable; `serverNow` en el snapshot.
- Cliente: cuenta regresiva en ambos roles y tres idiomas, desfase del servidor, avisos a 30 y 10 s, botón solo para quien espera y tras el plazo, confirmación, `BACKEND_OUTDATED`; reconexión con tres disparadores; contrato y gateway.
