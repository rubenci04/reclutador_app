# UX-ENTRY-011 + SIM-FIELD-001

Base: `main` 8fbbe35. No se tocaron la lógica de selección, presupuestos ni creación de partidas, ni gambeta, defensa, tiros libres, penales, simulación rápida u online.

## 1. Edición seleccionada (UX-ENTRY-011)
`EditionHero.tsx` (+ `editionNames.ts`) es el único bloque, pegado al botón **INICIAR DUELO**: etiqueta «TU EDICIÓN SELECCIONADA», nombre grande («LIGA BRASILEÑA»), edición destacada con el color del modo («ACTUALIDAD 2026» / «LEYENDAS») y «Top 150 · 160 M por equipo · Reserva técnico 8 M». El presupuesto y la reserva salen de la configuración real (`config`, incluidas las personalizadas y el mayor en cruces); «Top n» sale del tamaño real del ranking de la categoría. Si el rival tiene otra categoría se agrega una línea «Rival: …» sin mezclar. Se eliminó la repetición dentro de Categorías y la línea suelta de la zona de inicio; la tarjeta elegida lleva una marca ✓ con el color del modo. Traducido es-AR/en/pt-BR. Se actualiza al instante al cambiar la selección (probado). A 375 px el bloque ocupa ≈ 210 px y a 1280 px queda a una pantalla del inicio (capturas `ux-entry-011-hero-*.png`).

## 2. Pase directo sobre la cancha (SIM-FIELD-001)
Solo el pase de DIRECTION (carril izquierdo/derecho). Se completó el avance anterior: el poseedor sigue resaltado, los destinos se marcan con anillo y letra, hover del mouse (anillo y cursor), pista de texto («Tocá a un compañero marcado…»), toque táctil (`touch-action: manipulation`), pelota animada del poseedor al destino (≈ 0,45 s; con movimiento reducido queda en el destino) y envío inmediato del **mismo comando** que la tarjeta, sin segunda confirmación. Las tarjetas siguen como alternativa. Conversión de coordenadas: `boardPoint` escala el puntero según el tamaño real mostrado frente al tamaño pintado (responsive); probada. No se cambió ninguna probabilidad ni el motor.

## 3. Recorrido real en navegador (navegador integrado, 375 px, es-AR)
Hecho a mano sobre la app real (`npm run dev`), con un asistente de JavaScript solo para pulsar botones repetitivos de la subasta:
1. Categoría **Liga brasileña · Actualidad 2026** → bloque único con 160 M y reserva 8 M; el texto «seleccionada» aparece una sola vez (1 tarjeta marcada).
2. **Iniciar duelo** → elegir cara o cruz con **ambas caras visibles** (Cara = Pelota, Cruz = Estadio).
3. **Moneda:** en este navegador `prefers-reduced-motion` está activo (probablemente también en el equipo del usuario, y era la causa de que no se viera nada: antes saltaba al resultado). Ahora, con movimiento reducido, ambas caras se alternan por fundido (≈ 1 cambio por segundo, 1,8 s) y reposa en la cara guardada (captura `ux-entry-011-coin-crossfade-375-browser.jpg`, mitad de un fundido). El vuelo y giro 3D (sin movimiento reducido) se vio en Chrome real en la entrega anterior.
4. Subasta completa (11 fichajes) → mercado de técnicos (contratado uno) → **escaparate**: diez cartas fijas; la CPU compró primero (oportunidad 1) y no volvió a actuar hasta su turno; compré dos cartas (oportunidades 2 y 3): ninguna carta cambió ni se repuso, quedaron marcadas VENDIDO, y la CPU compró en sus oportunidades 4 y 5. Al pulsar «Terminar mis suplentes» la CPU usó el resto (5/5) y el escaparate se cerró.
5. Plantilla (nombres, OVR y `#puesto` en cada camiseta) → confirmar once → estrategia → **Jugar partido**.
6. **Pase en la cancha:** en el segundo partido de la serie, minuto 45, momento «¡Hay espacio por las bandas!»: un solo toque real (mouse) sobre el compañero «A» ejecutó el pase por la izquierda («El pase por la izquierda lo corta Léo Pereira») sin segundo clic; capturas antes/después `sim-field-001-*.jpg`.
7. **Pantalla final** del primer partido (1–6): resumen visible sin ventana (`dialog[open]` ausente), con poder, sectores, técnico y bonificación, formación, táctica, estadísticas, rangos, ventajas por equipo («Los Pibes: más posesión · CPU: mayor poder global, más ataque, más remates»), goles como momentos decisivos y detalle desplegable (`ux-entry-011-final-summary-375-browser.jpg`).

**No verificado en el navegador:** la animación de la pelota del pase (el navegador integrado no avanza la línea de tiempo de las animaciones: `currentTime` quedó en 0, por eso tampoco se pudo muestrear el fundido de la moneda, solo capturarlo); el recorrido a 1280 px (solo el bloque de edición); dispositivos táctiles reales; el pase en un navegador con movimiento no reducido. El resultado de ese partido no se eligió ni se alteró: es el que calcula el motor.

## 4. Pruebas
`editionHero.test.tsx` (tres idiomas, presupuesto real, leyendas, rival aparte, una sola aparición, actualización al cambiar, conversión de coordenadas); se actualizaron `entryFlow`, moneda (`coinAndSounds`, `AuctionPage`, `gameplayPolish`) por el fundido nuevo (2,2 s).

## Resultado final
`npm run typecheck` OK · `npm run lint` 0 errores (3 avisos react-refresh preexistentes) · `npm test` 129 archivos, 1.365 pruebas aprobadas · `npm run build` OK. Una primera suite mostró 1 fallo (`categoryVariants`, buscaba el texto «seleccionada» eliminado); se corrigió y se repitió la suite completa.
