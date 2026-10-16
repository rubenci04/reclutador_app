# Contrato del catálogo y economía

CODEX-002 · DL-F02-DATA-001. Primera versión futura: `catalog_v1`. Esta entrega no contiene futbolistas reales; los fixtures son exclusivamente sintéticos.

## Diccionario de datos

`Player` representa una sola versión del mejor período deportivo de una persona. Todas las propiedades son obligatorias y readonly en TypeScript. La entrada externa se recibe como unknown y se valida en runtime.

| Campo | Tipo | Regla |
|---|---|---|
| id | string | Exactamente plr_001 a plr_100; único y permanente |
| name | string | Nombre canónico, no vacío, con letras o números; no se traduce |
| position | Position | ARQ, DEF, MED o DEL; una sola posición MVP |
| era | Era | 1950s, 1960s, 1970s, 1980s, 1990s, 2000s, 2010s, 2020s |
| nationality | string | Código de asociación futbolística FIFA admitido en NATIONALITY_CODES |
| club_tag | string | Identificador canónico del club de referencia, minúsculas y snake_case; patrón `[a-z][a-z0-9]*(?:_[a-z0-9]+)*` |
| overall_rating | number | Entero finito de 75 a 99 |
| att_rating | number | Entero finito de 40 a 99; capacidad ofensiva |
| def_rating | number | Entero finito de 40 a 99; defensa; en ARQ, atajada y protección del arco |
| phy_rating | number | Entero finito de 40 a 99; capacidad física |
| men_rating | number | Entero finito de 40 a 99; mentalidad y lectura del juego |
| price | number | Millones enteros; exactamente el resultado de calculatePlayerPrice(overall_rating) |

No se almacena tier: getPlayerTier lo deriva de overall_rating. `price` es un campo obligatorio materializado para el futuro intercambio de datos, pero nunca una decisión manual. La validación recalcula y compara. Las propiedades extra se ignoran para validación; no deben usarse como fuente de reglas, ni como un tier alternativo. No hay dependencia de React, del navegador ni de traducciones en el dominio.

## Posiciones, formación y niveles

| Código | Cantidad catálogo | Once 4-3-3 |
|---|---:|---:|
| ARQ | 12 | 1 |
| DEF | 32 | 4 |
| MED | 30 | 3 |
| DEL | 26 | 3 |
| Total | 100 | 11 |

Las etiquetas reutilizan `positions.<código>` de i18next. Nunca comparar nombres traducidos para validar posiciones.

| Tier | Rating | Cantidad |
|---|---|---:|
| S | 94–99 | 12 |
| A | 89–93 | 20 |
| B | 84–88 | 30 |
| C | 79–83 | 24 |
| D | 75–78 | 14 |

## Criterio editorial para CODEX-003

Los ratings son decisiones de balance del videojuego, no estadísticas oficiales ni una estimación automática del rendimiento actual. Seleccionar un período de referencia consistente por jugador y justificarlo en la documentación editorial del futuro catálogo.

| Posición | Atributos prioritarios | Interpretación |
|---|---|---|
| ARQ | DEF, MEN, luego PHY | Atajada, protección del arco, posicionamiento y decisiones; ATT refleja aporte ofensivo/salida |
| DEF | DEF, MEN, luego PHY | Marcaje, anticipación, lectura y resistencia; ATT distingue aporte ofensivo |
| MED | MEN y equilibrio ATT/DEF, luego PHY | Creación, lectura, recuperación y continuidad según el rol |
| DEL | ATT, MEN, luego PHY | Definición, generación de peligro, desmarque y decisiones; DEF no se confunde con definición |

Usar la misma escala entre posiciones; un 95 debe ser excepcional dentro de su rol, sin exigir atributos idénticos. Orientación: 40–59 capacidad limitada, 60–74 competente, 75–89 destacada, 90–99 excepcional. Overall es evaluación editorial independiente, no promedio obligatorio de atributos. No se inventan ponderaciones del simulador en esta etapa. No se imponen relaciones rígidas entre atributos: se admiten estilos distintos dentro de una posición.

## Épocas y nacionalidades

Era identifica la década que contiene la mayor parte del período elegido, no la fecha de nacimiento ni la temporada actual. Si abarca dos décadas por igual, elegir la que contiene el hito editorial principal y documentar el criterio. Se incluye expresamente 1950s para figuras anteriores a 1960. No había una lista anterior que modificar; décadas anteriores a 1950 o posteriores a 2020 requieren una extensión explícita del esquema.

Nacionalidad usa códigos futbolísticos de asociación FIFA, con ejemplos ARG, ENG, NED y GER. No usar ISO como DEU, NLD o GBR. El registro inicial es un subconjunto explícito de 38 asociaciones, en `src/data/catalogRules.ts`; no pretende cubrir todas las asociaciones del mundo. Agregar asociaciones faltantes con revisión documental antes de usar sus códigos. La sintaxis de tres letras por sí sola no acredita validez.

Para jugadores con varias nacionalidades, usar una sola asociación de selección absoluta representativa del período. Cuando el caso histórico no tenga equivalencia clara o haya representado varias selecciones, resolverlo editorialmente antes de incluir el registro; no convertir países históricos silenciosamente. No se agrega historial de nacionalidades en esta fase.

Referencia de códigos: [asociaciones de FIFA](https://inside.fifa.com/associations) y [ficha NED](https://football-technology.fifa.com/en/associations/NED). El informe financiero de FIFA consultado también identifica ARG, ENG y GER: https://resources.fifa.com/image/upload/xzshsoe2ayttyquuxhq0.pdf.

## Economía y viabilidad

Presupuesto fijo de 100 millones, sin moneda especificada. Única fórmula en `calculatePlayerPrice.ts`:

```typescript
Math.round(3 + 22 * Math.pow((overallRating - 75) / 24, 2.2))
```

75 → 3M; 84 → 6M; 90 → 11M; 99 → 25M. Entradas fuera de 75–99, fraccionarias o no finitas lanzan RangeError con código técnico `invalid_overall_rating`. No se hace clamp ni conversión de strings. La futura UI debe traducir errores técnicos antes de mostrarlos.

El validador selecciona los 1/4/3/3 jugadores válidos más baratos de cada posición, con desempate por ID. Esto da un mínimo global porque cada jugador tiene una sola posición y no existen restricciones cruzadas ni multiplicadores en el MVP. Suma <=100 prueba existencia de un once; suma >100 prueba inviabilidad bajo estas reglas. Devuelve IDs testigo y costo mínimo, sin implementar un draft interactivo. Si faltan posiciones no inventa un costo. Si hay registros inválidos o duplicados, la economía se marca `not_evaluated` para evitar conclusiones apoyadas en datos inseguros.

El test adversarial completo respeta todos los cupos y tiers pero cuesta como mínimo 101M: ARQ con 12 D; DEF con 12 S y 20 A; MED con 30 B; DEL con 24 C y 2 D, todos en el extremo alto de su tier. Los cupos por sí solos no garantizan asequibilidad.

## Validadores e informes

- `validatePlayer(unknown)`: no exige tamaño de catálogo. Devuelve unión discriminada; solo `valid: true` incluye un Player validado.
- `validateCatalog(unknown)`: espera el array de registros y comprueba 100 elementos, cada registro, los 100 IDs exactos, duplicados, cupos y economía. Los arrays dispersos también se verifican.
- `validateVersionedCatalog(unknown)`: comprueba adicionalmente el sobre `{version: 'catalog_v1', players: [...]}`.

CatalogValidation contiene valid, issues, validPlayerCount, positionCounts, tierCounts y economy. Cada incidencia tiene code estable, index de base cero si corresponde, field, expected y actual cuando ayudan. No son mensajes de interfaz. Los conteos incluyen únicamente registros individualmente válidos; los errores derivados de cupos son deliberados y se deben interpretar junto a los errores de registros. La economía de un fixture pequeño puede ser factible sin que el catálogo completo sea válido.

Duplicados: IDs exactos y nombre normalizado (Unicode NFD, sin diacríticos, puntuación o espacios; minúsculas), incluso entre clubes/épocas diferentes. Esta regla detecta variantes tipográficas, no identidades humanas con certeza: alias distintos y homónimos requieren revisión editorial. El esquema no añade otro campo de identidad fuera de los solicitados.

## Identificadores, migración y versionado

IDs de negocio son texto permanente. `plr_001` identifica siempre a la misma persona; nunca renumerar por orden, rating o eliminación. No reciclar identificadores. Los 100 slots se asignarán al preparar CODEX-003.

En una futura base PostgreSQL/Supabase conservar un identificador de jugador `text` con unicidad. Para versiones, usar conceptualmente clave compuesta `(catalog_version, player_id)` en registros de balance y referencias de partida a ambos. Si infraestructura exige UUID, agregar una columna técnica separada y un mapeo explícito; no castear plr_001 a UUID ni cambiar su significado. No se configura Supabase ni se crea SQL en esta entrega.

`catalog_v1` es el primer sobre soportado. Publicarlo como snapshot inmutable una vez aprobado el catálogo real. Cambios de ratings, precios, club o época producen una nueva versión deliberada y requieren extender el contrato/validador; partidas históricas deben conservar versión y acceso al snapshot utilizado. El futuro servidor debe importar la misma regla o verificar paridad exacta antes de usar una implementación en otro lenguaje, especialmente el redondeo. Almacenamiento histórico pendiente.

## Contrato para química futura

ChemistryIdentity toma id, nationality, club_tag y era; ChemistryDimension distingue esos tres criterios. CHEMISTRY_BONUS_CAP fija 0.15. No se calcula ninguna bonificación todavía.

La futura agregación debe formar pares no ordenados de IDs distintos (i<j o clave canónica con IDs ordenados); procesar cada par una sola vez por dimensión. Un par con coincidencia de club, época y nacionalidad puede reunir tres evidencias, pero no debe recibir tres bonificaciones independientes por accidente. La decisión de si se combinan y con qué pesos está pendiente. Aplicar el límite del 15% una sola vez al resultado agregado, no a cada dimensión para luego sumarlas. Faltan decisión de balance, definición de adyacencia y tratamiento de coincidencias entre jugadores no vecinos; no anticipar esas reglas en la simulación.
