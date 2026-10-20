import { webcrypto } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { advanceBlock, checkpointSession, createSession, restoreSession, submitPlay } from './session'
import { keepWindow } from './liveModel'
import { liveInput, must } from './liveFixtures.test-support'
import type { Session } from './types'
import type { PlayChoice, PlayContext } from './attackTree'
import { defenseChance, resolveDefense } from './matchMoments'
import { visibleStats } from '../playback'

const create = (seed: string, mode: 'moments' | 'legacy' | 'batch' = 'moments') => must(createSession(liveInput(seed), { sessionId: 'moments-fixture', benchMode: { local: 'manual-v1', cpu: 'manual-v1' }, ...(mode === 'moments' ? { moments: { version: 'match-moments-v1' as const } } : mode === 'legacy' ? { attackTree: { version: 'attack-tree-v1' as const } } : {}) }))
const command = (s: Session, defense: PlayChoice = 'INTERCEPT') => {
  const p = s.kernel.partial!.play!
  return { version: 'interactive-play-command-v1', sessionId: s.sessionId, expectedRevision: s.revision, id: `${p.id}:${p.node}`, playId: p.id, node: p.node, choice: p.node === 'DEFEND' ? defense : p.node === 'FINISH' ? 'SHOOT' : p.options.find((o) => o.available)!.choice }
}
const step = (s: Session, defense?: PlayChoice): Session => must(s.phase === 'PLAY' ? submitPlay(s, command(s, defense)) : s.phase === 'WINDOW' ? keepWindow(s) : advanceBlock(s))
const finish = (origin: Session, defense?: PlayChoice) => { let s = origin; for (let n = 0; s.phase !== 'FINISHED' && n < 80; n++) s = step(s, defense); expect(s.phase).toBe('FINISHED'); return s }

describe('match-moments-v1', () => {
  it('replays the exported decisions and carries the new version in the result', () => {
    const original = finish(create('moments-replay'), 'PRESS')
    const entries = [...original.result!.plays!]
    let replay = create('moments-replay')
    while (replay.phase !== 'FINISHED') {
      if (replay.phase === 'PLAY') {
        const entry = entries.shift()!
        replay = must(submitPlay(replay, { ...command(replay), ...entry }))
      } else replay = step(replay)
    }
    expect(entries).toHaveLength(0); expect(replay.result).toEqual(original.result)
    expect(replay.result!.moments).toEqual({ version: 'match-moments-v1', selected: replay.kernel.director!.selected })
    expect(finish(create('legacy-unchanged', 'legacy')).result!.moments).toBeUndefined()
  })

  it('repeats the full result and recorded decisions without extra opportunities or statistics', () => {
    for (let seed = 0; seed < 25; seed++) {
      const s = finish(create(`repeat-${seed}`)); expect(s).toEqual(finish(create(`repeat-${seed}`)))
      const events = s.kernel.blocks.flatMap((b) => b.events)
      expect(events.filter((e) => e.type === 'attack')).toHaveLength(24)
      const visible = visibleStats(events)
      for (const side of ['local', 'cpu'] as const) {
        expect(events.filter((e) => e.type === 'goal' && e.side === side)).toHaveLength(s.kernel.score[side])
        for (const stat of ['shots', 'shotsOnTarget', 'saves', 'recoveries'] as const) expect(s.kernel.stats[side][stat]).toBe(visible[side][stat])
      }
      expect(s.kernel.stats.local.possession + s.kernel.stats.cpu.possession).toBe(100)
      expect(new Set(s.result!.plays!.map((p) => p.id)).size).toBe(s.result!.plays!.length)
    }
  })

  it('restores every pending node, coaching window and final result; rejects duplicate and stale choices', async () => {
    vi.stubGlobal('crypto', webcrypto)
    try {
      let s = create('restore-moments'); let defense = false
      while (s.phase !== 'FINISHED') {
        const checkpoint = await checkpointSession(s)
        expect(must(await restoreSession(checkpoint.snapshot, checkpoint.authority))).toEqual(s)
        if (s.phase === 'PLAY') {
          defense ||= s.kernel.partial!.play!.node === 'DEFEND'
          const cmd = command(s); const next = step(s)
          expect(submitPlay(next, cmd)).toMatchObject({ ok: false, error: 'DUPLICATE_COMMAND' })
          expect(submitPlay(s, { ...cmd, expectedRevision: s.revision - 1 })).toMatchObject({ ok: false, error: 'STALE_STATE' })
        }
        s = step(s)
      }
      expect(defense).toBe(true)
      const cp = await checkpointSession(s); expect(must(await restoreSession(cp.snapshot, cp.authority))).toEqual(s)
      expect(s).toEqual(finish(create('restore-moments')))
    } finally { vi.unstubAllGlobals() }
  })

  it('rejects a forged director even with a freshly calculated digest', async () => {
    vi.stubGlobal('crypto', webcrypto)
    try {
      let s = create('tamper-moments'); while (s.phase !== 'PLAY') s = step(s)
      for (const corrupt of ['spacing', 'side', 'rng', 'actor'] as const) {
        const copy = structuredClone(s)
        if (corrupt === 'spacing') copy.kernel.director!.nextEligible = 0
        if (corrupt === 'side') copy.kernel.director!.nextSide = copy.kernel.director!.selected[0].side
        if (corrupt === 'rng') copy.kernel.rng.director = { ...copy.kernel.rng.director!, draws: 99 }
        if (corrupt === 'actor') copy.kernel.director!.selected[0] = { ...copy.kernel.director!.selected[0], protagonistId: 'invented' }
        const cp = await checkpointSession(copy); expect(await restoreSession(cp.snapshot, cp.authority)).toMatchObject({ ok: false, error: 'INVALID_SNAPSHOT' })
      }
    } finally { vi.unstubAllGlobals() }
  })

  it('has context-dependent defensive options, monotonic player quality and bounded probabilities', () => {
    const input = liveInput(); const p = input.catalog[0]
    const strength = { global: 80, attack: 80, defense: 80, midfield: 80 }
    const ctx: PlayContext = { minute: 30, catalog: input.catalog, local: { lineup: input.localLineup, formation: '4-3-3' }, cpu: { lineup: input.cpuLineup, formation: '4-3-3' }, effective: { local: strength, cpu: strength }, strategy: { local: 'NEUTRAL', cpu: 'NEUTRAL' } }
    const reader = { ...p, def_rating: 90, men_rating: 95, phy_rating: 70 }
    const strong = { ...p, def_rating: 80, men_rating: 70, phy_rating: 95 }
    expect(defenseChance(reader, p, 'INTERCEPT', ctx)).toBeGreaterThan(defenseChance(reader, p, 'PRESS', ctx))
    expect(defenseChance(strong, p, 'PRESS', ctx)).toBeGreaterThan(defenseChance(strong, p, 'INTERCEPT', ctx))
    for (const choice of ['INTERCEPT', 'PRESS'] as const) {
      const low = defenseChance(p, p, choice, ctx); const high = defenseChance({ ...p, overall_rating: 99, def_rating: 99, men_rating: 99, phy_rating: 99 }, p, choice, ctx)
      expect(high).toBeGreaterThan(low); expect(high).toBeLessThan(1); expect(low).toBeGreaterThan(0)
    }
    // Exercise every confirmed defensive ending with controlled draws, no synthetic event injected into the kernel.
    const play = { id: 'p', node: 'DEFEND' as const, protagonistId: input.localLineup.LCB!, attackerId: input.cpuLineup.ST!, receiverId: null, sector: null, options: [] }
    const endings = new Set<string>()
    for (const draws of [[0], [.99, 0], [.99, .99, .99], [.99, .99, 0, 0], [.99, .99, 0, .99]]) {
      let i = 0; const result = resolveDefense(ctx, play, 'INTERCEPT', () => draws[i++] ?? .99)
      endings.add(result.events.at(-1)!.step!)
    }
    expect([...endings].sort()).toEqual(['CPU_GOAL', 'CPU_WIDE', 'DEFENSE_BLOCK', 'DEFENSE_SAVE', 'INTERCEPT_OK'])
  })

  it('measures 240 paired seeds against attack-tree-v1 and batch', { timeout: 60000 }, () => {
    const report: Record<string, unknown> = {}
    for (const policy of ['INTERCEPT', 'PRESS', 'legacy', 'batch'] as const) {
      const totals = { matches: 240, moments: 0, attack: 0, defense: 0, goals: 0, repeated: 0, transitions: 0, alternations: 0, recoveries: 0, byMinute: {} as Record<number, number>, outcomes: {} as Record<string, number>, counts: {} as Record<number, number> }
      for (let seed = 0; seed < 240; seed++) {
        const s = finish(create(`moments-cal-${seed}`, policy === 'legacy' || policy === 'batch' ? policy : 'moments'), policy === 'PRESS' ? policy : 'INTERCEPT')
        const events = s.kernel.blocks.flatMap((b) => b.events); const selections = s.kernel.director?.selected ?? []
        totals.goals += s.kernel.score.local + s.kernel.score.cpu
        const builds = events.filter((e) => e.step === 'BUILD' || e.step === 'DEFENSE_BUILD')
        totals.moments += builds.length; totals.counts[builds.length] = (totals.counts[builds.length] ?? 0) + 1
        for (const b of builds) { totals.byMinute[b.minute] = (totals.byMinute[b.minute] ?? 0) + 1; if (b.side === 'local') totals.attack++; else totals.defense++ }
        for (let n = 1; n < selections.length; n++) {
          expect(selections[n].opportunity - selections[n - 1].opportunity).toBeGreaterThanOrEqual(7)
          totals.transitions++; if (selections[n].side !== selections[n - 1].side) totals.alternations++
        }
        totals.repeated += selections.length - new Set(selections.map((p) => p.protagonistId)).size
        for (const e of events.filter((e) => e.step && !['BUILD', 'DEFENSE_BUILD'].includes(e.step))) { totals.outcomes[e.step!] = (totals.outcomes[e.step!] ?? 0) + 1; if (e.type === 'recovery' && e.side === 'local') totals.recoveries++ }
      }
      if (policy === 'INTERCEPT' || policy === 'PRESS') {
        expect(totals.moments / totals.matches).toBeGreaterThan(2); expect(totals.moments / totals.matches).toBeLessThanOrEqual(3)
        expect(totals.alternations).toBe(totals.transitions); expect(Object.keys(totals.byMinute).length).toBeGreaterThan(3)
        expect(totals.repeated).toBe(0)
      }
      report[policy] = { ...totals, momentsPerMatch: totals.moments / totals.matches, goalsPerMatch: totals.goals / totals.matches }
    }
    writeFileSync('docs/qa/SIM-005R-03-calibration.json', JSON.stringify({ version: 'match-moments-v1', seeds: 240, note: 'Synthetic squads, KEEP coaching windows, left pass then shoot; paired seeds, not identical sporting draws after different choices. No competitive balance claim.', policies: report }, null, 2) + '\n')
  })
})
