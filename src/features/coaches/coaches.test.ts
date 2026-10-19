import { describe, expect, it } from 'vitest'
import { DRAFT_CATALOG } from '../draft/catalog'
import { CLASSIC_CONFIG, parseMatchConfig } from '../recruiter-duel/matchConfig'
import { auctionAvailability, beginBidding, budgetOf, createRecruiterDuel, nextAuctionRound, passAuction, placeBid, revealCoinToss, revealDiscardReplacement, revealNextAuctionRound, startCoinToss, startDuelMatch } from '../recruiter-duel/auctionEngine'
import type { AuctionTransition, RecruiterDuelGame } from '../recruiter-duel/auctionTypes'
import { takeCpuTurn } from '../recruiter-duel/cpuPolicy'
import { chooseCoach, coachMarket, coachOffers, autoChooseCoach } from '../recruiter-duel/coachHiring'
import { COACH_CATALOG } from './coachCatalog'
import { COACH_RESERVE, COACH_TIER_BONUS, COACH_TIER_PRICE, coachAge, coachEffect } from './coachRules'

describe('coach catalog', () => {
  it('has 100 unique coaches: 70 active and 30 legends, most of them Argentine', () => {
    expect(COACH_CATALOG).toHaveLength(100)
    expect(new Set(COACH_CATALOG.map((coach) => coach.id)).size).toBe(100)
    expect(COACH_CATALOG.filter((coach) => coach.status === 'ACTIVE')).toHaveLength(70)
    expect(COACH_CATALOG.filter((coach) => coach.status === 'LEGEND')).toHaveLength(30)
    expect(COACH_CATALOG.filter((coach) => coach.nationality === 'ARG').length).toBeGreaterThan(50)
  })
  it('prices coaches far below footballers and by tier', () => {
    const cheapestPlayer = Math.min(...DRAFT_CATALOG.map((player) => player.price))
    for (const coach of COACH_CATALOG) { expect(coach.price).toBe(COACH_TIER_PRICE[coach.tier]); expect(coach.price).toBeLessThanOrEqual(8); expect(coach.price).toBeGreaterThanOrEqual(COACH_RESERVE) }
    expect(Math.max(...COACH_CATALOG.map((coach) => coach.price))).toBeLessThan(DRAFT_CATALOG.reduce((total, player) => total + player.price, 0) / DRAFT_CATALOG.length)
    expect(cheapestPlayer).toBeGreaterThan(0)
    expect(COACH_CATALOG.filter((coach) => coach.price === COACH_RESERVE).length).toBeGreaterThanOrEqual(2)
  })
  it('gives higher tiers a bigger bounded effect and shows age or lifespan data', () => {
    const tiers = ['S', 'A', 'B', 'C', 'D'] as const
    for (let i = 1; i < tiers.length; i++) expect(COACH_TIER_BONUS[tiers[i - 1]]).toBeGreaterThan(COACH_TIER_BONUS[tiers[i]])
    expect(coachEffect({ tier: 'S', focus: 'ATTACK' })).toEqual({ attack: 2.5, defense: 1.3, midfield: 1.3 })
    expect(coachEffect({ tier: 'S', focus: 'BALANCED' })).toEqual({ attack: 1.9, defense: 1.9, midfield: 1.9 })
    expect(coachAge({ birthYear: 1978 })).toBe(48)
    expect(COACH_CATALOG.every((coach) => !coach.deathYear || coach.deathYear > coach.birthYear)).toBe(true)
  })
})

const must = (result: AuctionTransition): RecruiterDuelGame => { if (!result.ok) throw new Error(result.error); return result.game }
const config = { ...CLASSIC_CONFIG, coaches: true }

function play(seed: string) {
  const created = createRecruiterDuel(DRAFT_CATALOG, seed, undefined, config)
  if (!created.ok) throw new Error(`${seed}: ${created.error}`)
  let game = must(beginBidding(must(revealCoinToss(must(startCoinToss(created.game, 'heads'))))))
  for (let step = 0; step < 1200 && game.phase !== 'TEAMS_COMPLETED'; step++) {
    if (game.phase === 'DISCARD_RESULT') { game = must(revealDiscardReplacement(game)); continue }
    if (game.phase === 'NEXT_ROUND') { game = must(revealNextAuctionRound(game)); continue }
    if (game.phase === 'REVEAL_PLAYER') { game = must(beginBidding(game)); continue }
    if (game.phase === 'ROUND_RESULT') { game = must(nextAuctionRound(game, DRAFT_CATALOG)); continue }
    const who = game.activeParticipant!
    if (who === 'recruiter_two') { game = must(takeCpuTurn(game, DRAFT_CATALOG, 'AGGRESSIVE')); continue }
    const a = auctionAvailability(game, who, DRAFT_CATALOG)
    // Offers as high as it is safe to make: the reserve must still hold.
    if (a.bid.enabled) game = must(placeBid(game, who, a.maximum, DRAFT_CATALOG))
    else if (a.pass.enabled) game = must(passAuction(game, who, DRAFT_CATALOG))
    else game = must(placeBid(game, who, a.minimum, DRAFT_CATALOG))
  }
  return game
}

describe('coach hiring in a duel', () => {
  it('parses the option strictly and leaves older configurations untouched', () => {
    expect(parseMatchConfig({ ...CLASSIC_CONFIG })).toEqual(CLASSIC_CONFIG)
    expect(parseMatchConfig({ ...CLASSIC_CONFIG, coaches: true })).toEqual(config)
    expect(parseMatchConfig({ ...CLASSIC_CONFIG, coaches: 'yes' })).toBeNull()
  })
  it('offers three distinct coaches per recruiter, allowing the same coach on opposing teams', () => {
    for (const seed of ['a', 'b', 'c', 'd']) {
      const offers = coachOffers(seed)
      expect(offers.recruiter_one).toHaveLength(3); expect(offers.recruiter_two).toHaveLength(3)
      for (const choices of Object.values(offers)) expect(new Set(choices.map((coach) => coach.id)).size).toBe(3)
      for (const side of ['recruiter_one', 'recruiter_two'] as const) expect(offers[side].some((coach) => coach.price === COACH_RESERVE)).toBe(true)
      expect(coachOffers(seed)).toEqual(offers)
    }
  })
  it('keeps the reserve even when bidding at the safe maximum, so everyone can hire', () => {
    for (const seed of ['coach-1', 'coach-2', 'coach-3']) {
      const game = play(seed)
      expect(game.phase).toBe('TEAMS_COMPLETED')
      for (const side of ['recruiter_one', 'recruiter_two'] as const) {
        expect(budgetOf(game) - game.teams[side].spent).toBeGreaterThanOrEqual(COACH_RESERVE)
        expect(coachMarket(game, side).length).toBeGreaterThan(0)
      }
    }
  })
  it('charges the price, allows one coach, rejects others and adds the effect to the match', () => {
    const game = play('coach-1')
    const pick = coachMarket(game, 'recruiter_one')[0]
    const hired = must(chooseCoach(game, 'recruiter_one', pick.id))
    expect(hired.teams.recruiter_one.spent).toBe(game.teams.recruiter_one.spent + pick.price)
    expect(hired.teams.recruiter_one.coachId).toBe(pick.id)
    expect(coachMarket(hired, 'recruiter_one')).toEqual([])
    expect(chooseCoach(hired, 'recruiter_one', pick.id)).toEqual({ ok: false, error: 'invalid_coach' })
    expect(chooseCoach(game, 'recruiter_one', 'missing-coach')).toEqual({ ok: false, error: 'invalid_coach' })
    const both = autoChooseCoach(hired, 'recruiter_two')
    expect(both.teams.recruiter_two.coachId).toBeDefined()
    expect(autoChooseCoach(both, 'recruiter_two')).toBe(both)
    const played = must(startDuelMatch(both, DRAFT_CATALOG))
    expect(played.matchResult?.coaches?.local?.id).toBe(pick.id)
    expect(played.matchResult?.coaches?.cpu?.id).toBe(both.teams.recruiter_two.coachId)
    const bare = must(startDuelMatch(game, DRAFT_CATALOG))
    expect(bare.matchResult?.coaches).toBeUndefined()
  })
})
