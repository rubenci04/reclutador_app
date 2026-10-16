# Informe técnico CODEX-002

Fecha: 2026-10-16 · Task ID: **DL-F02-DATA-001** · Estado: **COMPLETA**.

## Implementación

Contrato TypeScript explícito Player, Era, PlayerTier y PlayerCatalog; IDs textuales plr_001..plr_100 y sobre catalog_v1. Sin any ni enum.

Reglas compartidas para 100 registros (12 ARQ, 32 DEF, 30 MED, 26 DEL), formación exclusiva 4-3-3 (1/4/3/3), presupuesto 100M, cinco tiers con los cupos pedidos y límite futuro de química 15%.

Funciones puras calculatePlayerPrice y getPlayerTier rechazan ratings no enteros, no finitos o fuera de 75–99. La fórmula es exactamente la solicitada y vive en un solo módulo. No se guarda tier adicional. El precio obligatorio se comprueba recalculando desde overall_rating.

validatePlayer verifica registros unknown independientemente del tamaño del catálogo. validateCatalog agrega cantidad, conjunto exacto de IDs, duplicados, cuotas, índices de errores y viabilidad. validateVersionedCatalog agrega el sobre versionado. Los informes usan códigos técnicos y datos estructurados; no se muestran al usuario ni se agregan nuevos textos de interfaz.

La comprobación económica obtiene el once distinto más barato por posición, devuelve sus IDs y costo y acepta hasta 100M inclusive. No afirma factibilidad si hay registros inválidos o identidades duplicadas. Sin posiciones suficientes retorna insufficient_players. El método es exacto bajo las reglas del MVP de posición única y sin restricciones cruzadas.

## Decisiones

- [ADR-0003](../decisions/ADR-0003.md): contrato y economía; [diccionario completo](../CATALOG_DATA.md): campos, interpretación de atributos, cuotas, versionado y migración.
- Era incluye 1950s–2020s; representa el período de referencia, no nacimiento ni rendimiento actual.
- Códigos de asociaciones FIFA, no ISO. Registro inicial explícito de 38 asociaciones; nuevas asociaciones o casos históricos requieren revisión editorial.
- Club histórico mediante tag canónico del club del período elegido. Alias y homónimos requieren curación humana; el validador normaliza nombres para detectar variantes tipográficas, sin prometer resolver identidad humana.
- IDs de negocio seguirán siendo text en una futura migración. Si se requiere UUID, será una columna técnica independiente con mapeo, nunca una conversión implícita. Referencias históricas usarán versión y player_id.
- Química: solo contratos y cap 0.15. Se documenta agregación de pares no ordenados y prevención de doble conteo; pesos y acumulación requieren una decisión futura.
- Presupuesto, formación y cantidad de titulares ahora se importan desde reglas comunes en la configuración inicial; sus valores visuales se mantienen.

## Archivos creados

```text
src/types/player.ts
src/data/catalogRules.ts
src/features/player-catalog/
  rating.ts
  calculatePlayerPrice.ts
  getPlayerTier.ts
  validatePlayer.ts
  validateCatalog.ts
  testFixtures.ts
  catalog.test.ts
docs/CATALOG_DATA.md
docs/decisions/ADR-0003.md
docs/qa/TEST_PLAN.md
docs/qa/CODEX-002.md
```

Archivos modificados: src/data/initialSetup.ts, README.md, docs/ROADMAP.md, docs/TASK_BOARD.md y docs/TEST_PLAN.md. No se modificaron componentes, estilos, diccionarios, pruebas anteriores ni dependencias. testFixtures.ts contiene únicamente datos sintéticos y no se importa desde la aplicación.

## Resultados reales de pruebas

| Comando o verificación | Resultado |
|---|---|
| npm run build | PASS; TypeScript y Vite 8.3.4, 50 módulos, build exitoso |
| npm run lint | PASS; sin errores ni advertencias de ESLint |
| npm run test | PASS; 2 archivos, 122 pruebas: 107 nuevas y 15 existentes |
| npx tsc --noEmit | PASS; salida 0, contratos estáticos incluidos |
| Fórmula exacta | PASS; 75→3, 84→6, 90→11 y 99→25 |
| Límites, tiers y registros inválidos | PASS; incluidos no finitos, fracciones, strings, faltantes, posiciones no MVP y precios manipulados |
| Catálogo sintético de 100 jugadores | PASS; IDs exactos, cupos completos y once factible |
| Duplicados e informes | PASS; ID, nombre normalizado, ID faltante, índices y array disperso |
| Viabilidad económica | PASS; mínimo 33M en fixture pequeño, límite exacto 100M y catálogo completo imposible de 101M |
| No mutación de entradas y coherencia con cancha | PASS |
| Regresión de idiomas | PASS; las 15 pruebas existentes se ejecutaron sin modificaciones |
| Revisión de diff y whitespace | PASS; revisión de alcance y git diff --check |
| Nueva revisión visual en navegador/dispositivos | NO EJECUTADA; no se cambiaron componentes, estilos ni textos de la pantalla. Regresión cubierta por las pruebas DOM y equivalencia de constantes; no se afirma una nueva auditoría visual |

La primera ejecución detectó un error de aritmética en el fixture de la frontera 100M: su costo real era 95M. Se corrigió usando los precios conocidos de 75, 84 y 90; luego las 122 pruebas pasaron. No se cambió la fórmula para acomodar la prueba.

Herramientas verificadas: Node 24.21.0, npm 11.19.0, Git 2.53.0.windows.2. Se conservaron las versiones instaladas en CODEX-001; no hubo instalación ni actualización de paquetes.

## Problemas y continuidad documental

- El encargo refería docs/qa/TEST_PLAN.md; el documento existente estaba en docs/TEST_PLAN.md. Se conserva su ubicación y contenido y se agrega un enlace desde la ruta solicitada.
- DL-F02-DATA-001 tenía un título histórico que abarcaba modelo y catálogo. Se conserva el ID para el alcance explícito de CODEX-002 y se agrega DL-F02-DATA-002 para los 100 registros reales. No se renumeran tareas históricas.
- El informe anterior no contenía un esquema de épocas ni una convención ISO. Se registra esa ausencia y se decide FIFA/1950s explícitamente, sin atribuir una migración inexistente.
- El primer intento de preparar Git encontró permisos restringidos al escribir .git. Se completó con acceso autorizado; no se perdieron cambios ni se sobrescribieron archivos preexistentes.
- Git avisa conversión futura LF→CRLF por la configuración local de Windows. git diff --check no encontró errores de whitespace; no se cambió configuración global de Git.

## Git

Se revisaron los 30 archivos pendientes de CODEX-001: eran coherentes con la entrega anterior; sin archivos ajenos ni credenciales. Se creó en master el commit local de referencia:

`5e55fabde29359da2dedbe8b1b583ff8b5a9ce3d` — `chore: establish Draft Legends multilingual baseline`.

Después se creó la rama solicitada `feat/dl-f02-data-001`. Esta entrega se conserva en el commit local `feat: define player catalog contract and economy`, que incluye el presente informe. Su hash exacto se obtiene con `git log -1 --format=%H` y se informa en el cierre del encargo. La comprobación final del estado debe mostrar el árbol limpio. No se hizo push, deploy ni configuración de servicios externos.

El informe histórico de CODEX-001 conserva su estado de Git de aquella fecha; este informe registra el commit posterior que fija esa base.

## Pendientes y riesgos

- Crear los 100 futbolistas reales y revisar evidencia histórica, representatividad, nombres/alias, nacionalidades, tags de club y balance editorial. Los fixtures no son un catálogo definitivo.
- Ampliar el registro de asociaciones cuando la selección real lo requiera; resolver casos históricos o de múltiples selecciones sin mezclar estándares.
- Guardar snapshots y referencias históricas en una fase de persistencia; no reutilizar IDs ni mutar un catalog_v1 publicado.
- Definir pesos, vecindad y combinación de química antes de implementarla; mantener tope agregado 15%.
- Si se muestran los códigos de diagnóstico en UI, agregar su presentación traducida simultáneamente en los tres idiomas. DL-F02-I18N-001 sigue pendiente.

Siguiente tarea recomendada: **CODEX-003 / DL-F02-DATA-002**, preparar el catálogo real catalog_v1 bajo CATALOG_DATA.md y pasarlo por validateVersionedCatalog. No se inició CODEX-003.

Para ejecutar el proyecto: npm ci (si faltan dependencias) y npm run dev desde la raíz. Las comprobaciones exactas de esta entrega son los cuatro comandos de la tabla anterior.
