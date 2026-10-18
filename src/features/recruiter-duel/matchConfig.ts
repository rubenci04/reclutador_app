import { DRAFT_BUDGET_MILLIONS } from '../../data/catalogRules'
import type { Player } from '../../types/player'
import type { Position } from '../../types/football'

/** Versioned configuration of one duel. The classic mode is exactly CLASSIC_CONFIG; nothing else holds a budget. */
export const MATCH_CONFIG_VERSION = 1 as const
export const BUDGET_PRESETS = [100, 125, 150, 175, 200] as const
export const BUDGET_LIMITS = { min: 60, max: 300, step: 5 } as const
export const NAME_MAX_LENGTH = 24

export type ConfigRecruiter = 'recruiter_one' | 'recruiter_two'
export interface MatchConfig {
  readonly version: typeof MATCH_CONFIG_VERSION
  readonly budget: number
  /** Free text, already sanitised; null means «use the default name of the interface language». */
  readonly names: Readonly<Record<ConfigRecruiter, string | null>>
  /** Three optional substitutes per team (H3). Always false until that rule set is enabled. */
  readonly substitutes: boolean
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
  if (record.version !== MATCH_CONFIG_VERSION || !isValidBudget(record.budget) || typeof record.substitutes !== 'boolean' || typeof names !== 'object' || names === null) return null
  const read = (key: string) => names[key] === null ? null : typeof names[key] === 'string' ? sanitizeName(names[key] as string) : undefined
  const one = read('recruiter_one'); const two = read('recruiter_two')
  if (one === undefined || two === undefined) return null
  const parsed = { recruiter_one: one, recruiter_two: two }
  if (Object.keys(nameIssues(parsed)).length) return null
  return { version: MATCH_CONFIG_VERSION, budget: record.budget, names: parsed, substitutes: record.substitutes }
}

export const POSITIONS_ORDER: readonly Position[] = ['ARQ', 'DEF', 'MED', 'DEL']

/** Players each team must sign, per general position. Single place to extend when optional substitutes are enabled. */
export function rosterComposition(): Readonly<Record<Position, number>> {
  return { ARQ: 1, DEF: 4, MED: 3, DEL: 3 }
}

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
  const composition = rosterComposition()
  let minimumPerTeam = 0; let minimumBoth = 0
  for (const position of POSITIONS_ORDER) {
    const prices = catalog.filter((player) => player.position === position).map((player) => player.price).sort((a, b) => a - b)
    if (prices.length < composition[position] * 2) return { ok: false, reason: 'catalog_too_small' }
    minimumPerTeam += prices.slice(0, composition[position]).reduce((total, price) => total + price, 0)
    minimumBoth += prices.slice(0, composition[position] * 2).reduce((total, price) => total + price, 0)
  }
  return minimumPerTeam <= config.budget && minimumBoth <= config.budget * 2 ? { ok: true, minimumPerTeam } : { ok: false, reason: 'budget_too_low', minimumPerTeam }
}

/** Raw form state of the pre-toss screen (text as typed); `MatchConfig` is derived from it. */
export interface SetupDraft { readonly mode: 'classic' | 'custom'; readonly nameOne: string; readonly nameTwo: string; readonly budgetText: string }
export const DEFAULT_SETUP_DRAFT: SetupDraft = { mode: 'classic', nameOne: '', nameTwo: '', budgetText: String(CLASSIC_CONFIG.budget) }
