/** Readable on a small pitch: the surname (or the last word) with the initial only when the whole name is long. */
export function shortName(name: string) {
  const parts = name.trim().split(/\s+/)
  if (name.length <= 11 || parts.length < 2) return name.length > 13 ? `${name.slice(0, 12)}…` : name
  const last = parts[parts.length - 1]
  return last.length > 11 ? `${parts[0][0]}. ${last.slice(0, 9)}…` : `${parts[0][0]}. ${last}`
}

/** A teammate offered on the board: `x`/`y`/`r` is the touch area, `cx`/`cy` the player and `fx`/`fy` the carrier, all in the board's CSS pixels. */
export interface BoardHit { readonly x: number; readonly y: number; readonly r: number; readonly label: string; readonly cx?: number; readonly cy?: number; readonly fx?: number; readonly fy?: number }
/** Converts a pointer position to the pixels the board was painted in, whatever the displayed size of the canvas. */
export function boardPoint(client: { readonly x: number; readonly y: number }, rect: { readonly left: number; readonly top: number; readonly width: number; readonly height: number }, painted: { readonly width: number; readonly height: number }) {
  return { x: (client.x - rect.left) * (rect.width ? painted.width / rect.width : 1), y: (client.y - rect.top) * (rect.height ? painted.height / rect.height : 1) }
}
/** The offered teammate under a tap: the nearest hit area that contains the point, or null. */
export function nearestHit(hits: readonly BoardHit[], x: number, y: number): BoardHit | null {
  return hits.map((hit) => ({ hit, distance: Math.hypot(hit.x - x, hit.y - y) })).filter((item) => item.distance <= item.hit.r).sort((a, b) => a.distance - b.distance)[0]?.hit ?? null
}
