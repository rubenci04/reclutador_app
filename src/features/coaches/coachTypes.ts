export const COACH_TIERS = ['S', 'A', 'B', 'C', 'D'] as const
export type CoachTier = (typeof COACH_TIERS)[number]
/** Where the coach's influence is strongest. BALANCED spreads it over the three sectors. */
export type CoachFocus = 'ATTACK' | 'DEFENSE' | 'MIDFIELD' | 'BALANCED'

export interface Coach {
  readonly id: string
  readonly name: string
  readonly surname: string
  readonly birthYear: number
  /** Legends only. */
  readonly deathYear?: number
  /** Reference club or national team the coach has represented; not a verified current employment claim. Proper noun: never translated. */
  readonly team: string
  readonly teamKind: 'CLUB' | 'NATIONAL'
  readonly nationality: string
  readonly status: 'ACTIVE' | 'LEGEND'
  readonly tier: CoachTier
  readonly focus: CoachFocus
  readonly price: number
}

/** Extra strength points a coach adds to each sector of his team in every block. */
export interface CoachEffect { readonly attack: number; readonly defense: number; readonly midfield: number }
