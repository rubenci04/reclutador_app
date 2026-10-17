# Avance de catalog_v1

Fecha fija de referencia: **16/10/2026**. Alcance aprobado en CODEX-003A: **500**, sustituyendo explícitamente los 100 de CODEX-002. Avance actualizado en CODEX-003C: **150/500**, contemporary **150/300**, legend **0/200**. CODEX-003 / DL-F02-DATA-002: **EN CURSO**.

| Lote | Categoría | IDs reservados | Esperados | Implementados | Estado |
|---|---|---|---:|---:|---|
| B01 | contemporary | plr_001–plr_050 | 50 | 50 | Implementado; validación parcial aprobada |
| B02 | contemporary | plr_051–plr_100 | 50 | 50 | Implementado; validación parcial y acumulada aprobadas |
| B03 | contemporary | plr_101–plr_150 | 50 | 50 | Implementado; validación parcial y acumulada aprobadas |
| B04 | contemporary | plr_151–plr_200 | 50 | 0 | Pendiente |
| B05 | contemporary | plr_201–plr_250 | 50 | 0 | Pendiente |
| B06 | contemporary | plr_251–plr_300 | 50 | 0 | Pendiente |
| B07 | legend | plr_301–plr_350 | 50 | 0 | Pendiente |
| B08 | legend | plr_351–plr_400 | 50 | 0 | Pendiente |
| B09 | legend | plr_401–plr_450 | 50 | 0 | Pendiente |
| B10 | legend | plr_451–plr_500 | 50 | 0 | Pendiente |

Los archivos B04–B10 no existen. Sus estados figuran en manifest.json sin datos de relleno.

B01 reúne 22 nacionalidades y 29 clubes, con 12 argentinos y 26 sudamericanos. Estas cifras describen lo implementado y no reemplazan los cupos del catálogo completo.

B02 agrega 50 futbolistas diferentes: 28 asociaciones y 34 clubes en el lote, incluidos 2 argentinos y 12 sudamericanos. El acumulado tiene 38 asociaciones, 51 clubes, 14 argentinos y 38 sudamericanos. Se suman 16 asociaciones que no estaban representadas en B01, sin imponer cupos geográficos artificiales.

## Cantidades verificadas

| Posición | Contemporary implementados / objetivo | Legend implementados / objetivo | Total implementado / objetivo |
|---|---|---|---|
| ARQ | 18 / 36 | 0 / 24 | 18 / 60 |
| DEF | 48 / 96 | 0 / 64 | 48 / 160 |
| MED | 45 / 90 | 0 / 60 | 45 / 150 |
| DEL | 39 / 78 | 0 / 52 | 39 / 130 |
| Total | 150 / 300 | 0 / 200 | 150 / 500 |

| Tier | B01 | B02 | B03 | Acumulado | Objetivo global |
|---|---:|---:|---:|---:|---:|
| S | 6 | 6 | 6 | 18 | 60 |
| A | 10 | 10 | 10 | 30 | 100 |
| B | 15 | 15 | 15 | 45 | 150 |
| C | 12 | 12 | 12 | 36 | 120 |
| D | 7 | 7 | 7 | 21 | 70 |

## Calidad de datos y balance

Identidad, club, selección y período se trazan por ID en [B01_EDITORIAL.md](catalog/B01_EDITORIAL.md). Ratings/atributos son editoriales, no estadísticas oficiales. Se registran las decisiones de categoría para carreras entre generaciones, la clasificación de Acuña y Di María, clubes durante préstamos y homónimos. No hay errores estructurales ni precios incoherentes detectados en B01.

[B02_EDITORIAL.md](catalog/B02_EDITORIAL.md) incorpora fuentes y períodos por los 50 IDs nuevos, selecciones deportivas, roles y préstamos. B01 permanece intacto: prueba de hash de los registros originales y comparación Git, incluidos todos sus precios. Se amplía únicamente el registro de asociaciones con seis códigos necesarios.

CODEX-003B cubre alias reconocibles además de normalización tipográfica: registro explícito para los 100 jugadores, abreviaturas, nombres deportivos y variantes completas. Un alias conocido no puede asignarse a otro ID. Se revisaron, entre otros, Neymar/Neymar Jr, Messi/Leo Messi, Casemiro/Casimiro, Pepe y Kun Agüero. Carlos Sánchez (Colombia) y Alexis Sánchez (Chile) permanecen separados. No se aplican coincidencias difusas por apellido; nuevos alias y homónimos requieren revisión editorial.

Revisión de balance pendiente: las versiones representativas 2018 de algunos veteranos pueden revisarse frente a su pico absoluto. También deberá contrastarse la sostenibilidad de seis S por lote con las ocho selecciones restantes. No inflar valoraciones para cerrar cuotas. El registro de alias es finito y no sustituye la revisión humana de identidades no registradas.

## Pruebas y cierre

Auditoría histórica de CODEX-003B: npm run catalog:audit. Resultado real guardado en [CODEX-003B-catalog-audit.json](qa/CODEX-003B-catalog-audit.json): B01 y B02 approved en modo partial; acumulado partialValid:true, catálogo global pending/valid:false, 400 IDs faltantes; economía global not_evaluated y CPU pending. El modo --complete devuelve 1 por incompletitud esperada. La [auditoría histórica de CODEX-003A](qa/CODEX-003A-catalog-audit.json) permanece sin modificaciones.

TypeScript, ESLint, Vitest (**320 pruebas**) y build ejecutados en CODEX-003B; detalle y límites en [informe QA](qa/CODEX-003B.md). Las 215 pruebas anteriores siguen cubiertas; se adapta la integración real a dos lotes y se conserva el escenario aislado de B01. La aprobación del cargador completo usando fixtures sintéticos verifica su lógica, no los 400 jugadores reales que faltan.

Incidencias resueltas: tres expectativas de integración que suponían solo B01 se ajustaron a la nueva carga real sin rebajar la exigencia de 500; la detección anterior de alias no tipográficos se amplió mediante registro explícito. La ruta FIFA de SVN falló al consultarse y se documentó el contraste alternativo. No hubo correcciones de datos, ratings o precios de B01.

Pendientes actuales: B04–B10, segunda revisión editorial y auditoría global de identidad/distribuciones/precios, comprobación económica completa y posterior selección CPU 95–100M en su fase. La fórmula y el presupuesto siguen intactos. Próximo lote recomendado: **B04 / DL-F02-DATA-007**, sin reutilizar los 150 futbolistas incorporados. No iniciado.

## CODEX-003C — auditoría actual de 150

B03 completo: 50 IDs plr_101–plr_150. Tres lotes completos de diez; contemporary 150/300, legend 0/200. B03 representa 23 asociaciones y 32 clubes, con 6 argentinos y 12 sudamericanos. Agrega CMR/GHA/KSA/QAT a la representación; acumulado: 42 asociaciones, 67 clubes, 20 argentinos y 50 sudamericanos. KSA/QAT amplían el registro permitido a 49 códigos.

Fuentes por los 50 IDs, períodos, posiciones, préstamos y consultas limitadas en [B03_EDITORIAL.md](catalog/B03_EDITORIAL.md). B01/B02 y sus precios se conservan íntegros mediante comparación Git y hashes parseados. No se corrigieron datos anteriores.

El registro de alias cubre ahora 150 personas sin alterar entradas previas. Incidencias resueltas: L. Martínez era ambiguo para Lisandro/Lautaro y queda sin resolver; se registran Li. Martínez y La. Martínez. Se descartan abreviaturas sin apellido como R. Los apodos Gigi/Bono/La Araña/El Toro y nombres completos se trazan a fuentes. No se fusionan personas por apellido.

Auditoría reproducible actual: npm run catalog:audit. Artefacto [CODEX-003C-catalog-audit.json](qa/CODEX-003C-catalog-audit.json): tres lotes approved, partialValid:true, global pending/valid:false, 350 IDs faltantes (plr_151–plr_500), economía not_evaluated y CPU pending. --complete devuelve 1 esperado. Auditorías anteriores intactas.

TypeScript, ESLint, Vitest (**403 pruebas en 5 archivos: 320 anteriores y 83 nuevas**) y build aprobados. Se conservan escenarios históricos de 50 y 100 mediante manifests aislados; la carga actual prueba 150. Los validadores completos siguen exigiendo 500. Revisión visual NO EJECUTADA, sin cambios de UI ni idiomas. Detalle: [CODEX-003C.md](qa/CODEX-003C.md).

Permanece pendiente la revisión editorial global de balance y alias desconocidos. Presupuesto y fórmula intactos. B04 no iniciado automáticamente.

## Uso del catálogo en PLAYTEST_150

CODEX-004A consume exactamente los 150 registros reales cargados por B01+B02+B03 como fuente del draft local. No crea jugadores de relleno, no corrige datos de lotes existentes y no declara completado catalog_v1: la carga sigue siendo parcial y la validación global de 500 permanece pendiente.

La planificación posterior separa el producto de la secuencia editorial: **EARLY_ACCESS_250** combinará estos 150 contemporáneos con 100 leyendas que pueden incorporarse directamente en B07 y B08. B04–B06 no se rellenan para alcanzar ese hito y los IDs/rangos reservados se conservan. **FULL_CATALOG_500** mantiene como condición los diez lotes y la auditoría global vigente.

La futura propuesta de íconos históricos S+ dentro de S contempla Messi, Maradona, Pelé, Cruyff, Zidane, Cristiano Ronaldo, Ronaldo Nazário, Beckenbauer, Ronaldinho y Di Stéfano. Messi, Maradona y Pelé son las referencias centrales propuestas; el orden y los otros puestos siguen abiertos. Es una etiqueta visual posterior; los ratings, precios y distribución de tiers actuales no cambian.


## CODEX-005C

CPU estratégica local implementada como opción junto a hot-seat. Perfiles CONSERVATIVE/BALANCED/AGGRESSIVE, valoraciones privadas fijas por ronda, registro de decisiones y asignaciones obligatorias diferenciadas. Banderas locales MIT y piloto de una foto verificada con créditos. Preparación de 200 nuevas identidades argentinas: 0/200 creadas; cuatro lotes ARG-B01..04, namespace independiente. Ver [ADR-0009](decisions/ADR-0009.md), ARGENTINA_COLLECTION.md y qa/CODEX-005C.md.
