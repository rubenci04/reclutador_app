# Avatares de jugadores y técnicos: situación y opciones

> **Aviso:** este documento es una nota de diseño y de riesgo, **no es asesoramiento legal**. Antes de publicar con fotos reales, con rasgos de personas reales o con sus nombres y clubes, conviene consultar a un abogado de propiedad intelectual y de derechos de imagen de los países donde se publique.

## 1. Situación actual (Sprint 9)
- La bandera `SHOW_PLAYER_PHOTOS` (`src/config/product.ts`) está en `false`. Ninguna pantalla pide ni muestra fotos; jugadores y técnicos se dibujan como figuras (`PlayerAvatar` con la camiseta del club; `CoachAvatar` con saco, camisa y corbata, en tonos neutros). No se muestran créditos de fotos.
- Los archivos de fotos ya no se publican: están en `assets-archive/photos/{players,coaches}` (≈ 11 MB fuera de `public/`). Los manifiestos `src/data/player-photos.json` y `src/data/coach-photos.json` se conservan con su autoría y licencia.
- Había **274 jugadores** y **100 técnicos** con foto de **Wikimedia Commons**. Cobertura aproximada: 274 de las 2.139 cartas jugables (≈ 13 %), es decir, la gran mayoría ya se veía con figura. Para técnicos: 100 fotos sobre el pool de técnicos del juego.
- Licencias de las 274 fotos de jugadores: dominio público 51; CC BY-SA 3.0 75 (+ 5 variantes nacionales «3.0 nl/at»); CC BY-SA 4.0 41; CC BY-SA 2.0 33; CC BY-SA 1.0 1; CC BY 2.0 26; CC BY 3.0 18; CC BY 4.0 24. Técnicos: dominio público 19; CC0 7; CC BY-SA 4.0 24; CC BY-SA 3.0 12 (+1 «nl»); CC BY-SA 2.0 13; CC BY 4.0 4; CC BY 3.0 13; CC BY 2.0 7.
- Obligaciones típicas: **CC BY** exige atribución (autor, fuente, licencia, indicar cambios); **CC BY-SA** además exige compartir las adaptaciones con la misma licencia (las miniaturas recortadas son adaptaciones); dominio público y CC0 no exigen atribución. Las fotos Commons solucionan el derecho de autor del fotógrafo, **no** el derecho a la imagen ni el uso comercial de la persona retratada, ni las marcas de los clubes que aparezcan.

## 2. Tres opciones

### (a) Fotos reales para todos
- Qué exigiría: una foto con licencia adecuada para ~2.139 jugadores (varias ediciones/leyendas) y todos los técnicos; o acuerdos de licencia con agencias (Getty, Imago, etc.) o con ligas/sindicatos de jugadores; verificar autoría de cada archivo; página de créditos completa; revisar el derecho a la imagen de cada persona según el país y el uso comercial.
- Costo: alto y recurrente (licencias por foto o por paquete, renovaciones, gestión legal). Las fotos libres de Commons cubren solo una parte, de calidad y año desiguales y sin garantía de que la persona esté representada en la edad de la carta.
- Riesgo: reclamos por derecho de imagen aun con la foto en licencia libre.

### (b) Muñeco genérico (la actual)
- Figura original dibujada por el equipo: camiseta con los colores del club (sin escudos), tono de piel y largo de pelo según un dato editorial; técnicos con traje neutro.
- Ventajas: sin licencias de terceros, liviano (≈ 11 MB menos en cada publicación), igual presentación en todas las pantallas.
- Desventajas: menos identificación visual con la persona real.

### (c) Avatares por rasgos (tono de piel, corte y color de pelo, bigote o barba, anteojos)
- Más reconocible que (b) sin usar la imagen de nadie. **No se implementa en este sprint.**
- Condiciones propuestas:
  - **Fuente de datos editorial cargada a mano** (curada por una persona, con fuente anotada), extendiendo `src/data/player-appearance.json` y `scripts/import-player-traits.mjs`. **Prohibido inferir rasgos automáticamente desde fotos** (ni con herramientas de visión): se evitan errores, sesgos y el tratamiento de datos biométricos o sensibles.
  - **Paleta de tonos limitada y respetuosa**: pocos tonos de piel definidos con criterio (por ejemplo los cuatro actuales, o seis como máximo), sin caricaturas ni exageraciones; colores de pelo naturales; rasgos opcionales (bigote/barba/anteojos) solo cuando sean notorios y estén documentados.
  - **Aclaración en el juego**: «los avatares son ilustraciones genéricas; no pretenden parecerse a la persona».
  - Los rasgos son datos sobre personas reales: confirmar con asesoría legal si alcanza con datos públicos y neutros.
- Plan de implementación en pasos:
  1. Definir el esquema (`skin`, `hair` {estilo, color}, `facialHair`, `glasses`) y la paleta con una revisión de diseño/sensibilidad.
  2. Dibujar las piezas SVG (cabeza, pelo, barba, anteojos) con el mismo marco que `PlayerAvatar`/`CoachAvatar`.
  3. Cargar a mano los datos de las cartas más jugadas (por ejemplo Top 150 de cada categoría), con columna de fuente; el resto queda con el muñeco por defecto.
  4. Ampliar `import-player-traits.mjs` para validar el esquema y rechazar valores fuera de la paleta.
  5. Pruebas visuales y de accesibilidad (texto alternativo genérico, sin describir a la persona), y texto de aclaración en 3 idiomas.
  6. Publicar por etapas y recoger reportes de personas que se sientan mal representadas, con un canal de corrección.

## 3. Nombres reales de jugadores y clubes
Es un tema legal **separado** de las fotos y de los avatares: el uso de nombres propios de personas y de clubes (y de escudos, equipaciones y marcas) puede requerir licencias o autorizaciones según el país y el uso comercial. Hoy el juego usa nombres reales sin escudos ni fotos oficiales; conviene revisar este punto con un abogado antes de monetizar.

## 4. Recomendación
Mantener (b) por ahora: es lo único que no depende de terceros y ya está implementado y probado. Si se quiere más identificación, avanzar con (c) en un sprint propio, solo con datos editoriales manuales para las cartas más jugadas y con revisión de sensibilidad. Dejar (a) para cuando haya presupuesto de licencias y asesoría legal. En paralelo, revisar con asesoría el uso de nombres reales y clubes, porque ese riesgo existe con cualquiera de las tres opciones.
