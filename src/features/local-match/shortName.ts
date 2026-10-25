/** Readable on a small pitch: keep a compound surname's particle when abbreviating a long name. */
const SURNAME_PARTICLES = new Set(['de', 'del', 'da', 'dos', 'di', 'van', 'von', 'mac', 'mc', 'al', 'el', 'san', 'st', 'st.'])
export function shortName(name: string) {
  const parts = name.trim().split(/\s+/)
  if (name.length <= 11 || parts.length < 2) return name.length > 13 ? `${name.slice(0, 12)}…` : name
  let last = parts[parts.length - 1]
  if (parts.length >= 3 && SURNAME_PARTICLES.has(parts[parts.length - 2].toLowerCase())) last = `${parts[parts.length - 2]} ${last}`
  return last.length > 12 ? `${parts[0][0]}. ${last.slice(0, 10)}…` : `${parts[0][0]}. ${last}`
}

/** A teammate offered on the board: `x`/`y`/`r` is the touch area, `cx`/`cy` the player and `fx`/`fy` the carrier, all in the board's CSS pixels. */
export interface BoardHit { readonly x: number; readonly y: number; readonly r: number; /** SIM-FIELD-002: a rectangular lane (half width and half height around x/y); circles win over lanes where both contain the point. */ readonly hw?: number; readonly hh?: number; readonly label: string; readonly cx?: number; readonly cy?: number; readonly fx?: number; readonly fy?: number }
/** Converts a pointer position to the pixels the board was painted in, whatever the displayed size of the canvas. */
export function boardPoint(client: { readonly x: number; readonly y: number }, rect: { readonly left: number; readonly top: number; readonly width: number; readonly height: number }, painted: { readonly width: number; readonly height: number }) {
  return { x: (client.x - rect.left) * (rect.width ? painted.width / rect.width : 1), y: (client.y - rect.top) * (rect.height ? painted.height / rect.height : 1) }
}
/** The offered teammate under a tap: the nearest hit area that contains the point, or null. */
export function nearestHit(hits: readonly BoardHit[], x: number, y: number): BoardHit | null {
  const inside = (hit: BoardHit) => hit.hw !== undefined && hit.hh !== undefined ? Math.abs(hit.x - x) <= hit.hw && Math.abs(hit.y - y) <= hit.hh : Math.hypot(hit.x - x, hit.y - y) <= hit.r
  return hits.filter(inside).map((hit) => ({ hit, rank: Math.hypot(hit.x - x, hit.y - y) + (hit.hw !== undefined ? 10_000 : 0) })).sort((a, b) => a.rank - b.rank)[0]?.hit ?? null
}
