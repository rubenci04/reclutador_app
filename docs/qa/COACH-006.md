# COACH-006 — Mercado de seis técnicos, Serie A y Liga MX

## Técnicos incorporados
`src/data/league-coaches.json` (versión `coach-league-v1`, consultado 21/10/2026): 20 técnicos nuevos, cada uno con club de referencia, años del período y URL de fuente (tabla de carrera de Wikipedia en inglés). Nivel y foco son criterio editorial del juego; el club es referencia de carrera, no empleo actual verificado. Sin fotografías (retrato neutral con iniciales y nivel). Nacionalidad no interviene en la elegibilidad: importa haber dirigido en la liga.

| Liga | Actualidad (nuevos) | Leyendas (nuevos) | Existentes con tramo documentado |
|---|---|---|---|
| Serie A | Spalletti, Sarri, Gasperini, Pioli, Italiano | Capello, Lippi, Trapattoni, Liedholm, Ranieri | Conte, Allegri, Inzaghi · Sacchi, H. Herrera |
| Liga MX | Miguel Herrera, Mohamed, Almada, Ferretti, Vucetich | Trelles, Cárdenas, Lapuente, Milutinović, Reinoso | Aguirre, Gago · La Volpe |

Profundidad elegible: Italia actual 8, Italia leyendas 7, México actual 7, México leyendas 6. Bilardo y Basile ya no aparecen en el mercado de Italia (siguen en Argentina y en el catálogo previo). Los técnicos nuevos también alimentan, por nacionalidad, Europa y Sudamérica+México, y Global (actuales; leyendas S/A).

## Mercado `coach-market-v2`
- Marcador `coachMarket` en `MatchConfig` (nuevas partidas locales, personalizadas y salas online nuevas). Sin el marcador: oferta de tres cartas y pools anteriores, idénticos a los de partidas previas.
- Seis cartas distintas del pool propio de la categoría, solo si cuestan ≤ saldo tras el once y la reserva; sorteo determinista por semilla: contrato inicial (con precio de reserva existente), el más fuerte asequible, una carta por especialización (ataque, defensa, mediocampo, equilibrado) y niveles no repetidos. Si el pool asequible es menor, se muestran menos; nunca se completa con técnicos de otras ligas. Con reserva 8 M siempre hay seis (probado). Opcional: «Sin técnico».
- Precios y fórmulas intactos (`COACH_TIER_PRICE`, `coachEffect`); no se tocó el simulador.

## Tarjetas
Retrato/fallback, nombre, bandera y nacionalidad, club de referencia · años, nivel · especialidad · precio, tres chips de bonus (ATQ/MED/DEF, de `coachEffect`) y, en «Ficha y bonus», edad/estado, bonus base, afinidad por especialidad y fuente. Grilla 3×2 en escritorio, 2 columnas hasta 900 px y 1 en móvil; botones nativos (teclado y foco). Textos es-AR/en/pt-BR.

## Pruebas
`coachMarketV2.test.ts` (elegibilidad por trayectoria, 10+10, pools, seis ofertas distintas/asequibles/variadas/deterministas, compatibilidad v1, compra, rechazo, CPU, partida histórica) y `CoachMarketCards.test.tsx` (presentación en 3 idiomas, sin foto para nuevos, sin claves crudas). Se actualizó una expectativa de `matchConfig.test` (la configuración exportada incluye el marcador).

## Limitaciones
- QA visual en navegador no realizada (el panel mostró capturas en negro en tareas previas).
- Años = período de referencia elegido de la tabla de carrera de la fuente; fechas de nacimiento/muerte y clubes provienen de esas páginas, sin segunda fuente independiente.
- `reference-careers.json` de técnicos existentes tiene ids desalineados con el catálogo actual (preexistente); no se usó para los técnicos nuevos.
- Una partida en curso sin marcador conserva tres cartas; la de dos categorías cruzadas usa el pool de cada categoría.

## Resultado
typecheck, lint y build OK; `npm test`: 112 archivos, 1217 pruebas aprobadas, 0 fallidas.
