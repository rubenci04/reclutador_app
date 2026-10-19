# Categorías, trayectorias y banco — 19/10/2026

Se muestra la categoría durante la partida y junto a la carta subastada; los sorteos con categorías distintas muestran ambas. Las 600 cartas históricas importadas tienen períodos del club de referencia y enlace de fuente. Cristiano/United conserva sus dos etapas, sin atribuirle los años de Madrid. Se verifican también Messi/Barcelona, Maradona, Bale, Ramos, Di Stéfano e Hugo Sánchez.

Las tarjetas de técnicos presentan nacionalidad, estado, equipos de referencia, años, fuente y botón separado de contratación. Se corrigieron referencias sin respaldo de Almirón, Méndez, Pusineri, Soso y Veira: representan etapas de carrera, sin certificar empleo actual. Todos los equipos de referencia usados por los técnicos ofrecidos tienen período documentado. Hay 100/102 retratos locales con autor, licencia y fuente; Vaccari y Holan conservan iniciales porque no se encontró una foto reutilizable. Se inspeccionaron imágenes de muestra de Bilardo, Bianchi y Cruyff; no se afirma revisión visual individual de las 100 fotos. Algunas corresponden a su época de futbolista.

Banco y cancha permiten arrastre o dos clics, en ambos sentidos; se resaltan destinos compatibles, se rechazan líneas distintas y se bloquea al confirmar. Se conserva el selector alternativo, nueve formaciones y la tabla de afinidad táctica. Hay mejoras de bordes, contraste, tarjetas y animaciones de cambios, respetando movimiento reducido. Textos y accesibilidad en es-AR, en y pt-BR.

## Procedencia y límites

El importador usa títulos explícitos, redirecciones y alias documentados. Lee únicamente la ficha biográfica, distingue los campos de entrenador de los de jugador, elimina plantillas/referencias y admite múltiples etapas. Las equivalencias de clubes son explícitas. La extracción completa queda en docs/research/REFERENCE-CAREERS-sources.json; el juego recibe solamente los períodos de referencia, reduciendo el JSON de 1.171.113 a 252.076 bytes. `node scripts/audit-reference-coverage.cjs` reproduce la cobertura. Cobertura no equivale a revisión factual independiente de cada dato.

Dos suplementos con fuente: José Jorge González en Rosario Central, 1966–1978, [biografía](https://es.wikipedia.org/wiki/Jos%C3%A9_Jorge_Gonz%C3%A1lez); Dirceu Lopes en Cruzeiro, 1963–1977, [No Ataque](https://noataque.com.br/futebol/brasileirao-serie-a/time/cruzeiro/noticia/2026/03/19/idolo-do-cruzeiro-faz-visita-a-toca-e-tem-conversa-com-jogadores/amp/). El inicio de Dirceu tiene discrepancias entre fuentes (1963, 1964 o 1965); se conserva el período de pertenencia de la fuente enlazada, sin declarar resuelta la discrepancia. Los intervalos pueden incluir préstamos: Bale/Madrid 2013–2022 indica vinculación, sin afirmar participación continua sin cesiones.

## Verificación

- Typecheck y lint aprobados.
- Batería completa: 824 pruebas en 67 archivos aprobadas.
- Build aprobado, con advertencia de chunk grande. Tras compactar referencias, AuctionPage: 1.827,36 kB; 297,21 kB gzip.
- Cobertura: 600/600 cartas históricas importadas y cero referencias de técnicos ofrecidos sin período.
- Gestos DOM con motor real: banco/cancha por clic y arrastre en ambos sentidos, rechazo de otra línea y bloqueo tras confirmar.
- Revisión visual completa en navegador: NO EJECUTADA; `cua.getState()` informa `Local browser use is disabled in Work settings`. No se equipara prueba DOM a playtest visual.

El encargo solicita push a `codex/current-club-audit` en `rubenci04/reclutador_app`. Este push no despliega automáticamente el Worker; no se incluye un nuevo despliegue de Cloudflare.
