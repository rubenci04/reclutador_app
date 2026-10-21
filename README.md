# Reclutador

SIM-005R-05: en encuentros locales nuevos de **Dirigir partido**, la estrategia se elige antes de jugar y se consulta una única vez en el **entretiempo**. Los suplentes siguen disponibles mediante solicitud opcional para la próxima pausa. Los duelos individuales usan la extensión opt-in `halftime-ovr-v1`: igualdad de OVR significa 50% en el duelo directo. **Simulación rápida**, online y sesiones históricas conservan sus reglas. [Fórmula, calibración y límites](docs/qa/SIM-005R-05.md).

Antecedente SIM-005: abrió cuatro ventanas internas a los 30/45/60/75 minutos. Se conservan para trazabilidad y sustituciones; la nueva presentación resuelve KEEP automáticamente fuera del entretiempo si no se solicitó un cambio. [Contrato histórico](docs/qa/SIM-005.md).

Actualización de playtest 19/10: action-v3, 150–300 jugadores por edición, Global actual 300, leyendas activas en ambas ediciones, suplentes manuales, nueve formaciones, ida/vuelta con tercero de desempate, categorías distintas y guías por etapa. Ver [ADR-0017](docs/decisions/ADR-0017.md) y [validación y límites](docs/qa/PLAYTEST-EXPANSION.md).

Simulación actualizada: **action-v2** en partidas nuevas, 24 oportunidades mostradas una a una y estadísticas durante el relato. Mantiene series con el mismo plantel y reduce los 0–0 sin forzar goles. La versión del motor aparece en el partido para identificar reportes. Ver [decisión y fórmulas](docs/decisions/ADR-0016.md) y [validación/pedido completo](docs/qa/ACTION-V2.md).

Categorías: Global, Liga Argentina, Liga inglesa, Liga española, Liga brasileña, Latinoamérica y Europa. Cada una abre actuales 2026 y leyendas. Latinoamérica/Europa seleccionan por nacionalidad en cualquier liga, con 100M para actuales y 150M para leyendas. Ver [ADR-0015](docs/decisions/ADR-0015.md).

Actualización 19/10/2026: cuatro bases aportadas (1.200 versiones), ocho colecciones actuales/históricas y Global Legends combinado, sin fotos nuevas. Tres cartas de técnicos por liga/época. Nuevas simulaciones con 18 oportunidades y series del mismo plantel: tres encuentros, dos más si empatan y penales para resolver. Las leyendas importadas usan 150M por equipo. Valoraciones editoriales y perfiles por posición; no equivalen a una auditoría factual. Ver [ADR-0014](docs/decisions/ADR-0014.md) y [QA](docs/qa/COLLECTIONS-SERIES.md). Las descripciones de hitos anteriores se conservan como historial.

Videojuego web de draft de fútbol. El modo principal es **Duelo de Reclutadores**: dos personas comparten una computadora, compiten por cada subasta y completan 22 fichajes exclusivos antes de enfrentar sus equipos. Disponen de tres descartes compartidos por doble pase sin oferta, con reemplazo viable de la misma posición: hasta 25 candidatos. Draft Libre conserva la construcción individual y Contra CPU incorpora tres perfiles de puja estratégica reproducible.

El nombre comercial pasó de Draft Legends a **Reclutador** en CODEX-005B. La clave persistida `draft-legends.draft-v1`, la versión `catalog_v1`, los IDs `plr_*`, rutas y carpetas históricas se mantienen deliberadamente: los borradores locales compatibles no requieren migración y continúan restaurándose con el mismo esquema.

La progresión de producto es PLAYTEST_150, EARLY_ACCESS_250 y FULL_CATALOG_500; CODEX-005C prioriza comercialmente los primeros 100 de una futura colección argentina independiente para EARLY_ACCESS_250. La decisión vigente queda documentada en [ADR-0009](docs/decisions/ADR-0009.md); ADR-0005 se conserva como antecedente.

CODEX-002 agrega el contrato de futbolista y economía. CODEX-003A amplía explícitamente catalog_v1 a **500 futbolistas** (300 contemporáneos y 200 leyendas). CODEX-003C incorpora B03: **B01 + B02 + B03 suman 150 contemporáneos**, con presupuesto y fórmula intactos. B04–B10 y la aprobación global de 500 siguen pendientes. Referencias: [contrato vigente](docs/CATALOG_DATA.md), [ADR-0004](docs/decisions/ADR-0004.md), [avance](docs/CATALOG_PROGRESS.md) y [QA CODEX-003C](docs/qa/CODEX-003C.md). Las ADR e informes anteriores se conservan como antecedentes históricos.

## Ejecución local

Requiere Node.js >=22.12 y npm. Entorno verificado: Node 24.21.0, npm 11.19.0, Git 2.53.0.windows.2.

```powershell
cd 'C:\Users\rea_0\Documents\ChatGPT\Fútbol Draft'
npm ci
npm run dev
```

Abrir la URL Local que imprime Vite (normalmente http://127.0.0.1:5173). Instalación nueva: español argentino. La preferencia de idioma se guarda en localStorage con la clave draft-legends.language. Si el navegador bloquea el almacenamiento, se informa el error sin impedir el cambio durante la visita.

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm run preview
```

Auditoría parcial reproducible del catálogo real:

```powershell
npm run catalog:audit
npm run catalog:audit -- --complete
```

El primer comando verifica lo disponible y guarda docs/qa/CODEX-003C-catalog-audit.json, sin sobrescribir las auditorías históricas de CODEX-003A/B. Su salida 0 solo acredita consistencia parcial. El segundo exige completitud y **actualmente devuelve 1**, con globalStatus=pending y 350 IDs faltantes. No es un fallo inesperado ni una aprobación global. La economía global y la futura selección CPU 95–100M se difieren hasta completar los diez lotes.

El último comando sirve dist/ para revisar el build, normalmente en http://127.0.0.1:4173.

## Organización

- src/app: arranque y proveedores.
- src/components: interfaz compartida (selector de idioma).
- src/features/draft: estado Zustand, dominio, cancha interactiva y selector de jugadores.
- src/features/home: punto de entrada compatible de la pantalla de juego.
- src/features/player-catalog: funciones puras y validadores; fixtures exclusivamente sintéticos para pruebas.
- src/features/themed-modes: contratos de metadatos, reglas puras y diagnóstico de modalidades; no contiene datos históricos inventados.
- src/features/local-match: generador CPU, simulador y diagnóstico estadístico reproducible.
- src/features/recruiter-duel: motor puro de subastas hot-seat, registro reproducible e interfaz del Duelo de Reclutadores.
- src/data: configuración inicial y coordenadas visuales.
- src/data/catalog_v1: manifest de diez lotes, B01/B02/B03 implementados y registro explícito de alias; carga validada y determinista.
- src/types: códigos de posiciones estables.
- src/i18n/locales: diccionarios independientes y configuración centralizada.
- src/styles: Tailwind y estilos propios sin recursos remotos.
- src/test: preparación de pruebas DOM.
- docs: roadmap, tablero, plan de pruebas, decisiones e informes.

Zustand persiste exclusivamente el draft. El partido se calcula en un módulo puro con semilla explícita y conserva su resultado durante la reproducción. Las cantidades del presupuesto se expresan en millones; el encargo no define moneda.

Consultar [ROADMAP](docs/ROADMAP.md), [tablero](docs/TASK_BOARD.md), [pruebas](docs/TEST_PLAN.md), las [reglas de subasta](docs/decisions/ADR-0008.md), la [política de modalidades y fuentes](docs/decisions/ADR-0006.md), la [estrategia de miniaturas](docs/research/PLAYER_THUMBNAIL_SOURCES.md) y la [evaluación de fuentes](docs/research/FOOTBALL_DATA_SOURCES.md). Resultados reales de CODEX-001 en docs/qa/CODEX-001.md.

## Versus Online — CODEX-006

Fundación Supabase y lobby preparados, con pruebas SQL ejecutadas localmente. **Integración real pendiente**: no hay proyecto configurado ni E2E con dos identidades. El menú conserva todos los modos locales y agrega Versus Online; sin configuración muestra un aviso. Con backend configurado permite crear/unirse por invitación, marcar listo y pasar al estado inicial de sala, pero todavía no resuelve moneda, subastas ni partido online.

Copiar `.env.example` a `.env.local` y completar URL y clave pública publishable moderna; habilitar Auth anónima, aplicar en orden las dos migraciones de `supabase/migrations` y configurar canales Realtime privados. Nunca agregar claves secret/service-role. Configuración, comprobaciones y limitaciones detalladas en [QA de lobby](docs/qa/CODEX-006B.md) y [ADR-0011](docs/decisions/ADR-0011.md). Perder los datos del navegador puede perder la identidad anónima. Dos pestañas del mismo perfil no representan dos participantes.


## CODEX-005C

CPU estratégica local implementada como opción junto a hot-seat. Perfiles CONSERVATIVE/BALANCED/AGGRESSIVE, valoraciones privadas fijas por ronda, registro de decisiones y asignaciones obligatorias diferenciadas. Banderas locales MIT y piloto de una foto verificada con créditos. Preparación de 200 nuevas identidades argentinas: 0/200 creadas; cuatro lotes ARG-B01..04, namespace independiente. Ver [ADR-0009](docs/decisions/ADR-0009.md), docs/ARGENTINA_COLLECTION.md y docs/qa/CODEX-005C.md.

## Simulación y técnicos — revisión 18/10/2026

Los duelos incorporan calidad del once por niveles S+/S/A/B/C/D, bonus de plantel, táctica y técnico. El poder efectivo mostrado incluye los aportes aplicados por bloque. Los 100 técnicos existentes (70 actuales, 30 leyendas, 54 argentinos) tienen cartas de referencia, precios 1–8M y afinidad táctica. Las nuevas partidas reservan 8M por defecto, elegibles entre 1 y 8M; la CPU de subastas permite dificultad fácil/normal/difícil además de su perfil de agresividad. Detalle, compatibilidad y límites de datos: docs/decisions/ADR-0013.md y docs/COACHES.md.

## SIM-005R-06 — Córners locales contra CPU

Nuevos partidos dirigidos incorporan córners ofensivos/defensivos opt-in, cabezazo dirigido y variedad de relato/pizarra. Se preservan 24 oportunidades y frecuencia del director; estrategia sólo al inicio y entretiempo. [QA, calibración y reproducción humana](docs/qa/SIM-005R-06.md). Revisión visual completa y escucha pendientes por bloqueo de navegador en Work settings. Entrega local sin publicación.
