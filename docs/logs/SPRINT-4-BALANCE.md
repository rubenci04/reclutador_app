# Sprint 4 — EASY más fácil y equilibrio del simulador en series

Datos: `docs/qa/SPRINT-4-cpu-easy.json` (misma medición y semillas que el Sprint 1: GLOBAL_CLASSIC, 3 humanos simulados, 9 perfiles; 100 semillas en NORMAL/HARD BALANCED, 40 en el resto) y `docs/qa/SPRINT-4-sim-balance.json` (1.080 duelos CPU vs humano, ver Parte B). Scripts: `cpuSprint1.measure.test.ts` (`CPU_MEASURE=s4 CPU_OUT=...`) y `cpuSeries.measure.test.ts` (`CPU_SERIES=1`). NORMAL y HARD dan resultados idénticos a las mediciones previas (comparado celda por celda).

## Parte A — EASY (solo la rama EASY de `privateValuation`)
Cambio: la CPU Fácil (1) deja pasar el 30 % de las cartas del 50 % superior del puesto y, en las que puja, no pasa de precio base + 1; (2) paga hasta precio base + 2 por las cartas del 35 % inferior (le gustan las gangas), lo que llena sus puestos con jugadores flojos. Sin leer cartas futuras ni la estrategia del humano; determinista por semilla; respeta el máximo seguro.

| OVR medio del once CPU | EASY antes | EASY ahora | NORMAL | Brecha NORMAL − EASY |
|---|---|---|---|---|
| vs ingenuo | 88,29 | 86,70 | 88,43 | 1,74 |
| vs cazador de estrellas | 87,69 | 86,42 | 87,47 | 1,04 |
| vs comprador de valor | 87,76 | 86,42 | 87,65 | 1,23 |

Objetivo (>= 0,8): cumplido con los tres. No es absurda: completa un once legal (OVR medio ~86,5, 0,4-1,0 estrellas OVR>=91) y gasta ~95-100M de 160M (antes ~110M); victorias de la CPU Fácil 27-28 %. El orden de OVR es EASY < NORMAL < HARD con los tres humanos. Pruebas: `cpuHard.test.ts` (EASY fijada a la nueva medición, con justificación en el código; NORMAL sigue fijada al baseline del Sprint 1).
Se probaron variantes más duras (hasta 85,9 de OVR, 70M sin gastar) y se descartaron por absurdas.

## Parte B — Equilibrio del simulador (sin modificarlo)
Mismos once jugados dos veces: partida actual (`actionModel=true`, serie ida y vuelta con `resolveSeries`) y simulación rápida (partido único). Sin técnicos ni suplentes. «Mejor» = mayor OVR medio del once (empate: el humano).

**Equipos espejo (540 duelos, once de la CPU en ambos lados):**
| | Gana local | Gana CPU | Empate | Penales | Partidos/serie |
|---|---|---|---|---|---|
| Serie | 50,2 % | 49,8 % | — | 7,4 % | 2,34 |
| Rápida | 28,5 % | 28,7 % | 42,8 % | — | 1 |
Sin sesgo de lado. (Una primera corrida con semillas repetidas entre celdas dio 69/31 por correlación; las semillas ahora son únicas por celda.)

**Probabilidad de ganar según la diferencia de OVR medio del once (1.080 series):**
| Tramo | n | Serie: gana el mejor | Penales | Partidos | Rápida: mejor / empate / peor |
|---|---|---|---|---|---|
| 0–0,5 | 138 | 57,2 % | 3,6 % | 2,30 | 29,0 / 40,6 / 30,4 |
| 0,5–1 | 109 | 78,0 % | 4,6 % | 2,26 | 34,9 / 48,6 / 16,5 |
| 1–2 | 248 | 86,7 % | 5,6 % | 2,26 | 35,1 / 38,7 / 26,2 |
| 2–3 | 250 | 94,8 % | 2,8 % | 2,10 | 33,2 / 46,0 / 20,8 |
| >3 | 335 | 99,1 % | 0,0 % | 2,02 | 36,7 / 44,5 / 18,8 |

## Recomendación (no aplicada)
1. La serie sí premia tener mejor equipo, y mucho: +0,5 de OVR ya da ~78 % y +2 da ~95 %. El problema inverso es el probable: con la subasta fijando 1-2 puntos de OVR el resultado casi está decidido, así que el partido aporta poca incertidumbre.
2. La partida rápida premia casi nada (el mejor gana 33-37 % y empata 40-48 %): no sirve para medir calidad; conviene dejarla solo como demostración.
3. Si se quiere más emoción, tocaría la conversión de ventaja de fuerza a probabilidad de gol en `action-v3` (peso de la diferencia de sectores), no la serie ni los penales (7 % de series).
4. Versionado: crear `action-v4` con el parámetro nuevo y elegirlo solo al crear partidas nuevas (`startDuelMatch` guarda `actionModel` y `rulesVersion` en `matchResult`; `nextSeriesMatch` y `resolveSeries` ya leen esos campos del primer partido), sin reescribir `action-v3`; así el historial y las salas online en curso se resimulan igual.
5. Antes de decidir, repetir esta medición con técnicos y suplentes (no incluidos) y con tramos más finos entre 0 y 1 de OVR.
