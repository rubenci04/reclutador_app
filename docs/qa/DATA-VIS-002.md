# DATA-VIS-002 — Colores de clubes mexicanos y balance de leyendas

## Clubes mexicanos
Los 28 `club_tag` de `mexico.json` tienen nombre y visual propio (colores, patrón de camiseta; escudos originales del juego, no logotipos oficiales). Pachuca ya existía; se agregaron 27 en `mexicanClubVisuals` (separado de `clubVisuals`, que refleja exactamente el catálogo de draft) y se registraron en `clubRegistry`: América, Guadalajara, Cruz Azul, Toluca, Pumas UNAM, Tigres UANL, Monterrey, Atlas, Santos Laguna, León, Necaxa, Atlético San Luis, Tijuana, Querétaro, Atlante, Puebla, FC Juárez y los históricos Real Club España, Atlético Español, Tampico Madero, Morelia, Veracruz, Zacatepec, Oro, Tecos UAG, Toros Neza, Celaya. Ningún club mexicano cae en el fallback gris. Los clubes asignados a los jugadores no se tocaron. Colores/patrones de los clubes históricos son editoriales aproximados.

## Política `legend-balance-v1`
Fuente única: `src/data/league-collections/legendBalancePolicy.json` + `legendBalance.ts`. Solo nuevas partidas de `ARGENTINA_LEGENDS`, `BRAZIL_LEGENDS`, `MEXICO_LEGENDS`; los OVR de las fuentes no se editan (capa versionada con los mismos IDs). Método: hasta la rodilla (`knee`) se conserva el OVR; por encima, orden por (OVR fuente, puesto) y reparto en cuotas geométricas hasta el tope, sin `Math.min` ciego. Las excepciones explícitas toman 93 (ARG/BRA) y salen del reparto. Precio y atributos se recalculan desde el OVR efectivo con las funciones existentes. Inglaterra, España e Italia no cambian.

| Modo | Antes (OVR:cantidad) | Después |
|---|---|---|
| Argentina leyendas | 98:1 96:2 95:4 94:6 93:5 92:10 91:26 90:32 89:48 88:16 | 93:2 92:10 91:42 90:32 89:48 88:16 |
| Brasil leyendas | 99:1 97:2 96:3 94:3 93:13 92:9 91:11 90:16 89:20 88:20 87:18 86:17 85:10 84:6 83:1 | 93:5 92:7 91:30 90:16 … 83:1 |
| México leyendas | 96:2 95:5 94:8 93:12 92:12 91:32 90:24 89:42 88:13 | 90:10 89:20 88:40 87:80 |

Excepciones 93 (tabla en el JSON): Maradona, Di Stéfano; Pelé, Garrincha, Ronaldo, Romário, Zico. México no tiene excepciones (máx. 90).

## Ediciones mundiales e historial
- Las 177 Leyendas Globales conservan su OVR fuente. Las 5 nominadas cuyo edición de liga fue rebalanceada (Pelé, Garrincha, Didi, Rivellino, Sócrates) usan una edición mundial estable `world_<id>` con el OVR original (Pelé 99 en Global, 93 en Brasil leyendas). Misma persona (`personKey` normaliza el prefijo); fichas y detalles resuelven la fuente por el id base.
- En cruces de categorías, si un mismo id aparece en dos catálogos, gana la edición rebalanceada (no se sustituye por la de OVR fuente).
- Partidas anteriores: `preBalanceCollections.json` congela la membresía de b7c2c31 (Argentina/Brasil/México leyendas y Leyendas Globales) y se suma a `recordedCollections`; sus ids siguen resolviendo a los OVR originales.

## Pruebas
`legendBalance.test.ts` nuevo (clubes, escala, jerarquía, precios/atributos, ediciones mundiales, historial). Ajustes de expectativa deliberados: `argentinaCurrentBalance.test` (las leyendas ya no son los mismos objetos) y `dominantFoot.test` (resuelve `world_`). typecheck, lint, build y suite completa: ver resultado abajo.

## Limitaciones
- Inspección visual de cartas mexicanas e histórica no realizada (el panel del navegador produjo capturas en negro en las dos tareas anteriores); solo pruebas de componentes y de datos.
- Una partida cruzada en curso con una categoría rebalanceada recalcula el catálogo cruzado con los OVR nuevos (las partidas de una sola categoría y los replays sí se conservan).
- Sin simulaciones masivas ni calibración: no se modificó el simulador.

## Resultado
typecheck, lint y build OK; `npm test`: 110 archivos, 1198 pruebas aprobadas, 0 fallidas.
