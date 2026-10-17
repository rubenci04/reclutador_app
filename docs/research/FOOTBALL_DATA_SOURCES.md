# Fuentes de datos de fútbol para modalidades temáticas

Fecha de revisión: 17/10/2026. Esta evaluación informa una futura importación editorial; El Reclutador no consulta estos servicios durante una partida y no incluye claves en el frontend.

## Criterio de aceptación de datos

Cada afirmación histórica debe poder enlazarse a una fuente, guardar proveedor, identificador externo, fecha de consulta y estado `verified`, `unverified` o `unknown`. La ausencia de una respuesta o de cobertura no prueba una ausencia histórica. Los datos desconocidos se omiten de los filtros, no se convierten en `false` ni se rellenan.

El alcance exacto de Mundial 1986, Mundial 2022, Copa América 1995, Copa América 2024, Primera División argentina, Brasileirão y una liga europea queda **sin confirmar** hasta ejecutar una extracción de prueba contra el repositorio, plan y temporada concretos. La documentación de un proveedor no acredita por sí misma jugadores, convocatorias o participaciones individuales.

## Evaluación inicial

| Fuente | Documentación y cobertura declarada | Acceso e histórico | Reutilización y decisión |
|---|---|---|---|
| Wikidata | [Licencia](https://www.wikidata.org/wiki/Wikidata:Licensing) y [Linked Data Interface](https://www.wikidata.org/wiki/Help:Linked_Data_Interface). Es un grafo generalista que puede enlazar personas, clubes, competiciones y fechas. | Su interfaz y endpoint requieren consultas respetuosas, `User-Agent` y manejo de 429. La completitud de cada edición no está garantizada. | Datos estructurados CC0 según su política. Candidato inicial para identidad y enlaces, siempre con revisión de cada afirmación deportiva. |
| OpenFootball | [Sitio oficial](https://openfootball.github.io/) describe football.db, formato de datos y scripts. | Publica colecciones versionadas de ligas y torneos, con cobertura variable por repositorio; no se verificó aún una etiqueta que cubra los eventos objetivo. | El sitio declara sus datos en dominio público. Importar solo archivos/etiquetas concretos tras revisar su contenido, no inferir carreras ni planteles desde nombres similares. |
| API-Football | La [guía oficial](https://www.api-football.com/news/post/how-to-get-started-with-api-football-the-complete-beginners-guide) declara ligas y copas; la [referencia v3](https://api-sports.io/documentation/football/v3) permite descubrir la cobertura por liga y temporada. | La [política de cuotas](https://www.api-football.com/news/post/how-to-optimize-api-sports-calls-and-quota-usage) publica límites que dependen del plan. La guía indica que el histórico profundo depende del plan; hay que consultar `coverage` para la temporada objetivo. | No se autorizan credenciales en cliente ni copia masiva. Revisar los [términos](https://www.api-football.com/terms) y el acuerdo comercial antes de persistir o redistribuir resultados. |
| Sportmonks | Su [Football API](https://www.sportmonks.com/football-api/) declara ligas, temporadas y entidades de jugadores. | La documentación de [temporadas](https://docs.sportmonks.com/v3/tutorials-and-guides/tutorials/leagues-and-seasons/seasons) condiciona el histórico a suscripción y señala cobertura en integración progresiva; los planes pueden separar el archivo histórico. | Candidato sujeto a contrato. Confirmar por llamada autenticada la competición/temporada y derechos de uso antes de usar resultados editoriales. |

## Verificación por evento objetivo

| Evento o competencia | Estado | Próxima evidencia necesaria |
|---|---|---|
| Mundial 1986 | No confirmado | Consulta de temporada/edición y lista de participantes con fuente por jugador. |
| Mundial 2022 | No confirmado | Misma consulta, sin extrapolar desde nacionalidad o década. |
| Copa América 1995 | No confirmado | Repositorio/plan concreto y revisión editorial de apariciones. |
| Copa América 2024 | No confirmado | Cobertura del proveedor y evidencia de edición/año por futbolista. |
| Primera División argentina | No confirmado | Definir el ID estable de la competición y carreras verificadas por período. |
| Brasileirão | No confirmado | Definir si se trata de Série A y validar los años de cada trayectoria. |
| Liga europea | No confirmado | Elegir una competición concreta antes de crear una modalidad; «Europa» no es un ID de liga. |

## Arquitectura de importación propuesta

1. Un proceso de backoffice, nunca el runtime del juego, descarga una muestra permitida con el proveedor, versión y fecha registrados.
2. Un adaptador convierte esa muestra al contrato `PlayerMetadata` y asocia los IDs externos con el `plr_*` canónico. Nunca crea un segundo jugador por proveedor.
3. El validador de metadatos rechaza IDs canónicos desconocidos, fuentes mal formadas y grupos de evidencia inválidos.
4. Una revisión editorial confirma identidad, fechas, liga, club y edición. Solo la evidencia marcada `verified` habilita filtros por carrera o competición.
5. La publicación genera un archivo versionado y auditable; las incidencias conservan `unknown` o `unverified`. El motor aplica el archivo local ya aprobado y puede declarar la modalidad no disponible si faltan once y presupuesto.

No se crea un conector, cuenta comercial, tarea automática ni clave de API en esta entrega.
