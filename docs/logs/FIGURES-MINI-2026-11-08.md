# Fondo y minijuegos del partido — 08/11/2026

## Diagnóstico

El Worker público documentado sigue una publicación anterior. El push de `c723927` no actualizó ese Worker: en este proyecto GitHub y la publicación con Wrangler son pasos distintos. Una consulta HTTP a la URL pública devolvió 200, pero `assets/index-C98c2nwC.js` no coincidía con el build local. No hay flujo `.github` de despliegue automático en el repositorio. Por eso la ruleta anterior y parte de la simulación actual no se veían en la URL pública. La simulación `FiguresMatchScreen` de esta rama ya detenía el partido por momentos humanos, pero `FiguresMomentLayer` sólo mostraba texto y un botón, con la barra de precisión apagada por defecto.

## Cambios

- Fondo con cancha, arco y pelota que sigue el puntero. Es decorativo, no capta clics ni altera partidas, se queda estático con movimiento reducido y no sigue eventos táctiles.
- Momentos de la simulación de figuras: campo visual, elección de tres sectores, barra de sincronización visible para nuevos usuarios, balón y arquero animados; tiros libres muestran barrera. Penales, tiros al arco, atajadas, defensas, centros, córners, gambetas y pases filtrados usan el mismo control contextual.
- El sector rival se fija con una semilla separada (`seed:figure-mini:segment:type:side`) antes de la elección humana. Acertar o esquivar esa cobertura mueve la calidad entre -0,10 y +0,10 respecto de la precisión, con límites 0–1. `runFiguresMatch` y su flujo aleatorio no cambian. Una preferencia guardada en `off` mantiene la alternativa de un toque.
- Traducciones de las instrucciones y nombre accesible de destinos en es-AR, en y pt-BR.

## Verificación y límites

Typecheck, lint y build aprobaron. La primera suite completa tuvo una sola falla: una prueba de interfaz todavía buscaba el botón anterior `Play!`; se actualizó para la barra activa y pasaron las 17 pruebas focalizadas. La segunda suite completa aprobó: 1628 pruebas, 3 omitidas. QA visual real pendiente: el navegador integrado no pudo abrir el Vite local en la entrega anterior. Los minijuegos modifican la calidad de una oportunidad del motor, no garantizan goles ni crean más ocasiones. El control de barrera es la elección defensiva de sector en la simulación de figuras; no se agregó un segundo motor de barrera.
