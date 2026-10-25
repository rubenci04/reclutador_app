# Sprint 2 — Online más justo: moneda del servidor y verificación entre jugadores

## Qué cambió
- **Moneda del servidor** (`supabase/migrations/202610250001_online_fair_coin.sql`, idempotente): `online_flip_coin(room, action_id, expected_version, called_side)` valida miembro, sala en curso, versión, fase LOBBY y que quien llama sea el asiento 1 (recruiter_one). El resultado sale de `gen_random_uuid()` dentro de PostgreSQL, no de la semilla; guarda `coinCall` y `coinResult`, pasa a COIN_TOSS y registra la acción `FLIP_COIN` (reintento con el mismo `action_id` devuelve la misma moneda).
- `online_submit_state` (reemplazada en la misma migración) rechaza cualquier cambio de `coinCall`/`coinResult` (también de vacío a valor), rechaza salir del LOBBY sin moneda y rechaza un `coinTossWinner` que no se deduzca de la moneda guardada.
- **Cliente:** en online, elegir cara o cruz llama a `gateway.flipCoin` (`useOnlineSync.flipCoin`, reintenta ante STALE_STATE); ya no usa `startCoinToss`. Local y hot-seat no cambian. Si la función no existe, el gateway devuelve `BACKEND_OUTDATED` y el duelo muestra el error sin romper el lobby (nuevo campo `error` en el binding).
- **`verifyDuelState(game)`** (`src/features/online/verifyDuelState.ts`, pura): reconstruye el reparto desde semilla + config + categorías, reproduce con el motor cada puja, pase, descarte, adjudicación y cierre automático del `record`, y compara historial, equipos, rondas, oferta vigente y orden de apertura; tras la subasta compara plantel (jugadores ganados + suplentes comprados) y gasto (adjudicaciones + técnico + suplentes), valida el técnico contra su mercado y recalcula `matchResult` con la misma simulación. Cada navegador la ejecuta en cada estado recibido (`OnlinePage`); si falla muestra «El estado de la sala no coincide con las reglas» con salir, rendirse o seguir, en es-AR, en y pt-BR.
- Reglas online: frase honesta de partida amistosa con estado visible (`online.friendlyNotice`). `BACKEND_OUTDATED` ahora nombra ambas migraciones.

## Límites (deliberados)
- **Cartas futuras visibles:** el motor corre en ambos navegadores y necesita las 22 cartas; ocultarlas exige un servidor autoritativo. Quien lea el estado de la sala puede ver el orden de las cartas.
- **Sin servidor autoritativo:** PostgreSQL no re-ejecuta precios, adjudicaciones ni el resultado; solo la moneda es del servidor. Un cliente tramposo aún puede escribir un estado inválido: lo detecta el navegador del rival (no bloquea ni revierte), y un cliente modificado del rival podría ignorar el aviso.
- **Sin cubrir en `verifyDuelState`:** las estrategias secretas (las guarda el servidor; solo se comprueba que el partido use las del estado); el orden de la alineación y la formación elegidos por cada jugador; la configuración inicial elegida por el anfitrión (queda fija, pero no se compara con un valor por defecto); la elección concreta de técnico y suplentes dentro de lo legal; partidas heredadas sin `manualBench` o con catálogo legado (cobertura parcial: se aceptan sin reproducir).
- La moneda usa `gen_random_uuid()` (aleatoriedad del servidor, no criptográfica dedicada): suficiente para un juego amistoso.
- La migración **no** se ejecutó contra ningún servicio remoto; hay que aplicarla a mano en el SQL Editor de Supabase.

## Pruebas
- `onlineDuel.database.test.ts` (PGlite): moneda independiente de la semilla (24 salas con la misma semilla dan ambas caras), solo recruiter_one, versión vieja rechazada, reintento idempotente, no reenviable con otro `coinResult`/`coinCall`, no salir del LOBBY sin moneda, ganador inválido, migración reaplicable.
- `verifyDuelState.test.ts`: acepta 3 partidas completas reales (con cierre automático, técnicos, suplentes y partido) y cada estado intermedio; rechaza precio, ganador de ronda, saldo, moneda, puja viva y `matchResult` alterados.
- Flujo de dos navegadores contra la base real (PGlite) con la migración nueva; `onlineGateway.test.ts` cubre `BACKEND_OUTDATED`.
