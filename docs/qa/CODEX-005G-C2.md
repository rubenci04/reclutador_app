# CODEX-005G-C2 — Primera versión del motor táctico

17/10/2026. Base `465741b` (C1), rama `codex/current-club-audit`, árbol limpio al comenzar. Ejecutada con Claude Code. Alcance: capa táctica pura dentro de `local-match-v2`; la interfaz de elección secreta es C3.

## Qué se hizo
- `src/features/tactics/strategies.ts`: seis identificadores estables (`NEUTRAL`, `MIDFIELD_CONTROL`, `WIDE_PLAY`, `COUNTER_ATTACK`, `HIGH_PRESS`, `LOW_BLOCK`), perfil documentado de cada una (objetivo, condiciones favorables, ventajas, riesgos y «exposición» al rival), contrato versionado `StrategySelection` (`tactics-v1`) y `parseStrategySelection`, que rechaza identificadores o versiones desconocidos sin corregirlos.
- `src/features/tactics/tacticalModel.ts`: `tacticalFeatures` (siete rasgos desde los futbolistas colocados en cada puesto) y `tacticalAdjustment` (función pura que devuelve ajustes de ataque, defensa y mediocampo).
- `src/features/local-match/simulator.ts`: el simulador aplica el ajuste por bloque de tiempo sobre los sectores existentes (iniciativa, tiro, definición, posesión). Los sectores base y el poder global no cambian. `SimulationInput.tactics` es opcional: sin él, ambos equipos son `NEUTRAL`.
- `MatchResult.tactics` (opcional) guarda estrategias y ajuste medio por lado. Los resultados anteriores sin ese campo equivalen a NEUTRAL contra NEUTRAL.
- `startDuelMatch(game, catalog, strategies?)` valida los dos onces y las estrategias y devuelve `teams_invalid` o `invalid_strategy` en lugar de lanzar excepciones; guarda `game.strategies`.
- `selectCpuStrategy(lineup, catalog, seed)`: la CPU decide solo con su once y una semilla propia; la firma no recibe la estrategia humana.
- Textos de estrategia (nombre, objetivo, condiciones, ventajas, riesgos) y el error `invalid_strategy` en es-AR, en y pt-BR, listos para C3. Sin cambios de interfaz: el flujo de C1 sigue igual y el partido usa NEUTRAL.

## Fórmulas (`tactics-v1`)
Calidad de un rasgo: `q(x) = clamp((x − 72) / 18, 0, 1)`. Exposición del rival (`E`): `spaceBehind`, `compactness`, `pressing`, `buildUp`, `width` (ver `STRATEGY_PROFILES`). Cada sector se limita a ±10 puntos.

Rasgos (SIMPLIFICACIÓN DEL SIMULADOR: aproximaciones desde ATT/DEF/PHY/MEN; no son aptitudes individuales verificadas y `RoleAptitude` sigue siendo `UNKNOWN` sin efecto):
- `flankThreat = 0,7·ATT(LW,RW) + 0,3·(ATT+PHY)/2(LB,RB)`; `fullbackDefense = DEF(LB,RB)`.
- `midfieldControl = media(0,6·MEN + 0,4·ATT)` de LCM, CDM, RCM.
- `transitionThreat = (ATT+PHY)/2` de LW, ST, RW; `stamina = PHY` de LCM, CDM, RCM, LW, ST, RW.
- `centralDefense = 0,5·DEF(LCB,RCB) + 0,2·DEF(CDM) + 0,3·DEF(GK)`; `backlineRecovery = PHY` de LB, LCB, RCB, RB.

Ajustes (G = ganancias de `TACTICAL_GAINS`; `b` = bloque 0–5):
- MIDFIELD_CONTROL: mediocampo `+9·q(midfieldControl)·(1 − 0,5·E.compactness − 0,35·E.pressing)`; ataque `−2,5`.
- WIDE_PLAY: ataque `+9·q(flankThreat)·(1 − 0,5·q(fullbackDefense rival))·(1 + 0,15·E.compactness)`; mediocampo `−2,5`; defensa `−1,6`.
- COUNTER_ATTACK: ataque `+10·q(transitionThreat)·E.spaceBehind`; defensa `+1,6·q(centralDefense)`; mediocampo `−3,6`.
- HIGH_PRESS: `potencia = q(stamina)·(1 − 0,6·q(midfieldControl rival)·E.buildUp)·(1 − 0,5·(b/5)·(1 − q(stamina)))`; mediocampo `+8·potencia`; ataque `+3,2·potencia`; defensa `−5,6·(1 − 0,5·q(backlineRecovery))`.
- LOW_BLOCK: defensa `+8·q(centralDefense)·(1 − 0,35·E.width)`; ataque `−4,5`; mediocampo `−2,8`.
- Posesión mostrada: usa el mediocampo base más el ajuste medio de los seis bloques.

No hay tabla fija de ganadores. Las interacciones salen de parámetros graduales (exposición) multiplicados por la composición de ambos planteles. No hay bonificación por presupuesto, ni cambios en el catálogo o los ratings.

## Resultados antes / después
**NEUTRAL (compatibilidad).** 300 resultados grabados con el simulador v2 antes de modificarlo (`src/features/tactics/v2-golden.json`: 2 pares de planteles reales × 150 semillas; huella de bloques, estadísticas, marcador, sectores y ganador). El simulador nuevo los reproduce de forma idéntica sin estrategia y con `NEUTRAL`/`NEUTRAL`.

**Calibración táctica** (`tacticalCalibration.ts`; archivos `CODEX-005G-C2-calibration*.json`). Planteles reales del catálogo generados por la CPU. Se mide «puntos» por partido (victoria 1, empate 0,5) del lado local.
- Equivalentes: 3 plantillas, cada una contra sí misma, 36 pares de estrategias × 500 semillas por plantilla = 54.000 partidos.
- Distinta fortaleza: el mejor y el peor plantel de 40 generados (rating medio 86 y 84; diferencia pequeña porque el presupuesto limita la dispersión), 36 pares × 1.000 semillas en cada orientación = 72.000 partidos.

| Iteración | Ganancias | Puntos medios, equivalentes (NEU / CON / BAN / CTR / PRE / BLO) | Rango por par |
|---|---|---|---|
| v0 | primeras (límite ±6) | 0,511 / 0,507 / 0,510 / 0,523 / 0,503 / 0,522 | 0,482–0,539 |
| v1 | v0 × 1,6 (límite ±10) | 0,509 / 0,502 / 0,509 / 0,529 / 0,499 / 0,524 | 0,462–0,552 |
| final | v1 con costes de CTR y BLO revisados | 0,511 / 0,504 / 0,511 / 0,526 / 0,502 / 0,518 | 0,468–0,550 |

Motivo de las revisiones: en v0 el efecto de elegir estrategia era del orden del ruido; v1 escala todas las ganancias por igual (decisión por la sensibilidad del motor, no por un porcentaje deseado). Contraataque y bloque bajo quedaban con ventaja neta incondicional, así que en la versión final se subieron sus costes y se bajó la defensa gratuita del contraataque. No se buscó un porcentaje de victorias objetivo.

Equipo fuerte contra débil (puntos del fuerte, versión final): 0,552 con NEUTRAL; 0,538–0,561 con cualquier estrategia; rango por par 0,485–0,578. Débil contra fuerte (local): 0,449–0,493; el contraataque es la que más ayuda al plantel inferior (0,493 frente a 0,464 de NEUTRAL).

Simetría: la mayor diferencia entre el par (A,B) y el par intercambiado (B,A) fue 0,038. Espejo NEUTRAL (plantel idéntico): 410 victorias, 715 empates, 375 derrotas en 1.500 partidos; diferencia del 2,3 %, dentro del ruido de muestreo (≈1,2 desviaciones), sin evidencia de sesgo de orden.

## Conclusiones y riesgos
- Ninguna estrategia domina ni está garantizada: ningún par supera 0,58 de puntos y ningún equipo superior llega a la certeza.
- **Efecto pequeño.** El motor v2 es poco sensible a los sectores (un punto de sector ≈ 1 % de puntos), y el tope de ±10 mantiene el ajuste moderado. En planteles medios, la elección táctica mueve entre 1 y 4 puntos porcentuales. Si el playtest la siente irrelevante habría que tocar el modelo de eventos (no solo las ganancias); no se hizo aquí para conservar v2 para NEUTRAL.
- **Contraataque y bloque bajo** conservan una ventaja media de 1,5–2 puntos porcentuales sobre NEUTRAL. Es pequeña pero estadísticamente distinguible; conviene vigilarla en C3 con planteles reales de partidas.
- Los rasgos son aproximaciones por atributos; los jugadores desubicados (p. ej. un delantero en un puesto de mediocampo) no pueden darse porque C1 solo permite reordenar dentro de la línea.
- La muestra de equipos desiguales tiene una brecha de rating pequeña (86 contra 84). Falta una prueba con brecha grande de partidas reales.
- Los parámetros de exposición del rival (`StrategyExposure`) son decisiones editoriales no validadas con datos de fútbol real.

## Validación en el límite del motor
`isValidOrganizedLineup` (simulador) exige exactamente los once puestos, jugadores exclusivos del catálogo, cada uno en un puesto de su línea y presupuesto válido. `startDuelMatch` la ejecuta antes de simular y devuelve `teams_invalid`. La confirmación de la pantalla de C1 sigue siendo estado de interfaz; en el online futuro la confirmación debe ser una validación autoritativa del servidor que ejecute esta misma comprobación y la de estrategias.

## Pruebas reales
- `npm run typecheck`, `npm run lint` y `npm run build`: correctos.
- `npm test`: 524 aprobadas de 524 (512 en C1; +12 en tácticas: compatibilidad v2 con 300 resultados grabados, contratos, límites y costes/beneficios, interacciones, puestos organizados, determinismo y coherencia eventos-marcador para los 36 pares, validación del límite, CPU y calibración reducida).
- Calibración completa: `TACTICS_CALIBRATION=write npx vitest run src/features/tactics/tacticalCalibration.test.ts` regenera `CODEX-005G-C2-calibration.json` (≈25 s). En `npm test` corre una muestra reducida con las mismas aserciones.
- No se probó nada en navegador: no hay cambios visuales.

## Guía de integración para C3
1. Elegir estrategia después de «Confirmar once» y antes de iniciar el partido; cada participante elige sin ver la del otro (por turnos en hot-seat, ocultando la pantalla; CPU con `selectCpuStrategy(lineup, DRAFT_CATALOG, game.seed)` antes de revelar).
2. Llamar `startDuelMatch(game, DRAFT_CATALOG, { recruiter_one, recruiter_two })`; manejar `invalid_strategy` y `teams_invalid` con `duel.errors.*`.
3. Textos: `tactics.strategies.<ID>.{name,objective,favorable,advantages,risks}` ya existen en los tres idiomas.
4. Narración y explicación: `result.tactics.selection` y `result.tactics.adjustments` (ajuste medio por lado) permiten mostrar por qué una estrategia ayudó o costó.
5. Antes de C3 sería útil jugar varias partidas manualmente y decidir si el efecto táctico debe ser más fuerte (ver riesgos).
6. Online: guardar la selección en servidor, validar con `parseStrategySelection` y simular una sola vez con la semilla de la partida.
