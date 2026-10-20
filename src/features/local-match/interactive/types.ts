import type { MatchResult, MatchSide, SubstitutionSummary } from '../matchTypes'
import type { SimulationInput } from '../simulator'
import type { StrategyId } from '../../tactics/strategies'
import type { KernelState } from './kernel'

export type Pair<T> = Readonly<Record<MatchSide, T>>
export type BenchMode = 'none' | 'auto-subs-v1' | 'manual-v1'
export type Order =
  | { readonly type: 'KEEP'; readonly parameters: Record<string, never> }
  | { readonly type: 'STRATEGY'; readonly parameters: { readonly strategy: StrategyId } }
  | { readonly type: 'SUBSTITUTE'; readonly parameters: { readonly outId: string; readonly inId: string } }
  | { readonly type: 'POSTURE'; readonly parameters: { readonly direction: 'ATTACK' | 'DEFEND' } }
export interface Decision {
  readonly version: 'interactive-command-v1'
  readonly id: string
  readonly sessionId: string
  readonly participant: MatchSide
  readonly expectedRevision: number
  readonly windowId: string
  readonly applyBlock: 2 | 3 | 4 | 5
  readonly order: Order
}
export type Rejection = 'UNSUPPORTED_VERSION' | 'UNSUPPORTED_ORDER' | 'NOT_MEMBER' | 'STALE_STATE' | 'WRONG_WINDOW' | 'WRONG_BLOCK' | 'ALREADY_SUBMITTED' | 'DUPLICATE_COMMAND' | 'ID_CONFLICT' | 'INVALID_PAYLOAD' | 'INVALID_STRATEGY' | 'INVALID_SUBSTITUTION' | 'INVALID_ROSTER' | 'BUDGET_EXCEEDED' | 'NOT_FINISHED' | 'INVALID_PHASE' | 'INVALID_SNAPSHOT'
export type Receipt = { readonly id: string; readonly revision: number } & (
  { readonly status: 'ACCEPTED'; readonly command: Decision } | { readonly status: 'REJECTED'; readonly command: unknown; readonly reason: Rejection }
)
export interface SessionOptions {
  readonly sessionId: string
  readonly benchMode?: Pair<BenchMode>
  /** Trusted acquisition ledger, not provided by a remote player's command. Omitted: base-price local fixture. */
  readonly acquisition?: Pair<{ readonly spent: number; readonly coachPaid: number; readonly budget: number }>
}
export interface InteractiveResult {
  readonly version: 'interactive-result-v1'
  readonly kernelVersion: 'action-v3-incremental-v1'
  readonly decisions: readonly Decision[]
  readonly substitutions: { readonly version: 'interactive-subs-v1'; readonly modes: Pair<BenchMode>; readonly events: SubstitutionSummary['events'] }
  readonly result: MatchResult
}
export interface Session {
  readonly schemaVersion: 'interactive-session-v1'
  readonly kernelVersion: 'action-v3-incremental-v1'
  readonly sessionId: string
  readonly revision: number
  readonly phase: 'RUNNABLE' | 'WINDOW' | 'FINISHED'
  readonly kernel: KernelState
  readonly options: SessionOptions
  readonly benchMode: Pair<BenchMode>
  readonly ownership: Pair<readonly string[]>
  readonly departed: Pair<readonly string[]>
  readonly entered: Pair<readonly string[]>
  readonly window: { readonly id: string; readonly applyBlock: 2 | 3 | 4 | 5; readonly plans: Pair<Decision | null> } | null
  readonly receipts: readonly Receipt[]
  readonly applied: readonly Decision[]
  readonly result: InteractiveResult | null
}
export type Outcome<T = Session> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: Rejection; readonly rejected?: { readonly session: Session; readonly receipt: Receipt } }
/** Metadata must come from trusted authority storage, never from the same untrusted upload. */
export interface CheckpointAuthority {
  readonly sessionId: string
  readonly revision: number
  readonly digest: string
}
/** Later CPU policy: caller provides a private stream cursor and a view; no current CPU difficulty changes. */
export type InstructionPolicy = (view: ReturnType<typeof import('./session').inspectSession>, context: { readonly participant: MatchSide; readonly seed: string; readonly cursor: number; readonly availableBench: readonly string[] }) => { readonly order: Order; readonly nextCursor: number }
export type SessionInput = SimulationInput & { readonly actionModel: 'action-v3' }
