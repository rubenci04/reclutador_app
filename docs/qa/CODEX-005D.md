# CODEX-005D — identidad cromática de clubes

## Cambios

Base verificada: c783cbd, árbol limpio. Rama de entrega: codex/club-colour-identity.

`src/features/player-catalog/clubVisuals.ts` centraliza 67 registros, exactamente los club_tag presentes en B01/B02/B03. Cada uno conserva ID, nombre propio, color principal/secundario, contraste y variante duo. Los hex son elecciones editoriales del videojuego, no especificaciones oficiales de marca.

`src/components/ClubBadge.tsx` dibuja exclusivamente con CSS una ficha rectangular redondeada con dos bloques interiores. Todos los clubes tienen la misma geometría. No utiliza letras, monogramas, coronas, estrellas, escudos, franjas diagonales ni composiciones específicas de emblemas. El nombre aparece como texto común al lado, separado de la ficha. El fallback para club desconocido es neutral y tiene etiqueta traducida; la lectura no depende de reconocer colores.

Integrado en PlayerIdentity (duelo) y PlayerSelector (Draft Libre). Se conservan las banderas y la fotografía piloto, su manifiesto y créditos. No se modificaron catálogo, precios, ratings, subastas, CPU, simulador, dependencias ni sistema de imágenes.

Boca, Talleres y los dos clubes tucumanos citados como ejemplos no están en el catálogo actual: sus paletas quedan para cuando existan sus IDs reales. River, Barcelona y Real Madrid sí están cubiertos.

## Pruebas reales

- `npm run typecheck`: PASS.
- `npm run lint`: PASS.
- `npm test -- -t '^(?!.*(?:completes 1,000|plays 3,000|2,400-match)).*$'`: PASS, 13 archivos, 453 pruebas aprobadas, 3 omitidas, 5.75 s.
- Exclusiones deliberadas: estrés de 1.000 semillas, 3.000 partidos CPU y diagnóstico de 2.400 partidos. No se repiten por no haberse modificado lógica de juego, según el encargo.
- `npm run build`: PASS.
- `git diff --check`: PASS.

Las ocho pruebas nuevas cubren correspondencia exacta con los clubes del catálogo, paletas representativas, IDs desconocidos (incluidas propiedades del prototipo), nombre accesible en es-AR/en/pt-BR, geometría común sin contenido tipográfico, integración en ambas tarjetas y conservación de fotografía/bandera/precio. Contraste calculado: texto exterior contra fondo oscuro >7:1 y borde neutral de todas las fichas contra su fondo >3:1. No hay texto encima de los colores de club; no se exige contraste de texto entre los dos bloques decorativos.

## Pendientes

QA visual real de escritorio, 390 y 360 px: NO EJECUTADA en esta entrega; las pruebas DOM no certifican layout. Revisar manualmente tarjetas con nombres largos, River (blanco/rojo), Barcelona (azul/granate), Real Madrid (blanco/dorado), fallback neutral, foto de Messi y banderas. Probar teclado, idiomas y alto contraste. CSS permite envolver el nombre y reduce la ficha en el catálogo móvil, sin animaciones nuevas.

## Estado de Git

Entrega en commit local específico sobre codex/club-colour-identity. No se realiza push ni deploy. No se inicia la colección argentina.

## Paletas incorporadas

Contraste común del borde: `#88949E`. Fallback: principal `#38434D`, secundario `#B6C0C8`.


| ID | Club | Principal | Secundario |
|---|---|---|---|
| ac_milan | AC Milan | #C62828 | #111111 |
| al_ain | Al Ain | #633090 | #FFFFFF |
| al_hilal | Al Hilal | #1555AF | #FFFFFF |
| al_nassr | Al Nassr | #F6CC32 | #184A9D |
| al_sadd | Al Sadd | #FFFFFF | #151515 |
| al_shabab | Al Shabab | #FFFFFF | #151515 |
| amkar_perm | Amkar Perm | #CF2932 | #151515 |
| antalyaspor | Antalyaspor | #D42B35 | #FFFFFF |
| arsenal | Arsenal | #CD2635 | #FFFFFF |
| aston_villa | Aston Villa | #721E42 | #99CBE8 |
| atalanta | Atalanta | #1765B3 | #151515 |
| atletico_bucaramanga | Atlético Bucaramanga | #F3CE32 | #18754A |
| atletico_madrid | Atlético de Madrid | #C62835 | #FFFFFF |
| az_alkmaar | AZ Alkmaar | #CE2834 | #FFFFFF |
| barcelona | FC Barcelona | #172C60 | #861C41 |
| bayer_leverkusen | Bayer Leverkusen | #D62835 | #151515 |
| bayern_munich | Bayern München | #C82735 | #FFFFFF |
| beijing_guoan | Beijing Guoan | #23754A | #F0CB35 |
| benfica | Benfica | #D32435 | #FFFFFF |
| besiktas | Beşiktaş | #151515 | #FFFFFF |
| borussia_dortmund | Borussia Dortmund | #F4D532 | #151515 |
| brighton_hove_albion | Brighton & Hove Albion | #2263AD | #FFFFFF |
| cafetaleros_de_tapachula | Cafetaleros de Tapachula | #1E704A | #FFFFFF |
| celtic | Celtic | #207A4B | #FFFFFF |
| chelsea | Chelsea | #2146A0 | #FFFFFF |
| corinthians | Corinthians | #FFFFFF | #151515 |
| cska_moscow | CSKA Moscow | #C82C3C | #244A94 |
| deportivo_la_coruna | Deportivo La Coruña | #2461AA | #FFFFFF |
| espanyol | Espanyol | #2671B7 | #FFFFFF |
| fenerbahce | Fenerbahçe | #F4CE32 | #162E58 |
| fiorentina | Fiorentina | #713A98 | #FFFFFF |
| flamengo | Flamengo | #C62737 | #151515 |
| galatasaray | Galatasaray | #BA2032 | #F3AF24 |
| gent | Gent | #2262AB | #FFFFFF |
| hertha_berlin | Hertha BSC | #2464AD | #FFFFFF |
| horoya | Horoya AC | #CF2B39 | #FFFFFF |
| huddersfield_town | Huddersfield Town | #2971BA | #FFFFFF |
| inter_milan | Inter | #2454A2 | #151515 |
| juventus | Juventus | #FFFFFF | #151515 |
| lens | Lens | #D32A37 | #F1CC33 |
| liverpool | Liverpool | #CA2935 | #FFFFFF |
| lobos_buap | Lobos BUAP | #FFFFFF | #203856 |
| lokomotiv_moscow | Lokomotiv Moscow | #23754A | #CD2C39 |
| mainz_05 | Mainz 05 | #CA2937 | #FFFFFF |
| manchester_city | Manchester City | #8BC8E8 | #FFFFFF |
| manchester_united | Manchester United | #CD2937 | #151515 |
| napoli | Napoli | #4CA7DA | #FFFFFF |
| new_york_red_bulls | New York Red Bulls | #D02B3C | #FFFFFF |
| olympique_lyon | Olympique Lyonnais | #FFFFFF | #244E9B |
| orlando_city | Orlando City | #653495 | #D8B35C |
| pachuca | Pachuca | #FFFFFF | #1C365A |
| paris_saint_germain | Paris Saint-Germain | #172E55 | #C62C3D |
| porto | Porto | #2452A3 | #FFFFFF |
| psv_eindhoven | PSV Eindhoven | #D22A36 | #FFFFFF |
| rayo_vallecano | Rayo Vallecano | #FFFFFF | #D02C37 |
| real_betis | Real Betis | #28794E | #FFFFFF |
| real_madrid | Real Madrid | #FFFFFF | #C7A34D |
| real_sociedad | Real Sociedad | #2868B0 | #FFFFFF |
| river_plate | River Plate | #FFFFFF | #CF2B38 |
| rostov | Rostov | #F1CE36 | #2458A7 |
| sevilla | Sevilla | #FFFFFF | #C92B38 |
| standard_liege | Standard Liège | #D12A36 | #FFFFFF |
| stoke_city | Stoke City | #D12B37 | #FFFFFF |
| torino | Torino | #74293B | #FFFFFF |
| tottenham_hotspur | Tottenham Hotspur | #FFFFFF | #172B4C |
| vancouver_whitecaps | Vancouver Whitecaps | #FFFFFF | #183451 |
| wolverhampton_wanderers | Wolverhampton Wanderers | #E8AF2F | #151515 |
