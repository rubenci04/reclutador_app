# CODEX-006C — Duelo online jugable y avisos de acciones bloqueadas

19/10/2026. Pedido del usuario tras probar el modo online en Firefox y Chrome.

## Diagnóstico
El modo online solo tenía el **vestuario (lobby)**: crear sala, unirse por enlace, marcar «listo» e «iniciar». Al iniciar, la sala pasaba a `IN_PROGRESS` y mostraba un texto («la moneda y las subastas online quedan pendientes»); nunca se creaba una partida compartida. Por eso la sala «se creaba» pero no había forma de jugar juntos. (La SQL lo decía: «Lobby transition only».)

## Lo que se construyó
- **Migración `supabase/migrations/202610190001_online_duel.sql`** (hay que ejecutarla en Supabase): `online_start_duel` (solo el anfitrión, guarda la partida inicial), `online_submit_state` (cambios de estado con versión; sin pisados), `online_set_strategy` / `online_reveal_strategies` (estrategias secretas, se entregan solo cuando las dos existen), `online_forfeit` (abandono) y `online_snapshot` ampliado (estado y quién ya eligió, nunca qué).
- **Qué impone PostgreSQL:** miembro de la sala, versión esperada, semilla y configuración fijas, historial que solo crece, turno de oferta (solo juega quien tiene el turno), nadie edita el equipo del rival, el resultado solo acepta las estrategias realmente elegidas, y nadie escribe tablas directamente.
- **Límite honesto:** el motor de reglas corre en los dos navegadores; el servidor **no repite** las reglas de la subasta. Un usuario con herramientas de desarrollo podría enviar un estado inventado. Es apto para jugar entre amigos, no para competencia con clasificación (para eso habría que portar el motor a SQL/Edge Functions).
- **Cliente:** `AuctionPage` acepta un `online` (el mismo juego, con la partida en la sala): solo actúa quien tiene el turno y el otro ve «Es el turno de X»; el anfitrión elige cara o cruz; cada uno ordena solo su once, ficha suplentes y elige estrategia en secreto; empieza el mismo partido para ambos; abandonar da la victoria al rival. Si dos acciones chocan, la intención se reaplica sobre el estado más nuevo (`useOnlineSync`).
- **Lobby más claro:** pasos 1-2-3, aviso al invitado («Te invitaron a una sala»), «esperá al anfitrión», se acepta pegar el enlace completo y el historial local cuenta las partidas online.
- Si falta la migración, el aviso dice exactamente cuál aplicar (`BACKEND_OUTDATED`).

## Avisos de lo que se puede o no se puede hacer
Mensajes emergentes (con botón de cerrar y desaparición automática) para: oferta, pase, fichaje, adjudicación por prioridad u obligatoria, descarte consumido (con cuántos quedan y qué posición se sortea) y suplente fichado. Cuando no podés ofertar, el motivo con números aparece solo la primera vez que te toca (posición completa, saldo insuficiente, dinero reservado para completar el equipo) y también si tocás el botón bloqueado u «Ofertar/Pasar» sin permiso.

## Pruebas
- `onlineDuel.database.test.ts` (9): SQL real en PostgreSQL (PGlite): inicio, turnos, semilla fija, protección del equipo rival, estrategias secretas y reveladas, abandono, escrituras directas cerradas.
- `onlineDuel.flow.test.tsx` (2): **dos navegadores** (dos `OnlinePage`) contra la base real: crear sala, unirse, listos, moneda, ~23 rondas de subasta alternando turnos, ordenar, estrategias secretas, partido y **mismo resultado final en ambos**; y abandono.
- `notices.test.tsx` (3) y suite completa: 701 pruebas; typecheck, lint y build correctos.
- No probado con dos navegadores reales sobre tu Supabase hasta aplicar la migración.
