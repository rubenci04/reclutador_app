# QA — Simulación y revisión del pedido original

Fecha: 19/10/2026. ADR-0016. Salida de diagnóstico: action-v2-diagnostic.txt.

## Validación final

`npm run typecheck`, `npm run lint` y `npm run build`: PASS. `npm test -- --reporter=dot`: **786 pruebas aprobadas, 63 archivos, ninguna omitida**, 64,12 s. Salida completa: category-action-final-test-run.txt. Incluye integración online local, las tres cartas de técnicos, categorías en tres idiomas, coherencia del simulador, reloj/replay DOM y compatibilidad clásica/v1. Build conserva aviso de tamaño del chunk de AuctionPage (~1.427 kB sin comprimir, ~239 kB gzip), sin error. Supabase desplegado y QA visual real no ejecutados en este encargo.

## Comparación real

Se fija una pareja de onces exclusivos por edición, generada con presupuesto menos 8M de reserva, y se corren las mismas 300 semillas en action-v1/v2. Son 8.400 partidos: 14 ediciones × 300 × 2. Una sola pareja por edición no representa todos los planteles.

| Edición | 0–0 anteriores/nuevos (de 300) | Goles por partido anteriores/nuevos |
|---|---:|---:|
| Global actual | 129 / 10 | 0,93 / 3,00 |
| Global leyendas | 11 / 1 | 3,00 / 5,71 |
| Argentina actual | 20 / 1 | 2,60 / 4,93 |
| Argentina leyendas | 10 / 0 | 2,87 / 5,36 |
| Inglaterra actual | 25 / 3 | 2,41 / 4,84 |
| Inglaterra leyendas | 17 / 2 | 2,55 / 4,77 |
| España actual | 8 / 0 | 3,05 / 5,90 |
| España leyendas | 16 / 0 | 2,70 / 5,24 |
| Brasil actual | 18 / 1 | 2,56 / 5,17 |
| Brasil leyendas | 7 / 0 | 3,24 / 6,03 |
| Latinoamérica actual | 4 / 0 | 3,85 / 7,08 |
| Latinoamérica leyendas | 12 / 0 | 3,10 / 6,07 |
| Europa actual | 1 / 0 | 3,71 / 6,77 |
| Europa leyendas | 13 / 0 | 2,74 / 5,39 |

Todos los goles provienen de eventos del motor; pruebas de coherencia atajadas+goles=remates al arco. Ningún gol forzado para evitar 0–0. El nuevo ritmo es deliberadamente más ofensivo; promedios altos en los regionales requieren playtest, no se declara balance definitivo.

## Ventaja de poder

Equipos sintéticos homogéneos, 1.500 semillas compartidas por margen, sin técnico/táctica/calidad para aislar fuerza base. Se ejecuta cada versión (15.000 partidos en total). No trasladar estos porcentajes a cualquier once real.

| Margen | Victorias del favorito v1/v2 | 0–0 v1/v2 |
|---|---:|---:|
| 0 | 36,9% / 43,7% | 74 / 1 |
| 2 | 55,4% / 63,5% | 70 / 2 |
| 3 | 63,7% / 72,6% | 71 / 1 |
| 4 | 72,1% / 80,4% | 52 / 2 |
| 5 | 78,1% / 87,9% | 37 / 1 |

En igualdad, 43,7% es la victoria del lado local y no un favorito; el resto se reparte entre empate y visitante. Se conservan pruebas previas de simetría, efectos de técnicos/tácticas, sustituciones y resultados clásicos.

## Seguimiento de todo el pedido

| Solicitud desde las cuatro bases | Estado verificable |
|---|---|
| Incorporar actuales/leyendas de las cuatro ligas, valoraciones y rangos, sin fotos | 1.200 versiones incorporadas; precios/tiers según escala existente, valores originales trazables. Auditoría factual completa pendiente |
| Diferencias de 2–3 y 3–5 puntos con más peso | v1 implementada anteriormente; v2 aumenta ocasiones y reduce partidos estériles, comparación anterior/nueva y márgenes documentados |
| Plantel fijo, tres simulaciones y dos desempates | Implementado en libre, CPU, hot-seat y nuevos partidos online; penales si la serie sigue empatada. Reproducción no recalcula |
| Tres técnicos en tarjetas por liga/época | Implementado; técnicos regionales ahora por nacionalidad/versión y tarjeta visual también tras contratarlos |
| Referencia primaria/secundaria, club/selección y técnico repetible | Contrato existente y referencias implementados; repetición entre equipos/colecciones permitida. Auditoría exhaustiva de empleos actuales pendiente |
| Ayudas accesibles sin interrumpir | Sistema de ayuda, resumen de selección, navegación de vuelta, explicación de datos/poder/contratos/serie y estadísticas en vivo, tres idiomas |
| Categorías principales con subcategorías | Siete categorías/catorce ediciones implementadas; región por nacionalidad, incluido Cristiano fuera de Europa |
| Animaciones, emoción, UX/UI | Cancha, goles y cartas existentes; nuevas jugadas individuales, estadísticas crecientes, modelo visible y tarjetas contratadas. QA visual real bloqueada por configuración del navegador |
| 150M para leyendas | Confirmado por el usuario y aplicado también a los dos regionales históricos |
| Push autorizado | Se publica esta continuación en la rama confirmada; sin deploy ni configuración de servicios |

No se presenta lo pendiente como terminado: revisión visual real, playtest humano de este nuevo ritmo, datos biográficos/clubes no revisados y amplitud editorial de catálogos globales siguen documentados.
