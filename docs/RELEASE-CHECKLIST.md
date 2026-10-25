# Lista de publicación (sprints 2 a 6) con vuelta atrás

Para publicar juntos la rama `claude/sprint-9-10` (moneda del servidor, verificación de estado, tiempo por turno, legibilidad, EASY y pruebas). **No se ejecutó ningún paso**: es la receta para hacerlo juntos. Marcá cada paso al completarlo.

## Qué cambia y por qué importa el orden
- La web nueva llama a `online_flip_coin` y `online_claim_timeout`. Sin las migraciones, el online muestra «el servidor no tiene la última versión» (el modo local no se afecta).
- Las migraciones nuevas **rechazan** la moneda tirada por el cliente. La web **vieja** con las migraciones nuevas aplicadas no puede iniciar la moneda online. Por eso hay una pequeña ventana (entre el paso 3 y el 6) en la que el online no arranca partidas nuevas: hacerlo en un momento tranquilo y sin salas en juego.
- Las salas en curso: las que ya pasaron la moneda siguen; las que están en el lobby de duelo usan la moneda del servidor al reabrirse con la web nueva.

## Datos de producción actuales (de docs/DEPLOY.md)
- Worker `reclutador-app`, https://reclutador-app.rea-04.workers.dev/
- Versión previa al 100 %: **7d7b523a-7317-4150-a1bb-f51cab9ad4d8** (etiqueta ad155c9). Comprobá que sigue siendo la activa en el paso 0.

## Paso 0 — Antes de tocar nada
- [ ] `git status` limpio y la rama `claude/sprint-9-10` pusheada.
- [ ] `npm run typecheck`, `npm run lint`, `npm test -- --maxWorkers=4`, `npm run build` en verde.
- [ ] Anotar la versión activa del Worker: `npx --no-install wrangler deployments status --name reclutador-app` y `npx --no-install wrangler deployments list --name reclutador-app` (la lista muestra las versiones anteriores con su fecha). Copiar el ID de la versión activa: ____________________
- [ ] Confirmar si un push a `main` publica solo. Las notas viejas (docs/DEPLOY.md, antecedentes) dicen que sí; las publicaciones recientes se hicieron con `wrangler deploy` a mano. Si hubiera publicación automática, mezclar en `main` **después** del paso 3 y no antes.
- [ ] Hacer la prueba manual del bloque 1 de `docs/qa/MANUAL-PLAYTEST.md` en un build local (`npm run dev`).

## Paso 1 — Mezclar la rama en main
- [ ] `git checkout main && git pull`
- [ ] `git merge claude/sprint-9-10` (idealmente fast-forward) y `git push origin main` (push normal).
- Vuelta atrás: `git revert -m 1 <commit de merge>` (o `git revert <rango>` si fue fast-forward) y push normal. No usar `--force`.

## Paso 2 — Respaldo de la base
- [ ] En Supabase, anotar la fecha/hora (los proyectos gratuitos no siempre tienen respaldos automáticos). Las migraciones no borran datos; la reversa tampoco.

## Paso 3 — Aplicar las dos migraciones, juntas y en este orden
- [ ] SQL Editor → pegar y ejecutar `supabase/migrations/202610250001_online_fair_coin.sql` (debe decir «Success»).
- [ ] En seguida, `supabase/migrations/202610250002_online_turn_timer.sql`.
- [ ] Comprobar: `select proname from pg_proc where proname in ('online_flip_coin','online_claim_timeout');` devuelve 2 filas.
- Ambas son idempotentes: si una falla a mitad, se corrige y se vuelve a ejecutar completa.
- Vuelta atrás: ejecutar `supabase/rollback/rollback_sprint_2_3.sql` (quita `online_flip_coin`, `online_claim_timeout`, el trigger del plazo y restaura `online_submit_state` y `online_snapshot` a la versión de `202610190001_online_duel.sql`). **Solo junto con** volver al Worker anterior (paso 5), porque la web nueva usa esas funciones. Los datos de salas se conservan. Comprobar: `select proname from pg_proc where proname in ('online_flip_coin','online_claim_timeout');` devuelve 0 filas.

## Paso 4 — Build
- [ ] `npm run build` desde `main` actualizado; anotar el hash corto del commit: ____________
- Vuelta atrás: no aplica (no cambia nada publicado).

## Paso 5 — Publicar el Worker (como indica docs/DEPLOY.md)
- [ ] Simulación: `npx --no-install wrangler deploy --name reclutador-app --assets ./dist --compatibility-date 2026-10-12 --keep-vars --no-autoconfig --tag <hash> --message "Publish <hash>: online justo y tiempo por turno" --dry-run`
- [ ] Publicación: el mismo comando sin `--dry-run`.
- [ ] `npx --no-install wrangler deployments status --name reclutador-app` muestra la versión nueva al 100 %.
- Vuelta atrás: reponer la versión anterior (ID anotado en el paso 0, hoy `7d7b523a-7317-4150-a1bb-f51cab9ad4d8`): `npx --no-install wrangler rollback 7d7b523a-7317-4150-a1bb-f51cab9ad4d8 --name reclutador-app --message "Rollback to ad155c9"` y verificar con `deployments status`. Si el comando de rollback no estuviera disponible en la versión de Wrangler, se puede volver a publicar el commit anterior (`git checkout ad155c9`, build y el mismo `wrangler deploy` con su etiqueta). Después, si ya se aplicaron las migraciones, ejecutar la reversa SQL (paso 3).

## Paso 6 — Verificación por hash
- [ ] HTTP 200 en la URL pública.
- [ ] El SHA-256 del HTML servido y de cada archivo de `/assets/` coincide con `dist/` (mismo método que en los registros de docs/DEPLOY.md, p. ej. `curl -s <url> | sha256sum` contra `dist/index.html`).
- [ ] `?online` carga el HTML correcto.
- Si no coincide: es caché o una versión vieja; reintentar tras un minuto; si persiste, volver atrás (paso 5).

## Paso 7 — Prueba manual en producción
- [ ] Bloque 2 de `docs/qa/MANUAL-PLAYTEST.md` con dos dispositivos (sala, código corto, moneda, subasta, reloj, reclamo, reconexión). El reclamo requiere esperar 2 minutos y unos segundos.
- [ ] Bloque 3 (letra, medidor, colores) en el celular.
- Si la moneda o el reloj fallan en producción: volver atrás pasos 5 y 3 (en ese orden: primero el Worker, después el SQL), y avisar qué falló.

## Registro
Fecha ______  Commit ______  Versión Worker anterior ______  Versión nueva ______  Migraciones aplicadas (hora) ______  Resultado de la prueba manual ______
Al terminar, agregar la publicación a `docs/DEPLOY.md` como en las anteriores.
