import { describe, expect, it } from 'vitest'
import { defenderDuelChance } from './individualDuels'
import { createSeededRandom } from '../seededRandom'
import { defenseChance } from './matchMoments'
import { resolvePlay, type PlayContext } from './attackTree'
import { sendDirectedCross } from './directedHeader'
import { liveInput } from './liveFixtures.test-support'

const input = liveInput()
const ctx: PlayContext = { minute: 45, catalog: input.catalog, local: { lineup: input.localLineup, formation: '4-3-3' }, cpu: { lineup: input.cpuLineup, formation: '4-3-3' }, effective: { local: { attack: 80, defense: 80, midfield: 80, global: 80 }, cpu: { attack: 80, defense: 80, midfield: 80, global: 80 } }, strategy: { local: 'NEUTRAL', cpu: 'NEUTRAL' }, duels: 'ovr-duels-v1' }
const scenarios = [[80, 80], [80, 85], [80, 90], [85, 80], [90, 80], [90, 90], [75, 95]] as const
describe('ovr-duels-v1', () => {
  it.each(scenarios)('calibrates attacker %i vs defender %i using 100,000 deterministic samples', (attack, defense) => {
    const expected = defenderDuelChance(attack, defense); const random = createSeededRandom(`ovr:${attack}:${defense}`)
    let wins = 0; for (let n = 0; n < 100000; n++) if (random() < expected) wins++
    expect(Math.abs(wins / 100000 - expected)).toBeLessThan(.007) // >4 standard errors at worst-case p=.5
  })
  it('has exact parity, symmetric bounded odds and monotonic OVR across the full catalog range', () => {
    for (let a = 0; a <= 100; a++) for (let d = 0; d <= 100; d++) {
      const p = defenderDuelChance(a, d)
      expect(p).toBeGreaterThanOrEqual(.05); expect(p).toBeLessThanOrEqual(.95)
      expect(p + defenderDuelChance(d, a)).toBeCloseTo(1, 14)
      if (a === d) expect(p).toBe(.5)
      if (d < 100) expect(defenderDuelChance(a, d + 1)).toBeGreaterThanOrEqual(p)
    }
    expect(() => defenderDuelChance(NaN, 80)).toThrow(); expect(() => defenderDuelChance(101, 80)).toThrow()
  })
  it('uses the same parity for press/interception and does not secretly add attributes or effective strengths', () => {
    const attacker = { ...input.catalog[8], overall_rating: 80, att_rating: 99, men_rating: 99 }
    const defender = { ...input.catalog[2], overall_rating: 80, def_rating: 60, phy_rating: 60 }
    const imbalanced = { ...ctx, effective: { ...ctx.effective, local: { attack: 99, defense: 99, midfield: 99, global: 99 } } }
    for (const choice of ['PRESS', 'INTERCEPT'] as const) expect(defenseChance(defender, attacker, choice, imbalanced)).toBe(.5)
    expect(defenseChance({ ...defender, overall_rating: 90 }, attacker, 'PRESS', ctx)).toBeCloseTo(.689974)
  })
  it('separates the delivered pass from the winger-marker duel and keeps shot logic specific', () => {
    const receiver = input.catalog.find((p) => p.id === input.localLineup.LW)!
    const defender = input.catalog.find((p) => p.id === input.cpuLineup.RB)!
    const play = { id: 'test', node: 'DIRECTION' as const, protagonistId: input.localLineup.LCM!, receiverId: null, sector: null, options: [{ choice: 'LEFT' as const, available: true, playerId: receiver.id, rivalId: defender.id }] }
    const odds = defenderDuelChance(receiver.overall_rating, defender.overall_rating)
    const values = [0, odds - .00001]; const lost = resolvePlay(ctx, play, 'LEFT', () => values.shift()!)
    expect(lost.events.map((e) => e.step)).toEqual(['PASS_LEFT_OK', 'CARRY_LOST']); expect(lost.next).toBeNull()
    const success = [0, odds + .00001]; const won = resolvePlay(ctx, play, 'LEFT', () => success.shift()!)
    expect(won.events.map((e) => e.step)).toEqual(['PASS_LEFT_OK', 'CARRY_OK']); expect(won.next?.node).toBe('FINISH')
    const old = resolvePlay({ ...ctx, duels: undefined }, play, 'LEFT', () => 0)
    expect(old.events).toHaveLength(1)
    const shot = won.next!; const draws = [0.4, .1, .1]; const newShot = resolvePlay(ctx, shot, 'SHOOT', () => draws.shift()!)
    const historical = [.4, .1, .1]; expect(newShot).toEqual(resolvePlay({ ...ctx, duels: undefined }, shot, 'SHOOT', () => historical.shift()!))
  })
  it('uses the OVR curve for the aerial contest, preserving delivery and waiting for header choice', () => {
    const crosser = input.localLineup.LW!; const target = input.catalog.find((p) => p.id === input.localLineup.ST)!
    const defender = input.catalog.find((p) => p.id === input.cpuLineup.LCB)!
    const play = { id: 'aerial', node: 'FINISH' as const, protagonistId: input.localLineup.LCM!, receiverId: crosser, sector: 'LEFT' as const, options: [{ choice: 'CROSS' as const, available: true, playerId: target.id, rivalId: defender.id }] }
    const threshold = 1 - defenderDuelChance(target.overall_rating, defender.overall_rating)
    const lost = [0, threshold + .00001]; expect(sendDirectedCross(ctx, play, () => lost.shift()!).next).toBeNull()
    const won = [0, threshold - .00001, .2]; const result = sendDirectedCross(ctx, play, () => won.shift()!)
    expect(result.next?.node).toBe('HEADER'); expect(result.events.some((e) => e.type === 'goal')).toBe(false); expect(won).toHaveLength(0)
  })
})
