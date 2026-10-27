import type { StrategyId } from '../../tactics/strategies'

/** Every calibration constant of the figures engine lives here; nothing else in the engine carries a tunable number. */
export const ENGINE_VERSION = 'figures-v1' as const
export type EngineVersion = typeof ENGINE_VERSION

/** Derived stream: the deal, the auction and the coin never see it, so their order of consumption is untouched. */
export const ENGINE_STREAM_SUFFIX = ':partido'

export const SEGMENTS = 6
export const MOMENTS_PER_HALF = 3
/** Largest shift, in probability points (0-1 scale), that the quality of a moment may add or remove. */
export const MOMENT_MAX_OSCILLATION = 0.12
export const MOMENT_MIN_PROBABILITY = 0.005
export const MOMENT_MAX_PROBABILITY = 0.995
/** Strength gap (points) at which a moment is the hardest (1) or the easiest (0). */
export const DIFFICULTY_SPAN = 20

/** Weights of every position in each line. The weighted mean makes the chosen formation matter: more players in a line, more weight. */
export const LINE_WEIGHTS = {
  attack: { DEL: 1, MED: 0.45, DEF: 0.12, ARQ: 0 },
  midfield: { DEL: 0.2, MED: 1, DEF: 0.25, ARQ: 0 },
  defense: { DEL: 0.06, MED: 0.4, DEF: 1, ARQ: 0 },
} as const
/** Midfield rating = mental * this + physical * (1 - this). */
export const MIDFIELD_MENTAL_SHARE = 0.7

/** Chances per segment of a team of the same strength as its rival. */
export const BASE_CHANCES_PER_SEGMENT = 2.07
export const CHANCES_MIN = 0.3
export const CHANCES_MAX = 6
export const MAX_CHANCES_PER_SIDE = 10
/** Exponent of the chance rate per 10 points of midfield gap and per 10 points of attack-vs-defence gap. */
export const K_MIDFIELD = 0.13
export const K_ATTACK = 0.135
/** How much of a team's tempo the rival also feels (an open game gives chances to both). */
export const TEMPO_SPILL = 0.55
export const TEMPO: Readonly<Record<StrategyId, number>> = { NEUTRAL: 0, MIDFIELD_CONTROL: 0.03, WIDE_PLAY: 0.08, COUNTER_ATTACK: 0.04, HIGH_PRESS: 0.1, LOW_BLOCK: -0.1 }

export type ChanceKind = 'open' | 'corner' | 'free-kick' | 'penalty'
export const CHANCE_KIND_WEIGHTS: readonly (readonly [ChanceKind, number])[] = [['open', 0.786], ['corner', 0.14], ['free-kick', 0.06], ['penalty', 0.014]]
export type OpenStyle = 'dribble' | 'through-ball' | 'cross' | 'shot'
export const OPEN_STYLE_WEIGHTS: readonly (readonly [OpenStyle, number])[] = [['dribble', 0.25], ['through-ball', 0.25], ['cross', 0.2], ['shot', 0.3]]

/** Goal probability of a chance between equal teams. */
export const BASE_XG: Readonly<Record<ChanceKind, number>> = { open: 0.1, corner: 0.05, 'free-kick': 0.07, penalty: 0.78 }
/** How much of the strength gap each kind feels; a penalty depends far less on the sides than on the taker and the keeper. */
export const XG_SENSITIVITY: Readonly<Record<ChanceKind, number>> = { open: 1, corner: 0.8, 'free-kick': 0.6, penalty: 0.3 }
/** Logit slope per 10 points of attack-vs-defence gap and of attack-vs-goalkeeper gap. */
export const K_XG_DEFENSE = 0.14
export const K_XG_KEEPER = 0.1
export const XG_MIN = 0.01
export const XG_MAX = 0.92

/** Weights of the three ways a chance that is not a goal ends (save, off target, blocked), before strength shifts them. */
export const MISS_WEIGHTS: Readonly<Record<ChanceKind, { readonly save: number; readonly off: number; readonly blocked: number }>> = {
  open: { save: 0.4, off: 0.28, blocked: 0.32 },
  corner: { save: 0.28, off: 0.34, blocked: 0.38 },
  'free-kick': { save: 0.4, off: 0.34, blocked: 0.26 },
  penalty: { save: 0.78, off: 0.22, blocked: 0 },
}
/** Exponent per 10 points: keeper above the shooter's attack saves more; defence above attack blocks more. */
export const K_MISS_SAVE = 0.12
export const K_MISS_BLOCK = 0.12

/** Possession: points per point of mean midfield gap, plus the realised share of chances, bounded. */
export const POSSESSION_PER_MIDFIELD_POINT = 0.6
export const POSSESSION_CHANCE_SHARE = 0.35
export const POSSESSION_MIN = 35
export const POSSESSION_MAX = 65

/** Weight (rating - floor)^2 used to pick who takes a chance, as in the previous engine. */
export const SHOOTER_RATING_FLOOR = 60
