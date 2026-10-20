import { webcrypto } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import type { Player } from '../../../types/player'
import { visibleStats } from '../playback'
import { advanceBlock, applyWindow, checkpointSession, createSession, exportResult, inspectSession, restoreSession, submitDecision, submitPlay } from './session'
import * as tree from './attackTree'
import { liveInput, must, treeSession } from './liveFixtures.test-support'
import { keepWindow } from './liveModel'
import { initialCheckpoint, nextCheckpoint } from './random'
import type { PlayChoice, PendingPlay } from './attackTree'
import type { PlayCommand, Session } from './types'

type Writable<T> = { -readonly [K in keyof T]: Writable<T[K]> }
type Policy = (play: PendingPlay, session: Session) => PlayChoice
const firstAvailable: Policy = (play) => play.options.find((o) => o.available)!.choice
/** Prefers the flank with the better receiver and the cross, then the shot. */
const ratedFlank: Policy = (play, s) => {
  const rating = (id: string | null) => s.kernel.input.catalog.find((p) => p.id === id)?.overall_rating ?? -1
  const usable = play.options.filter((o) => o.available)
  if (play.node === 'DIRECTION') return usable.sort((a, b) => rating(b.playerId) - rating(a.playerId))[0].choice
  return (usable.find((o) => o.choice === 'CROSS') ?? usable[0]).choice
}
const shootFirst: Policy = (play) => (play.options.find((o) => o.choice === 'SHOOT' && o.available) ?? play.options.find((o) => o.available)!).choice
const crossFirst: Policy = (play) => (play.options.find((o) => o.choice === 'CROSS' && o.available) ?? play.options.find((o) => o.available)!).choice

const command = (s: Session, choice: PlayChoice, id?: string): PlayCommand => { const play = s.kernel.partial!.play!; return { version: 'interactive-play-command-v1', id: id ?? `${s.sessionId}:${play.id}:${play.node}`, sessionId: s.sessionId, expectedRevision: s.revision, playId: play.id, node: play.node, choice } }
const step = (s: Session) => s.phase === 'WINDOW' ? must(keepWindow(s)) : must(advanceBlock(s))
const untilPlay = (s: Session) => { let x = s; while (x.phase !== 'PLAY') x = step(x); return x }
function playThrough(initial: Session, policy: Policy = firstAvailable): Session {
  let s = initial
  for (let guard = 0; guard < 80 && s.phase !== 'FINISHED'; guard++) s = s.phase === 'PLAY' ? must(submitPlay(s, command(s, policy(s.kernel.partial!.play!, s)))) : step(s)
  expect(s.phase).toBe('FINISHED')
  return s
}
const eventsOf = (s: Session) => s.kernel.blocks.flatMap((b) => b.events)

describe('SIM-005R-02 attack tree: engine integration', { timeout: 30_000 }, () => {
  it('is opt-in: a session without it never pauses inside a block and has no play data', () => {
    let s = must(createSession(liveInput('opt-in'), { sessionId: 'plain', benchMode: { local: 'manual-v1', cpu: 'manual-v1' } }))
    while (s.phase !== 'FINISHED') s = step(s)
    expect(s.kernel.tree).toBeUndefined(); expect(eventsOf(s).some((e) => e.step)).toBe(false); expect(s.result!.plays).toBeUndefined()
  })

  it('pauses on a real eligible opportunity with the protagonist and receivers taken from the real lineup', () => {
    const paused = untilPlay(treeSession('pause'))
    const play = paused.kernel.partial!.play!; const lineup = Object.values(paused.kernel.input.localLineup)
    const catalog = paused.kernel.input.catalog
    const protagonist = catalog.find((p) => p.id === play.protagonistId)!
    expect(protagonist.position).toBe('MED'); expect(lineup).toContain(protagonist.id)
    for (const option of play.options.filter((o) => o.available)) {
      const receiver = catalog.find((p) => p.id === option.playerId)!
      expect(lineup).toContain(receiver.id); expect(receiver.id).not.toBe(protagonist.id); expect(['MED', 'DEL']).toContain(receiver.position)
      expect(Object.values(paused.kernel.input.cpuLineup)).toContain(option.rivalId)
    }
    const view = inspectSession(paused)
    expect(view.play!.node).toBe('DIRECTION'); expect(view.partial!.events.at(-1)).toMatchObject({ type: 'attack', side: 'local', step: 'BUILD', playerId: protagonist.id })
    expect(paused.kernel.blocks.length).toBe(paused.kernel.nextBlock)
  })

  it('does not always use the same protagonist', () => {
    const ids = new Set<string>()
    for (let seed = 0; seed < 40; seed++) for (const e of eventsOf(playThrough(treeSession(`prot-${seed}`)))) if (e.step === 'BUILD') ids.add(e.playerId!)
    expect(ids.size).toBeGreaterThan(1)
  })

  it('replaces opportunities: still 24 attacks, no duplicated goals and an exact score and statistics', () => {
    for (let seed = 0; seed < 30; seed++) {
      const s = playThrough(treeSession(`ledger-${seed}`), seed % 2 ? ratedFlank : shootFirst)
      const events = eventsOf(s)
      expect(events.filter((e) => e.type === 'attack')).toHaveLength(24)
      expect(s.result!.plays!.filter((p) => p.node === 'DIRECTION').length).toBe(events.filter((e) => e.step === 'BUILD').length)
      const goals = { local: events.filter((e) => e.type === 'goal' && e.side === 'local').length, cpu: events.filter((e) => e.type === 'goal' && e.side === 'cpu').length }
      const result = s.result!.result
      expect(result.score).toEqual(goals)
      let running = { local: 0, cpu: 0 }
      for (const block of s.kernel.blocks) { for (const e of block.events) if (e.type === 'goal' && e.side) running = { ...running, [e.side]: running[e.side] + 1 }; expect(block.score).toEqual(running) }
      const stats = visibleStats(events)
      for (const side of ['local', 'cpu'] as const) for (const key of ['shots', 'shotsOnTarget', 'saves', 'recoveries'] as const) expect(result.stats[side][key]).toBe(stats[side][key])
    }
  })

  it('same state + seed + decisions gives the same match; other decisions can change it', () => {
    const a = playThrough(treeSession('same'), ratedFlank); const b = playThrough(treeSession('same'), ratedFlank)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
    expect(JSON.stringify(playThrough(treeSession('same'), shootFirst).kernel.blocks)).not.toBe(JSON.stringify(a.kernel.blocks))
  })

  it('a failed pass stops the tree: no second node and a rival recovery closes the play', () => {
    let found = 0
    for (let seed = 0; seed < 60 && found < 3; seed++) {
      let s = treeSession(`fail-${seed}`)
      while (s.phase !== 'FINISHED') {
        if (s.phase !== 'PLAY') { s = step(s); continue }
        const before = s.kernel.tree!.log.length
        s = must(submitPlay(s, command(s, firstAvailable(s.kernel.partial!.play!, s))))
        if (s.kernel.tree!.log.at(-1)!.node === 'DIRECTION' && s.phase !== 'PLAY') {
          const lost = eventsOf(s).filter((e) => e.step === 'PASS_LEFT_LOST' || e.step === 'PASS_RIGHT_LOST')
          expect(lost.length).toBeGreaterThan(0); expect(s.kernel.tree!.log.length).toBe(before + 1)
          expect(lost.every((e) => e.side === 'cpu' && e.type === 'recovery')).toBe(true); found++
        }
      }
    }
    expect(found).toBeGreaterThan(0)
  })

  it('never executes the same decision twice and rejects stale, foreign or unavailable commands', () => {
    const s = untilPlay(treeSession('twice'))
    const first = command(s, firstAvailable(s.kernel.partial!.play!, s))
    const after = must(submitPlay(s, first))
    expect(submitPlay(after, first)).toMatchObject({ ok: false, error: 'DUPLICATE_COMMAND' })
    expect(submitPlay(s, { ...first, expectedRevision: s.revision + 1 })).toMatchObject({ ok: false, error: 'STALE_STATE' })
    expect(submitPlay(s, { ...first, id: 'other', playId: 'play-0' })).toMatchObject({ ok: false, error: 'WRONG_PLAY' })
    expect(submitPlay(s, { ...first, id: 'other', node: 'FINISH' })).toMatchObject({ ok: false, error: 'WRONG_PLAY' })
    const unavailable = s.kernel.partial!.play!.options.find((o) => !o.available)
    if (unavailable) expect(submitPlay(s, { ...first, id: 'x', choice: unavailable.choice })).toMatchObject({ ok: false, error: 'INVALID_CHOICE' })
    expect(submitPlay(s, { ...first, id: 'y', choice: 'CROSS' })).toMatchObject({ ok: false })
    expect(submitPlay(s, { ...first, extra: true })).toMatchObject({ ok: false, error: 'INVALID_PAYLOAD' })
    expect(advanceBlock(s)).toMatchObject({ ok: false, error: 'INVALID_PHASE' })
    expect(applyWindow(s)).toMatchObject({ ok: false }); expect(submitDecision(s, 'local', {})).toMatchObject({ ok: false })
    expect(s.kernel.tree!.log).toHaveLength(0)
    expect(submitPlay(playThrough(s), first)).toMatchObject({ ok: false })
  })

  it('checkpoint and restore in the middle of a play continue to the same result', async () => {
    vi.stubGlobal('crypto', webcrypto)
    const whole = playThrough(treeSession('restore'), ratedFlank)
    let s = treeSession('restore'); let restored = false
    for (let guard = 0; guard < 80 && s.phase !== 'FINISHED'; guard++) {
      if (s.phase !== 'PLAY') { s = step(s); continue }
      if (!restored) { const cp = await checkpointSession(s); s = must(await restoreSession(cp.snapshot, cp.authority)); restored = true }
      s = must(submitPlay(s, command(s, ratedFlank(s.kernel.partial!.play!, s))))
    }
    expect(restored).toBe(true); expect(JSON.stringify(s)).toBe(JSON.stringify(whole))
    vi.unstubAllGlobals()
  })

  it('rejects tampered play snapshots', async () => {
    vi.stubGlobal('crypto', webcrypto)
    const s = untilPlay(treeSession('tamper'))
    for (const mutate of [
      (x: Writable<Session>) => { x.kernel.partial!.play!.protagonistId = x.kernel.input.cpuLineup.GK! },
      (x: Writable<Session>) => { x.kernel.partial!.events.push({ minute: x.kernel.partial!.events[0].minute, side: 'local', type: 'goal', playerId: x.kernel.input.localLineup.ST!, step: 'SHOT_GOAL' }) },
      (x: Writable<Session>) => { x.kernel.tree!.started = 0 },
      (x: Writable<Session>) => { x.kernel.rng.tree!.draws = 99 },
      (x: Writable<Session>) => { x.phase = 'RUNNABLE' },
    ]) {
      const copy = structuredClone(s) as Writable<Session>; mutate(copy)
      const cp = await checkpointSession(copy)
      expect(await restoreSession(cp.snapshot, cp.authority)).toMatchObject({ ok: false, error: 'INVALID_SNAPSHOT' })
    }
    vi.unstubAllGlobals()
  })

  it('replay: the recorded decisions and plays reproduce the recorded events', () => {
    const original = playThrough(treeSession('replay'), ratedFlank)
    const record = exportResult(original); if (!record.ok) throw new Error(record.error)
    const plays = [...record.value.plays!]
    let s = treeSession('replay')
    while (s.phase !== 'FINISHED') {
      if (s.phase === 'PLAY') { const entry = plays.shift()!; s = must(submitPlay(s, { ...command(s, entry.choice), id: entry.id })) } else s = step(s)
    }
    expect(plays).toHaveLength(0)
    expect(JSON.stringify(s.result)).toBe(JSON.stringify(original.result))
  })

  it('resolves without blocking the match when no flank has a valid receiver', () => {
    const spy = vi.spyOn(tree, 'planPlay').mockReturnValue(null)
    const s = playThrough(treeSession('no-receiver'))
    expect(spy).toHaveBeenCalled()
    expect(s.result!.plays).toEqual([]); expect(eventsOf(s).some((e) => e.step)).toBe(false); expect(eventsOf(s).filter((e) => e.type === 'attack')).toHaveLength(24)
    spy.mockRestore()
  })
})

const make = (rating: number, extra: Partial<Player> = {}): Player => ({ id: `p${rating}`, name: 'x', position: 'DEL', era: '2020s', category: 'contemporary', reference_year: 2026, nationality: 'ARG', club_tag: 'T', overall_rating: rating, att_rating: rating, def_rating: rating, phy_rating: rating, men_rating: rating, price: 4, ...extra })
const neutral = { local: 'NEUTRAL', cpu: 'NEUTRAL' } as const
describe('SIM-005R-02 probabilities', () => {
  it('a 90 receiver beats an 85 receiver with everything else equal, statistically, without guarantees', () => {
    const passer = make(85); const defender = make(85)
    const p90 = tree.passChance(passer, make(90), defender, .01, neutral); const p85 = tree.passChance(passer, make(85), defender, .01, neutral)
    expect(p90).toBeGreaterThan(p85 + .02); expect(p90).toBeLessThan(.9 + 1e-9)
    let wins90 = 0; let wins85 = 0; let state = initialCheckpoint('mc')
    const draw = () => { const next = nextCheckpoint(state); state = next.checkpoint; return next.value }
    for (let i = 0; i < 20000; i++) { if (draw() < p90) wins90++; if (draw() < p85) wins85++ }
    expect(wins90).toBeGreaterThan(wins85); expect(wins90).toBeLessThan(20000); expect(wins85).toBeGreaterThan(0)
  })

  it('every probability stays strictly inside (0,1) even for the best players against the worst', () => {
    const best = make(100); const worst = make(0)
    const all = [tree.passChance(best, best, worst, .08, { local: 'WIDE_PLAY', cpu: 'NEUTRAL' }), tree.crossChance(best, best, worst, .08), tree.blockChance(best, worst, .08), tree.shotOnTargetChance(best), tree.headerOnTargetChance(best, worst), tree.scoringChance(100, worst, .08)]
    for (const value of all) { expect(value).toBeGreaterThan(0); expect(value).toBeLessThan(1) }
    expect(Math.max(...all)).toBeLessThan(.91)
    for (const value of [tree.passChance(worst, worst, best, -.08, { local: 'NEUTRAL', cpu: 'LOW_BLOCK' }), tree.crossChance(worst, worst, best, -.08), tree.scoringChance(0, best, -.08)]) expect(value).toBeGreaterThan(.05)
  })

  it('the keeper takes part in the chance to score, and better rivals lower the pass chance', () => {
    expect(tree.scoringChance(90, make(99, { position: 'ARQ' }), 0)).toBeLessThan(tree.scoringChance(90, make(70, { position: 'ARQ' }), 0))
    expect(tree.passChance(make(85), make(85), make(95), 0, neutral)).toBeLessThan(tree.passChance(make(85), make(85), make(75), 0, neutral))
  })

  it('engine-level: with the 90 receiver on the flank the pass succeeds more often than with the 85', () => {
    const run = (rating: number) => {
      const input = liveInput('mc-engine'); const catalog = input.catalog.map((p) => p.id === input.localLineup.RW ? { ...p, att_rating: rating, overall_rating: rating, men_rating: rating } : p)
      let ok = 0; let total = 0
      for (let seed = 0; seed < 1500; seed++) {
        let state = initialCheckpoint(`eng-${seed}`); const random = () => { const next = nextCheckpoint(state); state = next.checkpoint; return next.value }
        const strength = { global: 80, attack: 80, defense: 80, midfield: 80 }
        const ctx = { minute: 30 as const, catalog, local: { lineup: input.localLineup, formation: '4-3-3' as const }, cpu: { lineup: input.cpuLineup, formation: '4-3-3' as const }, effective: { local: strength, cpu: strength }, strategy: neutral }
        const planned = tree.planPlay(ctx, 'p', random); if (!planned) continue
        const right = planned.play.options.find((o) => o.choice === 'RIGHT' && o.available); if (!right || right.playerId !== input.localLineup.RW) continue
        const resolved = tree.resolvePlay(ctx, planned.play, 'RIGHT', random); total++; if (resolved.events[0].type === 'pass') ok++
      }
      return { rate: ok / total, total }
    }
    const high = run(90); const low = run(85)
    expect(high.total).toBeGreaterThan(100); expect(high.rate).toBeGreaterThan(low.rate); expect(high.rate).toBeLessThan(1); expect(low.rate).toBeGreaterThan(0)
  })
})

describe('SIM-005R-02 calibration', { timeout: 60_000 }, () => {
  it('records pass, shot and goal frequencies over many seeds for three simple policies', () => {
    const policies: Record<string, Policy> = { 'flank with the best receiver, cross': ratedFlank, 'always shoot': shootFirst, 'cross when possible': crossFirst }
    const report: Record<string, unknown> = {}
    const baseline = { goals: 0, matches: 0 }
    for (let seed = 0; seed < 150; seed++) { let s = must(createSession(liveInput(`cal-${seed}`), { sessionId: 'b', benchMode: { local: 'manual-v1', cpu: 'manual-v1' } })); while (s.phase !== 'FINISHED') s = step(s); baseline.goals += s.kernel.score.local; baseline.matches++ }
    for (const [name, policy] of Object.entries(policies)) {
      const t = { matches: 0, plays: 0, passOk: 0, passLost: 0, crossChosen: 0, crossOk: 0, shotChosen: 0, shotsEnding: 0, wideOrBlocked: 0, saved: 0, goals: 0, localGoals: 0 }
      for (let seed = 0; seed < 150; seed++) {
        const s = playThrough(treeSession(`cal-${seed}`), policy); t.matches++
        const steps = eventsOf(s).filter((e) => e.step); const count = (...names: string[]) => steps.filter((e) => names.includes(e.step!)).length
        t.plays += count('BUILD'); t.passOk += count('PASS_LEFT_OK', 'PASS_RIGHT_OK'); t.passLost += count('PASS_LEFT_LOST', 'PASS_RIGHT_LOST')
        t.crossChosen += s.result!.plays!.filter((p) => p.choice === 'CROSS').length; t.shotChosen += s.result!.plays!.filter((p) => p.choice === 'SHOOT').length; t.crossOk += count('CROSS_OK')
        t.shotsEnding += count('SHOT_WIDE', 'HEADER_WIDE', 'SHOT_SAVED', 'HEADER_SAVED', 'SHOT_GOAL', 'HEADER_GOAL'); t.wideOrBlocked += count('SHOT_WIDE', 'HEADER_WIDE', 'SHOT_BLOCKED')
        t.saved += count('SHOT_SAVED', 'HEADER_SAVED'); t.goals += count('SHOT_GOAL', 'HEADER_GOAL'); t.localGoals += s.kernel.score.local
      }
      report[name] = { ...t, passSuccessRate: +(t.passOk / (t.passOk + t.passLost)).toFixed(3), shotReachedPerPlay: +(t.shotsEnding / t.plays).toFixed(3), goalPerPlay: +(t.goals / t.plays).toFixed(3), goalAfterPassRate: +(t.goals / t.passOk).toFixed(3), localGoalsPerMatch: +(t.localGoals / t.matches).toFixed(3) }
      expect(t.passOk).toBeGreaterThan(0); expect(t.passLost).toBeGreaterThan(0); expect(t.goals).toBeGreaterThan(0)
    }
    report['batch baseline, same squads, no tree'] = { matches: baseline.matches, localGoalsPerMatch: +(baseline.goals / baseline.matches).toFixed(3) }
    writeFileSync('docs/qa/SIM-005R-02-calibration.json', JSON.stringify({ version: 'attack-tree-v1', seeds: 150, note: 'Synthetic equal-price squads, KEEP in every window. Not a competitive balance study; no formula was tuned from these figures.', policies: report }, null, 2) + '\n')
  })
})
