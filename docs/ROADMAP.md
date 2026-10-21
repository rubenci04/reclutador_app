# Roadmap

## SIM-005R-05 — 21/10/2026

Extensión opt-in `halftime-ovr-v1` para nuevos encuentros locales dirigidos: estrategia inicial, una consulta en el entretiempo, KEEP trazable en ventanas restantes y suplentes opcionales. Orden HALFTIME combina una estrategia y una sustitución sin ampliar el banco; hot-seat conserva solicitudes de ambos lados en una misma pausa. Duelo OVR logístico central, paridad 50%, pendiente 0,08 y límites 5–95%, separado de pase/definición. Calibración de 700.000 duelos y 3.000 partidos; se registra la reducción de centros/cabezazos sin compensación oculta. [QA y compatibilidad](qa/SIM-005R-05.md). Push y despliegue autorizados expresamente en este encargo; publicación registrada al completarse. Sin otras familias.

## SIM-005R-04B — 20/10/2026

Pulido local de continuidad aérea, pausa/velocidades y sincronización/desbloqueo de audio, sin modificar contratos, RNG ni probabilidades. Diagnóstico de seis perfiles reales: existen centros competitivos sin justificar un aumento global. 1.021 pruebas aprobadas. Work settings bloqueó el navegador: movimiento y escucha real pendientes; preparada utilidad local con semillas para cinco desenlaces. [QA y procedimiento](qa/SIM-005R-04B.md). Sin publicación ni fases posteriores.

## SIM-005R-04 — 20/10/2026

Extensión opt-in directed-header-v1 sobre Momentos Destacados: centro y disputa previos, tres direcciones de cabezazo sin resultado precalculado, Canvas aéreo y RNG propio. Conserva 24 ocasiones, frecuencia y 600 sesiones completas de la base anterior. Capturas reales de elección 390/412/768/1280; secuencia de movimiento/desenlaces bloqueada posteriormente por Work settings y audio sin escucha real. [QA y límites](qa/SIM-005R-04.md). Sin publicación ni familias posteriores.

## SIM-005R-03 — 20/10/2026

Momentos Destacados V1 implementados localmente: director determinista, ataque y defensa sólo contra CPU, Canvas con movimiento individual y decisiones breves en tres idiomas. Media 2,44 momentos en 240 semillas por política; compatibilidad histórica conservada. QA real a 390/412/768/1280; escucha y playtest humano pendientes. [Fórmulas, evidencia y límites](qa/SIM-005R-03.md). Sin publicación ni familias posteriores.

## SIM-005 — 20/10/2026

Integración incremental local CPU/hot-seat sobre SIM-004B: modo dirigir destacado y alternativa rápida, decisiones de estrategia/cambios en cuatro ventanas, política CPU determinista, privacidad por entrega de dispositivo y series con auditoría versionada. No se cambian reglas históricas ni se habilita online interactivo. Pausa local sin recuperación tras recarga; balance con humanos y QA visual real pendientes. [QA y calibración](qa/SIM-005.md).

## Acción y emoción — 19/10/2026

action-v2 sustituye v1 en nuevas partidas: 24 oportunidades con relato individual y estadísticas progresivas. Diagnóstico de 14 ediciones reales detecta y reduce esterilidad ofensiva; calibración de márgenes 0/2/3/4/5. Resultados antiguos y sus series mantienen versión. ADR-0016 y qa/ACTION-V2.md detallan fórmulas, seguimiento del pedido y playtest pendiente.

## Categorías jerárquicas — 19/10/2026

Selector reorganizado en Global, Argentina, Inglaterra, España, Brasil, Latinoamérica y Europa, con actuales 2026/leyendas dentro de cada categoría y navegación de vuelta. Cuatro colecciones regionales habilitadas por nacionalidad, independientemente de dónde jueguen; Latinoamérica incluye México/Centroamérica/Caribe latino. No se crean valoraciones ni se cambian contratos históricos. ADR-0015 y qa/CATEGORY-TREE.md.

## Colecciones y series — 19/10/2026

Pedido actual implementado: 1.200 versiones aportadas, ocho colecciones de liga, Global Legends combinado, tres técnicos por liga/época y simulación action-v1. Series con plantel fijo: tres partidos, dos más en igualdad y penales si continúa. Las colecciones históricas importadas usan 150M por equipo para conservar OVR/precios. Ayudas y animaciones en tres idiomas. No implica completitud de catalog_v1 ni aprobación factual de los TXT. ADR-0014 y qa/COLLECTIONS-SERIES.md documentan decisiones, pruebas y limitación de QA visual.

Plan inicial creado en CODEX-001: no había documentos anteriores. Las fases posteriores son propuestas y requieren encargos independientes.

| Fase | Objetivo | Estado |
|---|---|---|
| F01 | Base React, calidad, interfaz inicial e internacionalización | Implementada; resultados en qa/CODEX-001.md |
| F02 | Contrato y catálogo de 500 futbolistas: 300 contemporáneos y 200 leyendas | B01 + B02 + B03 implementados (150/500); CODEX-003 sigue en curso |
| F03 | Draft local con presupuesto y validación de once | Implementada por PLAYTEST_150 / CODEX-004A |
| F04 | Simulación táctica y equipo CPU | Primer partido local implementado por CODEX-004B |
| F04.1 | Identidad El Reclutador, diagnóstico de balance y base de modalidades | Implementada como fundación técnica por CODEX-004C; no incorpora datos históricos ni torneos |
| F04.2 | Duelo de Reclutadores local: subastas hot-seat y partido entre dos equipos | Implementada por CODEX-005B: carta individual, cara o cruz interactivo y partido compartido; CPU estratégica incorporada en CODEX-005C; online pendiente |
| F05 | Versus online y salas entre amigos | CODEX-006A/B implementadas y probadas localmente; integración Supabase y E2E real pendientes; C no iniciada; ver qa/CODEX-006A.md y qa/CODEX-006B.md |
| F06 | Resultados compartibles | Pendiente |

## Hitos de producto tras CODEX-004A

| Hito | Alcance | Estado |
|---|---|---|
| PLAYTEST_150 | Draft local jugable con los 150 contemporáneos reales existentes, 4-3-3, presupuesto, persistencia e idiomas | Implementado en CODEX-004A |
| EARLY_ACCESS_250 | Los 150 actuales más los primeros 100 nuevos de la colección argentina | Pendiente; prioridad comercial ARG-B01 y ARG-B02, ver ADR-0009 |
| FULL_CATALOG_500 | Diez lotes, distribución global 300/200 y auditoría final | Pendiente |

La numeración, los rangos de IDs y la validación global de 500 se mantienen. PLAYTEST_150 no presenta el catálogo parcial como aprobación final. La futura distinción editorial y visual S+ propone diez candidatos dentro del tier S, encabezados por Messi, Maradona y Pelé; no modifica rating, precio ni cartas.

CODEX-004B completa el primer ciclo local: once confirmado, rival CPU 4-3-3 reproducible por semilla, simulación calculada antes de reproducirse y resultado final. No agrega multijugador, nuevas formaciones, jugadores ni exportación PNG.

CODEX-002 completó el contrato, economía y validadores de DL-F02-DATA-001. El título histórico del tablero incluía el catálogo completo; se conserva ese ID para este contrato sin declarar creados los 100 registros.

CODEX-003A amplía explícitamente el objetivo de 100 a 500 registros, sin reiniciar el proyecto ni renumerar tareas. Criterio de cierre de DL-F02-DATA-002/CODEX-003: diez lotes reales de 50 auditados, IDs plr_001..plr_500 únicos, 300/200 categorías, matriz posicional y tiers completos, precios correctos y prueba global de viabilidad. La futura selección CPU 95–100M queda pendiente de un encargo para esa fase.

CODEX-003B incorpora B02 sin modificar B01 y agrega revisión acumulativa de alias e identidades. Progreso: B01/B02 completos técnicamente, 100 contemporáneos; B03–B10 pendientes. Aprobación global y auditoría editorial final PENDIENTES. Próxima tarea recomendada: B03, 50 contemporáneos con IDs plr_101..plr_150, mismos cupos parciales y revisión de colisiones contra los 100 ya cargados. No iniciado automáticamente.

CODEX-003C completa B03 y audita 150 contemporáneos, preservando B01/B02. Tres lotes completos; B04–B10 y auditoría global pendientes. Próxima tarea recomendada: B04, plr_151–plr_200, con contraste contra los 150 existentes. No iniciado automáticamente.

CODEX-004C presenta comercialmente el producto como **El Reclutador** sin alterar claves de persistencia, IDs de catálogo ni rutas históricas. Entrega el motor puro de modalidades, contratos de procedencia verificable y un selector cuyo único modo ejecutable es Global. Las modalidades futuras quedan pendientes hasta incorporar datos revisados y una integración de partida explícita. El simulador conserva sus probabilidades; el diagnóstico de 2.400 encuentros queda registrado en qa/CODEX-004C.md antes de cualquier decisión subjetiva de balance.

CODEX-005A estableció Duelo de Reclutadores como modo local principal. CODEX-005B lo refina como Reclutador: 22 rondas de un único futbolista (2 ARQ, 8 DEF, 6 MED y 6 DEL), 100M por persona, reserva de viabilidad y cara o cruz persistente. Los dos onces resultantes se entregan al simulador existente sin recalcular una revancha. Draft Libre queda como alternativa. La autoridad de las reglas vive en un motor puro preparado para servidor, pero no se incluye red, autenticación, salas ni CPU pujador.


## CODEX-005C

CPU estratégica local implementada como opción junto a hot-seat. Perfiles CONSERVATIVE/BALANCED/AGGRESSIVE, valoraciones privadas fijas por ronda, registro de decisiones y asignaciones obligatorias diferenciadas. Banderas locales MIT y piloto de una foto verificada con créditos. Preparación de 200 nuevas identidades argentinas: 0/200 creadas; cuatro lotes ARG-B01..04, namespace independiente. Ver [ADR-0009](decisions/ADR-0009.md), ARGENTINA_COLLECTION.md y qa/CODEX-005C.md.

## CODEX-005F — Variedad y equipos en vivo

Implementado: nueva semilla por inicio/revancha, contexto exportable para reproducir el sorteo, historial probabilístico de cinco partidas y TeamProgressBoard con ambos onces. Comparación de 1.000 sorteos por política en [QA](qa/CODEX-005F.md). Desde este hito, revancha y nueva partida vuelven a sortear; reproducir partido conserva el relato/resultado. Esto actualiza la descripción histórica de revancha en CODEX-005B. QA visual manual pendiente por navegador deshabilitado.

## CODEX-005G — Estrategias futbolísticas (propuesta, pendiente)

CODEX-005G-A entrega únicamente preparación visual y experiencia de subastas: canchas 4-3-3, moneda animada y diagnóstico/confirmación de acciones. La integración posterior de estrategias y enfrentamientos deberá usar roles y atributos verificados, aportar layouts de formación validados y medir sus riesgos antes de implementar bonificaciones. Las otras formaciones y el motor táctico continúan pendientes. QA de esta preparación en [CODEX-005G-A](qa/CODEX-005G-A.md), con revisión visual manual pendiente.

Sin implementación ni bonificaciones asignadas. Las futuras estrategias deberán definir ventajas, riesgos y enfrentamientos tácticos mediante atributos disponibles y roles posicionales verificables, con pruebas de balance antes de alterar el simulador:

| Estrategia | Ventaja propuesta | Riesgo y enfrentamiento por evaluar |
|---|---|---|
| Control del mediocampo | Retención y progresión mediante mediocampistas con atributos mentales/técnicos documentados | Pérdidas ante presión alta; menor profundidad frente a bloque bajo |
| Juego por bandas | Amplitud mediante extremos y laterales verificados, capacidad de ataque y físico | Espacios a la espalda y necesidad de cobertura; posible respuesta al bloque bajo |
| Contraataque | Transición rápida con roles y atributos adecuados en defensa/ataque | Menos posesión y ocasiones ante bloque bajo; puede aprovechar espacios de presión alta |
| Presión alta | Recuperaciones adelantadas con intensidad física y coordinación | Desgaste y defensa expuesta; riesgo frente a contraataques |
| Bloque bajo | Protección del área con defensores y arquero sólidos | Cede territorio y puede sufrir amplitud; menor salida si no tiene transición |

Estas relaciones son hipótesis de diseño, no reglas vigentes. No inferir velocidad, habilidad por bandas o rol de lateral únicamente del código genérico DEF/DEL: exigir metadatos verificables o limitar la estrategia a los atributos realmente disponibles. Los ratings actuales ATT/DEF/PHY/MEN no justifican inventar atributos nuevos. Propuesta pendiente de autorización; no iniciar automáticamente ni ampliar catálogo.

## CODEX-005G-C2 y C3A — Estrategias en juego

C2 incorporó la capa táctica pura (`tactics-v1`) sobre `local-match-v2` con seis estrategias, sin tabla fija de ganadores. C3A conecta ese motor con una elección secreta por turnos (traspaso del dispositivo y revelación simultánea; la CPU fija la suya antes de conocer la humana) y añade un HUD con presupuesto, cupos, descartes y oferta máxima segura derivados del estado y del motor. Los temporizadores (15/25/75/30 s) quedan documentados en ADR-0010 y no están activos. Pendiente: narración táctica del partido, evaluación en playtest del tamaño del efecto y QA visual móvil. Sin sonidos, nuevas formaciones, catálogo ampliado ni Supabase todavía.

## Categorías por ámbito — 18/10/2026

Definidas las parejas actuales/leyendas para Global, Argentina, Brasil, España, Inglaterra, Sudamérica y Europa. Argentina · leyendas habilitada con 188 registros existentes; los dos modos originales se conservan. Las restantes nuevas colecciones siguen pendientes de datos y/o validación de partida. Versus entre categorías distintas no implementado. Detalle y criterios: ADR-0012 y qa/CATEGORIES-LEGENDS.md.

## Simulación, técnicos y dificultad CPU — 18/10/2026

Implementación del pedido del usuario: capa squad-quality-v1 para duelos, poder efectivo por bloque, afinidad técnico/táctica, reserva elegible 1–8M (8M inicial) y dificultad CPU independiente de agresividad. Se conservan los 100 técnicos existentes; auditoría completa de sus biografías y playtest de balance pendientes. ADR-0013 y QA SIMULATION-COACHES.

## Playtest ampliado — 19/10/2026

Implementadas las categorías de 150–300, el ajuste medible action-v3, rareza S+ sin eliminación económica sistemática, suplentes manuales, nueve formaciones con afinidad, guías de etapas, serie de dos más tercero, sorteos de categorías distintas y presentación con personajes/fotos. ADR-0017 reemplaza las reglas nuevas de series de ADR-0014; se conserva el comportamiento antiguo versionado. La cobertura completa de biografías/fotos y la revisión visual real siguen distinguidas de la implementación técnica.
