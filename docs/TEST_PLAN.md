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

## CODEX-003A

- Ejecutar npm run typecheck, npm run lint, npm run test, npm run build y npm run catalog:audit.
- Ejecutar npm run catalog:audit -- --complete: debe rechazar completitud con salida 1 mientras solo exista B01; registrar globalStatus pending, no PASS global.
- Validar individualmente los 50 registros reales y sus precios por la función de producción; verificar 6/16/15/13 posiciones y 6/10/15/12/7 tiers, IDs plr_001..plr_050 y categoría contemporary.
- Mantener los 15 tests originales de CODEX-001. Adaptar los de CODEX-002 al cambio explícito de tamaño/campos: fixtures completos de 500, precios y rangos idénticos, casos económicos pequeños mediante checkEconomicViability. La antigua prueba de 100/101M se conserva como subconjunto sintético y debe dejar el estado global pendiente.
- Probar años 2016/2026, categorías, década coherente, extensión de IDs, matriz de categoría/posición y traducciones de ambas categorías.
- Probar manifest íntegro, estados contra datos suministrados, intervalos por lote, archivos realmente creados, consolidación ordenada sin mutación, duplicados internos y entre lotes normalizados.
- Probar ruta de aprobación de diez lotes con fixtures sintéticos, claramente separada de la auditoría real. Nunca usar ese resultado para marcar completo catalog_v1.
- Auditoría real global de 500, prueba económica global y selección CPU 95–100M: PENDIENTES hasta disponer de los diez lotes. UI inicial sin cambios visuales; no se exige nueva revisión de navegador en esta entrega.
