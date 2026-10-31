import type { TacticalAdjustment } from '../tactics/tacticalModel'

/**
 * SIM-FIELD-004: shouts from the bench. Visually they move the local circles. Only sessions created with the opt-in
 * `touchlineShouts: 'tactical-shouts-v1'` also feed them to the engine (TECH-005); every other session, digest and historical game is unchanged.
 */
export const SHOUTS = ['ONE_ON_ONE', 'PRESS', 'COMPACT'] as const
export type Shout = typeof SHOUTS[number]
/** One block of the match (15 minutes of play): how long a shout stays on the pitch and before it can be called again. */
export const SHOUT_MINUTES = 15
export const SHOUT_ICON: Readonly<Record<Shout, string>> = { ONE_ON_ONE: '⚡', PRESS: '🎯', COMPACT: '🛡️' }

export type ShoutCalls = Readonly<Partial<Record<Shout, number>>>
export const TACTICAL_SHOUTS_VERSION = 'tactical-shouts-v1' as const

/** tactical-shouts-v1: what each shout buys and what it gives up, per sector. Every shout has a cost elsewhere. */
export const SHOUT_ADJUSTMENT: Readonly<Record<Shout, TacticalAdjustment>> = {
  ONE_ON_ONE: { attack: 1.5, defense: 0, midfield: -1.5 },
  PRESS: { attack: .5, defense: -2, midfield: 1.8 },
  COMPACT: { attack: -2, defense: 2, midfield: 0 },
}
export const SHOUT_LIMIT = 3
const bounded = (value: number) => Math.max(-SHOUT_LIMIT, Math.min(SHOUT_LIMIT, value))
/** Sum of the active shouts, bounded to ±3 per sector. */
export function shoutTacticalAdjustment(active: readonly Shout[]): TacticalAdjustment {
  const total = { attack: 0, defense: 0, midfield: 0 }
  for (const shout of new Set(active)) for (const sector of ['attack', 'defense', 'midfield'] as const) total[sector] += SHOUT_ADJUSTMENT[shout][sector]
  return { attack: bounded(total.attack), defense: bounded(total.defense), midfield: bounded(total.midfield) }
}

/** The shout is on the pitch from the minute it was called until a full block later. */
export const shoutActive = (calls: ShoutCalls, shout: Shout, minute: number) => calls[shout] !== undefined && minute >= calls[shout]! && minute < calls[shout]! + SHOUT_MINUTES
export const shoutReadyAt = (calls: ShoutCalls, shout: Shout) => calls[shout] === undefined ? 0 : calls[shout]! + SHOUT_MINUTES

/** Visual displacement of one of the local side's circles under the active shouts, in pitch units. Goalkeepers never move. */
export function shoutOffset(active: readonly Shout[], home: { readonly x: number; readonly y: number }, isKeeper: boolean): { readonly x: number; readonly y: number } {
  if (isKeeper) return { x: 0, y: 0 }
  let x = 0, y = 0
  if (active.includes('PRESS') && home.x >= .3) x += .04
  if (active.includes('COMPACT') && home.x < .3) { y += (.5 - home.y) * .35; x += .015 }
  return { x, y }
}

/** The local circles that carry the 1v1 pulse: wingers and forwards, the far end of the team. */
export const isFrontLine = (home: { readonly x: number }) => home.x >= .55
