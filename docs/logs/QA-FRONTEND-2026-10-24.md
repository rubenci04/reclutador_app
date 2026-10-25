# QA frontend — 24/10/2026

Alcance: contraste del RankChip, precio pagado de suplentes y apellidos compuestos. El HEAD de partida, `de39d72`, ya incluía las tres correcciones y cobertura básica; se conservan las reglas del motor.

- CSS: un único bloque `.single-player-card article > b.rank-chip, .rank-chip` mantiene texto `#10210f`, fondo `#d5fb76`, tamaño `.78rem` y peso 800. Contraste calculado mediante luminancia sRGB: **14,35:1**, superior a 7:1 (AAA para texto normal).
- Ranking: regresión explícita en REVEAL_PLAYER, además de BIDDING, SigningReveal y plantel, en tres idiomas.
- Precio: se conserva el fallback existente `player?.price ?? '—'` en banco y once. El test compra realmente una carta del escaparate sin entrada award, comprueba el precio en `.team-bench`, la intercambia al once y comprueba ambos precios; el titular que pasa al banco conserva el precio de su adjudicación.
- Nombres: pruebas independientes de los tres ejemplos, las catorce partículas en minúsculas/mayúsculas, límite de 12 caracteres y nombres ordinarios. Se conserva la implementación existente.

Validación final: `npm run typecheck`, `npm run lint`, `npm test` y `npm run build` terminan con código 0. Suite completa: **1.393 pruebas en 131 archivos**. Lint conserva tres advertencias previas de Fast Refresh en `DribblePanel.tsx`; build conserva el aviso de bundles mayores de 500 kB. Ningún error y sin cambios en golden históricos. Sin push ni despliegue en este encargo.
