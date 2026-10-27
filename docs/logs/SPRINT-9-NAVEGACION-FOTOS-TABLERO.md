# Sprint 9 — Navegación de categorías, muñecos con apariencia real, leyendas a 200 y decisiones con un toque

## A. Navegación de categorías
- Categoría por defecto: **Liga Argentina, Actuales** (`DEFAULT_MODE` en `categoryTree.ts`), en el juego local y en el anfitrión online.
- `ModeSelector`: tocar una categoría la **selecciona de inmediato** (Actuales, o la edición ya elegida si pertenece a esa categoría, o la primera disponible), la abre y llama a `onChange`; tocar Actuales/Leyendas también. Cada elección lleva la vista al hero (`#edition-hero`, scroll suave o instantáneo con prefers-reduced-motion) y se anuncia en un `aria-live="polite"` («Categoría elegida: …»).
- Corrige el error reportado: el título del hero mostraba la categoría anterior hasta tocar una edición. Pruebas: categoría por defecto, clic en categoría, clic en modalidad, anuncio, y navegar (ir y volver al menú) sin que quede el título viejo; presupuesto coherente.
- El invitado online no ve el selector (solo el anfitrión).

## B. Sin fotos
- `SHOW_PLAYER_PHOTOS = false` (`src/config/product.ts`): `visualAssets` no devuelve fotos de jugadores ni de técnicos, no hay créditos de fotos, y los textos que las mencionaban se quitaron.
- Fotos movidas a `assets-archive/photos/` (≈ 11 MB menos en cada publicación); manifiestos intactos.
- `CoachAvatar` (saco, camisa y corbata, tonos neutros) en `CoachPortrait`/`CoachMarket`, en el mismo marco que `PlayerAvatar`.
- `docs/AVATARS-DESIGN.md`: situación, tres opciones, recomendación (no es asesoramiento legal).

### Apariencia de cada jugador (CSV cargado a mano por el dueño)
`docs/JUGADORES-APARIENCIA-COMPLETO.csv` (1.551 filas) se importa con `node scripts/import-player-traits.mjs docs/JUGADORES-APARIENCIA-COMPLETO.csv` a `src/data/player-appearance.json` (el script ya no pisa `player-foot.json` si el CSV no trae `pie_habil`). `PlayerAvatar` dibuja: tono de piel, largo y **color de pelo**, **textura** (rizado/crespo con rulos, ondulado, liso), **vello facial** (bigote, barba corta/larga, candado, patillas), **forma de cara**, **porte** (ancho de hombros), **orejas** y **una marca** (cicatriz, lunar, tatuaje en el cuello, cejas pobladas). Anteojos: ninguno en los datos. Cobertura: 1.466 de las 2.139 cartas jugables; las demás (sobre todo Italia y México, más algunas de Sudamérica y Europa) siguen con el muñeco neutro hasta que se carguen. Los rasgos no se infieren de fotos y no pretenden parecerse a la persona.

## C. Decisiones con un solo toque
- Ajuste «Barra de precisión» (apagado por defecto, `localStorage` con try/catch, en el partido y en la tanda de penales). Apagado: un toque en un carril/destino resuelve con precisión 0,5, resalta el destino 220 ms (sin demora con movimiento reducido) y un segundo toque sobre la misma jugada se ignora (atado a `momentKey`). Encendido: flujo de dos pasos como antes.
- Las opciones quedan en un `<details>` cerrado «Elegir con botones» (también un clic cada una; flechas + Enter/Espacio como única acción; «resolver con el sistema tradicional» intacto). Ayuda: «Tocá un destino para jugar».
- Las decisiones que ya eran de un toque (pase, arco, córner, cabezazo) siguen resolviendo al instante, sin la pausa de 220 ms.

## D. Leyendas a 200 (legends-200-v1)
- **Pasan a 200:** Global Leyendas (de los 960 legados del maestro), Sudamérica Leyendas y Europa Leyendas (los 150 rankeados + relleno provisional documentado) e Italia Leyendas (usa sus filas 151-200, que estaban ocultas).
- **Siguen en 150:** Argentina, Brasil, México, España e Inglaterra Leyendas. La base solo trae 150 filas legendarias por liga; llegar a 200 necesita 50 filas editoriales nuevas por liga (como el CSV de apariencia).
- Las categorías Actuales siguen en 150. Las partidas jugadas antes del cambio se conservan congeladas (`preLegends200Collections.json`) para que sus repeticiones sean idénticas.
- Textos de «colecciones» actualizados en es-AR, en y pt-BR.

## Pendiente
- Cargar 50 leyendas más para Argentina, Brasil, México, España e Inglaterra (el dueño puede pasar un CSV como el de apariencia) y apariencia de las ~670 cartas sin fila.
- Revisión visual en celular de los muñecos nuevos, del selector de categorías y del tablero de un toque.
