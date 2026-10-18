# UX 002 — bonus de plantel, carteles de subasta, suplentes con el dinero sobrante y móvil

19/10/2026. Pedidos del usuario tras jugar en producción.

## Bonus por mejor promedio global (solo duelos)
- `simulateMatch` recibe `rosterBonus: true` desde `startDuelMatch`; sin ese indicador la simulación es idéntica (los hashes dorados v2 y tácticos no cambian).
- El lado con mejor poder global suma **0,8 puntos de fuerza por punto de diferencia** (máximo 3; nada si la diferencia es < 0,5) en ataque, defensa y mediocampo, en cada bloque. Se suma a lo que ya aporta la estrategia. Queda guardado en `MatchResult.rosterAdvantage` y se muestra en el resumen táctico («Ventaja de plantel: …»).
- El bonus es explícito y acotado: ganar la subasta del plantel pesa más sin decidir el partido.

## Carteles de ofertar y pasar
- Panel de oferta: recuadro con lo que pasa si ofertás y si pasás («Si pasás, CPU se queda con X por NM»).
- Si no podés ofertar: recuadro naranja con el motivo y los números (posición completa, saldo insuficiente, o dinero reservado: «de tus 40M tenés que reservar 33M para completar los 11 puestos que te faltan; máximo seguro 7M»).
- Cuando el rival pasa: «¡CPU no va a ofertar más! Reclutador uno gana la subasta de X por NM» y el botón pasa a «Confirmar fichaje y seguir».

## Suplentes con el dinero sobrante
- En el paso de ordenar el once, cada humano ve «Suplentes de …» con lo que le queda y hasta 3 opciones por línea (DEF, MED, DEL), mejores primero y solo lo que alcanza y nadie tiene. Un suplente por línea; el precio se descuenta; se cierra al empezar el paso de estrategia. La CPU gasta su sobrante automáticamente (determinista).
- Los suplentes entran al banco del partido (reglas `subs-v1`); sin compras el partido es idéntico al de antes.

## Por qué «no deja ofertar» (diagnóstico)
Reglas vigentes, no un fallo: (1) **posición completa** (ya tenés los 3 delanteros), (2) **saldo** menor al precio base, (3) **reserva**: el motor guarda el dinero mínimo para poder completar los puestos faltantes, así que el máximo seguro puede ser menor que el saldo. En 150 duelos simulados hubo ~8 bloqueos por posición completa y ~3 por reserva por partida, y ~2,3 descartes y 0,6 asignaciones obligatorias; el sorteo no mira la necesidad de cada equipo. Ahora el motivo se explica con números.
- **Propuesta para más adelante (no implementada):** descartes individuales en lugar de compartidos (cada reclutador descarta con los suyos; el rival decide si adjudica o pasa) y un sorteo que tenga en cuenta las posiciones que aún necesita cada equipo. Requiere cambiar `discardsRemaining`, la cola de decisiones y la CPU; se plantea como siguiente tarea.

## Móvil (S23 Plus ≈ 384-412 px)
- Medido a 412 px: sin desbordes horizontales. La barra fija pasó de 254 a 147 px (se ocultan cupos por posición y signados; siguen en «Ver canchas»), la ficha del jugador queda en dos columnas (foto 104 px) y el panel de oferta aparece sin bajar casi nada; botones de acción flexibles, botón de ayuda más chico y cabecera que envuelve.
- Dos fotos de acción/grupo descartadas (Otamendi y Julián Álvarez); 274 + 1 fotos en total.

## Pruebas
`substituteMarket.test.tsx` (6): bonus proporcional/acotado/ausente, registro en el resultado, mercado (solo lo asequible y libre, mejor primero), compra con precio único y una por línea, presupuesto y CPU determinista, banco del partido. Pruebas de flujo actualizadas al nuevo botón «Confirmar fichaje y seguir».
