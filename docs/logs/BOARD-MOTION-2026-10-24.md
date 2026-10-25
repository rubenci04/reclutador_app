# Movimiento contextual del tablero — 24/10/2026

Entrega local de presentación Canvas 2D, sin push ni deploy.

## Implementación

- `contextualPlayerOffset(dot, play, ball, isOption)` es pura: no consulta reloj ni RNG. Desplaza cada círculo según posesión y profundidad de su formación, conservando simetría entre equipos. Apoyos de medio/ataque avanzan 0,10–0,16 del ancho y se acercan un 15 % al sector del balón; los rivales retroceden hacia su arco y basculan un 18 %. Arqueros conservan su área con movimiento menor. Coordenadas acotadas a la cancha.
- Los offsets reemplazan el traslado rígido de los jugadores; teamShift permanece compatible para referencias existentes. El portador, su marcador y los actores de escenas aéreas/córners/tiros libres conservan sus ajustes específicos.
- Receptores elegibles A/B oscilan ±0,025 hacia el arco rival mientras se ofrece el pase en DIRECTION/FINISH. La fase usa diferencias de performance.now exclusivamente visuales, sin alterar timers ni decisiones del partido. Flechas punteadas muestran el pique y avanzan con la misma fase. Dibujo y hit areas usan la misma posición.
- La espera de una decisión admite ese movimiento continuo; la pausa manual congela posición y fase. Al reanudar se conserva la fase, sin saltar por el tiempo pausado. Sin opciones, el RAF termina al asentarse y se cancela al desmontar.
- Pelota en movimiento con hasta tres muestras recientes de su trayectoria y opacidades 0,35/0,20/0,08. El pase antes dibujado como span `.pass-ball` se pinta ahora en el mismo Canvas con su estela; conserva comando, destino y duración visual. El portador muestra anillo elíptico y orientación bajo su círculo.
- `animate=false` y prefers-reduced-motion desactivan oscilación, flechas animadas, estela y vuelo de pase, manteniendo las opciones estáticas clicables. Se escuchan cambios de preferencia en la sesión.
- No se agregan textos visibles; se mantienen accesibilidad, traducciones y alternativas existentes. No se modifican simulator.ts, kernel.ts, datos de resultados, semillas ni reglas deportivas. Los movimientos son indicaciones visuales, sin nuevas colisiones o probabilidades.

## Verificación

- Cuatro archivos de regresión exigidos: 28 pruebas aprobadas en fieldInteraction, aerialContinuity, cornerPresentation y freeKickPresentation.
- Seis pruebas nuevas en boardMovement.test.tsx: apoyos/basculación por profundidad, simetría/atajadas, 22 círculos acotados en nueve formaciones y ausencia de reloj/RNG en la función pura; RAF continuo, hit areas, pausa, pase/tiro con estela y movimiento reducido inicial/dinámico.
- Typecheck y build aprobados. Lint aprobado con tres advertencias previas de Fast Refresh en DribblePanel.tsx. Build conserva aviso previo de debugName en codeSplitting.
- Suite completa: `npm test -- --maxWorkers=4`, código 0, **1.418 pruebas en 133 archivos**, 192,66 s. Tras el último ajuste del reloj visual del pase se repitieron typecheck/lint/build y los cinco archivos del tablero: **34/34** aprobadas. Los cuatro comandos obligatorios finalizaron con código 0; concurrencia limitada sólo por argumento, sin cambiar configuración de pruebas.
- QA visual real NO EJECUTADA: se inició Vite local y se intentó abrir http://127.0.0.1:5173/ mediante el navegador integrado, que devolvió `net::ERR_CONNECTION_TIMED_OUT`. Servidor de prueba detenido. No se acreditan capturas, fluidez, contraste ni escucha; RAF simulado/jsdom sólo verifican comportamiento y coordenadas.

Se preservan los cambios previos de subasta, responsive y Versus Online. No se inician fases adicionales.
