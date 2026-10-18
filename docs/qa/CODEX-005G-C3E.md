# CODEX-005G-C3E — Bloqueo posterior a las estrategias y finalización rápida

18/10/2026. Base `d2619c6` (C3D), rama `codex/current-club-audit`, árbol limpio al comenzar. Informes C3A, C3B, C3C y C3D verificados en `docs/qa/`. Ejecutada con Claude Code.

## Causa del congelamiento (con honestidad sobre lo reproducido)
**No se reprodujo un bloqueo lógico.** Se recorrió el flujo completo (moneda → subasta → ordenar → estrategias → revelación → partido → resultado) de cuatro maneras y llegó siempre al resultado:
1. Prueba de integración en jsdom, contra CPU y hot-seat.
2. Navegador real (Chromium del panel integrado, servidor de desarrollo) contra CPU y en hot-seat, con clics reales sobre la interfaz, incluidas ambas confirmaciones, ambas estrategias, la revelación y «Iniciar partido»: el partido arrancó y terminó con resultado.
3. 300 partidas aleatorias del motor (decisiones humanas al azar, con y sin CPU): ninguna quedó sin acción posible antes del partido.
4. Revisión del código de transición (confirmaciones, estados, `startDuelMatch`): sin ramas que dejen la pantalla sin salida.

**Causa más probable de lo que viste (diagnóstico de interfaz, no de dominio):** al completarse los dos onces, la pantalla apilaba el resumen, dos canchas de ordenamiento completas y recién debajo el panel de estrategias (más otras dos canchas «Equipos en vivo» al final). Al confirmar un paso, lo que cambiaba quedaba fuera de pantalla, abajo, y arriba no se movía nada; la revelación y el botón para empezar el partido también aparecían lejos de la vista. Además los errores de transición se mostraban en un aviso al inicio de la página, también fuera de vista. Si lo que viste no coincide con esto (por ejemplo, un botón desactivado o un mensaje concreto), decímelo con los pasos exactos: sería otra causa y conviene reproducirla.

## Causa confirmada por el usuario
El usuario aclaró después: jugaba en modo de a dos, eligió la estrategia del Jugador uno y se quedó esperando sin darse cuenta de que **todavía faltaba** pasar el dispositivo y elegir la estrategia del Jugador dos antes de poder jugar. No era un defecto de lógica: era un paso pendiente poco visible, agravado por la distribución descrita arriba (la pantalla de traspaso quedaba lejos de la vista). Corrección adicional: durante el traspaso y la segunda elección se muestra el aviso «Estrategias: Reclutador uno ya eligió. Falta la estrategia de Reclutador dos y recién después se puede jugar el partido.» (es-AR, en, pt-BR), con prueba.

## Cómo se corrigió
- La pantalla posterior a las subastas ahora tiene **pasos** con indicador («Paso 2 de 3: Elegí tu estrategia») y el resumen/ordenamiento de equipos queda en un bloque plegado («Ver y editar equipos») cuando ambos onces están confirmados.
- Cada cambio de etapa (elegir, pasar el dispositivo, revelación) **lleva el panel al borde superior de la ventana y le da el foco** (accesible por lector de pantalla).
- El botón final se llama **«Jugar partido»** (es-AR; «Jogar partida» en pt-BR; en inglés se mantiene «Start match»).
- Errores recuperables: si los equipos fueran inválidos se muestra un mensaje con «Volver al inicio»; si el inicio del partido o la elección falla, el error aparece dentro de la misma pantalla con «Elegir estrategias de nuevo». Los errores de esta etapa ya no van al aviso lejano del inicio.
- Protección contra doble clic: el botón «Jugar partido» ignora un segundo clic hasta que el motor rechace el inicio (una sola simulación por inicio, comprobada con dos clics en una misma acción).
- Sin esperas artificiales para disimular transiciones.

## Completado automático de la CPU
- Dominio (`auctionEngine.ts`): `canAutoComplete`, `autoCompleteStep`, `autoCompleteAll` y `previewAutoComplete`. Solo valen si el rival ya tiene 11/11 y antes de cualquier oferta o pase sobre la carta en juego. Cada ficha pasa por el mismo `award` (nuevo motivo `auto_complete` en el historial), al **precio base**, con comprobación de cupos, presupuesto y viabilidad del motor. Determinista (sin azar), exclusiva, sin tocar fichajes previos ni descartes. `autoCompleteAll` es atómico: ante cualquier error devuelve el error y el estado original.
- Interfaz: cuando el humano llega a 11/11 contra la CPU, ya no hay que pulsar «Pasar»: aparece una secuencia breve («La CPU ficha a X por 4M (5/7)», 450 ms por ficha, inmediata con movimiento reducido) con «Omitir secuencia». Si el motor no pudiera resolverlo, se muestra el error y se sigue con las subastas normales.
- Sonido: un lote de adjudicaciones produce un solo aviso de cada tipo.

## Modo rápido (dos personas, o el humano si la CPU terminó primero)
«Completar mi equipo» aparece al reclutador que aún no completó, solo si el rival tiene los once. **Antes de confirmar** muestra: cantidad de futbolistas restantes con nombre, posición y precio, coste acumulado y presupuesto final previsto, calculados con los mismos pasos que ejecutará la confirmación. Si no todas las adjudicaciones son viables, no se ofrece el botón y se explica. No se ejecuta nada sin confirmar y se puede seguir carta por carta con los controles normales. Los tres descartes compartidos no se tocan.

## Resultados de pruebas
- `npm run typecheck`, `npm run lint`, `npm run build`: correctos.
- `npm test`: 572 aprobadas de 572 (558 en C3D; +14).
- Integración A (humano contra CPU): el humano completa primero → la CPU completa automáticamente → ordenar → estrategia con la de la CPU oculta → revelación → partido → «Full time»; y variante omitiendo la secuencia.
- Integración B (hot-seat): primer humano completa → «Completar mi equipo» con detalle previo → ambos ordenan → ambos eligen sin ver la contraria (tarjetas sin marcar) → revelación → partido y final.
- También: doble confirmación y doble clic de inicio (una sola simulación), cambio de idioma en plena revelación, equipos inválidos con mensaje recuperable, restricción económica (presupuesto insuficiente → `no_legal_assignment` y estado intacto), cupos y rival incompleto (`rival_incomplete`), determinismo y registro en el historial, 40 semillas sin resultados inválidos, y 120 partidas sin estados atascados.
- Los seeds de los recorridos se buscan con el propio motor, no están fijados a mano.
- Sin cambios en la matemática del encuentro: no se recalibró; se conservan los resultados históricos.

## Guía manual (Firefox, `npm run dev`)
1. Contra CPU: comprá fuerte hasta llegar a 11/11 antes que la CPU; debe aparecer «La CPU completa su equipo» y avanzar sola; probá también «Omitir secuencia».
2. Hot-seat: cuando un reclutador completa, el otro debe ver «Completar mi equipo» con la lista, el coste y el presupuesto final; confirmá, o ignoralo y seguí con «Comenzar subasta».
3. Tras ordenar, verificá que cada paso deje la pantalla arriba del todo con el título del paso; el indicador debe decir 1/3, 2/3 y 3/3.
4. Elegí estrategias (el segundo no debe ver la del primero), mirá la revelación y pulsá «Jugar partido» una sola vez: debe empezar el partido.
5. Si algo no responde, anotá qué botón o mensaje ves y en qué paso.

## Limitaciones visuales pendientes
La captura de pantalla del panel integrado falló (ventana oculta), así que el aspecto de los nuevos paneles y del plegable no se revisó a ojo; sí se comprobó por medición que el panel de estrategias queda en el borde superior con foco y que el resumen aparece plegado. Faltan 360/390 px.

## Estado de Git
Rama `codex/current-club-audit`, base `d2619c6`. Un commit local específico. `.claude/launch.json` (configuración local del panel de vista previa) queda sin versionar. Sin push ni deploy.
