# QA — CODEX-004A · PLAYTEST_150

Fecha: 17/10/2026. Base: `97eae6f` (B01+B02+B03, 150 futbolistas reales). Alcance: primer draft local jugable; no incluye simulación CPU, red ni nuevos lotes de catálogo.

## Resultado

| Comprobación | Resultado |
|---|---|
| `npm test` | OK — 417 pruebas en 6 archivos |
| `npm run typecheck` | OK |
| `npm run lint` | OK |
| `npm run build` | OK — build de Vite completado |
| `git diff --check` | OK |

Las pruebas nuevas cubren los once slots 4-3-3, catálogo real de 150, posición, unicidad, presupuesto, viabilidad mínima, reemplazo, eliminación, confirmación, reinicio y restauración versionada compatible/incompatible. Las pruebas de interfaz verifican las tres traducciones y el cambio de idioma sin reiniciar el draft.

## Revisión visual

Se intentó iniciar Vite local y abrir la aplicación en el navegador integrado en escritorio y en los viewport requeridos de 390 px y 360 px. El navegador integrado devolvió `net::ERR_CONNECTION_TIMED_OUT` para `http://127.0.0.1:5173/` y para el puerto alternativo creado por Vite. Por esa restricción entre el navegador integrado y el servidor local, **no fue posible realizar ni acreditar la QA visual de escritorio, 390 px o 360 px** en esta ejecución.

El CSS incluye reglas responsivas específicas para 850 px y 500 px, y los flujos se cubren en DOM por pruebas automatizadas, pero esto no sustituye una revisión manual de renderizado. La próxima ejecución con acceso de navegador al host local debe abrir el selector, fichar/reemplazar/quitar un jugador, cambiar idioma y revisar el resumen confirmado en escritorio, 390 px y 360 px.

## Límites conocidos

`catalog_v1` continúa parcial: 150/500, B04–B10 pendientes y auditoría global aún no aprobada. PLAYTEST_150 no altera los lotes ni relaja los validadores de 500. La simulación contra CPU se comunica como próximo vertical slice y no está implementada.
