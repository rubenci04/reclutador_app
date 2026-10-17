import { describe, expect, it } from 'vitest'
import { DRAFT_CATALOG } from '../draft/catalog'
import { auctionAvailability, beginBidding, createRecruiterDuel, nextAuctionRound, passAuction, placeBid, positionProgress, revealCoinToss, revealDiscardReplacement, revealNextAuctionRound, startCoinToss } from './auctionEngine'
import { RECRUITERS, type AuctionCreation, type AuctionTransition } from './auctionTypes'

function get(result: AuctionCreation | AuctionTransition) { if (!result.ok) throw new Error(result.error); return result.game }
function initial() { return get(beginBidding(get(revealCoinToss(get(startCoinToss(get(createRecruiterDuel(DRAFT_CATALOG, 'bids')), 'heads')))))) }

describe('central auction action diagnosis', () => {
  it('distinguishes turn, pending phase, CPU, invalid amount, balance and future reserve', () => {
    const game = initial(); const participant = game.activeParticipant!
    const other = RECRUITERS.find((id) => id !== participant)!
    const base = auctionAvailability(game, participant, DRAFT_CATALOG)
    expect(base.bid.enabled).toBe(true)
    expect(auctionAvailability(game, other, DRAFT_CATALOG).bid.reason).toBe('NOT_YOUR_TURN')
    expect(auctionAvailability({ ...game, phase: 'ROUND_RESULT' }, participant, DRAFT_CATALOG).pass.reason).toBe('ACTION_PENDING')
    expect(auctionAvailability(game, participant, DRAFT_CATALOG, undefined, true).bid.reason).toBe('CPU_THINKING')
    for (const amount of [NaN, base.minimum - 1, base.minimum + .5]) expect(auctionAvailability(game, participant, DRAFT_CATALOG, amount).bid.reason).toBe('INVALID_OFFER')
    expect(auctionAvailability(game, participant, DRAFT_CATALOG, 101).bid.reason).toBe('INSUFFICIENT_BUDGET')
    expect(base.maximum).toBeLessThan(100)
    expect(auctionAvailability(game, participant, DRAFT_CATALOG, base.maximum + 1).bid.reason).toBe('FUTURE_BUDGET_RESERVED')
    expect(placeBid(game, participant, base.maximum + 1, DRAFT_CATALOG)).toMatchObject({ ok: false, error: 'unsafe_bid' })
    const bankrupt = { ...game, teams: { ...game.teams, [participant]: { ...game.teams[participant], spent: 100 } } }
    expect(auctionAvailability(bankrupt, participant, DRAFT_CATALOG).bid.reason).toBe('INSUFFICIENT_BUDGET')
  })
  it('predicts the exact outcome before a second pass and preserves legal completion', () => {
    let game = initial(); let full = 0; let forced = 0
    while (game.phase !== 'TEAMS_COMPLETED') {
      for (const participant of RECRUITERS) {
        if (positionProgress(game.teams[participant], game.rounds[game.roundIndex].position).remaining === 0) {
          const diagnostic = auctionAvailability({ ...game, activeParticipant: participant }, participant, DRAFT_CATALOG)
          expect(diagnostic.bid.reason).toBe('POSITION_FULL'); expect(diagnostic.pass.enabled).toBe(true); full++
        }
      }
      const first = auctionAvailability(game, game.activeParticipant!, DRAFT_CATALOG)
      expect(first.passAward).toBeNull(); expect(first.fallback).not.toBeNull()
      game = get(passAuction(game, game.activeParticipant!, DRAFT_CATALOG))
      const second = auctionAvailability(game, game.activeParticipant!, DRAFT_CATALOG)
      if (second.replacement) {
        expect(second.passAward).toBeNull()
        game = get(passAuction(game, game.activeParticipant!, DRAFT_CATALOG))
        expect(game.phase).toBe('DISCARD_RESULT')
        game = get(beginBidding(get(revealDiscardReplacement(game))))
        continue
      }
      expect(second.passAward).not.toBeNull()
      expect(second.assignmentCode).toBe('MANDATORY_ASSIGNMENT')
      if (second.passAward!.reason === 'forced_viability') forced++
      game = get(passAuction(game, game.activeParticipant!, DRAFT_CATALOG))
      expect(game.lastAward).toEqual(second.passAward)
      expect(passAuction(game, 'recruiter_one', DRAFT_CATALOG)).toMatchObject({ ok: false, error: 'invalid_transition' })
      game = get(nextAuctionRound(game, DRAFT_CATALOG))
      if (game.phase === 'NEXT_ROUND') game = get(beginBidding(get(revealNextAuctionRound(game))))
    }
    expect(full).toBeGreaterThan(0); expect(forced).toBeGreaterThan(0)
    expect(game.record.filter((entry) => entry.type === 'award')).toHaveLength(22)
  })
  it('explains that passing accepts the existing voluntary bid', () => {
    let game = initial()
    const bidder = game.activeParticipant!
    const minimum = auctionAvailability(game, bidder, DRAFT_CATALOG).minimum
    game = get(placeBid(game, bidder, minimum, DRAFT_CATALOG))
    const predicted = auctionAvailability(game, game.activeParticipant!, DRAFT_CATALOG).passAward
    expect(predicted).toMatchObject({ winner: bidder, price: minimum, reason: 'voluntary_bid' })
    expect(get(passAuction(game, game.activeParticipant!, DRAFT_CATALOG)).lastAward).toEqual(predicted)
  })
})
