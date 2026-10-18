# CODEX-005H · H3 — Tres suplentes opcionales

18/10/2026. Base `e03b562` (H2), rama `codex/current-club-audit`. **Operativa**: no está detrás de ningún flag desactivado; se habilita en Partida Personalizada con la casilla «Tres suplentes por equipo».

## Qué se hizo
- **Composición centralizada** (`matchConfig.ts`): `SUBSTITUTE_POSITIONS = [DEF, MED, DEL]` (sin arquero suplente) y `rosterComposition(config)` → 1/5/4/4 con suplentes (14 por equipo), `rosterSize`. Cambiar la distribución es tocar esa constante.
- **Reclutamiento** (`auctionEngine.ts`): `RecruiterTeam.bench` (3 espacios fijos por línea, solo con suplentes). Un fichaje ocupa primero un puesto titular libre de su línea y, si no hay, el suplente de esa línea (`placeInTeam`). Capacidades, viabilidad (`canFinishRounds`), cupos, oferta máxima segura, descartes y validación final usan la misma capacidad. El sorteo pasa de 22 a **28 cartas exclusivas** (`2×composición`: 2 ARQ, 10 DEF, 8 MED, 8 DEL); los tres descartes compartidos siguen igual. En clásico nada cambia (22 cartas, sin `bench`).
- **Preflight** (H2) ahora considera 14 jugadores: con presupuesto insuficiente se bloquea el inicio y se explica el mínimo por equipo (probado con precios de 8M: 11×8=88 pasa, 14×8=112 no).
- **Completado automático de la CPU y «Completar mi equipo»** (C3E): cuentan titulares y suplentes (`isRosterComplete`), y la vista previa/costes incluyen a los suplentes. CPU y HUD usan la misma capacidad; el HUD muestra Fichajes x/14 y cupos 1/5/4/4.
- **Pantalla de equipo**: «TITULARES (11/11)» sobre la cancha y «SUPLENTES (n/3)» debajo con tres espacios; al tocar un suplente se abre su carta con la posición general. Un suplente no puede estar en el campo (jugadores exclusivos verificados).
- **Sustituciones en el partido** (`simulator.ts`, política `subs-v1`): a los minutos 45, 60 y 75, cada equipo con suplentes sin usar hace **un** cambio con probabilidad 0,45 (`SUBSTITUTION_CHANCE`); entra un suplente al azar y sale un titular original **de su misma línea** (nunca el arquero). Máximo tres por equipo (el banco), el que sale no vuelve, siempre once en cancha. Los sectores (`calculateTeamStrength`) y los rasgos tácticos se **recalculan** con el nuevo once desde ese bloque, la posesión usa el promedio de los once reales y el relato emite un evento `substitution` (minuto, entra, sale). Es reproducible: usa su propia semilla `${seed}:subs`, así que el flujo aleatorio principal y todos los resultados clásicos permanecen idénticos (los 300 resultados v2 y los 288 tácticos grabados siguen reproduciéndose). Resultado: `result.substitutions`/`result.benches`. Un banco inválido (duplicado, dentro del once, más de tres) se rechaza con `invalid_match_bench`.
- **Versionado**: `local-match-v2` no cambia para partidas sin banco; las sustituciones se identifican con `subs-v1` en el resultado.
- i18n es-AR/en/pt-BR (casilla, resumen, títulos, relato).

## Calibración (`docs/qa/CODEX-005H-H3-calibration.json`, 4.000 partidas, mismos planteles y banco en ambos lados)
- Cambios por equipo: media 1,336 (local) y 1,327 (CPU), esperado 3×0,45 = 1,35. Distribución por equipo (0/1/2/3 cambios): local 676/1.665/1.297/362, CPU 657/1.707/1.308/328. Ninguno supera tres; no todos los partidos tienen cambios.
- Por minuto: 45 → 3.565, 60 → 3.491, 75 → 3.596 (uniforme).
- Resultados con equipos idénticos: 1.176 victorias locales, 1.146 visitantes, 1.678 empates (diferencia 0,75 %, ruido de muestreo): sin sesgo de orden.
- La política es una decisión de producto inicial; no busca un porcentaje de victorias.

## Pruebas
`typecheck`, `lint`, `build` correctos (solo el aviso de tamaño del paquete); `npm test`: 602 aprobadas de 602 (589 antes; +13). Cubren: composición y preflight, 28 jugadores exclusivos por partida contra CPU y entre humanos con presupuestos respetados, clásico intacto, HUD x/14, completado automático con banco, reproducibilidad, eventos vs. marcador, cumplimiento de todas las reglas de sustitución (≤3, solo del banco, misma línea, sin repetir, sin arquero, once distinto), bancos inválidos, efecto real sobre el motor (un suplente 99 vs 40 con el mismo número de ingresos produce más goles), relato en inglés, pantalla de equipo con tarjeta de suplente y la configuración. Los goldens clásicos no cambiaron.

## Límites
- La mejor jugada de reordenar titulares (H1) no incluye intercambios banco-campo (los cambios son automáticos).
- QA visual pendiente (suplentes en 360/390 px). Calidad estratégica de la CPU con 14 jugadores solo verificada por simulación, no por playtest.

## Probar en Firefox
Personalizada → «Tres suplentes por equipo» → Iniciar. Fichá hasta tener 14, mirá TITULARES/SUPLENTES y tocá un suplente. Jugá el partido y buscá líneas «Cambio en…» alrededor de los minutos 45, 60 y 75.

## Git
Commit local `feat(reclutador): H3 optional substitutes`. Sin push.
