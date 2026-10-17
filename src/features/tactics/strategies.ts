/** Versioned contract for the tactical layer. Bump when profiles or formulas change results. */
export const TACTICS_VERSION = 'tactics-v1' as const

export const STRATEGY_IDS = ['NEUTRAL', 'MIDFIELD_CONTROL', 'WIDE_PLAY', 'COUNTER_ATTACK', 'HIGH_PRESS', 'LOW_BLOCK'] as const
export type StrategyId = (typeof STRATEGY_IDS)[number]

export const isStrategyId = (value: unknown): value is StrategyId => typeof value === 'string' && (STRATEGY_IDS as readonly string[]).includes(value)

/** Stored selection for both sides of one match. Absence of a selection means NEUTRAL for both (legacy behaviour). */
export interface StrategySelection {
  readonly version: typeof TACTICS_VERSION
  readonly local: StrategyId
  readonly cpu: StrategyId
}

export const NEUTRAL_SELECTION: StrategySelection = { version: TACTICS_VERSION, local: 'NEUTRAL', cpu: 'NEUTRAL' }

/** Rejects unknown identifiers and foreign versions; never coerces. */
export function parseStrategySelection(value: unknown): StrategySelection | null {
  if (typeof value !== 'object' || value === null) return null
  const record = value as Record<string, unknown>
  return record.version === TACTICS_VERSION && isStrategyId(record.local) && isStrategyId(record.cpu)
    ? { version: TACTICS_VERSION, local: record.local, cpu: record.cpu }
    : null
}

/**
 * How a strategy presents itself to the opponent. These are the only inputs the opponent's formulas read,
 * so interactions come from graded parameters multiplied by squad composition, never from a fixed win table.
 */
export interface StrategyExposure {
  /** Space left behind the ball (0-1). Counter-attacks feed on it. */
  readonly spaceBehind: number
  /** Compactness of the block (0-1). Blunts possession play and concedes width. */
  readonly compactness: number
  /** Pressing intensity on the opponent's build-up (0-1). */
  readonly pressing: number
  /** How well the side builds from the back through the middle (0-1). Pressing finds less to win there. */
  readonly buildUp: number
  /** Share of attacks directed to the flanks (0-1). Low blocks lose some of their value against it. */
  readonly width: number
}

export interface StrategyProfile {
  readonly id: StrategyId
  /** Football objective, for documentation and C3 copy. */
  readonly objective: string
  readonly favorable: string
  readonly advantages: string
  readonly risks: string
  readonly exposure: StrategyExposure
}

export const STRATEGY_PROFILES: Readonly<Record<StrategyId, StrategyProfile>> = {
  NEUTRAL: {
    id: 'NEUTRAL', objective: 'Reference behaviour: no tactical adjustment.', favorable: 'Always valid; used for legacy matches.',
    advantages: 'None.', risks: 'None.',
    exposure: { spaceBehind: .3, compactness: 0, pressing: 0, buildUp: .6, width: .2 },
  },
  MIDFIELD_CONTROL: {
    id: 'MIDFIELD_CONTROL', objective: 'Win the centre of the pitch and keep the ball.',
    favorable: 'Central midfielders with strong MEN and ATT.',
    advantages: 'Midfield gain scaled by midfield quality; safe build-up reduces opponent pressing.',
    risks: 'Slower progression (less attack). Gain shrinks against compact blocks and high pressing. Leaves some space behind.',
    exposure: { spaceBehind: .5, compactness: .1, pressing: 0, buildUp: 1, width: .1 },
  },
  WIDE_PLAY: {
    id: 'WIDE_PLAY', objective: 'Stretch the opponent and attack the flanks.',
    favorable: 'Strong wingers and attacking full-backs against weaker opposing full-backs.',
    advantages: 'Attack gain scaled by winger/full-back quality; blocks that sit deep concede width.',
    risks: 'Fewer players centrally (midfield) and advanced full-backs (defence).',
    exposure: { spaceBehind: .6, compactness: 0, pressing: 0, buildUp: .6, width: 1 },
  },
  COUNTER_ATTACK: {
    id: 'COUNTER_ATTACK', objective: 'Absorb pressure and attack the space left by the opponent.',
    favorable: 'Fast, attacking forwards against teams that leave space behind.',
    advantages: 'Attack gain scaled by forward threat and by the space the opponent leaves; solid central defence.',
    risks: 'Cedes the midfield. Gains almost nothing against a team that leaves no space.',
    exposure: { spaceBehind: .2, compactness: .5, pressing: 0, buildUp: .3, width: .2 },
  },
  HIGH_PRESS: {
    id: 'HIGH_PRESS', objective: 'Win the ball high up the pitch.',
    favorable: 'Physically strong midfielders and forwards against teams that build slowly.',
    advantages: 'Midfield and attack gain scaled by stamina; weaker against secure build-up.',
    risks: 'Space behind the defence; the effect fades through the match for low-stamina squads.',
    exposure: { spaceBehind: 1, compactness: 0, pressing: 1, buildUp: .6, width: .2 },
  },
  LOW_BLOCK: {
    id: 'LOW_BLOCK', objective: 'Protect the middle zones and concede territory.',
    favorable: 'Strong centre-backs, defensive midfielder and goalkeeper.',
    advantages: 'Defence gain scaled by central defensive quality; leaves no space behind.',
    risks: 'Less attack and midfield. Loses value against teams attacking wide.',
    exposure: { spaceBehind: 0, compactness: 1, pressing: 0, buildUp: .3, width: 0 },
  },
}
