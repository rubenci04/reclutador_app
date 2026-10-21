/** Opt-in sporting extension. No tier, attribute, coach or tactical bonus is added to a pure duel. */
export const INDIVIDUAL_DUELS_VERSION = 'ovr-duels-v1' as const
export const DUEL_SLOPE = .08
export const DUEL_LIMIT = .05
export function defenderDuelChance(attackerOvr: number, defenderOvr: number): number {
  if (![attackerOvr, defenderOvr].every((n) => Number.isFinite(n) && n >= 0 && n <= 100)) throw new Error('invalid_duel_rating')
  return Math.max(DUEL_LIMIT, Math.min(1 - DUEL_LIMIT, 1 / (1 + Math.exp(-DUEL_SLOPE * (defenderOvr - attackerOvr)))))
}
