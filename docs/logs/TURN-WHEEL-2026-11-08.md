# Ruleta del turno inicial — 08/11/2026

## Alcance y decisión

El pedido fue hacer más divertido el sorteo y revisar otras oportunidades de animación. La subasta ya sortea quién abre la primera ronda y alterna después; online confirma el sorteo en el servidor. Se añadió una ruleta visual que representa exactamente ese resultado guardado. Elegir cara o cruz la hace girar. La moneda y el botón para omitir siguen visibles. Se usa en partidas locales entre amigos, contra CPU y en la sala online sin cambiar el contrato de red ni gastar azar nuevo.

Se revisaron las demás etapas: las cartas ya tienen entrada animada, el descarte tiene dados, el fichaje revela el rango y el partido ofrece decisiones interactivas. Agregar otro sorteo a cada ronda cambiaría la prioridad alternada y sus garantías de juego, así que no se alteró. La ruleta no promete decidir el jugador de cada ronda.

## Verificación

- `npm run typecheck`: aprobado.
- `npm run lint`: aprobado.
- `npm run build`: aprobado.
- `npm test -- --maxWorkers=4`: primera ejecución, 1622 aprobadas y 2 fallidas por el encabezado del sorteo cambiado. Se restauró el encabezado original; las 22 pruebas focalizadas de `AuctionPage` y `coinAndSounds` aprobaron. Suite completa final: 1624 aprobadas, 3 omitidas.
- QA visual y movimiento real en navegador: no ejecutada. Vite inició en `127.0.0.1:5174`, pero el navegador integrado devolvió `ERR_CONNECTION_TIMED_OUT`. La suite DOM comprueba resultado, opción de omitir y reducción de movimiento, pero no acredita fluidez en pantalla.

El archivo `.claude/` preexistente quedó fuera del cambio.
