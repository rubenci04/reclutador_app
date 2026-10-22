# Registro SIM-MINI-002/003 + RANK-REVEAL-009 — 22/10/2026

- Contradicción registrada: el encargo pedía que el ranking no se mostrara durante la venta, mientras UX-AUCTION-007/RANK-008 lo mostraba en la ficha; se reemplazó (la prueba `auctionFocus.test.tsx` se actualizó).
- Decisión: la serie local contra CPU lleva la opción `shootout`; la tanda no se calcula antes de los tiros. `seriesPenalties` se conserva para series rápidas, online e históricas.
- Decisión: en la defensa interactiva, el sorteo del carril ocurre después de los sorteos tradicionales y solo con la opción, para no alterar el flujo de partidas anteriores.
- Capturas con una página auxiliar temporal (eliminada, sin commit). No se ejecutó una partida completa de 22 rondas hasta cada minijuego en el navegador.
