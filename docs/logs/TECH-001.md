# TECH-001 — Partida local que sobrevive a la recarga — 31/10/2026

## Alcance

Una partida local (duelo en el mismo dispositivo o contra la CPU, incluido el sorteo cruzado de dos categorías) ya no se pierde al recargar (F5) durante la subasta, el vestuario o el partido. El modo online no cambia: no lee ni escribe la sesión.

## Cambios

- `src/features/recruiter-duel/activeSessionStorage.ts`: clave `reclutador.active-session.v1` y funciones `saveActiveSession`, `readActiveSession`, `clearActiveSession`. Todas toleran `localStorage` bloqueado o lleno (`try/catch`). La lectura valida la estructura (versión, `game.seed`, `game.phase`, `game.rounds`, `game.teams`, `dual.draft`, estrategia, confirmaciones, categoría, rival, dificultad y pausa); un dato inválido se borra y la pantalla arranca en el inicio.
- `AuctionPage.tsx` (solo sin `online`): hidrata el estado inicial al montar; guarda en cada cambio de `localGame`, `dual`, `strategyChoice`, `lineupConfirmed`, `matchMode` y la configuración de rival/categoría mientras haya partida; borra al volver al inicio (`goHome`), abandonar (`abandon`), iniciar una partida nueva (`start`) y cuando ya no queda partida (p. ej. «Nuevo partido»). El cálculo del catálogo se extrajo a `catalogOf` para reutilizarlo al reconstruir el partido.
- `src/test/setup.ts`: borra la clave después de cada prueba, para que ninguna prueba reanude la partida de otra en el mismo archivo.
- Dos pruebas existentes que simulan visitas nuevas dentro de una misma prueba (`AuctionPage.test.tsx` «starts fresh games only on actions…» y `autoRounds.test.tsx` «replaces floating toasts… three languages») ahora borran la sesión entre iteraciones: sin eso, la segunda visita reanudaba correctamente la partida anterior.

## Diferencias con el encargo

- El encargo nombra `liveOrigin`; ese estado no existe en el código. El equivalente es `liveInput` (partido dirigido en curso). No se guarda entero (incluye el catálogo completo): se guarda `live: true` y, al recargar, el partido se reconstruye con `duelMatchInput` a partir del juego y las tácticas reveladas. **El partido dirigido vuelve a empezar desde el saque inicial**; el progreso dentro del partido (minuto, goles, momentos) vive en `FiguresSeriesScreen` y no se persiste.
- No se agregaron textos visibles, por lo que no hubo traducciones nuevas.
- `draft-legends.draft-v1`, `reclutador.history.v1` y `reclutador.online-room-v1` no se tocaron.

## Validación

- `npm run typecheck`: aprobado.
- `npm run lint`: 0 errores, 4 advertencias previas (Fast Refresh, ajenas a este cambio).
- `npm test -- --maxWorkers=4`: 1.602 pruebas aprobadas, 3 omitidas (opt-in), 149 archivos.
- `npm run build`: aprobado.
- `activeSessionStorage.test.tsx` (19 pruebas): ida y vuelta, diez variantes de datos corruptos descartados y borrados, sorteo cruzado válido, almacenamiento bloqueado, datos corruptos al montar, restauración en `BIDDING` (misma carta), restauración en `TEAMS_COMPLETED` (confirmación del once conservada), reanudación del partido dirigido, limpieza al volver al inicio y modo online sin acceso a la sesión.
- Navegador local (Vite, 1024×768, es-AR): duelo contra la CPU → subasta en `BIDDING` → F5 → misma carta y la CPU retoma su turno, sin errores de consola; «Volver al inicio» → clave borrada y, tras otra recarga, pantalla de inicio.

## Límites

- Tamaño guardado observado: ~69 kB por partida (juego completo con registro). Si el almacenamiento está lleno, la partida sigue en memoria sin aviso.
- No se probó en celular ni con varias pestañas abiertas a la vez (la última pestaña que escribe gana).
- Sin push ni despliegue.
