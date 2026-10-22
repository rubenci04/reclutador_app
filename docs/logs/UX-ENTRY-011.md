# Registro UX-ENTRY-011 + SIM-FIELD-001 — 22/10/2026

- Hallazgo: el navegador integrado y probablemente el equipo del usuario usan prefers-reduced-motion; por eso la moneda parecia no animarse. Se reemplazo el salto inmediato por un fundido alternado de ambas caras.
- Publicacion: commit d526f86 a main (fast-forward desde 8fbbe35). Wrangler 4.151.3 con --keep-vars --no-autoconfig. Version 5f9c58f3-0b74-479f-8d5c-6aa75cf11e07 al 100%, etiqueta d526f86. HTTP 200; SHA-256 de index.html igual a dist y los tres assets con el mismo tamano; el bundle publico contiene editionHero. Sin cambios de bindings, secretos ni migraciones.
