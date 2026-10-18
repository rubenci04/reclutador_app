import type { Coach, CoachEffect, CoachTier } from './coachTypes'

/** Reference date of the ages shown for active coaches. */
export const COACH_AS_OF_YEAR = 2026
/** Money every team keeps aside during the auctions so it can always afford the cheapest coach. */
export const COACH_RESERVE = 1
/** Coaches offered to each recruiter. */
export const COACH_OFFER_SIZE = 6

/** Coaches cost a fraction of a footballer: 1 to 8 million by tier. */
export const COACH_TIER_PRICE: Readonly<Record<CoachTier, number>> = { S: 8, A: 5, B: 3, C: 2, D: COACH_RESERVE }
/** Strength points at the coach's focus; the other sectors get half (BALANCED: three quarters everywhere). */
export const COACH_TIER_BONUS: Readonly<Record<CoachTier, number>> = { S: 2.5, A: 1.8, B: 1.2, C: 0.7, D: 0.3 }

const round1 = (value: number) => Math.round(value * 10) / 10

export function coachEffect(coach: Pick<Coach, 'tier' | 'focus'>): CoachEffect {
  const base = COACH_TIER_BONUS[coach.tier]
  if (coach.focus === 'BALANCED') { const part = round1(base * .75); return { attack: part, defense: part, midfield: part } }
  const main = round1(base); const side = round1(base * .5)
  return { attack: coach.focus === 'ATTACK' ? main : side, defense: coach.focus === 'DEFENSE' ? main : side, midfield: coach.focus === 'MIDFIELD' ? main : side }
}

/** Age of an active coach in the reference year, or age reached by a legend (years lived, or years since birth when alive). */
export const coachAge = (coach: Pick<Coach, 'birthYear' | 'deathYear'>) => (coach.deathYear ?? COACH_AS_OF_YEAR) - coach.birthYear
