import { webcrypto } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { RecruiterDuelGame } from '../../recruiter-duel/auctionTypes'
import { createRecruiterDuel } from '../../recruiter-duel/auctionEngine'
import { COACH_CATALOG } from '../../coaches/coachCatalog'
import { simulateMatch } from '../simulator'
import { createSession, advanceBlock, checkpointSession, restoreSession, submitDecision, decisionFor } from './session'
import { confirmLiveOrder, currentPower, keepWindow, nextLiveSession } from './liveModel'
import { cpuInstruction, makeInstructionPolicy } from './instructionPolicy'
import { inspectSession } from './session'
import { createDuelSession } from './duelSession'
import { liveInput, liveSession, must } from './liveFixtures.test-support'
import type { Session } from './types'

const keep = { type: 'KEEP', parameters: {} } as const
const windowOf = (s: Session) => must(advanceBlock(must(advanceBlock(s))))
function run(initial: Session, cpu = false, intervene = false) {
  let s = initial
  while (s.phase !== 'FINISHED') {
    if (s.phase !== 'WINDOW') s = must(advanceBlock(s))
    else if (cpu) s = must(confirmLiveOrder(s, s.window!.id, 'local', intervene && s.kernel.nextBlock === 2 ? { type: 'STRATEGY', parameters: { strategy: 'LOW_BLOCK' } } : intervene && s.kernel.nextBlock === 3 ? { type: 'SUBSTITUTE', parameters: { inId: 'live_local_11', outId: s.kernel.input.localLineup.LB! } } : keep, true, 'HARD'))
    else s = must(keepWindow(s))
  }
  return s
}

describe('SIM-005 local boundaries and policy', () => {
  it('preserves real acquisition spend, discounted coach, bench, origin and future series roster', () => {
    const input = liveInput()
    const created = createRecruiterDuel(input.catalog, 'ledger')
    if (!created.ok) throw new Error(created.error)
    const team = (lineup: typeof input.localLineup, side: 'local' | 'cpu') => ({ lineup, formation: '4-3-3' as const, spent: 70, coachId: COACH_CATALOG[0].id, coachPrice: 1, bench: input.benches![side].map((id) => ({ playerId: id, position: input.catalog.find((p) => p.id === id)!.position })) })
    const game: RecruiterDuelGame = { ...created.game, phase: 'TEAMS_COMPLETED', config: { version: 1, budget: 150, substitutes: true, coaches: true, names: { recruiter_one: null, recruiter_two: null } }, teams: { recruiter_one: team(input.localLineup, 'local'), recruiter_two: team(input.cpuLineup, 'cpu') } }
    const original = structuredClone(game)
    const s = must(createDuelSession(game, input.catalog, { recruiter_one: 'HIGH_PRESS', recruiter_two: 'LOW_BLOCK' }))
    expect(s.options.acquisition!.local).toEqual({ spent: 69, coachPaid: 1, budget: 150 })
    expect(s.kernel.input.benches).toEqual(input.benches)
    expect(s.kernel.blocks).toHaveLength(0); expect(s.result).toBeNull()
    expect(game).toEqual(original)
    const next = must(nextLiveSession(s, 2, { lineups: { local: input.localLineup, cpu: input.cpuLineup }, benches: input.benches, formations: input.formations, tactics: { local: 'WIDE_PLAY', cpu: 'NEUTRAL' } }))
    expect(next.options.acquisition).toEqual(s.options.acquisition)
    expect(next.kernel.input.seed).toBe('ledger:match:series:2')
    expect(next.ownership).toEqual(s.ownership); expect(next.kernel.blocks).toHaveLength(0)
    expect(createDuelSession({ ...game, phase: 'BIDDING' }, input.catalog, { recruiter_one: 'HIGH_PRESS', recruiter_two: 'LOW_BLOCK' }).ok).toBe(false)
  })

  it.each(['EASY', 'NORMAL', 'HARD'] as const)('is deterministic and independent of private human commands: %s', (difficulty) => {
    const s = windowOf(liveSession()); const frozen = structuredClone(s)
    const order = cpuInstruction(s, difficulty)
    expect(cpuInstruction(s, difficulty)).toEqual(order)
    const withPrivate = must(submitDecision(s, 'local', decisionFor(s, 'local', 'secret', { type: 'STRATEGY', parameters: { strategy: 'WIDE_PLAY' } })))
    expect(cpuInstruction(withPrivate, difficulty)).toEqual(order)
    expect(s).toEqual(frozen)
    const own = s.kernel.sides.cpu
    const policy = makeInstructionPolicy({ lineup: own.team.lineup, players: own.team.players, bench: [], formation: '4-3-3', strategy: s.kernel.selection.cpu, changesLeft: 0 }, difficulty)
    expect(policy(inspectSession(s), { participant: 'cpu', seed: 'cpu-stream', cursor: 2, availableBench: [] })).toEqual(policy(inspectSession(withPrivate), { participant: 'cpu', seed: 'cpu-stream', cursor: 2, availableBench: [] }))
  })

  it('completes CPU and hot-seat, keeps prefixes, rejects duplicates/invalid subs and restores without replaying RNG', async () => {
    const origin = liveSession(); const at30 = windowOf(origin)
    const prefix = structuredClone(at30.kernel.blocks)
    expect(confirmLiveOrder(at30, at30.window!.id, 'local', { type: 'SUBSTITUTE', parameters: { inId: 'live_local_11', outId: at30.kernel.input.localLineup.ST! } }, true, 'HARD').ok).toBe(false)
    const changed = must(confirmLiveOrder(at30, at30.window!.id, 'local', { type: 'STRATEGY', parameters: { strategy: 'LOW_BLOCK' } }, true, 'HARD'))
    expect(changed.kernel.blocks).toEqual(prefix)
    expect(confirmLiveOrder(changed, at30.window!.id, 'local', keep, true, 'HARD')).toEqual({ ok: false, error: 'DUPLICATE_COMMAND' })
    const snapshot = await checkpointSession(changed, webcrypto.subtle as SubtleCrypto)
    const restored = must(await restoreSession(snapshot.snapshot, snapshot.authority, webcrypto.subtle as SubtleCrypto))
    expect(run(restored, true)).toEqual(run(changed, true))
    const final = run(origin, true, true)
    expect(final).toEqual(run(origin, true, true))
    expect(final.applied).toHaveLength(8); expect(final.phase).toBe('FINISHED'); expect(final.window).toBeNull()
    expect(final.entered.local).toEqual(['live_local_11'])
    expect(final.kernel.blocks.slice(0, 2)).toEqual(prefix)
    expect(final.kernel.blocks.slice(2)).not.toEqual(run(origin).kernel.blocks.slice(2))
    let hot = at30
    hot = must(confirmLiveOrder(hot, hot.window!.id, 'local', keep, false, 'NORMAL'))
    expect(hot.phase).toBe('WINDOW'); expect(inspectSession(hot)).not.toHaveProperty('plans')
    hot = must(confirmLiveOrder(hot, hot.window!.id, 'cpu', keep, false, 'NORMAL'))
    expect(run(hot)).toEqual(run(origin))
  })

  it('KEEP preserves historical automatic parity for the corresponding no-auto-sub mode', () => {
    const input = liveInput('keep-parity')
    const live = run(must(createSession(input, { sessionId: 'parity', benchMode: { local: 'manual-v1', cpu: 'manual-v1' } })))
    const historical = simulateMatch({ ...input, benches: undefined })
    expect(live.result!.result.blocks).toEqual(historical.blocks)
    expect(live.result!.result.score).toEqual(historical.score)
    expect(live.result!.result.stats).toEqual(historical.stats)
    expect(currentPower(live, 'local').base).toEqual(currentPower(liveSession('keep-parity'), 'local').base)
  })

  it('compares automatic and interactive outcomes over 300 paired synthetic seeds', () => {
    const totals = () => ({ goals: 0, localWins: 0, draws: 0, substitutions: 0 })
    const automatic = totals(), interactive = totals(), legacyAutomaticBench = totals(); let changed = 0
    for (let i = 0; i < 300; i++) {
      const input = liveInput(`sim005-calibration:${i}`)
      // New quick games retain the existing manual bench rule: only the confirmed eleven plays.
      const batch = simulateMatch({ ...input, benches: undefined })
      const legacy = simulateMatch(input)
      const live = run(liveSession(input.seed), true, true).result!
      for (const [result, total, subs] of [[batch, automatic, batch.substitutions?.events.length ?? 0], [live.result, interactive, live.substitutions.events.length], [legacy, legacyAutomaticBench, legacy.substitutions?.events.length ?? 0]] as const) {
        total.goals += result.score.local + result.score.cpu
        total.localWins += Number(result.winner === 'local'); total.draws += Number(result.winner === 'draw'); total.substitutions += subs
      }
      changed += Number(JSON.stringify(batch.blocks) !== JSON.stringify(live.result.blocks))
    }
    const report = { seeds: 300, population: 'synthetic equal-cost squads, fixed lineup/bench; not a real catalog balance claim', automatic, interactive, legacyAutomaticBench, changed, meanGoalsDelta: (interactive.goals - automatic.goals) / 300, method: 'Paired seeds. Actual quick mode (confirmed eleven, no auto-subs) versus local LOW_BLOCK at30, DEF substitution at45, KEEP thereafter; CPU HARD policy. Legacy auto-subs recorded separately. No boosts or model changes.' }
    writeFileSync('docs/qa/SIM-005-calibration.json', JSON.stringify(report, null, 2) + '\n')
    expect(changed).toBeGreaterThan(0); expect(interactive.substitutions).toBeGreaterThan(0)
  })
})
