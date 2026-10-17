# QA — CODEX-005A · Duelo de Reclutadores

Fecha: 17/10/2026. Rama: `feat/duelo-reclutadores-auctions`.

## Reglas implementadas

Duelo de Reclutadores es ahora la entrada local principal. La persona usuaria puede conservar Draft Libre desde el botón de la presentación. Una semilla visible crea 22 futbolistas reales, únicos y sin alterar el catálogo: once parejas de 1 ARQ, 4 DEF, 3 MED y 3 DEL. El orden de las rondas, el conjunto, el cara o cruz y cada adjudicación son reproducibles desde esa semilla.

El cara o cruz se calcula una única vez al crear la partida y se guarda antes de la animación. Define quién abre; la prioridad alterna en las once rondas. En una puja, la apertura oferta el precio base o pasa; cada contraoferta crece al menos 1M. Pasar retira a quien debía responder. El ganador obtiene el primer jugador por su última oferta y la otra persona recibe el alternativo por su precio base. Si nadie ofrece, se prueba la dirección de prioridad y luego la inversa, sin aceptar una dirección inviable.

Antes de admitir una oferta, el motor calcula si ambos saldos pueden pagar la adjudicación actual y si existe una asignación de todos los pares restantes que termina dentro de 100M por equipo. La máxima oferta segura se muestra en pantalla. No hay precios modificados, montos no enteros, futbolistas compartidos ni saldos negativos.

## Arquitectura

`src/features/recruiter-duel/auctionEngine.ts` contiene el constructor acotado, la máquina de estados, protección de presupuesto, ofertas, pases, adjudicaciones y la única llamada al simulador. `auctionTypes.ts` define el registro estructurado: semilla, pares, cara o cruz, prioridad, ofertas, pases, adjudicaciones, saldos, onces y resultado. `AuctionPage.tsx` solo coordina hot-seat, animación, cartas, turnos y resumen. El motor recibe un catálogo ya elegible, por lo que puede recibir un filtro temático futuro sin relleno externo.

La máquina usa `LOBBY`, `COIN_TOSS`, `REVEAL_PAIR`, `BIDDING`, `ROUND_RESULT`, `NEXT_ROUND`, `TEAMS_COMPLETED`, `SIMULATING` y `MATCH_RESULT`. Tras los once fichajes válidos, llama al simulador existente una vez y reutiliza `MatchScreen` para los quince segundos de reproducción.

Archivos principales: `src/features/recruiter-duel/auctionTypes.ts`, `auctionEngine.ts`, `AuctionPage.tsx` y sus pruebas; `src/features/home/HomePage.tsx`; `src/features/local-match/MatchScreen.tsx`; diccionarios es-AR/en/pt-BR; `README.md`, roadmap, tablero, ADR-0007 y este informe.

## Pruebas ejecutadas

| Comprobación | Resultado |
|---|---|
| Sorteo, posiciones, unicidad y semilla | OK |
| Cara o cruz almacenado y prioridad alternada | OK |
| Precio base, incremento, turno, pase y oferta máxima segura | OK |
| Doble adjudicación, dos onces exclusivos y presupuesto | OK |
| Integración única con simulador | OK |
| 1.000 semillas con once rondas de pases legales | OK — ningún once incompleto, posición inválida, jugador compartido ni saldo negativo |
| Interfaz hot-seat, animación y controles | OK en Testing Library |
| `npm test` | OK — 439 pruebas en 11 archivos |
| `npm run lint` | OK |
| `npm run build` | OK — 87 módulos de Vite |
| `npm run catalog:audit` | OK — B01/B02/B03 parciales aprobados; 150/500 pendiente |

Las comprobaciones se ejecutaron en una copia temporal aislada, restaurada sin red desde `package-lock.json`, porque la carpeta `node_modules` del workspace continúa bloqueada por `lightningcss.win32-x64-msvc.node` durante `npm ci`.

## QA visual manual pendiente

Se intentó abrir `http://127.0.0.1:5173/` en el navegador integrado y devolvió `net::ERR_CONNECTION_REFUSED`; por lo tanto la revisión visual real queda **NO EJECUTADA**. Para probar localmente:

```powershell
cd 'C:\Users\rea_0\Documents\ChatGPT\Fútbol Draft'
npm ci
npm run dev
```

1. Abrir la URL de Vite en escritorio, 390 px y 360 px.
2. Iniciar el duelo, observar el cara o cruz y confirmar que alterna quién abre cada ronda.
3. Hacer una oferta base, una contraoferta de al menos 1M y un pase; revisar saldos y oferta máxima.
4. Completar las once rondas, comprobar 11 fichajes exclusivos por persona y presupuesto no mayor a 100M.
5. Iniciar el partido, esperar 90', reproducirlo y contrastar marcador, eventos y presupuestos.
6. Cambiar es-AR, en y pt-BR durante la presentación, subasta y partido; volver a Draft Libre.

## Pendientes

No se implementaron servidor autoritativo, salas, autenticación, modo online ni CPU pujadora. Las modalidades temáticas siguen sujetas a sus metadatos verificados. El catálogo continúa en 150/500, sin jugadores nuevos en esta entrega.

## Estado de Git

El cierre crea un commit local específico en `feat/duelo-reclutadores-auctions`. No se realiza push ni deploy.
