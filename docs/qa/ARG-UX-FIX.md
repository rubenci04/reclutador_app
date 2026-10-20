# ARG-UX-FIX — 20/10/2026

Base ea0cbdf; rama codex/argentina-ratings-draw-roster.

## Valoraciones

111/150 argentinos actuales terminaban con 75 por el piso de ratings (77 inferiores a 75 y 34 exactamente 75). La edición ARGENTINA_CURRENT ahora aplica una capa editorial separada, conservando players.json y LEAGUE_PLAYERS como referencia original. Paredes 85, Di María 84, Almada 83, Cetré 82, Merentiel 81, Correa/Villa/Aranda/Leonel Flores 80. Flores confirmado por el usuario. Los restantes se distribuyen según sourceRank: 75 + floor((150-rank)/20). Es una propuesta de balance de juego, no una evaluación factual individual. Resultado: once medias diferentes, 20/150 con 75. Atributos desplazados por la diferencia de OVR con límites 40..99; precios calculados por la fórmula existente.

Solo afecta la edición argentina actual; Global, otras ligas y leyendas conservan su balance. No se cambian IDs, clubes, posiciones, nacionalidades ni pie. Las huellas DATA-FOOT-001 se siguen ejecutando sobre su balance original para no presentar la recalibración autorizada como regresión de metadata. No se modifican fórmulas del simulador ni versiones persistidas. Pendiente revisión individual del resto de las bandas editoriales y playtest humano.

## Sorteo

Con banco configurado había rondas de suplentes antes de completar titulares. nextAuctionRound prioriza una posición que aún tenga huecos en algún once; una vez completos ambos, termina los bancos configurados. Reordena únicamente cartas pendientes, sin eliminarlas, duplicarlas ni consumir RNG. Se conserva viabilidad económica y exclusividad. Si faltan ARQ/DEF no se presentan cartas de banco MED/DEL mientras queden esos titulares pendientes. El clásico sin banco conserva su orden al ser ya viables sus cuotas.

Prueba específica: 40 semillas con banco, CPU simulada que reclama y humano que pasa, controles en cada carta, completion de 28 jugadores únicos y casos con CPU completa antes del humano. Categorías distintas mantienen el filtro existente por plazas vacantes de su sorteo independiente. No se cambió ese motor.

## Plantel y técnicos

Ayuda de formación y cambios por lista plegados; una instrucción corta y cancha como interacción principal. Con banco interactivo no se duplica el botón EDITAR FORMACIÓN; sin banco se conserva. Confirmación/errores y gestos de cambio siguen funcionando. Se retira el segundo TeamProgressBoard de la fase TEAMS_COMPLETED, conservando resumen y cancha de organización.

Técnicos: foto, nombre, nivel, enfoque, precio y contratar visibles; biografía, referencia y bonus bajo Ficha y bonus. Explicación general plegada; sin técnico sigue accesible. También se simplifica el técnico ya contratado. Mismos efectos y contratos. Textos nuevos es-AR/en/pt-BR.

## Validación

- npm run typecheck, lint, build y catalog: PASS. Aviso existente de bundle >500 kB.
- npm test: 884/884, 80 archivos, 80,98 s. Salida ARG-UX-FIX-tests.txt.
- Nuevas pruebas de balance, prioridad posicional y presentación/acciones en tres idiomas. Suite inicial encontró una expectativa del tablero duplicado que se retiró; actualizada sin eliminar la prueba del flujo completo.
- QA real con componentes de producción en fixture temporal local de once completado con banco y técnicos, eliminado al terminar. Geometría 360/390/768/1280 sin desborde horizontal; inspección visual de capturas completas a 390/1280. Evidencia ARG-UX-FIX-390.png y ARG-UX-FIX-1280.png. No se afirma recorrido manual completo de una partida ni auditoría de lector de pantalla. Las capturas del usuario son la referencia anterior.
- Datos fuente/roles verificados intactos. Cambios ajenos .claude y CODEX-005C-stress preservados; informes regenerados por suite restaurados. Sin push, deploy, migraciones o Supabase.
