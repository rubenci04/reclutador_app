# assets-archive

Material that is **not published** with the web app (it lives outside `public/`, so the Worker does not serve it).

- `photos/players` and `photos/coaches`: Wikimedia Commons thumbnails used while player and coach photos were shown. Since Sprint 9 the app shows figures instead (`SHOW_PLAYER_PHOTOS = false` in `src/config/product.ts`). The manifests `src/data/player-photos.json` and `src/data/coach-photos.json` still describe them (paths such as `/assets/players/...` mean `assets-archive/photos/players/...` now).
- To show photos again: move the folders back under `public/assets/`, turn the flag on and review `docs/AVATARS-DESIGN.md` (licences and attribution).
