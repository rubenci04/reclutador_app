/**
 * SIM-FIELD-004: shouts from the bench. They are presentation and intent only: nothing here is read by the engine, stored in the session or
 * included in a checkpoint, so every digest and every historical game stays exactly as it was.
 */
export const SHOUTS = ['ONE_ON_ONE', 'PRESS', 'COMPACT'] as const
export type Shout = typeof SHOUTS[number]
/** One block of the match (15 minutes of play): how long a shout stays on the pitch and before it can be called again. */
export const SHOUT_MINUTES = 15
export const SHOUT_ICON: Readonly<Record<Shout, string>> = { ONE_ON_ONE: '⚡', PRESS: '🎯', COMPACT: '🛡️' }

export type ShoutCalls = Readonly<Partial<Record<Shout, number>>>

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
