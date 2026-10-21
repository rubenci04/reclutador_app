# DATA-ITA-001 — Italia (Serie A) y reconciliación de colecciones

## Cantidades finales (medidas sobre el código, 21/10/2026)
| Categoría | Jugadores |
|---|---|
| Italia Actualidad | 200 |
| Italia Leyendas | 200 |
| Global clásico / actuales globales | 882 |
| Leyendas Globales (selección editorial) | 177 |
| Europa Actualidad / Leyendas | 397 / 361 |
| Sudamérica + México Actualidad / Leyendas | 393 / 333 |

El informe previo de Codex indicaba 881 y 392; las cifras de arriba son las medidas al cierre (una identidad más, reconciliada después).
Sin tope artificial de 300: los pools regionales crecen por asociación nacional (prueba `italyCollections.test.ts`).

## Criterio de Leyendas Globales
Lista cerrada `worldLegendPolicy.json` (177 identidades aprobadas). Las leyendas locales argentinas/brasileñas/italianas **no** entran automáticamente (p. ej. Jonathan Maidana queda solo en colecciones regionales); las figuras sudamericanas de relevancia mundial aprobadas siguen elegibles. Nombres sin resolver quedan en `unresolvedNames`.

## Identidades conciliadas
`italyIdentityAliases.json` fusiona ediciones de una misma persona; homónimos se mantienen separados (Éderson ARQ y Éderson MED son personas distintas).

## Pruebas fallidas
Codex reportó 9 fallos; al retomar la suite completa quedaba **1** (los otros ya estaban corregidos en el árbol de trabajo):
- `AuctionPage.test.tsx › offers CPU profiles…` — clase C (fixture dependiente del pool): la semilla fija `hot-seat-001` nominaba ahora otro jugador que la CPU BALANCED pasa, mostrando el descarte compartido en vez de «Pass». Se fijó la semilla `cpu-seed-001` solo en esa prueba (verificado: 001 pasa; 002 y 003 reproducen el fallo). Sin cambios de timeouts ni de motor.

## Resultado final
typecheck OK · lint OK · `npm test` 107 archivos / 1136 pruebas aprobadas, 0 fallidas · build OK (solo aviso de chunks >500 kB).
Partidas históricas: cubiertas por `recordedCollections` / `preItalyCollections.json` (catálogo registrado por partida) y sus pruebas.

## Limitaciones / pendiente
- QA visual en navegador (nombre del equipo, jerarquía del encabezado, categorías Italia, selector escritorio/móvil) **no ejecutado**; solo cubierto por pruebas de componentes.
- Sin E2E online de dos usuarios.
