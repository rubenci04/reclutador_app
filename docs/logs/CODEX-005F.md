# CODEX-005F — Registro de trabajo

17/10/2026. Reconocimiento desde `9ebc97f` (CODEX-005E), rama `codex/current-club-audit`, sin cambios previos. Lectura de reglas, planificación, ADR-0002 y módulos de subasta.

Se confirmó semilla fija en el inicio de la interfaz. Se implementaron entropía por acción, contexto transportable, historial local versionado de cinco inicios y reducción probabilística de repetición con límites y relajación. Los onces visibles derivan del estado/registro de adjudicaciones y respetan los cuatro DEF. Se conservaron CPU, simulador y los 150 registros deportivos.

Comparación reproducible: 1.000 sorteos por política, solapamiento consecutivo 3,3063 → 1,8118; cuotas y viabilidad verificadas. Typecheck, lint y build aprobados; regresión: 482 pruebas aprobadas y dos baterías masivas de partidos omitidas por alcance.

El navegador devolvió `Local browser use is disabled in Work settings`; QA visual pendiente declarada en [el informe](../qa/CODEX-005F.md). Se documentó CODEX-005G como propuesta sin iniciarlo. Commit local específico, sin push/deploy.
