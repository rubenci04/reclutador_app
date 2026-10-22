import type { Coach, CoachEffect, CoachTier } from './coachTypes'
import type { StrategyId } from '../tactics/strategies'

/** Reference date of the ages shown for active coaches. */
export const COACH_AS_OF_YEAR = 2026
/** Money every team keeps aside during the auctions so it can always afford the cheapest coach. */
export const COACH_RESERVE = 1
export const COACH_MAX_PRICE = 8
/** Missing in legacy games: preserve their original 1M reserve. New games default to 8M. */
export const coachReserveFor = (config?: { readonly coaches?: boolean; readonly coachReserve?: number }) => config?.coaches ? config.coachReserve ?? COACH_RESERVE : 0
/** Coaches offered to each recruiter. */
export const COACH_OFFER_SIZE = 3
/** coach-market-v2 (COACH-006): six distinct, affordable coaches. Games without the marker keep the three-card offer. */
export const COACH_MARKET_V2 = 'coach-market-v2' as const
export const COACH_OFFER_SIZE_V2 = 6
/** coach-market-v3 (COACH-006B): six competitive coaches of the best affordable band, S+ tier, editorial tiers; earlier games keep their coaches, prices and offers. */
export const COACH_MARKET_V3 = 'coach-market-v3' as const
export type CoachMarketVersion = 'v1' | 'v2' | 'v3'
export const coachMarketOf = (config?: { readonly coachMarket?: string }): CoachMarketVersion => config?.coachMarket === COACH_MARKET_V3 ? 'v3' : config?.coachMarket === COACH_MARKET_V2 ? 'v2' : 'v1'

/** Coaches cost a fraction of a footballer: 1 to 8 million by tier. */
export const COACH_TIER_PRICE: Readonly<Record<CoachTier, number>> = { 'S+': 12, S: COACH_MAX_PRICE, A: 5, B: 3, C: 2, D: COACH_RESERVE }
/** Strength points at the coach's focus; the other sectors get half (BALANCED: three quarters everywhere). */
export const COACH_TIER_BONUS: Readonly<Record<CoachTier, number>> = { 'S+': 3.2, S: 2.5, A: 1.8, B: 1.2, C: 0.7, D: 0.3 }

const round1 = (value: number) => Math.round(value * 10) / 10

export function coachEffect(coach: Pick<Coach, 'tier' | 'focus'>, strategy: StrategyId = 'NEUTRAL'): CoachEffect {
  const aligned = coach.focus === 'ATTACK' ? strategy === 'WIDE_PLAY' || strategy === 'COUNTER_ATTACK'
    : coach.focus === 'DEFENSE' ? strategy === 'LOW_BLOCK'
      : coach.focus === 'MIDFIELD' ? strategy === 'MIDFIELD_CONTROL' || strategy === 'HIGH_PRESS' : false
  const multiplier = aligned ? 1.15 : coach.focus === 'BALANCED' && strategy !== 'NEUTRAL' ? 1.05 : 1
  // The cap of 3 is unchanged for every earlier tier (their maximum is 2.875); S+ raises it to 3.4.
  const base = Math.min(coach.tier === 'S+' ? 3.4 : 3, COACH_TIER_BONUS[coach.tier] * multiplier)
  if (coach.focus === 'BALANCED') { const part = round1(base * .75); return { attack: part, defense: part, midfield: part } }
  const main = round1(base); const side = round1(base * .5)
  return { attack: coach.focus === 'ATTACK' ? main : side, defense: coach.focus === 'DEFENSE' ? main : side, midfield: coach.focus === 'MIDFIELD' ? main : side }
}

/** Age of an active coach in the reference year, or age reached by a legend (years lived, or years since birth when alive). */
export const coachAge = (coach: Pick<Coach, 'birthYear' | 'deathYear'>) => (coach.deathYear ?? COACH_AS_OF_YEAR) - coach.birthYear
