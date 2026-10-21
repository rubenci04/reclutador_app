# DATA-MX-001 — Liga MX, Top 150 y normalización de fichas

## Importación Liga MX
`scripts/import-liga-mx.mjs` lee `docs/ranking_liga_mx_2026_top_150_actuales_y_150_leyendas.txt` (SHA-256 y línea original conservados) y genera `src/data/league-collections/mexico.json`: 150 actuales + 150 leyendas, IDs `import_mex_act_###` / `import_mex_leg_###`, `sourceRank` editorial, OVR original (sin alterar por el orden del ranking), posición táctica original en `sourcePosition` (mapeada a ARQ/DEF/MED/DEL), pie, club de referencia y período (leyendas). Sin atributos individuales inventados. Modos nuevos: `MEXICO_CURRENT`, `MEXICO_LEGENDS` (selector, es-AR/en/pt-BR). Se agregó `ZAM` a los códigos de nacionalidad válidos (un registro zambiano).

## Top 150 (fuente maestra ≠ catálogo elegible)
Cada liga ofrece los puestos `sourceRank` 001–150 por edición: Argentina, Brasil, Inglaterra, España, Italia y México = 150 actuales + 150 leyendas (validado por rango, no por OVR). Italia conserva los 400 registros maestros (`italy.json`, `MASTER_CATALOG`); `ELIGIBLE_LEAGUE_PLAYERS` excluye 151–200 de partidas nuevas. Los catálogos de partidas anteriores quedan congelados en `preItalyCollections.json` y `preMexicoCollections.json` (membresía de 6f0c706) y se reconocen por `recordedCollections`.

## Tamaños nuevos
| Colección | Antes (6f0c706) | Ahora |
|---|---|---|
| Europa actual / leyendas | 397 / 361 | 366 / 327 |
| Sudamérica + México actual / leyendas | 393 / 333 | 525 / 467 |
| Global actual | 882 | 981 |
| Leyendas Globales (lista editorial cerrada) | 177 | 177 |
Sin tope de 150 en combinados. Un mexicano o argentino que juega en México entra a Sudamérica + México por nacionalidad; Paulinho (Portugal, Toluca) entra a Europa.

## Identidades conciliadas (`mexicoIdentityAliases.json`)
Ángel Correa (ARG), Keylor Navas, Hugo Sánchez, Isidro Lángara, Emilio Butragueño, Ronaldinho (BRA + ESP) y Claudio López. Homónimos separados: Paulinho (POR vs BRA), Alan Franco (ARG vs ECU), João Pedro, Romero, etc.

## Correcciones de fichas (todas las ligas)
- Posición específica: antes `playtest.roles.<texto completo>` (clave inexistente en Italia/México); ahora códigos tácticos entre paréntesis (`specificRoleCodes`) traducidos; se añadieron CAD, CAI y SD.
- Club: `ClubBadge` usa el club editorial como respaldo (antes «club desconocido»/`club_tag`); etiqueta «Club de referencia»; período `1974–1979` desde `sourceClubPeriod`, sin «período desconocido»; se eliminó el nombre de archivo y los `sourceStatus` técnicos de la ficha principal.
- Nacionalidad con nombre localizado (Intl.DisplayNames + naciones del Reino Unido traducidas).
- Nuevo `FootIcon` (dos pies, derecho/izquierdo/ambos/desconocido, `dir="ltr"`, nombre accesible localizado) reutilizado en la ficha principal.

## Pruebas
`typecheck`, `lint`, `build` OK; `npm test`: 109 archivos, 1182 pruebas aprobadas. Nuevas: `mexicoCollections.test.ts`, `PlayerCardNormalization.test.tsx`. Expectativas actualizadas deliberadamente (9 categorías; Italia 150 elegibles; 1.900 filas maestras). Cambios de prueba no triviales:
- `coachContext`: `MEXICO_CURRENT` usa técnicos activos como Italia actual.
- `collectionBalance` (rareza S+ en Global): el pool global creció y la muestra de 160 sorteos daba 5 vs 4,5 por ruido; se subió a 480 sorteos, sin tocar umbrales ni la política de rareza.

## Limitaciones
- QA visual: el panel del navegador se abrió y confirmó en el DOM las categorías «Liga MX · actualidad 2026/leyendas», pero las capturas salieron en negro (problema de renderizado del panel). No hay capturas de fichas ni del selector móvil; solo pruebas de componentes.
- Sin E2E online de dos usuarios.
- No se tocaron presupuestos, subastas, simulación ni técnicos.
