# Avance de catalog_v1

Fecha fija de referencia: **16/10/2026**. Alcance aprobado en CODEX-003A: **500**, sustituyendo explícitamente los 100 de CODEX-002. Total implementado: **50/500**. CODEX-003 / DL-F02-DATA-002: **EN CURSO**.

| Lote | Categoría | IDs reservados | Esperados | Implementados | Estado |
|---|---|---|---:|---:|---|
| B01 | contemporary | plr_001–plr_050 | 50 | 50 | Implementado; validación parcial aprobada |
| B02 | contemporary | plr_051–plr_100 | 50 | 0 | Pendiente |
| B03 | contemporary | plr_101–plr_150 | 50 | 0 | Pendiente |
| B04 | contemporary | plr_151–plr_200 | 50 | 0 | Pendiente |
| B05 | contemporary | plr_201–plr_250 | 50 | 0 | Pendiente |
| B06 | contemporary | plr_251–plr_300 | 50 | 0 | Pendiente |
| B07 | legend | plr_301–plr_350 | 50 | 0 | Pendiente |
| B08 | legend | plr_351–plr_400 | 50 | 0 | Pendiente |
| B09 | legend | plr_401–plr_450 | 50 | 0 | Pendiente |
| B10 | legend | plr_451–plr_500 | 50 | 0 | Pendiente |

Los archivos B02–B10 no existen. Sus estados figuran en manifest.json sin datos de relleno.

B01 reúne 22 nacionalidades y 29 clubes, con 12 argentinos y 26 sudamericanos. Estas cifras describen lo implementado y no reemplazan los cupos del catálogo completo.

## Cantidades verificadas

| Posición | Contemporary implementados / objetivo | Legend implementados / objetivo | Total implementado / objetivo |
|---|---|---|---|
| ARQ | 6 / 36 | 0 / 24 | 6 / 60 |
| DEF | 16 / 96 | 0 / 64 | 16 / 160 |
| MED | 15 / 90 | 0 / 60 | 15 / 150 |
| DEL | 13 / 78 | 0 / 52 | 13 / 130 |
| Total | 50 / 300 | 0 / 200 | 50 / 500 |

| Tier | B01 implementado | Objetivo global |
|---|---:|---:|
| S | 6 | 60 |
| A | 10 | 100 |
| B | 15 | 150 |
| C | 12 | 120 |
| D | 7 | 70 |

## Calidad de datos y balance

Identidad, club, selección y período se trazan por ID en [B01_EDITORIAL.md](catalog/B01_EDITORIAL.md). Ratings/atributos son editoriales, no estadísticas oficiales. Se registran las decisiones de categoría para carreras entre generaciones, la clasificación de Acuña y Di María, clubes durante préstamos y homónimos. No hay errores estructurales ni precios incoherentes detectados en B01.

Revisión de balance pendiente: las versiones representativas 2018 de algunos veteranos pueden revisarse frente a su pico absoluto. También deberá contrastarse la sostenibilidad de seis S por lote con las nueve selecciones restantes. No inflar valoraciones para cerrar cuotas. Los casos de alias humanos requieren revisión editorial además de la normalización automática de nombres.

## Pruebas y cierre

Auditoría reproducible: npm run catalog:audit. Resultado real guardado en [CODEX-003A-catalog-audit.json](qa/CODEX-003A-catalog-audit.json): B01 approved en modo partial; catálogo global pending, valid:false, 450 IDs faltantes; economía global not_evaluated y CPU pending.

TypeScript, ESLint, Vitest (215 pruebas) y build ejecutados en CODEX-003A; detalle y límites en [informe QA](qa/CODEX-003A.md). La aprobación del cargador completo usando fixtures sintéticos verifica su lógica, no los 450 jugadores reales que faltan.

Pendientes: B02–B10, segunda revisión editorial y auditoría global de identidad/distribuciones/precios, comprobación económica completa y posterior selección CPU 95–100M en su fase. La fórmula y el presupuesto siguen intactos. Próximo lote recomendado: **B02 / DL-F02-DATA-005**, sin reutilizar futbolistas de B01. No iniciado.
