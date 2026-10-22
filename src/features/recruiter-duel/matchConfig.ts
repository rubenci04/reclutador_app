import { DRAFT_BUDGET_MILLIONS } from '../../data/catalogRules'
import type { Player } from '../../types/player'
import type { Position } from '../../types/football'
import { COACH_MARKET_V2, COACH_MARKET_V3, COACH_MARKET_V4, COACH_MAX_PRICE, coachReserveFor } from '../coaches/coachRules'

/** Versioned configuration of one duel. The classic mode is exactly CLASSIC_CONFIG; nothing else holds a budget. */
export const MATCH_CONFIG_VERSION = 1 as const
/** discards-5-v1: five shared discards per game (earlier games: three). */
export const DISCARDS_MARKER_V2 = 'discards-5-v1' as const
export const DISCARDS_V1 = 3
export const DISCARDS_V2 = 5
export const discardLimitOf = (config?: { readonly discards?: string }) => config?.discards === DISCARDS_MARKER_V2 ? DISCARDS_V2 : DISCARDS_V1
/** bench-5-v1: up to five optional substitutes, bought after the eleven and the coach (goalkeeper allowed). */
export const BENCH_MARKET_V2 = 'bench-5-v1' as const
/** bench-showcase-v1 (GAMEPLAY-POLISH-010): same five-substitute limit, but the bench is bought from ONE fixed ten-card showcase in snake turns. New local games only. */
export const BENCH_SHOWCASE_V1 = 'bench-showcase-v1' as const
export const isShowcaseBench = (config?: { readonly bench?: string }) => config?.bench === BENCH_SHOWCASE_V1
export const BENCH_LIMIT_V1 = 3
export const BENCH_LIMIT_V2 = 5
export const benchLimitOf = (config?: { readonly bench?: string }) => config?.bench === BENCH_MARKET_V2 || config?.bench === BENCH_SHOWCASE_V1 ? BENCH_LIMIT_V2 : BENCH_LIMIT_V1
export const BUDGET_PRESETS = [100, 120, 150, 160, 175, 200, 220, 250] as const
export const BUDGET_LIMITS = { min: 60, max: 300, step: 5 } as const
export const NAME_MAX_LENGTH = 24

export type ConfigRecruiter = 'recruiter_one' | 'recruiter_two'
export interface MatchConfig {
  readonly version: typeof MATCH_CONFIG_VERSION
  readonly budget: number
  /** Free text, already sanitised; null means «use the default name of the interface language». */
  readonly names: Readonly<Record<ConfigRecruiter, string | null>>
  /** Three optional substitutes per team (1 DEF, 1 MED, 1 DEL): 14-player rosters and 28 cards in the auction. */
  readonly substitutes: boolean
  /** Optional coach hiring with the remaining budget; coachReserve specifies 1–8M kept aside (legacy default 1M). */
  readonly coaches?: boolean
  readonly coachReserve?: number
  /** Marker of the six-card coach market (absent in earlier games, which keep three cards). */
  readonly coachMarket?: typeof COACH_MARKET_V2 | typeof COACH_MARKET_V3 | typeof COACH_MARKET_V4
  /** Marker of the five shared discards (DISCARD-005). Absent in earlier games and online rooms, which keep three. */
  readonly discards?: typeof DISCARDS_MARKER_V2
  /** Marker of the five-substitute bench (ROSTER-005). Absent in earlier games and online rooms, which keep the three-substitute rules. */
  readonly bench?: typeof BENCH_MARKET_V2 | typeof BENCH_SHOWCASE_V1
}

export const CLASSIC_CONFIG: MatchConfig = { version: MATCH_CONFIG_VERSION, budget: DRAFT_BUDGET_MILLIONS, names: { recruiter_one: null, recruiter_two: null }, substitutes: false }

export type NameIssue = 'tooLong' | 'duplicate'

/** Trims, normalises, collapses whitespace and drops control, zero-width and bidirectional-override characters. */
export function sanitizeName(raw: string): string | null {
  const cleaned = raw.normalize('NFC').replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, ' ').replace(/\s+/g, ' ').trim()
  return cleaned.length ? cleaned : null
}

/** Length is counted in characters, not UTF-16 units. */
export const nameLength = (value: string) => [...value].length

export function nameIssues(names: Readonly<Record<ConfigRecruiter, string | null>>): Partial<Record<ConfigRecruiter, NameIssue>> {
  const issues: Partial<Record<ConfigRecruiter, NameIssue>> = {}
  for (const key of ['recruiter_one', 'recruiter_two'] as const) if (names[key] && nameLength(names[key]!) > NAME_MAX_LENGTH) issues[key] = 'tooLong'
  const [one, two] = [names.recruiter_one?.toLocaleLowerCase(), names.recruiter_two?.toLocaleLowerCase()]
  if (one && two && one === two) issues.recruiter_two = issues.recruiter_two ?? 'duplicate'
  return issues
}

export const isValidBudget = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= BUDGET_LIMITS.min && value <= BUDGET_LIMITS.max && value % BUDGET_LIMITS.step === 0

/** Strict parser for stored or received configurations; anything else is rejected, never coerced. */
export function parseMatchConfig(value: unknown): MatchConfig | null {
  if (typeof value !== 'object' || value === null) return null
  const record = value as Record<string, unknown>
  const names = record.names as Record<string, unknown> | undefined
  if (record.version !== MATCH_CONFIG_VERSION || !isValidBudget(record.budget) || typeof record.substitutes !== 'boolean' || (record.coaches !== undefined && typeof record.coaches !== 'boolean') || typeof names !== 'object' || names === null) return null
  if (record.coachReserve !== undefined && (record.coaches !== true || typeof record.coachReserve !== 'number' || !Number.isInteger(record.coachReserve) || record.coachReserve < 1 || record.coachReserve > COACH_MAX_PRICE)) return null
  if (record.coachMarket !== undefined && (record.coaches !== true || (record.coachMarket !== COACH_MARKET_V2 && record.coachMarket !== COACH_MARKET_V3 && record.coachMarket !== COACH_MARKET_V4))) return null
  if (record.discards !== undefined && record.discards !== DISCARDS_MARKER_V2) return null
  if (record.bench !== undefined && record.bench !== BENCH_MARKET_V2 && record.bench !== BENCH_SHOWCASE_V1) return null
  const read = (key: string) => names[key] === null ? null : typeof names[key] === 'string' ? sanitizeName(names[key] as string) : undefined
  const one = read('recruiter_one'); const two = read('recruiter_two')
  if (one === undefined || two === undefined) return null
  const parsed = { recruiter_one: one, recruiter_two: two }
  if (Object.keys(nameIssues(parsed)).length) return null
  return { version: MATCH_CONFIG_VERSION, budget: record.budget, names: parsed, substitutes: record.substitutes, ...(record.coaches ? { coaches: true, ...(record.coachReserve !== undefined ? { coachReserve: record.coachReserve as number } : {}), ...(record.coachMarket !== undefined ? { coachMarket: record.coachMarket as typeof COACH_MARKET_V2 | typeof COACH_MARKET_V3 | typeof COACH_MARKET_V4 } : {}) } : {}), ...(record.discards !== undefined ? { discards: DISCARDS_MARKER_V2 } : {}), ...(record.bench !== undefined ? { bench: record.bench as typeof BENCH_MARKET_V2 | typeof BENCH_SHOWCASE_V1 } : {}) }
}

export const POSITIONS_ORDER: readonly Position[] = ['ARQ', 'DEF', 'MED', 'DEL']

/** Optional bench: one defender, one midfielder and one forward (no goalkeeper in this first version). Single place to change it. */
export const SUBSTITUTE_POSITIONS: readonly Position[] = ['DEF', 'MED', 'DEL']

/** Players each team must sign, per general position: eleven starters plus the optional bench. */
export function rosterComposition(config: MatchConfig): Readonly<Record<Position, number>> {
  const composition: Record<Position, number> = { ARQ: 1, DEF: 4, MED: 3, DEL: 3 }
  if (config.substitutes) for (const position of SUBSTITUTE_POSITIONS) composition[position]++
  return composition
}

export const rosterSize = (config: MatchConfig) => Object.values(rosterComposition(config)).reduce((total, count) => total + count, 0)

export type Preflight =
  | { readonly ok: true; readonly minimumPerTeam: number }
  | { readonly ok: false; readonly reason: 'budget_range' | 'budget_too_low' | 'catalog_too_small'; readonly minimumPerTeam?: number }

/**
 * Before any draw: necessary conditions on the whole eligible set. One team needs at least the cheapest players of each
 * position, and both exclusive teams together need at least the cheapest 2n of each position, so
 * cheapest-n <= budget and cheapest-2n <= 2 x budget. Passing is not a promise (the draw still has to find a pool that
 * both teams can finish, and says so when it cannot); failing is a certainty. Prices are never adjusted to fit a budget.
 */
export function preflightMatchConfig(catalog: readonly Player[], config: MatchConfig): Preflight {
  if (!isValidBudget(config.budget)) return { ok: false, reason: 'budget_range' }
  const composition = rosterComposition(config)
  const reserve = coachReserveFor(config)
  let minimumPerTeam = 0; let minimumBoth = 0
  for (const position of POSITIONS_ORDER) {
    const prices = catalog.filter((player) => player.position === position).map((player) => player.price).sort((a, b) => a - b)
    if (prices.length < composition[position] * 2) return { ok: false, reason: 'catalog_too_small' }
    minimumPerTeam += prices.slice(0, composition[position]).reduce((total, price) => total + price, 0)
    minimumBoth += prices.slice(0, composition[position] * 2).reduce((total, price) => total + price, 0)
  }
  return minimumPerTeam <= config.budget - reserve && minimumBoth <= (config.budget - reserve) * 2 ? { ok: true, minimumPerTeam } : { ok: false, reason: 'budget_too_low', minimumPerTeam }
}

/** Raw form state of the pre-toss screen (text as typed); `MatchConfig` is derived from it. */
export interface SetupDraft { readonly mode: 'classic' | 'custom'; readonly nameOne: string; readonly nameTwo: string; readonly budgetText: string; readonly substitutes: boolean; readonly coaches: boolean; readonly coachReserve?: number }
export const DEFAULT_SETUP_DRAFT: SetupDraft = { mode: 'classic', nameOne: '', nameTwo: '', budgetText: '150', substitutes: false, coaches: true, coachReserve: COACH_MAX_PRICE }
