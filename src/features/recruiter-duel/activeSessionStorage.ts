import type { StrategyChoice } from '../tactics/strategyChoice'
import { DEFAULT_MODE } from '../themed-modes/categoryTree'
import { PLAYABLE_MODES } from '../themed-modes/modeCatalog'
import type { ThemedModeId } from '../themed-modes/modeTypes'
import type { AuctionPhase, RecruiterDuelGame } from './auctionTypes'
import { CPU_DIFFICULTIES, CPU_STRATEGIES, type CpuDifficulty, type CpuStrategy } from './cpuPolicy'
import type { DualDraft } from './dualDraft'

/** Local game in progress (auction, locker room or match), kept so a reload does not lose it. Online rooms never use it. */
export const ACTIVE_SESSION_KEY = 'reclutador.active-session.v1'

export interface DualSession { readonly draft: DualDraft; readonly first: ThemedModeId; readonly second: ThemedModeId; readonly vsCpu: boolean }
export interface ActiveSession {
  readonly version: 1
  readonly localGame: RecruiterDuelGame | null
  readonly dual: DualSession | null
  /** The directed match had started; it is rebuilt from the game and the revealed tactics (it restarts at kick-off). */
  readonly live: boolean
  readonly matchMode: 'live' | 'quick'
  readonly strategyChoice: { readonly seed: string; readonly choice: StrategyChoice } | null
  readonly lineupConfirmed: { readonly seed: string; readonly recruiter_one: boolean; readonly recruiter_two: boolean }
  readonly opponentMode: 'hotseat' | 'cpu'
  readonly strategy: CpuStrategy
  readonly difficulty: CpuDifficulty
  readonly pauseMs: number
  readonly mode: ThemedModeId
  readonly gameMode: ThemedModeId
  readonly secondCategory: ThemedModeId | 'same'
}
type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

const PHASES: readonly AuctionPhase[] = ['LOBBY', 'COIN_TOSS', 'REVEAL_PLAYER', 'BIDDING', 'DISCARD_RESULT', 'ROUND_RESULT', 'NEXT_ROUND', 'TEAMS_COMPLETED', 'SIMULATING', 'MATCH_RESULT']
const STEPS: readonly StrategyChoice['step'][] = ['FIRST', 'HANDOVER', 'SECOND', 'REVEALED']
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const isSeed = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 256
const isMode = (value: unknown): value is ThemedModeId => typeof value === 'string' && (value === DEFAULT_MODE || PLAYABLE_MODES.has(value as ThemedModeId))
const bothSides = (value: unknown, check: (side: unknown) => boolean) => isRecord(value) && check(value.recruiter_one) && check(value.recruiter_two)

function validGame(game: unknown): game is RecruiterDuelGame {
  return isRecord(game) && isSeed(game.seed) && PHASES.includes(game.phase as AuctionPhase) && Array.isArray(game.rounds) && game.rounds.length > 0
    && game.rounds.every((round) => isRecord(round) && typeof round.playerId === 'string') && Number.isInteger(game.roundIndex)
    && bothSides(game.teams, (team) => isRecord(team) && isRecord(team.lineup) && typeof team.spent === 'number') && Array.isArray(game.record)
}
function validDual(dual: unknown): dual is DualSession {
  return isRecord(dual) && isMode(dual.first) && isMode(dual.second) && typeof dual.vsCpu === 'boolean' && isRecord(dual.draft) && isSeed(dual.draft.seed)
    && isRecord(dual.draft.config) && typeof dual.draft.budget === 'number'
    && bothSides(dual.draft.sides, (side) => isRecord(side) && Array.isArray(side.deck) && Number.isInteger(side.cursor) && Array.isArray(side.signed))
}
function validSession(value: unknown): value is ActiveSession {
  if (!isRecord(value) || value.version !== 1) return false
  if (value.localGame !== null && !validGame(value.localGame)) return false
  if (value.dual !== null && !validDual(value.dual)) return false
  if (value.localGame === null && value.dual === null) return false
  const choice = value.strategyChoice
  if (choice !== null && !(isRecord(choice) && isSeed(choice.seed) && isRecord(choice.choice) && STEPS.includes(choice.choice.step as StrategyChoice['step']))) return false
  const confirmed = value.lineupConfirmed
  if (!(isRecord(confirmed) && typeof confirmed.seed === 'string' && typeof confirmed.recruiter_one === 'boolean' && typeof confirmed.recruiter_two === 'boolean')) return false
  return typeof value.live === 'boolean' && (value.matchMode === 'live' || value.matchMode === 'quick') && (value.opponentMode === 'hotseat' || value.opponentMode === 'cpu')
    && CPU_STRATEGIES.includes(value.strategy as CpuStrategy) && CPU_DIFFICULTIES.includes(value.difficulty as CpuDifficulty)
    && typeof value.pauseMs === 'number' && value.pauseMs >= 0 && value.pauseMs <= 3000
    && isMode(value.mode) && isMode(value.gameMode) && (value.secondCategory === 'same' || isMode(value.secondCategory))
}

/** Returns false when storage is blocked or full; the game keeps running in memory. */
export function saveActiveSession(session: ActiveSession, storage?: StorageLike): boolean {
  try { (storage ?? window.localStorage).setItem(ACTIVE_SESSION_KEY, JSON.stringify(session)); return true } catch { return false }
}
/** Null when nothing is stored, storage is blocked or the stored data is not a usable session (corrupt data is removed). */
export function readActiveSession(storage?: StorageLike): ActiveSession | null {
  try {
    const target = storage ?? window.localStorage
    const raw = target.getItem(ACTIVE_SESSION_KEY)
    if (raw === null) return null
    let parsed: unknown = null
    try { parsed = JSON.parse(raw) } catch { /* Reported as invalid below. */ }
    if (validSession(parsed)) return parsed
    target.removeItem(ACTIVE_SESSION_KEY)
    return null
  } catch { return null }
}
export function clearActiveSession(storage?: StorageLike): void {
  try { (storage ?? window.localStorage).removeItem(ACTIVE_SESSION_KEY) } catch { /* Nothing stored can be reached either. */ }
}
