# Fotos de jugadores con licencia libre (Wikimedia Commons)

19/10/2026. Autorizado por el usuario.

- Fuente: la foto principal del artículo de Wikipedia de cada jugador, con licencia y autor leídos de los metadatos de Commons por API (sin hotlink: las miniaturas se guardan en `public/assets/players/`).
- Alcance: 231 fotos nuevas + la de Messi (piloto revisado a mano) = 232 de 350 jugadores (150 Global + 200 argentinos). El resto conserva la silueta.
- Criterios: página verificada como futbolista (sin desambiguaciones), licencia libre (dominio público, CC0, CC BY, CC BY-SA), sin restricciones en Commons (se excluyeron 69 con «personality rights»), ancho de origen ≥ 200 px, miniatura de 250 px y ≤ 150 KB, autor y URL de licencia presentes. Descartadas por metadatos incompletos o tamaño: 9.
- Manifiesto: `src/data/player-photos.json` (autor, licencia, enlace a la ficha de Commons, fecha 2026-10-19, nota de que no implica año de carta ni respaldo). La pantalla «Créditos visuales» lista todas.
- Prueba: cada foto del manifiesto debe pertenecer a un jugador del catálogo o de la colección argentina, tener autor, licencia, enlace a Commons y archivo existente, sin ids repetidos.
- Límites: las fotos son de épocas distintas a la carta; las CC BY/BY-SA exigen atribución (visible en créditos); revisar a mano que la foto corresponda al jugador es posible solo por muestreo.

## Segunda tanda (19/10/2026): más cobertura y encuadre
- Causa de la baja cobertura inicial: las fotos de los jugadores más famosos llevan en Commons la etiqueta «personality rights» y se habían excluido (69). En Global quedaron 77 de 150.
- Nueva fuente: otras imágenes de la categoría de Commons de cada persona (enlazada por Wikidata P373, solo si la entidad es humana), con licencia libre y sin restricciones, proporción retrato/cuadrada (alto/ancho 0,95–1,6), nombre del jugador o «cropped/portrait» en el archivo y sin palabras de escenas grupales. Elección por puntaje (retrato, recortada, nombre, año reciente).
- Revisión visual de muestra: se descartaron a mano 12 de 57 candidatas (otra persona con el mismo apellido, escenas con varias personas, vitrina de museo, fotos de época con el jugador muy pequeño). Quedan 45 nuevas: **277 de 350 jugadores con foto (79 %)**; 73 conservan la silueta.
- Encuadre: la foto se ancla arriba (`object-position: 50% 8%`) para que se vea cara y torso; el recorte centrado anterior cortaba el torso en fotos de cuerpo entero.
- Pendiente de decisión: los jugadores solo con fotos «personality rights».
