import type { MatchSide } from '../matchTypes'
import { MATCH_MINUTES } from '../matchTypes'
import { DRAFT_SLOT_IDS, type DraftLineup } from '../../draft/draftTypes'
import { calculateTeamStrength } from '../simulator'
import { tacticalFeatures } from '../../tactics/tacticalModel'
import { isStrategyId } from '../../tactics/strategies'
import { formationSlots } from '../../tactics/formations'
import { visibleStats } from '../playback'
import { advanceKernel, finishKernel, initializeKernel, resolveKernelPlay } from './kernel'
import { availableChoice } from './attackTree'
import { canonical, exact, exclusiveRoster, integer, jsonSafe, object, text, validInput } from './validation'
import { validSnapshotState } from './snapshotValidation'
import type { CheckpointAuthority, Decision, PlayCommand, InteractiveResult, Outcome, Pair, Receipt, Rejection, Session, SessionInput, SessionOptions } from './types'

const SIDES = ['local', 'cpu'] as const
const fail = (error: Rejection): Outcome<never> => ({ ok: false, error })
const success = <T,>(value: T): Outcome<T> => ({ ok: true, value })
const copy = <T,>(value: T): T => structuredClone(value)

/** Only authority/local trusted setup calls creation. Commands can never acquire players. */
export function createSession(source: SessionInput, options: SessionOptions): Outcome {
  try {
    if (source.actionModel !== 'action-v3') return fail('UNSUPPORTED_VERSION')
    if (!validInput(source)) return fail('INVALID_ROSTER')
    if (!object(options) || !jsonSafe(options) || !exact(options, ['sessionId'], ['benchMode', 'acquisition', 'attackTree', 'moments', 'aerial', 'matchRules']) || options.attackTree !== undefined && (!object(options.attackTree) || !exact(options.attackTree, ['version']) || options.attackTree.version !== 'attack-tree-v1') || !text(options.sessionId) || options.sessionId.length > 128) return fail('INVALID_PAYLOAD')
    if (options.matchRules !== undefined && (!object(options.matchRules) || !exact(options.matchRules, ['version']) || options.matchRules.version !== 'halftime-ovr-v1' || options.attackTree !== undefined || options.moments && !options.aerial)) return fail('INVALID_PAYLOAD')
    if (options.moments !== undefined && (options.attackTree !== undefined || !object(options.moments) || !exact(options.moments, ['version']) || options.moments.version !== 'match-moments-v1')) return fail('INVALID_PAYLOAD')
    if (options.aerial !== undefined && (!options.moments || !object(options.aerial) || !exact(options.aerial, ['version']) || options.aerial.version !== 'directed-header-v1')) return fail('INVALID_PAYLOAD')
    const kernel = initializeKernel(source, options.moments ? 'match-moments-v1' : options.attackTree !== undefined, options.aerial !== undefined, options.matchRules !== undefined)
    const benchMode = options.benchMode ?? { local: source.benches ? 'auto-subs-v1' : 'none', cpu: source.benches ? 'auto-subs-v1' : 'none' }
    if (!object(benchMode) || !exact(benchMode, SIDES) || !SIDES.every((side) => ['none', 'auto-subs-v1', 'manual-v1'].includes(benchMode[side]) && (benchMode[side] !== 'none' || !source.benches?.[side].length))) return fail('INVALID_PAYLOAD')
    const ownership = { local: [...Object.values(source.localLineup), ...(source.benches?.local ?? [])] as string[], cpu: [...Object.values(source.cpuLineup), ...(source.benches?.cpu ?? [])] as string[] }
    if (!exclusiveRoster([...ownership.local, ...ownership.cpu], source.catalog)) return fail('INVALID_ROSTER')
    if (options.acquisition !== undefined && (!object(options.acquisition) || !exact(options.acquisition, SIDES))) return fail('INVALID_PAYLOAD')
    for (const side of SIDES) {
      const baseCost = ownership[side].reduce((sum, id) => sum + source.catalog.find((p) => p.id === id)!.price, 0)
      const ledger = options.acquisition?.[side] ?? { spent: baseCost, coachPaid: 0, budget: source.budget ?? 100 }
      if (!object(ledger) || !exact(ledger, ['spent', 'coachPaid', 'budget']) || !Object.values(ledger).every(integer)) return fail('INVALID_PAYLOAD')
      if (ledger.budget !== (source.budget ?? 100) || ledger.spent < baseCost || ledger.spent + ledger.coachPaid > ledger.budget) return fail('BUDGET_EXCEEDED')
    }
    return success({ schemaVersion: 'interactive-session-v1', kernelVersion: 'action-v3-incremental-v1', sessionId: options.sessionId, revision: 0, phase: 'RUNNABLE', kernel, options: copy(options), benchMode: copy(benchMode), ownership, departed: { local: [], cpu: [] }, entered: { local: [], cpu: [] }, window: null, receipts: [], applied: [], result: null })
  } catch { return fail('INVALID_ROSTER') }
}

/** Pure public projection: confirmed blocks only, without private seeds, RNG or pending opponent plans. */
export function inspectSession(session: Session) {
  const partial = session.kernel.partial ?? null
  const stats = session.result?.result.stats ?? visibleStats([...session.kernel.blocks.flatMap((block) => block.events), ...(partial?.events ?? [])])
  return copy({ sessionId: session.sessionId, revision: session.revision, phase: session.phase, nextBlock: session.kernel.nextBlock, blocks: session.kernel.blocks, partial: partial ? { minute: MATCH_MINUTES[session.kernel.nextBlock], events: partial.events } : null, play: partial?.play ?? null, score: session.kernel.score, stats, lineups: { local: session.kernel.sides.local.team.lineup, cpu: session.kernel.sides.cpu.team.lineup }, window: session.window ? { id: session.window.id, applyBlock: session.window.applyBlock, ready: { local: Boolean(session.window.plans.local), cpu: Boolean(session.window.plans.cpu) } } : null })
}

export function advanceBlock(session: Session): Outcome {
  if (session.phase !== 'RUNNABLE') return fail('INVALID_PHASE')
  const kernel = advanceKernel(session.kernel, { local: session.benchMode.local === 'auto-subs-v1', cpu: session.benchMode.cpu === 'auto-subs-v1' })
  return settle({ ...copy(session), kernel, revision: session.revision + 1 })
}

/** Where the session stands once the kernel moved: waiting for a play decision, finished, in a coaching window or runnable. */
function settle(next: Session): Outcome {
  const kernel = next.kernel
  if (kernel.partial?.play) return success({ ...next, phase: 'PLAY', window: null })
  const runnable: Session = { ...next, phase: 'RUNNABLE', window: null }
  if (kernel.nextBlock === 6) return finishSession(runnable)
  if (kernel.nextBlock >= 2) return success({ ...runnable, phase: 'WINDOW', window: { id: `${next.sessionId}:after-${MATCH_MINUTES[kernel.nextBlock - 1]}`, applyBlock: kernel.nextBlock as 2 | 3 | 4 | 5, plans: { local: null, cpu: null } } })
  return success(runnable)
}

function parsePlay(raw: unknown): PlayCommand | null {
  if (!object(raw) || !jsonSafe(raw) || !exact(raw, ['version', 'id', 'sessionId', 'expectedRevision', 'playId', 'node', 'choice']) || !text(raw.version) || !text(raw.id) || !text(raw.sessionId) || !integer(raw.expectedRevision) || !text(raw.playId) || !['DIRECTION', 'FINISH', 'DEFEND', 'HEADER'].includes(raw.node as string) || !['LEFT', 'RIGHT', 'CROSS', 'SHOOT', 'INTERCEPT', 'PRESS', 'NEAR_POST', 'GOAL_CENTER', 'FAR_POST'].includes(raw.choice as string)) return null
  return raw as unknown as PlayCommand
}

/** Resolves the pending node of the interactive attack. A command id can only ever resolve one node. */
export function submitPlay(session: Session, raw: unknown): Outcome {
  const command = parsePlay(raw)
  if (!command) return fail('INVALID_PAYLOAD')
  if (session.kernel.tree?.log.some((entry) => entry.id === command.id)) return fail('DUPLICATE_COMMAND')
  const pending = session.kernel.partial?.play
  if (session.phase !== 'PLAY' || !pending) return fail('INVALID_PHASE')
  if (command.version !== 'interactive-play-command-v1') return fail('UNSUPPORTED_VERSION')
  if (command.sessionId !== session.sessionId || command.playId !== pending.id || command.node !== pending.node) return fail('WRONG_PLAY')
  if (command.expectedRevision !== session.revision) return fail('STALE_STATE')
  if (!availableChoice(pending, command.choice)) return fail('INVALID_CHOICE')
  try { return settle({ ...copy(session), kernel: resolveKernelPlay(session.kernel, command.id, command.choice), revision: session.revision + 1 }) } catch { return fail('INVALID_CHOICE') }
}

function parseDecision(raw: unknown): Decision | null {
  if (!object(raw) || !jsonSafe(raw) || !exact(raw, ['version', 'id', 'sessionId', 'participant', 'expectedRevision', 'windowId', 'applyBlock', 'order']) || !text(raw.version) || !text(raw.id) || !text(raw.sessionId) || !text(raw.windowId) || !integer(raw.expectedRevision) || !SIDES.includes(raw.participant as MatchSide) || !integer(raw.applyBlock) || !object(raw.order) || !exact(raw.order, ['type', 'parameters']) || !object(raw.order.parameters)) return null
  const order = raw.order
  const parameters = order.parameters as Record<string, unknown>
  if (order.type === 'HALFTIME' && exact(parameters, ['strategy', 'substitution']) && (parameters.substitution === null || object(parameters.substitution) && exact(parameters.substitution, ['inId', 'outId']))) return raw as unknown as Decision
  if (order.type === 'KEEP' && exact(order.parameters as Record<string, unknown>, []) || order.type === 'STRATEGY' && exact(order.parameters as Record<string, unknown>, ['strategy']) || order.type === 'SUBSTITUTE' && exact(order.parameters as Record<string, unknown>, ['outId', 'inId']) || order.type === 'POSTURE' && exact(order.parameters as Record<string, unknown>, ['direction'])) return raw as unknown as Decision
  return null
}

export function receiptFor(session: Session, id: string): Receipt | null {
  return copy(session.receipts.find((receipt) => receipt.id === id) ?? null)
}

function substitutionValid(session: Session, command: Decision): boolean {
  const substitution = command.order.type === 'SUBSTITUTE' ? command.order.parameters : command.order.type === 'HALFTIME' ? command.order.parameters.substitution : null
  if (!substitution) return false
  const side = command.participant; const { inId, outId } = substitution
  if (!text(inId) || !text(outId) || session.benchMode[side] !== 'manual-v1' || session.entered[side].length >= 3 || session.entered[side].includes(inId) || session.departed[side].includes(inId)) return false
  const state = session.kernel.sides[side]
  const player = session.kernel.input.catalog.find((p) => p.id === inId)
  return Boolean(player && player.position !== 'ARQ' && session.ownership[side].includes(inId) && state.unused.includes(inId) && formationSlots(session.kernel.input.formations?.[side]).some((slot) => slot.position === player.position && state.team.lineup[slot.id] === outId))
}

export function submitDecision(session: Session, authenticatedSide: MatchSide, raw: unknown): Outcome {
  const command = parseDecision(raw)
  if (!command) return fail('INVALID_PAYLOAD')
  if (authenticatedSide !== command.participant || !SIDES.includes(authenticatedSide)) return fail('NOT_MEMBER')
  const prior = session.receipts.find((r) => r.id === command.id)
  if (prior) return fail(canonical(prior.command) === canonical(command) ? 'DUPLICATE_COMMAND' : 'ID_CONFLICT')
  if (session.receipts.length >= 256) return fail('INVALID_PAYLOAD')
  // Do not modify even the audit revision of a finished game.
  if (session.phase === 'FINISHED') return fail('INVALID_PHASE')
  const reject = (error: Rejection): Outcome => {
    const receipt: Receipt = { id: command.id, command: copy(command), revision: session.revision + 1, status: 'REJECTED', reason: error }
    return { ok: false, error, rejected: { session: { ...copy(session), revision: receipt.revision, receipts: [...copy(session.receipts), receipt] }, receipt } }
  }
  if (command.version !== 'interactive-command-v1') return reject('UNSUPPORTED_VERSION')
  if (command.sessionId !== session.sessionId || !session.window || session.phase !== 'WINDOW' || command.windowId !== session.window.id) return reject('WRONG_WINDOW')
  if (command.applyBlock !== session.window.applyBlock) return reject('WRONG_BLOCK')
  if (session.window.plans[command.participant]) return reject('ALREADY_SUBMITTED')
  if (command.expectedRevision !== session.revision) return reject('STALE_STATE')
  if (command.order.type === 'POSTURE') return reject('UNSUPPORTED_ORDER')
  if (command.order.type === 'HALFTIME' && (!session.options.matchRules || command.applyBlock !== 3)) return reject('UNSUPPORTED_ORDER')
  if (session.options.matchRules && command.order.type === 'STRATEGY' && command.applyBlock !== 3) return reject('UNSUPPORTED_ORDER')
  if (command.order.type === 'HALFTIME' && !isStrategyId(command.order.parameters.strategy)) return reject('INVALID_STRATEGY')
  if (command.order.type === 'HALFTIME' && command.order.parameters.substitution && !substitutionValid(session, command)) return reject('INVALID_SUBSTITUTION')
  if (command.order.type === 'STRATEGY' && !isStrategyId(command.order.parameters.strategy)) return reject('INVALID_STRATEGY')
  if (command.order.type === 'SUBSTITUTE' && !substitutionValid(session, command)) return reject('INVALID_SUBSTITUTION')
  const receipt: Receipt = { id: command.id, command: copy(command), revision: session.revision + 1, status: 'ACCEPTED' }
  return success({ ...copy(session), revision: receipt.revision, window: { ...copy(session.window), plans: { ...copy(session.window.plans), [command.participant]: copy(command) } }, receipts: [...copy(session.receipts), receipt] })
}

/** Both plans apply together; arrival order cannot change sports state or RNG. */
export function applyWindow(session: Session): Outcome {
  if (session.phase !== 'WINDOW' || !session.window?.plans.local || !session.window.plans.cpu) return fail('INVALID_PHASE')
  const next = copy(session)
  const entered = { local: [...next.entered.local], cpu: [...next.entered.cpu] }
  const departed = { local: [...next.departed.local], cpu: [...next.departed.cpu] }
  const applied = [...next.applied]
  for (const side of SIDES) {
    const command = next.window!.plans[side]!
    if (applied.some((d) => d.id === command.id)) return fail('DUPLICATE_COMMAND')
    let order = command.order
    if (order.type === 'HALFTIME') {
      next.kernel.selection = { ...next.kernel.selection, [side]: order.parameters.strategy }
      order = order.parameters.substitution ? { type: 'SUBSTITUTE', parameters: order.parameters.substitution } : { type: 'KEEP', parameters: {} }
    }
    if (order.type === 'STRATEGY') next.kernel.selection = { ...next.kernel.selection, [side]: order.parameters.strategy }
    if (order.type === 'SUBSTITUTE') {
      if (!substitutionValid(next, command)) return fail('INVALID_SUBSTITUTION')
      const { inId, outId } = order.parameters; const state = next.kernel.sides[side]
      const slot = DRAFT_SLOT_IDS.find((id) => state.team.lineup[id] === outId)!
      const lineup = { ...state.team.lineup, [slot]: inId } as DraftLineup
      state.unused = state.unused.filter((id) => id !== inId)
      state.team = { ...state.team, lineup, players: DRAFT_SLOT_IDS.map((id) => next.kernel.input.catalog.find((p) => p.id === lineup[id])!) }
      state.strength = calculateTeamStrength(state.team)
      state.features = tacticalFeatures(lineup, next.kernel.input.catalog, next.kernel.input.formations?.[side])
      state.subbed = true
      const event = { minute: MATCH_MINUTES[command.applyBlock], side, type: 'substitution' as const, playerId: inId, outPlayerId: outId }
      next.kernel.pendingChanges.push(event)
      next.kernel.substitutionLog.push({ minute: event.minute, side, outPlayerId: outId, inPlayerId: inId })
      entered[side].push(inId); departed[side].push(outId)
    }
    applied.push(command)
  }
  return success({ ...next, entered, departed, applied, window: null, phase: 'RUNNABLE', revision: next.revision + 1 })
}

/** A duplicate finish is a pure read; no extra possession draw. */
export function finishSession(session: Session): Outcome {
  if (session.phase === 'FINISHED') return success(copy(session))
  if (session.phase !== 'RUNNABLE' || session.kernel.nextBlock !== 6) return fail('INVALID_PHASE')
  const kernel = finishKernel(session.kernel)
  // subs-v1 is only an historical automatic-policy label. Mixed/manual logs live in the new envelope.
  if (SIDES.some((side) => session.benchMode[side] === 'manual-v1') && kernel.result) {
    const result = { ...kernel.result }
    delete (result as { substitutions?: unknown }).substitutions
    kernel.result = result
  }
  return success({ ...copy(session), kernel, phase: 'FINISHED', revision: session.revision + 1, result: { version: 'interactive-result-v1', kernelVersion: session.kernelVersion, decisions: copy(session.applied), substitutions: { version: 'interactive-subs-v1', modes: copy(session.benchMode), events: copy(kernel.substitutionLog) }, result: kernel.result!, ...(session.options.matchRules ? { matchRules: copy(session.options.matchRules) } : {}), ...(kernel.tree ? { plays: copy(kernel.tree.log) } : {}), ...(kernel.aerial ? { aerial: { version: kernel.aerial.version } } : {}), ...(kernel.director ? { moments: { version: kernel.director.version, selected: copy(kernel.director.selected) } } : {}) } })
}

export function exportResult(session: Session): Outcome<InteractiveResult> {
  return session.phase === 'FINISHED' && session.result ? success(copy(session.result)) : fail('NOT_FINISHED')
}

type DigestProvider = Pick<SubtleCrypto, 'digest'>
async function digest(value: unknown, provider: DigestProvider) {
  const data = new TextEncoder().encode(canonical(value))
  return Array.from(new Uint8Array(await provider.digest('SHA-256', data)), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** Store authority metadata separately in trusted storage. This is not a client-supplied signature. */
export async function checkpointSession(session: Session, provider: DigestProvider = globalThis.crypto.subtle) {
  const snapshot = JSON.stringify(session)
  return { snapshot, authority: { sessionId: session.sessionId, revision: session.revision, digest: await digest(JSON.parse(snapshot), provider) } satisfies CheckpointAuthority }
}

/** No re-simulation on restore. Trusted SHA-256 pins every nested field to the authority's checkpoint. */
export async function restoreSession(raw: unknown, authority: CheckpointAuthority, provider: DigestProvider = globalThis.crypto.subtle): Promise<Outcome> {
  try {
    const value: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!object(value) || !jsonSafe(value) || !exact(value, ['schemaVersion', 'kernelVersion', 'sessionId', 'revision', 'phase', 'kernel', 'options', 'benchMode', 'ownership', 'departed', 'entered', 'window', 'receipts', 'applied', 'result']) || value.schemaVersion !== 'interactive-session-v1' || value.kernelVersion !== 'action-v3-incremental-v1' || !integer(value.revision) || !text(value.sessionId) || !object(value.kernel) || !validInput(value.kernel.input)) return fail('INVALID_SNAPSHOT')
    if (!object(authority) || !exact(authority, ['sessionId', 'revision', 'digest']) || authority.sessionId !== value.sessionId || authority.revision !== value.revision || !/^[a-f0-9]{64}$/.test(authority.digest) || await digest(value, provider) !== authority.digest) return fail('INVALID_SNAPSHOT')
    const session = value as unknown as Session
    const initial = createSession(session.kernel.input as SessionInput, session.options)
    if (!initial.ok || !validSnapshotState(session, initial.value)) return fail('INVALID_SNAPSHOT')
    for (const receipt of session.receipts) {
      const command = parseDecision(receipt.command)
      if (!object(receipt) || !exact(receipt, ['id', 'command', 'revision', 'status'], receipt.status === 'REJECTED' ? ['reason'] : []) || !command || receipt.id !== command.id || !integer(receipt.revision) || receipt.revision > session.revision || !['ACCEPTED', 'REJECTED'].includes(receipt.status)) return fail('INVALID_SNAPSHOT')
    }
    return success(copy(session))
  } catch { return fail('INVALID_SNAPSHOT') }
}

/** Runtime-only helper for CPU/adapters; IDs are supplied by caller, not generated by the domain. */
export function decisionFor(session: Session, participant: MatchSide, id: string, order: Decision['order']): Decision {
  if (!session.window) throw new Error('no_intervention_window')
  return { version: 'interactive-command-v1', id, sessionId: session.sessionId, participant, expectedRevision: session.revision, windowId: session.window.id, applyBlock: session.window.applyBlock, order }
}

export type { Session, SessionInput, SessionOptions, Pair }
