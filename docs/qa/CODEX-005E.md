# CODEX-005E — clubes actuales e históricos

Base limpia verificada: 424ecb2, rama inicial codex/club-colour-identity. Rama de entrega: codex/current-club-audit.

## Cambios

Metadatos separados/versionados, registro central de clubes con alias, validación de importación y captura por fecha. Duelo y Draft Libre distinguen Club actual/estado y Club de referencia con año; muestran fecha, estado de auditoría y fuente para confirmados. Cada distintivo corresponde al ID presentado; un club nuevo sin paleta conserva su nombre y ficha neutral.

25/150 revisados: 13 clubes actuales confirmados, seis retiros confirmados y seis UNKNOWN/PENDING. Otros 125 sin revisar. Fuentes, límites y actualización: CURRENT_CLUB_AUDIT.md. El día de transferencia de Romero se identifica como aportado por el encargo y pendiente de verificación independiente; club y transferencia sí confirmados oficialmente.

Se conservaron club_tag, IDs, catálogo, ratings, precios, química, subastas, CPU, simulador y persistencia. No hay imágenes ni dependencias nuevas. El SHA-256 normalizado prueba los 150 registros completos contra la base.

## Pruebas reales

- TypeScript: PASS.
- ESLint: PASS.
- Vitest: PASS, 15 archivos, **467 aprobadas y tres omitidas**, 4.73 s. Comando: `npm test -- -t '^(?!.*(?:completes 1,000|plays 3,000|2,400-match)).*$'`.
- Se excluyen deliberadamente estrés de 1.000 semillas, 3.000 partidas CPU y diagnóstico de 2.400 encuentros, por alcance sin cambios de juego.
- 14 casos nuevos: actual/referencia, fechas/fuentes/estados, IDs y alias, duplicados, revisiones, copia independiente y fecha futura, hash de economía/datos, tres idiomas y presentación de retirados/desconocidos/libres. FREE_AGENT usa sólo un fixture sintético.
- Build: PASS, 97 módulos, bundle generado.
- catalog:audit: PASS parcial, 150 válidos; global pending con 350 faltantes. No se declara completo catalog_v1.

## Pendientes

Seis revisiones insuficientes y 125 futbolistas sin auditar. Historial sólo parcial: tres jugadores/seis períodos. No se inventa el club de los pendientes.

QA visual real: NO EJECUTADA. La última disponibilidad observada del navegador local estaba deshabilitada en Work; no se cambia esa preferencia. Pruebas DOM no certifican layout. CSS contempla envolver etiquetas y nombres en móvil.

Guía manual: comprobar Messi Inter Miami actual/Barcelona referencia 2019; Romero Atlético actual/Tottenham referencia 2022; Marcelo Retirado/Real Madrid referencia 2017; Ramos No verificado/Real Madrid referencia 2017. Repetir en Draft Libre, tres idiomas y 390/360 px; revisar fuentes, precios visibles, banderas y foto de Messi. No confundir retiro con club sin paleta ni evidencia insuficiente con agente libre.

## Git

Commit local específico sobre codex/current-club-audit. Sin push ni deploy. No se inicia la generación de futbolistas argentinos.
