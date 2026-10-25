# Publicación ab909cf — 20/10/2026

01:00 Argentina. El push a origin/main no publicó el Worker. Se detectó HTML con assets anteriores y se publicó directamente el build de ab909cf en reclutador-app, siguiendo docs/DEPLOY.md.

npm run build y wrangler deploy --dry-run correctos. Publicación con --keep-vars, sin autoconfig ni cambios de bindings, Supabase o migraciones. Versión add5737e-4180-436e-a67c-809bab79a761 activa al 100 %, etiqueta ab909cf.

Verificación posterior: HTML público idéntico a dist/index.html, HTTP 200 y SHA256 idénticos para index-CMEKnW2_.js, AuctionPage-saV9-QSa.js e index-1w38a07k.css. No equivale a QA visual ni E2E online. No se configuró despliegue automático; futuros pushes por sí solos no acreditan publicación.
