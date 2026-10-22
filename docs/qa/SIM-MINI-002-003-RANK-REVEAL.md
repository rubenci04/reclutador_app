# SIM-MINI-002 + SIM-MINI-003 + RANK-REVEAL-009

Base: `main` fa31c2a (rama `codex/sim-005`). Alcance respetado: no se tocó la gambeta ni se rediseñó la subasta; ni el OVR ni el cálculo del ranking.

## 1. Ranking sorpresa (RANK-REVEAL-009) — conectado
- `RankChip` ya no se renderiza mientras el futbolista está en venta: ni en la ficha del sorteo (`PlayerIdentity`), ni en el descarte, ni en el dúo (`DualDraftScreen`), ni en `AuctionPlayerBar` (sin prop `rank`). Tampoco hay `aria-label`/título con el puesto.
- Al confirmarse la adjudicación aparece `SigningReveal` en la sección del resultado: «¡Fichaje confirmado!» + «TOP 3 · #2/150» (tramos 3/10/25/50/total, `rankBracket`), con animación breve que respeta `prefers-reduced-motion`. Usa la categoría real de quien ficha (cruces incluidos). Sin ranking recuperable (partidas históricas, catálogo congelado) no se muestra nada.
- Después, el puesto vive en la plantilla: `· #n` bajo el OVR en cada camiseta de `TeamPitchBoard` y `RankChip` en la ficha del diálogo.

## 2. SIM-MINI-002 — disparo de precisión
**Componente reutilizable** `ShotPanel` (+ `ShotScene`, `TimingBar`/`timing.ts`): vista cercana del arco, tres sectores (clic/toque/flechas), barra horizontal con zona verde estrecha (12 %), marcador que va y vuelve, se frena con clic/toque/Espacio. Escena: carrera, contacto, trayectoria, respuesta del arquero y desenlace. Movimiento reducido: sin barra animada (precisión neutra 0,5) y escena en su último cuadro. Siempre hay «Resolver con el sistema tradicional».

**Tiros libres (conectado al partido):** opción versionada `precision-shot-v1` (requiere `free-kicks-v1`, solo local contra CPU). Solo se usa en `FK_ATTACK` con zona `CENTRAL_OUTSIDE` (regla de `freeKicks.ts` intacta); centro y pase corto se conservan para las demás zonas. La precisión (0–1) viaja en el comando, queda en el registro (`plays[].precision`) y mueve las probabilidades de `freeKickChances`: tiro al arco ±0,15, gol ±0,05, bloqueo ∓0,04 (con `clamp`; nunca garantiza). La reacción del arquero (`plan.keeper`) se sortea en `planFreeKick`, antes de la elección; los sorteos no cambian de cantidad ni de orden. Sin precisión (tradicional) el cálculo es idéntico al anterior.

**Penales de desempate (conectado a la serie):** `penalty-shootout-v1` (`interactive/penaltyShootout.ts` + `PenaltyShootoutScreen`), solo serie local contra CPU de partidas nuevas (opción `shootout`). Cuando patea el usuario, el salto del arquero CPU está fijado antes de confirmar; cuando patea la CPU, su sector y precisión están fijados y el usuario elige hacia dónde se tira el arquero. Resultado de cada tiro: dos sorteos del mismo flujo con semilla, según ejecutante, arquero, sector, salto y precisión. Ganador y marcador salen únicamente de los tiros confirmados (corte anticipado estándar en los cinco primeros; muerte súbita después; moneda solo tras 50 rondas parejas). Alternativa accesible: «Resolver el resto con el sistema tradicional» (los tiros restantes los decide el mismo motor y quedan marcados `AUTO`). La serie no se registra hasta que la tanda termina; el registro auditable incluye `shootout`. Series rápidas, online (`resolveSeries`) y partidas históricas conservan `seriesPenalties`.

## 3. SIM-MINI-003 — defensa interactiva (conectada)
Opción `defense-mini-v1` (requiere momentos + aéreo + reglas de entretiempo; solo local contra CPU). El **primer** nodo `DEFEND` del partido (máximo uno) trae `defense.lane`, el carril que usará el atacante CPU, sorteado después de los sorteos tradicionales y antes de la elección. `DefensePanel`: tres carriles para anticipar o «Presionar», barra de timing, alternativa tradicional (`INTERCEPT`). `interactiveDefenseChance`: DEF/MEN/FÍS del defensor, atacante, táctica (BLOQUE BAJO/PRESIÓN ALTA), lectura del carril (+0,20 / −0,10) y precisión (±0,12), acotada a 0,10–0,85. `DefenseScene` revela el carril y muestra recuperación, pase superado y su continuación (bloqueo, afuera, atajada o gol), todo tomado de los eventos confirmados. La gambeta y las decisiones tradicionales no cambian.

## 4. Pruebas
- `rankReveal.test.tsx` (3 idiomas): oculto en venta, revelado al confirmar, visible en la plantilla, sin ranking inventado.
- `interactive/miniGames.test.ts`: reacción del arquero fija antes del tiro, precisión monótona y acotada, determinismo, sin doble resolución (`DUPLICATE_COMMAND`), rechazo de precisión sin opción/fuera de nodo, checkpoint/restore, un solo `DEFEND` interactivo por partido, ausencia sin opción, tanda: intención CPU previa, ganador derivado de los tiros, auto-resolución `AUTO`, muerte súbita.
- `miniGamesScreen.test.tsx` (pantalla real): tiro libre (ratón, teclado, tradicional, registro), defensa (carril, escena, tradicional), tanda aislada y serie completa decidida a mano (sin ganador antes de los tiros, un solo registro).
- Compatibilidad: las 13 suites de `interactive/` anteriores (149 pruebas) siguen verdes; `auctionFocus.test.tsx` se actualizó (el chip ya no está en venta).
- Suite completa, typecheck, lint, build: ver «Resultado final».

## 5. QA visual
Capturas en `img/`: `sim-mini-002-shot-375/1280.png`, `sim-mini-002-shot-scene-375.png`, `sim-mini-002-save-scene-1280.png`, `sim-mini-002-penalty-375.png`, `sim-mini-002-penalty-dive-375.png`, `sim-mini-003-defense-375/1280.png`, `sim-mini-003-defense-scene-375.png`, `rank-reveal-375.png`, y en la subasta real `rank-reveal-auction-onsale-375.png` / `rank-reveal-auction-signed-375/1280.png`.
**Límite:** las capturas de tiro, penal y defensa son de los componentes reales montados en una página auxiliar temporal con datos sintéticos (Chrome sin cabeza, 375 y 1280 px, DevTools Protocol); no se jugó una partida completa de 22 rondas hasta un tiro libre/penal/defensa en el navegador. Ese recorrido sí está cubierto en jsdom con las pantallas reales (sección 4). No hay verificación de audio ni de dispositivos táctiles reales.

## 6. Pendiente / no conectado
- El ranking no se muestra en la plantilla de partidas históricas (sin ranking recuperable, a propósito).
- Online no recibe ninguna de las tres mecánicas; el modo dos jugadores en un dispositivo tampoco (solo CPU).
- Los penales dentro del tiempo reglamentario no existen; solo el desempate de la serie.

## Resultado final
`npm run typecheck` OK · `npm run lint` 0 errores (3 avisos `react-refresh` preexistentes en `DribblePanel`) · `npm test` 127 archivos, 1.344 pruebas aprobadas, 0 fallidas · `npm run build` OK. Una primera suite completa mostró 3 fallos (dos de tiempo en pantallas nuevas bajo carga y `fullFlow.test.tsx`, que pulsaba un carril en vez de resolver); se corrigieron las pruebas y se repitió la suite completa.
