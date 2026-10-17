# CODEX-005G-C1 — Roles futbolísticos y organización del once

17/10/2026. Base `a3b55fc`, rama `codex/current-club-audit`, árbol limpio al comenzar. No existía informe ni commit de C1. Ejecutada con Claude Code.

## Qué se hizo
- `src/features/tactics/roles.ts`: `FormationRole` (GK, LB, LCB, RCB, RB, CDM, LCM, RCM, LW, ST, RW; alias de `DraftSlotId` para mantener una única estructura de once), `ROLE_LINE` (rol → ARQ|DEF|MED|DEL), tipo `RoleAptitude` (NATURAL | ADAPTED | UNKNOWN, sin datos ni efectos) y `migrateLegacyLineupKeys`.
- Slot `CM` renombrado a `CDM` en `draftTypes.ts` (mismo orden y coordenadas, por lo que el simulador no cambia). `validatePersistedDraft` convierte `CM` → `CDM` al leer, sin subir `DRAFT_STORAGE_VERSION`.
- `src/features/tactics/lineupOrdering.ts`: `swapWithinLine` puro; errores controlados `unknown_slot | same_slot | different_line | empty_slot`; devuelve un once nuevo.
- `reorderTeamLineup` en `auctionEngine.ts`: solo en fase `TEAMS_COMPLETED`; no toca `spent`, el otro equipo ni la propiedad de los futbolistas.
- UI: `TeamPitchBoard` admite `organize` (camisetas seleccionables, `aria-pressed`, rol visible y en el nombre accesible). Nuevo `LineupOrganizer` (instrucciones, mensajes de estado/error, Confirmar once / Editar de nuevo). En `AuctionPage`, el botón de iniciar el partido queda deshabilitado hasta que los reclutadores humanos confirmen; hot-seat organiza uno por vez; contra CPU la CPU conserva su orden.
- i18n: clave `lineup` completa en es-AR, en y pt-BR (instrucciones, estados, errores, nombres de rol).

## Pruebas reales
- `npm run typecheck`: correcto. `npm run lint`: correcto. `npm run build`: correcto.
- `npm test`: 512 aprobadas de 512 (antes 498 aprobadas + 3 baterías omitidas informadas en C-005G-B; esta ejecución no listó omitidas). Nuevas: 11 (roles, intercambios, migración CM→CDM, motor, determinismo del partido, componente). Se actualizó una prueba existente de `AuctionPage` para confirmar los onces antes de iniciar.
- No se ejecutaron baterías estadísticas nuevas: el motor matemático no cambió.

## Decisiones y límites
- La confirmación del once es estado de la interfaz (por semilla), no del motor: `startDuelMatch` no la exige, para conservar el contrato del motor y sus pruebas. Cuando exista servidor (online) deberá moverse al estado autoritativo.
- Mientras se espera al segundo reclutador, el primero no puede reeditar; sí puede cuando ambos confirmaron.
- Un intercambio cambia el once pasado al simulador; si este depende de la posición dentro de la línea, el resultado puede variar. Se verificó que mismo once + mismo contexto = mismo resultado.
- La prueba de integración ejecutó `docs/qa/CODEX-005C-stress.json` como efecto lateral; se restauró.

## Contradicciones
- El informe maestro nombra el rol `CDM`; el código usaba `CM`. Se unificó en `CDM` con migración.

## QA visual pendiente (manual, Firefox)
No se usó navegador integrado. Revisar: toque en dos camisetas en móvil, contraste del contorno de selección, legibilidad del rol en las camisetas, flujo hot-seat de dos confirmaciones y cambio de idioma durante la organización.
