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

## Revisión de la lista restante (18/10/2026, segunda pasada)
Se revisó en código cada punto que había quedado «no incluido». Resultado:
- **Ya cubiertos por trabajo previo (C3/H1–H3), sin cambios nuevos:** contador de descartes con puntos y aviso de agotados y posiciones urgentes («forzado») en el HUD (`AuctionHud`); confirmación explícita de asignaciones obligatorias y de descarte («Confirmar asignación» / «Confirmar descarte»); organización del equipo con confirmar/editar; revelación de estrategia en tres etapas con indicador de paso; resultado final con victoria/empate/derrota y silbato.
- **Sin cambio por decisión:** confirmar antes de «Volver» en el partido (el resultado ya está calculado y guardado, no se pierde nada); botón de revisión y claridad del inicio de partido: no hay evidencia de confusión fuera de la ya corregida en C3E, y cambiarlos sin prueba con jugadores sería especulativo.
- **Pendiente real:** prueba manual de usuario en Firefox para decidir si algo de lo anterior necesita ajuste.
H6 queda como **COMPLETA en lo comprobable por código**; el juicio de claridad depende de tu prueba.
