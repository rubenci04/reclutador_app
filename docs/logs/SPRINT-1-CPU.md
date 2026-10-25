# Sprint 1 — CPU de subastas HARD más competitiva

Medición: `GLOBAL_CLASSIC`, presupuesto 160M, `CLASSIC_CONFIG` + `DISCARDS_MARKER_V2`, sin técnicos. Tres humanos simulados (ingenuo, cazador de estrellas, comprador de valor). 100 semillas en NORMAL/HARD BALANCED, 40 en el resto. Datos: `docs/qa/SPRINT-1-cpu-baseline.json` y `SPRINT-1-cpu-after.json`; script `cpuSprint1.measure.test.ts` (`CPU_MEASURE=<etiqueta> npx vitest run src/features/recruiter-duel/cpuSprint1.measure.test.ts`).

## Diagnóstico (antes)
- HARD dejaba ~49M sin gastar contra el cazador de estrellas (22M contra el comprador de valor); ese humano acababa con ~3,7 estrellas OVR>=91 contra 0,8 la CPU.
- Su tope por ronda salía del precio base más un bonus pequeño; no se estiraba por estrellas aunque le sobrara presupuesto.
- Llenaba rápido sus puestos con cartas medias (OVR 85-88) al precio base; cuando aparecían las estrellas tardías ya no tenía puestos libres y el humano se las llevaba al precio base.
- El tope no dependía de la oferta vigente ni de cuánto valía la carta frente a los pares del puesto.

## Decisión (solo HARD, `cpuPolicy.ts`)
- Valor = precio + calidad + una prima por puntos de OVR sobre la mediana del puesto (catálogo público) × excedente por puesto libre; el dinero sin gastar vale cero, por eso el excedente por puesto empuja el tope cuando quedan pocos puestos.
- Selectividad: con más de 7 puestos libres pasa de cartas más de 1 punto por debajo de la mediana, y deja los puestos para cartas mejores.
- Pelea +2 por una carta de élite (>=4 sobre la mediana) cuando ya hay una oferta vigente.
- Sin cartas futuras, sin estrategia del humano, sin bonus en el partido; `maximumSafeBid` se sigue respetando. EASY y NORMAL: resultados idénticos al baseline.

## Antes / después (OVR medio del once de la CPU, promedio de las tres políticas)
| Dificultad | Antes | Después |
|---|---|---|
| EASY | 87,91 | 87,91 |
| NORMAL | 87,85 | 87,85 |
| HARD | 88,39 | 89,17 |

HARD vs NORMAL por humano: ingenuo +0,70 → +1,14; cazador +0,08 → +1,36; comprador de valor +0,85 → +1,45. Victorias de HARD: ingenuo 35 % → 37 %; cazador 26 % → 36 %; comprador 33 % → 37 %. Saldo sobrante de HARD: 20/49/22M → 15/19/8M.

## Objetivo y límites
- Cumplido: HARD >= NORMAL + 0,8 con los tres humanos; contra el comprador de valor el once de HARD (89,10) supera al humano (87,47); contra el ingenuo HARD gana 37 % (< 65 %).
- No cumplido: EASY < NORMAL solo se da contra el ingenuo (88,29 < 88,43); en promedio EASY 87,91 > NORMAL 87,85. No se tocó porque EASY/NORMAL deben quedar idénticos.
- Los empates dominan el partido (~42-47 %), por eso un OVR +1,2 sube solo ~8-10 puntos de victorias.
- El test `AuctionPage.test.tsx` fijaba una semilla cuyo primer jugador la CPU HARD ya no puja; se cambió a `cpu-seed-005`.
