# CODEX-005H · H2 — Partidas personalizadas

18/10/2026. Base `1d22244` (H1), rama `codex/current-club-audit`.

## Qué se hizo
- **`MatchConfig` versionado** (`recruiter-duel/matchConfig.ts`): `{version: 1, budget, names, substitutes}`. `CLASSIC_CONFIG` = 100M, 4-3-3, once titulares, sin suplentes, nombres por defecto. `substitutes` queda siempre en `false` hasta H3. Presupuesto válido: entero de 60 a 300M, de 5 en 5 (atajos 100/125/150/175/200M y campo numérico). `parseMatchConfig` rechaza (sin corregir) versión, rango, tipos y nombres inválidos.
- **Un solo origen del presupuesto**: `budgetOf(game)` (`game.config?.budget`, o 100M para partidas sin configuración). Se enhebró en el motor de subastas (viabilidad, oferta máxima segura, adjudicaciones, completado automático y rápido), HUD, tablero de equipos, CPU, validación de los onces (`summarizeDraft(…, budget)`, `isValidOrganizedLineup(…, budget)`) y simulador (`SimulationInput.budget`, solo si se configuró). Ninguna lógica secundaria conserva el 100 fijo, salvo el Draft Libre y el catálogo, que no cambian.
- **Preflight económico** (`preflightMatchConfig`): antes de sortear verifica condiciones necesarias del catálogo elegible (cada equipo necesita al menos los más baratos de cada línea; ambos juntos, los 2n más baratos ≤ 2×presupuesto). Si falla no se puede iniciar, con un mensaje que indica el mínimo. Pasarlo no promete viabilidad: el sorteo sigue buscando un grupo completable y avisa si no lo encuentra. Los precios nunca se tocan.
- **Pantalla de configuración previa al cara o cruz** (`MatchSetupPanel`): Clásica (predeterminada, sin campos extra) o Personalizada con nombres libres (límite de 24 caracteres contados como caracteres, validación visible de longitud e igualdad, saneamiento de control/bidi/espacios), presupuesto, aviso de viabilidad y resumen de reglas. Contra la CPU el nombre del rival se llama «Nombre del rival (CPU)» y su valor por defecto es «CPU».
- **Propagación**: los nombres llegan a subastas, HUD, canchas, organizador, estrategias, partido, resumen táctico y resultado. La configuración queda en `game.config` y se exporta/importa con el contexto del sorteo (una configuración inválida al reproducir cae al modo clásico).
- i18n es-AR/en/pt-BR (incluidos errores `budget_too_low`/`budget_range`).

## Pruebas
`typecheck`, `lint`, `build` correctos; `npm test`: 589 aprobadas de 589 (576 antes; +13). Cobertura: saneamiento y límites de nombres (acentos, bidi, emoji), contrato y parser, preflight (presets viables, catálogo caro, rango, catálogo chico), clásico idéntico a sin configuración (sin clave `config`), partidas completas con 125/150/200M (el gasto supera 100M sin exceder el presupuesto y el partido se juega), HUD con el presupuesto elegido, validación visible y bloqueo del inicio, nombres propios largos recorriendo el duelo y el contexto exportado, nombre editable de la CPU y textos en español. Sin cambios del motor de partido: no se recalibró.

## Límites
- El historial de variedad de sorteos recalcula partidas anteriores con reglas clásicas; en partidas personalizadas puede diferir levemente (solo afecta la penalización de repetición).
- `MatchTeam.spent` del resultado sigue siendo la suma de precios base (comportamiento previo); no se modificó.
- QA visual pendiente (pantalla de configuración en 360/390 px).

## Probar en Firefox
Elegí «Personalizada», escribí nombres (probá uno de más de 24 caracteres y dos iguales), 150M y un valor inválido como 103; iniciá y verificá nombres y presupuesto en el HUD, el organizador, la revelación y el resultado; copiá el contexto del sorteo y reproducilo.

## Git
Commit local `feat(reclutador): H2 custom match configuration`. Sin push.
