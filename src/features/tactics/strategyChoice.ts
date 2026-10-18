import { isStrategyId, type StrategyId } from './strategies'

/**
 * Secret simultaneous choice. First picks, the device is handed over, second picks, then both are revealed.
 * Against the CPU the second pick is fixed up front (from the CPU's own eleven and the seed) and stays hidden until the reveal.
 * Local flow only: the online mode must keep both picks on the server and reveal them there.
 */
export type ChoiceStep = 'FIRST' | 'HANDOVER' | 'SECOND' | 'REVEALED'

export interface StrategyChoice {
  readonly step: ChoiceStep
  readonly first: StrategyId | null
  readonly second: StrategyId | null
  /** True when `second` was fixed beforehand by the CPU. */
  readonly secondIsCpu: boolean
}

export type ChoiceError = 'invalid_strategy' | 'invalid_step'
export type ChoiceTransition = { readonly ok: true; readonly choice: StrategyChoice } | { readonly ok: false; readonly error: ChoiceError }

export const startStrategyChoice = (cpuStrategy?: StrategyId): StrategyChoice =>
  ({ step: 'FIRST', first: null, second: cpuStrategy ?? null, secondIsCpu: cpuStrategy !== undefined })

/** Confirms the pick of whoever is choosing. A second confirmation, or one in any other step, is rejected. */
export function confirmStrategy(choice: StrategyChoice, strategy: unknown): ChoiceTransition {
  if (choice.step !== 'FIRST' && choice.step !== 'SECOND') return { ok: false, error: 'invalid_step' }
  if (!isStrategyId(strategy)) return { ok: false, error: 'invalid_strategy' }
  if (choice.step === 'FIRST') return { ok: true, choice: { ...choice, step: choice.secondIsCpu ? 'REVEALED' : 'HANDOVER', first: strategy } }
  return { ok: true, choice: { ...choice, step: 'REVEALED', second: strategy } }
}

/** The second recruiter confirms that the device is in their hands. */
export const acknowledgeHandover = (choice: StrategyChoice): ChoiceTransition =>
  choice.step === 'HANDOVER' ? { ok: true, choice: { ...choice, step: 'SECOND' } } : { ok: false, error: 'invalid_step' }

/** What a screen may show: nothing until both are confirmed. */
export const revealedStrategies = (choice: StrategyChoice): { readonly first: StrategyId; readonly second: StrategyId } | null =>
  choice.step === 'REVEALED' && choice.first && choice.second ? { first: choice.first, second: choice.second } : null
