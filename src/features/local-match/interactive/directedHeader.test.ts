import { webcrypto, createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { createSession, advanceBlock, submitPlay, checkpointSession, restoreSession, inspectSession } from './session'
import { keepWindow } from './liveModel'
import { liveInput, must } from './liveFixtures.test-support'
import type { Session } from './types'
import { planPlay, resolvePlay, keeperOf, type PlayChoice, type PlayContext } from './attackTree'
import { HEADER_DIRECTIONS, aerialQuality, directedChances, sendDirectedCross, resolveDirectedHeader, headerGoalPoint, type HeaderDirection } from './directedHeader'
import { aerialScene } from '../aerialGeometry'
import { visibleStats } from '../playback'
import { frameSounds, liveFrames } from '../livePresentation'
import { initialCheckpoint, nextCheckpoint } from './random'

const make = (seed: string, aerial = true) => must(createSession(liveInput(seed), { sessionId: 'aerial-fixture', benchMode: { local: 'manual-v1', cpu: 'manual-v1' }, moments: { version: 'match-moments-v1' }, ...(aerial ? { aerial: { version: 'directed-header-v1' as const } } : {}) }))
const cmd = (s: Session, policy: PlayChoice = 'NEAR_POST') => {
  const p = s.kernel.partial!.play!
  const choice: PlayChoice = p.node === 'DIRECTION' ? p.options.find((o) => o.available)!.choice : p.node === 'DEFEND' ? 'INTERCEPT' : p.node === 'HEADER' ? policy : policy === 'SHOOT' ? 'SHOOT' : p.options.find((o) => o.choice === 'CROSS' && o.available)?.choice ?? 'SHOOT'
  return { version: 'interactive-play-command-v1', id: `${p.id}:${p.node}`, sessionId: s.sessionId, playId: p.id, node: p.node, choice, expectedRevision: s.revision }
}
const step = (s: Session, policy?: PlayChoice) => must(s.phase === 'PLAY' ? submitPlay(s, cmd(s, policy)) : s.phase === 'WINDOW' ? keepWindow(s) : advanceBlock(s))
const finish = (s: Session, policy?: PlayChoice) => { for (let n = 0; n < 100 && s.phase !== 'FINISHED'; n++) s = step(s, policy); expect(s.phase).toBe('FINISHED'); return s }
function context() {
  const input = liveInput(); const strength = { global: 83, attack: 83, defense: 83, midfield: 83 }
  const ctx: PlayContext = { catalog: input.catalog, minute: 30, local: { lineup: input.localLineup, formation: '4-3-3' }, cpu: { lineup: input.cpuLineup, formation: '4-3-3' }, effective: { local: strength, cpu: strength }, effectiveOnly: true, strategy: { local: 'NEUTRAL', cpu: 'NEUTRAL' } }
  const p = planPlay(ctx, 'unit-play', () => 0)!.play
  return { ctx, play: resolvePlay(ctx, p, 'LEFT', () => 0).next! }
}
const sequence = (values: number[]) => { let i = 0; return vi.fn(() => values[i++] ?? .99) }

describe('directed-header-v1', () => {
  it('separates a successful delivery and duel from an unresolved header, with no future shot draws', () => {
    const { ctx, play } = context(); const random = sequence([0, 0, .6])
    const result = sendDirectedCross(ctx, play, random)
    expect(random).toHaveBeenCalledTimes(3); expect(result.next!.node).toBe('HEADER')
    expect(result.events.map((e) => e.step)).toEqual(['AERIAL_CROSS', 'AERIAL_CONTEST', 'AERIAL_WON'])
    expect(result.events.some((e) => ['shot', 'save', 'goal'].includes(e.type))).toBe(false)
    expect(result.next!.options.map((o) => o.choice)).toEqual(HEADER_DIRECTIONS)
    expect(JSON.stringify(result.next)).not.toMatch(/keeperPlan|keeperDirection|result|goalChance/)
  })

  it('never offers a header after a cleared delivery or a lost aerial duel, and rejects an invalid target position', () => {
    const { ctx, play } = context()
    for (const draws of [[.99], [0, .99]]) {
      const result = sendDirectedCross(ctx, play, sequence(draws))
      expect(result.next).toBeNull(); expect(result.keeperPlan).toBeNull(); expect(result.events.at(-1)!.step).toBe('AERIAL_CLEAR')
      expect(result.events.some((e) => e.step === 'AERIAL_WON')).toBe(false)
    }
    const invalid = { ...play, options: play.options.map((o) => o.choice === 'CROSS' ? { ...o, playerId: ctx.local.lineup.GK! } : o) }
    expect(() => sendDirectedCross(ctx, invalid, () => 0)).toThrow('invalid_aerial_target')
  })

  it.each(HEADER_DIRECTIONS)('records contact, reaction and every sporting ending for %s', (direction) => {
    const { ctx, play } = context(); const pending = sendDirectedCross(ctx, play, () => 0).next!
    const endings = new Set<string>()
    for (const draws of [[0], [.99, .99, .2], [.99, .99, .8], [.99, 0, 0], [.99, 0, .99]]) {
      const result = resolveDirectedHeader(ctx, pending, direction, 'FAR_POST', sequence(draws))
      expect(result.events[0].step).toBe('DIRECTED_HEADER_CONTACT')
      expect(result.events[0].aerial!.direction).toBe(direction)
      expect(result.events[0].aerial!.keeperDirection).toBeUndefined()
      expect(result.events.at(-1)!.aerial!.keeperDirection).toBe('FAR_POST')
      endings.add(result.events.at(-1)!.step!)
    }
    expect([...endings].sort()).toEqual(['DIRECTED_HEADER_BLOCK', 'DIRECTED_HEADER_GOAL', 'DIRECTED_HEADER_OVER', 'DIRECTED_HEADER_SAVE', 'DIRECTED_HEADER_WIDE'])
  })

  it('gives better headers and keepers a statistical advantage without a guaranteed or universally best direction', () => {
    const { ctx, play } = context(); const pending = sendDirectedCross(ctx, play, () => 0).next!
    const target = ctx.catalog.find((p) => p.id === pending.receiverId)!
    const defender = ctx.catalog.find((p) => p.id === pending.aerial!.defenderId)!; const keeper = keeperOf(ctx.cpu, ctx.catalog)!
    const low = { ...target, att_rating: 75, phy_rating: 75, men_rating: 75, overall_rating: 75 }
    const high = { ...target, att_rating: 95, phy_rating: 95, men_rating: 95, overall_rating: 95 }
    const keeperHigh = { ...keeper, overall_rating: 99, def_rating: 99 }
    let rng = initialCheckpoint('heading-monte-carlo'); const draw = () => { const next = nextCheckpoint(rng); rng = next.checkpoint; return next.value }
    let lowGoals = 0; let highGoals = 0; let strongKeeperGoals = 0
    for (let n = 0; n < 20000; n++) {
      const keeperPlan = HEADER_DIRECTIONS[n % 3]; const direction = HEADER_DIRECTIONS[Math.floor(n / 3) % 3]
      const samples = [draw(), draw(), draw()]
      const outcome = (p: typeof target, k: typeof keeper) => { const c = directedChances(p, defender, k, direction, keeperPlan, 0); return samples[0] >= c.block && samples[1] < c.onTarget && samples[2] < c.goal }
      lowGoals += Number(outcome(low, keeper)); highGoals += Number(outcome(high, keeper)); strongKeeperGoals += Number(outcome(high, keeperHigh))
    }
    expect(highGoals).toBeGreaterThan(lowGoals); expect(strongKeeperGoals).toBeLessThan(highGoals); expect(lowGoals).toBeGreaterThan(0); expect(highGoals).toBeLessThan(20000)
    const expectRate = (p: typeof target, direction: HeaderDirection) => HEADER_DIRECTIONS.reduce((sum, plan) => { const c = directedChances(p, defender, keeper, direction, plan, 0); return sum + (1 - c.block) * c.onTarget * c.goal / 3 }, 0)
    const physical = { ...target, phy_rating: 99, men_rating: 60 }
    const reader = { ...target, phy_rating: 60, men_rating: 99 }
    expect(expectRate(physical, 'NEAR_POST')).toBeGreaterThan(expectRate(physical, 'FAR_POST'))
    expect(expectRate(reader, 'FAR_POST')).toBeGreaterThan(expectRate(reader, 'NEAR_POST'))
    expect(aerialQuality(high)).toBeGreaterThan(aerialQuality(low))
    for (const direction of HEADER_DIRECTIONS) for (const plan of HEADER_DIRECTIONS) for (const p of [low, high]) {
      for (const chance of Object.values(directedChances(p, defender, keeper, direction, plan, .08))) { expect(chance).toBeGreaterThan(0); expect(chance).toBeLessThan(1) }
    }
  })

  it('keeps near/far orientation on both wings and mirrors pitch directions; animates airborne travel and jumps', () => {
    expect(headerGoalPoint('LEFT', 'NEAR_POST').y).toBe(.43)
    expect(headerGoalPoint('RIGHT', 'NEAR_POST').y).toBe(.57)
    expect(headerGoalPoint('LEFT', 'FAR_POST').y).toBeCloseTo(.57)
    expect(headerGoalPoint('LEFT', 'NEAR_POST', 'cpu').y).toBe(.57)
    expect(headerGoalPoint('LEFT', 'NEAR_POST', 'cpu').x).toBeLessThan(.05)
    const { ctx, play } = context(); const a = sendDirectedCross(ctx, play, () => 0).next!.aerial!
    expect(aerialScene(a, 'AERIAL_CROSS', .5).height).toBeGreaterThan(.10)
    expect(aerialScene(a, 'AERIAL_CROSS', .1).ball).not.toEqual(aerialScene(a, 'AERIAL_CROSS', .8).ball)
    expect(aerialScene(a, 'AERIAL_CONTEST', .5).jump).toBeGreaterThan(.04)
    expect(aerialScene({ ...a, direction: 'FAR_POST', keeperDirection: 'NEAR_POST' }, 'DIRECTED_HEADER_FLIGHT', 1).keeper.y).toBe(.43)
  })

  it('restores every node with the identical private RNG, then reproduces the exported choices and rejects duplicate commands', async () => {
    vi.stubGlobal('crypto', webcrypto)
    try {
      let s = make('aerial-restore-0'); let sawHeader = false
      while (s.phase !== 'FINISHED') {
        const checkpoint = await checkpointSession(s); const restored = await restoreSession(checkpoint.snapshot, checkpoint.authority); expect(restored.ok, `phase=${s.phase} revision=${s.revision} node=${s.kernel.partial?.play?.node}`).toBe(true); expect(must(restored)).toEqual(s)
        if (s.phase === 'PLAY') {
          if (s.kernel.partial!.play!.node === 'HEADER') {
            sawHeader = true
            const before = JSON.stringify(s); inspectSession(s); expect(JSON.stringify(s)).toBe(before)
            expect(JSON.stringify(inspectSession(s))).not.toMatch(/keeperPlan|keeperDirection/)
          }
          const command = cmd(s); const next = step(s)
          expect(submitPlay(next, command)).toMatchObject({ ok: false, error: 'DUPLICATE_COMMAND' })
        }
        s = step(s)
      }
      expect(sawHeader).toBe(true)
      const checkpoint = await checkpointSession(s); expect(must(await restoreSession(checkpoint.snapshot, checkpoint.authority))).toEqual(s)
      expect(s).toEqual(finish(make('aerial-restore-0')))
      const commands = [...s.result!.plays!]; let replay = make('aerial-restore-0')
      while (replay.phase !== 'FINISHED') replay = replay.phase === 'PLAY' ? must(submitPlay(replay, { ...cmd(replay), ...commands.shift()! })) : step(replay)
      expect(replay.result).toEqual(s.result); expect(commands).toHaveLength(0)
      expect(s.result!.aerial).toEqual({ version: 'directed-header-v1' })
    } finally { vi.unstubAllGlobals() }
  })

  it('does not draw a header outcome before the direction command, or accept extension-only choices in a legacy session', () => {
    let s = make('aerial-restore-0'); while (!(s.phase === 'PLAY' && s.kernel.partial!.play!.node === 'HEADER')) s = step(s)
    const before = s.kernel.rng.aerial!.draws; const pending = s.kernel.partial!.play!
    expect(s.kernel.partial!.events.at(-1)!.step).toBe('AERIAL_WON')
    expect(submitPlay(s, { ...cmd(s), choice: 'SHOOT' })).toMatchObject({ ok: false, error: 'INVALID_CHOICE' })
    expect(submitPlay(s, { ...cmd(s), expectedRevision: s.revision - 1 })).toMatchObject({ ok: false, error: 'STALE_STATE' })
    expect(s.kernel.rng.aerial!.draws).toBe(before)
    const next = step(s); expect(next.kernel.rng.aerial!.draws).toBeGreaterThan(before)
    expect(pending.options).toHaveLength(3)
    let legacy = make('aerial-restore-0', false); while (legacy.phase !== 'PLAY') legacy = step(legacy)
    expect(submitPlay(legacy, { ...cmd(legacy), choice: 'NEAR_POST' })).toMatchObject({ ok: false, error: 'INVALID_CHOICE' })
  })

  it('rejects fabricated airborne checkpoints, including a changed private keeper plan with a fresh digest', async () => {
    vi.stubGlobal('crypto', webcrypto)
    try {
      let s = make('aerial-restore-0'); while (!(s.phase === 'PLAY' && s.kernel.partial!.play!.node === 'HEADER')) s = step(s)
      for (const corrupt of ['keeper', 'target', 'options', 'rng', 'cleared'] as const) {
        const copy = structuredClone(s); const play = copy.kernel.partial!.play!
        if (corrupt === 'keeper') copy.kernel.aerial!.keeperPlan = HEADER_DIRECTIONS.find((d) => d !== copy.kernel.aerial!.keeperPlan)!
        if (corrupt === 'target') copy.kernel.partial!.play = { ...play, aerial: { ...play.aerial!, targetId: copy.kernel.input.localLineup.GK! } }
        if (corrupt === 'options') copy.kernel.partial!.play = { ...play, options: play.options.slice(0, 2) }
        if (corrupt === 'rng') copy.kernel.rng.aerial = { ...copy.kernel.rng.aerial!, draws: copy.kernel.rng.aerial!.draws + 1 }
        if (corrupt === 'cleared') copy.kernel.partial!.events.push({ ...copy.kernel.partial!.events.at(-1)!, type: 'recovery', side: 'cpu', playerId: play.aerial!.defenderId, step: 'AERIAL_CLEAR' })
        const cp = await checkpointSession(copy)
        expect(await restoreSession(cp.snapshot, cp.authority)).toMatchObject({ ok: false, error: 'INVALID_SNAPSHOT' })
      }
    } finally { vi.unstubAllGlobals() }
  })

  it('matches 600 complete previous sessions and restores checkpoints generated by commit 10f406b', async () => {
    const baseline = JSON.parse(readFileSync('docs/qa/SIM-005R-04-compatibility.json', 'utf8')) as { hashes: { mode: string; seed: string; hash: string }[]; checkpoints: Awaited<ReturnType<typeof checkpointSession>>[] }
    for (const fixture of baseline.hashes) {
      let s = must(createSession(liveInput(fixture.seed), { sessionId: 'compat-aerial', benchMode: { local: 'manual-v1', cpu: 'manual-v1' }, ...(fixture.mode === 'attack' ? { attackTree: { version: 'attack-tree-v1' as const } } : fixture.mode === 'moments' ? { moments: { version: 'match-moments-v1' as const } } : {}) }))
      s = finish(s)
      expect(createHash('sha256').update(JSON.stringify(s)).digest('hex')).toBe(fixture.hash)
      expect(s.kernel.aerial).toBeUndefined(); expect(s.result!.aerial).toBeUndefined()
    }
    vi.stubGlobal('crypto', webcrypto)
    try {
      for (const cp of baseline.checkpoints) expect(must(await restoreSession(cp.snapshot, cp.authority))).toEqual(JSON.parse(cp.snapshot))
    } finally { vi.unstubAllGlobals() }
  }, 30000)

  it('measures 240 seeds per direction, direct shot and previous moments cross, with unchanged opportunity count', { timeout: 60000 }, () => {
    const policies: Record<string, unknown> = {}
    for (const policy of [...HEADER_DIRECTIONS, 'SHOOT', 'PREVIOUS_CROSS'] as const) {
      const totals = { matches: 240, moments: 0, crosses: 0, headers: 0, goals: 0, aerialGoals: 0, shots: 0, aerialShots: 0, saves: 0, wide: 0, over: 0, blocked: 0, cleared: 0, directPlays: 0, directGoals: 0 }
      for (let seed = 0; seed < 240; seed++) {
        const s = finish(make(`aerial-cal-${seed}`, policy !== 'PREVIOUS_CROSS'), policy === 'PREVIOUS_CROSS' ? 'NEAR_POST' : policy)
        const events = s.kernel.blocks.flatMap((b) => b.events)
        expect(events.filter((e) => e.type === 'attack')).toHaveLength(24)
        expect(s.kernel.tree!.started).toBe(s.kernel.director!.selected.length)
        const stats = visibleStats(events)
        for (const side of ['local', 'cpu'] as const) {
          expect(events.filter((e) => e.side === side && e.type === 'goal')).toHaveLength(s.kernel.score[side])
          for (const key of ['shots', 'shotsOnTarget', 'saves', 'recoveries'] as const) expect(s.kernel.stats[side][key]).toBe(stats[side][key])
        }
        expect(new Set(s.kernel.tree!.log.map((e) => e.id)).size).toBe(s.kernel.tree!.log.length)
        totals.moments += s.kernel.tree!.started; totals.goals += s.kernel.score.local + s.kernel.score.cpu; totals.shots += s.kernel.stats.local.shots
        const count = (...steps: string[]) => events.filter((e) => steps.includes(e.step ?? '')).length
        totals.directPlays += s.kernel.tree!.log.filter((e) => e.node === 'FINISH' && e.choice === 'SHOOT').length
        totals.directGoals += count('SHOT_GOAL')
        totals.crosses += count('AERIAL_CROSS', 'CROSS_OK', 'CROSS_LOST'); totals.headers += count('DIRECTED_HEADER_CONTACT', 'HEADER_GOAL', 'HEADER_SAVED', 'HEADER_WIDE')
        totals.aerialGoals += count('DIRECTED_HEADER_GOAL', 'HEADER_GOAL'); totals.aerialShots += count('DIRECTED_HEADER_GOAL', 'DIRECTED_HEADER_SAVE', 'DIRECTED_HEADER_OVER', 'DIRECTED_HEADER_WIDE', 'HEADER_GOAL', 'HEADER_SAVED', 'HEADER_WIDE')
        totals.saves += count('DIRECTED_HEADER_SAVE', 'HEADER_SAVED'); totals.wide += count('DIRECTED_HEADER_WIDE', 'HEADER_WIDE'); totals.over += count('DIRECTED_HEADER_OVER'); totals.blocked += count('DIRECTED_HEADER_BLOCK'); totals.cleared += count('AERIAL_CLEAR', 'CROSS_LOST')
        const frames = liveFrames(s.kernel.blocks)
        expect(frames.filter((f) => frameSounds(f).includes('cross')).length).toBe(count('AERIAL_CROSS'))
        expect(frames.filter((f) => frameSounds(f).includes('header')).length).toBe(count('DIRECTED_HEADER_CONTACT'))
      }
      expect(totals.moments / 240).toBeGreaterThan(2); expect(totals.moments / 240).toBeLessThanOrEqual(3)
      policies[policy] = { ...totals, momentsPerMatch: totals.moments / 240, goalsPerMatch: totals.goals / 240, goalsPerCross: totals.crosses ? totals.aerialGoals / totals.crosses : null, goalsPerDirectPlay: totals.directPlays ? totals.directGoals / totals.directPlays : null }
    }
    writeFileSync('docs/qa/SIM-005R-04-calibration.json', JSON.stringify({ version: 'directed-header-v1', seeds: 240, fixture: 'Synthetic teams, same seeds; first available flank, KEEP windows. Different outcomes can change later sporting RNG; no competitive balance claim.', policies }, null, 2) + '\n')
    expect(createHash('sha256').update(JSON.stringify(policies)).digest('hex')).toHaveLength(64)
  })
})
