# CODEX-005G-C3D — Narración táctica por eventos

18/10/2026. Base `041ac3f` (C3C), rama `codex/current-club-audit`. Ejecutada con Claude Code a partir de la opción «Narración táctica» elegida por el usuario.

## Qué se hizo
- `tactics/eventInfluence.ts`: `eventInfluence` decide si un evento del partido lleva una etiqueta táctica. Solo lee los ajustes ya calculados del bloque: no consume números aleatorios y no cambia ningún resultado, marcador ni estadística.
  - Ataque, tiro o gol del equipo X: etiqueta con su estrategia si es juego por bandas, contraataque o presión alta con ajuste de ataque > 1, o control del mediocampo con ajuste de mediocampo > 1.
  - Atajada (equipo que defiende): bloque bajo con ajuste defensivo > 1. Recuperación: bloque bajo (defensa > 1) o presión alta (mediocampo > 1).
  - NEUTRAL nunca se etiqueta; un ajuste que favorece al rival no se atribuye.
- `MatchEvent.tactic` (opcional) y `MatchScreen`: debajo del evento se lee «Influencia táctica: presión alta» (es-AR, en y pt-BR). Es un indicio explicativo, no una afirmación de causa exacta: la etiqueta significa que la estrategia tenía un efecto relevante en ese bloque.
- Sin cambios de fórmulas, semillas ni versión de reglas (`local-match-v2`, `tactics-v1`).

## Pruebas reales
- `npm run typecheck`, `npm run lint`, `npm run build`: correctos.
- `npm test`: 558 aprobadas de 558 (554 en C3C; +4).
- Invariancia: 288 partidos tácticos grabados **antes** de modificar el simulador (`tactical-golden.json`: 36 pares de estrategias × 8 semillas; huella de eventos sin etiqueta, marcador, estadísticas, ganador y ajustes) se reproducen idénticos. Los 300 resultados NEUTRAL de C2 siguen idénticos (sus eventos no llevan etiqueta).
- Coherencia: ninguna etiqueta aparece en un equipo NEUTRAL ni en uno distinto de su estrategia; se etiquetan más de 50 eventos en la muestra; umbral y rol por tipo de evento cubiertos por pruebas unitarias; la pantalla muestra la etiqueta solo al revelarse el evento.
- No se repitió la calibración estadística: las pruebas anteriores demuestran que los resultados no cambiaron.

## No verificado
QA visual (legibilidad de la línea «Influencia táctica» en 360/390 px) pendiente.

## Guía breve de playtest
Jugar un duelo con estrategias activas (p. ej. presión alta contra bloque bajo) y mirar el relato: las líneas «Influencia táctica» deben aparecer en parte de los eventos, coincidir con la estrategia del equipo que actúa y no aparecer con NEUTRAL. Si aparecen demasiado o poco, el umbral es `INFLUENCE_THRESHOLD` en `eventInfluence.ts`.

## Estado de Git
Rama `codex/current-club-audit`, base `041ac3f`. Un commit local específico. Sin push ni deploy.
