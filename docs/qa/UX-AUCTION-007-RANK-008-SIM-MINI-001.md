# UX-AUCTION-007 + RANK-008 + SIM-MINI-001

Base: `main` 6b32333 + el trabajo sin commit de la sesión anterior (conservado, no reescrito).

## 1. Mesa de subastas (UX-AUCTION-007)
Composición única, sin paneles nuevos encima de los anteriores:
1. **Encabezado sticky único** (`AuctionHeader`): equipo · saldo grande · Fichajes x/11 · Descartes n/N · Ronda r/22, con «Desglose» (presupuesto, gastado, reserva). Los datos siguen saliendo del motor (`buildWalletModel`/`buildHudModel`). La billetera clásica se mantiene fuera de la subasta (técnico/suplentes).
2. **Rival discreto** (`AuctionHud` compacto, ya no sticky): una línea con el rival y un desplegable «Gastos, cupos y canchas» con los paneles completos.
3. **Una sola ficha** del sorteado (`PlayerIdentity`): imagen, nombre, OVR, ranking `#n / 150`, país, posición, club y precio base; atributos, rol, tier, pie y trayectoria quedan en «Ver ficha completa».
4. **Puja** (`AuctionBidPanel`): oferta actual y mínima, ajustes rápidos con «Máx. seguro» (único lugar del máximo), importe, OFERTAR/PASAR; en ≥ 900 px la ficha y la puja van lado a lado.
5. **Mercado en Vivo:** una novedad y el historial desplegable (sin toasts).
Eliminado: segunda ficha (`AuctionPlayerBar`), el dado decorativo, la ronda repetida, el «Turno de X», el saldo «Disponible», el máximo repetido y el chip de reserva/máximo de la billetera durante la subasta. Reglas económicas, transiciones, hot-seat y online sin cambios. Pruebas de pantalla actualizadas (una ficha, un encabezado, nombre solo en el encabezado, saldo/máximo sin duplicar).

## 2. Global Top 150 (RANK-008)
- **Global Actual:** 150 únicos por OVR efectivo con desempate 2026 → ranking editorial de su liga → id. Mín/máx/media 85/99/88,3; ARQ 18 (85–93), DEF 38 (85–94), MED 48 (85–96), DEL 46 (85–99). Origen: catálogo 59, España 22, Italia 23, Inglaterra 23, EUR 13, SAM 5, Brasil 5 (sin cuotas por liga; Argentina y México no alcanzan el corte de 85). Nadie bajo 80 y ningún excluido supera, en su posición, al más débil incluido.
- **Global Leyendas:** candidatos = las 177 nominaciones archivadas + leyendas de ligas europeas nunca nominadas (413 en total, una edición por persona por identidad y nombre completo); 150 elegidos con Messi #1, Maradona #2, Pelé #3 (OVR originales 99/98/99) y el resto por OVR. 92–99, media 93,9; ARQ 10, DEF 24, MED 49, DEL 67; 34 recién llegadas (Beckenbauer, Müller, Eusébio, Yashin…). Las leyendas locales argentinas/brasileñas/mexicanas no nominadas se quedan en sus categorías; la edición mundial no se confunde con la rebalanceada local. El archivo de 177 y el maestro quedan intactos.
- Auditoría con excluidos y motivo: `docs/qa/GLOBAL-TOP-150-audit.json` (generado por `globalTop.test.ts`). Pools anteriores (1.039 y 177) congelados en `preRank008Collections.json`.
- **Ranking `#/150`** (`categoryRanking.ts`): una vez por categoría; Argentina Actual abre con Paredes #1 y Di María #2 y sigue por OVR efectivo (Almada #3; Correa, Otamendi, Ascacíbar, Aranda y Flores reubicados solo por su OVR). **No se modificó ningún OVR** (cambiarlos rompería la clave de repeticiones). En cruces se usa la categoría de cada participante; se oculta en partidas históricas.

## 3. Gambeta (SIM-MINI-001)
Conectada de punta a punta en el recorrido real (Jugar contra CPU → comprar → partido en vivo → Momento Destacado): `LivePlayPanel` muestra `DribblePanel` en el nodo `DRIBBLE`; `LiveMatchScreen` envía carril y precisión y muestra `DribbleScene` con el desenlace confirmado (carril elegido, carril cubierto, éxito o recuperación rival). Carril por clic/toque, deslizamiento o flechas; barra de precisión (Espacio/botón «¡Ahora!»); botón «Resolver con el sistema tradicional»; con movimiento reducido no hay barra animada. Como máximo una por partido, solo local contra CPU (opción `dribble-mini-v1`; online y simulación rápida no la reciben). Resultado y precisión quedan en el registro de la sesión (`plays`). Probado en el navegador a 1280 px (captura `img/sim-mini-001-dribble-1280.jpg`): apareció en el minuto 75, «¡Pasó por Izquierda! El defensor cubría: Centro» y el ataque continuó con centro/remate.

## 4. Verificación
`dribble.test.ts` (motor), `dribbleScreen.test.tsx` (pantalla real: ratón, teclado, tradicional, ausencia sin la opción), `globalTop.test.ts` (150 únicos, posiciones, identidad, ranking, cruces, compatibilidad, viabilidad de 8 sorteos por categoría). typecheck, lint (3 avisos react-refresh en `DribblePanel`) y build: OK.
**No verificado:** la gambeta a 375 px (solo a 1280); la subasta sí a 375 y 1280 (capturas en `img/`).

## Resultado final
Suite completa: 124 archivos, 1.324 pruebas aprobadas, 0 fallidas (una primera ejecución mostró 3 fallos por expectativas de la pantalla/Global anteriores; se corrigieron y se repitió la suite completa).
