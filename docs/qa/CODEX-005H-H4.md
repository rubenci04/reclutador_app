# CODEX-005H · H4 — Auditoría de clubes de los 150 futbolistas

18/10/2026 (fecha de corte). Base `22d98a4`, rama `codex/current-club-audit`. Registro completo en `docs/CURRENT_CLUB_AUDIT.md`.

## Cobertura exacta sobre los 150 originales
- **150/150 revisados** (cada identidad tiene al menos una captura con situación o pendiente explícito).
- **118 verificados** (78,67 %): **93 ACTIVE** con club actual identificado y **25 RETIRED** sin club actual.
- **32 pendientes** (21,33 %): estado UNKNOWN/PENDING, sin club actual deducido. **0 sin revisar.**
- No se declara una auditoría «completa al 100 %»: los 32 pendientes conservan el motivo concreto en su fila (contratos vencidos sin noticia posterior, jugadores sin club tras salir, traspasos disputados, retiros sin anuncio). Ningún jugador recibió FREE_AGENT.

## Procedimiento
- Tandas de 25 (el lote 1 de la ronda anterior —25 identidades— se re-revisó para sus seis pendientes): cinco tandas nuevas de 25 + una segunda pasada de 13 casos del primer lote y de los seis pendientes anteriores. Una tanda = un commit (`4baed4f`, `eda889e`, `77d891b`, `e1045cd`, `1a2d3e2` y el cierre de la segunda pasada).
- Para cada jugador se hizo una búsqueda web (con una segunda búsqueda dirigida en los casos dudosos) buscando club, liga o federación y, si faltaba, notas fechadas coincidentes. VERIFIED exige fuente oficial o una fuente fechada de mayo-octubre de 2026 (o un contrato que cubra el corte) sin contradicción. Estadísticas automáticas, wikis y blogs de plantillas repetitivas no cuentan como actualidad.
- Casos pedidos: **Messi** (Inter Miami: renovación del 23/10/2025 hasta MLS 2028, re-comprobado) y **Romero** (Atlético de Madrid, 15/08/2026, contrato hasta 2031; la fecha ahora tiene varias notas fechadas y pasa de USER_SUPPLIED a VERIFIED). Barcelona y Tottenham siguen como referencias deportivas.
- Datos: `src/data/player-clubs/2026-10-18.json` (la captura del 17/10 se conserva); `CLUB_AUDIT_AS_OF` pasa a 2026-10-18 por decisión explícita; `capturePlayerClubs` elige la revisión más reciente no posterior a la fecha pedida. `auditCoverage` calcula la cobertura y una prueba exige que el documento diga las mismas cifras.
- Clubes nuevos: se registraron 26 identidades nuevas solo con nombre (fallback neutral en `ClubBadge`, sin paleta, sin escudos ni fotos).

## Garantías
- Ratings, precios, IDs y club_tag intactos (el hash SHA-256 del catálogo sigue coincidiendo; `npm run catalog:audit` sin incidencias). Sin duplicados ni cambios en el motor del partido.
- Aptitudes por rol: ninguna fuente verificable encontrada; `ROLE_PROFILES` sigue vacío (todo rol es UNKNOWN).

## Pruebas
`typecheck`, `lint` y `build` correctos; `npm test`: 606 aprobadas de 606 (602 antes; +4 de la revisión). Cubren validez de ambos archivos, unicidad, referencia intacta, que lo pendiente no recibe club ni retiro ni FREE_AGENT, que lo ACTIVE/RETIRED tiene fuente https y la coherencia de las cifras con el documento. `auditCoverage` ya es la única fuente del recuento.

## Límites
- La verificación depende de resultados de búsqueda resumidos: fuentes oficiales aparecen solo en una parte de los casos (clubes y federaciones citados en el registro); el resto se apoya en notas fechadas coincidentes y está marcado en cada nota. Conviene una pasada humana de los casos con nota «sin texto del club».
- Las trayectorias completas y los roles quedan para una fase de datos aparte.

## Git
Cinco commits de tanda más el cierre. Sin push.
