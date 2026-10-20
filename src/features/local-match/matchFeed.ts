import type { MatchEvent } from './matchTypes'

export const EVENT_ICONS: Readonly<Record<MatchEvent['type'], string>> = { goal: '⚽', shot: '🎯', save: '🧤', attack: '⚔', recovery: '↺', substitution: '⇄', final: '⏱' }
const EVENT_WEIGHT: Partial<Record<MatchEvent['type'], number>> = { attack: 1, shot: 2, goal: 3 }
/** Percentage (0-100) of the danger created so far that belongs to the local side; 50 before anything happens. */
export function momentumShare(events: readonly MatchEvent[]) {
  let local = 0; let cpu = 0
  for (const item of events) { const weight = EVENT_WEIGHT[item.type] ?? 0; if (item.side === 'local') local += weight; else if (item.side === 'cpu') cpu += weight }
  return local + cpu === 0 ? 50 : Math.round((local / (local + cpu)) * 100)
}
