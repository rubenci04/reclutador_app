# Directores técnicos (DL-F04-COACH-001)

## Qué hay
- `src/features/coaches/`: tipos, reglas (precio y bonus por nivel), catálogo de 100 técnicos (70 activos, 30 leyendas; 54 argentinos).
- Campos: nombre, apellido, año de nacimiento (y de fallecimiento en leyendas; la edad se calcula a 2026), equipo o selección que representa, nacionalidad, estado, nivel S/A/B/C/D, foco (ataque, defensa, mediocampo, equilibrado) y precio.
- **Auditoría pendiente:** los equipos de los técnicos activos son la referencia al 19/10/2026 y no están verificados contra una fuente. Años de nacimiento, niveles y foco son criterio editorial. Hasta auditarlos, no deben presentarse como datos confirmados.

## Reglas
- Opción `coaches` en `MatchConfig` (casilla en la pantalla previa, activa por defecto). Sin la opción, la partida es idéntica a la anterior.
- Las subastas reservan 1M por equipo (`COACH_RESERVE`): ofertas máximas, descartes y viabilidad usan `auctionBudgetOf`.
- Después de los planteles, cada reclutador ve una oferta de 6 técnicos derivada de la semilla (sin estado extra, reproducible, sin repetidos entre ambos, siempre uno de 1M) y puede contratar uno con el saldo restante. Es opcional.
- Precios: S 8M, A 5M, B 3M, C 2M, D 1M. Bonus por bloque y sector: S 2,5, A 1,8, B 1,2, C 0,7, D 0,3 en el foco y la mitad en los otros sectores (equilibrado: 75 % en los tres). Se suma al bonus de plantel y a la estrategia, y se guarda en `matchResult.coaches`.
- La CPU contrata el mejor técnico que pueda pagar.

## Decisiones que cerraban ADR-0012
- Se «sortea y se elige» (sin subasta); se puede terminar sin técnico; tabla de niveles arriba.

## Límites actuales
- Solo hot-seat y contra CPU. El duelo online usa la configuración clásica sin técnicos; llevarlo requiere interfaz en `OnlineTeamsStage` y es parte de la siguiente tarea online.
- Sin descartes de técnicos (el ADR proponía 2).
- QA visual manual NO ejecutada.
