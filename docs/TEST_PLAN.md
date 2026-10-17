# Plan de pruebas

## Comprobaciones de cada entrega

Ejecutar npm run typecheck, npm run lint, npm test y npm run build. Registrar resultados y limitaciones en docs/qa con el identificador del encargo. No declarar éxito sin ejecución.

## CODEX-001

- Configuración: tres idiomas inicializan con claves completas; instalación nueva y valores inválidos usan es-AR.
- Persistencia: cada idioma sobrevive a una nueva instancia; almacenamiento bloqueado no interrumpe la interfaz y genera aviso traducido al guardar.
- Fallback: clave disponible solamente en español se resuelve desde inglés.
- Vocabulario: cuatro posiciones traducidas a los valores exigidos; claves e interpolaciones consistentes.
- Integración: selector accesible cambia a inglés, portugués y español sin recarga; botón Jugar permanece deshabilitado; html.lang se actualiza.
- Navegador: revisar escritorio y teléfono, ausencia de desbordes, cancha con once puestos, cambio y recarga, navegación por teclado y consola.
- Alcance: revisar diff sin catálogo, draft interactivo, simulador, servicios externos ni activos con licencias dudosas.

Las pruebas DOM usan Vitest + Testing Library + jsdom. Las verificaciones visuales reales se documentan separadamente: jsdom no confirma layout, contraste ni renderizado del navegador.

## CODEX-004C

- Ejecutar `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` y `npm run catalog:audit`. No considerar el catálogo parcial como aprobado globalmente.
- Verificar que `PRODUCT.name` sea Reclutador y que la clave técnica `draft-legends.draft-v1` permanezca inalterada; un borrador existente con esquema 1 debe seguir validando.
- Verificar en los tres idiomas las claves de modalidades y que el selector mantenga Global disponible; los demás botones deben informar su estado y no alterar el draft.
- Cubrir filtros puros por nacionalidad, carrera de liga verificada, rango temporal, edición exacta de competición y datos ausentes. Un año de referencia no sustituye una participación de competición.
- Comprobar ARQ/DEF/MED/DEL, once de hasta 100M y una llamada determinista al generador CPU antes de habilitar una modalidad.
- Ejecutar el diagnóstico de 2.400 partidos: 800 equilibrados, 800 con diferencia de presupuesto y 800 con ataque concentrado. Registrar marcadores, 0-0, extremos, resultados y fortaleza relativa sin cambiar las probabilidades.
- Intentar renderizado real en escritorio, 390 px y 360 px. Si el navegador integrado no puede abrir Vite, dejar el resultado como no ejecutado y seguir la checklist manual del informe QA.

## CODEX-005A

- Generar exactamente 22 IDs únicos en 1 ARQ, 4 DEF, 3 MED y 3 DEL parejas; exigir misma posición dentro de cada pareja y semilla reproducible.
- Ejercitar 1.000 semillas, pasando legalmente en todas las rondas: ambos equipos terminan con once, 0–100M, posiciones válidas y ningún futbolista compartido.
- Verificar cara o cruz almacenado, alternancia de prioridad, oferta inicial al precio base, incremento de 1M, turno correcto y retiro mediante pasar.
- Probar adjudicación doble de cada pareja, resolución de doble pase, máximo seguro y rechazo de una oferta que consume el presupuesto necesario para los pares restantes.
- Validar el registro estructurado y que la simulación de los dos onces se inicia una sola vez tras los equipos completos.
- Comprobar textos es-AR, en y pt-BR, selector de idioma en el duelo y retorno a Draft Libre. Ejecutar typecheck, lint, Vitest, build y catalog:audit.

## CODEX-005B

- Generar 22 cartas individuales únicas por semilla (2 ARQ, 8 DEF, 6 MED y 6 DEL), verificar el orden reproducible y que cada ronda ofrece un solo ID.
- Elegir cara o cruz, confirmar que resultado y ganador se almacenan, y verificar prioridad alternada en 22 rondas.
- Cubrir oferta base, incremento de 1M, retiro, doble pase, cupos por posición, oferta máxima segura y reserva de viabilidad para ambos onces.
- Ejecutar 1.000 semillas completando por pases: dos onces 4-3-3, presupuesto 0–100M y cero IDs compartidos.
- Comprobar integración explícita con el simulador, que Draft Libre sigue accesible y que es-AR/en/pt-BR incluyen los nuevos textos y etiquetas accesibles.
- Intentar inspección visual en escritorio y móvil; si Vite no puede abrirse desde el navegador integrado, registrar NO EJECUTADA con una guía manual.

## CODEX-002

- Ejecutar npm run build, npm run lint, npm run test y npx tsc --noEmit.
- Regresión de las 15 pruebas de CODEX-001 sin modificarlas.
- Fórmula: cuatro precios conocidos, límites, monotonía, enteros, no finitos y tipos inesperados.
- Tiers: límites de los cinco rangos y cobertura de 75–99.
- Registros: campos obligatorios, valores vacíos, formato y rango de IDs, posición MVP, décadas, asociación admitida, club canónico, todos los ratings y precios manipulados.
- Catálogo sintético: 100 IDs exactos, cuotas posicionales y de tiers, duplicados por ID y nombre normalizado, errores con índice, array disperso y sobre versionado.
- Economía: once mínimo sin mutación, jugadores distintos, posiciones completas, frontera 100M, catálogo completo imposible de 101M y datos inválidos sin prueba de asequibilidad.
- Contratos estáticos: expectTypeOf evaluado por TypeScript, versión explícita, química como subconjunto de Player, coherencia del estado inicial y la cancha.
- No se repite revisión visual por cambios exclusivamente de dominio; la apariencia no se modifica. Pruebas DOM no equivalen a una auditoría visual nueva.

## CODEX-003A

- Ejecutar npm run typecheck, npm run lint, npm run test, npm run build y npm run catalog:audit.
- Ejecutar npm run catalog:audit -- --complete: debe rechazar completitud con salida 1 mientras solo exista B01; registrar globalStatus pending, no PASS global.
- Validar individualmente los 50 registros reales y sus precios por la función de producción; verificar 6/16/15/13 posiciones y 6/10/15/12/7 tiers, IDs plr_001..plr_050 y categoría contemporary.
- Mantener los 15 tests originales de CODEX-001. Adaptar los de CODEX-002 al cambio explícito de tamaño/campos: fixtures completos de 500, precios y rangos idénticos, casos económicos pequeños mediante checkEconomicViability. La antigua prueba de 100/101M se conserva como subconjunto sintético y debe dejar el estado global pendiente.
- Probar años 2016/2026, categorías, década coherente, extensión de IDs, matriz de categoría/posición y traducciones de ambas categorías.
- Probar manifest íntegro, estados contra datos suministrados, intervalos por lote, archivos realmente creados, consolidación ordenada sin mutación, duplicados internos y entre lotes normalizados.
- Probar ruta de aprobación de diez lotes con fixtures sintéticos, claramente separada de la auditoría real. Nunca usar ese resultado para marcar completo catalog_v1.
- Auditoría real global de 500, prueba económica global y selección CPU 95–100M: PENDIENTES hasta disponer de los diez lotes. UI inicial sin cambios visuales; no se exige nueva revisión de navegador en esta entrega.

## CODEX-003B

- Ejecutar typecheck, lint, test, build, catalog:audit y catalog:audit -- --complete; el último debe devolver 1 y mantener pending con 400 IDs faltantes.
- Validar individualmente los 50 registros B02 y sus precios mediante la fórmula existente; comprobar intervalo plr_051..plr_100, categoría, atributos diferenciados y cuotas 6/16/15/13 y 6/10/15/12/7.
- Validar acumulado de 100, posiciones 12/32/30/26, tiers 12/20/30/24/14, contemporary 100 y legend 0. Nunca aprobar por ello los 500 globales.
- Fijar hash de los registros parseados de B01 desde CODEX-003A para detectar cambios accidentales de cualquier campo o precio, sin fallar por conversión de saltos de línea del checkout.
- Comprobar alias de todos los nombres canónicos y abreviaturas registrados, nombres deportivos y variantes completas representativas. Inyectar colisiones entre lotes con distintos IDs, clubes y décadas: detectar duplicate_player e identity_mismatch. Distinguir homónimos y rechazar registros ambiguos de alias.
- Mantener la regresión de 50/500 usando un manifest aislado de B01; adaptar solo las expectativas de integración real a B01+B02. Mantener los casos previos de 500 sintéticos, fórmula, idiomas y persistencia.
- Verificar manifest y carga determinista al invertir lotes/jugadores; ausencia de B03–B10 reales. No modificar la interfaz inicial. Inspección visual nueva: NO EJECUTADA si no hay cambios visuales.

## CODEX-003C

- Ejecutar typecheck, lint, test, build y catalog:audit. Exigir --complete y registrar salida 1 con 350 IDs faltantes mientras solo estén B01–B03.
- Verificar individualmente los 50 IDs plr_101–plr_150, versiones contemporary, década/año, precios por calculatePlayerPrice y cupos 6/16/15/13 y 6/10/15/12/7.
- Auditar conjuntamente 150 IDs/personas, categorías 150/0, posiciones 18/48/45/39 y tiers 18/30/45/36/21; validar orden determinista sin mutación y manifest real.
- Fijar hashes de B01/B02, comprobar conservación de datos/precios y alias previos. Mantener los escenarios históricos de 50/100 aislados sin eliminar pruebas anteriores.
- Probar variantes completas/deportivas, apodos, transliteraciones y colisiones con otros IDs/clubes/décadas; dejar L. Martínez sin resolver y distinguir Lisandro/Lautaro/Emiliano y los Kim.
- Registrar revisión visual NO EJECUTADA si no hay cambios de UI. No confundir auditoría parcial con cierre de 500.

## CODEX-004B

- Generar un CPU 4-3-3 solo con el catálogo cargado: once distinto, posiciones 1/4/3/3, presupuesto no mayor a 100M y preferencia demostrable por 95–100M. Si ese rango es imposible, verificar el fallback legal y documentar la causa.
- Comprobar que una misma semilla produce el mismo rival y el mismo partido; que semillas distintas dan variantes; y que no hay bucles ni aleatoriedad fuera del generador con semilla.
- Rechazar alineaciones locales o CPU inválidas antes de simular. Contrastar que atributos y roles, en especial ARQ/DEF, afectan ataque, defensa y mediocampo.
- Verificar seis bloques 15–90, goles iguales al marcador, tiros/al-arco/atajadas/recuperaciones coherentes con eventos y posesión que suma 100.
- Ejecutar diagnóstico reproducible de al menos 1.000 partidos y registrar victorias, empates, derrotas, goles y extremos como observación de balance, sin inferir justicia estadística.
- Integración: confirmar once, iniciar CPU una vez, esperar 15 segundos, reproducir sin recalcular, pedir revancha y volver al draft. Cambiar idioma durante la reproducción y comprobar que conserva resultado/eventos.
- QA manual: escritorio, 390 px y 360 px; revisar cancha, modal, marcador, narración, barra de progreso, resumen, teclado, movimiento reducido y ausencia de scroll horizontal. Si el navegador no accede al host local, documentar la falla de acceso y entregar la lista al usuario.
