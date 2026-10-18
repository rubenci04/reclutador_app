import type { StrategyId } from '../tactics/strategies'
import type { RecruiterDuelGame, RecruiterId } from './auctionTypes'

/** How a duel page plays a game that lives in a shared room instead of in its own memory. */
export interface OnlineDuelBinding {
  readonly game: RecruiterDuelGame
  /** The side this browser plays: seat 1 is recruiter one (the host), seat 2 is recruiter two. */
  readonly mySide: RecruiterId
  /**
   * Applies an intent to the latest shared state and publishes the result. Returning the same object means "nothing to do",
   * which makes duplicated automatic steps (both browsers revealing the coin, say) harmless.
   */
  readonly submit: (intent: (current: RecruiterDuelGame) => RecruiterDuelGame) => void
  /** Who already picked a strategy (never which one). */
  readonly strategyReady: Readonly<Record<RecruiterId, boolean>>
  readonly chooseStrategy: (strategy: StrategyId) => Promise<void>
  /** Both strategies, only once both people have chosen. */
  readonly revealStrategies: () => Promise<Readonly<Record<RecruiterId, StrategyId>>>
  readonly forfeit: () => void
  readonly exit: () => void
  readonly connection: 'connecting' | 'connected' | 'offline'
  readonly busy: boolean
}
