# Colección Fútbol Argentino — planificación

Estado: 200/200 registros creados (ARG-B01..B04), revisión editorial pendiente; modo «Fútbol Argentino» habilitado como opción (ver docs/qa/CODEX-005H-ARG-MODE.md). Contrato: `argentina_collection_v1`, independiente de catalog_v1. Ver ADR-0009.

| Lote | IDs nuevos | Cupos ARQ/DEF/MED/DEL | Estado |
|---|---|---|---|
| ARG-B01 | arg_001–arg_050 | 6/16/15/13 | Creado (50/50, revisión editorial pendiente); ver docs/qa/CODEX-005H-H5.md |
| ARG-B02 | arg_051–arg_100 | 6/16/15/13 | Creado (50/50, revisión editorial pendiente); ver docs/qa/CODEX-005H-ARG-B02.md |
| ARG-B03 | arg_101–arg_150 | 6/16/15/13 | Creado (50/50, revisión editorial pendiente); ver docs/qa/CODEX-005H-ARG-B03.md |
| ARG-B04 | arg_151–arg_200 | 6/16/15/13 | Creado (50/50, revisión editorial pendiente); ver docs/qa/CODEX-005H-ARG-B04.md |

Inclusión: carrera verificable en institución argentina y evidencia de relevancia (campeonatos, goleadores, ídolos o trayectoria destacada). La nacionalidad argentina sola no alcanza; los extranjeros son elegibles. Cada candidato conserva múltiples períodos por club, años, competición y fuente verificada. club_tag sigue representando la carta, no toda la carrera.

Antes de aprobar cada lote: comparar identidad externa, nombre normalizado y alias contra los 150 existentes y todos los lotes argentinos previos. Una misma persona no obtiene otro ID por cambiar de institución o época. Los existentes pueden incorporarse a la modalidad mediante metadatos verificados.

La revisión editorial debe publicar una matriz por institución, región y generación. Incluir interior, AMBA y distintas épocas; justificar ausencias y concentración. Boca/River no determinan por sí solos la selección. No se inventan cuotas históricas, fuentes, clubes ni ratings para rellenar lotes. Fuentes preferidas: registros de clubes, AFA, competiciones y archivos periodísticos contrastados; cada afirmación necesita enlace y fecha de consulta.

EARLY_ACCESS_250: primeros dos lotes argentinos revisados más los 150 actuales. Siguiente hito de colección: 350 identidades. FULL_CATALOG_500 continúa pendiente y requiere reconciliación explícita antes de integrar nuevos IDs en su contrato. Los validadores actuales no admiten automáticamente arg_*.
