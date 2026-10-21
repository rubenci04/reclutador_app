# DATA-REG-003A — Autoría y figuras faltantes del Top 50 europeo

## 1. Rectificación del crédito
El propietario confirmó la grafía **Rubén E. Albarracín**. `CREDIT_AUTHOR` (`AppFooter.tsx`) pasa de «Alvarrazin» a «Albarracín»; el pie visible es «Idea y desarrollo: Rubén E. Albarracín © 2026» (etiqueta traducida en en/pt-BR). No quedaban otras apariciones de «Alvarrazin» en componentes de presentación (solo en `autoRounds.test.tsx`, corregida, y en `docs/qa/UX-DRAW-007.md`, que se conserva sin cambios como registro histórico: allí consta la grafía provisional). Comprobado en el navegador: un único `<footer>` en flujo normal a 375 px (sin scroll horizontal) y 1024 px.

## 2. Figuras incorporadas (ranks 1–50)
Estado real de `europeTop150Resolution.json`: 13 filas pendientes en 1–50 (12 `MISSING` + Vitinha `AMBIGUOUS`). Las 13 se incorporaron como ediciones contemporáneas regionales (`league: EUR`, `src/data/league-collections/europeFigures.json`, ids `import_eur_act_<slug>`, `reference_year` 2026):

| Rank | Jugador | Club de referencia | Posición | Pie | OVR editorial |
|---|---|---|---|---|---|
| 6 | Ousmane Dembélé | Paris Saint-Germain | DEL (ED) | BOTH (la fuente: usa bien ambos pies) | 90 |
| 8 | Michael Olise | Bayern München | DEL (ED) | LEFT | 90 |
| 9 | Vitinha (Vítor Machado Ferreira) | Paris Saint-Germain | MED | UNKNOWN | 90 |
| 13 | Nuno Mendes | Paris Saint-Germain | DEF (LI) | UNKNOWN | 88 |
| 14 | João Neves | Paris Saint-Germain | MED | UNKNOWN | 87 |
| 15 | Khvicha Kvaratskhelia | Paris Saint-Germain | DEL (EI) | RIGHT | 87 |
| 17 | Fabián Ruiz | Paris Saint-Germain | MED | LEFT | 86 |
| 19 | Dayot Upamecano | Bayern München | DEF | UNKNOWN | 85 |
| 20 | Ferran Torres | Paris Saint-Germain (desde 15/08/2026 según la fuente) | DEL (ED) | UNKNOWN | 85 |
| 26 | Jamal Musiala | Bayern München | MED (MCO) | UNKNOWN | 87 |
| 31 | Nico Schlotterbeck | Borussia Dortmund | DEF | UNKNOWN | 86 |
| 37 | Désiré Doué | Paris Saint-Germain | MED (MCO) | UNKNOWN | 86 |
| 44 | Diogo Costa | Porto | ARQ | UNKNOWN | 85 |

Procedencia: nombre completo, nacionalidad, posición principal, club actual y pie salen de la página de Wikipedia en inglés de cada jugador (URL en `sourceUrl`, consultada el 21/10/2026); el pie solo se fija cuando la fuente lo declara, si no queda `UNKNOWN`. Los OVR son **valores editoriales** coherentes con la escala del juego y los vecinos del ranking (el documento sitúa a Dembélé, Olise y Vitinha en el grupo 90 de FC 27), no valores oficiales. Atributos sectoriales y precio salen de la política y de `calculatePlayerPrice` existentes. Una nota de procedencia por registro deja constancia de lo no verificable.

## 3. Identidades
- Vitinha (PSG) es una persona distinta del «Vitinha» de la Serie A (`import_ita_act_175`, Genoa): identidades canónicas separadas por nombre completo.
- Kvaratskhelia (edición actual) es independiente de su edición histórica `import_ita_leg_131`; Ferran Torres y Diogo Costa no se confunden con las leyendas Fernando Torres y Diego Costa.
- No se duplicaron Rodri, Mbappé, Yamal ni Pedri (una identidad cada uno en el pool). Las nuevas ediciones no entran en los Top 150 de España, Inglaterra ni Italia (liga `EUR`) y no crean duplicados en Global Actual (el maestro creció a 1.913 ediciones de liga y Global incorpora las 13 sin repetir personas).

## 4. Europa Actualidad (`europe-top-150-v2`)
- Conciliadas antes: **106**. Nuevas resueltas: **13**. Conciliadas ahora: **119**.
- Provisionales (relleno por OVR entre ediciones 2026 europeas no nombradas): 44 → **31**. Cada incorporación sustituyó un puesto de relleno.
- Ambiguas: **0** (Vitinha resuelta). Siguen sin edición 31 filas de ranks 51–150 (y 0 en 1–50).
- Tamaño final: **150** identidades únicas, orden editorial intacto (primero las conciliadas por ranking).
- Compatibilidad: `preEuropeTopV2Collections.json` congela el pool de `europe-top-150-v1` (22d3adc) y se suma a `recordedCollections`; el pool de a483638 sigue registrado; no se recalcularon cartas históricas. Sin cambios en simulador, probabilidades, `club-spread-v3`, presupuestos, subasta, técnicos, suplentes ni online.

## 5. Pruebas
`europeFigures.test.tsx` (firma en es-AR/en/pt-BR; 13 filas resueltas; ediciones con procedencia, precio y atributos válidos; homónimos y leyendas separados; exactamente 150 únicos; sin duplicados en Global; compatibilidad v1/v2; viabilidad con 10 sorteos de 150M y ≥ 8 arqueros). Expectativas actualizadas por el cambio deliberado: 1.913 filas de ligas (3 pruebas) y Vitinha ya no ambigua.
Resultado: typecheck, lint y build OK; `npm test` (una vez, al cierre): ver abajo.

## 6. Limitaciones
- Dos fuentes Wikipedia no estaban disponibles con el título esperado (se usaron los títulos correctos de Nuno Mendes, João Neves y Diogo Costa); sin segunda fuente independiente por jugador.
- Los OVR son editoriales; los 31 puestos provisionales de ranks 51–150 siguen pendientes (DATA-REG-003B, no iniciada).

## Resultado final
typecheck, lint y build OK; `npm test`: 116 archivos, 1258 pruebas aprobadas, 0 fallidas.
