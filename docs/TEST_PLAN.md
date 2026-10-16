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
