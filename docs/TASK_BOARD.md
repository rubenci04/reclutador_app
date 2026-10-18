# Tablero de tareas

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
