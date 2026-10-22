import { describe, expect, it } from 'vitest'
import { COACH_CATALOG, EXTRA_COACHES, hiredCoachOf } from '../coaches/coachCatalog'
import { coachesForMode } from '../coaches/coachContext'
import { COACH_MARKET_V2, COACH_MARKET_V3, COACH_TIER_BONUS, COACH_TIER_PRICE, coachEffect, coachMarketOf } from '../coaches/coachRules'
import { COACH_TIERS } from '../coaches/coachTypes'
import { DRAFT_CATALOG } from '../draft/catalog'
import { generateCpuTeam } from '../local-match/cpuTeam'
import type { ThemedModeId } from '../themed-modes/modeTypes'
import { autoChooseCoach, chooseCoach, coachMarket, coachOffers, coachOf } from './coachHiring'
import { createRecruiterDuel } from './auctionEngine'
import type { RecruiterDuelGame } from './auctionTypes'
import { CLASSIC_CONFIG, parseMatchConfig, type MatchConfig } from './matchConfig'
import v3 from '../../data/coaches-v3.json'

const config = (market: typeof COACH_MARKET_V2 | typeof COACH_MARKET_V3, budget = 250): MatchConfig => ({ ...CLASSIC_CONFIG, budget, coaches: true, coachReserve: 8, coachMarket: market })
const offerFor = (mode: ThemedModeId, left: number, seed = 'c6b') => coachOffers(seed, 8, mode, { recruiter_one: left, recruiter_two: left }, 'v3').recruiter_one
const MODES: readonly ThemedModeId[] = ['GLOBAL_CLASSIC', 'ITALY_CURRENT', 'ITALY_LEGENDS', 'MEXICO_CURRENT', 'MEXICO_LEGENDS', 'ARGENTINA_CURRENT', 'BRAZIL_LEGENDS', 'ENGLAND_LEGENDS', 'SPAIN_LEGENDS', 'EUROPE_LEGENDS', 'LEGENDS_ONLY']

describe('COACH-006B tiers and the historical market', () => {
  it('adds S+ with its own price and bonus without raising any earlier cap', () => {
    expect(COACH_TIERS[0]).toBe('S+')
    expect(COACH_TIER_PRICE['S+']).toBeGreaterThan(COACH_TIER_PRICE.S)
    expect(COACH_TIER_BONUS['S+']).toBeGreaterThan(COACH_TIER_BONUS.S)
    const plus = coachEffect({ tier: 'S+', focus: 'ATTACK' }, 'WIDE_PLAY'), star = coachEffect({ tier: 'S', focus: 'ATTACK' }, 'WIDE_PLAY')
    expect(plus.attack).toBeGreaterThan(star.attack)
    expect(star.attack).toBe(2.9) // earlier tiers keep their values (2.5 x 1.15, cap 3)
    expect(coachMarketOf({ coachMarket: COACH_MARKET_V3 })).toBe('v3')
    expect(coachMarketOf({ coachMarket: COACH_MARKET_V2 })).toBe('v2')
    expect(coachMarketOf({})).toBe('v1')
  })
  it('never puts S+ or the v3 additions in the v1 and v2 markets, and keeps their tiers and prices', () => {
    for (const mode of MODES) for (const market of ['v1', 'v2'] as const) {
      const pool = coachesForMode(mode, market)
      expect(pool.every((coach) => coach.tier !== 'S+' && !coach.id.startsWith('coach_v3_')), `${mode} ${market}`).toBe(true)
      for (const coach of pool) expect(coach.price, `${mode} ${market} ${coach.id}`).toBe(COACH_TIER_PRICE[coach.tier])
    }
    expect([...COACH_CATALOG, ...EXTRA_COACHES].filter((c) => !c.id.startsWith('coach_v3_') && !c.id.startsWith('coach_arg'))).toHaveLength(120)
    expect(COACH_CATALOG.find((c) => c.surname === 'Guardiola')!.tier).toBe('S')
  })
  it('re-tiers editorially: scarce S+ and S, every explicit name exists', () => {
    const everyone = [...COACH_CATALOG, ...EXTRA_COACHES, ...(['ITALY_CURRENT', 'ITALY_LEGENDS', 'MEXICO_CURRENT', 'MEXICO_LEGENDS'] as const).flatMap((mode) => coachesForMode(mode, 'v2'))]
    for (const names of Object.values(v3.tiers)) for (const name of names) expect(everyone.some((c) => `${c.name} ${c.surname}` === name), name).toBe(true)
    const global = coachesForMode('GLOBAL_CLASSIC', 'v3')
    expect(global.filter((c) => c.tier === 'S+').map((c) => c.surname).sort()).toEqual(['Ancelotti', 'Enrique', 'Guardiola'])
    expect(global.filter((c) => c.tier === 'S').length).toBeLessThan(COACH_CATALOG.filter((c) => c.status === 'ACTIVE' && c.tier === 'S').length)
    const italy = coachesForMode('ITALY_LEGENDS', 'v3')
    expect(italy.find((c) => c.surname === 'Sacchi')!.tier).toBe('S+')
    expect(italy.find((c) => c.surname === 'Capello')!.tier).toBe('S')
  })
})

describe('COACH-006B coach-market-v3 offers', () => {
  it.each(MODES)('%s: only affordable coaches of its own pool at their real price, distinct and reproducible', (mode) => {
    const pool = new Set(coachesForMode(mode, 'v3').map((c) => c.id))
    for (const left of [250, 12, 8, 5, 3, 1]) {
      const offer = offerFor(mode, left)
      expect(offer.length).toBeLessThanOrEqual(6)
      expect(new Set(offer.map((c) => c.id)).size).toBe(offer.length)
      for (const coach of offer) {
        expect(coach.price).toBeLessThanOrEqual(left)
        expect(coach.price).toBe(COACH_TIER_PRICE[coach.tier])
        expect(pool.has(coach.id)).toBe(true)
      }
      expect(offerFor(mode, left)).toEqual(offer)
    }
    expect(offerFor(mode, 0)).toEqual([])
  })
  it('offers six competitive alternatives (S+, S, A) with different specialities when money allows, and slides down with less money', () => {
    for (const mode of ['GLOBAL_CLASSIC', 'ITALY_CURRENT', 'EUROPE_LEGENDS', 'LEGENDS_ONLY'] as const) {
      const rich = offerFor(mode, 250)
      expect(rich, mode).toHaveLength(6)
      expect(rich.every((c) => ['S+', 'S', 'A'].includes(c.tier)), mode).toBe(true)
      expect(new Set(rich.map((c) => c.focus)).size, mode).toBeGreaterThanOrEqual(3)
    }
    const global = (left: number) => offerFor('GLOBAL_CLASSIC', left)
    expect(global(250).some((c) => c.tier === 'S+')).toBe(true)
    expect(global(11).some((c) => c.tier === 'S+')).toBe(false)
    expect(Math.max(...global(5).map((c) => c.price))).toBeLessThanOrEqual(5)
    expect(global(2).every((c) => c.price <= 2)).toBe(true)
    // Not an artificial one-of-each-tier card set.
    expect(new Set(global(250).map((c) => c.tier)).size).toBeLessThan(6)
  })
  it('draws Italy and Mexico from coaches with a documented spell in that league, not by nationality', () => {
    const italy = coachesForMode('ITALY_CURRENT', 'v3'), mexico = coachesForMode('MEXICO_CURRENT', 'v3')
    expect(italy.every((c) => c.league === 'ITA') && mexico.every((c) => c.league === 'MEX')).toBe(true)
    expect(italy.find((c) => c.surname === 'Mourinho')).toMatchObject({ team: 'Inter de Milán', league: 'ITA' })
    expect(mexico.find((c) => c.surname === 'Almeyda')).toMatchObject({ team: 'Guadalajara', league: 'MEX' })
    expect(mexico.some((c) => c.surname === 'Scaloni')).toBe(false)
    expect(coachesForMode('ITALY_CURRENT', 'v2').some((c) => c.surname === 'Mourinho')).toBe(false)
    expect(italy.length).toBeGreaterThan(coachesForMode('ITALY_CURRENT', 'v2').length)
    expect(coachesForMode('ENGLAND_LEGENDS', 'v3').length).toBeGreaterThan(coachesForMode('ENGLAND_LEGENDS', 'v2').length)
  })
})

/** Both elevens complete, a coach market open. */
function market(budget: number, market: typeof COACH_MARKET_V2 | typeof COACH_MARKET_V3 = COACH_MARKET_V3, catalog = DRAFT_CATALOG): RecruiterDuelGame {
  const created = createRecruiterDuel(DRAFT_CATALOG, 'c6b-game', undefined, config(market, budget))
  if (!created.ok) throw new Error(created.error)
  const one = generateCpuTeam(DRAFT_CATALOG, 'c6b-one').team.lineup
  const used = new Set(Object.values(one))
  const two = generateCpuTeam(catalog.filter((player) => !used.has(player.id)), 'c6b-two').team.lineup
  const spent = (lineup: typeof one) => Object.values(lineup).reduce((total, id) => total + DRAFT_CATALOG.find((player) => player.id === id)!.price, 0)
  return { ...created.game, coachMode: 'GLOBAL_CLASSIC', phase: 'TEAMS_COMPLETED', teams: { recruiter_one: { lineup: one, spent: spent(one) }, recruiter_two: { lineup: two, spent: spent(two) } } }
}

describe('COACH-006B hiring and the CPU', () => {
  it('hires at the real price, remembers the v3 tier and keeps earlier games on their own coaches', () => {
    const game = market(250)
    const offer = coachMarket(game, 'recruiter_one')
    expect(offer.length).toBeGreaterThan(0)
    const pick = offer[0]
    const hired = chooseCoach(game, 'recruiter_one', pick.id)
    if (!hired.ok) throw new Error(hired.error)
    expect(hired.game.teams.recruiter_one).toMatchObject({ coachId: pick.id, coachPrice: pick.price, coachTier: pick.tier })
    expect(hired.game.teams.recruiter_one.spent).toBe(game.teams.recruiter_one.spent + pick.price)
    expect(hiredCoachOf(hired.game.teams.recruiter_one)?.tier).toBe(pick.tier)
    expect(coachOf(hired.game, 'recruiter_one')?.tier).toBe(pick.tier)
    const old = market(250, COACH_MARKET_V2)
    const oldPick = coachMarket(old, 'recruiter_one')[0]
    const oldHire = chooseCoach(old, 'recruiter_one', oldPick.id)
    if (!oldHire.ok) throw new Error(oldHire.error)
    expect(oldHire.game.teams.recruiter_one.coachTier).toBeUndefined()
    expect(parseMatchConfig(config(COACH_MARKET_V3))?.coachMarket).toBe(COACH_MARKET_V3)
    expect(parseMatchConfig({ ...config(COACH_MARKET_V3), coachMarket: 'coach-market-v9' })).toBeNull()
  })
  it('makes the CPU choose by the weak sector of its eleven, not always the biggest raw sum', () => {
    const weaken = (field: 'att_rating' | 'def_rating') => DRAFT_CATALOG.map((player) => ({ ...player, [field]: Math.max(40, player[field] - 30) }))
    const pick = (field: 'att_rating' | 'def_rating') => {
      const catalog = weaken(field)
      const game = market(250, COACH_MARKET_V3, catalog)
      const next = autoChooseCoach(game, 'recruiter_two', catalog, 'NEUTRAL')
      return { coach: coachOf(next, 'recruiter_two')!, offer: coachMarket(game, 'recruiter_two') }
    }
    const attack = pick('att_rating'), defense = pick('def_rating')
    expect(attack.coach.id).not.toBe(defense.coach.id)
    const effect = (coach: typeof attack.coach) => coachEffect(coach)
    const raw = (coach: typeof attack.coach) => { const e = effect(coach); return e.attack + e.defense + e.midfield }
    // The choice leans towards the weak sector...
    expect(effect(attack.coach).attack).toBeGreaterThanOrEqual(effect(attack.coach).defense)
    expect(effect(defense.coach).defense).toBeGreaterThanOrEqual(effect(defense.coach).attack)
    // ...and for at least one of the two teams it is not the coach with the biggest raw total.
    const best = (offer: typeof attack.offer) => Math.max(...offer.map(raw))
    expect(raw(attack.coach) < best(attack.offer) || raw(defense.coach) < best(defense.offer)).toBe(true)
    // Deterministic.
    expect(pick('def_rating').coach.id).toBe(defense.coach.id)
    // Earlier markets keep the raw-sum rule.
    const old = market(250, COACH_MARKET_V2)
    const oldChoice = coachOf(autoChooseCoach(old, 'recruiter_two'), 'recruiter_two')!
    expect(raw(oldChoice)).toBe(Math.max(...coachMarket(old, 'recruiter_two').map(raw)))
  })
})
