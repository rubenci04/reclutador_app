# Informe técnico CODEX-003A

Fecha editorial: **16/10/2026**. Entrega **COMPLETA dentro del alcance de CODEX-003A**: arquitectura para 500 y B01 de 50 contemporáneos. **CODEX-003 / catálogo global de 500: EN CURSO, PENDIENTE de nueve lotes y auditoría final.**

Tareas trabajadas: DL-F02-DATA-002 (avance, no cierre), DL-F02-DATA-003 (contrato ampliado), DL-F02-DATA-004 (B01), DL-F02-I18N-002 (categorías). Auditoría global DL-F02-QA-001 pendiente.

## Git y reconocimiento

Se verificó el estado informado: árbol limpio en feat/dl-f02-data-001, HEAD `7c82090` y base `5e55fab`. Se leyeron AGENTS.md, README, ROADMAP, TASK_BOARD, TEST_PLAN, ADR-0002/0003, contrato e informe CODEX-002 antes de implementar.

Se creó **feat/dl-f02-catalog-v1-500**, conservando ambos commits y la historia. La entrega se registra en un commit local con asunto `feat: expand catalog to 500 and implement contemporary B01`; el hash exacto se informa en el cierre y se obtiene con `git log -1 --format=%H`. El estado se verifica después del commit. No se hizo push, deploy ni configuración de servicios externos.

## Implementación y decisiones

- catalog_v1 ahora exige **500**, no 100: 300 contemporary y 200 legend. ADR-0004 documenta la ampliación autorizada sin borrar antecedentes. Antes no existía catálogo real publicado ni partidas históricas que migrar.
- Player agrega únicamente **category** y **reference_year**. Año entero y década coherente; ventana contemporary 2016–2026 fija al 16/10/2026, legend 1950–2015. Las futuras referencias de 2026 necesitarán revisión editorial del día de corte; los años de B01 llegan solo hasta 2022.
- IDs permanentes plr_001..plr_500. Intervalos de 50 por lote, sin renumerar el modelo anterior. Nacionalidades FIFA, no ISO; registro extendido con SUI, ISL y CRC, sin modificar otras convenciones.
- manifest.json declara diez lotes, cantidades, categorías y estados. Solo existe B01.json; no hay JSON vacíos ni jugadores ficticios para B02–B10.
- validatePlayer comprueba esquema y categoría/año; validateBatch verifica 50, rango de IDs, categoría, posiciones, tiers y duplicados internos. validateCatalog siempre exige los 500 y la matriz de categorías por posición, además de los cupos globales.
- assembleCatalog valida el manifest y su coherencia con datos suministrados, valida cada lote y detecta duplicados entre lotes normalizando mayúsculas, diacríticos y espacios. El orden de salida es determinista por lote/ID y no muta las entradas. Los registros inválidos siguen presentes en los diagnósticos globales; no se ocultan mediante filtrado.
- Los informes indican explícitamente mode y status. Un lote approved en modo partial nunca acredita el catálogo completo. globalValid permanece false con 50/100.
- Presupuesto 100M, precios, rangos y fórmula intactos. checkEconomicViability es reutilizable para subconjuntos sintéticos; la prueba global real queda not_evaluated y CPU 95–100M pendiente.
- Traducciones de contemporary/legend en es-AR, en y pt-BR. No se cambian componentes ni estilos de la pantalla inicial, ni se muestran mensajes técnicos del validador en UI.

## B01 implementado

**50 futbolistas reales**, IDs plr_001..plr_050, categoría contemporary. Año, década, selección, club representativo, posición y cinco ratings definidos para cada uno. Los 50 precios se generaron invocando calculatePlayerPrice existente y se verifican otra vez mediante el validador y los tests.

| Distribución | Resultado B01 |
|---|---|
| Posiciones | ARQ 6 · DEF 16 · MED 15 · DEL 13 |
| Tiers derivados | S 6 · A 10 · B 15 · C 12 · D 7 |
| Categorías | contemporary 50 · legend 0 |
| Nacionalidades / clubes | 22 / 29 |
| Argentinos / sudamericanos | 12 / 26 |
| Errores técnicos de B01 | 0 |

[Fuentes y decisiones editoriales por ID](../catalog/B01_EDITORIAL.md) registran URLs reales consultadas, períodos concretos y riesgos. Los ratings son diseño editorial, no estadísticas oficiales ni valores copiados de otro videojuego. Hay versiones destacadas de distintas temporadas, no una copia de valoraciones actuales. Se documentan carreras entre generaciones, préstamos, homónimos y posiciones de granularidad MVP.

## Modificaciones

Nuevos archivos:

```text
src/data/catalog_v1/
  manifest.json
  index.ts
  batches/B01.json
src/features/player-catalog/
  assembleCatalog.ts
  batches.test.ts
scripts/audit-catalog.cjs
docs/
  CATALOG_PROGRESS.md
  catalog/B01_EDITORIAL.md
  decisions/ADR-0004.md
  qa/CODEX-003A.md
  qa/CODEX-003A-catalog-audit.json
```

Modificados: src/types/player.ts, src/data/catalogRules.ts, validatePlayer.ts, validateCatalog.ts, testFixtures.ts y catalog.test.ts dentro de player-catalog; tres diccionarios common.json; package.json (solo script), eslint.config.js (CommonJS local); README.md, CATALOG_DATA.md, ROADMAP.md, TASK_BOARD.md y TEST_PLAN.md.

Sin cambios en calculatePlayerPrice, getPlayerTier, pantalla inicial, selector de idioma, persistencia, estilos, configuración inicial, pruebas originales de i18n, package-lock ni dependencias. Los fixtures de 500 son exclusivamente de test; no se incluyen en el catálogo real ni en B02–B10.

## Resultados reales

| Comprobación ejecutada | Resultado final |
|---|---|
| npm run typecheck | PASS; TypeScript strict sin errores |
| npm run lint | PASS; sin errores ni advertencias |
| npm run test | PASS; **215 pruebas, 3 archivos** |
| npm run build | PASS; 50 módulos; JS 279.19 kB / gzip 88.08 kB |
| 50 validaciones individuales B01 | PASS; esquema, años, posición, país, club, atributos y precio |
| Cuotas B01 | PASS; posiciones, tiers, categoría e IDs exactos |
| Fórmula y precios conocidos | PASS; 75→3, 84→6, 90→11, 99→25; fórmula sin cambios |
| Regresión CODEX-001 | PASS; 15 tests originales sin modificaciones |
| Regresión CODEX-002 adaptada | PASS; 109 casos (los 107 previos más los dos nuevos campos parametrizados), mismos límites y pruebas económicas pequeñas |
| Nuevos casos de lotes y B01 | PASS; 91 casos, incluidos 50 jugadores reales, manifest y consolidación |
| Diez lotes / 500 sintéticos | PASS solo de lógica de validación; no acredita los datos reales faltantes |
| npm run catalog:audit | Salida 0; **PASS parcial B01**, global **PENDING/valid:false**, 450 IDs faltantes |
| npm run catalog:audit -- --complete | Salida **1 esperada**, rechaza correctamente la completitud; no es PASS global |
| git diff --check | PASS; sin errores de whitespace |
| Revisión de alcance | PASS; sin B02–B10 reales, selección CPU, simulación, UI nueva ni servicios |
| Auditoría real completa de 500 | **PENDIENTE**: faltan 450 jugadores |
| Viabilidad económica global real | **NO EJECUTADA / PENDIENTE**, por el mismo motivo |
| Selección CPU 95–100M | **NO IMPLEMENTADA / NO EJECUTADA**, fuera de esta entrega |
| Nueva inspección visual en navegador/dispositivos | **NO EJECUTADA**; no se modificó visualmente el inicio, regresión de idioma cubierta por DOM |

La auditoría reproducible genera [CODEX-003A-catalog-audit.json](CODEX-003A-catalog-audit.json). El script local reutiliza módulos de dominio mediante transpilación de TypeScript; no sustituye la comprobación strict ni añade paquetes o lógica al navegador. Un exit code 0 sin --complete significa consistencia de los lotes disponibles, no completitud global.

## Problemas encontrados y resolución

- Cambio autorizado de tamaño: los tests de 100 y los dos campos antes inexistentes ya no describían el contrato vigente. Se actualizaron fixtures/expectativas sin suprimir cobertura de precios, validación o identidad. El caso adversarial histórico de 100 registros / 101M se conserva como prueba de subconjunto; el catálogo global sigue pendiente al usarlo.
- TypeScript detectó un acceso a unknown en la nueva comprobación de intervalos: se reutilizan registros ya validados con su índice original.
- ESLint rechazó imports require del script CommonJS: se habilitan únicamente para scripts/*.cjs, manteniendo la regla de TypeScript en la aplicación.
- Una prueba de archivos usó import.meta.url transformada a URL de servidor bajo jsdom. Se corrigió con ruta local desde la raíz del proyecto; luego pasaron las 215 pruebas.
- El plan original sigue en docs/TEST_PLAN.md con enlace desde docs/qa/TEST_PLAN.md. Se conservan las rutas y los IDs históricos; el tablero registra el nuevo alcance y subtareas, sin declarar completo CODEX-003.
- No hubo que instalar dependencias ni cambiar la economía. Las primeras verificaciones fallidas se corrigieron y se volvió a ejecutar la batería completa antes del cierre; los resultados de la tabla son los finales reales.

## Riesgos y pendientes

La revisión editorial de ratings y de «mejor período» sigue siendo humana. B01 documenta los casos donde 2018 es una versión representativa dentro de la ventana, sin asegurar que sea el pico absoluto de toda la carrera. Las fuentes confirman hechos biográficos/de club, no prueban ratings. Ante desacuerdo, revisar juntos año, club y balance; no manipular cuotas ni precios para ocultarlo.

La normalización de nombres no resuelve todos los alias y homónimos. Comparar los próximos lotes con B01, incluidos los veteranos ya clasificados contemporary, para no volver a agregarlos como legend. El cap de química sigue en 15% sin motor implementado.

Próximo lote recomendado: **B02 / DL-F02-DATA-005**, contemporary, plr_051..plr_100, 6/16/15/13 posiciones y 6/10/15/12/7 tiers con revisión de coherencia editorial. B02–B10 no se implementaron ni se iniciaron automáticamente.

Comandos locales:

```powershell
npm run typecheck
npm run lint
npm run test
npm run build
npm run catalog:audit
npm run catalog:audit -- --complete
```

Para abrir la plataforma: npm run dev. No se dejó un servidor nuevo activo en esta entrega.
