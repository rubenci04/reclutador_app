# Playtest ampliado — 19/10/2026

Implementación: ADR-0017. Los resultados siguientes son de diseño de juego y muestras reproducibles, no predicciones de fútbol real.

## Caso reportado reproducido

Los dos onces, Bianchi con control y Bilardo con contraataque reproducen exactamente **92,7 / 90,7**, ataque 87,98 / 92,93, defensa 91,48 / 92,67 y medio 98,76 / 86,42.

| Motor | Victorias / 1.500 | Empates | Derrotas | 0–0 | Riesgo estimado de tres derrotas independientes |
| --- | --- | --- | --- | --- | --- |
| action-v2 | 701 (46,7%) | 280 | 519 | 7 | 4,14% |
| action-v3 | 979 (65,3%) | 253 | 268 | 15 | 0,57% |

En la secuencia ensayada hay 53 ventanas de tres derrotas en v2 y 9 en v3. El riesgo estimado es p(derrota)^3, no garantía ni intervalo de confianza. La secuencia es determinista por semilla. Con atributos homogéneos, +2 puntos produce 73,5% de victorias y +3 produce 86,6%; +4/+5 son muy determinantes (93,5%/98,2%). Ese último extremo requiere seguir observándose en playtest; no ocultar que la calibración favorece fuertemente la ventaja solicitada. Datos completos: ACTION-V3-calibration.json.

## Catálogos y rareza

Catorce ediciones entre 150 y 300. Global actual 300, Global leyendas 300; las cuatro ligas mantienen sus 150 actuales y 150 históricos originales. Latinoamérica actuales/leyendas 300; Europa conserva sus disponibles dentro del rango. Cantidades exactas en COLLECTION-SIZES.json. Los registros fuera del recorte siguen en los archivos fuente.

160 sorteos con rarity-v2 por colección: Global 300 identidades observadas y 5 cartas S+ en total; Global leyendas 299 identidades y 8 S+; España leyendas 150 identidades y 9 S+. Cada colección produce 160 secuencias distintas, cuotas 2/8/6/6 y presupuesto viable. El peso inicial 0,25 no es una probabilidad final de 25%; cupos, historia y economía intervienen. Ver RARITY-*.json. No se inventan S+ en categorías que no los tienen.

## Flujo y presentación comprobados

- Navegador local: menú Global muestra 300/300 y 100M/150M; cruce leyendas mundiales vs Argentina actual con presupuesto común; guía modal, contratación de Ferguson con foto, control del mediocampo, revelación, partido action-v3, explicación, vuelta con mismo equipo y Nueva partida que retorna al menú. Serie cerrada 2–0 en victorias.
- Se revisó el cuadro de seis tácticas en pantalla, columnas completas y las combinaciones solicitadas. Se comprobó compra de primer suplente, actualización del mercado y mensajes de intercambio manual. Las nueve composiciones se validan mediante dominio y simulación; no se afirma haber probado visualmente cada formación.
- Capturas locales: screenshots/playtest-guide.jpg, playtest-result.jpg, playtest-mobile.jpg y playtest-tactics.jpg. Móvil 390×844: el modal cabe sin desborde horizontal (clientWidth y scrollWidth 375), con scroll interno. Se restauró el viewport. No se afirma QA visual completa en cada idioma.
- Fotos de cinco técnicos inspeccionadas individualmente; manifest con autor/licencia y créditos. Avatares, fuentes, rol y guías verificados mediante DOM en tres idiomas. Camisetas de cancha usan colores del club/selección de referencia; no se convierte nacionalidad en selección automáticamente. Escudo SVG original con paneles de color y exterior transparente.
- La última revisión visual de camiseta/escudo quedó impedida al deshabilitarse Browser Use en Work. Se conserva evidencia visual anterior y verificación DOM del SVG; no se sortea ese impedimento con otra tecnología.
- Online: prueba contra PostgreSQL local del inicio de categorías mixtas con contrato LOBBY, moneda y paso a TEAMS_COMPLETED. También se ejecutan las pruebas existentes de turnos/estrategias/versiones. No se afirma playtest de producción en dos dispositivos.

## Límites y continuidad

Nueve formaciones: 4-3-3, 4-4-2, 4-3-1-2, 4-2-3-1, 3-4-3, 5-3-2, 4-2-2-2, 5-4-1 y 4-5-1. Solo se habilitan con jugadores propios suficientes; hasta tres reservas de campo, incluso dos de la misma línea. Cambio de forma ordena automáticamente por rating y posición; los roles específicos documentados informan al usuario, pero la aptitud individual no documentada sigue UNKNOWN.

Las imágenes de cinco técnicos no constituyen cobertura de todos. Períodos por club y estado de actividad faltantes siguen marcados como pendientes. Los ratings no fueron auditados individualmente; el pedido nuevo de revisar OVR queda registrado como siguiente trabajo factual/editorial. Global conserva valoraciones de referencia originales de jugadores como Messi y Cristiano; no afirmar que representan rendimiento medido en 2026.

Revancha local conserva categorías. Online sale al menú de salas: recrear sala conserva la selección del anfitrión en esta sesión, pero no es una reconexión automática de los mismos participantes. Categorías diferentes se explican como sorteo independiente, no subasta compartida. No hubo cambios de esquema o servicios externos.

## Controles

Resultado final de typecheck, lint, test, build y publicación: se registra al completar la ejecución. Build informa el aviso de tamaño del chunk de catálogo (~1,6MB minificado, ~261KB gzip); se conserva como limitación de rendimiento, no como error de compilación.

Validación final: npm run typecheck, npm run lint y npm run build aprobados; npm test: **810/810**, 66 archivos, 64,64 s. Build final action-v3 generado con los SVG, nueve formaciones y tres idiomas. Git diff --check sin errores (avisos de normalización CRLF del entorno).
