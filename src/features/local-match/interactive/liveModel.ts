import { composeStrength, squadQuality } from '../squadQuality'
import { formationAffinity } from '../../tactics/formations'
import { tacticalAdjustment, ZERO_ADJUSTMENT } from '../../tactics/tacticalModel'
import type { SeriesSetup } from '../matchSeries'
import { createSession, applyWindow, decisionFor, submitDecision } from './session'
import type { MatchSide } from '../matchTypes'
import type { Order, Outcome, Session } from './types'
import { cpuInstruction } from './instructionPolicy'
import type { CpuDifficulty } from '../../recruiter-duel/cpuPolicy'
import type { Player } from '../../../types/player'
import type { PendingPlay, PlayChoice } from './attackTree'

export function currentPower(s: Session, side: MatchSide) {
  const other = side === 'local' ? 'cpu' : 'local'; const k = s.kernel
  const adjustment = tacticalAdjustment(k.selection[side], k.sides[side].features, k.sides[other].features, k.selection[other], Math.min(5, k.nextBlock))
  const affinity = k.input.formations ? formationAffinity(k.input.formations[side], k.selection[side]) : ZERO_ADJUSTMENT
  const combined = { attack: adjustment.attack + affinity.attack, defense: adjustment.defense + affinity.defense, midfield: adjustment.midfield + affinity.midfield }
  return { base: k.sides[side].strength, effective: composeStrength(k.sides[side].strength, (k.advantage?.side === side ? k.advantage.bonus : 0) + (k.input.rosterBonus ? squadQuality(k.sides[side].team.players).bonus : 0), k.input.coaches?.[side] ?? ZERO_ADJUSTMENT, combined) }
}

/** A window token makes rapid/retried UI clicks harmless; CPU chooses before seeing a human instruction. */
export function confirmLiveOrder(s: Session, windowId: string, side: MatchSide, order: Order, versusCpu: boolean, difficulty: CpuDifficulty): Outcome {
  if (s.phase !== 'WINDOW' || s.window?.id !== windowId || s.window.plans[side]) return { ok: false, error: 'DUPLICATE_COMMAND' }
  let current = s
  if (versusCpu && !current.window!.plans.cpu) {
    const cpu = submitDecision(current, 'cpu', decisionFor(current, 'cpu', `${windowId}:cpu`, cpuInstruction(current, difficulty)))
    if (!cpu.ok) return cpu
    current = cpu.value
  }
  const human = submitDecision(current, side, decisionFor(current, side, `${windowId}:${side}`, order))
  if (!human.ok) return human
  return human.value.window!.plans.local && human.value.window!.plans.cpu ? applyWindow(human.value) : human
}

/** Choice used when the player asks to simulate the rest: the flank with the better receiver, then the shot. Documented in the confirmation text. */
export function defaultPlayChoice(play: PendingPlay, catalog: readonly Player[]): PlayChoice {
  const usable = play.options.filter((option) => option.available)
  if (play.node === 'HEADER') return 'GOAL_CENTER'
  if (play.node === 'DEFEND') return 'INTERCEPT'
  if (play.node === 'FINISH') return (usable.find((option) => option.choice === 'SHOOT') ?? usable[0]).choice
  const rating = (id: string | null) => catalog.find((p) => p.id === id)?.overall_rating ?? -1
  return [...usable].sort((a, b) => rating(b.playerId) - rating(a.playerId))[0].choice
}

/** Explicit opt-in only. KEEP for both sides replaces every remaining instruction, including CPU choices. */
export function keepWindow(s: Session): Outcome {
  if (!s.window || s.phase !== 'WINDOW' || s.window.plans.local || s.window.plans.cpu) return { ok: false, error: 'INVALID_PHASE' }
  let current = s
  for (const side of ['local', 'cpu'] as const) {
    const next = submitDecision(current, side, decisionFor(current, side, `${s.window.id}:${side}`, { type: 'KEEP', parameters: {} }))
    if (!next.ok) return next
    current = next.value
  }
  return applyWindow(current)
}

/** Non-halftime windows remain auditable. Only an explicitly requested substitution can replace KEEP. */
export function resolveQuietWindow(s: Session, requested?: { readonly side: MatchSide; readonly order: Order }, deferSide?: MatchSide): Outcome {
  if (!s.options.matchRules || !s.window || s.window.applyBlock === 3 || requested && !['KEEP', 'SUBSTITUTE'].includes(requested.order.type) || deferSide !== undefined && deferSide === requested?.side) return { ok: false, error: 'INVALID_PHASE' }
  if (requested && s.window.plans[requested.side]) return { ok: false, error: 'DUPLICATE_COMMAND' }
  let current = s
  for (const side of ['local', 'cpu'] as const) {
    if (current.window!.plans[side] || side === deferSide) continue
    const order: Order = requested?.side === side ? requested.order : { type: 'KEEP', parameters: {} }
    const next = submitDecision(current, side, decisionFor(current, side, `${s.window.id}:${side}:${requested?.side === side ? 'optional' : 'auto-keep'}`, order))
    if (!next.ok) return next
    current = next.value
  }
  return current.window!.plans.local && current.window!.plans.cpu ? applyWindow(current) : { ok: true, value: current }
}

export function nextLiveSession(first: Session, index: number, setup: SeriesSetup) {
  return createSession({ ...first.kernel.input, actionModel: 'action-v3', seed: `${first.kernel.input.seed}:series:${index}`, localLineup: setup.lineups.local, cpuLineup: setup.lineups.cpu, benches: setup.benches, formations: setup.formations, tactics: setup.tactics ? { version: 'tactics-v1', ...setup.tactics } : undefined }, { ...first.options, sessionId: `${first.sessionId}:series:${index}` })
}
