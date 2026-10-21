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
- Online: la sala nueva crea la partida con técnicos y cada persona contrata el suyo en la etapa de equipos (sin cambios de servidor: la configuración viaja en el estado). Las salas ya creadas conservan su configuración anterior, sin técnicos.
- Sin descartes de técnicos (el ADR proponía 2).
- QA visual manual NO ejecutada.

## Orden al terminar las subastas
1. Once titulares. 2. Técnico (contratar o «Sin técnico»). 3. Suplentes con el saldo que queda: hasta 3, uno por línea (DEF, MED, DEL), del grupo de descartados de la partida y, si faltan, extras sorteados del mismo catálogo (3 por línea como máximo en el grupo); solo mientras ambos reclutadores conserven dinero.

## Revisión de simulación y mercado — 18/10/2026

Actualiza las reglas anteriores sin borrar su historia:
- Continúan 100 técnicos: 70 actuales y 30 leyendas, con 54 argentinos. El catálogo ya estaba implementado; se corrigieron once fichas parcialmente con fuentes (research/COACH_REVIEW.md). La verificación completa de equipos y biografías sigue pendiente.
- Nuevas partidas: reserva elegible de 1 a 8M, por defecto 8M, que forma parte de MatchConfig y del contexto exportado. Configuraciones antiguas sin coachReserve conservan 1M; sin técnicos, 0M. Online nuevo usa 8M; las salas existentes conservan su configuración.
- Precios intactos: D 1M, C 2M, B 3M, A 5M, S 8M. Al reservar 8M cada oferta de seis incluye un técnico S y otro de 1M; doce IDs distintos entre ambos participantes. Con menos reserva se conserva el sorteo anterior, sin prometer un S.
- La contratación usa el saldo real tras el once, antes de los suplentes. El sobrante sigue disponible; se puede rechazar el técnico.
- Afinidad: foco ATTACK con WIDE_PLAY/COUNTER_ATTACK, DEFENSE con LOW_BLOCK, MIDFIELD con MIDFIELD_CONTROL/HIGH_PRESS: bonus base ×1,15; BALANCED con cualquier táctica no neutral: ×1,05. Máximo 3 puntos por sector. NEUTRAL conserva el bonus previo. La afinidad se calcula al revelar la táctica y se guarda en el resultado.
- Cartas con nombre/apellido, actual/leyenda, edad aproximada o años de vida, club/selección de referencia, nivel, foco, precio y bonus base. Todos los textos en es-AR/en/pt-BR.

## Selección editorial COACH-FLOW — 20/10/2026

Catálogo combinado: 120 técnicos, 65 S (54,17 %), con 32 leyendas y 33 actuales elegidos explícitamente. Los promovidos usan precio 8M y bonus S existentes. Contratos contextuales con precio reducido conservados. Técnico primero, luego suplentes/once y confirmación antes de tácticas. Ver qa/COACH-FLOW.md.

## COACH-006 — 21/10/2026
Mercado `coach-market-v2`: seis cartas asequibles, 20 técnicos de Serie A y Liga MX con fuente y años. Ver qa/COACH-006.md.
