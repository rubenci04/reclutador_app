# Contrato del catálogo y economía

Vigente desde CODEX-003A, actualizado en CODEX-003C · DL-F02-DATA-002. `catalog_v1` amplía explícitamente el alcance anterior de 100 a 500 futbolistas: 300 contemporary y 200 legend. B01, B02 y B03 implementan 150 contemporáneos; los 350 restantes están pendientes. Los fixtures de pruebas siguen siendo exclusivamente sintéticos. ADR-0004 sustituye los límites de tamaño de ADR-0003; los informes históricos no se reescriben.

## Diccionario de datos

`Player` representa una sola versión del mejor período deportivo de una persona. Todas las propiedades son obligatorias y readonly en TypeScript. La entrada externa se recibe como unknown y se valida en runtime.

| Campo | Tipo | Regla |
|---|---|---|
| id | string | Exactamente plr_001 a plr_500; único y permanente |
| name | string | Nombre canónico, no vacío, con letras o números; no se traduce |
| position | Position | ARQ, DEF, MED o DEL; una sola posición MVP |
| category | PlayerCategory | contemporary o legend; cada persona aparece una sola vez |
| reference_year | number | Año entero 1950–2026; contemporary 2016–2026, legend 1950–2015 |
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
| ARQ | 60 | 1 |
| DEF | 160 | 4 |
| MED | 150 | 3 |
| DEL | 130 | 3 |
| Total | 500 | 11 |

Las etiquetas reutilizan `positions.<código>` de i18next. Nunca comparar nombres traducidos para validar posiciones.

| Tier | Rating | Cantidad |
|---|---|---:|
| S | 94–99 | 60 |
| A | 89–93 | 100 |
| B | 84–88 | 150 |
| C | 79–83 | 120 |
| D | 75–78 | 70 |

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

reference_year ancla la versión deportiva seleccionada y era es la década de ese año. El período concreto (temporada o torneo) se documenta editorialmente por ID. No se usa nacimiento ni temporada actual. La ventana contemporary 2016–2026 y la fecha 2026-10-16 son constantes editoriales; nunca dependen del reloj. Leyendas con referencia posterior a 2015 requieren otra decisión explícita antes de incluirlas. Se incluye expresamente 1950s para figuras anteriores a 1960. No había una lista anterior que modificar; décadas anteriores a 1950 o posteriores a 2020 requieren una extensión explícita del esquema.

Nacionalidad usa códigos futbolísticos de asociación FIFA, con ejemplos ARG, ENG, NED y GER. No usar ISO como DEU, NLD o GBR. El registro es un subconjunto explícito de 49 asociaciones: B01 agregó SUI, ISL y CRC; B02 agrega SVN, AUT, BIH, PAN, TUN e IRN; B03 agrega KSA y QAT. Vive en `src/data/catalogRules.ts` y no pretende cubrir todas las asociaciones del mundo. Agregar asociaciones faltantes con revisión documental antes de usar sus códigos. La sintaxis de tres letras por sí sola no acredita validez.

Para jugadores con varias nacionalidades, usar una sola asociación de selección absoluta representativa del período. Cuando el caso histórico no tenga equivalencia clara o haya representado varias selecciones, resolverlo editorialmente antes de incluir el registro; no convertir países históricos silenciosamente. No se agrega historial de nacionalidades en esta fase.

Referencia de códigos: [asociaciones de FIFA](https://inside.fifa.com/associations) y [ficha NED](https://football-technology.fifa.com/en/associations/NED). El informe financiero de FIFA consultado también identifica ARG, ENG y GER: https://resources.fifa.com/image/upload/xzshsoe2ayttyquuxhq0.pdf.

## Economía y viabilidad

Presupuesto fijo de 100 millones, sin moneda especificada. Única fórmula en `calculatePlayerPrice.ts`:

```typescript
Math.round(3 + 22 * Math.pow((overallRating - 75) / 24, 2.2))
```

75 → 3M; 84 → 6M; 90 → 11M; 99 → 25M. Entradas fuera de 75–99, fraccionarias o no finitas lanzan RangeError con código técnico `invalid_overall_rating`. No se hace clamp ni conversión de strings. La futura UI debe traducir errores técnicos antes de mostrarlos.

El validador selecciona los 1/4/3/3 jugadores válidos más baratos de cada posición, con desempate por ID. Esto da un mínimo global porque cada jugador tiene una sola posición y no existen restricciones cruzadas ni multiplicadores en el MVP. En una prueba económica habilitada, suma <=100 prueba existencia de un once; suma >100 prueba inviabilidad bajo estas reglas. Devuelve IDs testigo y costo mínimo, sin implementar un draft interactivo. Si faltan posiciones no inventa un costo. Si hay registros inválidos o duplicados, la economía se marca `not_evaluated` para evitar conclusiones apoyadas en datos inseguros.

La regresión histórica de CODEX-002 conserva un subconjunto sintético de 100 registros con costo mínimo 101M (no es el catálogo actual): ARQ con 12 D; DEF con 12 S y 20 A; MED con 30 B; DEL con 24 C y 2 D, todos en el extremo alto de su tier. Los cupos por sí solos no garantizan asequibilidad.

## Validadores e informes

- `validatePlayer(unknown)`: no exige tamaño de catálogo. Devuelve unión discriminada; solo `valid: true` incluye un Player validado.
- `validateBatch(unknown, batchId)`: modalidad parcial de 50 registros; verifica el intervalo de IDs reservado, categoría, cupos posicionales y tiers. Nunca aprueba el catálogo completo.
- `validateCatalog(unknown)`: modalidad completa de 500 registros con los 500 IDs exactos, matriz categoría/posición, cupos globales y duplicados. Los arrays dispersos también se verifican.
- `checkEconomicViability(unknown)`: prueba reutilizable sobre un subconjunto válido con IDs y nombres distintos; no acredita completitud.
- `assembleCatalog(manifest, batches)`: valida manifest, coherencia con archivos suministrados, cada lote y duplicados entre lotes. Orden canónico de lotes e IDs, independiente de orden de importación.
- `validateVersionedCatalog(unknown)`: comprueba adicionalmente el sobre `{version: 'catalog_v1', players: [...]}`.

CatalogValidation contiene mode (partial/complete), status (approved/invalid/pending), valid, issues, validPlayerCount, positionCounts, tierCounts, categoryCounts, categoryPositionCounts y economy. En modo completo valid nunca es true con menos de 500 registros. Cada incidencia tiene code estable, index de base cero si corresponde, field, expected y actual cuando ayudan. No son mensajes de interfaz. Los conteos incluyen únicamente registros individualmente válidos; los errores derivados de cupos son deliberados y se deben interpretar junto a los errores de registros. La economía de un fixture pequeño se verifica únicamente mediante checkEconomicViability; validar un lote o catálogo incompleto deja economy en not_evaluated. La auditoría global real y CPU 95–100M permanecen pendientes hasta disponer de los diez lotes.

Duplicados: IDs exactos y nombre normalizado (Unicode NFD, sin diacríticos, puntuación o espacios; minúsculas), incluso entre clubes/épocas diferentes. Desde CODEX-003B, identityAliases.json relaciona también nombres deportivos, abreviaturas y variantes completas revisadas de los 150 futbolistas con su ID permanente. playerIdentityKey usa esa identidad común para detectar colisiones; validatePlayer emite identity_mismatch si un alias conocido se intenta asignar a otro ID.

El registro es explícito y finito: no se infieren personas por apellido, club, parecido textual ni nacionalidad. Se rechaza una definición de alias vacía o asignada a dos IDs para exigir desambiguación editorial. Nombres desconocidos mantienen el control de normalización y requieren revisión humana antes de entrar al catálogo. No se agregan campos al contrato Player ni se cambian los nombres de exhibición. Los alias de cada lote se incorporan junto con sus fuentes/revisión, manteniendo los IDs existentes.

## Identificadores, migración y versionado

IDs de negocio son texto permanente. `plr_001` identifica siempre a la misma persona; nunca renumerar por orden, rating o eliminación. No reciclar identificadores. IDs por lote: B01 plr_001–plr_050, B02 plr_051–plr_100, y así hasta B10 plr_451–plr_500. B01–B06 son contemporary, B07–B10 legend. Nunca reasignar los primeros 50 IDs. Antes de esta ampliación no existía un catálogo real publicado ni partidas que migrar.

En una futura base PostgreSQL/Supabase conservar un identificador de jugador `text` con unicidad. Para versiones, usar conceptualmente clave compuesta `(catalog_version, player_id)` en registros de balance y referencias de partida a ambos. Si infraestructura exige UUID, agregar una columna técnica separada y un mapeo explícito; no castear plr_001 a UUID ni cambiar su significado. No se configura Supabase ni se crea SQL en esta entrega.

`catalog_v1` es el primer sobre soportado. Publicarlo como snapshot inmutable una vez aprobado el catálogo real. Cambios de ratings, precios, club o época producen una nueva versión deliberada y requieren extender el contrato/validador; partidas históricas deben conservar versión y acceso al snapshot utilizado. El futuro servidor debe importar la misma regla o verificar paridad exacta antes de usar una implementación en otro lenguaje, especialmente el redondeo. Almacenamiento histórico pendiente.

## Contrato para química futura

ChemistryIdentity toma id, nationality, club_tag y era; ChemistryDimension distingue esos tres criterios. CHEMISTRY_BONUS_CAP fija 0.15. No se calcula ninguna bonificación todavía.

La futura agregación debe formar pares no ordenados de IDs distintos (i<j o clave canónica con IDs ordenados); procesar cada par una sola vez por dimensión. Un par con coincidencia de club, época y nacionalidad puede reunir tres evidencias, pero no debe recibir tres bonificaciones independientes por accidente. La decisión de si se combinan y con qué pesos está pendiente. Aplicar el límite del 15% una sola vez al resultado agregado, no a cada dimensión para luego sumarlas. Faltan decisión de balance, definición de adyacencia y tratamiento de coincidencias entre jugadores no vecinos; no anticipar esas reglas en la simulación.
