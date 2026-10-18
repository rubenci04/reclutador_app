# CODEX-005G-C3A — Selección secreta de estrategias y HUD deportivo

18/10/2026. Base `c6d5b15` (C2), rama `codex/current-club-audit`, árbol limpio al comenzar. Ejecutada con Claude Code. Las fórmulas tácticas de C2 no se modificaron; no se repitieron calibraciones.

## Qué se hizo
**Flujo de estrategias** (`src/features/tactics/strategyChoice.ts`, `src/features/recruiter-duel/StrategyChoicePanel.tsx`, `AuctionPage.tsx`):
1. Con ambos onces confirmados aparece la elección. El Reclutador A elige una de las seis estrategias en tarjetas con «Busca / Ventaja / Riesgo» y una nota de que ninguna garantiza ganar.
2. Al confirmar, una pantalla de traspaso («Pasale el dispositivo a…») no muestra la elección. El botón del Reclutador B lo habilita.
3. B elige con todas las tarjetas sin marcar. Al confirmar, se revelan las dos a la vez y recién entonces aparece «Iniciar partido».
4. El partido se inicia con `startDuelMatch(game, catalog, { recruiter_one, recruiter_two })` (motor C2): las estrategias quedan en `game.strategies` y `result.tactics`.
- Máquina de estados pura: `FIRST → HANDOVER → SECOND → REVEALED`. Una segunda confirmación en cualquier paso no válido devuelve `invalid_step`; un identificador desconocido, `invalid_strategy`. `revealedStrategies` devuelve `null` hasta el final.
- Bloqueo: en cuanto se confirma la primera estrategia, desaparece «Editar de nuevo» de los onces (`locked`); una estrategia confirmada no se puede cambiar de forma unilateral.
- **Contra CPU:** la CPU fija su estrategia con `selectCpuStrategy(su once, catálogo, semilla)` antes de que el humano confirme; su firma no recibe nada de la elección humana y el resultado es reproducible. El humano confirma y se revela directamente (sin traspaso). No existe contraestrategia automática.
- **Partidas antiguas:** sin estrategias (`startDuelMatch` sin tercer argumento o resultados guardados sin `tactics`), el comportamiento es NEUTRAL, como en C2.

**HUD deportivo** (`hudModel.ts`, `AuctionHud.tsx`): barra fija arriba (`position: sticky`) durante revelación, subasta, descarte y resultado de ronda, con panel por reclutador (color propio, insignia de turno, barra de presupuesto, dinero restante y gastado, fichajes /11, cuatro cupos ARQ/DEF/MED/DEL) y centro con adjudicaciones /22, descartes compartidos /3 (y el aviso de reserva agotada) y un acceso «Ver canchas» a `TeamProgressBoard`.
- `buildHudModel(game, catalog)` es una función pura sobre el estado guardado. No hay estado económico propio.
- Presupuesto restante ≠ dinero para ofertar: «Quedan XM» se calcula como 100 − gastado; «Oferta máx. segura» es exactamente `maximumSafeBid` del motor para la carta en juego (nulo si no hay carta o el motor no permite ofertar) y «reservados para completar el equipo» es la diferencia entre ambos.
- Alerta de cupo: solo existe «Los restantes de esta línea son para este equipo» cuando el rival ya completó esa línea (derivado de `positionProgress`). No hay etiquetas «urgente» sin justificación comprobable.
- Se retiró el marcador simple anterior (saldo/fichajes por reclutador) porque el HUD lo reemplaza; el contador de descartes anterior se muestra solo cuando el HUD no está visible.

**i18n:** claves `hud.*` y `strategyChoice.*` en es-AR, en y pt-BR (se suman a `tactics.strategies.*` de C2).
**Temporizadores:** solo documentados en `docs/decisions/ADR-0010.md` (15/25/75/30 s, desactivables en local, vencimientos autoritativos en el servidor en el futuro online). Sin código.

## Archivos
Nuevos: `tactics/strategyChoice.ts`, `recruiter-duel/hudModel.ts`, `AuctionHud.tsx`, `StrategyChoicePanel.tsx`, `hudModel.test.tsx`, `tactics/strategyChoice.test.tsx`, `docs/decisions/ADR-0010.md`, este informe. Modificados: `AuctionPage.tsx`, `AuctionPage.test.tsx`, `LineupOrganizer.tsx` (prop `locked`), `TeamProgressBoard.tsx` (id para el acceso del HUD), `styles/index.css`, los tres `common.json`, `TASK_BOARD.md`, `ROADMAP.md`. Sin cambios en simulador, estrategias, catálogo ni motor de subastas.

## Pruebas reales
- `npm run typecheck`, `npm run lint` y `npm run build`: correctos.
- `npm test`: 536 aprobadas de 536 (524 en C2; +12 nuevas y 2 pruebas existentes de `AuctionPage` adaptadas al nuevo flujo y al HUD).
- Cobertura nueva: seis estrategias válidas e inválidas rechazadas; privacidad (sin selección visible en el traspaso, tarjetas sin marcar para el segundo, nada revelado antes del final); dos confirmaciones obligatorias y sin dobles confirmaciones; CPU fija antes y no depende de la elección humana, reproducible; HUD sincronizado tras cada adjudicación (gastado, restante, fichajes, cupos, conteo /22), descartes tras un descarte compartido, techo de oferta idéntico al del motor, reserva = restante − techo, cupo forzado solo con el rival completo, determinismo; hot-seat completo hasta el partido en `AuctionPage`.
- No se repitió la calibración táctica (el motor no cambió).

## No verificado
- QA visual y móvil (360/390 px) **no ejecutada**: no hay navegador integrado funcional contra localhost. El diseño usa cuadrícula de dos columnas, textos con elipsis y puntos de corte en 420 px, pero requiere verificación manual.
- El flujo contra CPU en la página completa no tiene prueba de interfaz de extremo a extremo (sí en la máquina de estados, el panel y el motor).
- `position: sticky` del HUD y su altura en pantallas pequeñas: pendiente de revisión visual.

## Guía de playtest manual (Firefox, `npm run dev`)
1. Duelo hot-seat completo: durante la subasta, comprobá que el HUD queda arriba, muestra el turno, el presupuesto, los cupos y los descartes, y que se actualiza al adjudicar y al descartar.
2. En una subasta, comparar «Quedan XM» con «Oferta máx. segura»: el segundo debe ser ≤ al primero y coincidir con el máximo del campo de oferta.
3. Organizar y confirmar ambos onces; verificar que en la elección de estrategia el segundo reclutador no ve la elección del primero (ni en el traspaso ni marcada en las tarjetas) y que «Editar de nuevo» ya no aparece.
4. Revelación simultánea, luego «Iniciar partido»; revisar que el resultado muestra una partida coherente.
5. Contra CPU: elegir estrategia, ver que se revela de inmediato la de la CPU; repetir con la misma semilla (contexto exportado) y comprobar que la CPU elige igual.
6. En 360 y 390 px de ancho: que el HUD no tape los controles (Ofertar/Pasar), que los nombres largos se recorten con elipsis y que las tarjetas tácticas se lean. Probar con movimiento reducido activado.
7. Cambiar de idioma durante la elección.

## Estado de Git
Rama `codex/current-club-audit`, base `c6d5b15`. Commit local específico al cierre de esta tarea. Sin push ni deploy.
