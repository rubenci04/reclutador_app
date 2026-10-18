# Categorías y leyendas — QA

Fecha: 18/10/2026. Alcance y matriz: ADR-0012, actualización de categorías.

## Resultados ejecutados

- npm run typecheck: PASS.
- npm run lint: PASS.
- npm test: PASS, 54 archivos y 733 pruebas, sin omitidas. Incluye 60 duelos por cada modo argentino, filtros, tres idiomas, inicio e historial separado.
- npm run build: PASS. Advertencia de chunks mayores de 500 kB; no impide la compilación.
- QA visual de escritorio y móvil: NO EJECUTADA. El preview Vite anunció 127.0.0.1:4174, pero el navegador integrado resolvió esa dirección a otra aplicación (Edu App Contable). Se cerró la pestaña y el preview propios. Las pruebas DOM no validan layout.

## Límites

Solo se habilita una nueva partida: Argentina · leyendas, 188 jugadores de los lotes existentes. Global conserva los mismos 150 registros, Fútbol Argentino los mismos 200 y su clave de historial. Argentina actuales queda pendiente (12 registros sin ARQ). Leyendas globales y continentales no incorporan registros nuevos; las nuevas colecciones europeas/brasileñas siguen sin carreras verificadas. Sudamérica y Europa actuales necesitan validación específica de subasta antes de activarse.

No se ejecutaron ni cambiaron servicios externos, migraciones, deploy, catálogos ni reglas económicas/tácticas. El versus cruzado sigue pendiente.
