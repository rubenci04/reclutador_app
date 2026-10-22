# DATA-REG-003C — Top 150 de Leyendas regionales

Base: `main` 670de61. Sin cambios en simulación, probabilidades, Leyendas Globales ni los Top 150 de Actualidad y ligas nacionales.

## 1. Qué cambió
`SOUTH_AMERICA_LEGENDS` y `EUROPE_LEGENDS` dejan de ser un filtro por nacionalidad (467 y 327 leyendas) y pasan a ser rankings editoriales de 150 con el mismo mecanismo que Actualidad: transcripción del documento (`southAmericaLegends150.json`, `europeLegends150.json`), conciliación (`*LegendsResolution.json`) y construcción del pool (`legendTops.ts`). La lógica común de «ranking primero, relleno provisional después» se extrajo a `topPool.ts` y ahora la usan también Europa y Sudamérica Actualidad (sin cambio de comportamiento).

| | Sudamérica + México Leyendas (`south-america-mexico-legends-150-v1`) | Europa Leyendas (`europe-legends-150-v1`) |
|---|---|---|
| Identidades únicas | 150 | 150 |
| Reconciladas con el ranking | 110 | 114 (4 son ediciones nuevas) |
| Reemplazos provisionales | 40 | 36 |
| Filas del ranking sin edición | 40 (39 ausentes + 1 duplicada) | 36 |
| Catálogo anterior congelado | 467 | 327 |

- **Conciliación:** nombre completo / alias contra ediciones históricas (`legend`) del maestro; una edición por persona. Se usan las ediciones locales de `legend-balance-v1` donde existen (Argentina, Brasil, México); las ediciones mundiales (`world_*`: Pelé, Maradona, etc.) no se tocan y no entran en estos pools. Elecciones revisadas (anotadas en la resolución): Luis Suárez = Luis Alberto Suárez Díaz, Ronaldo = Ronaldo Luís Nazário (edición brasileña), Roberto Carlos, Falcão = Paulo Roberto, Marcelo Vieira, Jorge Campos (México, no el brasileño), Schmeichel padre, John Charles (Gales), Seedorf, van Nistelrooy y Pepe (Képler Laveran; no se fusiona con el Pepe brasileño José Macia).
- **Solo las 11 asociaciones** (Sudamérica + México) y nacionalidades europeas; Rusia entra con la clasificación de la fuente (Yashin = RUS). Ningún jugador actual entra como leyenda: el relleno excluye a quien tiene edición de jugador activo; Mbappé (101) y Haaland (147) quedan pendientes en lugar de usar su edición actual.
- **Duplicado de la fuente:** Romerito (130) y Julio César Romero (135) son la misma persona; se cuenta una vez.
- **Relleno provisional:** mejores ediciones históricas existentes de la región por OVR efectivo (ediciones locales balanceadas si existen), sin duplicar personas.

## 2. Ediciones nuevas (solo Europa; ninguna falta en el top 20 sudamericano)
Faltaban 4 figuras del top 20 europeo; se crearon como `league: EUR`, `category: legend` (`europeLegendFigures.json`):

| Rank | Jugador | Club / período de referencia | Pos. | Pie | OVR editorial |
|---|---|---|---|---|---|
| 3 | Franz Beckenbauer | Bayern München 1964-1977 | DEF | — | 96 |
| 7 | Gerd Müller | Bayern München 1964-1979 | DEL | — | 96 |
| 8 | Eusébio | Benfica 1960-1975 | DEL | D | 96 |
| 11 | Lev Yashin (RUS/URSS) | Dynamo Moscow 1950-1970 | ARQ | — | 96 |

Fuente: Wikipedia en inglés (consultada el 21/10/2026). El OVR es editorial: mediana de las ediciones históricas ya conciliadas dentro de ±12 puestos. Se añadió el club `dynamo_moscow` al registro. Estas ediciones no pasan a Leyendas Globales.

## 3. Pendientes (sin edición histórica en el maestro; no se importaron)
- **Sudamérica + México (40):** 23 Spencer · 25 Cubillas · 30 Obdulio Varela · 78 Ardiles · 84 Andrade · 85 Nasazzi · 86 Scarone · 87 Ghiggia · 90 Mazurkiewicz · 91 Morena · 96 Chumpitaz · 97 Sotil · 98 Cueto · 101 Oblitas · 102 Guerrero · 103 Farfán · 104 Velásquez · 105 Valderrama · 107 James Rodríguez · 109 Higuita · 113 Ortiz · 117 Bravo · 118 Caszely · 119 Leonel Sánchez · 122 Chicharito · 123 Guardado · 126 Luis Hernández · 128 Ochoa · 132 Santa Cruz · 135 J. C. Romero (duplicado de 130) · 137 A. Valencia · 138 Delgado · 139 Hurtado · 140 Méndez · 141 Arango · 142 Rondón · 143 Etcheverry · 144 J. Moreno · 145 E. Sánchez · 146 Ugarte.
- **Europa (36):** 43 Neeskens · 48 Lahm · 54 Kahn · 69 Masopust · 73 Lato · 76 Simonsen · 95 Fontaine · 97 Ribéry · 101 Mbappé · 102 F. Walter · 103 Seeler · 104 Breitner · 105 Netzer · 106 Sammer · 108 Völler · 110 T. Müller · 111 Robben · 117 Kocsis · 118 Hidegkuti · 119 Bozsik · 120 Grosics · 121 Albert · 122 Blokhin · 123 Belanov · 124 Dasayev · 125 Netto · 126 Streltsov · 129 Džajić · 130 Stojković · 133 Pfaff · 136 Sindelar · 137 Ocwirk · 142 Litmanen · 147 Haaland · 149 Popescu · 150 Dobrin.
- Algunos de estos tienen edición de «jugador actual/reciente» (Guerrero, Farfán, Bravo, Ochoa, Lahm, Rondón): se dejan pendientes a propósito, no se reutilizan como leyendas.

## 4. Revisión puntual de procedencia (Tarea 3)
Segunda comprobación con prensa de agencia que cita comunicados de los clubes (no se obtuvo la página oficial de cada club con la herramienta disponible):

| Jugador | Club registrado en 003B | Resultado |
|---|---|---|
| Ferran Torres | Paris Saint-Germain | **Confirmado**: PSG anunció el fichaje el 15/08/2026 (contrato hasta 2031) tras acordar la salida con el Barcelona. [k24](https://k24.digital/sports/ligue-1/ferran-torres-completes-psg-move-from-barcelona/amp), [Telangana Today](https://telanganatoday.com/2026-fifa-wc-hero-ferran-torres-joins-psg-on-contract-until-2031) |
| Rafael Leão | Galatasaray | **Confirmado**: traspaso completado desde el Milan el 30/08/2026 (AP/AFP). [AP vía SOMD News](https://www.somdnews.com/ap/nation/sports/rafael-le-o-heads-to-turkey-ahead-of-expected-transfer-from-milan-to-galatasaray/article_63d6a880-2d67-5d07-a101-960265d6bf7f.html), [theScore](https://thescore-web-gcp.thescore.com/news/3588009/leao-joins-galatasaray-from-milan-in-%E2%82%AC-38-m-transfer) |
| Anthony Gordon | FC Barcelona | **Confirmado**: fichaje desde el Newcastle cerrado y presentado a fines de mayo de 2026. [theScore](https://www.thescore.com/epl/news/3546840/barcelona-sign-gordon-from-newcastle-in-reported-80-m-deal), [beIN Sports](https://www.beinsports.com/en-us/soccer/la-liga/articles/barcelona-cierra-el-fichaje-de-anthony-gordon-y-ya-tiene-fecha-para-su-llegada-2026-05-28) |
| Denzel Dumfries | Real Madrid | **Confirmado**: el Real Madrid anunció el 05/07/2026 su fichaje desde el Inter (contrato hasta 2030). [Las Vegas Sun / AP](https://lasvegassun.com/news/2026/jul/05/real-madrid-signs-denzel-dumfries-from-inter-milan/), [Flashscore](https://www.flashscore.com/news/denzel-dumfries-joins-real-madrid-from-inter-milan/QoSaqVfk/) |

**No se corrigió ninguna asignación.** Se conserva la procedencia registrada (Wikipedia). Un artículo de baja calidad aún mostraba a Ferran en el Barcelona, anterior al traspaso; se descartó. No se auditó a otros futbolistas.

## 5. Compatibilidad y pruebas
`preDataReg003CCollections.json` congela los pools anteriores de ambas categorías y se suma a `recordedCollections` (partidas y repeticiones previas se recuperan por su `catalogKey`). Nueva `legendTops.test.ts` (150 únicos por categoría, coincidencia con el ranking y cantidad de provisionales, separación actual/local/mundial, Global Legends intacto, ediciones nuevas válidas, catálogos anteriores y viabilidad de 10 sorteos de 200M con ≥ 8 arqueros). Expectativas actualizadas por el cambio deliberado: 1.962 ediciones de liga, la prueba de las 600 tarjetas de leyenda con períodos de carrera excluye las 4 ediciones nuevas (llevan su período en `sourceClubPeriod`), Maidana sigue solo en Argentina Leyendas y se retiró la prueba que exigía ≥ 300 leyendas regionales.

typecheck, lint y build: OK.

## Resultado final
`npm test` (una sola ejecución completa al cierre): 118 archivos, 1.273 pruebas aprobadas, 0 fallidas.
