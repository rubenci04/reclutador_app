# CODEX-005G-C2 — Registro de trabajo

17/10/2026. Base `465741b`, rama `codex/current-club-audit`, árbol limpio. Antes de tocar el simulador se grabaron 300 huellas de resultados v2 (`src/features/tactics/v2-golden.json`) para probar la compatibilidad NEUTRAL.

Se agregaron seis estrategias con perfiles, el modelo táctico puro (`tactics-v1`), su integración por bloque en el simulador, contratos versionados, validación de onces y estrategias en el límite del motor, selección de estrategia de la CPU sin acceso a la del rival y textos en tres idiomas para C3. Sin cambios de interfaz ni de catálogo.

Calibración en tres iteraciones (v0, v1 escala ×1,6, final con costes revisados); resultados en `docs/qa/CODEX-005G-C2-calibration*.json`. Typecheck, lint, build y 524 pruebas aprobadas. Sin push ni deploy.

Contradicción registrada: el informe maestro pedía «ajustes moderados» pero el motor v2 es poco sensible; el efecto táctico resultante es de 1–4 puntos porcentuales y queda documentado como riesgo para el playtest.
