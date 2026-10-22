import { webcrypto } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { advanceBlock, checkpointSession, createSession, restoreSession, submitPlay } from './session'
import { keepWindow } from './liveModel'
import { liveInput, must } from './liveFixtures.test-support'
import { dribbleChance, DRIBBLE_CHOICES, pickCover, type DribbleSector, type PlayChoice } from './attackTree'
import type { Session } from './types'
import type { Player } from '../../../types/player'

const OPTIONS = { benchMode: { local: 'manual-v1', cpu: 'manual-v1' }, acquisition: { local: { spent: 69, coachPaid: 1, budget: 150 }, cpu: { spent: 70, coachPaid: 0, budget: 150 } }, moments: { version: 'match-moments-v1' }, aerial: { version: 'directed-header-v1' }, matchRules: { version: 'halftime-ovr-v1' } } as const
const create = (seed: string, dribble = true) => must(createSession(liveInput(seed), { sessionId: 'dribble-fixture', ...OPTIONS, ...(dribble ? { dribble: { version: 'dribble-mini-v1' as const } } : {}) }))
const choose = (s: Session, lane: PlayChoice = 'DRIBBLE_LEFT', precision?: number): Session => {
  const p = s.kernel.partial!.play!
  const choice: PlayChoice = p.node === 'DRIBBLE' ? lane : p.node === 'DEFEND' ? 'INTERCEPT' : p.node === 'FINISH' ? 'SHOOT' : p.node === 'HEADER' || p.node === 'FK_HEADER' || p.node === 'CORNER_HEADER' ? 'GOAL_CENTER' : p.options.find((o) => o.available)!.choice
  return must(submitPlay(s, { version: 'interactive-play-command-v1', sessionId: s.sessionId, expectedRevision: s.revision, id: `${p.id}:${p.node}`, playId: p.id, node: p.node, choice, ...(p.node === 'DRIBBLE' && precision !== undefined ? { precision } : {}) }))
}
const step = (s: Session, lane?: PlayChoice, precision?: number): Session => s.phase === 'PLAY' ? choose(s, lane, precision) : s.phase === 'WINDOW' ? must(keepWindow(s)) : must(advanceBlock(s))
const play = (origin: Session, lane?: PlayChoice, precision?: number) => { let s = origin; for (let n = 0; s.phase !== 'FINISHED' && n < 90; n++) s = step(s, lane, precision); expect(s.phase).toBe('FINISHED'); return s }
/** Advances until the dribble node is pending, or null when this match never offers one. */
const toDribble = (seed: string): Session | null => { let s = create(seed); for (let n = 0; s.phase !== 'FINISHED' && n < 90; n++) { if (s.phase === 'PLAY' && s.kernel.partial!.play!.node === 'DRIBBLE') return s; s = step(s) } return null }

describe('SIM-MINI-001 dribble challenge', () => {
  it('is an opt-in of new local matches: it needs moments, headers and the halftime rules', () => {
    const { moments: _m, ...withoutMoments } = OPTIONS; void _m
    expect(createSession(liveInput('d'), { sessionId: 'x', ...withoutMoments, dribble: { version: 'dribble-mini-v1' } }).ok).toBe(false)
    expect(createSession(liveInput('d'), { sessionId: 'x', ...OPTIONS, dribble: { version: 'dribble-mini-v9' } as never }).ok).toBe(false)
    expect(create('d').options.dribble).toEqual({ version: 'dribble-mini-v1' })
    expect(create('d', false).options.dribble).toBeUndefined()
  })

  it('appears at most once per match, has three lanes, a lane chosen before the player and the result recorded in the session', () => {
    let seen = 0
    for (let n = 0; n < 40; n++) {
      const pending = toDribble(`once-${n}`)
      if (!pending) continue
      seen++
      const node = pending.kernel.partial!.play!
      expect(node.options.map((o) => o.choice)).toEqual([...DRIBBLE_CHOICES])
      expect(['LEFT', 'CENTER', 'RIGHT']).toContain(node.dribble!.cover)
      // The cover does not depend on what the player picks.
      for (const lane of DRIBBLE_CHOICES) expect(choose(pending, lane, .9).revision).toBeGreaterThan(pending.revision)
      const done = play(pending, 'DRIBBLE_RIGHT', .8)
      const log = done.result!.plays!
      expect(log.filter((entry) => entry.node === 'DRIBBLE')).toHaveLength(1)
      expect(log.find((entry) => entry.node === 'DRIBBLE')).toMatchObject({ choice: 'DRIBBLE_RIGHT', precision: .8 })
      const steps = done.kernel.blocks.flatMap((block) => block.events).map((event) => event.step)
      expect(steps.filter((value) => value === 'DRIBBLE_OK' || value === 'DRIBBLE_LOST')).toHaveLength(1)
    }
    expect(seen).toBeGreaterThan(10)
  })

  it('continues the attack after a success with the existing finish options and shows the recovery after a failure, then the match goes on', () => {
    const outcomes = { ok: 0, lost: 0 }
    for (let n = 0; n < 60 && (outcomes.ok < 2 || outcomes.lost < 2); n++) {
      const pending = toDribble(`branch-${n}`)
      if (!pending) continue
      const after = choose(pending, 'DRIBBLE_LEFT', .5)
      const last = after.kernel.partial?.events.at(-1) ?? after.kernel.blocks.flatMap((b) => b.events).filter((e) => e.step?.startsWith('DRIBBLE')).at(-1)
      if (after.phase === 'PLAY' && after.kernel.partial!.play!.node === 'FINISH') {
        outcomes.ok++
        expect(after.kernel.partial!.events.some((event) => event.step === 'DRIBBLE_OK')).toBe(true)
        expect(after.kernel.partial!.play!.options.map((o) => o.choice)).toEqual(['CROSS', 'SHOOT'])
      } else { outcomes.lost++; expect(last?.step).toBe('DRIBBLE_LOST'); expect(last?.type).toBe('recovery'); expect(last?.side).toBe('cpu') }
      expect(play(after).phase).toBe('FINISHED')
    }
    expect(outcomes.ok).toBeGreaterThan(0); expect(outcomes.lost).toBeGreaterThan(0)
  })

  it('is deterministic and never offered without the option; plain matches keep their result', () => {
    const a = play(create('det-1'), 'DRIBBLE_CENTER', .7), b = play(create('det-1'), 'DRIBBLE_CENTER', .7)
    expect(a).toEqual(b)
    const plain = play(create('det-1', false))
    expect(plain.result!.plays!.some((entry) => entry.node === 'DRIBBLE')).toBe(false)
    expect(plain.kernel.blocks.flatMap((block) => block.events).some((event) => event.step?.startsWith('DRIBBLE'))).toBe(false)
    expect(play(create('det-1', false))).toEqual(plain)
  })

  it('rejects a precision outside 0-1 or on another node, and accepts the traditional resolution without precision', () => {
    const pending = toDribble('invalid-precision') ?? toDribble('once-1') ?? toDribble('once-2')!
    const p = pending.kernel.partial!.play!
    const base = { version: 'interactive-play-command-v1', sessionId: pending.sessionId, expectedRevision: pending.revision, id: `${p.id}:${p.node}`, playId: p.id, node: p.node, choice: 'DRIBBLE_CENTER' }
    expect(submitPlay(pending, { ...base, precision: 1.4 }).ok).toBe(false)
    expect(submitPlay(pending, { ...base, precision: Number.NaN }).ok).toBe(false)
    expect(submitPlay(pending, { ...base, node: 'FINISH', precision: .5 }).ok).toBe(false)
    const traditional = must(submitPlay(pending, base))
    expect(traditional.kernel.tree!.log.at(-1)).toMatchObject({ node: 'DRIBBLE', choice: 'DRIBBLE_CENTER', precision: .5 })
  })

  it('keeps the model honest: ratings, lane against the cover and timing matter, nothing is certain', () => {
    const p = { id: 'a', name: 'a', position: 'DEL', era: '2020s', category: 'contemporary', reference_year: 2026, nationality: 'ARG', club_tag: 'x', overall_rating: 80, att_rating: 80, def_rating: 70, phy_rating: 75, men_rating: 80, price: 10 } as Player
    const star: Player = { ...p, overall_rating: 95, att_rating: 95, men_rating: 95 }, back: Player = { ...p, position: 'DEF', def_rating: 85, phy_rating: 85, men_rating: 85 }
    const neutral = { local: 'NEUTRAL', cpu: 'NEUTRAL' } as const
    const chance = (attacker: Player, lane: DribbleSector, cover: DribbleSector, precision: number, strategy: Parameters<typeof dribbleChance>[6] = neutral) => dribbleChance(attacker, back, lane, cover, precision, 0, strategy)
    expect(chance(p, 'LEFT', 'CENTER', .5)).toBeGreaterThan(chance(p, 'LEFT', 'LEFT', .5))
    expect(chance(p, 'LEFT', 'CENTER', 1)).toBeGreaterThan(chance(p, 'LEFT', 'CENTER', 0))
    expect(chance(star, 'LEFT', 'CENTER', .5)).toBeGreaterThan(chance(p, 'LEFT', 'CENTER', .5))
    expect(chance(p, 'CENTER', 'LEFT', .5, { local: 'NEUTRAL', cpu: 'LOW_BLOCK' })).toBeLessThan(chance(p, 'CENTER', 'LEFT', .5))
    // Perfect timing on the uncovered lane with a star is still not a guarantee; the worst case is still possible.
    expect(chance(star, 'LEFT', 'CENTER', 1)).toBeLessThanOrEqual(.85)
    expect(chance(p, 'LEFT', 'LEFT', 0)).toBeGreaterThanOrEqual(.12)
    // Perfect timing does not beat the ratings gap: a weak winger with perfect timing is below a star with poor timing on the same lane.
    const weak: Player = { ...p, overall_rating: 60, att_rating: 55, men_rating: 55 }
    expect(chance(weak, 'LEFT', 'CENTER', 1)).toBeLessThan(chance(star, 'LEFT', 'CENTER', .2))
    const counts: Record<string, number> = { LEFT: 0, CENTER: 0, RIGHT: 0 }
    let state = 12345
    const random = () => { state = (state * 1664525 + 1013904223) % 4294967296; return state / 4294967296 }
    for (let i = 0; i < 600; i++) counts[pickCover('LEFT', neutral, random)]++
    expect(Object.values(counts).every((count) => count > 60)).toBe(true)
    expect(counts.LEFT).toBeGreaterThan(counts.RIGHT) // the defender leans to the attacker's flank
  })

  it('survives a checkpoint taken while the dribble is pending', async () => {
    const pending = toDribble('once-1') ?? toDribble('once-2') ?? toDribble('once-3')!
    const checkpoint = await checkpointSession(pending, webcrypto.subtle)
    const restored = must(await restoreSession(checkpoint.snapshot, checkpoint.authority, webcrypto.subtle))
    expect(restored.kernel.partial!.play!.node).toBe('DRIBBLE')
    expect(play(restored, 'DRIBBLE_LEFT', .6)).toEqual(play(pending, 'DRIBBLE_LEFT', .6))
  })
})
