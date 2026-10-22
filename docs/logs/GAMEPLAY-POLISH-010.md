# Registro GAMEPLAY-POLISH-010 — 22/10/2026

- Contradicción registrada: el encargo pedía una nueva versión de `bench-5-v1` con escaparate de diez; se creó `bench-showcase-v1` con el mismo límite de cinco. ROSTER-005 fijaba 200/250 M; se reemplazó por 160/220 M solo en partidas locales nuevas.
- Investigación de técnicos: lista de C5N (inicio de temporada) y Wikipedia (cortes del 2 al 18/10/2026). Insua, Sava y Dabove quedaron sin fechas comprobadas; Fonseca, sin fuente; Barros Schelotto, sin confirmar su situación posterior. No se guardaron credenciales ni se configuraron servicios externos.
- La página auxiliar de capturas fue temporal y no se versiona.
- Publicación: commit ff15376 a `main` (fast-forward desde c589b61). Wrangler 4.151.3, build, dry-run y deploy con `--keep-vars --no-autoconfig`. Versión a134976d-df2e-4186-9467-883b15bf8a11 al 100 %, etiqueta ff15376. HTTP 200; el SHA-256 de index.html coincide con dist y los tres assets cambiados tienen el mismo tamaño que en dist; el bundle público contiene bench-showcase-v1. Sin cambios de bindings, secretos ni migraciones.
