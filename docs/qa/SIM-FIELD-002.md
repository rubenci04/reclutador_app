# SIM-FIELD-002 — Ataque y defensa directamente sobre la cancha

## Qué cambió
- **FINISH:** el arco rival es un objetivo («REMATE») y el compañero marcado con letra recibe el centro. Tocar el arco envía `SHOOT`; tocar al compañero envía `CROSS`. Mismo comando que las tarjetas, sin segundo clic. La pelota vuela del poseedor al destino (con movimiento reducido queda en el destino). El arco solo es interactivo si SHOOT está disponible y el arco se ve; el compañero solo si CROSS está disponible.
- **DEFEND (SIM-MINI-003):** el atacante CPU, el defensor y la pelota se destacan; tres carriles (izquierda/centro/derecha, vistos desde el defensor) y la zona PRESIONAR (círculo sobre el defensor). Primer toque = elige y arranca la barra de precisión (se muestra bajo la cancha); el siguiente toque la frena y envía `DEFEND_*` / `PRESS` con esa precisión. Un segundo toque a menos de 350 ms no cuenta (doble toque). Con movimiento reducido no hay barra: precisión neutra 0,5 y el texto dice «Tocá otra vez para confirmar». La intención del atacante CPU nunca se dibuja hasta resolver; el resultado lo sigue calculando el motor.
- **Unificación:** pista breve junto a la cancha («Tocá al compañero», «Tocá el arco», «Tocá el arco o al compañero», «Anticipá el carril o presioná», «Tocá otra vez para frenar la barra / confirmar»), borde resaltado, cancha completa forzada durante el momento (el arco quedaría fuera de una mitad), sin desplazamiento automático a las tarjetas, tarjetas más discretas pero intactas (clic, teclado con flechas/Espacio y «Resolver con el sistema tradicional»). Las zonas salen de lo pintado en cada cuadro: al cambiar el momento desaparecen. Textos nuevos en es-AR, en y pt-BR (`field.*`; reemplaza `field.pickHint`).
- En un momento táctil la cámara de un córner/tiro libre anterior ya no se aplica (provocaba coordenadas desplazadas), y en defensa el atacante CPU lleva la pelota y el defensor se coloca frente a él.
- Sin cambios en motor, probabilidades, economía, rankings, técnicos, suplentes, moneda ni explicación final. Defensa solo con `defenseMini` y contra CPU (partidas nuevas); online e históricas sin tocar.

## Pruebas
`src/features/local-match/fieldInteraction.test.tsx` (pantalla real, contexto 2D simulado): DIRECTION conserva el pase; FINISH arco = SHOOT, compañero = CROSS, toque fuera no hace nada; resultado idéntico al de la tarjeta (mismo seed, `toEqual` del resultado completo); DEFEND carril → barra → ejecución única, sin zonas ni doble resolución después, PRESS por zona, teclado/tarjetas vigentes, y resultado idéntico a las tarjetas con precisión neutra (movimiento reducido); `nearestHit` con carriles. Cierre: typecheck, lint (0 errores; 3 avisos previos de DribblePanel), build y suite completa 130 archivos / 1372 pruebas verdes. Compatibilidad: no se tocó el formato de sesión; sesiones previas sin `defenseMini` no muestran zonas de defensa.

## QA en navegador integrado (npm run dev)
Hecho a mano con mouse real:
1. **Partida real a 375 px (es-AR):** recorrido completo (subasta, técnico, once, estrategia, Jugar partido). Minuto 75, momento «¡Defendé!»: lanes, zona Presionar y pista visibles; toque en «Izquierda» → carril resaltado y «Tocá otra vez para confirmar»; segundo toque → «¡Pelota recuperada!» sobre la cancha. En este navegador `prefers-reduced-motion` está activo (movimiento reducido real).
2. **Fixture determinista de la pantalla real** (página temporal `qa-field.html` con LiveMatchScreen sobre una sesión generada por seed y detenida antes del nodo; ya eliminada, no está en el commit), porque en la partida real no apareció un ataque con FINISH:
   - 375 px, movimiento reducido: FINISH con CROSS disponible; un toque en el compañero «A» → «mete el centro».
   - Ancho del panel (961 px, no 1280), movimiento reducido: FINISH; toque en el arco → «¡Gol de …!».
   - 961 px con movimiento **normal** (la fixture sustituye `matchMedia` solo para esa carga): DEFEND; toque en «Derecha» → barra de precisión visible bajo la cancha y «Tocá otra vez para frenar la barra»; segundo toque → «Superaron a … y el remate se va afuera. El atacante iba por: Centro.»
   Sin errores en consola.

## No verificado / límites
- No se llegó a 1280 px (el panel mide 961 px); no se probó un dispositivo táctil real.
- En el navegador real no se jugó una finalización dentro de una partida orgánica: se usó la fixture indicada.
- La animación de la pelota (CSS) no se pudo muestrear en el navegador integrado; la zona PRESIONAR y el ataque directo DIRECTION se comprobaron en pruebas, no a mano en esta entrega.
- El carril es el del defensor (su izquierda = parte superior de la cancha).
