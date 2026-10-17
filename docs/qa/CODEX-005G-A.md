# CODEX-005G-A — Canchas, moneda y disponibilidad de subastas

Fecha: 17/10/2026. Base verificada: `c2a15cc`, rama `codex/current-club-audit`, árbol inicialmente limpio. Se conservaron CODEX-005F y sus contextos/historiales de sorteo. Lectura de AGENTS, README, ROADMAP, TASK_BOARD, TEST_PLAN, ADR-0002, informe 005F y módulos relacionados.

## Causas encontradas

1. `maximumSafeBid` devuelve cero cuando el participante no puede adquirir legalmente la carta: cupo completo, saldo insuficiente o imposibilidad de repartir las cartas restantes dentro de ambos presupuestos. El saldo visible por sí solo no basta para determinar disponibilidad. La interfaz mostraba máximo cero y cupos, pero no distinguía estas causas presupuestarias.
2. La interfaz comparaba `offer > maximum` para deshabilitar, mientras mostraba y enviaba `Math.max(offer, minimum)`. Un importe inferior al mínimo se convertía silenciosamente en otro; una oferta fraccionaria podía quedar habilitada y luego ser rechazada por el motor. La prueba ahora reproduce ambos casos y exige el motivo `INVALID_OFFER` antes de ofertar.
3. La CPU actualiza directamente el estado de partida, mientras los controles humanos pasaban por otro camino de actualización del importe. Se eliminó esa dependencia mediante una entrada asociada a semilla/ronda/participante/oferta vigente; el mínimo se deriva del estado actualizado. **No se confirmó un defecto del motor ni que una cifra alta persistida tras la CPU fuera la causa del reporte.** La hipótesis inicial se corrigió después de aislar el flujo.
4. El segundo pase sin oferta adjudica la carta al precio base: prioridad si ambos pueden recibirla o único receptor viable. Era una regla existente, pero el botón seguía diciendo solamente «Pasar». El reporte de asignación al rival puede corresponder a esta regla o a una oferta vigente aceptada mediante pasar. Sin el contexto y registro del playtest original no se puede reconstruir cuál sucedió.

No se detectaron adjudicaciones causadas por intentar una oferta inválida. El motor rechaza esas acciones sin cambiar el estado. No se alteraron precios, cupos, reserva económica, valoración CPU ni simulador.

## Correcciones y componentes

- `auctionAvailability`, en el motor: disponibilidad centralizada con `NOT_YOUR_TURN`, `POSITION_FULL`, `INSUFFICIENT_BUDGET`, `FUTURE_BUDGET_RESERVED`, `CPU_THINKING`, `ACTION_PENDING` e `INVALID_OFFER`. Reutiliza `maximumSafeBid` y el mismo predicado de viabilidad de las adjudicaciones. Calcula también el destinatario, importe y motivo de un posible doble pase, y el código `MANDATORY_ASSIGNMENT` cuando el próximo pase resolvería esa asignación.
- Oferta visible validada como entero, mínimo, saldo y máximo seguro. No se sustituye silenciosamente por otra cifra. Cada oferta deshabilitada tiene explicación visible con `role=status` y `aria-describedby`; no depende de hover.
- Antes del primer pase se informa qué sucede si ambos pasan. Antes del segundo, se muestra destinatario y precio y el botón cambia a **Confirmar adjudicación obligatoria**. Ante una oferta voluntaria vigente, se anticipa quién la gana y por cuánto al pasar. La CPU conserva su política; sus decisiones/asignaciones siguen registradas y se comunican antes mediante el aviso y después mediante el resultado.
- `TeamPitchBoard`: once camisetas SVG originales con coordenadas del 4-3-3 existente, vacantes diferenciadas, nombre abreviado visualmente, rating y precio realmente pagado. Nombre completo y posición genérica en etiqueta accesible. Seleccionar una camiseta abre un diálogo nativo con `PlayerIdentity`: banderas locales, ClubBadge y únicamente la fotografía piloto ya autorizada cuando corresponde.
- `TeamProgressBoard` conserva fichajes X/11, saldo y faltantes. Escritorio muestra ambas canchas; móvil conserva el desplegable inferior y agrega selector de equipo con `aria-pressed`. Los datos de jugadores/adjudicaciones derivan de la partida; solo selección del diálogo, equipo visible y apertura son estado de presentación.
- Los IDs de slot y sus coordenadas son disposición gráfica, no acreditan roles deportivos. No se presentan laterales, extremos ni subroles específicos. El layout procede de `DRAFT_SLOTS`; las futuras formaciones deberán aportar otro layout validado, sin activarlo en este hito.
- `FootballCoin`: motivos propios de pelota/cancha y animación CSS de 850 ms. El resultado, determinista por la misma semilla existente, ahora se decide y almacena al confirmar el lado (`LOBBY → COIN_TOSS`). Durante la animación no vuelve a calcularse. El resultado y el iniciador aparecen al terminar. Con movimiento reducido, CSS elimina la animación y la revelación no espera 850 ms. Una actualización funcional comprueba LOBBY antes de admitir la elección; un doble clic solo acepta una transición.
- Todos los nuevos textos y etiquetas se entregaron en es-AR, en y pt-BR. No se agregaron dependencias, recursos remotos, servicios, formaciones ni futbolistas.

## Pruebas reales

- TypeScript, ESLint y build: aprobados.
- `npm test -- -t '^(?!.*(?:plays 3,000|2,400-match|completes 1,000|diagnoses 1,000)).*$'`: **487 aprobadas, cuatro omitidas, 491 totales**, 19 archivos.
- Se omitieron las baterías existentes de 3.000 y 2.400 partidos, 1.000 subastas completas y diagnóstico de 1.000 sorteos por política. Se mantienen sus pruebas y resultados históricos. No se modificó selección estadística ni simulador; se ejecutaron las regresiones ordinarias y un recorrido completo de 22 rondas, partido, reproducción y revancha.
- Cobertura nueva: once camisetas/vacantes, correspondencia slot/posición, precio adjudicado por encima de base, detalles de Messi con foto existente, apertura/cierre de diálogo, cambio móvil A/B, actualización de ambos onces hasta 11/11, monedas con/sin movimiento reducido y doble clic, cada código de bloqueo, saldo frente a reserva futura, ofertas fraccionarias e inferiores al mínimo, anuncio de segundo pase, predicción exacta de asignación forzada y rechazo de transiciones inválidas.
- Las pruebas del diálogo usan un shim porque jsdom no implementa `showModal`/`close`. Esto verifica integración y estado; foco atrapado, Escape y retorno de foco requieren comprobación de navegador.
- `npm run catalog:audit`: salida 0, 150 registros parciales consistentes, B01/B02/B03 aprobados parcialmente, cero incidencias. Global `pending`, `globalValid=false`, 350 IDs faltantes. El JSON histórico regenerado permaneció sin diferencias de contenido. No es aprobación de los 500.

## QA visual

**NO EJECUTADA.** Se intentó abrir `http://127.0.0.1:5173/` en el navegador integrado; respondió `Local browser use is disabled in Work settings`. No se cambió esa configuración. La cobertura DOM no acredita legibilidad real a 360/390 px, contraste final, animación ni geometría de pantalla.

## Guía breve de playtest manual

1. Abrir el duelo, elegir Cara o Cruz y hacer doble clic rápido. Debe aparecer un solo lanzamiento, después un único lado y el reclutador que inicia. Activar movimiento reducido en el sistema y repetir: representación estática con el mismo flujo. Para repetir exactamente, importar el contexto de sorteo y elegir el mismo lado.
2. Iniciar la primera subasta. Ofertar al menos el precio base y pasar con el rival. Comprobar que hay una única adjudicación y que nombre/precio pagado aparecen en la cancha del ganador, con 1/11 y saldo actualizado.
3. Seleccionar esa camiseta. Revisar nombre completo, bandera, club de referencia/actual según auditoría y rating. Cerrar con el botón y con Escape; comprobar retorno del foco a la camiseta. Las posiciones vacantes deben estar identificadas sin permitir abrir un jugador inexistente.
4. Ingresar una fracción, un importe inferior al mínimo o superior al saldo. «Ofertar» debe deshabilitarse con explicación visible. Probar un importe dentro del saldo pero por encima del máximo seguro: debe explicar la reserva futura. Con CPU, comprobar aviso de evaluación y que al retornar el turno el importe corresponde a la oferta vigente.
5. Pasar sin oferta con ambos participantes. El primer pase debe anticipar la asignación por doble pase; el segundo debe decir «Confirmar adjudicación obligatoria» y mostrar destinatario/precio antes de actuar. En últimas rondas, un cupo lleno bloquea esa posición; un único defensor no bloquea los otros tres. El receptor forzoso debe coincidir con el aviso y la adjudicación registrada.
6. Probar escritorio, 390 y 360 px en los tres idiomas. Escritorio: ambas canchas. Móvil: abrir panel inferior y alternar A/B sin superponer ofertas. Revisar nombres largos, tap targets, truncado con nombre completo accesible, foco visible, diálogo desplazable y ausencia de scroll horizontal.
7. Completar 22 rondas. Ambos equipos deben mostrar 11/11, posición correcta, presupuesto ≥0 y precios de adquisición. Iniciar el partido; reproducir conserva el resultado, revancha abre un nuevo sorteo.

## Archivos y entrega

Nuevos: `TeamPitchBoard.tsx`, `TeamPitchBoard.test.tsx`, `FootballCoin.tsx` y `auctionAvailability.test.ts` en `src/features/recruiter-duel`, este informe y `docs/logs/CODEX-005G-A.md`.

Modificados: `AuctionPage.tsx` y su test, `TeamProgressBoard.tsx` y su test, `auctionEngine.ts` y su test, `auctionTypes.ts`, los tres `common.json`, `src/styles/index.css`, ROADMAP y TASK_BOARD.

Commit local específico en la rama existente; hash informado en la entrega. Se verifica árbol limpio al finalizar. Sin push/deploy. Integración de estrategias y enfrentamientos queda documentada como futura, sin bonificaciones ni cambios del simulador.
