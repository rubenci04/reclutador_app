import { describe, expect, it } from 'vitest'
import { planCorner, resolveCorner, zoneCoverageChance, cornerDeliveryChance, cornerFamilyChance } from './corners'
import { defenderDuelChance } from './individualDuels'
import type { PlayContext } from './attackTree'
import { liveInput } from './liveFixtures.test-support'

const input = liveInput()
const ctx: PlayContext = { minute: 45, catalog: input.catalog, local: { lineup: input.localLineup, formation: '4-3-3' }, cpu: { lineup: input.cpuLineup, formation: '4-3-3' }, effective: { local: { attack: 80, defense: 80, midfield: 80, global: 80 }, cpu: { attack: 80, defense: 80, midfield: 80, global: 80 } }, strategy: { local: 'NEUTRAL', cpu: 'NEUTRAL' }, effectiveOnly: true, duels: 'ovr-duels-v1' }
const draws = (values: number[]) => { let i = 0; return () => { if (i >= values.length) throw Error('unexpected_draw'); return values[i++] } }
const setup = (side: 'local' | 'cpu' = 'local', cause = .1, cpuDelivery = .1) => planCorner(ctx, side, 'play-45', draws([cause, .1, cpuDelivery, .4, .8]))!
const cross = () => { const p = setup(); return { origin: p, result: resolveCorner(ctx, p.play, 'CORNER_NEAR', p.plan, draws([0, .99, .8, 0, 0, 0, 0, 0])) } }

describe('corners-v1 sporting phases', () => {
  it.each([[.1, 'DEFLECTION', 'shot'], [.5, 'CLEARANCE', 'recovery'], [.9, 'SAVE', 'save']] as const)('records cause before award: %s %s', (roll, cause, kind) => {
    const p = setup('local', roll)
    expect(p.events.map((e) => e.type)).toEqual([kind, 'corner'])
    expect(p.play.corner).toMatchObject({ cause, awardedTo: 'local' })
    expect(p.events[1].corner?.concededById).toBe(cause === 'SAVE' ? input.cpuLineup.GK : p.play.corner!.defenderId)
    expect(p.events.some((e) => e.type === 'attack' || e.type === 'goal')).toBe(false)
  })
  it('uses actual eligible actors and falls back without a corner when no target exists', () => {
    const p = setup(); const a = p.play.corner!
    expect(new Set([a.kickerId, a.targetId, a.receiverId]).size).toBe(3)
    expect(Object.values(input.localLineup)).toContain(a.kickerId)
    expect(input.catalog.find((p) => p.id === a.targetId)!.position).toBe('DEL')
    const depleted = { ...ctx, catalog: ctx.catalog.filter((p) => p.position !== 'DEL') }
    expect(planCorner(depleted, 'local', 'play-45', () => { throw Error('no draws on invalid actors') })).toBeNull()
    expect(p.play.options.find((o) => o.choice === 'CORNER_FAR')!.rivalId).toBe(a.farDefenderId)
    expect(a.farDefenderId).not.toBe(a.defenderId) // actual opposite central positions in the 4-3-3
  })
  it.each(['CORNER_NEAR', 'CORNER_FAR'] as const)('requires a fresh direction after a delivered and won %s, with no goal drawn early', (choice) => {
    const p = setup(), result = resolveCorner(ctx, p.play, choice, p.plan, draws([0, .99, 0, 0, 0, 0, 0, 0]))
    expect(result.next?.node).toBe('CORNER_HEADER'); expect(result.events.at(-1)?.step).toBe('CORNER_WON')
    expect(result.events.some((e) => e.type === 'goal' || e.corner?.direction || e.corner?.keeperDirection)).toBe(false)
    const shot = resolveCorner(ctx, result.next!, 'FAR_POST', p.plan, draws([.99, 0, 0, 0]))
    expect(shot.events.map((e) => e.step)).toEqual(['CORNER_CONTACT', 'CORNER_FLIGHT', 'CORNER_GOAL'])
    expect(shot.next).toBeNull()
  })
  it('separates a failed delivery from a lost OVR duel and a won duel', () => {
    const p = setup()
    expect(resolveCorner(ctx, p.play, 'CORNER_FAR', p.plan, draws([.99, .99, 0, 0, 0, 0, 0, .99])).events.map((e) => e.step)).toEqual(['CORNER_RUNUP', 'CORNER_DELIVERY', 'CORNER_CLEAR'])
    const a = p.play.corner!, attacker = ctx.catalog.find((p) => p.id === a.targetId)!, defender = ctx.catalog.find((p) => p.id === a.defenderId)!
    const chance = defenderDuelChance(attacker.overall_rating, defender.overall_rating)
    expect(resolveCorner(ctx, p.play, 'CORNER_NEAR', p.plan, draws([0, chance - .000001, 0, 0, 0, 0, 0, 0])).events.at(-1)?.step).toBe('CORNER_EXIT')
    expect(resolveCorner(ctx, p.play, 'CORNER_NEAR', p.plan, draws([0, chance + .000001, 0, 0, 0, 0, 0, 0])).next?.node).toBe('CORNER_HEADER')
    const equal = { ...defender, overall_rating: attacker.overall_rating }; expect(defenderDuelChance(attacker.overall_rating, equal.overall_rating)).toBe(.5)
  })
  it.each([[0, 0, 0, 0, 'CORNER_BLOCK'], [.99, .99, 0, .99, 'CORNER_WIDE'], [.99, .99, 0, 0, 'CORNER_OVER'], [.99, 0, .99, 0, 'CORNER_SAVE'], [.99, 0, 0, 0, 'CORNER_GOAL']] as const)('resolves header outcome only after accepting direction: %s/%s/%s/%s', (block, precision, goal, miss, ending) => {
    const p = cross(); const resolved = resolveCorner(ctx, p.result.next!, 'NEAR_POST', p.origin.plan, draws([block, precision, goal, miss]))
    expect(resolved.events.at(-1)?.step).toBe(ending); expect(resolved.next).toBeNull()
  })
  it('short corner has one bounded continuation; no extra question or new attack', () => {
    const p = setup(); const good = resolveCorner(ctx, p.play, 'CORNER_SHORT', p.plan, draws([0, .99, .99, 0, 0, 0, 0, 0]))
    expect(good.events.map((e) => e.step)).toEqual(['CORNER_RUNUP', 'CORNER_SHORT_PASS', 'CORNER_CONTEST', 'CORNER_SHORT_ADVANCE', 'CORNER_SHOT', 'CORNER_FLIGHT', 'CORNER_GOAL'])
    expect(good.next).toBeNull(); expect(good.events.some((e) => e.type === 'attack')).toBe(false)
    expect(resolveCorner(ctx, p.play, 'CORNER_SHORT', p.plan, draws([.99, 0, 0, 0, 0, 0, 0, .99])).events.at(-1)?.step).toBe('CORNER_CLEAR')
  })
  it.each(['MAN_MARK', 'ZONE'] as const)('defends a CPU corner using its precommitted plan: %s', (choice) => {
    const p = setup('cpu'); expect(p.play.node).toBe('CORNER_DEFEND')
    expect(p.play).not.toHaveProperty('plan'); expect(p.events[1].corner).not.toHaveProperty('delivery')
    const result = resolveCorner(ctx, p.play, choice, p.plan, draws([0, .99, .99, 0, 0, 0, 0, 0]))
    expect(result.next).toBeNull(); expect(result.events.at(-1)).toMatchObject({ type: 'goal', side: 'cpu' })
    expect(result.events.find((e) => e.step === 'CORNER_DELIVERY')?.corner?.delivery).toBe(p.plan.delivery)
    expect(result.events.find((e) => e.step === 'CORNER_CONTACT')?.corner?.direction).toBe(p.plan.direction)
  })
  it('neither coverage nor individual marking dominates all profiles; attributes only enter coverage/delivery, not the OVR duel', () => {
    const kicker = { ...input.catalog[8], overall_rating: 80, att_rating: 80, men_rating: 80 }, low = { ...input.catalog[1], overall_rating: 80, def_rating: 60, men_rating: 60 }, high = { ...low, def_rating: 99, men_rating: 99 }
    const individual = defenderDuelChance(80, 80)
    expect(zoneCoverageChance(high, kicker, 0, 'CORNER_NEAR')).toBeGreaterThan(individual)
    expect(zoneCoverageChance(low, kicker, 0, 'CORNER_FAR')).toBeLessThan(individual)
    expect(cornerDeliveryChance(kicker, high, 0, 'CORNER_NEAR')).toBeGreaterThan(cornerDeliveryChance(kicker, high, 0, 'CORNER_FAR'))
    expect(cornerFamilyChance('CORNER')).toBeLessThan(cornerFamilyChance('OPEN_PLAY'))
  })
})
