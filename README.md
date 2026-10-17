# Draft Legends

Videojuego web de draft de fútbol. CODEX-001 entrega una pantalla inicial ilustrativa y arquitectura multilingüe. Jugar está deshabilitado; la selección de jugadores, simulación y conexión online siguen pendientes.

CODEX-002 agrega el contrato de futbolista y economía. CODEX-003A amplía explícitamente catalog_v1 a **500 futbolistas** (300 contemporáneos y 200 leyendas). CODEX-003B incorpora B02: **B01 + B02 suman 100 contemporáneos**, con presupuesto y fórmula intactos. B03–B10 y la aprobación global de 500 siguen pendientes. Referencias: [contrato vigente](docs/CATALOG_DATA.md), [ADR-0004](docs/decisions/ADR-0004.md), [avance](docs/CATALOG_PROGRESS.md) y [QA CODEX-003B](docs/qa/CODEX-003B.md). Las ADR e informes anteriores se conservan como antecedentes históricos.

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

El primer comando verifica lo disponible y guarda docs/qa/CODEX-003B-catalog-audit.json, sin sobrescribir la auditoría histórica de CODEX-003A. Su salida 0 solo acredita consistencia parcial. El segundo exige completitud y **actualmente devuelve 1**, con globalStatus=pending y 400 IDs faltantes. No es un fallo inesperado ni una aprobación global. La economía global y la futura selección CPU 95–100M se difieren hasta completar los diez lotes.

El último comando sirve dist/ para revisar el build, normalmente en http://127.0.0.1:4173.

## Organización

- src/app: arranque y proveedores.
- src/components: interfaz compartida (selector de idioma).
- src/features/home: pantalla inicial y cancha ilustrativa.
- src/features/player-catalog: funciones puras y validadores; fixtures exclusivamente sintéticos para pruebas.
- src/data: configuración inicial y coordenadas visuales.
- src/data/catalog_v1: manifest de diez lotes, B01/B02 implementados y registro explícito de alias; carga validada y determinista.
- src/types: códigos de posiciones estables.
- src/i18n/locales: diccionarios independientes y configuración centralizada.
- src/styles: Tailwind y estilos propios sin recursos remotos.
- src/test: preparación de pruebas DOM.
- docs: roadmap, tablero, plan de pruebas, decisiones e informes.

Zustand queda instalado para fases futuras; no se crea un store sin estado real. src/store y src/lib se incorporarán al aparecer responsabilidades concretas. Las cantidades del presupuesto se expresan en millones; el encargo no define moneda.

Consultar [ROADMAP](docs/ROADMAP.md), [tablero](docs/TASK_BOARD.md), [pruebas](docs/TEST_PLAN.md) y [decisión de internacionalización](docs/decisions/ADR-0002.md). Resultados reales de CODEX-001 en docs/qa/CODEX-001.md.
