# Plan de pruebas

## SIM-005R-04 — Centro y cabezazo dirigido

- Extensión opt-in sobre momentos: envío válido/despejado, duelo ganado/perdido, atacante sin puesto válido y HEADER sólo tras victoria. Ningún draw de definición antes de aceptar dirección.
- Tres destinos orientados desde el atacante, todos los desenlaces, cotas sin garantías, Monte Carlo de calidad/arquero, perfiles que invierten primer/segundo palo.
- 240 semillas × cinco políticas; frecuencia, 24 oportunidades, goles y estadísticas por eventos. Determinismo, replay, restore por nodo y snapshots alterados rechazados.
- 600 sesiones antiguas comparadas contra huellas de 10f406b y checkpoints generados por esa versión; golden históricos sin actualizar.
- UI es-AR/en/pt-BR: foco, tres arcos, pausa, velocidad, doble clic, reduced-motion y audio único por frame. Cuatro comandos; QA real y límites audiovisuales en qa/SIM-005R-04.md.

## SIM-005R-03 — Momentos destacados

- Medir 240 semillas × interceptar/presionar/attack-tree-v1/lote: frecuencia, minutos, alternancia, protagonistas, desenlaces, goles y recuperación. Separar calibración sintética de balance humano.
- Verificar 24 oportunidades, estadísticas y marcador por eventos, replay de decisiones, determinismo y restauración de cada fase; rechazar duplicados, revisión antigua y director manipulado. Conservar golden históricos sin actualizarlos.
- Comprobar defensa en tres idiomas con foco y doble clic; opciones sin garantías, mejora por atributos y perfiles que invierten la preferencia inicial.
- QA real 390/412/768/1280 y capturas de conducción, pase, intercepción y desenlace; audio y fluidez humana se registran separadamente. Ejecutar los cuatro comandos. Evidencia y límites en qa/SIM-005R-03.md.

## SIM-005 — 20/10/2026

- Completar CPU y hot-seat con la API incremental real, preservando gasto de adquisición/técnico, reserva y banco. Comprobar inicio sin bloques/resultados futuros.
- Cubrir 30/45/60/75: KEEP, estrategia, cambio manual válido e inválido, comandos repetidos, prefijos confirmados y reproducibilidad de seed + instrucciones.
- Acreditar que la CPU usa sólo datos propios/públicos y decide igual antes/después de un plan humano privado; no asignar bonus por dificultad.
- Validar foco y traducciones en tres idiomas, handover sin primera instrucción visible, pausa/reanudación, velocidad, movimiento reducido, avance bloqueado y KEEP explícito al simular resto.
- Checkpoint/restore local con autoridad separada; impedir rollback tras avanzar. Verificar restauración del motor y paridad histórica en SIM-004B.
- Completar series y preparación conservando roster/ledger; registrar una vez, repetir sin recalcular, salida confirmada y vuelta al inicio.
- Comparar 300 semillas sintéticas emparejadas entre rápida actual e interactiva; informar modalidad legacy automática aparte, reconocer asimetría del banco y no afirmar equilibrio competitivo.
- Ejecutar typecheck, lint, test y build. Separar DOM de QA visual real/capturas; ver [evidencia y límites](qa/SIM-005.md).

## UX-NAV-005 — 20/10/2026

- Finalizar serie y volver a menú de rivales con foco, sin reabrir draft/configuración; un solo botón de salida del partido.
- Salida activa confirmada: cancelar/Escape conserva sesión y foco; Tab/Shift+Tab contenidos; confirmación no duplicada.
- Pausa/velocidad de reproducción sin simulación nueva; repetir conserva resultado, siguiente conserva plantel/reglas; preparación cancelable sólo antes de decisiones confirmadas.
- Online con gateway de prueba: volver a salas no llama forfeit/closeRoom/submitState/startDuel; eliminar sala confirmado. Cancha móvil abre con acceso directo sin avanzar decisiones.
- Tres idiomas; typecheck/lint/test/build y límites visuales reales documentados.

## SIM-004B — 20/10/2026

- Paridad completa con motor histórico: nueve formaciones, sin/con subs, kernel de cuatro modelos y 168 parejas de catorce colecciones; golden A sin modificar.
- Pausas tras 30/45/60/75, JSON parcial/final, planes recibidos parcialmente, digest oficial y corrupción, estadísticas conservadas, prefijos inmutables, finalización única.
- Táctica y cambios manuales sin RNG extra, tres cambios/exclusividad/línea/sin reentrada; rechazos estructurados y duplicados, actor/ventana/revisión, proyección sin futuro ni seed.
- Ejecutar typecheck/lint/test/build. Mantener UI, RPC y servicios fuera del alcance; registrar límites de autoridad futura en qa/SIM-004B.md.

## SIM-004A — 20/10/2026

- Comprobar continuidad bit a bit del RNG al serializar/restaurar, streams principal/subs independientes, cero y wraparound, snapshots inválidos rechazados.
- Fijar 24 golden del resultado completo con inputs sintéticos inmutables para clásico/v1/v2/v3, con/sin subs/táctica/técnico, sin alterar motor ni expectativas históricas.
- Ejecutar los cuatro controles y preservar informes ajenos. Igualdad de una sesión incremental completa y decisiones futuras son aceptación de SIM-004B en ADR-0018, no una capacidad ya implementada.

## Cartas y banco — 19/10/2026

Verificar categoría persistente, 600 períodos de leyendas por club, Cristiano United/Madrid separados, referencias de técnicos por edición, cuatro gestos banco/cancha, rechazo de otra línea y bloqueo tras confirmar. Ejecutar typecheck, lint, test y build; separar pruebas DOM de revisión visual real. Resultados y límites en qa/REFERENCE-CARDS-UX.md.

## action-v2 — 19/10/2026

- Comparar v1/v2 con 300 semillas por cada una de las catorce ediciones reales (8.400 encuentros), con onces exclusivos y reserva 8M; medir 0–0, goles y coherencia de eventos/estadísticas.
- Ejecutar 1.500 semillas por margen 0/2/3/4/5 en cada motor (15.000 encuentros sintéticos), medir victorias/empates/0–0 y conservar compatibilidad clásica/v1.
- Verificar 24 fragmentos, una oportunidad por fragmento, mismos eventos/marcadores, estadísticas progresivas y reproducción DOM sin recalcular ni mostrar estadísticas futuras.
- Ejecutar los cuatro controles y registrar bloqueo de QA visual real; mantener seguimiento explícito del pedido original.

## Árbol de categorías — 19/10/2026

- Siete entradas principales, dos ediciones cada una, vuelta sin perder selección y foco al navegar; es-AR/en/pt-BR con catorce hojas habilitadas.
- Liga Argentina actual usa los 150 aportados; colección mixta anterior conservada para reproducción, sin tercera opción visible.
- Latinoamérica incluye México/Centroamérica/Caribe latino; Europa se basa en nacionalidad. Cristiano portugués elegible aun con un club fuera de Europa. No reclasificar leyendas aún activas como actuales.
- Cuatro pools regionales separados por categoría, sin duplicados reconocidos ni pérdida de homónimos; técnicos por nacionalidad/versión, dos onces asequibles y rival CPU reproducible.
- Ejecutar typecheck/lint/test/build. Intentar navegador real y documentar límites visuales.

## Colecciones y series — 19/10/2026

- Importar los cuatro archivos, comprobar 1.200 IDs, 150 por liga/categoría, nacionalidades normalizadas, posiciones, ratings, precios y ausencia de fotos.
- Completar cinco duelos por cada colección nueva/Global Legends: onces exclusivos y presupuesto válido, con reserva de 8M. Verificar disponibilidad de los selectores.
- Calibrar 1.500 semillas por diferencia global 0/2/3/5 (6.000 partidos); coherencia de eventos y estadísticas, 18 oportunidades y progresión de probabilidades sin garantías.
- Comprobar tres encuentros obligatorios, exactamente dos adicionales si hay igualdad, penales y determinismo; conservar once, suplentes, técnico y estrategia; replay sin nuevas tiradas ni duplicados de historial.
- Verificar tres técnicos distintos por oferta, contexto actual/histórico, referencias de liga, reserva 1/4/8M y repetición entre equipos permitida.
- Regresión completa typecheck/lint/test/build, incluyendo partidas anteriores y online. QA visual escritorio/390/360 px y movimiento reducido mediante navegador real; registrar impedimento si no accede a Vite.

## Comprobaciones de cada entrega

Ejecutar npm run typecheck, npm run lint, npm test y npm run build. Registrar resultados y limitaciones en docs/qa con el identificador del encargo. No declarar éxito sin ejecución.

## CODEX-006

- Ejecutar las migraciones en PostgreSQL embebido con roles separados: miembro, rival, extraño y anon. Verificar RLS, privacidad, imposibilidad de escribir estado/configuración/miembros y restricciones de identidad/slots.
- Probar contratos de comandos, versiones, validación estricta y configuración pública sin secretos.
- Si se implementa lobby, probar creación/unión idempotente, ambos listos, expiración, límite de dos, salida y reconexión con snapshot oficial. Realtime solo invalida; no reconstruye estado.
- Repetir permisos/RPC en Supabase configurado y usar dos perfiles independientes más una tercera identidad. Sin ese entorno, registrar NO EJECUTADO y no iniciar CODEX-006C.

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


## CODEX-005C

- Ejecutar 3.000 partidas CPU con humanos simulados que pasan siempre, ofertan hasta base+1 y hasta base+4; guardar ofertas, pases, gastos, adjudicaciones y resultados por perfil.
- Comprobar valoración independiente de oferta, reproducción por semilla, cupo completo, máximo técnico, 22 IDs exclusivos y dos onces con gasto hasta 100M.
- UI: pausa CPU, controles humanos después de su acción, etiqueta separada de doble pase, fallback de fotografía fallida y regresión hot-seat/Draft Libre.
- Recursos: mapeo FIFA de banderas, campos de procedencia de fotografía y contratos argentinos vacíos sin duplicados de identidad.
- Intentar escritorio, 390 y 360 px; si el navegador está deshabilitado, registrar NO EJECUTADA.

CPU estratégica local implementada como opción junto a hot-seat. Perfiles CONSERVATIVE/BALANCED/AGGRESSIVE, valoraciones privadas fijas por ronda, registro de decisiones y asignaciones obligatorias diferenciadas. Banderas locales MIT y piloto de una foto verificada con créditos. Preparación de 200 nuevas identidades argentinas: 0/200 creadas; cuatro lotes ARG-B01..04, namespace independiente. Ver [ADR-0009](decisions/ADR-0009.md), ARGENTINA_COLLECTION.md y qa/CODEX-005C.md.

## Categorías y leyendas — 18/10/2026

- Conservar el objeto del catálogo Global y los 200 argentinos originales. Verificar el subconjunto de 188 leyendas argentinas y el bloqueo de los 12 contemporáneos sin ARQ.
- Probar carreras verificadas, liga incorrecta, metadatos ausentes, separación contemporary/legend y nacionalidad independiente de la liga en Argentina, Brasil, España e Inglaterra.
- Probar filtros CONMEBOL/UEFA por asociación y versión, independientemente del club.
- Ejecutar 60 duelos completos de cada modo argentino, verificando 22 jugadores exclusivos, presupuesto y partido simulable.
- Iniciar ambos modos desde AuctionPage con historial independiente. Comprobar nombres/descripciones y bloqueo de futuras colecciones en es-AR/en/pt-BR.
- Ejecutar los cuatro controles obligatorios. Revisión visual de escritorio/móvil separada de pruebas DOM.

## Simulación, técnicos y CPU — 18/10/2026

- Calidad por niveles: monotonía y tope de 3 puntos, S+ desde 98, sin ventajas por nacionalidad, época o precio. Sustituciones solo cuentan desde el bloque de entrada.
- Preservar simulación clásica y resultados grabados sin la nueva capa; comprobar determinismo de nuevos resultados y fallback de datos guardados.
- Calibrar 6.000 partidos sintéticos (igualdad, solo calidad, atributos+calidad+técnico+táctica). No interpretar la prueba sintética como balance final.
- Completar 270 duelos reales, nueve combinaciones dificultad/perfil, 22 IDs exclusivos, gasto de jugadores hasta 92M y técnico hasta 100M total. Verificar poder del panel contra el simulador.
- Reserva 1–8M, parser estricto, fallback antiguo 1M, nueva oferta con técnico S y otro de 1M, ofertas exclusivas y exportación de configuración.
- Comprobar fichas de técnicos, reserva, accesibilidad y traducciones es-AR/en/pt-BR mediante DOM. La QA visual real queda registrada aparte.

## Playtest ampliado — 19/10/2026

- Comprobar las catorce ediciones entre 150 y 300, activos/leyendas por nacionalidad y exclusión de retiros ya documentados.
- Calibrar la reproducción exacta del caso 92,7 vs 90,7 con Messi, Bianchi/control y Bilardo/contraataque; medir victorias, empates, derrotas, ceros y riesgo estimado de tres derrotas independientes. Comparar márgenes homogéneos 0,2,3,4,5 en 1.500 semillas cada uno.
- Medir 160 sorteos por política en Global, Global leyendas y España leyendas; S+ posibles pero raros, 22 identidades, cuotas por posición, variedad y viabilidad. No confundir peso inicial con frecuencia final.
- Verificar formación/posición real, conservación de gasto/propiedad, ausencia de sustituciones automáticas nuevas y continuidad de formaciones entre encuentros.
- Comprobar guías, fuentes, rol y avatar en tres idiomas, y nueva partida/revancha. Probar categorías distintas y elegibilidad de técnicos/suplentes; online con PostgreSQL local, sin afirmar dos navegadores reales.
- Ejecutar typecheck, lint, test y build. Revisar imágenes descargadas; QA visual del sitio y escucha real deben registrarse por separado.
