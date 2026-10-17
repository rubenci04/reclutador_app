# QA — CODEX-004B · Primer partido local contra CPU

Fecha: 17/10/2026. Base verificada: `65072db`. Rama: `feat/dl-f04-local-match`.

## Resumen técnico

Se agregó `src/features/local-match/` con tres responsabilidades separadas:

- `cpuTeam.ts`: genera un rival 4-3-3 solamente con `DRAFT_CATALOG`. Un recorrido dinámico acotado por los once puestos y 100M determina primero si existe un costo de 95–100M; conserva una alternativa legal inferior solo cuando no existe esa franja. La semilla ordena los candidatos y da diversidad controlada entre partidas.
- `simulator.ts`: motor TypeScript puro sin React, navegador ni `Math.random()`. Recibe ambas alineaciones, `catalog_v1`, `local-match-v1` y semilla. Calcula el resultado completo antes de la UI, con ataque, defensa y mediocampo derivados de ATT/DEF/PHY/MEN por posición. ARQ y DEF pesan 78% de la defensa; no se usa una suma de overall.
- `MatchScreen.tsx`: reproduce los seis bloques 15', 30', 45', 60', 75' y 90' cada 2,5 s. Solo lee el resultado inmutable; repetir conserva el partido y revancha ejecuta una acción nueva con una semilla nueva.

El estado de draft persistido no fue modificado. El rival puede repetir jugadores del usuario, como está previsto para un futuro modo simultáneo. No se agregaron futbolistas, multijugador, nuevas formaciones ni exportación PNG.

## Resultado estadístico reproducible

La prueba diagnóstica ejecutó 1.000 simulaciones con dos equipos legales generados por semilla y semillas de partido `diagnostic-0` a `diagnostic-999`:

| Resultado | Cantidad |
|---|---:|
| Victoria local | 261 |
| Victoria CPU | 308 |
| Empate | 431 |
| Goles totales | 1.080 |
| Goles por partido | 1,08 |
| Resultados con un equipo en 5+ goles | 0 |

Es un diagnóstico de la configuración actual, no una afirmación de equidad ni un porcentaje objetivo. Confirma que hay victorias, empates, derrotas y que no se forzaron marcadores extremos en esta muestra.

## Pruebas ejecutadas

| Comprobación | Resultado |
|---|---|
| `npm test` | OK — 424 pruebas en 8 archivos |
| `npm run typecheck` | OK |
| `npm run lint` | OK |
| `npm run build` | OK — build de Vite completado |
| Prueba específica CPU/motor | OK — 6 pruebas, incluido diagnóstico de 1.000 |

Las pruebas específicas verifican: posiciones, presupuesto, unicidad, reproducibilidad, variación por semilla, fallback sin franja objetivo, rechazo de once inválido, peso defensivo de ARQ/DEF, coherencia de eventos/estadísticas/marcador y los seis bloques.

## QA visual y checklist manual

Vite inició correctamente y publicó una URL local (en esta ejecución, el puerto alternativo `5176` porque 5173–5175 ya estaban ocupados). El navegador integrado no permitió abrirla: la herramienta devolvió **“Local browser use is disabled in Work settings”**. Esto es una restricción de acceso del entorno, no una comprobación del renderizado ni un fallo demostrado de la aplicación. Por ello, la QA visual de escritorio, 390 px y 360 px queda **no ejecutada**.

Para revisión desde el navegador local del usuario:

```powershell
cd 'C:\Users\rea_0\Documents\ChatGPT\Fútbol Draft'
npm run dev
```

Abrir la URL indicada por Vite, completar el once, confirmar y pulsar **Jugar contra CPU**. Revisar en escritorio, 390 px y 360 px:

1. No hay desborde horizontal; cancha, selector y resumen mantienen lectura.
2. El partido llega a 90' en aproximadamente 15 segundos y marcador/eventos coinciden.
3. Reproducir conserva el mismo resultado; revancha cambia de simulación; volver conserva el draft.
4. Cambiar idioma durante el partido traduce la narración sin reiniciarlo.
5. Teclado, foco visible y `prefers-reduced-motion` no pierden controles.

## Incidencias y decisiones

ADR-0005 ahora enumera diez candidatos a Íconos S+ dentro del tier S: Messi, Maradona, Pelé, Cruyff, Zidane, Cristiano Ronaldo, R9, Beckenbauer, Ronaldinho y Di Stéfano. Los tres primeros son las referencias centrales propuestas; la implementación visual permanece fuera de alcance. No cambian ratings, precios ni fórmulas.

Estado de Git al cierre: rama `feat/dl-f04-local-match`, commit local `feat(game): implement local CPU match` y árbol limpio. No se realizó push ni deploy.
