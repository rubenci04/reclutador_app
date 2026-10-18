# CODEX-005H · H6 — Pulido audiovisual (parcial)

18/10/2026. Alcance implementado: **celebración de subasta ganada**. El resto de la lista de H6 queda sin tocar (ver «No incluido»).

## Implementado
- **Banner «¡GANASTE LA SUBASTA!»** (`WinCelebration.tsx`) en el resultado de ronda con jugador, precio final y nombre del equipo ganador (es-AR / en / pt-BR, incluido el `aria-label`).
- **Solo para subastas ganadas** (`reason === 'voluntary_bid'`). Las asignaciones obligatorias o de completitud conservan el título y el sonido anteriores. Contra CPU no se celebra si gana la CPU (se mantiene «CPU gana la subasta»); en hot-seat se celebra al ganador.
- **Sonido propio** `signing` (fanfarria sintética de cuatro notas + destello; sin archivos externos). `soundForRecord` elige el sonido por registro nuevo: una sola reproducción por actualización, sin duplicados por re-render (probado). Se silencia con el control de audio existente.
- **Efecto breve**: 10 chispas CSS de 1,2 s que terminan solas; no bloquea ni exige acción (se avanza con «Próxima ronda»). Con `prefers-reduced-motion` desaparecen las chispas y la animación; el texto permanece.
- **Camiseta en la cancha**: la camiseta recién fichada pulsa (`just-signed`) mientras dura el resultado; con movimiento reducido se muestra un contorno fijo.

## No incluido (queda pendiente, no declarado como hecho)
Revisión de claridad del botón de revisión, HUD, contador de descartes, posiciones urgentes, organización de equipos, confirmaciones, revelación de estrategia, inicio de partido y resultado final.

## Pruebas
`coinAndSounds.test.tsx`: la secuencia de sonidos ahora termina en `signing` para una subasta ganada; el banner aparece con el texto esperado; no hay sonidos extra tras 5 s; `soundForRecord` mantiene `award` para asignaciones obligatorias o de autocompletado. `audioEngine.test` actualizado con el id `signing`. Suite completa: 613 de 613; typecheck, lint y build correctos.
