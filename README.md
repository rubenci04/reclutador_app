# Reclutador

Videojuego web de draft de fútbol. El modo principal es **Duelo de Reclutadores**: dos personas comparten una computadora, sortean 22 futbolistas reales de a uno, compiten por cada subasta y luego enfrentan sus equipos con el simulador existente. Draft Libre conserva la construcción individual y Contra CPU podrá reutilizar las reglas de oferta en una entrega futura.

El nombre comercial pasó de Draft Legends a **Reclutador** en CODEX-005B. La clave persistida `draft-legends.draft-v1`, la versión `catalog_v1`, los IDs `plr_*`, rutas y carpetas históricas se mantienen deliberadamente: los borradores locales compatibles no requieren migración y continúan restaurándose con el mismo esquema.

La progresión de producto es PLAYTEST_150, EARLY_ACCESS_250 y FULL_CATALOG_500; los 100 históricos del acceso temprano pueden llegar por B07 y B08 sin llenar artificialmente B04–B06. La decisión queda documentada en [ADR-0005](docs/decisions/ADR-0005.md).

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
