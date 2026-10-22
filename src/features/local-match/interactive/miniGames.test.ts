import { describe, expect, it } from 'vitest'
import { webcrypto } from 'node:crypto'
import { advanceBlock, checkpointSession, createSession, restoreSession, submitPlay } from './session'
import { defaultPlayChoice, keepWindow, resolveQuietWindow } from './liveModel'
import { liveInput, must } from './liveFixtures.test-support'
import { freeKickChances } from './freeKicks'
import { interactiveDefenseChance } from './matchMoments'
import { penaltyChances, startShootout, takeKick, finishAutomatically, decidedBy, type KickRecord, type Lane, type Shootout } from './penaltyShootout'
import type { PlayChoice, PlayNode } from './attackTree'
import type { Session, SessionOptions } from './types'

const OPTIONS = { benchMode: { local: 'manual-v1', cpu: 'manual-v1' }, moments: { version: 'match-moments-v1' }, aerial: { version: 'directed-header-v1' }, matchRules: { version: 'halftime-ovr-v1' }, corners: { version: 'corners-v1' }, freeKicks: { version: 'free-kicks-v1' } } as const
const MINI = { precisionShot: { version: 'precision-shot-v1' }, defenseMini: { version: 'defense-mini-v1' } } as const
const create = (seed: string, mini: boolean) => must(createSession(liveInput(seed), { sessionId: 'mini-games', ...OPTIONS, ...(mini ? MINI : {}) } as SessionOptions))
const command = (s: Session, choice?: PlayChoice, precision?: number) => {
  const p = s.kernel.partial!.play!
  return { version: 'interactive-play-command-v1', id: `${p.id}:${p.node}`, sessionId: s.sessionId, expectedRevision: s.revision, playId: p.id, node: p.node, choice: choice ?? (p.node === 'FINISH' ? 'CROSS' : defaultPlayChoice(p, s.kernel.input.catalog)), ...(precision !== undefined ? { precision } : {}) }
}
const step = (s: Session): Session => must(s.phase === 'PLAY' ? submitPlay(s, command(s)) : s.phase === 'WINDOW' ? s.window!.applyBlock === 3 ? keepWindow(s) : resolveQuietWindow(s) : advanceBlock(s))
/** First state where `want` is pending, playing the default choices; null when none of the first seeds reaches it. */
function until(want: (node: PlayNode, s: Session) => boolean, mini = true) {
  for (let seed = 0; seed < 120; seed++) {
    let s = create(`mini:${seed}`, mini)
    while (s.phase !== 'FINISHED') { const p = s.kernel.partial?.play; if (p && want(p.node, s)) return s; s = step(s) }
  }
  return null
}
const directKick = (node: PlayNode, s: Session) => node === 'FK_ATTACK' && s.kernel.partial!.play!.freeKick!.zone === 'CENTRAL_OUTSIDE'
const handDefense = (node: PlayNode, s: Session) => node === 'DEFEND' && Boolean(s.kernel.partial!.play!.defense)
const finish = (s: Session) => { let current = s; for (let i = 0; i < 400 && current.phase !== 'FINISHED'; i++) current = step(current); return current }

describe('SIM-MINI-002 precision shot on the direct free kick', () => {
  it('keeps the keeper reaction fixed before the shot and lets precision move the odds without deciding them', () => {
    const s = until(directKick)!
    expect(s).not.toBeNull()
    const planned = s.kernel.freeKicks!.plan!.keeper
    const play = s.kernel.partial!.play!
    expect(play.options.map((o) => o.choice)).toEqual(['FK_LEFT', 'FK_CENTER', 'FK_RIGHT'])
    for (const precision of [0, .5, 1]) {
      const next = must(submitPlay(s, command(s, 'FK_LEFT', precision)))
      const shot = [...next.kernel.blocks.flatMap((b) => b.events), ...(next.kernel.partial?.events ?? [])].find((e) => ['FK_GOAL', 'FK_SAVE', 'FK_WIDE', 'FK_OVER', 'FK_BLOCK'].includes(e.step ?? ''))!
      expect(shot.freeKick!.keeperDirection).toBe(planned)
      expect(next.kernel.tree!.log.at(-1)).toMatchObject({ node: 'FK_ATTACK', choice: 'FK_LEFT', precision })
    }
    const { kicker, wall, keeper } = (() => { const c = s.kernel.input.catalog; const a = play.freeKick!; return { kicker: c.find((p) => p.id === a.kickerId)!, wall: a.wallIds.map((id) => c.find((p) => p.id === id)!), keeper: c.find((p) => p.id === a.keeperId)! } })()
    const odds = (precision?: number) => freeKickChances(kicker, wall, keeper, 'NEAR_POST', 'LOW', 'WALL_JUMP', 'GOAL_CENTER', 0, precision)
    expect(odds(1).onTarget).toBeGreaterThan(odds(0).onTarget); expect(odds(1).goal).toBeGreaterThan(odds(0).goal); expect(odds(1).block).toBeLessThan(odds(0).block)
    expect(odds(.5)).toEqual(odds(undefined))
    expect(odds(1).goal).toBeLessThan(.7); expect(odds(1).onTarget).toBeLessThanOrEqual(.93); expect(odds(0).goal).toBeGreaterThanOrEqual(.06)
  })
  it('is deterministic, resolves a command once, and the traditional answer matches a session without the option', () => {
    const s = until(directKick)!
    const first = must(submitPlay(s, command(s, 'FK_CENTER', .8)))
    expect(JSON.stringify(first)).toBe(JSON.stringify(must(submitPlay(s, command(s, 'FK_CENTER', .8)))))
    const again = submitPlay(first, command(s, 'FK_CENTER', .8))
    expect(again.ok).toBe(false); if (!again.ok) expect(again.error).toBe('DUPLICATE_COMMAND')
    expect(first.revision).toBe(s.revision + 1)
    // Traditional (no precision) is the historical resolution: the same seed without the option plays the same free kick the same way.
    const plain = until((node, state) => directKick(node, state), false)!
    if (plain.sessionId === s.sessionId && plain.kernel.input.seed === s.kernel.input.seed) {
      const a = must(submitPlay(s, command(s, 'FK_RIGHT'))); const b = must(submitPlay(plain, command(plain, 'FK_RIGHT')))
      expect(a.kernel.score).toEqual(b.kernel.score); expect(a.kernel.stats).toEqual(b.kernel.stats)
    }
    expect(finish(first).phase).toBe('FINISHED')
  })
  it('rejects precision without the option or on a node that does not take it, and survives a checkpoint', async () => {
    const s = until(directKick)!
    const plain = until(directKick, false)!
    const refused = submitPlay(plain, command(plain, 'FK_LEFT', .7)); expect(refused.ok).toBe(false)
    if (!refused.ok) expect(refused.error).toBe('INVALID_PAYLOAD')
    const checkpoint = await checkpointSession(s, webcrypto.subtle)
    const restored = must(await restoreSession(checkpoint.snapshot, checkpoint.authority, webcrypto.subtle))
    expect(JSON.stringify(restored)).toBe(JSON.stringify(s))
    const after = must(submitPlay(s, command(s, 'FK_LEFT', .9)))
    const saved = await checkpointSession(after, webcrypto.subtle)
    expect((await restoreSession(saved.snapshot, saved.authority, webcrypto.subtle)).ok).toBe(true)
  })
})

describe('SIM-MINI-003 hand-played defense', () => {
  it('fixes the CPU lane before the choice, offers the lanes next to the traditional options and continues the attack', async () => {
    const s = until(handDefense)!
    expect(s).not.toBeNull()
    const play = s.kernel.partial!.play!
    expect(play.options.map((o) => o.choice)).toEqual(['INTERCEPT', 'PRESS', 'DEFEND_LEFT', 'DEFEND_CENTER', 'DEFEND_RIGHT'])
    const lane = play.defense!.lane
    const checkpoint = await checkpointSession(s, webcrypto.subtle)
    expect((await restoreSession(checkpoint.snapshot, checkpoint.authority, webcrypto.subtle)).ok).toBe(true)
    for (const choice of ['DEFEND_LEFT', 'DEFEND_CENTER', 'DEFEND_RIGHT', 'PRESS'] as const) {
      const next = must(submitPlay(s, command(s, choice, .9)))
      expect(next.kernel.tree!.log.at(-1)).toMatchObject({ node: 'DEFEND', choice, precision: .9 })
      expect(s.kernel.partial!.play!.defense!.lane).toBe(lane)
      const saved = await checkpointSession(next, webcrypto.subtle)
      expect((await restoreSession(saved.snapshot, saved.authority, webcrypto.subtle)).ok).toBe(true)
      expect(finish(next).phase).toBe('FINISHED')
    }
    // Traditional answer, no precision.
    const traditional = must(submitPlay(s, command(s, 'INTERCEPT')))
    expect(traditional.kernel.tree!.log.at(-1)).toEqual(expect.objectContaining({ node: 'DEFEND', choice: 'INTERCEPT' }))
    expect(traditional.kernel.tree!.log.at(-1)).not.toHaveProperty('precision')
  })
  it('offers at most one per match, never without the option, and rejects precision elsewhere', () => {
    for (let seed = 0; seed < 6; seed++) {
      let s = create(`mini-once:${seed}`, true); let hand = 0
      while (s.phase !== 'FINISHED') { if (s.kernel.partial?.play?.defense) hand++; s = step(s) }
      expect(hand).toBeLessThanOrEqual(1)
      let plain = create(`mini-once:${seed}`, false)
      while (plain.phase !== 'FINISHED') { expect(plain.kernel.partial?.play?.defense).toBeUndefined(); plain = step(plain) }
    }
    const plain = until((node) => node === 'DEFEND', false)!
    const refused = submitPlay(plain, command(plain, 'INTERCEPT', .7)); expect(refused.ok).toBe(false)
    const hand = until(handDefense)!
    expect(submitPlay(hand, { ...command(hand, 'DEFEND_LEFT'), precision: 1.4 }).ok).toBe(false)
  })
  it('reading the lane, the timing and the defender improve the odds, and nothing is certain', () => {
    const s = until(handDefense)!
    const play = s.kernel.partial!.play!; const c = s.kernel.input.catalog
    const defender = c.find((p) => p.id === play.protagonistId)!; const attacker = c.find((p) => p.id === play.attackerId)!
    const ctx = { minute: 45 as const, catalog: c, local: { lineup: s.kernel.input.localLineup, formation: '4-3-3' as const }, cpu: { lineup: s.kernel.input.cpuLineup, formation: '4-3-3' as const }, effective: { local: { attack: 80, defense: 80, midfield: 80, global: 80 }, cpu: { attack: 80, defense: 80, midfield: 80, global: 80 } }, strategy: { local: 'NEUTRAL', cpu: 'NEUTRAL' } as const }
    const odds = (choice: PlayChoice, lane: Lane, precision?: number) => interactiveDefenseChance(defender, attacker, choice, lane, precision, ctx)
    expect(odds('DEFEND_LEFT', 'LEFT', .5)).toBeGreaterThan(odds('DEFEND_LEFT', 'RIGHT', .5))
    expect(odds('DEFEND_CENTER', 'CENTER', 1)).toBeGreaterThan(odds('DEFEND_CENTER', 'CENTER', 0))
    expect(odds('PRESS', 'LEFT', 1)).toBeGreaterThan(odds('PRESS', 'LEFT', 0))
    expect(odds('DEFEND_RIGHT', 'RIGHT', 1)).toBeLessThanOrEqual(.85); expect(odds('DEFEND_RIGHT', 'LEFT', 0)).toBeGreaterThanOrEqual(.1)
    const tough = { ...defender, def_rating: 99, men_rating: 99, phy_rating: 99, overall_rating: 99 }
    expect(interactiveDefenseChance(tough, attacker, 'DEFEND_LEFT', 'LEFT', .5, ctx)).toBeGreaterThan(odds('DEFEND_LEFT', 'LEFT', .5))
  })
})

describe('SIM-MINI-002 interactive penalty shootout (penalty-shootout-v1)', () => {
  const input = liveInput('shootout')
  const rosters = { local: input.catalog.filter((p) => p.id.startsWith('live_local_') && Object.values(input.localLineup).includes(p.id)), cpu: input.catalog.filter((p) => p.id.startsWith('live_cpu_') && Object.values(input.cpuLineup).includes(p.id)) }
  const lanes: readonly Lane[] = ['LEFT', 'CENTER', 'RIGHT']
  const play = (seed: string, pick: (kick: number) => { direction: Lane; precision: number; dive: Lane }) => {
    let state = startShootout(seed, rosters, input.catalog); const kicks: KickRecord[] = []; const fixed: Array<Lane | null> = []
    for (let i = 0; state.pending && i < 140; i++) {
      const choice = pick(i)
      fixed.push(state.pending.side === 'local' ? state.pending.cpuDive : state.pending.cpuShot!.direction)
      const result = takeKick(state, state.pending.side === 'local' ? { direction: choice.direction, precision: choice.precision } : { dive: choice.dive }, input.catalog)!
      state = result.state; kicks.push(result.kick)
    }
    return { state, kicks, fixed }
  }
  it('fixes the CPU intention before the player acts and derives the winner only from the confirmed kicks', () => {
    const run = play('shootout-a', (i) => ({ direction: lanes[i % 3], precision: (i % 5) / 4, dive: lanes[(i + 1) % 3] }))
    expect(run.state.winner).not.toBeNull()
    run.kicks.forEach((kick, i) => { expect(kick.source).toBe('MANUAL'); expect(kick.side).toBe(i % 2 === 0 ? 'local' : 'cpu'); expect(kick.side === 'local' ? kick.dive : kick.direction).toBe(run.fixed[i]) })
    const goals = { local: run.kicks.filter((k) => k.side === 'local' && k.outcome === 'GOAL').length, cpu: run.kicks.filter((k) => k.side === 'cpu' && k.outcome === 'GOAL').length }
    expect(run.state.score).toEqual(goals)
    expect(decidedBy(run.kicks, run.state.score)).toBe(run.state.winner)
    expect(run.state.pending).toBeNull()
    // The decision is only reached when nobody can catch up: never before the kicks that decide it exist.
    expect(decidedBy(run.kicks.slice(0, -1), { local: goals.local - (run.kicks.at(-1)!.side === 'local' && run.kicks.at(-1)!.outcome === 'GOAL' ? 1 : 0), cpu: goals.cpu - (run.kicks.at(-1)!.side === 'cpu' && run.kicks.at(-1)!.outcome === 'GOAL' ? 1 : 0) })).toBeNull()
  })
  it('is deterministic for equal inputs, and the first CPU intention does not depend on what the player does', () => {
    const same = (seed: string) => JSON.stringify(play(seed, (i) => ({ direction: lanes[i % 3], precision: .6, dive: lanes[i % 3] })).state)
    expect(same('shootout-b')).toBe(same('shootout-b'))
    const start = startShootout('shootout-c', rosters, input.catalog)
    expect(start.pending).toMatchObject({ side: 'local', cpuShot: null }); expect(start.pending!.cpuDive).not.toBeNull()
    const [a, b] = [takeKick(start, { direction: 'LEFT', precision: 0 }, input.catalog)!, takeKick(start, { direction: 'RIGHT', precision: 1 }, input.catalog)!]
    expect(a.kick.dive).toBe(start.pending!.cpuDive); expect(b.kick.dive).toBe(start.pending!.cpuDive)
    expect(takeKick(start, { dive: 'LEFT' }, input.catalog)).toBeNull()
    expect(takeKick({ ...a.state, winner: 'local', pending: null }, { dive: 'LEFT' }, input.catalog)).toBeNull()
  })
  it('keeps odds bounded, lets the traditional alternative finish the remaining kicks from the same engine, and survives sudden death', () => {
    const [kicker, keeper] = [rosters.local[1], rosters.cpu[0]]
    for (const precision of [0, 1]) for (const direction of lanes) for (const dive of lanes) { const c = penaltyChances(kicker, keeper, direction, dive, precision); expect(c.miss).toBeGreaterThanOrEqual(.02); expect(c.miss).toBeLessThanOrEqual(.2); expect(c.save).toBeGreaterThanOrEqual(.02); expect(c.save).toBeLessThanOrEqual(.72) }
    expect(penaltyChances(kicker, keeper, 'LEFT', 'LEFT', 1).save).toBeLessThan(penaltyChances(kicker, keeper, 'LEFT', 'LEFT', 0).save)
    expect(penaltyChances(kicker, keeper, 'LEFT', 'LEFT', .5).save).toBeGreaterThan(penaltyChances(kicker, keeper, 'LEFT', 'RIGHT', .5).save)
    const outcomes = new Set<Shootout['winner']>(); let sudden = 0
    for (let n = 0; n < 40; n++) {
      const start = startShootout(`shootout-auto-${n}`, rosters, input.catalog)
      const manual = takeKick(start, { direction: 'CENTER', precision: .5 }, input.catalog)!
      const done = finishAutomatically(manual.state, input.catalog)
      expect(done.winner).not.toBeNull(); expect(done.kicks[0].source).toBe('MANUAL'); expect(done.kicks.slice(1).every((k) => k.source === 'AUTO')).toBe(true)
      expect(decidedBy(done.kicks, done.score)).toBe(done.winner)
      expect(JSON.stringify(done)).toBe(JSON.stringify(finishAutomatically(takeKick(start, { direction: 'CENTER', precision: .5 }, input.catalog)!.state, input.catalog)))
      outcomes.add(done.winner); if (done.kicks.length > 10) sudden++
    }
    expect(outcomes.size).toBe(2)
    expect(sudden).toBeGreaterThan(0)
  })
})
