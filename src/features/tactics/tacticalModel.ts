import type { Player } from '../../types/player'
import type { DraftLineup } from '../draft/draftTypes'
import { STRATEGY_PROFILES, type StrategyId } from './strategies'

/**
 * Tactical layer of local-match-v2 (tactics-v1).
 *
 * SIMPLIFICATION: no verified role aptitude exists (RoleAptitude is UNKNOWN for everyone). Every feature below is an
 * approximation from the general ATT/DEF/PHY/MEN attributes of the players placed in each slot by the participant.
 * It is a simulator convention, not an individual verified fact about a footballer.
 */
export interface TacticalFeatures {
  /** Wingers and full-backs going forward. */
  readonly flankThreat: number
  /** Defensive quality of the two full-backs. */
  readonly fullbackDefense: number
  /** Midfield ability to keep the ball: MEN and ATT of the three midfielders. */
  readonly midfieldControl: number
  /** Forward pace and finishing on the break: (ATT+PHY)/2 of LW, ST and RW. */
  readonly transitionThreat: number
  /** PHY of midfield and attack, used for pressing. */
  readonly stamina: number
  /** DEF of both centre-backs, the defensive midfielder and the goalkeeper. */
  readonly centralDefense: number
  /** PHY of the back four, used to cover space behind a high line. */
  readonly backlineRecovery: number
}

export interface TacticalAdjustment { readonly attack: number; readonly defense: number; readonly midfield: number }

export const ZERO_ADJUSTMENT: TacticalAdjustment = { attack: 0, defense: 0, midfield: 0 }
/** Hard bound per sector, in strength points; the base sectors live around 75-95. */
export const ADJUSTMENT_LIMIT = 10
export const PRESS_FADE_BLOCKS = 5

/** Tunable gains in strength points. Calibration reports these values; see docs/qa/CODEX-005G-C2.md. */
export const TACTICAL_GAINS = {
  control: { midfield: 9, attackCost: 2.5 },
  wide: { attack: 9, midfieldCost: 2.5, defenseCost: 1.6 },
  counter: { attack: 10, midfieldCost: 3.6, defense: 1.6 },
  press: { midfield: 8, attack: 3.2, defenseCost: 5.6, fade: .5 },
  low: { defense: 8, attackCost: 4.5, midfieldCost: 2.8 },
} as const

const clamp = (value: number, lower: number, upper: number) => Math.max(lower, Math.min(upper, value))
/** Quality in [0, 1]: 0 at the lower reference rating, 1 at the upper one. */
export const ratingQuality = (value: number, lower = 72, upper = 90) => clamp((value - lower) / (upper - lower), 0, 1)

function mean(players: readonly Player[], pick: (player: Player) => number) {
  return players.reduce((total, player) => total + pick(player), 0) / players.length
}

export function tacticalFeatures(lineup: DraftLineup, catalog: readonly Player[]): TacticalFeatures {
  const at = (...slots: (keyof DraftLineup)[]) => slots.map((slot) => catalog.find((player) => player.id === lineup[slot])!)
  const wingers = at('LW', 'RW'); const backs = at('LB', 'RB'); const mids = at('LCM', 'CDM', 'RCM')
  const forwards = at('LW', 'ST', 'RW'); const runners = at('LCM', 'CDM', 'RCM', 'LW', 'ST', 'RW')
  const back4 = at('LB', 'LCB', 'RCB', 'RB'); const centre = at('LCB', 'RCB'); const [defensiveMid] = at('CDM'); const [keeper] = at('GK')
  return {
    flankThreat: mean(wingers, (p) => p.att_rating) * .7 + mean(backs, (p) => (p.att_rating + p.phy_rating) / 2) * .3,
    fullbackDefense: mean(backs, (p) => p.def_rating),
    midfieldControl: mean(mids, (p) => p.men_rating * .6 + p.att_rating * .4),
    transitionThreat: mean(forwards, (p) => (p.att_rating + p.phy_rating) / 2),
    stamina: mean(runners, (p) => p.phy_rating),
    centralDefense: mean(centre, (p) => p.def_rating) * .5 + defensiveMid.def_rating * .2 + keeper.def_rating * .3,
    backlineRecovery: mean(back4, (p) => p.phy_rating),
  }
}

const bounded = (adjustment: TacticalAdjustment): TacticalAdjustment => ({
  attack: clamp(adjustment.attack, -ADJUSTMENT_LIMIT, ADJUSTMENT_LIMIT),
  defense: clamp(adjustment.defense, -ADJUSTMENT_LIMIT, ADJUSTMENT_LIMIT),
  midfield: clamp(adjustment.midfield, -ADJUSTMENT_LIMIT, ADJUSTMENT_LIMIT),
})

/**
 * Pure adjustment for `own` this block. Reads only both squads' features and the opponent's public posture.
 * `block` is the zero-based index of the six time blocks (0 = minute 15).
 */
export function tacticalAdjustment(strategy: StrategyId, own: TacticalFeatures, opponent: TacticalFeatures, opponentStrategy: StrategyId, block: number): TacticalAdjustment {
  const seen = STRATEGY_PROFILES[opponentStrategy].exposure
  const g = TACTICAL_GAINS
  switch (strategy) {
    case 'NEUTRAL': return ZERO_ADJUSTMENT
    case 'MIDFIELD_CONTROL': {
      const cover = 1 - .5 * seen.compactness - .35 * seen.pressing
      return bounded({ attack: -g.control.attackCost, defense: 0, midfield: g.control.midfield * ratingQuality(own.midfieldControl) * cover })
    }
    case 'WIDE_PLAY': {
      const defended = ratingQuality(opponent.fullbackDefense)
      const space = 1 + .15 * seen.compactness
      return bounded({ attack: g.wide.attack * ratingQuality(own.flankThreat) * (1 - .5 * defended) * space, defense: -g.wide.defenseCost, midfield: -g.wide.midfieldCost })
    }
    case 'COUNTER_ATTACK':
      return bounded({ attack: g.counter.attack * ratingQuality(own.transitionThreat) * seen.spaceBehind, defense: g.counter.defense * ratingQuality(own.centralDefense), midfield: -g.counter.midfieldCost })
    case 'HIGH_PRESS': {
      const stamina = ratingQuality(own.stamina)
      const secure = ratingQuality(opponent.midfieldControl) * seen.buildUp
      const fade = 1 - g.press.fade * (block / PRESS_FADE_BLOCKS) * (1 - stamina)
      const power = stamina * (1 - .6 * secure) * fade
      return bounded({ attack: g.press.attack * power, defense: -g.press.defenseCost * (1 - .5 * ratingQuality(own.backlineRecovery)), midfield: g.press.midfield * power })
    }
    case 'LOW_BLOCK':
      return bounded({ attack: -g.low.attackCost, defense: g.low.defense * ratingQuality(own.centralDefense) * (1 - .35 * seen.width), midfield: -g.low.midfieldCost })
  }
}
