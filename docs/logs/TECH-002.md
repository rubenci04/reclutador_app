# TECH-002 — Subasta sin clic por ronda y panel estable — 31/10/2026

## Cambios

- **Pujas abiertas automáticamente (solo partidas locales).** `setGame` local pasa cada estado nuevo por `openBidding`: si la fase es `REVEAL_PLAYER`, aplica la misma transición pura `beginBidding`. Así cubre a la vez moneda, avance de ronda, reemplazo por descarte y `apply`. No se abre sola cuando la interfaz resuelve la ronda por su cuenta (completado rápido ofrecido a alguien, o carta de una línea ya llena contra la CPU); ahí sigue el botón «Comenzar subasta». Online sin cambios. `auctionEngine.ts` intacto.
- **Aviso de la moneda en la ronda 1:** `.coin-notice` no bloqueante (moneda + `coin.result`) sobre el panel durante toda la ronda 1 (texto existente, ya traducido).
- **Panel estable en el turno de la CPU:** `AuctionBidPanel` ya no se desmonta; recibe `thinking`, agrega `.bid-panel-thinking` y `aria-busy`, muestra `auctionActions.blocks.CPU_THINKING` en el banner (una línea, con `title`) y los controles quedan deshabilitados por `availability`. Durante ese turno no se muestra el aviso de asignación y el botón dice «Pasar» para no cambiar de alto.
- **Sonido:** `diceRoll` también suena cuando una carta nueva llega directo a `BIDDING`.

## Pruebas

- Se quitaron los clics a «Comenzar subasta» en las pruebas de interfaz que ahora encuentran la puja abierta; un bucle (`AuctionPage.test.tsx`) lo pulsa solo si sigue visible. Aserciones adaptadas en `AuctionPage`, `autoRounds`, `entryFlow` (botón «Ofertar» en lugar de «Comenzar subasta») y la prueba de la CPU ahora verifica `.bid-panel-thinking` y «Pasar» deshabilitado. `auctionEngine.test.ts` sin cambios.
- `npm run typecheck`, `npm run lint` (0 errores, 4 advertencias previas), `npm test` (1.602 aprobadas, 3 omitidas) y `npm run build`: aprobados.
- Navegador local (1024×768, es-AR, contra la CPU): el panel mide 612 px con el turno del jugador y 612 px con «CPU evaluando»; ya no se desmonta entre turnos.

## Límites

- Sigue habiendo variación de altura ajena a este encargo: el aviso de asignación del jugador (64–83 px) cuando la CPU ya ofertó y el cambio a la tarjeta de resultado de la ronda.
- Una partida restaurada de TECH-001 justo en `REVEAL_PLAYER` muestra el botón hasta el siguiente cambio de estado.
- Sin QA en celular. Sin push ni deploy.
