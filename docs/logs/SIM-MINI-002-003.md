# Registro SIM-MINI-002/003 + RANK-REVEAL-009 — 22/10/2026

- Contradicción registrada: el encargo pedía que el ranking no se mostrara durante la venta, mientras UX-AUCTION-007/RANK-008 lo mostraba en la ficha; se reemplazó (la prueba `auctionFocus.test.tsx` se actualizó).
- Decisión: la serie local contra CPU lleva la opción `shootout`; la tanda no se calcula antes de los tiros. `seriesPenalties` se conserva para series rápidas, online e históricas.
- Decisión: en la defensa interactiva, el sorteo del carril ocurre después de los sorteos tradicionales y solo con la opción, para no alterar el flujo de partidas anteriores.
- Capturas con una página auxiliar temporal (eliminada, sin commit). No se ejecutó una partida completa de 22 rondas hasta cada minijuego en el navegador.
- Publicación: commit 3d458fa a `main` (fast-forward desde fa31c2a). Wrangler 4.151.3 (caché de npx), build, dry-run y deploy con `--keep-vars --no-autoconfig`. Worker `reclutador-app`, versión 05e99a73-495a-41f9-80ee-63980e59f3e0 al 100 %, etiqueta 3d458fa. HTTP 200; SHA-256 de index.html y de los cuatro assets cambiados coinciden con `dist`. Sin cambios de bindings, secretos ni migraciones. No acredita E2E online ni QA en dispositivos reales.
