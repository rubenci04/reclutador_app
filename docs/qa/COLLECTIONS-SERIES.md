# QA — Colecciones, técnicos y series

Fecha: 19/10/2026. Decisiones y procedencia: ADR-0014.

## Resultado ejecutado

| Comprobación | Resultado |
|---|---|
| Importador de los cuatro TXT | PASS: 1.200 registros, 150 por liga/categoría, IDs únicos |
| Validación de los 1.200 registros | PASS: posiciones, nacionalidades, precio y contrato de jugador |
| Fotos nuevas | Ninguna; todos los importados carecen de foto aprobada |
| Partidas de colecciones nuevas | PASS: 45 duelos completos, cinco por cada una de las ocho colecciones y Global Legends; 22 IDs exclusivos, presupuesto y simulación válidos |
| Oferta contextual | PASS: tres técnicos distintos por lado, época/liga y contrato asequible con reserva 1/4/8M; 20 semillas por configuración |
| Serie y reproducción | PASS: tres partidos obligatorios, dos extra en igualdad, penales definitivos, replay sin recalcular ni duplicar registro |
| Conservación de configuración | PASS: mismos onces, bancos, técnicos y estrategias, semillas nuevas reproducibles |
| Online | PASS local: historial de serie coherente para ambos puntos de vista, entrada sin mutación; batería completa incluye pruebas de dos participantes contra PostgreSQL embebido |
| npm run typecheck | PASS |
| npm run lint | PASS |
| npm test -- --reporter=dot | PASS: 60 archivos, 771 pruebas, ninguna omitida, 61,04 s |
| Caso añadido después de la batería completa | PASS: cuatro pruebas de matchSeries.test.ts, incluida historia online de la serie; el resto del cambio posterior es documentación y limpieza de código sin alterar resultados |
| npm run build | PASS; aviso de chunk de AuctionPage de ~1.416 kB sin comprimir (~236 kB gzip) |
| Navegador real | NO COMPLETADO: net::ERR_CONNECTION_TIMED_OUT al abrir http://127.0.0.1:5173/ desde el navegador integrado, aunque Vite informa disponibilidad |

Salidas reproducibles: collections-full-test-run.txt, collections-series-diagnostic.txt y collections-series-final.txt. Tests de importación: src/features/player-catalog/leagueCollections.test.ts. No se configura ni despliega ningún servicio externo.

## Calibración de action-v1

1.500 semillas por escenario; equipos sintéticos con atributos homogéneos para aislar el margen global, sin bonos de calidad/técnico/táctica. Total: 6.000 partidos. Se usan las mismas semillas en todos los escenarios.

| Ventaja global local | Victorias locales | Empates | Derrotas locales | Goles por partido |
|---|---:|---:|---:|---:|
| 0 | 554 (36,9%) | 387 (25,8%) | 559 (37,3%) | 2,77 |
| 2 | 831 (55,4%) | 346 (23,1%) | 323 (21,5%) | 2,80 |
| 3 | 955 (63,7%) | 308 (20,5%) | 237 (15,8%) | 2,88 |
| 5 | 1.172 (78,1%) | 196 (13,1%) | 132 (8,8%) | 3,14 |

Son observaciones sintéticas, no porcentajes garantizados para cualquier equipo. Los atributos por sector, suplentes y ajustes tácticos pueden producir resultados distintos para el mismo margen global. Los tests anteriores de táctica/calidad y resultados grabados siguen pasando con la ruta clásica.

## Datos y límites

- 87 OVR de origen inferiores a 75 entran al juego con piso 75; los originales quedan en la procedencia. El precio y rango de juego se calculan con las funciones existentes. Las escalas S+/S/A/B/C/D de algunos TXT no se presentan como equivalentes a los tiers históricos del proyecto.
- Global Legends contiene 561 versiones tras eliminar coincidencias de nombres completos/deportivos y alias ya registrados. La identificación de otras variantes requiere revisión editorial; no se declara una auditoría universal de identidades.
- Las colecciones importadas son datos aportados, no verificaciones externas. Los clubes figuran como referencia. Los atributos sectoriales son perfiles de diseño por posición. El año 2000 de los históricos es un bucket técnico y no una fecha biográfica comprobada; la tarjeta importada evita presentarlo como tal.
- La lista anterior de 200 argentinos y catalog_v1 permanecen conservadas. El selector Argentina Legends usa ahora la nueva lista de 150. El modo anterior Argentina Clubs sigue accesible.
- Leyendas importadas: clásico 150M por equipo; actuales: 100M. Las pruebas usan reserva de técnico 8M. La configuración personalizada conserva validación y evita iniciar con un presupuesto insuficiente.
- Online nuevo calcula la misma serie desde el primer resultado compartido, con reproducción independiente por navegador. No hay sincronización del botón de avance ni persistencia de la posición de reproducción. Online antiguo conserva el encuentro individual. Prueba contra un Supabase desplegado: NO EJECUTADA en este encargo; no se solicitó configurar servicios.
- Visual pendiente: escritorio, 390/360 px, tres tarjetas, foco, longitud de los tres idiomas, movimiento reducido y ausencia de scroll horizontal. No se infiere su aprobación a partir de jsdom.
- Playtest humano del nuevo balance y auditoría completa de datos/técnicos: pendientes, sin impedir el catálogo editorial jugable solicitado.
