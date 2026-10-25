/** SIM-FIELD-003: the contracting ring of a held pass or cross. Pure, so the board and the tests share the same clock. */
export const RING_MS = 900
/** A press shorter than this is a plain tap: no precision is sent and the play resolves exactly as it always did. */
export const HOLD_MIN_MS = 250
const RING_START = 3
const RING_END = .45

/** Ring size relative to the receiver's circle: 3x at the press, exactly 1x at RING_MS, then it keeps shrinking (too much force). */
export function ringScale(elapsed: number) {
  const t = Math.max(0, elapsed)
  if (t <= RING_MS) return RING_START + (1 - RING_START) * (t / RING_MS)
  return Math.max(RING_END, 1 + (RING_END - 1) * ((t - RING_MS) / RING_MS))
}

/** 1 when the ring matches the circle, falling to 0 for an early release or one that overshoots the force. */
export function ringPrecision(elapsed: number) {
  return Math.round(Math.max(0, 1 - Math.abs(elapsed - RING_MS) / RING_MS) * 100) / 100
}

/** Within this much of the target the pass reads as "perfect" on the pitch. */
export const isPerfect = (elapsed: number) => ringPrecision(elapsed) >= .88

/** Signed rating edge of a duel for display: "+5", "-3" or "0". */
export const duelEdge = (own: number, rival: number) => own === rival ? '0' : `${own > rival ? '+' : '-'}${Math.abs(own - rival)}`

/** Confirmed steps that settle a one-on-one on the pitch. */
export const DUEL_STEPS: readonly string[] = ['CARRY_OK', 'CARRY_LOST', 'DRIBBLE_OK', 'DRIBBLE_LOST', 'INTERCEPT_OK', 'AERIAL_WON']
