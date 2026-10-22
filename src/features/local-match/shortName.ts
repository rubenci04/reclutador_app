/** Readable on a small pitch: the surname (or the last word) with the initial only when the whole name is long. */
export function shortName(name: string) {
  const parts = name.trim().split(/\s+/)
  if (name.length <= 11 || parts.length < 2) return name.length > 13 ? `${name.slice(0, 12)}…` : name
  const last = parts[parts.length - 1]
  return last.length > 11 ? `${parts[0][0]}. ${last.slice(0, 9)}…` : `${parts[0][0]}. ${last}`
}

export interface BoardHit { readonly x: number; readonly y: number; readonly r: number; readonly label: string }
/** The offered teammate under a tap: the nearest hit area that contains the point, or null. */
export function nearestHit(hits: readonly BoardHit[], x: number, y: number): BoardHit | null {
  return hits.map((hit) => ({ hit, distance: Math.hypot(hit.x - x, hit.y - y) })).filter((item) => item.distance <= item.hit.r).sort((a, b) => a.distance - b.distance)[0]?.hit ?? null
}
