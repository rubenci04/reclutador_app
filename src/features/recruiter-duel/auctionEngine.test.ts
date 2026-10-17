import { describe, expect, it } from 'vitest'
import { DRAFT_CATALOG } from '../draft/catalog'
import { beginBidding, completeDuelMatch, createRecruiterDuel, maximumSafeBid, nextAuctionRound, passAuction, placeBid, revealCoinToss, revealNextAuctionRound, startCoinToss, startDuelMatch } from './auctionEngine'
import type { AuctionTransition, RecruiterDuelGame } from './auctionTypes'

function gameFor(seed = 'auction-test') {
  const created = createRecruiterDuel(DRAFT_CATALOG, seed)
  if (!created.ok) throw new Error(created.error)
  return created.game
}

function get(result: AuctionTransition) {
  if (!result.ok) throw new Error(result.error)
  return result.game
}

function biddingGame(seed = 'auction-test') {
  let game = gameFor(seed)
  game = get(startCoinToss(game)); game = get(revealCoinToss(game)); game = get(beginBidding(game))
  return game
}

function completeByPassing(seed = 'auction-pass') {
  let game = gameFor(seed)
  game = get(startCoinToss(game)); game = get(revealCoinToss(game))
  while (game.phase !== 'TEAMS_COMPLETED') {
    game = get(beginBidding(game))
    game = get(passAuction(game, game.activeParticipant!, DRAFT_CATALOG))
    game = get(nextAuctionRound(game, DRAFT_CATALOG))
    if (game.phase === 'NEXT_ROUND') game = get(revealNextAuctionRound(game))
  }
  return game
}

describe('recruiter duel auction engine', () => {
  it('draws exactly 22 unique players in the required positional pairs and is reproducible', () => {
    const first = gameFor('same-seed'); const second = gameFor('same-seed')
    expect(first.pairs).toEqual(second.pairs)
    const ids = first.pairs.flatMap((pair) => [pair.primaryId, pair.alternateId])
    expect(ids).toHaveLength(22); expect(new Set(ids).size).toBe(22)
    expect(first.pairs.filter((pair) => pair.position === 'ARQ')).toHaveLength(1)
    expect(first.pairs.filter((pair) => pair.position === 'DEF')).toHaveLength(4)
    expect(first.pairs.filter((pair) => pair.position === 'MED')).toHaveLength(3)
    expect(first.pairs.filter((pair) => pair.position === 'DEL')).toHaveLength(3)
  })
  it('stores one coin toss and alternates opening priority without recalculating it', () => {
    const game = gameFor('coin'); const revealed = get(revealCoinToss(get(startCoinToss(game))) )
    expect(revealed.coinTossWinner).toBe(game.coinTossWinner)
    expect(revealed.record.filter((entry) => entry.type === 'coin_toss')).toHaveLength(1)
    for (let index = 1; index < revealed.openingOrder.length; index++) expect(revealed.openingOrder[index]).not.toBe(revealed.openingOrder[index - 1])
  })
  it('enforces base price, minimum increment, turns and a safe budget reserve', () => {
    const game = biddingGame('bids'); const primary = DRAFT_CATALOG.find((player) => player.id === game.pairs[0].primaryId)!
    expect(placeBid(game, game.activeParticipant!, primary.price - 1, DRAFT_CATALOG)).toMatchObject({ ok: false, error: 'invalid_bid' })
    const maximum = maximumSafeBid(game, game.activeParticipant!, DRAFT_CATALOG)
    expect(maximum).toBeGreaterThanOrEqual(primary.price)
    const bid = get(placeBid(game, game.activeParticipant!, primary.price, DRAFT_CATALOG))
    expect(placeBid(bid, bid.currentBid!.participant, primary.price + 1, DRAFT_CATALOG)).toMatchObject({ ok: false, error: 'not_your_turn' })
    expect(placeBid(bid, bid.activeParticipant!, primary.price, DRAFT_CATALOG)).toMatchObject({ ok: false, error: 'invalid_bid' })
    expect(placeBid(game, game.activeParticipant!, maximum + 1, DRAFT_CATALOG)).toMatchObject({ ok: false, error: 'unsafe_bid' })
  })
  it('awards both players every round, including a double pass, and completes legal exclusive elevens', () => {
    const game = completeByPassing()
    expect(game.phase).toBe('TEAMS_COMPLETED')
    expect(game.teams.recruiter_one.spent).toBeLessThanOrEqual(100)
    expect(game.teams.recruiter_two.spent).toBeLessThanOrEqual(100)
    const left = Object.values(game.teams.recruiter_one.lineup).filter(Boolean)
    const right = Object.values(game.teams.recruiter_two.lineup).filter(Boolean)
    expect(left).toHaveLength(11); expect(right).toHaveLength(11)
    expect(left.some((id) => right.includes(id))).toBe(false)
    expect(game.record.filter((entry) => entry.type === 'award')).toHaveLength(11)
  })
  it('integrates both completed teams with the existing match simulator once', () => {
    let game = completeByPassing('match')
    game = get(startDuelMatch(game, DRAFT_CATALOG))
    expect(game.phase).toBe('SIMULATING'); expect(game.matchResult?.blocks).toHaveLength(6)
    game = get(completeDuelMatch(game)); expect(game.phase).toBe('MATCH_RESULT')
    expect(startDuelMatch(game, DRAFT_CATALOG)).toMatchObject({ ok: false, error: 'invalid_transition' })
  })
  it('completes 1,000 seeded games without incomplete teams, invalid positions, duplicates, or negative budgets', () => {
    for (let index = 0; index < 1000; index++) {
      const game: RecruiterDuelGame = completeByPassing(`seed-${index}`)
      for (const team of Object.values(game.teams)) {
        expect(team.spent).toBeGreaterThanOrEqual(0); expect(team.spent).toBeLessThanOrEqual(100)
        expect(Object.values(team.lineup).filter(Boolean)).toHaveLength(11)
      }
    }
  }, 30_000)
  it('returns a controlled error when an eligible set cannot form pairs', () => {
    expect(createRecruiterDuel(DRAFT_CATALOG.filter((player) => player.position !== 'ARQ'), 'missing')).toEqual({ ok: false, error: 'auction_pool_unavailable' })
  })
})
