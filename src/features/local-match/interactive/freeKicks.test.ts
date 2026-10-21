import { webcrypto } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { planFreeKick, resolveFreeKick, freeKickChances, foulChance, directEligible, contactEligibleChance } from './freeKicks'
import type { PlayContext } from './attackTree'
import { liveInput, must } from './liveFixtures.test-support'
import { createSession, submitPlay, advanceBlock, inspectSession, checkpointSession, restoreSession } from './session'
import { defaultPlayChoice, keepWindow, resolveQuietWindow } from './liveModel'
import { visibleStats } from '../playback'
import { defenderDuelChance } from './individualDuels'
import type { Session } from './types'
import { FORMATION_IDS, formationSlots } from '../../tactics/formations'

const input = liveInput()
const strength = { attack: 80, defense: 80, midfield: 80, global: 80 }
const ctx: PlayContext = { minute: 45, catalog: input.catalog, local: { lineup: input.localLineup, formation: '4-3-3' }, cpu: { lineup: input.cpuLineup, formation: '4-3-3' }, effective: { local: strength, cpu: strength }, strategy: { local: 'NEUTRAL', cpu: 'NEUTRAL' }, effectiveOnly: true, duels: 'ovr-duels-v1' }
const draws = (r: number[]) => { let n = 0; return () => { if (n >= r.length) throw Error('unexpected draw'); return r[n++] } }
const setup = (side: 'local' | 'cpu' = 'local', zone = .1, trajectory = .1) => planFreeKick(ctx, side, 'play-45', draws([0, .99, 0, zone, .1, .8, trajectory, .1]))!
export const freeKickSession = (seed: string) => must(createSession(liveInput(seed), { sessionId: 'free-kick-fixture', benchMode: { local: 'manual-v1', cpu: 'manual-v1' }, moments: { version: 'match-moments-v1' }, aerial: { version: 'directed-header-v1' }, matchRules: { version: 'halftime-ovr-v1' }, corners: { version: 'corners-v1' }, freeKicks: { version: 'free-kicks-v1' } }))
const command = (s: Session) => { const p = s.kernel.partial!.play!; return { version: 'interactive-play-command-v1', id: `${p.id}:${p.node}`, sessionId: s.sessionId, expectedRevision: s.revision, playId: p.id, node: p.node, choice: p.node === 'FINISH' ? 'CROSS' : defaultPlayChoice(p, s.kernel.input.catalog) } }
const step = (s: Session): Session => must(s.phase === 'PLAY' ? submitPlay(s, command(s)) : s.phase === 'WINDOW' ? s.window!.applyBlock === 3 ? keepWindow(s) : resolveQuietWindow(s) : advanceBlock(s))

describe('free-kicks-v1 sporting causes and outcomes', () => {
  it.each(FORMATION_IDS)('provides distinct real actors in %s, including a sole striker as the best taker candidate', (formation) => {
    const catalog = ctx.catalog.map((p) => {
      const side = Object.values(ctx.local.lineup).includes(p.id) ? 'local' : 'cpu'
      const slot = formationSlots(formation).find((slot) => ctx[side].lineup[slot.id] === p.id)!
      if (!slot) return p
      return { ...p, position: slot.position, ...(slot.position === 'DEL' ? { att_rating: 99, men_rating: 99, overall_rating: 99 } : {}) }
    })
    const p = planFreeKick({ ...ctx, catalog, local: { ...ctx.local, formation }, cpu: { ...ctx.cpu, formation } }, 'local', 'play-45', draws([0, .99, 0, .7, 0, 0, 0, 0]))!
    expect(p.play).not.toBeNull(); const a = p.play!.freeKick!
    expect(new Set([a.kickerId, a.targetId, a.receiverId]).size).toBe(3)
    expect(catalog.find((p) => p.id === a.targetId)!.position).toBe('DEL')
    expect(a.wallIds.length).toBeGreaterThanOrEqual(2)
  })
  it('records legal contact and continues without awarding a kick', () => {
    const p = planFreeKick(ctx, 'local', 'play-45', draws([0, 0, 0, 0, 0, 0, 0, 0]))!
    expect(p.play).toBeNull(); expect(p.events.map((e) => e.step)).toEqual(['FK_CONTACT_LEGAL'])
  })
  it('records a failed pressure without foul and leaves football resolution available', () => {
    const p = planFreeKick(ctx, 'local', 'play-45', draws([.9, .99, .99, 0, 0, 0, 0, 0]))!
    expect(p.play).toBeNull(); expect(p.events[0].step).toBe('FK_CONTACT_BEATEN')
  })
  it('awards only after a failed challenge with offender/victim and real outside zone', () => {
    const p = setup(), a = p.play!.freeKick!
    expect(p.events.map((e) => e.step)).toEqual(['FK_FOUL', 'FK_AWARDED', 'FK_SETUP'])
    expect(Object.values(input.localLineup)).toContain(a.victimId); expect(Object.values(input.cpuLineup)).toContain(a.offenderId)
    expect(a.consequence).toBe('FREE_KICK_ONLY'); expect(a.zone).toBe('CENTRAL_OUTSIDE'); expect(a).not.toHaveProperty('coordinates')
  })
  it.each([[.1, true, 3], [.7, false, 2], [.9, false, 2]] as const)('offers only eligible zone choices %s', (zone, direct, count) => {
    const p = setup('local', zone); expect(directEligible(p.play!.freeKick!.zone)).toBe(direct); expect(p.play!.options).toHaveLength(count)
    expect(p.play!.options.map((o) => o.choice)).toEqual(direct ? ['FK_LEFT', 'FK_CENTER', 'FK_RIGHT'] : ['FK_CROSS', 'FK_SHORT'])
  })
  it.each(['FK_LEFT', 'FK_CENTER', 'FK_RIGHT'] as const)('executes direct %s with fresh sporting draws', (choice) => {
    const p = setup(), r = resolveFreeKick(ctx, p.play!, choice, p.plan!, draws([0, 0, .99, 0, 0, 0, 0, 0]))
    expect(r.next).toBeNull(); expect(r.events.at(-1)?.step).toBe('FK_GOAL'); expect(p.events.some((e) => e.freeKick?.direction || e.freeKick?.keeperDirection)).toBe(false)
  })
  it.each([['FK_BLOCK', [0, 0, 0, 0, 0, 0, 0, 0]], ['FK_WIDE', [0, 0, .99, .99, 0, .99, 0, 0]], ['FK_OVER', [0, 0, .99, .99, 0, 0, 0, 0]], ['FK_SAVE', [0, 0, .99, 0, .99, 0, 0, 0]], ['FK_GOAL', [0, 0, .99, 0, 0, 0, 0, 0]]] as const)('resolves %s once', (ending, rolls) => {
    const p = setup(), r = resolveFreeKick(ctx, p.play!, 'FK_CENTER', p.plan!, draws([...rolls]))
    expect(r.events.at(-1)?.step).toBe(ending); expect(r.events.filter((e) => ['goal', 'save', 'shot', 'recovery'].includes(e.type))).toHaveLength(1)
  })
  it.each(['WALL_JUMP', 'WALL_HOLD'] as const)('CPU commits before %s; no guaranteed block', (choice) => {
    const p = setup('cpu'), before = structuredClone(p.plan), r = resolveFreeKick(ctx, p.play!, choice, p.plan!, draws([0, 0, .99, 0, 0, 0, 0, 0]))
    expect(p.plan).toEqual(before); expect(r.events.at(-1)?.step).toBe('FK_GOAL'); expect(r.events.find((e) => e.step === 'FK_WALL')?.freeKick?.wall).toBe(choice)
  })
  it('cross and won duel open a fresh header direction, no early goal', () => {
    const p = setup('local', .7), r = resolveFreeKick(ctx, p.play!, 'FK_CROSS', p.plan!, draws([0, .99, .99, 0, 0, 0, 0, 0]))
    expect(r.next?.node).toBe('FK_HEADER'); expect(r.events.at(-1)?.step).toBe('FK_WON'); expect(r.events.some((e) => e.freeKick?.direction)).toBe(false)
    const end = resolveFreeKick(ctx, r.next!, 'FAR_POST', p.plan!, draws([.99, 0, 0, 0])); expect(end.events.at(-1)?.step).toBe('FK_GOAL'); expect(end.next).toBeNull()
  })
  it('short pass has bounded advance/shot without another question', () => {
    const p = setup('local', .9), r = resolveFreeKick(ctx, p.play!, 'FK_SHORT', p.plan!, draws([0, .99, .99, 0, 0, 0, 0, 0]))
    expect(r.next).toBeNull(); expect(r.events.map((e) => e.step)).toContain('FK_ADVANCE'); expect(r.events.at(-1)?.playerId).toBe(p.play!.freeKick!.receiverId)
  })
  it.each(['MAN_MARK', 'ZONE'] as const)('indirect defense %s is brief', (choice) => {
    const p = setup('cpu', .7), r = resolveFreeKick(ctx, p.play!, choice, p.plan!, draws([0, 0, 0, 0, 0, 0, 0, 0]))
    expect(r.next).toBeNull(); expect(r.events.at(-1)?.step).toBe('FK_CLEAR')
  })
  it('separates precision, power, wall and keeper from symmetric OVR duels', () => {
    const a = ctx.catalog.find((p) => p.position === 'DEL')!, d = ctx.catalog.find((p) => p.position === 'DEF')!, k = ctx.catalog.find((p) => p.position === 'ARQ')!
    expect(defenderDuelChance(80, 80)).toBe(.5); expect(defenderDuelChance(85, 80) + defenderDuelChance(80, 85)).toBeCloseTo(1)
    for (const trajectory of ['HIGH', 'LOW'] as const) {
      const jump = freeKickChances(a, [d], k, 'NEAR_POST', trajectory, 'WALL_JUMP', 'FAR_POST', 0), hold = freeKickChances(a, [d], k, 'NEAR_POST', trajectory, 'WALL_HOLD', 'FAR_POST', 0)
      expect(trajectory === 'HIGH' ? jump.block > hold.block : jump.block < hold.block).toBe(true)
      for (const v of Object.values(jump)) { expect(v).toBeGreaterThan(0); expect(v).toBeLessThan(1) }
    }
    expect(foulChance(a, d, 'TACKLE', 0)).toBeGreaterThan(foulChance(a, d, 'PRESSURE', 0)); expect(contactEligibleChance('FREE_KICK')).toBeLessThan(contactEligibleChance('OPEN_PLAY'))
  })
})
describe('free kick session integrity', () => {
  it('requires the versioned prerequisites and rejects unsupported versions', () => {
    expect(createSession(input, { sessionId: 'bad', freeKicks: { version: 'free-kicks-v1' } })).toMatchObject({ ok: false })
    expect(createSession(input, { ...freeKickSession('x').options, freeKicks: { version: 'bad' } } as never)).toMatchObject({ ok: false })
  })
  it('preserves 24 opportunities, cap, halftime and counters across 60 complete matches', () => {
    const families = new Set<string>()
    for (let seed = 0; seed < 60; seed++) {
      let s = freeKickSession(`free-kicks:${seed}`); while (s.phase !== 'FINISHED') s = step(s)
      const events = s.kernel.blocks.flatMap((b) => b.events); expect(events.filter((e) => e.type === 'attack')).toHaveLength(24)
      expect(s.kernel.director!.selected.length).toBeLessThanOrEqual(3); s.kernel.freeKicks!.families.forEach((f) => families.add(f))
      expect(s.applied.filter((c) => c.applyBlock !== 3).every((c) => c.order.type === 'KEEP')).toBe(true)
      const stats = visibleStats(events)
      for (const side of ['local', 'cpu'] as const) { expect(events.filter((e) => e.type === 'goal' && e.side === side)).toHaveLength(s.kernel.score[side]); for (const key of ['shots', 'shotsOnTarget', 'saves', 'recoveries'] as const) expect(stats[side][key]).toBe(s.kernel.stats[side][key]) }
      expect(s.kernel.stats.local.possession + s.kernel.stats.cpu.possession).toBe(100)
    }
    expect([...families].sort()).toEqual(['CORNER', 'FREE_KICK', 'OPEN_PLAY'])
  })
  it('restores every checkpoint, hides intent, rejects duplicate/stale commands and replays', async () => {
    const nodes = new Set<string>()
    for (let seed = 0; seed < 60; seed++) {
      let s = freeKickSession(`free-kicks:${seed}`)
      while (s.phase !== 'FINISHED') {
        const cp = await checkpointSession(s, webcrypto.subtle as SubtleCrypto)
        expect(must(await restoreSession(cp.snapshot, cp.authority, webcrypto.subtle as SubtleCrypto)), `${seed}:${s.phase}:${s.kernel.partial?.play?.node}`).toEqual(s)
        if (s.phase === 'PLAY') {
          nodes.add(s.kernel.partial!.play!.node); expect(inspectSession(s).play).not.toHaveProperty('plan'); expect(inspectSession(s)).not.toHaveProperty('freeKickRng')
          const c = command(s), next = step(s); expect(submitPlay(next, c)).toMatchObject({ ok: false, error: 'DUPLICATE_COMMAND' }); expect(submitPlay(s, { ...c, expectedRevision: s.revision - 1 })).toMatchObject({ ok: false, error: 'STALE_STATE' }); s = next
        } else s = step(s)
      }
      const cp = await checkpointSession(s, webcrypto.subtle as SubtleCrypto); expect(must(await restoreSession(cp.snapshot, cp.authority, webcrypto.subtle as SubtleCrypto))).toEqual(s)
      let replay = freeKickSession(`free-kicks:${seed}`); while (replay.phase !== 'FINISHED') replay = step(replay); expect(replay).toEqual(s)
    }
    expect(nodes.has('FK_ATTACK')).toBe(true); expect(nodes.has('FK_DEFEND')).toBe(true); expect(nodes.has('FK_HEADER')).toBe(true)
  }, 20000)
  it('rejects tampered actors, intention, cursor, choice and cause with a fresh digest', async () => {
    let s = freeKickSession('free-kicks:0')
    for (let seed = 0; !s.kernel.partial?.play?.freeKick && seed < 30; seed++) { s = freeKickSession(`free-kicks:${seed}`); while (s.phase !== 'FINISHED' && !s.kernel.partial?.play?.freeKick) s = step(s) }
    expect(s.kernel.partial?.play?.freeKick).toBeDefined()
    for (const mutate of [
      (x: Session) => { x.kernel.freeKicks!.plan = { ...x.kernel.freeKicks!.plan!, keeper: x.kernel.freeKicks!.plan!.keeper === 'FAR_POST' ? 'NEAR_POST' : 'FAR_POST' } },
      (x: Session) => { x.kernel.freeKickRng = { ...x.kernel.freeKickRng!, draws: 0 } },
      (x: Session) => { x.kernel.partial!.play = { ...x.kernel.partial!.play!, freeKick: { ...x.kernel.partial!.play!.freeKick!, victimId: x.kernel.input.cpuLineup.ST! } } },
      (x: Session) => { x.kernel.partial!.play = { ...x.kernel.partial!.play!, options: [] } },
      (x: Session) => { const e = x.kernel.partial!.events.find((e) => e.step === 'FK_FOUL')!; Object.assign(e, { step: 'FK_CONTACT_LEGAL' }) },
    ]) { const copy = structuredClone(s); mutate(copy); const cp = await checkpointSession(copy, webcrypto.subtle as SubtleCrypto); expect(await restoreSession(cp.snapshot, cp.authority, webcrypto.subtle as SubtleCrypto)).toMatchObject({ ok: false, error: 'INVALID_SNAPSHOT' }) }
  })
})
