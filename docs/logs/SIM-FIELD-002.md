# Registro SIM-FIELD-002 — 23/10/2026

- Alcance: ataque (FINISH) y defensa (DEFEND, SIM-MINI-003) directamente sobre TacticalBoard; tarjetas conservadas como alternativa. Informe: [qa/SIM-FIELD-002.md](../qa/SIM-FIELD-002.md).
- Pruebas: typecheck, lint (0 errores), build y suite completa (130 archivos, 1372 pruebas) verdes.
- Publicación: commit f7f8000 a main (fast-forward desde acbf36a). Wrangler 4.151.3 (`npx --yes wrangler@4.151.3`, no está instalado localmente) con --keep-vars --no-autoconfig, dry-run previo. Worker reclutador-app, versión a018dd7a-3121-46bc-bfc1-f836c7830274 al 100 %, etiqueta f7f8000. HTTP 200; SHA-256 de index.html y de los tres assets referenciados coinciden con dist.
- Sin cambios de bindings, secretos ni migraciones. No se tocó online.
