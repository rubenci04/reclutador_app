# Roadmap

Plan inicial creado en CODEX-001: no había documentos anteriores. Las fases posteriores son propuestas y requieren encargos independientes.

| Fase | Objetivo | Estado |
|---|---|---|
| F01 | Base React, calidad, interfaz inicial e internacionalización | Implementada; resultados en qa/CODEX-001.md |
| F02 | Contrato y catálogo de 500 futbolistas: 300 contemporáneos y 200 leyendas | B01 + B02 + B03 implementados (150/500); CODEX-003 sigue en curso |
| F03 | Draft local con presupuesto y validación de once | Implementada por PLAYTEST_150 / CODEX-004A |
| F04 | Simulación táctica y equipo CPU | Primer partido local implementado por CODEX-004B |
| F04.1 | Identidad El Reclutador, diagnóstico de balance y base de modalidades | Implementada como fundación técnica por CODEX-004C; no incorpora datos históricos ni torneos |
| F04.2 | Duelo de Reclutadores local: subastas hot-seat y partido entre dos equipos | Implementada por CODEX-005A; online y CPU pujador quedan pendientes |
| F05 | Versus online y salas entre amigos | Pendiente |
| F06 | Resultados compartibles | Pendiente |

## Hitos de producto tras CODEX-004A

| Hito | Alcance | Estado |
|---|---|---|
| PLAYTEST_150 | Draft local jugable con los 150 contemporáneos reales existentes, 4-3-3, presupuesto, persistencia e idiomas | Implementado en CODEX-004A |
| EARLY_ACCESS_250 | Los 150 contemporáneos actuales más 100 leyendas | Pendiente; los 100 pueden llegar en B07 y B08 sin rellenar artificialmente B04–B06 |
| FULL_CATALOG_500 | Diez lotes, distribución global 300/200 y auditoría final | Pendiente |

La numeración, los rangos de IDs y la validación global de 500 se mantienen. PLAYTEST_150 no presenta el catálogo parcial como aprobación final. La futura distinción editorial y visual S+ propone diez candidatos dentro del tier S, encabezados por Messi, Maradona y Pelé; no modifica rating, precio ni cartas.

CODEX-004B completa el primer ciclo local: once confirmado, rival CPU 4-3-3 reproducible por semilla, simulación calculada antes de reproducirse y resultado final. No agrega multijugador, nuevas formaciones, jugadores ni exportación PNG.

CODEX-002 completó el contrato, economía y validadores de DL-F02-DATA-001. El título histórico del tablero incluía el catálogo completo; se conserva ese ID para este contrato sin declarar creados los 100 registros.

CODEX-003A amplía explícitamente el objetivo de 100 a 500 registros, sin reiniciar el proyecto ni renumerar tareas. Criterio de cierre de DL-F02-DATA-002/CODEX-003: diez lotes reales de 50 auditados, IDs plr_001..plr_500 únicos, 300/200 categorías, matriz posicional y tiers completos, precios correctos y prueba global de viabilidad. La futura selección CPU 95–100M queda pendiente de un encargo para esa fase.

CODEX-003B incorpora B02 sin modificar B01 y agrega revisión acumulativa de alias e identidades. Progreso: B01/B02 completos técnicamente, 100 contemporáneos; B03–B10 pendientes. Aprobación global y auditoría editorial final PENDIENTES. Próxima tarea recomendada: B03, 50 contemporáneos con IDs plr_101..plr_150, mismos cupos parciales y revisión de colisiones contra los 100 ya cargados. No iniciado automáticamente.

CODEX-003C completa B03 y audita 150 contemporáneos, preservando B01/B02. Tres lotes completos; B04–B10 y auditoría global pendientes. Próxima tarea recomendada: B04, plr_151–plr_200, con contraste contra los 150 existentes. No iniciado automáticamente.

CODEX-004C presenta comercialmente el producto como **El Reclutador** sin alterar claves de persistencia, IDs de catálogo ni rutas históricas. Entrega el motor puro de modalidades, contratos de procedencia verificable y un selector cuyo único modo ejecutable es Global. Las modalidades futuras quedan pendientes hasta incorporar datos revisados y una integración de partida explícita. El simulador conserva sus probabilidades; el diagnóstico de 2.400 encuentros queda registrado en qa/CODEX-004C.md antes de cualquier decisión subjetiva de balance.

CODEX-005A establece Duelo de Reclutadores como modo local principal: once rondas de subasta por pares de la posición correspondiente, 100M por persona y partido posterior con el simulador existente. Draft Libre queda como alternativa. La autoridad de las reglas vive en un motor puro preparado para servidor, pero no se incluye red, autenticación, salas ni CPU pujador.
