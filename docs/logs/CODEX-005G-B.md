# CODEX-005G-B — Registro de trabajo

17/10/2026. Base verificada `61b6e3a`, rama `codex/current-club-audit`, árbol limpio. Lectura de reglas, planificación, QA anterior, subastas y puntos de entrada de simulación.

Se implementaron tres descartes conjuntos con reemplazos deterministas, exclusión de candidatos usados, validación económica exacta y búsqueda finita. Reserva y cambios quedan en estado/registro; animaciones no adjudican ni sortean. Fallback explícito cuando no hay reemplazo viable y bloqueo si no hay adjudicación legal.

Defectos confirmados: iniciativa unilateral del simulador, verificación incompleta de unicidad/posición del once y reutilización de primera semilla en Draft Libre al remontar el mismo plantel. Se corrigieron; versión de simulación v2. Poder global es resumen de sectores, sin bonos de gasto. Calibración: 1.000 semillas × tres escenarios × dos orientaciones por versión (6.000 antes + 6.000 después), con fixtures sintéticos y catálogo deportivo intacto.

Typecheck, lint, build y auditoría parcial aprobados. Vitest: 498 aprobadas, tres baterías ajenas omitidas; incluye 1.000 subastas completas adaptadas. QA visual NO EJECUTADA por navegador deshabilitado. Informe y guía en [QA](../qa/CODEX-005G-B.md). Commit local específico; sin push, deploy, nuevas formaciones, tácticas ni futbolistas.
