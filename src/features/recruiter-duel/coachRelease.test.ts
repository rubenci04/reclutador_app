import { describe, expect, it } from 'vitest'
import { COACH_MARKET_V4, COACH_MAX_PRICE } from '../coaches/coachRules'
import { catalogForMode } from '../themed-modes/modeCatalog'
import { auctionAvailability, beginBidding, createRecruiterDuel, nextAuctionRound, passAuction, placeBid, revealCoinToss, revealDiscardReplacement, revealNextAuctionRound, startCoinToss, startDuelMatch } from './auctionEngine'
import type { AuctionTransition, RecruiterDuelGame, RecruiterId } from './auctionTypes'
import { chooseCoach, coachMarket, coachOffersFor, declineCoach, releaseCoach } from './coachHiring'
import { simulationConfig } from './cpuSimulation'

const catalog = catalogForMode('GLOBAL_CLASSIC')
const config = { ...simulationConfig, coaches: true as const, coachReserve: COACH_MAX_PRICE, coachMarket: COACH_MARKET_V4 }
const must = (value: AuctionTransition): RecruiterDuelGame => { if (!value.ok) throw new Error(value.error); return value.game }

/** Two people bidding the base price when allowed, up to the squads being complete. */
function squads(seed: string, withConfig = config): RecruiterDuelGame {
  const created = createRecruiterDuel(catalog, seed, undefined, withConfig); if (!created.ok) throw new Error(created.error)
  let game = must(beginBidding(must(revealCoinToss(must(startCoinToss(created.game, 'heads'))))))
  for (let step = 0; step < 1500 && game.phase !== 'TEAMS_COMPLETED'; step++) {
    if (game.phase === 'DISCARD_RESULT') { game = must(revealDiscardReplacement(game)); continue }
    if (game.phase === 'NEXT_ROUND') { game = must(revealNextAuctionRound(game)); continue }
    if (game.phase === 'REVEAL_PLAYER') { game = must(beginBidding(game)); continue }
    if (game.phase === 'ROUND_RESULT') { game = must(nextAuctionRound(game, catalog)); continue }
    const side = game.activeParticipant!; const availability = auctionAvailability(game, side, catalog)
    game = side === 'recruiter_one' && availability.bid.enabled ? must(placeBid(game, side, availability.minimum, catalog)) : must(passAuction(game, side, catalog))
  }
  expect(game.phase).toBe('TEAMS_COMPLETED')
  return game
}
const hire = (game: RecruiterDuelGame, side: RecruiterId) => must(chooseCoach(game, side, coachMarket(game, side)[0].id))

describe('releaseCoach', () => {
  const game = squads('release-1')
  it('gives the exact price back, clears every coach field and lets the recruiter hire again', () => {
    const hired = hire(game, 'recruiter_one')
    const team = hired.teams.recruiter_one
    expect(team.coachId).toBeTruthy(); expect(team.spent).toBe(game.teams.recruiter_one.spent + team.coachPrice!)
    const released = must(releaseCoach(hired, 'recruiter_one'))
    expect(released.teams.recruiter_one).toEqual(game.teams.recruiter_one)
    for (const key of ['coachId', 'coachPrice', 'coachTier', 'coachDeclined'] as const) expect(key in released.teams.recruiter_one).toBe(false)
    expect(released.teams.recruiter_two).toBe(hired.teams.recruiter_two)
    // The same offer comes back (it depends on the money left) and another coach can be hired.
    expect(coachOffersFor(released, 'recruiter_one').map((coach) => coach.id)).toEqual(coachOffersFor(game, 'recruiter_one').map((coach) => coach.id))
    const second = must(chooseCoach(released, 'recruiter_one', coachMarket(released, 'recruiter_one').at(-1)!.id))
    expect(second.teams.recruiter_one.spent).toBe(game.teams.recruiter_one.spent + second.teams.recruiter_one.coachPrice!)
  })
  it('also undoes going without a coach, without touching the money', () => {
    const declined = must(declineCoach(game, 'recruiter_two'))
    expect(declined.teams.recruiter_two.coachDeclined).toBe(true)
    const released = must(releaseCoach(declined, 'recruiter_two'))
    expect(released.teams.recruiter_two).toEqual(game.teams.recruiter_two)
    expect(coachMarket(released, 'recruiter_two').length).toBeGreaterThan(0)
  })
  it('refuses when there is nothing to release, outside the squad stage and once the match was played', () => {
    expect(releaseCoach(game, 'recruiter_one')).toEqual({ ok: false, error: 'invalid_transition' })
    const hired = hire(game, 'recruiter_one')
    expect(releaseCoach({ ...hired, phase: 'BIDDING' }, 'recruiter_one')).toEqual({ ok: false, error: 'invalid_transition' })
    const played = must(startDuelMatch(hired, catalog, undefined, true))
    expect(played.phase).toBe('SIMULATING')
    expect(releaseCoach(played, 'recruiter_one')).toEqual({ ok: false, error: 'invalid_transition' })
    const noCoaches = squads('release-2', { ...config, coaches: undefined } as never)
    expect(releaseCoach(noCoaches, 'recruiter_one')).toEqual({ ok: false, error: 'invalid_transition' })
  })
  it('does not change the shared-coach rule: both recruiters may be offered and hire the same coach', () => {
    // Offers are seeded per side from each side's own pool, so the same coach can be on both lists.
    let shared = 0
    for (let index = 0; index < 20; index++) {
      const state = squads(`release-share-${index}`)
      const one = coachOffersFor(state, 'recruiter_one').map((coach) => coach.id); const two = coachOffersFor(state, 'recruiter_two').map((coach) => coach.id)
      const common = one.find((id) => two.includes(id))
      if (!common) continue
      shared++
      const both = must(chooseCoach(must(chooseCoach(state, 'recruiter_one', common)), 'recruiter_two', common))
      expect(both.teams.recruiter_one.coachId).toBe(common); expect(both.teams.recruiter_two.coachId).toBe(common)
    }
    expect(shared).toBeGreaterThan(0)
  })
})
