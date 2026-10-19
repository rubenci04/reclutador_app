# Actividad — 19/10/2026

- Lectura previa de README, ROADMAP, TASK_BOARD, TEST_PLAN y ADR-0002.
- Estado previo: cuatro TXT sin seguimiento, `.claude/` ajeno y cambios previos en docs/qa/CODEX-005C-stress.json. Se preservan; `.claude/` y el informe previo no se incluyen en el commit del encargo.
- Importados 1.200 registros en namespace separado, ocho colecciones actuales/históricas y Global Legends combinado. Sin fotos.
- Contradicciones resueltas en ADR-0014: escalas distintas de rango/OVR, históricos que siguen activos fuera de la liga y economía inviable a 100M para dos onces de ciertas colecciones. No se falsifican fechas de pico ni verificaciones de carrera.
- Tres cartas de técnicos por liga/época, referencias secundarias, contrato inicial accesible y técnico compartido permitido.
- action-v1, series de tres con dos desempates y penales, CPU/hot-seat/Draft Libre/online. Historial local registra la serie completa; online la deriva del resultado inicial compartido.
- Primera regresión: siete fallos por expectativas antiguas (seis técnicos, 188 argentinos, presupuesto 100M, revancha inmediata). Actualizados los contratos de prueba; nuevos casos verifican importación, partidas, series, replay, contexto y calibración.
- QA visual: Vite disponible en 127.0.0.1:5173, pero el navegador integrado devuelve net::ERR_CONNECTION_TIMED_OUT. No se declara verificación visual de escritorio/móvil.
- Resultados finales y límites: docs/qa/COLLECTIONS-SERIES.md. Sin deploy ni configuración de servicios externos.
