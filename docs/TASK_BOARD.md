# Tablero de tareas

## Publicación sprint 8 — 25/10/2026

Entrega aislada del trabajo de Codex, excluyendo sprints posteriores de Claude. Validación completa: 1.447 pruebas; commit bc7648c subido a codex/sprint-8-publicacion. Main actualizado y Worker publicado tras autorización explícita: versión b194ae0d al 100 %, etiqueta bc7648c; HTTP/HTML y nueve bundles verificados. [Registro](logs/SPRINT-8-PUBLICACION.md) y [trabajo paralelo](PARALLEL_WORK.md).

## Todos los nodos sobre la cancha — 24/10/2026

Cabezazos de las tres familias, córners, tiros libres directos/indirectos, barrera y gambeta con objetivos táctiles en TacticalBoard. Gambeta/tiro directo comparten selección y precisión con tarjetas/teclado; controles accesibles y motor intactos. Typecheck/lint/build y 1.447 pruebas en 133 archivos aprobados; fieldInteraction incluye 29 pruebas nuevas. QA visual bloqueada por timeout de Vite desde el navegador integrado. [Registro](logs/FIELD-ALL-2026-10-24.md).

## Movimiento contextual del tablero — 24/10/2026

Offsets puros por posesión, profundidad y sector de pelota para los 22 círculos; receptores A/B con pique continuo y flechas animadas, hit areas sincronizadas, estela del balón y anillo del portador. Pausa y movimiento reducido respetados; motor/RNG intactos. Typecheck/lint/build y 1.418 pruebas en 133 archivos aprobados; 34 pruebas del tablero repetidas sobre el ajuste final. QA visual bloqueada por timeout del navegador local. [Registro](logs/BOARD-MOTION-2026-10-24.md).

## Versus Online: invitaciones y paridad — 24/10/2026

Reverificado ante el pedido repetido: cuatro controles aprobados nuevamente, 1.412 pruebas, sin cambios adicionales de código.

Invitación destacada con copia independiente de código/enlace y compartir nativo cuando está disponible, incluidas salas sin código corto; cancelación silenciosa y errores traducidos. Paleta estadio, emblema y audio existentes conservados. Duelos nuevos con COACH_MARKET_V4 y DISCARDS_MARKER_V2 (cinco descartes), sin migrar partidas anteriores. Typecheck/lint/build aprobados; 1.412 pruebas en 132 archivos aprobadas con cuatro workers. QA visual y compartir nativo real pendientes. [Registro y límites](logs/ONLINE-UX-2026-10-24.md).

## Subasta y partido responsive — 24/10/2026

Barra compacta con controles de 44 px, carta de retrato 76 px y decisiones móviles más compactas; relato/estadísticas de escritorio y atajos CPU verificados en tres idiomas. Typecheck/lint/test/build aprobados: 1.407 pruebas en 132 archivos. QA visual a 390×844 pendiente por bloqueo del navegador. [Registro](logs/RESPONSIVE-UX-2026-10-24.md).

## Presupuesto y vestuario — 24/10/2026

Desglose siempre visible, incluso sin HUD; ambos DT accesibles antes del escaparate e indicador coherente mientras falta cualquiera. Pases ámbar, banner compacto, traducciones y confirmaciones existentes conservados. Typecheck/lint/test/build aprobados: 1.402 pruebas en 132 archivos, sin fallos. [Registro](logs/ECONOMY-UX-2026-10-24.md).

## Tipografía y performance — 24/10/2026

Fuentes locales display/sans, piso `.68rem` y cifras tabulares ampliadas; limpieza/marca ya presentes verificadas. Chunks de producción por debajo de 500 kB (máximo 341.461 bytes), datos originales idénticos. Typecheck/lint/test/build aprobados: 1.393 pruebas; QA visual a 360 px bloqueada por política de URL. [Registro](logs/FRONTEND-PERFORMANCE-2026-10-24.md).

## QA frontend — 24/10/2026

Contraste RankChip consolidado y regresiones ampliadas para ranking oculto, precios de suplentes al pasar al once y apellidos compuestos. Reglas del motor conservadas. Typecheck/lint/test/build aprobados: 1.393 pruebas en 131 archivos, sin errores; advertencias previas documentadas en el [registro](logs/QA-FRONTEND-2026-10-24.md).

## SIM-005R-05 — 21/10/2026

| Entrega | Estado |
| --- | --- |
| Estrategia antes de jugar y única consulta táctica a los 45′ | Implementada en nuevos encuentros dirigidos, CPU y hot-seat |
| Ventanas históricas 30/60/75 | Conservadas: KEEP automático registrado, sin cambio táctico oculto |
| Sustituciones opcionales y simultáneas entre participantes | Implementadas por solicitud; mismo banco, máximo tres por lado |
| Estrategia + sustitución en el entretiempo | Orden opt-in HALFTIME, validación y aplicación atómica |
| Duelo OVR central sin sobrescribir modelos anteriores | Implementado en conducción, recuperación/presión/intercepción y disputa aérea |
| Calibración | 700.000 duelos y 3.000 partidos; descenso aéreo documentado |
| Idiomas, teclado, foco y controles | Pruebas en es-AR/en/pt-BR; Canvas/audio y reduced-motion conservados |
| Controles finales | Typecheck/lint/build, 1.046 pruebas en 100 archivos y dry-run aprobados |
| QA visual real | Pendiente: navegador deshabilitado por Work settings; sin eludirlo |
| Push y despliegue solicitados | 76d23cd en origin/codex/sim-005; Worker activo al 100%, HTTP/SHA-256 verificados. Main sin cambios tras rechazo de revisión automática. [Registro](logs/SIM-005R-05.md) |

## SIM-005R-04B — 20/10/2026

| Entrega | Estado |
| --- | --- |
| Continuidad aérea, conducción, salto, arquero y desenlace confirmado | Corregido en presentación; pruebas geométricas y Canvas simulado aprobadas |
| Pausa, 1×/2×/4×, foco y respuesta a elección | Corregido; conserva progreso y decisiones |
| Audio único, centro en liberación, desbloqueo por gesto | Verificado con mocks; escucha real pendiente |
| Balance de seis perfiles reales sin calibración | Ejecutado: 480.000 oportunidades condicionales; centros competitivos en algunos perfiles |
| Movimiento real, video/fotogramas y cuatro tamaños | Pendiente: navegador bloqueado por Work settings; sin eludirlo |
| Playtest local reproducible | Preparado con motor real y cinco desenlaces; pendiente uso humano |
| Controles y entrega local | Typecheck/lint, 1.021 pruebas y build aprobados; sin push/merge/deploy |

[Informe y límites](qa/SIM-005R-04B.md). Trabajo detenido tras esta entrega; no se inicia otra familia.

## SIM-005R-04 — 20/10/2026

| Entrega | Estado |
| --- | --- |
| Centro → disputa → HEADER → resolución, extensión opt-in | Implementado; resultado de cabezazo pendiente hasta elegir |
| Primer palo / centro / segundo palo, Canvas y tres idiomas | Implementado; efectos Web Audio locales |
| Checkpoint/replay, 24 ocasiones y modos anteriores | Pruebas y 600 huellas del commit 10f406b; golden intactos |
| Calibración 240 semillas × cinco políticas | Hecha; 2,375 momentos por partido; no acredita balance humano |
| QA visual elección 390/412/768/1280 | Ejecutada y capturada |
| Secuencia real de movimiento, atajada/gol/desviado y escucha | Pendiente: navegador local deshabilitado al continuar; audio no escuchado |

[Contratos, controles, fórmulas y límites](qa/SIM-005R-04.md). Sin push/merge/deploy ni ampliación a otras familias.

## SIM-005R-03 — 20/10/2026

| Entrega | Estado |
| --- | --- |
| Director match-moments-v1 sobre ocasiones reales, RNG propio y alternancia | Implementado; 2,44 momentos/partido en 240 semillas |
| Ataque reutilizado y defensa interceptar/presionar | Implementado, sólo CPU; cinco atributos y fuerza efectiva sin doble bonus |
| Checkpoint, resultado versionado y replay; históricos/golden | Cubiertos sin actualizar golden |
| Canvas: conducción, presión, pase, recepción, recuperación, remate/arquero | Implementado; secuencia capturada con eventos reales |
| Panel breve, detalle e historial desplegables | es-AR/en/pt-BR, accesibilidad incluida |
| QA real 390/412/768/1280 | Ejecutada mediante arnés temporal retirado |
| Audio escuchado y playtest humano de equilibrio | Pendientes; pruebas automatizadas no los sustituyen |

[Informe completo y controles](qa/SIM-005R-03.md). Entrega local; sin push/merge/deploy ni avance a otras familias.

## SIM-005 — 20/10/2026

| Entrega | Estado |
| --- | --- |
| Adaptador incremental directo, ledger real, banco y reserva de técnico preservados | Hecho local, sin precalcular MatchResult |
| Dirigir / rápida, cuatro ventanas, estrategias y sustituciones manuales | Hecho, tres idiomas |
| CPU pura determinista y hot-seat con órdenes separadas | Hecho, sin bonus ni lectura de planes humanos |
| Pausa/velocidad/movimiento, KEEP explícito para simular resto | Hecho; ninguna decisión se omite |
| Series, revancha, replay e historial único | Hecho; motor histórico intacto |
| Auditoría y pausa con checkpoint local | Hecho en memoria; recuperación tras recarga e importación no implementadas |
| Typecheck / lint / 949 tests / build | Pasan; advertencia de bundle grande |
| Calibración 300 semillas emparejadas | Hecho; no acredita balance competitivo |
| Capturas y revisión visual móvil/escritorio | Pendiente: acceso a navegador rechazado por política |

Detalle: [QA SIM-005](qa/SIM-005.md). Entrega técnica sin push/merge/deploy ni cambios online/Supabase/catálogo; archivos ajenos conservados. Publicación posterior autorizada por el usuario: `317cbb1` en GitHub/main y Worker activo al 100 %, HTML y bundles verificados; [registro](logs/SIM-005.md).

## UX-NAV-005 — 20/10/2026

Navegación de partido/serie al inicio corregida, salidas confirmadas, online a salas sin abandono/cierre implícitos, pausa/velocidad de reproducción y acceso móvil directo a canchas; tres idiomas. [Auditoría, controles y límites](qa/UX-NAV-005.md). Base SIM-004B conservada; sin cambios al motor ni backend.

## SIM-004B — 20/10/2026

API incremental v3, ventanas bilaterales, instrucciones y checkpoints implementados sin integrar UI ni autoridad online. Motor histórico y golden conservados; 168 comparaciones reales sin diferencias completas. Contrato/API y controles: [SIM-004B](qa/SIM-004B.md). SIM-005, backend interactivo y despliegue pendientes de encargos explícitos.

## SIM-004A — 20/10/2026

Diseño incremental y prueba aislada de continuidad RNG: [ADR-0018](decisions/ADR-0018-interactive-match.md), [QA y límites](qa/SIM-004A.md). Cuatro ventanas propuestas, 24 golden históricos y reanudación RNG probada. Motor productivo intacto. SIM-004B pendiente de encargo: extracción/equivalencia completa, decisiones e integración; autoridad online requiere trabajo posterior explícito.

## COACH-FLOW — 20/10/2026

Secuencia técnico → suplentes/once → poder/tácticas y 65/120 técnicos S implementados. Evidencia y límites en qa/COACH-FLOW.md; QA visual pendiente por navegador deshabilitado.


## ENTRY-CPU — 20/10/2026

Inicio de tres rivales sin Draft Libre y CPU difícil reforzada implementados; reglas online progresivas. Ver qa/ENTRY-CPU.md. QA visual bloqueada por Work settings.


## ARG-UX-FIX — 20/10/2026

Balance argentino actual, prioridad de posiciones titulares pendientes y once/técnicos compactos implementados. 884 pruebas aprobadas; QA y pendientes en qa/ARG-UX-FIX.md.


## Entrada simplificada — 20/10/2026

| ID | Actividad | Estado |
|---|---|---|
| UX-003 | Rival primero, clásico directo, configuración progresiva y tutorial breve | Implementada en es-AR/en/pt-BR. 879 pruebas aprobadas; typecheck/lint/build correctos. Navegador real a 360/390/412/768/1280 px; evidencia y límites en qa/UX-003.md. Sin cambios a motores, datos o sincronización |

## Pie dominante — 20/10/2026

| ID | Actividad | Estado |
|---|---|---|
| DATA-FOOT-001 | Integrar pie dominante como metadata, contrato compatible, ficha localizada y auditoría | Completa: 1.200 claves exactas; RIGHT/LEFT/BOTH 914/275/11; 875 pruebas aprobadas, cinco comandos requeridos correctos. 240 simulaciones anteriores conservadas, sin cambiar motores/roles. Revisión factual externa del adjunto pendiente. Ver qa/DATA-FOOT-001.md y logs/DATA-FOOT-001.md |

## Cartas y banco — 19/10/2026

Categoría visible durante subasta, períodos por club para 600 leyendas importadas, tarjetas de técnicos con nacionalidad/trayectorias y 100 fotos, banco intercambiable desde la cancha, contraste y animaciones implementados. 824 pruebas aprobadas. Dos técnicos sin foto reutilizable encontrada; QA visual en navegador impedida por Work. Ver qa/REFERENCE-CARDS-UX.md y logs/REFERENCE-CARDS-UX-2026-10-19.md. Push solicitado sobre codex/current-club-audit; despliegue separado.

## Producción — 19/10/2026

| ID | Actividad | Estado |
|---|---|---|
| DL-F04-OPS-001 | Diagnosticar desfasaje GitHub/Cloudflare y publicar e19296f | Publicado con autorización explícita en Worker reclutador-app, versión f5d7bd6b-abce-4759-822b-c679339ba8e6 al 100%; HTTP/assets/configuración pública online verificados. Sin CI/CD ni cambios en main; ver DEPLOY.md y logs/PRODUCTION-E19296F.md |

## Revisión de emoción del simulador — 19/10/2026

| ID | Actividad | Estado |
|---|---|---|
| DL-F04-BAL-004 | Reducir 0–0 y medir ventaja 3–4 con datos reales | action-v2: 24 oportunidades; comparación de 8.400 partidos reales y 15.000 sintéticos, ADR-0016; playtest humano pendiente |
| DL-F04-UX-007 | Relato jugada por jugada y estadísticas en vivo | Implementado para v2 sin recalcular ni cambiar la duración total; tarjeta también para técnico contratado, tres idiomas; QA visual bloqueada por Work settings |

Seguimiento de cada punto del pedido original: qa/ACTION-V2.md. Los informes previos se conservan como historia de v1.

## Categorías jerárquicas — 19/10/2026

| ID | Actividad | Estado |
|---|---|---|
| DL-F04-UX-006 | Siete categorías con actuales/leyendas y botón de vuelta | Implementada en es-AR/en/pt-BR; conserva selección, foco y contratos anteriores |
| DL-F04-MODE-002 | Latinoamérica y Europa por nacionalidad global | Cuatro ediciones habilitadas con datos existentes, técnicos por nacionalidad/versión y presupuestos 100/150M; ver ADR-0015 y qa/CATEGORY-TREE.md |

## Pedido de colecciones y series — 19/10/2026

| ID | Actividad | Estado |
|---|---|---|
| DL-F04-DATA-006 | Incorporar las cuatro bases aportadas, ratings, rangos y precios, sin fotos | Implementada: 1.200 versiones, ocho colecciones y Global Legends combinado; revisión factual/editorial pendiente, ADR-0014 |
| DL-F04-BAL-003 | Más oportunidades y sensibilidad a diferencias de poder | Implementada: action-v1, 18 oportunidades, calibración reproducible de 6.000 partidos; playtest real pendiente |
| DL-F04-PLAY-005 | Series con el mismo plantel y ganador | Implementada: tres encuentros, dos adicionales en igualdad y penales; CPU, hot-seat, libre y nuevos partidos online |
| DL-F04-UX-005 | Tres cartas de técnicos por contexto, referencias y ayudas | Implementada en tres idiomas, animaciones y movimiento reducido; QA visual bloqueada por timeout del navegador |
| DL-F04-DATA-007 | Revisar variantes de nombres en Global Legends | Diez grupos explícitos revisados; nueve duplicados adicionales excluidos, 552 versiones en el combinado. Las ocho colecciones de 150 y los homónimos se conservan |

Se mantienen abajo estados e informes históricos. El subconjunto anterior de 188 leyendas argentinas fue sustituido en el selector por las 150 aportadas en este pedido. Catálogos anteriores e IDs conservados. Detalle: qa/COLLECTIONS-SERIES.md y logs/COLLECTIONS-SERIES.md.

Nomenclatura: DL-FXX-CAT-NNN; FXX indica fase y CAT responsabilidad. No existía tablero anterior.

| ID | Actividad | Estado |
|---|---|---|
| DL-F01-ARC-001 | Reconocimiento, stack y estructura strict | Completa |
| DL-F01-UI-001 | Inicio responsive y cancha ilustrativa 4-3-3 | Completa |
| DL-F01-I18N-001 | Recursos es-AR/en/pt-BR y fallback | Completa |
| DL-F01-I18N-002 | Selector accesible, persistencia y recuperación | Completa |
| DL-F01-I18N-003 | Posiciones y vocabulario inicial compartido | Completa |
| DL-F01-QA-001 | Automatización y comprobaciones de CODEX-001 | Completa; resultados y límites en qa/CODEX-001.md |
| DL-F01-DOC-001 | ADR-0002, reglas, roadmap e informe | Completa |
| DL-F02-DATA-001 | Modelo, contrato, economía y validadores del catálogo (CODEX-002) | Completa; ver qa/CODEX-002.md |
| DL-F02-DATA-002 | Crear y auditar catalog_v1 ampliado a 500 futbolistas (CODEX-003) | En curso: 150/500; no completar hasta auditar diez lotes |
| DL-F02-DATA-003 | Adaptar contrato/validación y manifest a 500 (CODEX-003A) | Completa |
| DL-F02-DATA-004 | Implementar y validar B01 (CODEX-003A) | Completa técnicamente; revisión editorial de balance registrada |
| DL-F02-DATA-005 | Implementar y auditar B02 | Completa; CODEX-003B, B02 y acumulado de 100 validados |
| DL-F02-DATA-006 | Implementar y auditar B03 | Completa; CODEX-003C, B03 y acumulado de 150 validados |
| DL-F02-DATA-007 | Implementar y auditar B04 | Pendiente |
| DL-F02-DATA-008 | Implementar y auditar B05 | Pendiente |
| DL-F02-DATA-009 | Implementar y auditar B06 | Pendiente |
| DL-F02-DATA-010 | Implementar y auditar B07 | Pendiente |
| DL-F02-DATA-011 | Implementar y auditar B08 | Pendiente |
| DL-F02-DATA-012 | Implementar y auditar B09 | Pendiente |
| DL-F02-DATA-013 | Implementar y auditar B10 | Pendiente |
| DL-F02-QA-001 | Auditoría final global de 500 y viabilidad económica | Pendiente; no ejecutada sobre un catálogo completo real |
| DL-F02-I18N-002 | Traducir categorías contemporary/legend en tres idiomas | Completa |
| DL-F02-I18N-001 | Traducir interfaz y validaciones del catálogo | Pendiente |
| DL-F04-PLAY-001 | Primer prototipo jugable PLAYTEST_150 (CODEX-004A) | Completa; draft local, catálogo real, persistencia, i18n y QA visual |
| DL-F04-PLAY-002 | Primer partido local contra CPU (CODEX-004B) | Completa; generador CPU con semilla, motor puro, reproducción y resultado |
| DL-F04-PLAY-003 | El Reclutador: identidad, diagnóstico y fundación de modalidades (CODEX-004C) | Completa; selector Global, filtros puros y contratos sin importar datos externos |
| DL-F04-DATA-001 | Cargar y revisar metadatos temáticos por procedencia | Pendiente; requiere revisión editorial, sin rellenos ni consultas de API en runtime |
| DL-F04-BAL-001 | Decidir un cambio de balance si producto lo solicita | Pendiente; alternativas documentadas sin modificar probabilidades |
| DL-F04-PLAY-004 | Duelo de Reclutadores hot-seat y subastas (CODEX-005B) | Completa; 22 cartas individuales, cupos y presupuesto protegidos, moneda persistente, registro y simulador compartido |
| DL-F05-ONLINE-001 | Servidor autoritativo para pujas y cara o cruz | Pendiente; reutilizar el motor puro de DL-F04-PLAY-004 |
| DL-F05-ONLINE-002 | Base Supabase, identidad, contratos y RLS (CODEX-006A) | Parcial: migración ejecutada y permisos probados en PostgreSQL embebido; integración Supabase real pendiente; ver qa/CODEX-006A.md |
| DL-F05-ONLINE-003 | Salas, invitaciones y lobby (CODEX-006B) | Parcial: RPC y canal privado preparados, interfaz y pruebas locales en tres idiomas; E2E real con dos identidades pendiente; ver qa/CODEX-006B.md |
| DL-F05-ONLINE-004 | Primera operación competitiva autoritativa (CODEX-006C) | No iniciada: requiere validar A/B con backend real; inicio del lobby no ejecuta moneda, pujas ni partido |
| DL-F04-CPU-002 | CPU pujadora en Duelo de Reclutadores | Completa en CODEX-005C; tres perfiles reproducibles, opción Contra CPU |
| DL-F04-UI-005 | Identidad cromática original de clubes (CODEX-005D) | Completa; 67 paletas del catálogo, ClubBadge compartido, fallback neutral y etiquetas en tres idiomas; QA visual manual pendiente |
| DL-F04-DATA-002 | Club actual, referencia e historial (CODEX-005E) | Estructura y primera auditoría completas: 25/150 revisados, 19 confirmados y seis pendientes; otros 125 sin revisar. Capturas fechadas, registro central e interfaz en tres idiomas; QA visual manual pendiente |
| DL-F04-DRAW-001 | Variedad y reproducción del sorteo (CODEX-005F) | Completa: entropía por inicio, contexto transportable, historial versionado de cinco y comparación de 1.000 sorteos por política; sin cambios económicos |
| DL-F04-UI-006 | Ambos onces en vivo y cupos posicionales (CODEX-005F) | Completa técnicamente en tres idiomas; 482 pruebas aprobadas, dos baterías masivas de partidos omitidas; QA visual manual pendiente por navegador deshabilitado |
| DL-F04-TACTICS-001 | Estrategias futbolísticas (CODEX-005G) | Propuesta en ROADMAP: control del mediocampo, bandas, contraataque, presión alta y bloque bajo; no iniciada |
| DL-F04-UI-007 | Canchas 4-3-3 y moneda animada (CODEX-005G-A) | Completa técnicamente: camisetas originales, detalles existentes, selector móvil y lanzamiento único; QA visual manual NO EJECUTADA por navegador deshabilitado |
| DL-F04-AUCTION-001 | Diagnóstico de bloqueos y confirmación de asignaciones (CODEX-005G-A) | Completa: motivos centralizados, importe visible validado y adjudicación obligatoria anticipada/confirmada; 487 pruebas aprobadas, cuatro baterías masivas omitidas; sin cambiar simulador |
| DL-F04-AUCTION-002 | Tres descartes conjuntos y reemplazos viables (CODEX-005G-B) | Completa: reserva compartida, misma posición/prioridad, hasta 25 candidatos y 22 adjudicaciones exclusivas; búsqueda finita y fallback anunciado |
| DL-F04-BAL-002 | Auditar semillas, simetría y poder global (CODEX-005G-B) | Completa: semilla fresca también en Draft Libre; iniciativa simétrica v2, poder sectorial y calibración 6.000 partidos antes + 6.000 después; 498 pruebas aprobadas, tres baterías ajenas omitidas |
| DL-F04-UI-008 | Animaciones de revelación, descarte, oferta, fichaje y gol (CODEX-005G-B) | Completa técnicamente en tres idiomas y con movimiento reducido; QA visual NO EJECUTADA por navegador deshabilitado |
| DL-F04-TACTICS-002 | Roles futbolísticos y organización del once (CODEX-005G-C1) | Completa técnicamente: once roles (CM→CDM con migración), intercambio dentro de la línea, fase de confirmación en tres idiomas; 512 pruebas aprobadas; QA visual manual pendiente |
| DL-F04-TACTICS-003 | Motor táctico: seis estrategias, ajustes por bloque y CPU (CODEX-005G-C2) | Completa técnicamente: tactics-v1, NEUTRAL idéntico a v2 (300 resultados grabados), validación en el límite del motor, calibración de 126.000 partidos; 524 pruebas aprobadas; efecto táctico pequeño (1–4 pp) a evaluar en playtest; interfaz secreta pendiente en C3 |
| DL-F04-TACTICS-004 | Selección secreta de estrategias y HUD deportivo (CODEX-005G-C3A) | Completa técnicamente: elección por turnos con traspaso y revelación simultánea, CPU fijada de antemano, HUD derivado del motor, tres idiomas; 536 pruebas aprobadas; QA visual/móvil NO ejecutada; temporizadores solo documentados (ADR-0010) |
| DL-F04-UI-009 | Marcador/HUD durante las subastas (CODEX-005G-C3A) | Completa técnicamente; revisión visual manual a 360/390 px pendiente |
| DL-F04-TACTICS-005 | Resumen táctico explicado en el resultado (CODEX-005G-C3B) | Completa técnicamente: estrategias y ajuste medio visibles en tres idiomas; 539 pruebas aprobadas; QA visual NO ejecutada |
| DL-F04-TACTICS-006 | Narración táctica por eventos (CODEX-005G-C3D) | Completa técnicamente: etiqueta «Influencia táctica» en tres idiomas sin alterar resultados (288 partidos grabados idénticos); 558 pruebas aprobadas; QA visual pendiente |
| DL-F04-TACTICS-007 | Playtest del tamaño del efecto táctico (1–4 pp) | Pendiente de partidas reales; si resulta bajo, revisar el modelo de eventos y recalibrar |
| DL-F04-UI-010 | Moneda pelota/estadio con lanzamiento 3D y animación omisible (CODEX-005G-C3C) | Completa técnicamente: resultado guardado, cara final idéntica, movimiento reducido, tres idiomas; QA visual NO ejecutada |
| DL-F04-AUDIO-001 | Efectos sonoros sintetizados y controles de audio (CODEX-005G-C3C) | Completa técnicamente: siete efectos Web Audio sin archivos externos, volumen y activación persistentes, sin duplicados; 554 pruebas aprobadas; escucha real pendiente |
| DL-F04-UI-011 | Unificación de movimiento y causa del timeout de AuctionPage (CODEX-005G-C3C) | Completa: tokens de duración/curva; el timeout es carga de CPU síncrona (≈1,7 s aislada), no asincronía |
| DL-F04-FIX-001 | Pantalla posterior a las estrategias con pasos, foco y errores recuperables (CODEX-005G-C3E) | Completa: no era un bloqueo lógico; el usuario no había elegido la estrategia del segundo jugador y el paso era poco visible; ahora hay aviso explícito, pasos, foco y botón «Jugar partido» |
| DL-F04-AUCTION-003 | Completado automático de la CPU y «Completar mi equipo» (CODEX-005G-C3E) | Completa: primitivas de dominio atómicas con historial, vista previa, secuencia omitible; 572 pruebas aprobadas; QA visual a 360/390 px pendiente |
| DL-F04-UI-012 | Modo EDITAR FORMACIÓN, arrastre y aptitudes documentadas (CODEX-005H-H1) | Completa técnicamente: dos toques + arrastre, resaltado de línea, ROLE_PROFILES vacío (UNKNOWN), 576 pruebas; QA visual pendiente |
| DL-F04-CONFIG-001 | Partidas personalizadas: MatchConfig, nombres, presupuesto y preflight (CODEX-005H-H2) | Completa técnicamente: clásico intacto, presupuesto único en el motor, nombres propagados, 589 pruebas; QA visual pendiente |
| DL-F04-ROSTER-001 | Tres suplentes opcionales: 14 por equipo, 28 cartas y sustituciones automáticas subs-v1 (CODEX-005H-H3) | Completa técnicamente: clásico intacto, calibración de 4.000 partidas, 602 pruebas; QA visual pendiente |
| DL-F04-DATA-003 | Auditoría de clubes de los 150 futbolistas al 18/10/2026 (CODEX-005H-H4) | 150/150 revisados: 118 verificados (93 ACTIVE, 25 RETIRED), 32 pendientes con motivo, 0 sin revisar; ratings, precios e IDs intactos; roles específicos: ninguno verificable (UNKNOWN); 606 pruebas |
| DL-F04-DATA-004 | Primer lote argentino ARG-B01 (CODEX-005H-H5) | 50 registros arg_001–arg_050 (6/16/15/13) fuera de DRAFT_CATALOG, validador, 25 clubes con nombre, modo Fútbol Argentino preparado sin habilitar; Boca+River 58 % reconocido como límite; ver docs/qa/CODEX-005H-H5.md |
| DL-F04-DATA-005 | Lotes argentinos ARG-B02 a B04 (200/200 con B01) | 150 registros más (arg_051–arg_200), validador común, 4 lotes de 50 con cuota 6/16/15/13; fuera del catálogo y sin habilitar; ver docs/qa/CODEX-005H-ARG-B02..B04.md |
| DL-F04-MODE-001 | Modo Fútbol Argentino habilitado (pedido del usuario) | ARGENTINA_CLUBS con los 200 arg_*, catálogo por modo en la subasta, historial por modo, 60 duelos de prueba; Global sigue por defecto; ver docs/qa/CODEX-005H-ARG-MODE.md |
| DL-F04-UX-003 | Abandonar partida e historial local (pedido del usuario) | Botón con confirmación (vs CPU: derrota; hot-seat: elige quién abandona), historial en localStorage (hasta 100, totales por rival, borrar con confirmación), es-AR/en/pt-BR; test de entorno de OnlinePage aislado de .env.local |
| DL-F04-UX-004 | Bonus de plantel, carteles de oferta/pase, suplentes con dinero sobrante y ajuste móvil (pedido del usuario) | Ver docs/qa/CODEX-UX-002.md; pendiente: descartes individuales y sorteo según necesidad |
| DL-F05-ONLINE-003 | Duelo online jugable (dos navegadores) y avisos de acciones bloqueadas | Migración 202610190001, estado compartido con versión, estrategias secretas, abandono, prueba de dos navegadores contra PostgreSQL; ver docs/qa/CODEX-006C.md |
| DL-F04-UX-001 | Celebración de subasta ganada (CODEX-005H-H6, parcial) | Banner «¡GANASTE LA SUBASTA!», sonido propio, camiseta resaltada y reduced-motion; el resto del pulido queda pendiente; ver docs/qa/CODEX-005H-H6.md |
| DL-F04-UX-002 | Tutorial de primera visita y ayudas contextuales (H7, pedido del usuario) | Guía de seis pasos con teclas, botón «?», notas por fase descartables, es-AR/en/pt-BR, preferencias locales; ver docs/qa/CODEX-005H-H7.md |
| DL-F04-UX-005 | Pulido inmediato tras informe QA externo | Completa: quitado el selector de modo inerte de Draft Libre, contador de descartes fuera del partido, modos no jugables en desplegable «Próximas colecciones» (es-AR/en/pt-BR); 709 pruebas aprobadas; QA visual NO ejecutada; ver docs/logs/QA-REPORT-TRIAGE.md |
| DL-F05-ONLINE-005 | Revancha en la misma sala, modo/presupuesto elegibles en el lobby y cierre FINISHED al terminar el partido | Pendiente (futuro 1): nueva migración, relaja CHECK de room_settings, RPC online_rematch |
| DL-F05-ONLINE-006 | Reloj de turno online con deadline_at (ADR-0010) | Pendiente (futuro 2): pase automático o victoria por inactividad; requiere decidir tiempos |
| DL-F04-TACTICS-008 | Roles posicionales específicos y peso táctico | Pendiente (futuro 3): etiquetar 350 jugadores con fuente verificable (hoy ROLE_PROFILES vacío) y revisar TACTICAL_GAINS tras playtest de DL-F04-TACTICS-007 |
| DL-F04-COACH-001 | Directores técnicos: 100 técnicos, reserva de 1M, mercado y efecto en el partido | Completa técnicamente (hot-seat y CPU) en es-AR/en/pt-BR; datos de equipos pendientes de auditoría; online sin técnicos; ver docs/COACHES.md |
| DL-F04-AUCTION-004 | Posición completa sin botones, «Reclamar», técnico antes de suplentes y nuevo mercado de suplentes (pedido del usuario) | Completa técnicamente: pasa solo si la posición está llena, botón «Reclamar» cuando el rival ya pasó, suplentes = descartados + extras sorteados del mismo catálogo, hasta 3 (uno por línea), tras el técnico y solo si ambos conservan dinero; es-AR/en/pt-BR; QA visual pendiente |
| DL-F04-UI-013 | Poder global destacado tras el scouting, suplentes al once y técnicos también online (pedido del usuario) | Completa técnicamente: panel PODER DEL EQUIPO (global, sectores, nivel medio, técnico), cambio suplente↔titular de la misma línea (solo juega el once), duelo online con técnicos; es-AR/en/pt-BR; QA visual NO ejecutada; las sustituciones automáticas subs-v1 durante el partido no cambian |
| DL-F04-MODE-002 | Categorías: Brasil (~150), España, Italia, Inglaterra, Sudamérica, Europa, Global actuales, Leyendas y Leyendas+actuales | Parcial: parejas actuales/leyendas de Global, Argentina, Brasil, España, Inglaterra, Sudamérica y Europa definidas en tres idiomas; Argentina · leyendas habilitada (188). Resto pendiente, incluidos datos, Italia, mezclas y versus; ver ADR-0012 y qa/CATEGORIES-LEGENDS.md |
| DL-F04-MODE-003 | Versus entre categorías distintas con nivel equiparado | Pendiente (pedido del usuario): cada reclutador elige su categoría y el sorteo equilibra el nivel; ver ADR-0012 |
| DL-F04-DATA-006 | Más leyendas sin foto y borrado de pendientes | Pendiente (pedido del usuario): ampliar leyendas con ficha base; quitar registros pendientes y reponerlos luego |
| DL-F04-DATA-007 | Segunda fuente de datos además de Wikipedia | Pendiente: evaluar Wikidata (CC0, estructurado) y fuentes con licencia; registrar procedencia por campo |
| DL-F04-BAL-003 | Simulación por niveles, técnicos y dificultad de CPU (pedido 18/10/2026) | Implementada: squad-quality-v1, poder efectivo, afinidad técnico/táctica, reserva 1–8M (8M por defecto), EASY/NORMAL/HARD; se conservan 100 técnicos (70/30, 54 ARG), correcciones biográficas parciales; playtest y auditoría completa pendientes; ver ADR-0013 y qa/SIMULATION-COACHES.md |
| DL-F03-I18N-001 | Traducir draft, presupuesto y confirmaciones | Completa en CODEX-004A |
| DL-F04-I18N-001 | Traducir simulación y resultados | Completa en CODEX-004B |
| DL-F05-I18N-001 | Traducir salas, espera y errores online | Pendiente |
| DL-F06-I18N-001 | Traducir resultados compartibles | Pendiente |

Nota de continuidad: DL-F02-DATA-001 se titulaba originalmente «Definir modelo y catálogo de futbolistas». CODEX-002 asigna ese mismo ID solo al contrato y validadores; no se renumeran tareas históricas y se separa el catálogo real como DL-F02-DATA-002. DL-F02-I18N-001 sigue pendiente: no se creó interfaz de catálogo ni se muestran diagnósticos técnicos al usuario.

Ampliación autorizada en CODEX-003A: DL-F02-DATA-002 pasa de 100 a 500 sin cambiar ID. Su aceptación exige diez lotes auditados con la matriz 300/200, cuotas por posición y tiers, IDs únicos y precios consistentes; aprobación parcial no equivale a cierre global. La base económica DL-F02-DATA-001 se conserva y su ampliación queda trazada por DL-F02-DATA-003. Véanse ADR-0004 y CATALOG_PROGRESS.md.

CODEX-003B cerró únicamente DL-F02-DATA-005. El acumulado B01+B02 contiene 100 contemporary y 0 legend, con globalStatus=pending/valid:false. B01 y su auditoría histórica se conservaron intactos. La auditoría completa DL-F02-QA-001 sigue pendiente; no se inició B03.

CODEX-003C cierra DL-F02-DATA-006: 150/500, contemporary 150/300, legend 0/200, tres lotes aprobados parcialmente y global pending/valid:false. Los datos y precios de B01/B02 se conservaron intactos; auditoría global pendiente. B04 no iniciado.


## CODEX-005C

CPU estratégica local implementada como opción junto a hot-seat. Perfiles CONSERVATIVE/BALANCED/AGGRESSIVE, valoraciones privadas fijas por ronda, registro de decisiones y asignaciones obligatorias diferenciadas. Banderas locales MIT y piloto de una foto verificada con créditos. Preparación de 200 nuevas identidades argentinas: 0/200 creadas; cuatro lotes ARG-B01..04, namespace independiente. Ver [ADR-0009](decisions/ADR-0009.md), ARGENTINA_COLLECTION.md y qa/CODEX-005C.md.

## Pedido de playtest — 19/10/2026

| Tarea | Estado |
| --- | --- |
| Global actual 300 y categorías entre 150–300 | Implementada; cantidades en qa/COLLECTION-SIZES.json |
| Leyendas aún activas, avatar, escudos, roles y fuentes | Implementada; períodos biográficos con evidencia disponible, resto pendiente explícito |
| Suplentes manuales y nueve formaciones | Implementada en CPU, hot-seat y armado online |
| Ida/vuelta, tercero, explicación y guías | Implementada; rematch local conserva categorías; online vuelve a salas |
| Elegir categorías diferentes | Sorteos independientes en local y online; sin subasta compartida |
| Poder global y S+ medibles | action-v3 y rarity-v2; qa/ACTION-V3-calibration.json y RARITY-*.json |
| Investigación de imágenes y fotos de técnicos | Cinco fotos con licencias; resto con iniciales; research/PLAYER-MEDIA-2026-10-19.md |
| Validación y publicación | Ver qa/PLAYTEST-EXPANSION.md; solo afirmar acciones realmente ejecutadas |

## Plan UX/UI (CODEX-UX-003 a 008) — 19/10/2026

| Tarea | Estado |
| --- | --- |
| DL-F04-UI-014 Emblemas de categoría (planeta, banderas) | Implementada: modeVisuals/ModeEmblem; sin textos nuevos |
| DL-F04-UI-015 Colores por tier y posición, cartas y técnicos | Implementada: tokens CSS, barras de atributos, tier S+ visual desde 98 |
| DL-F04-UI-016 Dados 3D de sorteo + sonido diceRoll | Implementada: presentacional, sin cambiar el motor; es-AR/en/pt-BR |
| DL-F04-UI-017 Fichas de puja, turno activo, semáforo de riesgo | Implementada; fichas +N relativas a la oferta actual |
| DL-F04-UI-018 Cara a cara y pizarras tácticas | Implementada (botón «Revelar» de dados omitido: los dados se tiran solos al revelar) |
| DL-F04-UI-019 Momentum, feed con iconos y barras comparativas | Implementada; el momentum se deriva de eventos visibles (ataque 1, remate 2, gol 3) |

Validación: typecheck, lint, 831 pruebas y build ejecutados. QA visual en navegador/móvil (390×844) NO ejecutada.

## Ajustes tras revisión visual — 19/10/2026

| Tarea | Estado |
| --- | --- |
| Fichas de puja sin estética de casino | Hecho: botones sobrios del mismo estilo que el resto |
| Categorías: bandera/mapa/globo de fondo, Actuales (⚽) y Leyendas (★) por categoría | Hecho; mapas de Sudamérica y Europa son siluetas simplificadas, mejorables |
| Regla de «máximo seguro 0M» demasiado restrictiva | Pendiente de decisión del usuario (invariante de viabilidad del motor; ver conversación) |
| Pie hábil en cartas | Pendiente: no existe el dato en el catálogo; requiere fuente verificable |
| Avatares con rasgos (sin ojos/boca, pelo, tono de piel) | Futuro (pedido del usuario); requiere dato verificable por jugador y criterio respetuoso |
| Formación editable según estrategia elegida | Pendiente de decisión: hoy se edita antes de elegir estrategia y se bloquea al empezar |

## Técnicos, muñecos y camisetas — 19/10/2026

| Tarea | Estado |
| --- | --- |
| Técnicos actuales por edición (≥10, un solo club de referencia y año 2026) | Hecho: Liga española 12, inglesa 13, brasileña 11, argentina 16; 18 técnicos añadidos sin verificar (docs/research/COACHES-ADDED-2026-10-19.md) |
| Oferta de 3 técnicos que alcanzan con el dinero restante | Hecho: coachOffers(…, left) + coachOffersFor; precio pagado guardado en coachPrice |
| Muñecos sin ojos ni sonrisa; piel y largo de pelo por jugador | Hecho el dibujo y la carga opcional (src/data/player-appearance.json); sin datos todos usan el valor neutro |
| Pie hábil, piel y pelo por jugador | Pendiente de datos: completar docs/research/PLAYER-FOOT-LIST.csv y ejecutar scripts/import-player-traits.mjs |
| Patrones de camiseta y escudo (rayas, aros, mitades, banda, franja) | Hecho para ~55 clubes y selecciones; resto usa el corte en dos colores |

## Sorteo en vivo, nombres comunes y ajustes — 19/10/2026

| Tarea | Estado |
| --- | --- |
| Categorías distintas: dos sorteos en vivo e independientes en la misma pantalla (jugador/CPU o dos personas) | Hecho (local): src/features/recruiter-duel/dualDraft.ts + DualDraftScreen; fichar a precio base o descartar (3 por equipo); sin descartes la carta es obligatoria; la CPU decide sola. Salas online siguen con el armado inmediato |
| Nombres comunes de jugadores (fullName intacto) | Hecho: scripts/standardize-player-names.mjs, 429 nombres; revisar excepciones |
| Técnicos: una sola referencia y año, sin enlaces de fuente | Hecho |
| Presupuesto 120M actuales / 150M leyendas | Reemplazado en UX-004 por 150M actuales / 200M leyendas, confirmación explícita del usuario; partidas históricas conservadas |
| Poder global grande en HUD y paneles de equipo | UX-004: se elimina el duplicado del HUD; poder base/efectivo y sectores en panel posterior |
| Suplentes por defecto | El mercado ya se abre tras el técnico si queda dinero; con 120M queda más saldo. No se añadieron suplentes obligatorios |
| Análisis del resultado en tarjeta comparativa | Hecho; el detalle largo queda en «Ver detalle» |

## UX-004 — 20/10/2026

- Implementado: HUD compacto, cupos/gasto y descartes desplegables, reserva junto a oferta, canchas conservadas y poder base/efectivo separado con arquero informativo.
- Implementado: confirmación con estado vigente y protección de doble clic; foco entre rondas y transiciones breves respetando movimiento reducido.
- Presupuestos nuevos 150M/200M confirmados por el usuario; sin cambios de fórmulas, contratos ni partidas guardadas.
- QA automatizada y límites: [informe UX-004](qa/UX-004.md). Pendiente revisión visual real a 360/390/412/768/1280 px: acceso a pestaña rechazado por política del navegador.

## SIM-005R-01 — Recuperación audiovisual del partido interactivo

- Estado: implementado y verificado localmente (963 pruebas); sin push/merge/deploy. Evidencia: docs/qa/SIM-005R-01.md.
- Pendiente: escucha real del audio, playtest en dispositivo y eventos tipados para la pizarra.

## SIM-005R-02 — Primera jugada ofensiva interactiva

- Estado: implementado y verificado localmente (987 pruebas). Contrato `attack-tree-v1` opt-in solo contra CPU; evidencia en docs/qa/SIM-005R-02.md. Pendiente: playtest humano, audio real y más nodos.

## SIM-005R-06 — Córners y variedad audiovisual

- Implementado localmente: corners-v1 contra CPU, primer/segundo/corto, hombre/zona, 24 oportunidades, eventos/checkpoint estrictos y tres idiomas; sin nuevas consultas estratégicas.
- Ejecutado: 5.040 partidos de calibración, 240 sesiones históricas idénticas y 12 checkpoints anteriores restaurados. [Informe](qa/SIM-005R-06.md). Corto desfavorable en dos perfiles; zona depende del perfil. Balance competitivo no acreditado.
- QA visual parcial: DOM a 1280 antes de corrección del foco; luego navegador deshabilitado por Work settings. Pendientes secuencias reales a 390/412/768/1280 y escucha. Reproductor de ocho casos documentado.
- Cierre: commit local, sin push/merge/deploy. No iniciar otras familias.

## SIM-005R-07 — 21/10/2026

Implementados contacto/falta/tiro libre directo e indirecto, defensa, Canvas, tres idiomas y persistencia. 1.118 pruebas aprobadas, 42 nuevas; 5.040 calibraciones y 360 comparaciones históricas. Capturas reales 390/412/768/1280 y por fases; escucha/fluidez humana completa pendientes. Publicación expresamente autorizada; estado comprobado en [registro](logs/SIM-005R-07.md).

R-07 publicado: main 8e88a137d1424a010efe564c5193f13d0e62b6d0, deployment 78dc5851-81ba-4110-9837-beec992ed703, Worker al 100%, seis hashes públicos y entrada online verificados. Smoke humano/audio pendientes por Work settings. [Registro](logs/SIM-005R-07.md).

## DATA-REG-003B — 21/10/2026

Europa Actualidad completa (150 reconciladas, 0 provisionales; 31 ediciones nuevas) y Sudamérica + México pasa de 525 a un Top 150 editorial (101 reconciladas, 14 ediciones nuevas del Top 50, 49 provisionales, 49 pendientes documentados). Catálogos anteriores congelados. 1.267 pruebas aprobadas. [Informe](qa/DATA-REG-003B.md).

## DATA-REG-003C — 22/10/2026

Sudamérica + México Leyendas (110 reconciladas, 40 provisionales) y Europa Leyendas (114 reconciladas, 4 ediciones nuevas, 36 provisionales) pasan a Top 150 editorial; catálogos anteriores congelados; clubes de Ferran Torres, Leão, Gordon y Dumfries confirmados sin correcciones. 1.273 pruebas aprobadas. [Informe](qa/DATA-REG-003C.md).

## ROSTER-005 — 22/10/2026

Presupuestos nuevos 200/250 M, hasta cinco suplentes opcionales (`bench-5-v1`, con arquero, CPU limitada al saldo) y billetera permanente con saldo y máximo ofertable. Online conserva presupuestos y tres suplentes hasta una migración coordinada (pendiente). 1.284 pruebas aprobadas. [Informe](qa/ROSTER-005.md).

## COACH-006B + DISCARD-005 — 22/10/2026

coach-market-v3 (nivel S+, niveles editoriales, seis cartas competitivas y asequibles por especialidad, pools ampliados, CPU por perfil táctico) y cinco descartes compartidos (`discards-5-v1`) para partidas locales nuevas. Online y partidas anteriores conservan sus reglas. [Informe](qa/COACH-006B-DISCARD-005.md).

## UX-AUCTION-007 + RANK-008 + SIM-MINI-001 — 22/10/2026

Mesa de subastas unificada, Global Top 150 por calidad (Actual y Leyendas) con ranking #/150 y gambeta interactiva integrada al partido en vivo contra la CPU. 1.324 pruebas aprobadas. [Informe](qa/UX-AUCTION-007-RANK-008-SIM-MINI-001.md).

## SIM-MINI-002 + SIM-MINI-003 + RANK-REVEAL-009 — 22/10/2026

Ranking #/150 oculto durante la subasta y revelado («¡Fichaje confirmado! · TOP n · #p/150») al confirmar el fichaje y luego en la plantilla; disparo de precisión para tiros libres directos (`precision-shot-v1`) y tanda de penales interactiva de la serie local contra CPU (`penalty-shootout-v1`); defensa interactiva breve, una por partido (`defense-mini-v1`). Solo local contra CPU; online y partidas anteriores conservan su resolución. [Informe](qa/SIM-MINI-002-003-RANK-REVEAL.md).

## GAMEPLAY-POLISH-010 — 22/10/2026

Presupuestos 160/220 M (viabilidad verificada), técnicos argentinos por trayectoria documentada (coach-market-v4), escaparate fijo de diez suplentes en serpiente (bench-showcase-v1), moneda visible, microinteracciones, nombres y OVR en cancha y resumen final comparativo. Online y partidas históricas intactos; la selección sobre el tablero (un momento) no se probó en navegador. [Informe](qa/GAMEPLAY-POLISH-010.md).

## UX-ENTRY-011 + SIM-FIELD-001 — 22/10/2026

Bloque único de edición seleccionada junto a Iniciar duelo, pase directo sobre la cancha en DIRECTION con animación y coordenadas responsive, y moneda perceptible con movimiento reducido. Recorrido real en navegador documentado (con límites). [Informe](qa/UX-ENTRY-011-SIM-FIELD-001.md).

## SIM-FIELD-002 — 23/10/2026

Ataque (arco = SHOOT, compañero = CROSS) y defensa (carriles, presión y barra de precisión) directamente sobre TacticalBoard, con tarjetas como alternativa accesible. Mismos comandos y motor. [Informe y límites](qa/SIM-FIELD-002.md).

## Publicación sprints 9–10 — 25/10/2026

Integrados con el sprint 8 en `main` (merge ad155c9); 1.458 pruebas, build y verificación de chunks aprobados. Worker reclutador-app versión 7d7b523a al 100 %, etiqueta ad155c9; HTTP/HTML/assets verificados. [Registro](logs/SPRINT-9-10-PUBLICACION.md). Pendiente: prueba manual de las interacciones nuevas.

## Sprint 1 CPU — 25/10/2026

HARD más competitiva (+0,78 OVR medio del once frente a antes, +1,1 a +1,5 sobre NORMAL según humano simulado); EASY/NORMAL sin cambios. Pendiente: EASY < NORMAL no se cumple contra cazador de estrellas y comprador de valor. [Registro](logs/SPRINT-1-CPU.md).

## Sprint 2 online — 25/10/2026

Moneda tirada por el servidor (`online_flip_coin`, migración 202610250001 pendiente de aplicar en Supabase) y verificación del estado en el navegador del rival (`verifyDuelState`) con aviso en es-AR/en/pt-BR. Límites: cartas futuras visibles y sin servidor autoritativo. [Registro](logs/SPRINT-2-ONLINE.md).

## Sprint 3 online — 25/10/2026

Tiempo por turno (120 s puja / 5 min estrategia) con cuenta regresiva y «Reclamar victoria» si el rival no responde; el aviso de conexión se limpia al reconectar. Las migraciones 202610250001 y 202610250002 deben aplicarse juntas, en ese orden, al publicar la web nueva. [Registro](logs/SPRINT-3-ONLINE.md).

## Sprint 4 CPU y equilibrio — 25/10/2026

EASY ahora queda 1,0-1,7 de OVR medio por debajo de NORMAL (NORMAL/HARD sin cambios). Medición del simulador en series (1.080 duelos): sin sesgo de lado; +0,5 de OVR ya da ~78 % de ganar la serie y +2 da ~95 %; la partida rápida casi no premia la calidad. Recomendación sin aplicar. [Registro](logs/SPRINT-4-BALANCE.md).

## Sprint 5 UX — 25/10/2026

Texto funcional a .8rem, medidor de riesgo con etiqueta y patrón (no solo color), aviso de presupuesto sin filtrar la suma de cartas, tests de calibración sin escribir salvo `WRITE_QA=1`, README corto (historial en docs/CHANGELOG.md). Pendiente: revisión visual en celular. [Registro](logs/SPRINT-5-UX.md).

## Sprint 6 verificación online — 25/10/2026

Prueba de punta a punta con las 5 migraciones (honesta, trampas, inactividad) que destapó un error de `verifyDuelState` con el orden de claves de jsonb (corregido); guía de prueba manual, lista de publicación y reversa SQL probada. Nada mezclado, aplicado ni desplegado. [Registro](logs/SPRINT-6-VERIFICACION.md), [checklist](RELEASE-CHECKLIST.md), [prueba manual](qa/MANUAL-PLAYTEST.md).
