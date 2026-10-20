import { createHash, webcrypto } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Player } from '../../../types/player'
import type { DraftLineup } from '../../draft/draftTypes'
import { FORMATION_IDS, formationSlots, type FormationId } from '../../tactics/formations'
import { STRATEGY_IDS } from '../../tactics/strategies'
import { CATEGORY_GROUPS } from '../../themed-modes/categoryTree'
import { catalogForMode } from '../../themed-modes/modeCatalog'
import { playerIdentityKey } from '../../player-catalog/playerIdentity'
import { simulateMatch } from '../simulator'
import { nextSeriesMatch } from '../matchSeries'
import { initializeKernel, advanceKernel, finishKernel } from './kernel'
import { createSession, advanceBlock, applyWindow, decisionFor, exportResult, finishSession, inspectSession, receiptFor, submitDecision, checkpointSession, restoreSession } from './session'
import type { Outcome, Session, SessionInput, Order, InstructionPolicy } from './types'

const sha = webcrypto.subtle as SubtleCrypto
const get = <T,>(outcome: Outcome<T>): T => { if (!outcome.ok) throw new Error(outcome.error); return outcome.value }
const clone = <T,>(value: T): T => structuredClone(value)
const keep = { type: 'KEEP', parameters: {} } as const

function fixture(seed = 'interactive', formation: FormationId = '4-3-3', withBench = true): SessionInput {
  const catalog: Player[] = []
  const lineups = {} as Record<'local' | 'cpu', DraftLineup>
  const benches = {} as Record<'local' | 'cpu', string[]>
  for (const [j, side] of (['local', 'cpu'] as const).entries()) {
    const add = (position: Player['position'], i: number) => {
      const id = `fixture_${side}_${i}`; const r = 77 + (i * 5 + j) % 18
      catalog.push({ id, name: id, position, era: '2020s', category: 'contemporary', reference_year: 2026, nationality: 'ARG', club_tag: 'SYNTHETIC', overall_rating: r, att_rating: r - 1, def_rating: r - 2, phy_rating: r, men_rating: r + 1, price: 4 })
      return id
    }
    lineups[side] = Object.fromEntries(formationSlots(formation).map((slot, i) => [slot.id, add(slot.position, i)])) as DraftLineup
    benches[side] = (['DEF', 'MED', 'DEL'] as const).map((position, i) => add(position, i + 11))
  }
  return { catalog, localLineup: lineups.local, cpuLineup: lineups.cpu, catalogVersion: 'catalog_v1', rulesVersion: 'local-match-v2', seed, actionModel: 'action-v3', budget: 150, formations: { local: formation, cpu: formation }, ...(withBench ? { benches } : {}), rosterBonus: true, tactics: { version: 'tactics-v1', local: 'HIGH_PRESS', cpu: 'COUNTER_ATTACK' }, coaches: { local: { id: 'fixed', attack: 2.5, defense: 1.25, midfield: 1.25 }, cpu: null } }
}

function resolveWindow(s: Session, local: Order = keep, cpu: Order = keep, reverse = false): Session {
  let session = s
  for (const side of reverse ? ['cpu', 'local'] as const : ['local', 'cpu'] as const) session = get(submitDecision(session, side, decisionFor(session, side, `${session.window!.id}:${side}`, side === 'local' ? local : cpu)))
  return get(applyWindow(session))
}
function run(session: Session): Session {
  while (session.phase !== 'FINISHED') session = session.phase === 'WINDOW' ? resolveWindow(session) : get(advanceBlock(session))
  return session
}
function windowSession(manual = false) {
  const input = fixture()
  const created = get(createSession(input, { sessionId: 'test', ...(manual ? { benchMode: { local: 'manual-v1', cpu: 'manual-v1' } } as const : {}) }))
  return get(advanceBlock(get(advanceBlock(created))))
}
function freeze<T>(input: T): T {
  if (typeof input === 'object' && input !== null) { Object.values(input).forEach(freeze); Object.freeze(input) }
  return input
}

describe('versioned block session', () => {
  it.each(FORMATION_IDS)('matches the full historical object through every pause, with and without subs: %s', async (formation) => {
    for (const bench of [false, true]) {
      const input = fixture(`parity:${formation}:${bench}`, formation, bench)
      const old = simulateMatch(input)
      let s = get(createSession(input, { sessionId: 'parity' }))
      const windows: number[] = []
      while (s.phase !== 'FINISHED') {
        const original = clone(s); freeze(s)
        if (s.phase === 'WINDOW') {
          windows.push(s.kernel.blocks.at(-1)!.minute)
          expect(advanceBlock(s)).toEqual({ ok: false, error: 'INVALID_PHASE' })
          const checkpoint = await checkpointSession(s, sha)
          const restored = get(await restoreSession(checkpoint.snapshot, checkpoint.authority, sha))
          expect(restored).toEqual(s)
          s = resolveWindow(restored)
        } else s = get(advanceBlock(s))
        expect(original.kernel.blocks).toEqual(old.blocks.slice(0, original.kernel.nextBlock))
      }
      expect(windows).toEqual([30, 45, 60, 75])
      expect(get(exportResult(s)).result).toEqual(old)
      expect(get(finishSession(s))).toEqual(s)
      expect(advanceBlock(s)).toEqual({ ok: false, error: 'INVALID_PHASE' })
      expect(s.kernel.blocks.flatMap((b) => b.events).filter((e) => e.type === 'final')).toHaveLength(1)
      const final = await checkpointSession(s, sha)
      expect(get(await restoreSession(final.snapshot, final.authority, sha))).toEqual(s)
      // Existing series still derives exactly the same second match from the exported baseline.
      expect(nextSeriesMatch(get(exportResult(s)).result, 2, input.catalog)).toEqual(nextSeriesMatch(old, 2, input.catalog))
    }
  })

  it.each([undefined, 'action-v1', 'action-v2', 'action-v3'] as const)('checks the extracted kernel against all historical models: %s', (actionModel) => {
    for (let i = 0; i < 12; i++) {
      const input = { ...fixture(`kernel:${i}`), actionModel }
      let k = initializeKernel(input)
      for (let block = 0; block < 6; block++) k = advanceKernel(k, { local: true, cpu: true })
      expect(finishKernel(k).result).toEqual(simulateMatch(input))
    }
  })

  it('never generates a future block, accepts only two plans, and preserves confirmed prefixes', () => {
    const s = freeze(windowSession(true)); const before = clone(s)
    const changed = resolveWindow(s, { type: 'STRATEGY', parameters: { strategy: 'LOW_BLOCK' } })
    expect(s).toEqual(before)
    expect(changed.kernel.blocks).toEqual(before.kernel.blocks)
    expect(changed.kernel.rng).toEqual(before.kernel.rng)
    const next = get(advanceBlock(changed))
    expect(next.kernel.blocks.slice(0, 2)).toEqual(before.kernel.blocks)
    expect(next.kernel.blocks).toHaveLength(3)
    expect(next.kernel.selection.local).toBe('LOW_BLOCK')
    expect(get(exportResult(run(changed))).result).toEqual(get(exportResult(run(resolveWindow(windowSession(true), { type: 'STRATEGY', parameters: { strategy: 'LOW_BLOCK' } })))).result)
    expect(applyWindow(s)).toEqual({ ok: false, error: 'INVALID_PHASE' })
    expect(exportResult(s)).toEqual({ ok: false, error: 'NOT_FINISHED' })
  })

  it('rejects duplicates, conflicting ids, stale revisions and forged actors without sports mutations', () => {
    const s = windowSession(); const command = decisionFor(s, 'local', 'one', keep)
    const accepted = get(submitDecision(s, 'local', command))
    expect(submitDecision(accepted, 'local', command)).toEqual({ ok: false, error: 'DUPLICATE_COMMAND' })
    expect(receiptFor(accepted, command.id)?.status).toBe('ACCEPTED')
    expect(submitDecision(accepted, 'local', { ...command, order: { type: 'STRATEGY', parameters: { strategy: 'NEUTRAL' } } })).toEqual({ ok: false, error: 'ID_CONFLICT' })
    expect(submitDecision(s, 'cpu', command)).toEqual({ ok: false, error: 'NOT_MEMBER' })
    const variations = [
      [{ ...command, id: 'stale', expectedRevision: -0 + s.revision - 1 }, 'STALE_STATE'],
      [{ ...command, id: 'past', applyBlock: 1 }, 'WRONG_BLOCK'],
      [{ ...command, id: 'wrong', windowId: 'after-90' }, 'WRONG_WINDOW'],
      [{ ...command, id: 'version', version: 'foreign' }, 'UNSUPPORTED_VERSION'],
      [{ ...command, id: 'strategy', order: { type: 'STRATEGY', parameters: { strategy: 'flying' } } }, 'INVALID_STRATEGY'],
      [{ ...command, id: 'posture', order: { type: 'POSTURE', parameters: { direction: 'ATTACK' } } }, 'UNSUPPORTED_ORDER'],
    ] as const
    for (const [cmd, code] of variations) {
      const before = clone(s); const result = submitDecision(freeze(s), 'local', cmd)
      expect(result.ok).toBe(false)
      if (!result.ok) { expect(result.error).toBe(code); expect(result.rejected!.session.kernel).toEqual(s.kernel); expect(result.rejected!.receipt.status).toBe('REJECTED') }
      expect(s).toEqual(before)
    }
    expect(submitDecision(s, 'local', { ...command, actorId: 'injected' })).toEqual({ ok: false, error: 'INVALID_PAYLOAD' })
    const complete = run(s); expect(submitDecision(complete, 'local', { ...command, id: 'finished' })).toEqual({ ok: false, error: 'INVALID_PHASE' })
  })

  it('supports manual substitutions with exclusive ownership and no returning or reused players', async () => {
    const s = windowSession(true); const input = s.kernel.input
    const incoming = input.benches!.local[0]; const out = input.localLineup.LB!
    const order = { type: 'SUBSTITUTE', parameters: { inId: incoming, outId: out } } as const
    const planned = resolveWindow(s, order)
    expect(planned.entered.local).toEqual([incoming]); expect(planned.departed.local).toEqual([out])
    expect(planned.kernel.sides.local.unused).not.toContain(incoming)
    expect(planned.kernel.sides.local.team.players).toHaveLength(11)
    expect(planned.kernel.rng).toEqual(s.kernel.rng)
    const checkpoint = await checkpointSession(planned, sha)
    expect(get(await restoreSession(checkpoint.snapshot, checkpoint.authority, sha))).toEqual(planned)
    const next = get(advanceBlock(planned))
    expect(next.kernel.blocks[2].events[0]).toMatchObject({ type: 'substitution', minute: 45, playerId: incoming, outPlayerId: out })
    for (const inId of [incoming, out, input.benches!.cpu[0], 'missing-player']) {
      const result = submitDecision(next, 'local', decisionFor(next, 'local', `invalid:${inId}`, { type: 'SUBSTITUTE', parameters: { inId, outId: input.localLineup.RB! } }))
      expect(result.ok).toBe(false); if (!result.ok) expect(result.error).toBe('INVALID_SUBSTITUTION')
    }
    expect(get(exportResult(run(next))).substitutions.events.filter((e) => e.side === 'local')).toHaveLength(1)
    expect(get(exportResult(run(next))).result.substitutions).toBeUndefined()
    const auto = windowSession(); expect(submitDecision(auto, 'local', decisionFor(auto, 'local', 'auto', order)).ok).toBe(false)
  })

  it('restores partial bilateral plans, stats and audit without accepting modified or foreign checkpoints', async () => {
    const s = windowSession(); const half = get(submitDecision(s, 'local', decisionFor(s, 'local', 'half', keep)))
    const checkpoint = await checkpointSession(half, sha)
    const restored = get(await restoreSession(checkpoint.snapshot, checkpoint.authority, sha))
    expect(restored.kernel.stats).toEqual(half.kernel.stats)
    expect(restored.window!.plans.local).toEqual(half.window!.plans.local)
    const finalPlan = get(submitDecision(restored, 'cpu', decisionFor(restored, 'cpu', 'other', keep)))
    expect(get(applyWindow(finalPlan)).phase).toBe('RUNNABLE')
    for (const mutate of [
      (x: Session) => { x.kernel.score.local++ },
      (x: Session) => { x.kernel.rng.main = { ...x.kernel.rng.main, state: x.kernel.rng.main.state + 1 } },
      (x: Session) => { x.kernel.blocks.pop() },
      (x: Session) => { (x as unknown as Record<string, unknown>).schemaVersion = 'foreign' },
      (x: Session) => { x.kernel.sides.local.unused.push('rival') },
      (x: Session) => { (x as unknown as { phase: string; window: null }).phase = 'RUNNABLE'; (x as unknown as { window: null }).window = null },
    ]) {
      const corrupted = clone(half); mutate(corrupted)
      expect(await restoreSession(corrupted, checkpoint.authority, sha)).toEqual({ ok: false, error: 'INVALID_SNAPSHOT' })
      // Even a trusted-storage programming bug with freshly computed digest must fail structural validation.
      const broken = await checkpointSession(corrupted, sha)
      expect(await restoreSession(broken.snapshot, broken.authority, sha)).toEqual({ ok: false, error: 'INVALID_SNAPSHOT' })
    }
    expect(await restoreSession(checkpoint.snapshot, { ...checkpoint.authority, revision: 99 }, sha)).toEqual({ ok: false, error: 'INVALID_SNAPSHOT' })
  })

  it('exposes a private-data-free, JSON-safe CPU/authority projection and order-independent sports outcomes', () => {
    const s = windowSession(true)
    const policy: InstructionPolicy = (view, context) => ({ order: view.score[context.participant] >= 0 ? keep : keep, nextCursor: context.cursor })
    expect(policy(inspectSession(s), { participant: 'local', seed: 'policy', cursor: 0, availableBench: [] }).order).toEqual(keep)
    const order = { type: 'STRATEGY', parameters: { strategy: 'WIDE_PLAY' } } as const
    const a = run(resolveWindow(s, order, keep)); const b = run(resolveWindow(s, order, keep, true))
    expect(get(exportResult(a)).result).toEqual(get(exportResult(b)).result)
    const view = inspectSession(s)
    expect(JSON.stringify(view)).not.toMatch(/rng|seed|plans|receipts/)
    expect(JSON.parse(JSON.stringify(view))).toEqual(view)
    expect(createSession({ ...fixture(), actionModel: 'action-v2' } as unknown as SessionInput, { sessionId: 'bad' }).ok).toBe(false)
    expect(createSession({ ...fixture(), cpuLineup: fixture().localLineup }, { sessionId: 'shared' }).ok).toBe(false)
    expect(createSession(fixture(), { sessionId: 'x'.repeat(129) })).toEqual({ ok: false, error: 'INVALID_PAYLOAD' })
    expect(createSession(fixture(), { sessionId: 'bad-budget', acquisition: { local: { spent: 151, coachPaid: 0, budget: 150 }, cpu: { spent: 56, coachPaid: 0, budget: 150 } } })).toEqual({ ok: false, error: 'BUDGET_EXCEEDED' })
  })

  it('reproduces a complete mixed instruction sequence after restoring every tactical window and a rejected command', async () => {
    const play = async (restore: boolean) => {
      let s = get(createSession(fixture('ordered-replay'), { sessionId: 'ordered', benchMode: { local: 'manual-v1', cpu: 'manual-v1' } }))
      while (s.phase !== 'FINISHED') {
        if (s.phase !== 'WINDOW') { s = get(advanceBlock(s)); continue }
        const rejected = submitDecision(s, 'local', { ...decisionFor(s, 'local', `reject:${s.window!.id}`, keep), applyBlock: 0 })
        if (rejected.ok || !rejected.rejected) throw new Error('expected rejection receipt')
        s = rejected.rejected.session
        if (restore) { const saved = await checkpointSession(s, sha); s = get(await restoreSession(saved.snapshot, saved.authority, sha)) }
        const block = s.window!.applyBlock
        const order: Order = block === 3 || block === 5
          ? { type: 'SUBSTITUTE', parameters: { inId: s.kernel.input.benches!.local[block === 3 ? 0 : 1], outId: s.kernel.input.localLineup[block === 3 ? 'LB' : 'LCM']! } }
          : { type: 'STRATEGY', parameters: { strategy: block === 2 ? 'LOW_BLOCK' : 'COUNTER_ATTACK' } }
        s = resolveWindow(s, order)
      }
      return s
    }
    expect(await play(true)).toEqual(await play(false))
  })

  it('keeps dominant foot informational in both historical and incremental results', () => {
    const a = fixture('foot', '4-3-3', false)
    const b = { ...a, catalog: a.catalog.map((p) => ({ ...p, dominantFoot: 'LEFT' as const })) }
    const first = get(exportResult(run(get(createSession(a, { sessionId: 'foot' }))))).result
    const second = get(exportResult(run(get(createSession(b, { sessionId: 'foot' }))))).result
    expect(second.blocks).toEqual(first.blocks); expect(second.stats).toEqual(first.stats); expect(second.strengths).toEqual(first.strengths)
  })

  it('caps manual changes at three, rejects wrong lines and keeps automatic and manual benches separate', () => {
    let s = windowSession(true)
    const slots = ['LB', 'LCM', 'ST'] as const
    for (let i = 0; i < 3; i++) {
      const inId = s.kernel.input.benches!.local[i]
      const outId = s.kernel.input.localLineup[slots[i]]!
      if (i === 0) {
        const wrong = submitDecision(s, 'local', decisionFor(s, 'local', 'wrong-line', { type: 'SUBSTITUTE', parameters: { inId, outId: s.kernel.input.localLineup.ST! } }))
        expect(wrong.ok).toBe(false)
      }
      s = get(advanceBlock(resolveWindow(s, { type: 'SUBSTITUTE', parameters: { inId, outId } })))
    }
    expect(s.entered.local).toHaveLength(3)
    expect(s.kernel.sides.local.unused).toHaveLength(0)
    const again = submitDecision(s, 'local', decisionFor(s, 'local', 'fourth', { type: 'SUBSTITUTE', parameters: { inId: s.entered.local[0], outId: s.kernel.input.localLineup.RB! } }))
    expect(again.ok).toBe(false)
    expect(get(exportResult(run(s))).substitutions.events).toHaveLength(3)
    const input = fixture('mixed')
    const mixed = get(createSession(input, { sessionId: 'mixed', benchMode: { local: 'manual-v1', cpu: 'auto-subs-v1' } }))
    const finished = run(mixed)
    expect(finished.kernel.sides.local.unused).toEqual(input.benches!.local)
    expect(finished.result!.substitutions.events.every((e) => e.side === 'cpu')).toBe(true)
  })

  it('preserves the historical failed substitute attempt with no eligible slot', () => {
    const input = fixture('unused-keeper')
    const keeper: Player = { ...input.catalog[0], position: 'ARQ', id: 'bench-keeper', name: 'Synthetic reserve keeper' }
    const source = { ...input, catalog: [...input.catalog, keeper], benches: { local: [keeper.id], cpu: [] } }
    const result = run(get(createSession(source, { sessionId: 'keeper' })))
    expect(get(exportResult(result)).result).toEqual(simulateMatch(source))
    expect(result.kernel.substitutionLog).toHaveLength(0)
  })

  it('calibrates 168 full-result pairs from all fourteen editions with zero drift', () => {
    const report: { mode: string; pairs: number; mismatches: number; goals: number; wins: number; draws: number; digest: string }[] = []
    for (const mode of CATEGORY_GROUPS.flatMap((g) => [...g.modes])) {
      const catalog = catalogForMode(mode); const used = new Set<string>()
      const pick = (position: Player['position']) => { const p = catalog.find((p) => p.position === position && !used.has(playerIdentityKey(p.name)))!; used.add(playerIdentityKey(p.name)); return p.id }
      const lineup = () => Object.fromEntries(formationSlots().map((slot) => [slot.id, pick(slot.position)])) as DraftLineup
      const localLineup = lineup(); const cpuLineup = lineup()
      const benches = { local: (['DEF', 'MED', 'DEL'] as const).map(pick), cpu: (['DEF', 'MED', 'DEL'] as const).map(pick) }
      let goals = 0; let wins = 0; let draws = 0; const hashes: string[] = []
      for (let i = 0; i < 12; i++) {
        const input: SessionInput = { catalog, localLineup, cpuLineup, catalogVersion: 'catalog_v1', rulesVersion: 'local-match-v2', actionModel: 'action-v3', seed: `sim004b:${mode}:${i}`, budget: 1000, ...(i % 2 ? { benches } : {}), rosterBonus: true, tactics: { version: 'tactics-v1', local: STRATEGY_IDS[i % 6], cpu: STRATEGY_IDS[(i + 2) % 6] } }
        const old = simulateMatch(input)
        const result = get(exportResult(run(get(createSession(input, { sessionId: 'calibration' }))))).result
        expect(result).toEqual(old)
        goals += old.score.local + old.score.cpu; wins += Number(old.winner === 'local'); draws += Number(old.winner === 'draw')
        hashes.push(createHash('sha256').update(JSON.stringify(result)).digest('hex'))
      }
      report.push({ mode, pairs: 12, mismatches: 0, goals, wins, draws, digest: createHash('sha256').update(hashes.join('\n')).digest('hex') })
    }
    writeFileSync('docs/qa/SIM-004B-calibration.json', JSON.stringify({ version: 'sim004b-parity-v1', pairs: 168, mismatches: 0, report }, null, 2) + '\n')
  }, 30000)
})
