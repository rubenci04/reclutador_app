# CODEX-005H · H1 — Edición intuitiva de las posiciones

18/10/2026. Base `9a6b46a`, rama `codex/current-club-audit`.

## Qué se hizo
- **Modo «EDITAR FORMACIÓN»** en `LineupOrganizer`: por defecto el paso de ordenar muestra el once para revisar (las camisetas abren la ficha); el botón activa la edición. Al activarla: aviso persistente del futbolista seleccionado («Seleccionado: X (Central izquierdo)…»), camisetas de la misma línea resaltadas con borde punteado, las de otras líneas atenuadas y leyenda de aptitudes. «LISTO: SALIR DE LA EDICIÓN» o «Confirmar once» cierran el modo.
- **Dos toques** (principal, accesible, `aria-pressed`) y **arrastrar y soltar** (opcional, HTML5) usan el mismo `reorderTeamLineup`/`swapWithinLine` del dominio: solo dentro de la línea, el arquero fijo, sin cambiar propiedad, precio, presupuesto ni historial; el once cambiado es el que recibe el simulador. Los intercambios inválidos muestran su mensaje.
- **Roles documentados** (`tactics/roleProfiles.ts`): contrato `RoleProfile {natural, alternative, source, verifiedAt}` y `ROLE_PROFILES`, **vacío**: no se infiere ningún rol desde ARQ/DEF/MED/DEL. `roleAptitude` devuelve NATURAL/ADAPTED/UNKNOWN y `suggestLineup` coloca primero a quien tenga rol natural verificado, luego alternativo, siempre dentro de su línea y sin cambios si no hay datos. Se aplica al completarse los equipos (`nextAuctionRound`). Hoy es identidad; H4 podrá poblarlo solo con evidencia.
- **Indicadores**: punto discreto por camiseta (lleno = rol verificado, medio = alternativo verificado, punteado = no documentado), con leyenda; el nombre accesible añade «rol verificado/alternativo verificado» solo cuando existe. Lo no documentado no se presenta como incompatibilidad ni penaliza.
- i18n es-AR/en/pt-BR. La migración CM→CDM no se tocó.

## Pruebas
`npm run typecheck`, `lint` y `build` correctos; `npm test`: 576 aprobadas de 576 (572 antes; +4: modo de edición con resaltado, arrastre válido y rechazos, leyenda, y tres de roles/sugerencia). Se adaptó la prueba del organizador al nuevo modo. Los intercambios válidos/ inválidos del dominio y el efecto sobre el partido ya estaban cubiertos (C1/C2). No se probó la interacción real en navegador ni el arrastre táctil en móvil (HTML5 DnD no funciona con toque; la alternativa de dos toques sí).

## Probar en Firefox
Al ordenar el once pulsá «EDITAR FORMACIÓN», tocá una camiseta y luego otra resaltada de la misma línea; probá también arrastrar una sobre otra. Confirmá y comprobá que el partido usa ese orden (el relato nombra jugadores en su puesto).

## Git
Un commit local (`feat(reclutador): H1 editable tactical lineup`). Sin push.
