# Tablero de tareas

Nomenclatura: DL-FXX-CAT-NNN; FXX indica fase y CAT responsabilidad. No existía tablero anterior.

| ID | Actividad | Estado |
|---|---|---|
| DL-F01-ARC-001 | Reconocimiento, stack y estructura strict | Completa |
| DL-F01-UI-001 | Inicio responsive y cancha ilustrativa 4-3-3 | Completa |
| DL-F01-I18N-001 | Recursos es-AR/en/pt-BR y fallback | Completa |
| DL-F01-I18N-002 | Selector accesible, persistencia y recuperación | Completa |
| DL-F01-I18N-003 | Posiciones y vocabulario inicial compartido | Completa |
| DL-F01-QA-001 | Automatización y comprobaciones de CODEX-001 | Completa; resultados y límites en qa/CODEX-001.md |
| DL-F01-DOC-001 | ADR-0002, reglas, roadmap e informe | Completa |
| DL-F02-DATA-001 | Modelo, contrato, economía y validadores del catálogo (CODEX-002) | Completa; ver qa/CODEX-002.md |
| DL-F02-DATA-002 | Crear y auditar catalog_v1 ampliado a 500 futbolistas (CODEX-003) | En curso: 150/500; no completar hasta auditar diez lotes |
| DL-F02-DATA-003 | Adaptar contrato/validación y manifest a 500 (CODEX-003A) | Completa |
| DL-F02-DATA-004 | Implementar y validar B01 (CODEX-003A) | Completa técnicamente; revisión editorial de balance registrada |
| DL-F02-DATA-005 | Implementar y auditar B02 | Completa; CODEX-003B, B02 y acumulado de 100 validados |
| DL-F02-DATA-006 | Implementar y auditar B03 | Completa; CODEX-003C, B03 y acumulado de 150 validados |
| DL-F02-DATA-007 | Implementar y auditar B04 | Pendiente |
| DL-F02-DATA-008 | Implementar y auditar B05 | Pendiente |
| DL-F02-DATA-009 | Implementar y auditar B06 | Pendiente |
| DL-F02-DATA-010 | Implementar y auditar B07 | Pendiente |
| DL-F02-DATA-011 | Implementar y auditar B08 | Pendiente |
| DL-F02-DATA-012 | Implementar y auditar B09 | Pendiente |
| DL-F02-DATA-013 | Implementar y auditar B10 | Pendiente |
| DL-F02-QA-001 | Auditoría final global de 500 y viabilidad económica | Pendiente; no ejecutada sobre un catálogo completo real |
| DL-F02-I18N-002 | Traducir categorías contemporary/legend en tres idiomas | Completa |
| DL-F02-I18N-001 | Traducir interfaz y validaciones del catálogo | Pendiente |
| DL-F04-PLAY-001 | Primer prototipo jugable PLAYTEST_150 (CODEX-004A) | Completa; draft local, catálogo real, persistencia, i18n y QA visual |
| DL-F04-PLAY-002 | Primer partido local contra CPU (CODEX-004B) | Completa; generador CPU con semilla, motor puro, reproducción y resultado |
| DL-F04-PLAY-003 | El Reclutador: identidad, diagnóstico y fundación de modalidades (CODEX-004C) | Completa; selector Global, filtros puros y contratos sin importar datos externos |
| DL-F04-DATA-001 | Cargar y revisar metadatos temáticos por procedencia | Pendiente; requiere revisión editorial, sin rellenos ni consultas de API en runtime |
| DL-F04-BAL-001 | Decidir un cambio de balance si producto lo solicita | Pendiente; alternativas documentadas sin modificar probabilidades |
| DL-F04-PLAY-004 | Duelo de Reclutadores hot-seat y subastas (CODEX-005B) | Completa; 22 cartas individuales, cupos y presupuesto protegidos, moneda persistente, registro y simulador compartido |
| DL-F05-ONLINE-001 | Servidor autoritativo para pujas y cara o cruz | Pendiente; reutilizar el motor puro de DL-F04-PLAY-004 |
| DL-F04-CPU-002 | CPU pujadora en Duelo de Reclutadores | Completa en CODEX-005C; tres perfiles reproducibles, opción Contra CPU |
| DL-F03-I18N-001 | Traducir draft, presupuesto y confirmaciones | Completa en CODEX-004A |
| DL-F04-I18N-001 | Traducir simulación y resultados | Completa en CODEX-004B |
| DL-F05-I18N-001 | Traducir salas, espera y errores online | Pendiente |
| DL-F06-I18N-001 | Traducir resultados compartibles | Pendiente |

Nota de continuidad: DL-F02-DATA-001 se titulaba originalmente «Definir modelo y catálogo de futbolistas». CODEX-002 asigna ese mismo ID solo al contrato y validadores; no se renumeran tareas históricas y se separa el catálogo real como DL-F02-DATA-002. DL-F02-I18N-001 sigue pendiente: no se creó interfaz de catálogo ni se muestran diagnósticos técnicos al usuario.

Ampliación autorizada en CODEX-003A: DL-F02-DATA-002 pasa de 100 a 500 sin cambiar ID. Su aceptación exige diez lotes auditados con la matriz 300/200, cuotas por posición y tiers, IDs únicos y precios consistentes; aprobación parcial no equivale a cierre global. La base económica DL-F02-DATA-001 se conserva y su ampliación queda trazada por DL-F02-DATA-003. Véanse ADR-0004 y CATALOG_PROGRESS.md.

CODEX-003B cerró únicamente DL-F02-DATA-005. El acumulado B01+B02 contiene 100 contemporary y 0 legend, con globalStatus=pending/valid:false. B01 y su auditoría histórica se conservaron intactos. La auditoría completa DL-F02-QA-001 sigue pendiente; no se inició B03.

CODEX-003C cierra DL-F02-DATA-006: 150/500, contemporary 150/300, legend 0/200, tres lotes aprobados parcialmente y global pending/valid:false. Los datos y precios de B01/B02 se conservaron intactos; auditoría global pendiente. B04 no iniciado.


## CODEX-005C

CPU estratégica local implementada como opción junto a hot-seat. Perfiles CONSERVATIVE/BALANCED/AGGRESSIVE, valoraciones privadas fijas por ronda, registro de decisiones y asignaciones obligatorias diferenciadas. Banderas locales MIT y piloto de una foto verificada con créditos. Preparación de 200 nuevas identidades argentinas: 0/200 creadas; cuatro lotes ARG-B01..04, namespace independiente. Ver [ADR-0009](decisions/ADR-0009.md), ARGENTINA_COLLECTION.md y qa/CODEX-005C.md.
