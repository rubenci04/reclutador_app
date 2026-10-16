# Draft Legends

Videojuego web de draft de fútbol. CODEX-001 entrega solamente una pantalla inicial ilustrativa y arquitectura multilingüe. Jugar está deshabilitado; no hay catálogo, simulación ni conexión online.

CODEX-002 agrega el contrato de futbolista, reglas de precios y tiers, validación de registros/catálogos y comprobación de viabilidad del once 4-3-3. Todavía no incluye los 100 futbolistas reales. Referencia: [diccionario del catálogo](docs/CATALOG_DATA.md), [ADR-0003](docs/decisions/ADR-0003.md) e [informe CODEX-002](docs/qa/CODEX-002.md).

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

El último comando sirve dist/ para revisar el build, normalmente en http://127.0.0.1:4173.

## Organización

- src/app: arranque y proveedores.
- src/components: interfaz compartida (selector de idioma).
- src/features/home: pantalla inicial y cancha ilustrativa.
- src/features/player-catalog: funciones puras y validadores; fixtures exclusivamente sintéticos para pruebas.
- src/data: configuración inicial y coordenadas visuales.
- src/types: códigos de posiciones estables.
- src/i18n/locales: diccionarios independientes y configuración centralizada.
- src/styles: Tailwind y estilos propios sin recursos remotos.
- src/test: preparación de pruebas DOM.
- docs: roadmap, tablero, plan de pruebas, decisiones e informes.

Zustand queda instalado para fases futuras; no se crea un store sin estado real. src/store y src/lib se incorporarán al aparecer responsabilidades concretas. Las cantidades del presupuesto se expresan en millones; el encargo no define moneda.

Consultar [ROADMAP](docs/ROADMAP.md), [tablero](docs/TASK_BOARD.md), [pruebas](docs/TEST_PLAN.md) y [decisión de internacionalización](docs/decisions/ADR-0002.md). Resultados reales de CODEX-001 en docs/qa/CODEX-001.md.
