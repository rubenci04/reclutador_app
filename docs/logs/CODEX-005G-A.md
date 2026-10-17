# CODEX-005G-A — Registro de trabajo

17/10/2026. Base `c2a15cc`, rama `codex/current-club-audit`, árbol limpio. Se leyeron reglas y planificación obligatoria y se limitaron cambios a interfaz y reglas de disponibilidad/confirmación de subastas.

Se agregaron canchas autoritativas 4-3-3 y moneda SVG/CSS propia. La decisión de la moneda pasa al momento de confirmar el lado, conserva la semilla y solo admite una transición. Se diagnosticaron reserva futura, saldo, cupos, turnos y validación de importe; no se confirmó un defecto de asignación del motor ni una causa específica de CPU en el reporte original. Se corrigieron inconsistencia entre importe mostrado/enviado, ofertas fraccionarias habilitadas y falta de explicación. La adjudicación por doble pase ahora se anticipa y confirma expresamente.

Typecheck, lint, build y auditoría parcial de 150 aprobados. Vitest: 487 aprobadas, cuatro baterías masivas omitidas por alcance. Recorrido de 22 rondas y partido incluido. Navegador integrado deshabilitado: QA visual NO EJECUTADA y guía manual en [el informe](../qa/CODEX-005G-A.md). Sin nuevos datos deportivos, tácticas, servicios, push ni deploy.
