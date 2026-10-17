# Estrategia de miniaturas de jugadores

Las tarjetas actuales no descargan imágenes ni contienen miniaturas: usan una presentación CSS local. El contrato `PlayerCardVisual.thumbnail` admite una URL solo cuando se conserve su procedencia verificable: URL fuente, licencia y atribución.

Para una futura carga editorial, Wikimedia Commons es la primera opción por sus fichas de archivo y licencias explícitas. Wikidata puede servir para localizar el ítem y las referencias de una imagen, pero no autoriza por sí solo el uso de un archivo: se debe comprobar la licencia concreta en Commons, conservar la atribución indicada y revisar que represente la versión editorial correcta del futbolista.

La importación seguirá siendo manual y revisada. No habrá consultas a APIs ni descargas en runtime, y se descartarán archivos con licencia ausente, ambigua o incompatible.
