# Actividad — árbol de categorías — 19/10/2026

- Leídos README, ROADMAP, TASK_BOARD, TEST_PLAN y procedimiento ADR-0002 antes de modificar.
- Pedido: siete categorías principales, actuales/leyendas dentro de cada una, navegación de vuelta y pertenencia de Latinoamérica/Europa por nacionalidad.
- Árbol implementado con dos ediciones por categoría. Se conserva la selección al navegar y el foco en el encabezado. Modos mixtos/futuros se retiran de la navegación principal, conservando contratos y reproducción anteriores.
- Se habilitan los cuatro modos regionales con datos existentes. Latinoamérica incluye México/Centroamérica/Caribe latino; Europa incluye jugadores europeos en cualquier liga. Cristiano portugués permanece elegible. Se conservan homónimos y se filtran técnicos por nacionalidad/versión.
- Conservados: ocho colecciones de 150, Global actual original, Global Legends de 552, valoraciones y presupuestos 100/150M. No se convierten fichas históricas de jugadores aún activos en valoraciones actuales.
- Primera prueba dirigida detectó una suposición incorrecta de test: club_tag de Cristiano es su referencia de carrera Real Madrid, no el empleo actual. Se prueba la independencia de club con una ficha sintética en Al-Nassr y su inclusión real por POR, sin alterar datos históricos.
- Vite ya utiliza el puerto 5173; el intento de abrirlo con navegador integrado vuelve a fallar con net::ERR_CONNECTION_TIMED_OUT. QA visual de escritorio/móvil pendiente; no se declara aprobada por DOM.
- Decisión completa: ADR-0015. Resultados: docs/qa/CATEGORY-TREE.md. Se preservan `.claude/` y el cambio previo en CODEX-005C-stress.json.

## Continuación tras límite de uso

- Corregida consulta de prueba de navegación que asumía un espacio entre texto de strong/span; se selecciona por nombre accesible real. Sin cambio de reglas por ese fallo.
- El usuario reporta partidos 0–0 con ventaja 3–4. Se revisan todos los puntos de entrada: nuevas partidas ya usaban v1; no se afirma que sus dos encuentros fueran antiguos ni que se reprodujeron sin sus semillas.
- Diagnóstico nuevo con catálogos reales revela pareja Global con 43% de 0–0 en v1; v2 baja esa misma pareja a 3,3%. Nuevos pisos de remate/al arco/gol y 24 ocasiones, sin goles agregados artificialmente.
- Reproducción v2 por oportunidad cada 625ms, estadísticas parciales, sonidos y versión de motor visible en tres idiomas; fichas contratadas de técnicos conservan tarjeta. Motor/series antiguos se preservan.
- Revisión completa del pedido original y límites en qa/ACTION-V2.md; ADR-0016 registra fórmulas y decisión arcade. Intento de navegador sobre pestaña local abierta: uso local deshabilitado en Work settings; no se declara QA visual completada.
- Validación final: typecheck/lint/build aprobados; 786 pruebas en 63 archivos, ninguna omitida, 64,12 s. Se conserva aviso de chunk grande. Se preparan commit y push a la misma rama autorizada, sin deploy.
