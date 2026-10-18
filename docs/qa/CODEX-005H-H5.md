# CODEX-005H · H5 — Primer lote argentino ARG-B01

18/10/2026. Rama `codex/current-club-audit`. Datos en `src/data/argentina_collection_v1/ARG-B01.json`; validador en `src/features/player-catalog/argentinaBatch01.ts`.

## Resultado
- **50 registros** `arg_001`–`arg_050` (cupo del lote: 6 ARQ / 16 DEF / 15 MED / 13 DEL; completo). Namespace separado: **no** entran en `DRAFT_CATALOG` ni en el sorteo; el catálogo jugable sigue en 150 y el modo Global es el único activo.
- Selección por **haber jugado en clubes argentinos** (`playedInArgentina`), no por nacionalidad: 45 ARG y 5 extranjeros (3 COL, 1 PAR, 1 URU).
- Precio con `calculatePlayerPrice` (la prueba lo exige). Niveles: S 2, A 16, B 17, C 11, D 4 (sin concentración en S).
- Cada registro: id estable, nombre, nacionalidad, posición, cuatro atributos y overall, club de referencia, períodos por club en Argentina (años), motivos de inclusión, texto de evidencia y URL (Wikipedia, consultada 18/10/2026), estado editorial `SECONDARY_SOURCE_VERIFIED`.
- Hechos deportivos verificados (clubes, años, títulos) están separados de los ratings, que son **editoriales** y no verificables. No se asignaron roles específicos (sin fuente). Los títulos se transcribieron de las páginas consultadas; no se inventaron estadísticas.
- Sin duplicados con los 150 (nombre normalizado y alias) ni entre sí (`identityKey` única). Ningún Maradona/Pelé u otros ya reservados.

## Cobertura editorial (matriz)
- Por club de referencia: River 15, Boca 14, Estudiantes 3, Independiente 3, Vélez 2, Racing 2, Newell's 2, Lanús 2, Rosario Central 2, Argentinos 2, Talleres 1, Fiorentina 1, Inter 1.
- Por década de referencia: 1960s 1, 1970s 5, 1980s 10, 1990s 11, 2000s 15, 2010s 8.
- **Límite reconocido:** Boca + River suman 29 de 50 (58 %) como club de referencia; el interior y los años 60/70 están subrepresentados. Los períodos de carrera sí incluyen 31 clubes (Atlanta, Talleres, Belgrano, Instituto, Colón, Unión, Sarmiento, etc.). ARG-B02 debe reequilibrar hacia el interior, AMBA no tradicional y décadas tempranas.
- Cada jugador de más carrera fuera de Argentina (Batistuta, Milito, Higuaín…) conserva solo los períodos argentinos; las carreras europeas no se registran.

## Infraestructura
- `validatePlayer(input, allowedIds?)`: el parámetro opcional permite validar ids `arg_*`; por defecto sigue usando `plr_001–500` (comportamiento intacto).
- `clubRegistry`: 25 identidades de clubes argentinos agregadas (solo nombre, sin escudos ni paleta). Belgrano reutiliza `belgrano`.
- `ARGENTINA_CANDIDATES` permanece vacío (contrato de planificación); el lote vive en `ARG_B01`.
- El modo «Fútbol Argentino» queda **preparado, no habilitado**: no hay UI ni selector.

## Pruebas
`typecheck` OK. `src/features/player-catalog`: 406 pruebas aprobadas (incluye 6 nuevas de ARG-B01: validador, cuotas/niveles, unicidad frente a los 150, precio, criterio por clubes y rechazo de duplicado). Suite completa: 612 de 612 (606 antes); `lint`, `build` y `catalog:audit` (sin incidencias) correctos.

## Pendiente
- Revisión humana de ratings; verificación con fuentes primarias (AFA/clubes) de los títulos menores; B02–B04 (150 restantes).
