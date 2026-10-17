# CODEX-005C — CPU estratégica y preparación argentina

Fecha: 2026-10-17.

## Diagnóstico y cambios

Base verificada limpia: 42f56cb, feat/single-player-auctions-visuals. Esa versión tenía sólo hot-seat: no existía CPU pujadora que corregir. Se incorporó Contra CPU como opción, sin quitar hot-seat ni Draft Libre. La descripción del playtest no se atribuye al código anterior sin evidencia.

El máximo privado depende de semilla, carta, perfil, valoración de atributos por rol, necesidad posicional, coste de oportunidad y reserva pública para puestos pendientes. No depende de la oferta humana ni recibe cartas futuras. CONSERVATIVE/BALANCED/AGGRESSIVE tienen primas y propensión de gasto diferentes. Puede ofertar inicialmente, contraofertar y pasar con dinero disponible. El tope técnico garantiza que ambos equipos puedan completarse; no aumenta el valor privado. Fórmula y parámetros en ADR-0009.

El registro agrega acción, perfil, motivo estructurado y máximo privado; la UI sólo muestra evaluando/oferta/pasa/gana, con pausa configurable de 0–3000 ms (650 por defecto, reducida hasta 150 ms si se prefiere movimiento reducido). El motor es puro y no espera. Tras doble pase, las asignaciones por prioridad o viabilidad se identifican sin inventar una puja. Se mantienen 22 jugadores.

Se corrigió un error previo detectado por estrés: el cierre rechazaba equipos que pagaban más que el precio base. Ahora compara precio base como límite inferior del gasto, respeta el presupuesto real y valida puestos/IDs. La búsqueda de viabilidad se simplificó a sumas de subconjuntos por posición y el máximo técnico usa búsqueda binaria sobre un predicado monótono.

## Pruebas reales

- TypeScript: PASS.
- ESLint: PASS.
- Vitest: PASS, 12 archivos, 448 pruebas, 17.18 segundos. Incluye los 15 casos previos de i18n, recuperación de fotografía fallida, temporización CPU y diferenciación visible de adjudicación obligatoria. La consulta de idioma se volvió explícita porque ahora hay varios selectores.
- Estrés: PASS, 3.000 partidas, 1.000 por perfil. Humanos simulados: pasar siempre, ofertar hasta base+1, ofertar hasta base+4; todas las combinaciones de perfil/política se ejercitan. Cero presupuestos negativos, posiciones erróneas, equipos incompletos o IDs duplicados. Se simula además cada partido con el motor existente.
- Build: PASS.
- catalog:audit: PASS parcial, 150 registros válidos; global pending con 350 faltantes. No se declara completo catalog_v1.

| Perfil | Ofertas CPU | Pases CPU | Gasto CPU medio | Gasto humano medio | Asignaciones forzadas por viabilidad | Asignaciones por prioridad | G/E/P CPU |
|---|---:|---:|---:|---:|---:|---:|---|
| CONSERVATIVE | 5648 | 17752 | 89.576M | 90.438M | 7296 | 3130 | 296/438/266 |
| BALANCED | 11456 | 13359 | 93.482M | 93.109M | 4721 | 1312 | 280/457/263 |
| AGGRESSIVE | 13467 | 11524 | 97.069M | 95.062M | 3863 | 335 | 295/417/288 |

Las asignaciones contabilizan ambos equipos; no son ofertas voluntarias CPU. Los resultados son observaciones, no objetivos de balance. Evidencia reproducible: CODEX-005C-stress.json, generado por cpuPolicy.test.ts sin esperas.

## Piloto visual y licencias

Una fotografía aprobada: plr_038, Lionel Messi, 250×357 px, 32.601 bytes, archivo local public/assets/players/plr_038.jpg. Fuente individual: https://commons.wikimedia.org/wiki/File:Lionel_Messi_20180626.jpg. Autor: Кирилл Венедиктов / soccer.ru. Licencia escogida: CC BY-SA 3.0, https://creativecommons.org/licenses/by-sa/3.0/. Miniatura redimensionada, conserva esa licencia y atribución. Verificación: 2026-10-17. La ficha individual confirma autor, reutilización y share-alike; no se infiere licencia de la mera presencia en Commons. Retrato de 2018, no representa necesariamente el año editorial de la carta ni respaldo del futbolista.

PHOTO_MANIFEST es independiente del catálogo y registra ID, ruta, origen, autor, licencia/URL, atribución, fecha, aprobación y observaciones. Sólo los aprobados se muestran. La UI ofrece créditos y fallback de silueta para ausencia/error. No se incorporó el segundo archivo cuya descarga fue bloqueada por un fallo de revisión automática por límite de uso; tampoco se completan artificialmente diez fotos. Los restantes 149 jugadores usan fallback; ampliar el piloto sigue pendiente.

Banderas: 49 SVG locales de flag-icons 7.5.0, MIT, copia íntegra en public/FLAG-ICONS-LICENSE.txt. Mapeo explícito de todas las asociaciones admitidas; ENG/SCO/WAL tienen emblemas separados. Asociaciones históricas desconocidas no se transforman en países sucesores: fallback hasta revisión editorial. La carta no consulta CDN ni API.

Escudos: ninguno oficial incorporado. CLUB_ASSETS permite ruta, procedencia, licencia y restricciones de marca; sin aprobación se usa monograma propio y el nombre derivado del club_tag existente.

## Plan argentino

200 identidades adicionales, no sólo nacionales argentinos. Contratos de múltiples períodos por club, años, competición y fuentes; cuatro lotes de 50 ARG-B01..04, matriz 24 ARQ/64 DEF/60 MED/52 DEL. No se generó ningún futbolista ni se modificaron ratings.

Los rangos plr_151..500 están reservados: se prepara arg_001..200 en argentina_collection_v1 independiente y no se inyectan IDs nuevos al validador antiguo. Deduplificación por identidad externa y revisión de alias, reutilización de plr_* para actuales con carrera argentina. Criterios editoriales de diversidad regional, institucional y generacional en ARGENTINA_COLLECTION.md. EARLY_ACCESS_250 prioriza los primeros 100 nuevos argentinos; 350 sería el hito con toda la colección; FULL_CATALOG_500 continúa pendiente de reconciliación futura.

## QA visual — NO EJECUTADA

El intento con el navegador integrado devolvió: “Local browser use is disabled in Work settings”. No se habilitó ni se eludió esa preferencia. Escritorio, 390 y 360 px quedan NO EJECUTADOS; las pruebas DOM no certifican layout.

Guía manual:

1. Ejecutar npm run dev, abrir la URL impresa y repetir a escritorio, 390 y 360 px.
2. Seleccionar Rival → Contra CPU, cada perfil y una pausa de 650 ms; elegir moneda e iniciar subasta.
3. Revisar bandera, silueta, nombre del club, rating, precio y controles sin desborde. En una ronda de Messi comprobar la fotografía; simular error de archivo para comprobar fallback.
4. Hacer ofertas, observar CPU evaluando/oferta/pasa; comprobar que un pase no impide una adjudicación obligatoria claramente identificada.
5. Completar las 22 rondas, comparar los onces, iniciar el partido, repetir la reproducción sin recálculo y volver al menú. Repetir hot-seat y Draft Libre.
6. Abrir Créditos visuales y licencias, probar teclado, los tres idiomas y movimiento reducido. No debe mostrarse el máximo privado CPU.

## Archivos y Git

Rama: codex/strategic-cpu-argentina, desde 42f56cb. Commit local específico al cierre, sin push ni deploy.

Cambios: auctionEngine/auctionTypes, cpuPolicy y su batería de estrés, AuctionPage y pruebas, PlayerIdentity, visualAssets, argentinaExpansion, CareerSpell, diccionarios es-AR/en/pt-BR y pruebas i18n, CSS, dependencia/lock flag-icons, recursos locales/licencia, README, roadmap/tablero/plan de pruebas, avance de catálogo, ADR-0009, plan argentino y log CODEX-005C. El contrato visual vacío anterior fue sustituido por el manifiesto verificable.

Pendientes: QA visual real, ampliar piloto hasta diez sólo con verificación, revisión editorial de los futuros candidatos y ensamblador versionado para integrar la colección. Próxima tarea recomendada: playtest humano de los tres perfiles y luego selección editorial trazable de ARG-B01, con auditoría de identidades antes de puntuar jugadores. No hay Supabase, online ni generación masiva.
