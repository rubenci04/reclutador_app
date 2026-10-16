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
| DL-F02-DATA-002 | Crear y auditar catalog_v1 ampliado a 500 futbolistas (CODEX-003) | En curso: 50/500; no completar hasta auditar diez lotes |
| DL-F02-DATA-003 | Adaptar contrato/validación y manifest a 500 (CODEX-003A) | Completa |
| DL-F02-DATA-004 | Implementar y validar B01 (CODEX-003A) | Completa técnicamente; revisión editorial de balance registrada |
| DL-F02-DATA-005 | Implementar y auditar B02 | Pendiente |
| DL-F02-DATA-006 | Implementar y auditar B03 | Pendiente |
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
| DL-F03-I18N-001 | Traducir draft, presupuesto y confirmaciones | Pendiente |
| DL-F04-I18N-001 | Traducir simulación y resultados | Pendiente |
| DL-F05-I18N-001 | Traducir salas, espera y errores online | Pendiente |
| DL-F06-I18N-001 | Traducir resultados compartibles | Pendiente |

Nota de continuidad: DL-F02-DATA-001 se titulaba originalmente «Definir modelo y catálogo de futbolistas». CODEX-002 asigna ese mismo ID solo al contrato y validadores; no se renumeran tareas históricas y se separa el catálogo real como DL-F02-DATA-002. DL-F02-I18N-001 sigue pendiente: no se creó interfaz de catálogo ni se muestran diagnósticos técnicos al usuario.

Ampliación autorizada en CODEX-003A: DL-F02-DATA-002 pasa de 100 a 500 sin cambiar ID. Su aceptación exige diez lotes auditados con la matriz 300/200, cuotas por posición y tiers, IDs únicos y precios consistentes; aprobación parcial no equivale a cierre global. La base económica DL-F02-DATA-001 se conserva y su ampliación queda trazada por DL-F02-DATA-003. Véanse ADR-0004 y CATALOG_PROGRESS.md.
