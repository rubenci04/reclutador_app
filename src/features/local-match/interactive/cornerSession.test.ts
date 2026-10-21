import { webcrypto } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { checkpointSession, createSession, inspectSession, restoreSession, submitPlay } from './session'
import { liveInput, must } from './liveFixtures.test-support'
import type { Session } from './types'
import { visibleStats } from '../playback'

import { cornerSession, cornerCommand, stepCornerSession } from './cornerFixtures.test-support'

describe('corners-v1 session integration', () => {
  it('is opt-in, requires R-05 plus the aerial/moment extensions and rejects unsupported versions', () => {
    expect(createSession(liveInput(), { sessionId: 'bad', corners: { version: 'corners-v1' } })).toMatchObject({ ok: false, error: 'INVALID_PAYLOAD' })
    expect(createSession(liveInput(), { ...cornerSession('valid').options, corners: { version: 'corners-v2' } } as never)).toMatchObject({ ok: false, error: 'INVALID_PAYLOAD' })
  })
  it('keeps 24 opportunities, no forced corner in every game, alternating sides and the existing moment cap', () => {
    let offensive = 0, defensive = 0, absent = 0
    for (let seed = 0; seed < 60; seed++) {
      let s = cornerSession(`corners:${seed}`)
      while (s.phase !== 'FINISHED') s = stepCornerSession(s)
      const events = s.kernel.blocks.flatMap((b) => b.events), awards = events.filter((e) => e.step === 'CORNER_AWARDED')
      expect(events.filter((e) => e.type === 'attack')).toHaveLength(24)
      expect(s.kernel.director!.selected.length).toBeLessThanOrEqual(3)
      expect(s.result!.corners?.families).toEqual(s.kernel.corners!.families)
      for (let n = 1; n < s.kernel.director!.selected.length; n++) expect(s.kernel.director!.selected[n].side).not.toBe(s.kernel.director!.selected[n - 1].side)
      offensive += awards.filter((e) => e.side === 'local').length; defensive += awards.filter((e) => e.side === 'cpu').length; absent += Number(!awards.length)
      const visible = visibleStats(events)
      for (const side of ['local', 'cpu'] as const) { expect(events.filter((e) => e.type === 'goal' && e.side === side)).toHaveLength(s.kernel.score[side]); for (const key of ['shots', 'shotsOnTarget', 'saves', 'recoveries'] as const) expect(visible[side][key]).toBe(s.kernel.stats[side][key]) }
      expect(s.applied.filter((d) => d.applyBlock !== 3).every((d) => d.order.type === 'KEEP')).toBe(true)
    }
    expect(offensive).toBeGreaterThan(0); expect(defensive).toBeGreaterThan(0); expect(absent).toBeGreaterThan(0)
  })
  it('restores every root/header/window/final, hides private intentions and rejects duplicate/stale choices', async () => {
    const nodes = new Set<string>()
    for (let seed = 0; seed < 8; seed++) {
      let s = cornerSession(`corners:${seed}`)
      while (s.phase !== 'FINISHED') {
        const cp = await checkpointSession(s, webcrypto.subtle as SubtleCrypto)
        const restored = await restoreSession(cp.snapshot, cp.authority, webcrypto.subtle as SubtleCrypto)
        expect(restored, `${s.phase}:${s.kernel.partial?.play?.node}:${seed}`).toMatchObject({ ok: true })
        expect(must(restored)).toEqual(s)
        if (s.phase === 'PLAY') {
          const p = s.kernel.partial!.play!; nodes.add(p.node)
          if (p.corner) { expect(inspectSession(s)).not.toHaveProperty('cornerRng'); expect(inspectSession(s).play).not.toHaveProperty('plan'); if (p.node !== 'CORNER_HEADER') expect(inspectSession(s).play!.corner).not.toHaveProperty('delivery') }
          const command = cornerCommand(s), next = stepCornerSession(s)
          expect(submitPlay(next, command)).toMatchObject({ ok: false, error: 'DUPLICATE_COMMAND' })
          expect(submitPlay(s, { ...command, expectedRevision: s.revision - 1 })).toMatchObject({ ok: false, error: 'STALE_STATE' })
          s = next
        } else s = stepCornerSession(s)
      }
      const cp = await checkpointSession(s, webcrypto.subtle as SubtleCrypto); expect(must(await restoreSession(cp.snapshot, cp.authority, webcrypto.subtle as SubtleCrypto))).toEqual(s)
    }
    expect(nodes.has('CORNER_ATTACK')).toBe(true); expect(nodes.has('CORNER_DEFEND')).toBe(true); expect(nodes.has('CORNER_HEADER')).toBe(true)
  })
  it('replays identical decisions, events, score and all RNG streams', () => {
    let s = cornerSession('corners:1')
    while (s.phase !== 'FINISHED') s = stepCornerSession(s)
    const log = [...s.result!.plays!]; let replay = cornerSession('corners:1')
    while (replay.phase !== 'FINISHED') { if (replay.phase === 'PLAY') { const entry = log.shift()!; expect(entry.node).toBe(replay.kernel.partial!.play!.node); replay = must(submitPlay(replay, { ...cornerCommand(replay), ...entry })) } else replay = stepCornerSession(replay) }
    expect(replay).toEqual(s); expect(log).toHaveLength(0)
  })
  it('rejects modified cause, beneficiary, actors, fixed CPU intent, cursor and family records even with a fresh digest', async () => {
    let s = cornerSession('corners:1')
    for (let guard = 0; !s.kernel.partial?.play?.corner && guard < 70; guard++) s = stepCornerSession(s)
    expect(s.kernel.partial!.play!.corner).toBeDefined()
    for (const mutate of [
      (x: Session) => { x.kernel.partial!.play = { ...x.kernel.partial!.play!, protagonistId: x.kernel.input.cpuLineup.ST! } },
      (x: Session) => { x.kernel.partial!.play = { ...x.kernel.partial!.play!, receiverId: x.kernel.partial!.play!.protagonistId } },
      (x: Session) => { x.kernel.partial!.play = { ...x.kernel.partial!.play!, sector: x.kernel.partial!.play!.sector === 'LEFT' ? 'RIGHT' : 'LEFT' } },
      (x: Session) => { x.kernel.corners!.plan = { ...x.kernel.corners!.plan!, keeper: x.kernel.corners!.plan!.keeper === 'FAR_POST' ? 'NEAR_POST' : 'FAR_POST' } },
      (x: Session) => { x.kernel.cornerRng = { ...x.kernel.cornerRng!, draws: 0 } },
      (x: Session) => { x.kernel.corners!.families[0] = 'OPEN_PLAY' },
      (x: Session) => { const e = x.kernel.partial!.events.find((e) => e.corner)!; (e as unknown as { corner: object }).corner = { ...e.corner, cause: 'UNRECORDED' } },
      (x: Session) => { const e = x.kernel.partial!.events.find((e) => e.corner)!; (e as unknown as { corner: object }).corner = { ...e.corner, awardedTo: 'cpu', kickerId: x.kernel.input.cpuLineup.ST } },
    ]) {
      const copy = structuredClone(s); mutate(copy); const cp = await checkpointSession(copy, webcrypto.subtle as SubtleCrypto)
      expect(await restoreSession(cp.snapshot, cp.authority, webcrypto.subtle as SubtleCrypto)).toMatchObject({ ok: false, error: 'INVALID_SNAPSHOT' })
    }
  })
})
