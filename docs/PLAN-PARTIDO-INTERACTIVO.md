# Plan — Partido interactivo (3 partes)

Parte 1: motor matemático + plan (esta). Parte 2 y 3: minijuegos sobre los momentos (la pantalla se rediseña ahí).

## ESPECIFICACIÓN

### A. Principios
1. Nada inventado: tiros, posesión, córners y atajadas salen del mismo modelo que decide el resultado.
2. Determinista: misma semilla, mismos datos y mismos resultados de momentos dan el mismo partido en cualquier navegador. Usá un generador derivado de la semilla del duelo (por ejemplo semilla + ":partido") sin alterar el orden de consumo del azar del reparto, la subasta ni la moneda. verifyDuelState y el online tienen que seguir pasando.
3. Guardá engineVersion en cada partido nuevo. Las partidas ya jugadas siguen con el motor viejo, congeladas.
4. Todas las constantes de calibración en un solo archivo.

### B. Modelo
- Fuerza por línea (ataque, mediocampo, defensa, arquero) = media ponderada de los titulares según puesto y formación elegida.
- Se ajusta con el aporte del técnico, la táctica y el cruce de formaciones, usando los valores ya medidos en el juego. No inventes variables nuevas salvo que falte alguna.
- Táctica ofensiva: más ocasiones propias y también más ocasiones del rival.
- Ocasiones por equipo: Poisson cuya media depende de mediocampo propio vs rival, ataque propio vs defensa rival y táctica.
- Cada ocasión tiene una probabilidad de gol (xG) según ataque vs defensa y arquero. Resultados posibles: gol, atajada, desviado, bloqueado. Córners, tiros libres y penales salen como tipos de ocasión.
- Azar acotado: el favorito gana más seguido, pero la sorpresa existe.

### C. Calibración (orientativo, ajustá constantes hasta cumplir)
- Equipos parejos: unos 2,5 goles por partido, ganar/empatar/perder cerca de 37/26/37.
- Diferencia de 10 puntos de media: el favorito gana alrededor del 65%.
- Diferencia de 20 puntos: gana alrededor del 85% y las sorpresas no bajan del 3%.
- Las pruebas verifican rangos, nunca resultados exactos.

### D. Momentos
- 6 por partido, 3 por tiempo (constantes). El motor simula en 6 tramos y después de cada uno puede abrir un momento.
- Se elige según el marcador: 0-0 abrir el marcador; empate desempatar; ganando por 1 ampliar o defender; ganando por 2 o más defender; perdiendo descontar o remontar.
- Tipos de ataque: regate, pase filtrado, centro, tiro, tiro libre, córner, penal. Tipos de defensa: defensa y atajada del arquero.
- Cada momento = {tipo, lado protagonista, dificultad 0–1 (sale de la fuerza relativa), probabilidadBase}. Se resuelve con una calidad 0–1 (de un minijuego o automática, con azar de semilla) y mueve la probabilidad como máximo ±MOMENTO_MAX_OSCILACION (empezar en 12 puntos porcentuales).
- API: una función que corre el partido entero sin pantalla (CPU, online, pruebas) y una forma por pasos para que la pantalla pida tramo a tramo.
- Quién juega: contra CPU, solo la persona. Dos jugadores en la misma compu: cada uno sus momentos. Online, por ahora todo automático y con el mismo resultado en ambos navegadores; el online interactivo queda para otro sprint porque el servidor no valida el partido.

## Estado real del código
- `local-match/simulator.ts` (`simulateMatch`) es el motor viejo, congelado: bloques de 15 min, `calculateTeamStrength`, `probabilityModel.ts`. Sigue sirviendo a las partidas guardadas y al modo en vivo.
- Motor nuevo `local-match/engine/`: `engineConstants.ts` (todas las constantes), `figuresModel.ts` (modelo puro: Poisson, xG, momentos, `playFiguresMatch` y `runFiguresMatch` por pasos), `figuresMatch.ts` (une plantel, técnico, táctica, formación, banco → `MatchResult`; `playMatch` elige motor por `engineVersion`).
- Se reutiliza: `squadQuality`, `rosterAdvantage`, `tacticalAdjustment`/`formationAffinity`, `CoachEffect`, sustituciones `subs-v1` (mismo flujo `${semilla}:subs`), `createSeededRandom` y el formato `MatchResult` (la pantalla `MatchScreen` lo lee sin cambios).
- Quedan sin tocar: reparto, subasta y moneda (otras semillas), `verifyDuelState` (solo recibe `engineVersion` del partido guardado), y el modo «en vivo» (`createDuelSession`, kernel interactivo), que sigue con el motor viejo hasta las partes 2 y 3.
- Pasan al motor nuevo: `startDuelMatch(…, true, ENGINE_VERSION)` (modo rápido local, online, CPU), `nextSeriesMatch` (hereda `engineVersion` del primer partido) y el partido de `DraftPage`.
