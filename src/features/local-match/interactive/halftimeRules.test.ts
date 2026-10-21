import { webcrypto } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { advanceBlock, applyWindow, checkpointSession, createSession, decisionFor, restoreSession, submitDecision, submitPlay } from './session'
import { confirmLiveOrder, keepWindow, nextLiveSession, resolveQuietWindow } from './liveModel'
import { cpuInstruction } from './instructionPolicy'
import { liveInput, must } from './liveFixtures.test-support'
import type { Order, Session } from './types'

const keep: Order = { type: 'KEEP', parameters: {} }
const create = (moments = false) => must(createSession(liveInput('halftime-fixture'), { sessionId: 'halftime', benchMode: { local: 'manual-v1', cpu: 'manual-v1' }, matchRules: { version: 'halftime-ovr-v1' }, ...(moments ? { moments: { version: 'match-moments-v1' }, aerial: { version: 'directed-header-v1' } } : {}) }))
const advancePlay = (s: Session) => { const p = s.kernel.partial!.play!; return must(submitPlay(s, { version: 'interactive-play-command-v1', id: `${p.id}:${p.node}`, sessionId: s.sessionId, expectedRevision: s.revision, playId: p.id, node: p.node, choice: p.node === 'DEFEND' ? 'PRESS' : p.node === 'FINISH' ? 'CROSS' : p.node === 'HEADER' ? 'FAR_POST' : p.options.find((o) => o.available)!.choice })) }
const untilWindow = (s: Session): Session => { while (!['WINDOW', 'FINISHED'].includes(s.phase)) s = s.phase === 'PLAY' ? advancePlay(s) : must(advanceBlock(s)); return s }

describe('halftime-ovr-v1 flow and compatibility', () => {
  it('keeps initial tactics through 45, audits automatic KEEP at 30/60/75 and changes only second-half blocks', () => {
    let s = untilWindow(create())
    expect(s.window!.applyBlock).toBe(2)
    const oldPrefix = structuredClone(s.kernel.blocks)
    expect(submitDecision(s, 'local', decisionFor(s, 'local', 'illegal30', { type: 'STRATEGY', parameters: { strategy: 'LOW_BLOCK' } }))).toMatchObject({ ok: false, error: 'UNSUPPORTED_ORDER' })
    s = must(resolveQuietWindow(s)); expect(s.kernel.selection.local).toBe('HIGH_PRESS')
    expect(s.applied.map((d) => d.order.type)).toEqual(['KEEP', 'KEEP'])
    expect(s.applied.every((d) => d.id.endsWith('auto-keep'))).toBe(true)
    s = untilWindow(s); expect(s.window!.applyBlock).toBe(3)
    const firstHalf = structuredClone(s.kernel.blocks)
    s = must(confirmLiveOrder(s, s.window!.id, 'local', { type: 'STRATEGY', parameters: { strategy: 'LOW_BLOCK' } }, true, 'HARD'))
    expect(s.kernel.selection.local).toBe('LOW_BLOCK'); expect(s.kernel.blocks).toEqual(firstHalf)
    for (const block of [4, 5]) { s = untilWindow(s); expect(s.window!.applyBlock).toBe(block); expect(cpuInstruction(s, 'HARD')).toEqual(keep); s = must(resolveQuietWindow(s)); expect(s.kernel.selection.local).toBe('LOW_BLOCK') }
    s = untilWindow(s); expect(s.phase).toBe('FINISHED'); expect(s.kernel.blocks.slice(0, 2)).toEqual(oldPrefix)
    expect(s.applied).toHaveLength(8); expect(s.result!.matchRules?.version).toBe('halftime-ovr-v1')
  })

  it('applies strategy and substitute atomically at halftime; refuses an invalid substitution without losing the strategy decision', async () => {
    let s = untilWindow(must(resolveQuietWindow(untilWindow(create()))))
    const outId = s.kernel.input.localLineup.LB!; const inId = s.kernel.input.benches!.local[0]
    const order: Order = { type: 'HALFTIME', parameters: { strategy: 'WIDE_PLAY', substitution: { outId, inId } } }
    const invalid = submitDecision(s, 'local', decisionFor(s, 'local', 'bad-combined', { ...order, parameters: { ...order.parameters, substitution: { outId: s.kernel.input.localLineup.ST!, inId } } }))
    expect(invalid).toMatchObject({ ok: false, error: 'INVALID_SUBSTITUTION' }); expect(s.kernel.selection.local).toBe('HIGH_PRESS')
    const firstHalf = structuredClone(s.kernel.blocks); const rng = structuredClone(s.kernel.rng)
    s = must(confirmLiveOrder(s, s.window!.id, 'local', order, true, 'NORMAL'))
    expect(s.kernel.selection.local).toBe('WIDE_PLAY'); expect(s.kernel.sides.local.team.lineup.LB).toBe(inId)
    expect(s.kernel.blocks).toEqual(firstHalf); expect(s.kernel.rng).toEqual(rng)
    expect(s.kernel.pendingChanges[0]).toMatchObject({ minute: 60, playerId: inId, outPlayerId: outId })
    const checkpoint = await checkpointSession(s, webcrypto.subtle as SubtleCrypto)
    expect(must(await restoreSession(checkpoint.snapshot, checkpoint.authority, webcrypto.subtle as SubtleCrypto))).toEqual(s)
    const forged = structuredClone(s); forged.kernel.selection = { ...forged.kernel.selection, local: 'NEUTRAL' }
    const bad = await checkpointSession(forged, webcrypto.subtle as SubtleCrypto)
    expect(await restoreSession(bad.snapshot, bad.authority, webcrypto.subtle as SubtleCrypto)).toMatchObject({ ok: false, error: 'INVALID_SNAPSHOT' })
  })

  it('keeps optional substitutions at quiet windows with no strategy change and rejects repeat use', () => {
    let s = untilWindow(create()); const outId = s.kernel.input.localLineup.LB!; const inId = s.kernel.input.benches!.local[0]
    s = must(resolveQuietWindow(s, { side: 'local', order: { type: 'SUBSTITUTE', parameters: { outId, inId } } }))
    expect(s.entered.local).toEqual([inId]); expect(s.kernel.selection.local).toBe('HIGH_PRESS')
    expect(resolveQuietWindow(s)).toMatchObject({ ok: false })
    s = untilWindow(s); expect(submitDecision(s, 'local', decisionFor(s, 'local', 'reuse', { type: 'SUBSTITUTE', parameters: { outId, inId } }))).toMatchObject({ ok: false, error: 'INVALID_SUBSTITUTION' })
  })

  it('CPU halftime policy cannot see future events or a private human plan', () => {
    const s = untilWindow(must(resolveQuietWindow(untilWindow(create()))))
    const before = cpuInstruction(s, 'HARD')
    const privatePlan = must(submitDecision(s, 'local', decisionFor(s, 'local', 'secret', { type: 'STRATEGY', parameters: { strategy: 'LOW_BLOCK' } })))
    expect(cpuInstruction(privatePlan, 'HARD')).toEqual(before)
    expect(['KEEP', 'STRATEGY']).toContain(before.type)
  })

  it('preserves simultaneous manual substitutions for both people at a quiet window', () => {
    const origin = untilWindow(create()); const prefix = structuredClone(origin.kernel.blocks)
    const order = (side: 'local' | 'cpu'): Order => ({ type: 'SUBSTITUTE', parameters: { outId: origin.kernel.input[side === 'local' ? 'localLineup' : 'cpuLineup'].LB!, inId: origin.kernel.input.benches![side][0] } })
    const first = must(resolveQuietWindow(origin, { side: 'local', order: order('local') }, 'cpu'))
    expect(first.phase).toBe('WINDOW'); expect(first.entered.local).toEqual([]); expect(first.window?.plans.cpu).toBeNull()
    const finished = must(resolveQuietWindow(first, { side: 'cpu', order: order('cpu') }))
    expect(finished.phase).toBe('RUNNABLE'); expect(finished.entered.local).toHaveLength(1); expect(finished.entered.cpu).toHaveLength(1)
    expect(finished.kernel.blocks).toEqual(prefix); expect(finished.kernel.selection).toEqual(origin.kernel.selection)
    expect(resolveQuietWindow(first, { side: 'local', order: order('local') })).toMatchObject({ ok: false, error: 'DUPLICATE_COMMAND' })
  })

  it('replays full decisions and restores every node/window/final with the extension pinned', async () => {
    vi.stubGlobal('crypto', webcrypto)
    try {
      let s = create(true)
      while (s.phase !== 'FINISHED') {
        const cp = await checkpointSession(s); expect(must(await restoreSession(cp.snapshot, cp.authority))).toEqual(s)
        if (s.phase === 'WINDOW') s = must(s.window!.applyBlock === 3 ? keepWindow(s) : resolveQuietWindow(s))
        else s = s.phase === 'PLAY' ? advancePlay(s) : must(advanceBlock(s))
      }
      const cp = await checkpointSession(s); expect(must(await restoreSession(cp.snapshot, cp.authority))).toEqual(s)
      let replay = create(true)
      while (replay.phase !== 'FINISHED') {
        if (replay.phase === 'WINDOW') { for (const side of ['local', 'cpu'] as const) { const d = s.applied.find((d) => d.windowId === replay.window!.id && d.participant === side)!; replay = must(submitDecision(replay, side, d)) } replay = must(applyWindow(replay)) }
        else replay = replay.phase === 'PLAY' ? advancePlay(replay) : must(advanceBlock(replay))
      }
      expect(replay).toEqual(s)
      const forged = structuredClone(s); forged.kernel.duels = undefined
      const bad = await checkpointSession(forged); expect(await restoreSession(bad.snapshot, bad.authority)).toMatchObject({ ok: false, error: 'INVALID_SNAPSHOT' })
    } finally { vi.unstubAllGlobals() }
  })

  it('starts each series encounter with its own initial tactics and independent halftime', () => {
    const first = create(true)
    const next = must(nextLiveSession(first, 2, { lineups: { local: first.kernel.input.localLineup, cpu: first.kernel.input.cpuLineup }, formations: { local: '4-3-3', cpu: '4-3-3' }, benches: first.kernel.input.benches!, tactics: { local: 'LOW_BLOCK', cpu: 'WIDE_PLAY' } }))
    expect(next.options.matchRules).toEqual(first.options.matchRules); expect(next.phase).toBe('RUNNABLE'); expect(next.applied).toEqual([])
    expect(next.kernel.selection.local).toBe('LOW_BLOCK'); expect(next.sessionId).not.toBe(first.sessionId)
  })

  it('leaves old sessions on four windows and rejects new combined orders there', () => {
    let old = must(createSession(liveInput(), { sessionId: 'old' })); old = untilWindow(old)
    expect(submitDecision(old, 'local', decisionFor(old, 'local', 'combined-old', { type: 'HALFTIME', parameters: { strategy: 'LOW_BLOCK', substitution: null } }))).toMatchObject({ ok: false, error: 'UNSUPPORTED_ORDER' })
    expect(submitDecision(old, 'local', decisionFor(old, 'local', 'strategy-old', { type: 'STRATEGY', parameters: { strategy: 'LOW_BLOCK' } }))).toMatchObject({ ok: true })
  })
})
