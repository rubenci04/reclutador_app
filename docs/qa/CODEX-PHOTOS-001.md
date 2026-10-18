# Fotos de jugadores con licencia libre (Wikimedia Commons)

19/10/2026. Autorizado por el usuario.

- Fuente: la foto principal del artículo de Wikipedia de cada jugador, con licencia y autor leídos de los metadatos de Commons por API (sin hotlink: las miniaturas se guardan en `public/assets/players/`).
- Alcance: 231 fotos nuevas + la de Messi (piloto revisado a mano) = 232 de 350 jugadores (150 Global + 200 argentinos). El resto conserva la silueta.
- Criterios: página verificada como futbolista (sin desambiguaciones), licencia libre (dominio público, CC0, CC BY, CC BY-SA), sin restricciones en Commons (se excluyeron 69 con «personality rights»), ancho de origen ≥ 200 px, miniatura de 250 px y ≤ 150 KB, autor y URL de licencia presentes. Descartadas por metadatos incompletos o tamaño: 9.
- Manifiesto: `src/data/player-photos.json` (autor, licencia, enlace a la ficha de Commons, fecha 2026-10-19, nota de que no implica año de carta ni respaldo). La pantalla «Créditos visuales» lista todas.
- Prueba: cada foto del manifiesto debe pertenecer a un jugador del catálogo o de la colección argentina, tener autor, licencia, enlace a Commons y archivo existente, sin ids repetidos.
- Límites: las fotos son de épocas distintas a la carta; las CC BY/BY-SA exigen atribución (visible en créditos); revisar a mano que la foto corresponda al jugador es posible solo por muestreo.
