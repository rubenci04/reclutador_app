# Medios, fuentes y formaciones — 19/10/2026

Consulta de documentación primaria para el pedido del usuario:

| Alternativa | Evidencia | Decisión |
| --- | --- | --- |
| TheSportsDB | [Documentación](https://www.thesportsdb.com/documentation), [condiciones](https://www.thesportsdb.com/docs_terms_of_use.php): nivel gratuito con 30 solicitudes/minuto; una fotografía de terceros conserva sus propios derechos | No añadir dependencia a la partida ni asumir licencia por existir una URL. Candidato para importación revisada |
| football-data.org | [Precios](https://www.football-data.org/pricing) | Datos deportivos; no resuelve por sí solo una licencia fotográfica |
| Wikimedia Commons | [Imageinfo](https://www.mediawiki.org/wiki/API:Imageinfo), metadatos de autor y licencia | Importación local de cinco identidades revisadas; manifiesto src/data/coach-photos.json, miniaturas 250px, créditos visibles. Script reproducible scripts/import-coach-photos.mjs |
| Personaje propio | SVG del proyecto, camiseta con paleta editorial | Disponible sin red para cualquier jugador sin foto o ante error de carga; no es retrato ni escudo oficial |

Fotos comprobadas visualmente: Lionel Scaloni, Diego Simeone, Pep Guardiola, Carlo Ancelotti y Alex Ferguson. No se afirma que correspondan al club, cargo o año de referencia actual; la foto de Scaloni es de su etapa de jugador. Licencias y autores completos en el manifiesto y créditos. La presentación con CSS recorta visualmente, sin modificar el archivo descargado.

Períodos destacados: [Messi en FC Barcelona](https://players.fcbarcelona.com/en/player/548-messi-lionel-andres-messi-cuccitini), [Cristiano en Real Madrid](https://www.realmadrid.com/en-US/the-club/history/football-legends/cristiano-ronaldo-dos-santos-aveiro), [Neuer en Bayern desde 2011](https://fcbayern.com/en/teams/first-team/manuel-neuer). Se reutilizan también los períodos con fuente verificada de los 200 registros argentinos existentes, mediante igualdad de nombre o alias explícitos. Nunca se deduce un período a partir del año técnico 2000 de las importaciones.

Referencia de entrenamiento: [FIFA, 4-3-3 contra 5-3-2](https://www.fifatrainingcentre.com/en/practice/elite-sessions/in-possession/attacking-in-a-4-3-3-formation-v-5-3-2-defensive-set-up.php). La relación entre amplitud, ocupación y táctica orienta el diseño; los valores de bonificación pertenecen al juego. El rol específico se traduce desde el documento aportado y no convierte automáticamente una aptitud deportiva desconocida en verificada.
