# SIM-004A — Diseño y viabilidad de reanudación

20/10/2026. Rama `codex/sim-004a`, base `44a05da` (UX-004). Alcance: auditoría técnica, ADR propuesto, experimento aislado de RNG y anclas golden; no motor interactivo productivo.

## Entrega y revisión técnica

[ADR-0018](../decisions/ADR-0018-interactive-match.md) contiene diagrama de estados, interfaces TypeScript propuestas, datos y acumuladores del snapshot, RNG/serialización, cuatro ventanas, validación/idempotencia, compatibilidad, sustituciones, autoridad online, riesgos, orden y aceptación para SIM-004B.

Se revisaron simulator, matchTypes, playback, probabilityModel, seededRandom, matchSeries, MatchScreen, tacticalModel, strategies, auctionEngine, onlineDuel, ADR-0016/0017 y PLAYTEST-EXPANSION; además squadQuality, flujo online y pruebas existentes. Hallazgos críticos contrastados con código:

- action-v3: seis bloques y 24 oportunidades, consumo principal condicional; la posesión añade un draw después de 90. No confundir frames con bloques.
- subs-v1 usa un stream separado `seed:subs`, compartido por lados en orden local/cpu. Retira entrante de unused antes de comprobar si existe saliente elegible: preservar intentos fallidos al extraer.
- Las partidas nuevas con `manualBench` no envían bancos al simulador; el banco manual actual es previo al partido. Un futuro modo interactivo debe declararse explícitamente.
- La reanudación requiere ambos cursores y sumas tácticas/efectivas/calidad/mediocampo, equipos iniciales y actuales, bancos y finalización; semilla e índice solos no bastan.
- El validador de bancos no resuelve propiedad cruzada ni contabilidad total; validación interactiva nueva sin invalidar legacy.
- Efectos de técnico ya precomputados: se propone congelarlos inicialmente al cambiar estrategia. POSTURE se rechaza hasta tener justificación/versionado.
- Online actual usa intents/estados calculados en clientes y deriva series localmente. El nuevo modo requiere autoridad compartida; no se presenta como resuelto por determinismo local.

## Experimento ejecutable

`src/features/local-match/experiments/checkpointRng.ts` es importado exclusivamente por su prueba. No modifica `seededRandom.ts` ni tiene importadores productivos. Devuelve valor y próximo estado serializable con aritmética idéntica a la closure actual. Valida uint32 y contador, preserva cero al restaurar y wraparound; sin timers, React ni Math.random.

`checkpointRng.test.ts`:

- Cinco semillas (incluidos vacío y Unicode), 1.000 draws cada una; igualdad exacta con generador productivo y JSON roundtrip entre draws.
- Dos flujos separados y fronteras de seis bloques con consumo variable sintético; principal no afectado por draws de subs, siguiente draw final conservado.
- Estado cero/wraparound y rechazo de estados/contadores inválidos.
- 24 SHA-256 del resultado completo del motor intacto: clásico/v1/v2/v3 × tres semillas × sin/con bancos automáticos, formación, tácticas, calidad y técnico. Fixtures sintéticos fijos, 28 identidades propias, sin depender del catálogo editorial. También verifica igualdad tras roundtrip de inputs y 6/18/24 oportunidades según versión.

Los 24 snapshots se generaron una sola vez para fijar el baseline anterior a cualquier extracción. La regresión normal los verifica sin `--update`. No hubo ajuste de expectativas existentes ni discrepancia numérica ocultada.

## Verificaciones

- Prueba inicial aislada: 11/11, 1 archivo, 1,44 s, 24 snapshots creados.
- `npm run typecheck`: PASS.
- `npm run lint`: PASS.
- `npm test`: PASS, 902/902 pruebas, 85 archivos, 78,63 s; verifica los 24 golden sin actualizarlos. Salida completa en `SIM-004A-tests.txt`.
- `npm run build`: PASS, 245 módulos, 1,81 s. Conserva nombres de assets de UX-004; experimento excluido del grafo productivo. Advertencia ya existente de chunk AuctionPage de 1.898,71 kB (312,64 kB gzip), fuera del alcance de esta fase.
- `git diff --check`: sin errores de contenido; avisos de normalización CRLF del entorno.

## Límites explícitos

La prueba acredita viabilidad de **serializar/reanudar RNG**, no exportar todavía un partido incremental idéntico. Los golden anclan el resultado histórico; igualdad sesión→resultado, ejecución de decisiones, prefijos inmutables y sincronización transaccional son criterios obligatorios de SIM-004B y no se declaran implementados. La primera API incremental propuesta admite v3; otras versiones siguen en su ruta histórica.

No se cambian MatchScreen, simulador, fórmulas, RNG productivo, flujo de partido, reglas/versiones actuales, presupuesto, CPU, catálogo, persistencia, series, traducciones ni servicios. Sin textos nuevos en UI; no procede QA visual nueva. No se ensayaron dos navegadores ni backend interactivo; no hay migraciones Supabase, push o deploy. Validación de contratos del ADR es revisión documental; su compilación/implementación queda para B.

Cambios ajenos iniciales preservados: informe `CODEX-005C-stress.json`, `.claude/` y registro de despliegue anterior. Los informes generados por la suite se restauran, manteniendo copia previa del stress. No se implementan etapas posteriores automáticamente.
