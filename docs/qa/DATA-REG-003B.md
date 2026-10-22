# DATA-REG-003B — Europa completa y Sudamérica + México Top 150

Base: `main` ad48f05. Sin cambios en simulación, probabilidades, presupuestos, subasta, técnicos ni online. Los seis Top 150 nacionales no se tocan.

## 1. Europa Actualidad (`europe-top-150-v3`)
- Las 31 filas pendientes de los puestos 51–150 eran todas `MISSING`; una búsqueda por nombre completo, id y alias (sin importar la nacionalidad) confirmó que ninguna tenía edición 2026 en el maestro. Se crearon 31 ediciones regionales (`league: EUR`, ids `import_eur_act_<slug>`), añadidas a `europeFigures.json` (ahora 44 filas).
- Resultado: **150 reconciladas, 0 provisionales, 0 faltantes**; 150 identidades únicas, orden editorial intacto.
- Homónimos separados: Sergej Milinković-Savić (la edición actual es independiente de la leyenda `import_ita_leg_150` y de Vanja), Aleksandar Pavlović ≠ Strahinja Pavlović (rank 126), António Silva ≠ Marcos António Silva.

| Rank | Jugador | Club de referencia | Pos. | Pie | OVR |
|---|---|---|---|---|---|
| 57 | Theo Hernández | Al Hilal | DEF | — | 85 |
| 64 | Matvey Safonov | Paris Saint-Germain | ARQ | — | 86 |
| 74 | Rafael Leão | Galatasaray | DEL | — | 85 |
| 76 | Rúben Neves | Al Hilal | MED | — | 85 |
| 77 | Gonçalo Inácio | Sporting CP | DEF | — | 85 |
| 78 | António Silva | AFC Bournemouth | DEF | D | 85 |
| 81 | Diogo Dalot | Manchester United | DEF | — | 85 |
| 92 | Anthony Gordon | FC Barcelona | DEL | — | 84 |
| 96 | Jonathan Tah | Bayern München | DEF | — | 84 |
| 98 | Aleksandar Pavlović | Bayern München | MED | — | 84 |
| 99 | Felix Nmecha | Borussia Dortmund | MED | — | 83 |
| 100 | Lennart Karl | Bayern München | MED | I | 83 |
| 102 | Konrad Laimer | Bayern München | DEF | — | 82 |
| 103 | Marcel Sabitzer | Borussia Dortmund | MED | — | 82 |
| 104 | Christoph Baumgartner | RB Leipzig | MED | — | 82 |
| 109 | Lucas Bergvall | Tottenham Hotspur | MED | — | 82 |
| 110 | Antonio Nusa | RB Leipzig | DEL | — | 82 |
| 112 | Oscar Bobb | Fulham | DEL | — | 82 |
| 117 | Zuriko Davitashvili | Saint-Étienne | DEL | — | 82 |
| 119 | Illia Zabarnyi | Paris Saint-Germain | DEF | — | 82 |
| 120 | Georgiy Sudakov | Benfica | MED | — | 82 |
| 121 | Andriy Lunin | Real Madrid | ARQ | — | 83 |
| 122 | Viktor Tsygankov | Ajax | MED | I | 83 |
| 123 | Anatoliy Trubin | Benfica | ARQ | — | 83 |
| 124 | Dušan Vlahović | Beşiktaş | DEL | — | 83 |
| 125 | Sergej Milinković-Savić | Al Hilal | MED | — | 83 |
| 128 | Loïs Openda | Olympique Lyonnais (cedido por Juventus) | DEL | — | 84 |
| 133 | Leandro Trossard | Beşiktaş | DEL | — | 84 |
| 134 | Mateo Retegui | Al-Qadsiah | DEL | — | 84 |
| 147 | Tijjani Reijnders | Al-Qadsiah | MED | D | 84 |
| 148 | Denzel Dumfries | Real Madrid | DEF | — | 84 |

## 2. Sudamérica + México Actualidad (`south-america-mexico-top-150-v1`)
- Antes: 525 futbolistas (todos los de las 11 nacionalidades + Centroamérica/Caribe). Ahora: **150 identidades únicas**, solo ARG, BOL, BRA, CHI, COL, ECU, PAR, PER, URU, VEN y MEX (se comprobó que no entra Centroamérica ni el Caribe).
- Ranking transcrito de «Sudamérica + México — actualidad 2026» en `southAmericaTop150.json`; conciliación en `southAmericaTop150Resolution.json`; lógica en `southAmericaTop150.ts` (mismo patrón que Europa, buscando en el maestro completo).
- **101 reconciliadas**: 87 ya existían (por nombre completo, alias revisado o `ALL_CURRENT`; p. ej. Kendry Páez = «Ray Kendry Páez», Juan Camilo Hernández = Cucho, Gabriel Barbosa = Gabigol, Arrascaeta, Borré, Ederson = `plr_053`, Pedro = Flamengo) y **14 nuevas** del Top 50 (`league: SAM`, ids `import_sam_act_<slug>`, `southAmericaFigures.json`): Pacho (4, 89), Luis Díaz (6, 89), Quiñones (15, 87), Militão (19, 86), Martinelli (22, 86), Darwin Núñez (30, 84), Santiago Giménez (32, 84), Ugarte (34, 84), Garnacho (38, 85), Endrick (41, 85), André (43, 85), Jhon Durán (44, 85), Richard Ríos (45, 84), Davinson Sánchez (48, 83). Pies fijados solo donde la fuente lo declara: Darwin D, Endrick I; el resto `UNKNOWN`.
- Los 49 puestos restantes se completaron con **49 reemplazos provisionales** (mejores ediciones 2026 de las mismas nacionalidades no nombradas por el ranking).
- Homónimos separados: Gabriel Martinelli ≠ Matheus Martinelli; Ederson Moraes ≠ Éderson (Atalanta); André ≠ Taffarel/Vampeta; Luis Díaz ≠ Luis Suárez (Luis Alberto Suárez Díaz); Pepê (111) sin edición, no se fusionó con Pepe/José Macia.

### Pendientes reales (49, puestos 51–150; no se importaron por la regla del encargo)
54 Andrey Santos · 55 Wesley França · 56 Vanderson · 67 Maximiliano Araújo · 68 Facundo Pellistri · 70 Nahitan Nández · 72 Jefferson Lerma · 74 Yaser Asprilla · 75 Luis Sinisterra · 77 Kevin Castaño · 78 Nelson Deossa · 82 Edson Álvarez · 85 César Montes · 86 Luis Chávez · 92 Claudio Echeverri · 95 Nicolás González · 98 Alan Varela · 99 Santiago Hezze · 100 Ezequiel Fernández · 101 Valentín Barco · 107 Beraldo · 109 Bento · 110 Gabriel Sara · 111 Pepê · 116 James Rodríguez · 118 John Yeboah · 119 Jeremy Sarmiento · 121 Rodrigo Huescas · 124 Julio Enciso · 125 Diego Gómez · 126 Ramón Sosa · 127 Miguel Almirón · 128 Omar Alderete · 130 Damián Bobadilla · 131 Darío Osorio · 132 Marcelino Núñez · 133 Paulo Díaz · 135 Ben Brereton Díaz · 136 Lucas Cepeda · 137 Yangel Herrera · 138 Jon Aramburu · 139 Telasco Segovia · 142 Renato Tapia · 143 Oliver Sonne · 144 Piero Quispe · 145 Miguel Terceros · 146 Ramiro Vaca · 148 Facundo Torres · 149 Luciano Rodríguez.

## 3. Método y límites de los datos
- Nombre completo, posición principal y club actual: Wikipedia en inglés (URL en `sourceUrl`, consultada el 21/10/2026). Quien figura cedido se registra en el club donde juega (la cesión consta en la nota).
- **OVR editorial**, no oficial: mediana del OVR de las ediciones ya reconciliadas dentro de ±12 puestos del ranking (mínimo 75), para evitar valores atípicos de vecinos inmediatos. Precio y atributos salen de `calculatePlayerPrice` y de la política existente.
- Posición lateral sin lado conocido: `ED/EI`; laterales sin lado: `LD`. Laimer (página: «lateral o mediocampista») se registra con el primer rol. Una sola fuente por jugador; sin segunda verificación independiente.
- Se añadió `RUS` a los códigos de nacionalidad (Safonov, rank 64; el nombre se localiza con `Intl`, sin textos nuevos) y cinco clubes al registro (Sporting CP, RB Leipzig, Saint-Étienne, Al-Diriyah, Al-Ittihad; sin escudo propio, usan el neutro).

## 4. Compatibilidad
`preDataReg003BCollections.json` congela Global Actual (994), Europa (150, v2) y Sudamérica (525) tal como estaban en ad48f05 y se suma a `recordedCollections`; las repeticiones y partidas anteriores se recuperan por su `catalogKey`. Global Actual crece a 1.039 por las 45 ediciones nuevas, sin duplicar personas.

## 5. Pruebas
Nueva `topCompletion.test.ts` (Europa 150 sin relleno, 45 ediciones válidas, homónimos, Sudamérica 150 sin Centroamérica, principales presentes, catálogos anteriores y repeticiones, viabilidad económica con 10 sorteos y ≥ 8 arqueros por pool). Expectativas actualizadas por el cambio deliberado: 1.958 ediciones de liga, Mundo SA ya no es «todos los nacionales», liga `SAM` excluida de la línea base de pie dominante, versión de Europa. `AuctionPage.test.tsx` usaba la semilla `hot-seat-001`, cuyo recorrido dejó de ejercitar el mismo camino con el nuevo Global; se cambió a `hot-seat-004` sin tocar el motor.

typecheck, lint y build: OK.

## Resultado final
`npm test` (suite completa, tras corregir la semilla de AuctionPage y los códigos de rol): 117 archivos, 1.267 pruebas aprobadas, 0 fallidas. Una primera ejecución falló en 4 pruebas (códigos de rol `LAT`/`EXT` no traducidos y semilla de subasta); se corrigieron y se repitió la suite completa.
