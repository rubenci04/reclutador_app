# CODEX-005G-C3B — Resumen táctico en el resultado

18/10/2026. Base `12dfd78` (C3A), rama `codex/current-club-audit`. Ejecutada con Claude Code a pedido «continuá»; alcance acotado a lo pendiente de C3 que no depende de decisiones nuevas.

## Qué se hizo
- `TacticalSummary` (`local-match/`): al terminar el partido muestra la estrategia de cada equipo y el ajuste medio de ataque, defensa y mediocampo, leído de `result.tactics`. No recalcula nada. Para NEUTRAL indica «sin ajustes tácticos»; para resultados guardados sin `tactics` no muestra nada. Incluye la nota de que depende de ambos planteles y no garantiza ganar.
- Textos en es-AR, en y pt-BR (`match.tacticsTitle`, `tacticsNone`, `tacticsNote`).
- La prueba lenta de `AuctionPage` recibió un tiempo límite explícito de 30 s: falló una vez por superar los 5 s predeterminados con la suite completa en paralelo (aislada pasa en ~1 s), no por un defecto.

## Pruebas reales
`npm run typecheck`, `npm run lint`, `npm run build` correctos; `npm test`: 539 aprobadas de 539 (+3: estrategias y ajustes visibles, NEUTRAL, resultado antiguo sin táctica). Sin cambios en el motor; no se repitió la calibración.

## Pendiente (no hecho aquí)
- Narración por eventos que mencione la táctica (p. ej. «recuperación por presión alta»): requiere nuevos tipos de evento en el simulador y por tanto recalibrar; se deja para decidir tras el playtest del tamaño del efecto (1–4 puntos porcentuales).
- QA visual en 360/390 px de HUD, elección de estrategia y este resumen: **no ejecutada**.
