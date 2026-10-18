# CODEX-005G-C3C — Moneda futbolera y pulido audiovisual

18/10/2026. Base `9d4e253` (C3B), rama `codex/current-club-audit`, árbol limpio al comenzar. Ejecutada con Claude Code. No se tocó el motor de simulación ni el táctico; no se repitieron calibraciones.

## Cambios realizados
**Moneda** (`FootballCoin.tsx`, `index.css`, `AuctionPage.tsx`)
- CARA = pelota de fútbol y CRUZ = estadio, ambas dibujadas en SVG original (disco verde con borde dorado; pelota blanca con parches; estadio visto desde arriba con gradas, césped, líneas y cuatro focos). Sin rostros, escudos ni imágenes de terceros. Siluetas claramente distintas.
- Antes de lanzar, el lobby muestra las dos caras como botones («Cara · Pelota», «Cruz · Estadio»). El nombre accesible sigue siendo «Heads/Tails» (traducido). Se conserva la elección interactiva.
- Moneda 3D de dos caras (`backface-visibility`). Secuencia de 1,5 s: elevación, giro de 3 vueltas (o 3,5 si es cruz), caída y pequeño rebote. La animación CSS **termina en la cara guardada**: `data-side` viene de `game.coinResult`, calculado una sola vez por `startCoinToss`; ni el CSS ni el render deciden nada.
- Botón «Omitir animación» (revela de inmediato el mismo resultado). La protección contra doble clic sigue en el motor (la fase deja de ser LOBBY). Con movimiento reducido no hay animación: se muestra la cara final casi al instante. El reclutador con la prioridad inicial se anuncia al revelar («… inicia el reclutamiento»).
- `COIN_TOSS_MS = 1500` exportado y usado por las pruebas (antes 850 ms).

**Audio** (`src/features/audio/`)
- `soundEffects.ts`: siete efectos sintetizados con Web Audio (lanzamiento, caída, oferta, fichaje, descarte, gol, final), definidos como recetas de osciladores y ruido.
- `audioEngine.ts`: motor pequeño. Crea el `AudioContext` solo en la primera reproducción (después de una acción del usuario); si el navegador lo deja suspendido (política de autoplay) intenta reanudarlo y **omite** ese sonido en lugar de acumularlo. Preferencias `{enabled, volume}` persistidas en `localStorage` (`reclutador.audio.v1`) con lectura defensiva (JSON corrupto, almacenamiento bloqueado) y volumen limitado a 0–1.
- `AudioControls`: interruptor de sonido y control de volumen (deshabilitado si el sonido está apagado) en la cabecera del duelo y del Draft Libre. Textos en tres idiomas.
- Eventos: `useAuctionSounds` reproduce cada sonido a partir de lo **nuevo** en el estado guardado (registros añadidos y entrada a la fase de moneda); un re-render, un efecto repetido por StrictMode o el primer renderizado de una partida existente no suenan. `MatchScreen` reproduce goles solo de los bloques que acaban de mostrarse y un silbato final, una vez por reproducción (la repetición del partido vuelve a sonar al verse).

**Pulido de animaciones:** tokens `--motion-fast/base/slow` y una curva común aplicados a revelación del futbolista, oferta, descarte, camiseta, estrategia y gol (900 ms); todas las animaciones nuevas y existentes se anulan con `prefers-reduced-motion`. No hay esperas nuevas en el motor ni elementos con `pointer-events` que bloqueen controles (el descarte y el festejo ya eran no interactivos).

## Recursos sonoros y licencias
No se usan archivos de audio externos: todos los sonidos se sintetizan en tiempo de ejecución con código propio del proyecto. No hay procedencia ni licencia de terceros que registrar. Sin dependencias nuevas.

## Pruebas ejecutadas
- `npm run typecheck`, `npm run lint`, `npm run build`: correctos.
- `npm test`: 554 aprobadas de 554 (539 en C3B; +15 nuevas).
- Nuevas: caras (pelota/estadio en frente/dorso, rótulos en los tres idiomas), resultado visual idéntico al guardado y antes/después de la animación, omitir sin cambiar el resultado, doble clic con un solo `coinToss`, movimiento reducido, un solo sonido por evento (lanzamiento, caída, oferta, adjudicación) sin repetirse al re-renderizar, goles y silbato correspondientes solo a bloques mostrados incluida la repetición, preferencias por defecto/corruptas/bloqueadas, persistencia de interruptor y volumen, sonido omitido si está apagado, en volumen 0 o con contexto suspendido, y los controles de audio.
- Las pruebas de audio usan un `AudioContext` simulado: **ningún sonido real se escuchó en esta sesión**.
- La reproducibilidad de la moneda se comprueba contra `createSeededRandom(seed:coin)`, el mismo mecanismo del motor.

## Prueba `AuctionPage` con timeout de 30 s (C3B)
Investigada: no hay causa asíncrona. Es trabajo síncrono de CPU (22 rondas completas con búsqueda de viabilidad en cada render, más el espejo del motor que hace la propia prueba). Sola tarda ≈1,7 s; con la suite completa en paralelo subió a 4–5,4 s, cerca del límite de 5 s. Se midió con y sin el HUD de C3A: 1,66 s contra 1,64 s, así que el HUD no la causa. Se mantiene el margen de 30 s solo en esa prueba; si molesta, la vía de mejora es memorizar `canFinishRounds`/`maximumSafeBid` por estado, un cambio de motor que se evitó aquí.

## QA visual
**No ejecutada** (sin navegador integrado funcional contra localhost): apariencia de las dos caras, fluidez del giro 3D, rebote, contraste del contorno, controles de audio en 360/390 px y la sensación real de los sonidos están pendientes de revisión manual.

## Guía breve de playtest (Firefox, `npm run dev`)
1. Iniciar un duelo: ver las dos caras (pelota y estadio) antes de elegir. Elegir y mirar el lanzamiento completo; la cara final debe coincidir con la que muestra el texto del resultado. Repetir con «Omitir animación».
2. Primero, tocar «Sonido» (el navegador necesita un gesto); probar el volumen y recargar la página: debe conservar ambos ajustes.
3. Escuchar: lanzamiento y caída de moneda, oferta, fichaje, descarte (doble pase). Comprobar que no se repiten al abrir o cerrar paneles ni al cambiar el importe.
4. Jugar un partido: cada gol debe sonar al aparecer en el relato y el silbato al final; «Repetir partido» vuelve a sonar al verse, no antes.
5. Con «reducir movimiento» activado en el sistema: moneda sin giro y sin animaciones largas.
6. Apagar el sonido: silencio total; el volumen queda deshabilitado.
7. Si algún sonido resulta molesto o corto, decímelo: son recetas en `soundEffects.ts` y se ajustan sin tocar nada más.

## Estado de Git
Rama `codex/current-club-audit`, base `9d4e253`. Un commit local específico al cierre. Sin push ni deploy.
