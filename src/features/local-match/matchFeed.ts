import type { MatchEvent } from './matchTypes'
import type { PlayChoice } from './interactive'

/** Letter shared by a decision card and its teammate on the board. */
export const PLAY_LETTERS: Readonly<Record<PlayChoice, string>> = { CORNER_NEAR: 'A', CORNER_FAR: 'B', CORNER_SHORT: 'C', MAN_MARK: 'A', ZONE: 'B', LEFT: 'A', RIGHT: 'B', CROSS: 'A', SHOOT: 'B', INTERCEPT: 'A', PRESS: 'B', NEAR_POST: 'A', GOAL_CENTER: 'B', FAR_POST: 'C' }

export const EVENT_ICONS: Readonly<Record<MatchEvent['type'], string>> = { corner: '⚑', goal: '⚽', shot: '🎯', save: '🧤', attack: '⚔', recovery: '↺', substitution: '⇄', final: '⏱', pass: '➜' }
const EVENT_WEIGHT: Partial<Record<MatchEvent['type'], number>> = { attack: 1, shot: 2, goal: 3 }
/** Percentage (0-100) of the danger created so far that belongs to the local side; 50 before anything happens. */
export function momentumShare(events: readonly MatchEvent[]) {
  let local = 0; let cpu = 0
  for (const item of events) { const weight = EVENT_WEIGHT[item.type] ?? 0; if (item.side === 'local') local += weight; else if (item.side === 'cpu') cpu += weight }
  return local + cpu === 0 ? 50 : Math.round((local / (local + cpu)) * 100)
}

/** Translation key of a narration line: interactive plays have one line per step. */
/** Deterministic presentation variety from confirmed facts; never a sporting RNG draw. */
export function eventVariant(item: MatchEvent): number {
  let hash = item.minute
  for (const char of `${item.type}:${item.playerId ?? ''}:${item.side ?? ''}`) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return hash % 3
}
export const eventKey = (item: MatchEvent, varied = false) => item.step ? `match.play.${item.step}` : varied && ['attack', 'pass', 'shot', 'save', 'recovery'].includes(item.type) ? `match.variants.${item.type}.${item.playerId ? 'player' : 'team'}.${eventVariant(item)}` : `match.events.${item.type}`
