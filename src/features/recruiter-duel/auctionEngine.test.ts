import { describe, expect, it } from 'vitest'
import { DRAFT_CATALOG } from '../draft/catalog'
import { beginBidding, completeDuelMatch, createRecruiterDuel, maximumSafeBid, nextAuctionRound, passAuction, placeBid, revealCoinToss, revealNextAuctionRound, startCoinToss, startDuelMatch } from './auctionEngine'
import type { AuctionTransition, RecruiterDuelGame } from './auctionTypes'

function gameFor(seed = 'auction-test') {
  const created = createRecruiterDuel(DRAFT_CATALOG, seed)
  if (!created.ok) throw new Error(created.error)
  return created.game
}
function get(result: AuctionTransition) { if (!result.ok) throw new Error(result.error); return result.game }
function biddingGame(seed = 'auction-test') {
  let game = gameFor(seed)
  game = get(startCoinToss(game, 'heads')); game = get(revealCoinToss(game)); return get(beginBidding(game))
}
function completeByPassing(seed = 'auction-pass') {
  let game = gameFor(seed)
  game = get(startCoinToss(game, 'heads')); game = get(revealCoinToss(game))
  while (game.phase !== 'TEAMS_COMPLETED') {
    game = get(beginBidding(game)); game = get(passAuction(game, game.activeParticipant!, DRAFT_CATALOG)); game = get(passAuction(game, game.activeParticipant!, DRAFT_CATALOG)); game = get(nextAuctionRound(game, DRAFT_CATALOG))
    if (game.phase === 'NEXT_ROUND') game = get(revealNextAuctionRound(game))
  }
  return game
}

describe('single-player recruiter auctions', () => {
  it('draws 22 unique footballers with the required distribution in a reproducible order', () => {
    const first = gameFor('same-seed'); const second = gameFor('same-seed')
    expect(first.rounds).toEqual(second.rounds)
    const ids = first.rounds.map((round) => round.playerId)
    expect(ids).toHaveLength(22); expect(new Set(ids).size).toBe(22)
    expect(first.rounds.filter((round) => round.position === 'ARQ')).toHaveLength(2)
    expect(first.rounds.filter((round) => round.position === 'DEF')).toHaveLength(8)
    expect(first.rounds.filter((round) => round.position === 'MED')).toHaveLength(6)
    expect(first.rounds.filter((round) => round.position === 'DEL')).toHaveLength(6)
  })
  it('persists the called coin side and stored result, then alternates priority', () => {
    const game = gameFor('coin'); const result = game.coinResult
    const revealed = get(revealCoinToss(get(startCoinToss(game, 'tails'))))
    expect(revealed.coinResult).toBe(result); expect(revealed.coinCall).toBe('tails')
    expect(revealed.record).toContainEqual(expect.objectContaining({ type: 'coin_toss', calledSide: 'tails', result }))
    for (let index = 1; index < revealed.openingOrder.length; index++) expect(revealed.openingOrder[index]).not.toBe(revealed.openingOrder[index - 1])
  })
  it('enforces base price, increment, turn, capacity and safe budget reserve', () => {
    const game = biddingGame('bids'); const footballer = DRAFT_CATALOG.find((player) => player.id === game.rounds[0].playerId)!
    expect(placeBid(game, game.activeParticipant!, footballer.price - 1, DRAFT_CATALOG)).toMatchObject({ ok: false, error: 'invalid_bid' })
    const maximum = maximumSafeBid(game, game.activeParticipant!, DRAFT_CATALOG)
    expect(maximum).toBeGreaterThanOrEqual(footballer.price)
    const bid = get(placeBid(game, game.activeParticipant!, footballer.price, DRAFT_CATALOG))
    expect(placeBid(bid, bid.currentBid!.participant, footballer.price + 1, DRAFT_CATALOG)).toMatchObject({ ok: false, error: 'not_your_turn' })
    expect(placeBid(bid, bid.activeParticipant!, footballer.price, DRAFT_CATALOG)).toMatchObject({ ok: false, error: 'invalid_bid' })
    expect(placeBid(game, game.activeParticipant!, maximum + 1, DRAFT_CATALOG)).toMatchObject({ ok: false, error: 'unsafe_bid' })
  })
  it('awards one footballer after every double pass and completes legal exclusive elevens', () => {
    const game = completeByPassing()
    expect(game.phase).toBe('TEAMS_COMPLETED')
    const left = Object.values(game.teams.recruiter_one.lineup).filter(Boolean); const right = Object.values(game.teams.recruiter_two.lineup).filter(Boolean)
    expect(left).toHaveLength(11); expect(right).toHaveLength(11); expect(left.some((id) => right.includes(id))).toBe(false)
    expect(game.record.filter((entry) => entry.type === 'award')).toHaveLength(22)
  })
  it('lets the rival bid after an opening pass and keeps the passer out of that auction', () => {
    const game = biddingGame('pass-then-bid')
    const afterPass = get(passAuction(game, game.activeParticipant!, DRAFT_CATALOG))
    expect(afterPass.phase).toBe('BIDDING')
    const footballer = DRAFT_CATALOG.find((player) => player.id === afterPass.rounds[0].playerId)!
    const awarded = get(placeBid(afterPass, afterPass.activeParticipant!, footballer.price, DRAFT_CATALOG))
    expect(awarded.phase).toBe('ROUND_RESULT')
    expect(awarded.lastAward?.winner).toBe(afterPass.activeParticipant)
  })
  it('integrates completed teams with the existing simulator only through its explicit action', () => {
    let game = completeByPassing('match'); game = get(startDuelMatch(game, DRAFT_CATALOG))
    expect(game.phase).toBe('SIMULATING'); expect(game.matchResult?.blocks).toHaveLength(6)
    game = get(completeDuelMatch(game)); expect(startDuelMatch(game, DRAFT_CATALOG)).toMatchObject({ ok: false, error: 'invalid_transition' })
  })
  it('completes 1,000 seeds without invalid budgets, duplicate footballers or incomplete teams', () => {
    for (let index = 0; index < 1000; index++) {
      const game: RecruiterDuelGame = completeByPassing(`seed-${index}`)
      const all = Object.values(game.teams).flatMap((team) => Object.values(team.lineup).filter(Boolean))
      expect(new Set(all).size).toBe(22)
      for (const team of Object.values(game.teams)) {
        expect(team.spent).toBeGreaterThanOrEqual(0)
        expect(team.spent).toBeLessThanOrEqual(100)
      }
    }
  }, 30_000)
  it('returns a controlled error when a required position is unavailable', () => {
    expect(createRecruiterDuel(DRAFT_CATALOG.filter((player) => player.position !== 'ARQ'), 'missing')).toEqual({ ok: false, error: 'auction_pool_unavailable' })
  })
})
