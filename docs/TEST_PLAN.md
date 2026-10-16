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
