import type { StrategyId } from '../tactics/strategies'
import type { OnlineErrorCode } from '../online/contracts'
import type { CoinSide, RecruiterDuelGame, RecruiterId } from './auctionTypes'

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
  /** Recruiter one calls the coin; the server tosses it. */
  readonly flipCoin: (side: CoinSide) => Promise<void>
  /** Last server error of an action taken inside the duel (the lobby page is not on screen). */
  readonly error?: OnlineErrorCode | null
  /** The state received does not follow the rules (see verifyDuelState). Playing on is still possible. */
  readonly integrityIssue?: boolean
  readonly dismissIntegrity?: () => void
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
