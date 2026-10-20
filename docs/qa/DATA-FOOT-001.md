# DATA-FOOT-001 — Integración del pie dominante

Fecha de entrega: 20/10/2026 (America/Buenos_Aires). Base: aef35f3, confirmada con origin/main tras fetch. Rama: `codex/data-foot-001`.

## Cobertura y conservación

| Control | Resultado real |
|---|---:|
| Registros Excel/JSON/catálogo | 1.200 / 1.200 / 1.200 |
| Correspondencias exactas `(league, sourceId)` | 1.200 |
| Argentina / Inglaterra / Brasil / España | 300 / 300 / 300 / 300 |
| RIGHT / LEFT / BOTH / UNKNOWN importados | 914 / 275 / 11 / 0 |
| Claves duplicadas, sin mapear o discrepantes | 0 / 0 / 0 |
| OVR de fuente inferiores a 75 conservados | 87 |

Excel: `docs/catalogo_1200_jugadores_futbol_pie_dominante.xlsx`. SHA256 real y esperado: `24ed851b0c406fda4ad8b5329c466e092bda23c01df878dde32ec8eb32d14c76`. JSON: `docs/reclutador_pie_dominante_1200_importacion.json`.

La auditoría OOXML compara las 1.200 filas de Listado_Unificado, liga original, sourceId, nombre completo, pie original y sourceRating con el JSON. También compara por ID los pies de cada hoja individual de liga (300 cada una). El importador exige ambas claves exactas y verifica nombre/OVR como controles adicionales, nunca como mecanismo de emparejamiento. No hubo discrepancias que resolver por aproximación.

Los hashes de todos los campos previos de `LEAGUE_PROVENANCE` y `LEAGUE_PLAYERS` coinciden con los capturados antes del cambio. Acreditan conservación de IDs, nombres, valoraciones, precios, categorías, clubes, nacionalidades, posiciones y procedencia. Los 87 valores inferiores a 75 siguen en la fuente y el juego conserva el piso anterior de 75. No se promocionan las referencias Cxx de Brasil/España a URLs verificadas.

## Contrato y presentación

`Player.dominantFoot?: DominantFoot`, con RIGHT/LEFT/BOTH/UNKNOWN. Omisión legacy aceptada; undefined equivale a UNKNOWN. Null, etiquetas en español y valores ajenos al enum son inválidos. No requiere reescribir fixtures históricos, migrar partidas ni incrementar versiones.

Se transmite a las colecciones importadas y a sus representantes existentes en Global. Los representantes legacy sin dato siguen en UNKNOWN; no se rellenan mediante nombres ni se reemplazan por otra edición para conseguir cobertura aparente.

La ficha incorpora un span en la línea de identidad, sin párrafos nuevos ni distinción exclusiva por color. Etiquetas completas visibles y accesibles: Diestro/Zurdo/Ambidiestro, Right-footed/Left-footed/Both-footed, Destro/Canhoto/Ambidestro. UNKNOWN: Sin verificar/Unverified/Não verificado. Los textos accesibles incluyen el contexto de pie dominante traducido.

## Pruebas ejecutadas

| Comando | Resultado |
|---|---|
| `npm run typecheck` | PASS, salida 0 tras corregir el tipo del test legacy |
| `npm run lint` | PASS, salida 0 tras corregir variable sin uso |
| `npm test` | PASS, 76 archivos, 875 pruebas, 76,66 s |
| `npm run build` | PASS, salida 0; 245 módulos, aviso de chunks >500 kB |
| `npm run catalog` | PASS, salida 0; 1.200 matches, conteos exactos y procedencia intacta |
| `python scripts/audit-foot-workbook.py` | PASS con Python incluido en el runtime; lectura completa de las cinco hojas de datos |

Las 17 pruebas nuevas cubren cruce, duplicados, distribución, conservación completa, validación legacy, Global y nueve modalidades importadas, etiquetas/accesibilidad en tres idiomas y regresión determinista. Las 240 huellas previas abarcan Global actual/leyendas y cuatro ligas actuales, diez semillas y cuatro motores (clásico, action-v1/v2/v3). Coinciden los resultados completos tras excluir únicamente la nueva propiedad en los objetos Player; además se repiten con cada pie canónico en todos los jugadores (960 casos adicionales). No se modificaron fórmulas, RNG, estrategias, formaciones ni versiones. `ROLE_PROFILES` sigue vacío.

Salida de la suite: [DATA-FOOT-001-test-output.txt](DATA-FOOT-001-test-output.txt). Referencia previa: [DATA-FOOT-001-baseline.json](DATA-FOOT-001-baseline.json). Las pruebas existentes también conservaron sus regresiones históricas.

## Revisión visual y límites

Navegador real sobre Vite local: primer jugador de una subasta argentina, Luis Espino. Verificados Zurdo, Left-footed y Canhoto, contexto accesible localizado y cambio de idioma sin cambiar el futbolista. Vistas de 360 y 390 px: ancho de contenido 345 y 375 px respectivamente, sin desborde horizontal observado; etiqueta completa dentro de la ficha. Se revisó captura móvil y se restableció el viewport y el idioma inicial. [Captura a 390 px](DATA-FOOT-001-mobile.png).

La matriz DOM cubre los cuatro valores y el legacy en los tres idiomas. No se realizó una revisión visual exhaustiva de las 1.200 fichas, ni una sesión con lector de pantalla. El navegador mostró un aviso existente de historial no disponible; esa persistencia no se modificó. El build advierte sobre tamaño del bundle; optimizarlo no pertenece a esta entrega.

Los datos del adjunto se importan como aportados: la coincidencia técnica no acredita exactitud biográfica externa. Quedan pendientes la revisión editorial de pie por fuente, la resolución documental de códigos de Brasil/España y la eventual cobertura de registros legacy. No se iniciaron esas actividades ni se infirieron roles por pie.

## Archivos entregados

- Contrato/dominio: `src/types/player.ts`, `src/features/player-catalog/dominantFoot.ts`, `validatePlayer.ts`, `leagueCollections.ts` y `src/data/league-collections/players.json`.
- Ficha: `src/features/recruiter-duel/PlayerIdentity.tsx` y los tres diccionarios `src/i18n/locales/*/common.json`.
- Pruebas: `dominantFoot.test.ts`, `PlayerIdentity.foot.test.tsx` y referencia previa de QA.
- Importación/auditoría: ambos adjuntos originales en docs, `scripts/audit-dominant-foot.mjs`, `scripts/audit-foot-workbook.py` y comando catalog en package.json.
- Documentación: contrato CATALOG_DATA, tablero, log e informe/evidencia de este encargo. Roadmap, decisiones y planes históricos conservados.

Cambios ajenos en `.claude/` y `docs/qa/CODEX-005C-stress.json` excluidos de la entrega. Sin push, deploy, migraciones remotas ni cambios a Supabase.
