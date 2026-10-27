# Partido interactivo — Parte 1: motor por cifras + momentos (27/10/2026)

Rama `claude/sprint-9-10`. Sin despliegue, sin cambios en Supabase. Producción sigue en 862ebe38.

## Qué se hizo
- Motor nuevo `figures-v1` (`src/features/local-match/engine/`), tabla de constantes única en `engineConstants.ts`.
- Fuerza por línea (ataque, mediocampo, defensa, arquero) = media ponderada de los 11 según puesto (la formación cambia cuántos hay de cada uno); se le suman plantel (calidad + ventaja de plantel), técnico, táctica y afinidad formación-táctica, con los valores ya medidos.
- Ocasiones por tramo de 15 min: Poisson (mediocampo propio vs rival + ataque vs defensa + tempo de la táctica, que también abre el juego del rival). Cada ocasión: tipo (juego abierto, córner, tiro libre, penal), xG según ataque vs defensa y vs arquero, y resultado gol / atajada / desviado / bloqueado. Tiros, a puerta, atajadas, córners, recuperaciones y posesión se cuentan de esas mismas ocasiones.
- Momentos: hasta 1 por tramo (3 por tiempo, 6 por partido), elegidos por marcador; mueven la probabilidad de gol de su ocasión como máximo ±12 puntos. API completa (`playFiguresMatch`) y por pasos (`runFiguresMatch` / `simulateFiguresMatch` con `humanSides` y `qualities`).
- Azar: flujo `semilla + ":partido"`; reparto, subasta y moneda no se tocan. Cada partido nuevo guarda `engineVersion: 'figures-v1'` y sus `moments`. Los guardados siguen con `simulateMatch`.
- Pantalla: sin rediseño; el repaso del partido ajusta el intervalo para durar lo mismo (≈15 s) con un número variable de ocasiones.

## Calibración (20.000 partidos por caso, `node scripts/calibrate-figures-engine.mjs`)
Líneas parejas en 85 salvo lo indicado; el local es el primero. Gana/empata/pierde en %.

| Caso | Gana / Empata / Pierde (local) | Goles | Goles local - visitante | Tiros | A puerta | Córners | Penales | Momentos |
|---|---|---|---|---|---|---|---|---|
| Parejos (0) | 36.7 / 27.4 / 35.8 | 2.50 | 1.26 - 1.24 | 24.81 | 11.07 | 3.48 | 0.35 | 5.71 |
| Favorito +5 | 50.9 / 25.3 / 23.8 | 2.55 | 1.57 - 0.98 | 25.00 | 11.12 | 3.48 | 0.35 | 5.67 |
| Favorito +10 | 64.7 / 20.6 / 14.7 | 2.78 | 1.97 - 0.81 | 25.75 | 11.50 | 3.60 | 0.36 | 5.59 |
| Favorito +15 | 77.1 / 15.0 / 7.9 | 3.10 | 2.45 - 0.64 | 26.78 | 11.97 | 3.75 | 0.38 | 5.43 |
| Favorito +20 | 87.3 / 9.2 / 3.5 | 3.60 | 3.08 - 0.51 | 28.36 | 12.79 | 3.98 | 0.40 | 5.19 |
| Ataque +10 vs defensa igual | 49.1 / 23.4 / 27.4 | 2.98 | 1.73 - 1.24 | 26.68 | 11.89 | 3.76 | 0.38 | 5.73 |
| Mediocampo +10 | 45.3 / 26.1 / 28.6 | 2.54 | 1.45 - 1.10 | 25.07 | 11.20 | 3.48 | 0.35 | 5.69 |
| Arquero +10 (rival) | 34.4 / 26.7 / 38.9 | 2.43 | 1.16 - 1.26 | 24.90 | 11.38 | 3.48 | 0.35 | 5.71 |
| Táctica ofensiva (ambos 85) | 38.0 / 24.5 / 37.4 | 2.88 | 1.45 - 1.43 | 28.76 | 12.80 | 4.03 | 0.40 | 5.79 |
| Bloque bajo (ambos 85) | 35.6 / 29.2 / 35.3 | 2.14 | 1.07 - 1.07 | 21.17 | 9.44 | 2.96 | 0.29 | 5.59 |

Objetivos cumplidos: parejos 36,7/27,4/35,8 con 2,50 goles; +10 puntos → 64,7%; +20 puntos → 87,3% con 3,5% de sorpresas. Las pruebas (`figuresModel.test.ts`) verifican rangos con 4.000 partidos por caso, nunca marcadores exactos.

## Observaciones
- El arquero pesa poco por sí solo (+10 puntos en el rival baja ~2 puntos la victoria); se puede subir `K_XG_KEEPER` sin tocar el resto si se quiere más peso.
- Penales ≈ 0,35 por partido; córners como ocasión ≈ 3,5 (son los que terminan en remate, no todos los córners).
- Modo «en vivo» (el que la pantalla ofrece por defecto contra CPU) sigue con el motor viejo hasta las partes 2 y 3; el motor nuevo se ve en «Simulación rápida», en el online y en el partido de `DraftPage`.
- El online sigue todo automático: ambos navegadores calculan el mismo partido de la semilla; `verifyDuelState` lo recalcula con el `engineVersion` guardado.
