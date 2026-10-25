# Sprint 7 — Descartes del cruce de categorías y pelea real de la CPU

## Parte A — 5 descartes en el cruce de categorías
- `createDualDraft` ahora toma el límite de `discardLimitOf(config)`: **5** con el marcador `discards-5-v1` (todas las partidas nuevas, CPU y dos jugadores en la misma computadora) y 3 solo para configuraciones sin marcador (`DUAL_DISCARDS_LEGACY`).
- Otros lugares con el 3 fijo corregidos: `DualDraftScreen` (puntos y texto «Descartes n/3», ahora con el total real) y el texto `discards.available` («{{count}}/3» → «{{count}}/{{total}}») en es-AR, en y pt-BR.
- La CPU nunca usa más de 5 (prueba con cuatro semillas); un humano puede descartar 5 y a la sexta se le fuerza la carta, terminando legalmente.
- **Online con categorías distintas (confirmado leyendo el código):** `createCrossCategoryDraw` arma los dos equipos de una vez con `generateCpuTeam` y deja la partida directamente en `TEAMS_COMPLETED`; `revealCoinToss` ve `categoryPair` con categorías distintas y pasa derecho a `TEAMS_COMPLETED` (sin subasta ni descartes). No se cambió esa mecánica. Como el contador de descartes no se puede usar ahí, el HUD ya no lo muestra (`discardsTotal = 0` cuando hay `categoryPair`). **Pendiente de decisión:** si se quiere que el cruce online tenga descartes/subasta, hace falta un sorteo en vivo compartido (hoy es un reparto automático e idéntico para ambos desde la semilla; además la semilla es visible, ver límites del Sprint 2).

## Parte B — Pelea real por los jugadores
### Qué decía la medición base (antes de tocar nada)
Humano **insistente** (contrapuja +1 hasta precio base + 6, y hasta el máximo seguro con OVR ≥ 91), cazador de estrellas y comprador de valor; GLOBAL_CLASSIC, 100 semillas por celda BALANCED y 40 para CONSERVATIVE/AGGRESSIVE. «Subida» = oferta de la CPU puesta sobre una oferta del humano; «disputada» = ambos pujaron. El diagnóstico del dueño se confirmó para NORMAL (0,9 subidas por carta, 0,7 % con 3 o más). HARD ya subía ~4 veces cuando el humano insistía, pero solo 1,5 contra el comprador de valor.

### Ajuste (`cpuPolicy.ts`)
- **NORMAL:** plan de gasto: tope = precio base + (dinero libre por puesto vacío × 0,45 × (0,9 + 0,3 × percentil de la carta) × perfil × factor oculto 0,7–1,3 por carta y semilla), nunca por debajo del tope anterior; +1 si es una carta de élite ya disputada; deja pasar las cartas claramente flojas (percentil < 20 %) mientras le sobran más de 6 puestos, así se usan los descartes.
- **HARD:** el mismo plan con más empuje (×1), sin quitar el cálculo anterior; se aflojó la selectividad (pasa solo cartas flojas con más de 8 puestos libres) y el premio por calidad, y el sobrante por puesto pesa más. Resultado: pelea por cualquier carta que le guste, no solo las mejores; el precio sube para los dos.
- **Incrementos (NORMAL y HARD):** sube el mínimo; si el humano saltó más de 1 sobre la última oferta de la CPU (dato público del historial) responde con un paso mayor; 25 % de las veces suma 1 más. EASY conserva el paso aleatorio de siempre.
- EASY no cambió (resultados idénticos al baseline). Se respeta `maximumSafeBid`; determinista por semilla. Sin cartas futuras, sin leer al humano, sin bonus de partido.

### Antes → después (BALANCED, 100 semillas)
| Humano | Dif. | Subidas CPU / carta disputada | % con 3+ subidas | Sobreprecio medio (disputadas) | Gasto CPU | Descartes/partida | OVR CPU (humano) | Victorias CPU en serie |
|---|---|---|---|---|---|---|---|---|
| insistente | EASY | 0.76 | 0 | 2.46 | 59.9 % | 3.5 | 87.12 (88.34) | 22 % |
| insistente | NORMAL | 0.93 → **1.99** | 0.73 → **19.98** | 2.91 → **4.93** | 67.6 → **71.8** % | 0.94 → **1.86** | 88.65 (88.23) | 42 → **57** % |
| insistente | HARD | 4.15 → **3.86** | 48.1 → **80.27** | 10.49 → **8.53** | 95.5 → **95.1** % | 0.37 → **0.13** | 88.18 (88.3) | 83 → **43** % |
| cazador de estrellas | EASY | 0.81 | 0 | 1.54 | 58.9 % | 1.12 | 86.35 (89.88) | 2 % |
| cazador de estrellas | NORMAL | 0.85 → **1.69** | 0.75 → **19.31** | 1.95 → **3.53** | 65.8 → **69.9** % | 0.27 → **0.2** | 87.63 (88.85) | 22 → **26** % |
| cazador de estrellas | HARD | 4.28 → **3.01** | 27.68 → **25.37** | 10.23 → **6.43** | 87.9 → **78.7** % | 0.11 → **0.13** | 88.19 (88.29) | 74 → **49** % |
| comprador de valor | EASY | 0.75 | 0 | 1.85 | 58.9 % | 2.1 | 86.32 (89.6) | 1 % |
| comprador de valor | NORMAL | 0.88 → **1.74** | 0.67 → **13.37** | 2.4 → **3.64** | 67.7 → **86.2** % | 0.68 → **0.1** | 88.26 (88.22) | 16 → **47** % |
| comprador de valor | HARD | 1.54 → **1.86** | 17.3 → **21.69** | 3.71 → **3.8** | 95 → **92.1** % | 0.12 → **0.01** | 88.52 (87.93) | 83 → **65** % |

Perfiles CONSERVATIVE y AGGRESSIVE (40 semillas, después):

| Humano | Dif. | Perfil | Subidas/carta | Sobreprecio | Gasto | Victorias en serie |
|---|---|---|---|---|---|---|
| cazador de estrellas | NORMAL | CONSERVATIVE | 1.53 | 3.11 | 69.4 % | 32.5 % |
| cazador de estrellas | NORMAL | AGGRESSIVE | 1.8 | 3.72 | 71.5 % | 30 % |
| cazador de estrellas | HARD | CONSERVATIVE | 2.6 | 5.49 | 75.6 % | 45 % |
| cazador de estrellas | HARD | AGGRESSIVE | 3.09 | 6.63 | 80.2 % | 57.5 % |
| comprador de valor | NORMAL | CONSERVATIVE | 1.59 | 3.41 | 81.5 % | 45 % |
| comprador de valor | NORMAL | AGGRESSIVE | 1.86 | 3.81 | 90.9 % | 57.5 % |
| comprador de valor | HARD | CONSERVATIVE | 1.87 | 3.76 | 91.9 % | 65 % |
| comprador de valor | HARD | AGGRESSIVE | 1.89 | 3.82 | 92.4 % | 67.5 % |
| insistente | NORMAL | CONSERVATIVE | 1.61 | 4.08 | 71.1 % | 65 % |
| insistente | NORMAL | AGGRESSIVE | 2.51 | 5.82 | 80.4 % | 67.5 % |
| insistente | HARD | CONSERVATIVE | 3.48 | 7.7 | 94.3 % | 57.5 % |
| insistente | HARD | AGGRESSIVE | 4.02 | 8.96 | 97.2 % | 45 % |

### Objetivos y límites
- **Cumplidos:** EASY ≤ 1,5 subidas (0,75-0,81); victorias en serie de HARD ≤ 65 % contra cada humano (49 / 65 / 43 %; contra el comprador de valor queda justo en el límite); NORMAL ≤ 55 % contra el comprador de valor (47 %); EASY ≤ 40 % contra el comprador de valor (1 %). Los descartes se usan más en NORMAL contra el insistente (0,9 → 1,9 por partida).
- **No cumplidos (y por qué):**
  - Sobreprecio HARD claramente > NORMAL > EASY: se cumple contra el insistente (6,5 > 5,0 > 2,5) y el cazador (2,7 > 1,8 > 1,4), pero **no contra el comprador de valor** (HARD 3,4 ≈ NORMAL 3,4; EASY 1,9): ese humano deja de pujar pronto y la diferencia de topes no se llega a pagar.
  - NORMAL ≥ 2,5 subidas por carta disputada: queda en 1,7-2,0 (de 0,9). Contra humanos que solo suben +1 sobre el precio base (cazador y comprador de valor) casi no hay margen para más subidas; con un tope mayor, NORMAL ganaba 60-80 % de las series, rompiendo el límite de 55 %.
  - HARD ≥ 4 subidas: 3,0 / 1,9 / 3,9 (antes 4,3 / 1,5 / 4,2). Al bajar la ventaja de calidad de HARD para cumplir el límite de 65 % en series (antes 74-83 %), bajó un poco el tope contra el cazador de estrellas. Contra el comprador de valor sube poco porque ese humano deja de pujar pronto.
  - Gasto de HARD ≥ 90 %: 95 % y 92 % contra insistente y comprador de valor, **79 % contra el cazador de estrellas** (se queda con las estrellas y a la CPU no le quedan cartas en qué gastar).
  - Orden por victorias en serie: contra el insistente NORMAL (57 %) supera a HARD (43 %). Ese humano gasta de más en cartas comunes y su equipo mejora cuando la CPU sube mucho; en OVR medio contra cazador y comprador de valor el orden EASY < NORMAL < HARD se mantiene.
- Compromiso central: en series una diferencia de 1-2 de OVR ya da 78-87 % al mejor equipo (Sprint 4); por eso la pelea se orientó a encarecer cartas y no a darle a la CPU un once mucho mejor (el OVR medio de la CPU en HARD queda a menos de 0,7 del del humano).

## Pruebas y archivos
- Nuevas: 5 descartes (CPU, humano, heredado, HUD), `cpuHard.test.ts` (carta contrapujada recibe más de una subida con semilla fija, subidas y sobreprecio EASY < NORMAL < HARD, ofertas bajo el máximo privado y seguro, determinismo, descartes en NORMAL, NORMAL fijado a `SPRINT-7-cpu-cells.json`, EASY a `SPRINT-4-cpu-easy.json`; ya no se afirma que NORMAL ignore la oferta vigente).
- `fullFlow.test.tsx`: la búsqueda de semilla jugaba un juego distinto al de la página (presupuesto 100 y dificultad NORMAL contra 160 y HARD de la página); ahora usa la misma configuración y exige al menos tres cartas pendientes para la secuencia de cierre.
- Datos: `docs/qa/SPRINT-7-bidding-baseline.json`, `SPRINT-7-bidding-after.json`, `SPRINT-7-cpu-cells.json`. Medición opt-in: `CPU_BIDDING=<archivo> npx vitest run src/features/recruiter-duel/cpuBidding.measure.test.ts`.
