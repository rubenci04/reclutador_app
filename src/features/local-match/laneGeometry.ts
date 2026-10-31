import type { DribbleSector } from './interactive/attackTree'

/** SIM-MINI-001: lane x on the 300x180 close-up (the attacker comes from the bottom, the defender waits in the middle). */
export const LANE_X: Readonly<Record<DribbleSector, number>> = { LEFT: 70, CENTER: 150, RIGHT: 230 }
/** x of each third of the goal on the 300x180 close-up. */
export const GOAL_X: Readonly<Record<DribbleSector, number>> = { LEFT: 85, CENTER: 150, RIGHT: 215 }
/** Milliseconds for the marker to travel the bar once (one way). Short enough to be a reflex, long enough to be fair. */
const SWEEP_MS = 800
/** Triangle wave of the elapsed time: 0 at the left end, 1 at the right end. */
export const markerAt = (elapsed: number) => { const phase = (elapsed / SWEEP_MS) % 2; return phase <= 1 ? phase : 2 - phase }
/** Timing precision: 1 in the middle of the bar, 0 at its ends. */
export const precisionAt = (position: number) => Math.round((1 - Math.abs(position - .5) * 2) * 100) / 100
