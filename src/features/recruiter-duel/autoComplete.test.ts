import { describe, expect, it } from 'vitest'
import { DRAFT_CATALOG } from '../draft/catalog'
import { auctionAvailability, autoCompleteAll, autoCompleteStep, beginBidding, canAutoComplete, createRecruiterDuel, nextAuctionRound, passAuction, placeBid, previewAutoComplete, revealCoinToss, revealDiscardReplacement, revealNextAuctionRound, startCoinToss, startDuelMatch } from './auctionEngine'
import type { AuctionTransition, RecruiterDuelGame, RecruiterId } from './auctionTypes'

const must = (result: AuctionTransition): RecruiterDuelGame => { if (!result.ok) throw new Error(result.error); return result.game }
const complete = (game: RecruiterDuelGame, id: RecruiterId) => Object.values(game.teams[id].lineup).every(Boolean)

/** Plays rounds (the favoured recruiter always bids the base price when legal) until `target` has eleven. */
function playUntilComplete(seed: string, target: RecruiterId) {
  const created = createRecruiterDuel(DRAFT_CATALOG, seed)
  if (!created.ok) throw new Error(created.error)
  let game = must(beginBidding(must(revealCoinToss(must(startCoinToss(created.game, 'heads'))))))
  for (let step = 0; step < 800 && !complete(game, target); step++) {
    if (game.phase === 'DISCARD_RESULT') { game = must(revealDiscardReplacement(game)); continue }
    if (game.phase === 'NEXT_ROUND') { game = must(revealNextAuctionRound(game)); continue }
    if (game.phase === 'REVEAL_PLAYER') { game = must(beginBidding(game)); continue }
    if (game.phase === 'ROUND_RESULT') { game = must(nextAuctionRound(game, DRAFT_CATALOG)); continue }
    const who = game.activeParticipant!
    const a = auctionAvailability(game, who, DRAFT_CATALOG)
    if (who === target && a.bid.enabled) game = must(placeBid(game, who, a.minimum, DRAFT_CATALOG))
    else if (a.pass.enabled) game = must(passAuction(game, who, DRAFT_CATALOG))
    else game = must(placeBid(game, who, a.minimum, DRAFT_CATALOG))
  }
  if (game.phase === 'ROUND_RESULT') game = must(nextAuctionRound(game, DRAFT_CATALOG))
  if (game.phase === 'NEXT_ROUND') game = must(revealNextAuctionRound(game))
  return game
}

/** First seed where `target` finishes while the other team still needs players. */
function early(target: RecruiterId, prefix: string) {
  for (let index = 0; index < 80; index++) {
    const game = playUntilComplete(`${prefix}-${index}`, target)
    if (game.phase === 'REVEAL_PLAYER' && complete(game, target) && !Object.values(game.teams[target === 'recruiter_one' ? 'recruiter_two' : 'recruiter_one'].lineup).every(Boolean)) return game
  }
  throw new Error('no early-completion game found')
}

describe('early completion', () => {
  const other = (id: RecruiterId): RecruiterId => id === 'recruiter_one' ? 'recruiter_two' : 'recruiter_one'
  for (const target of ['recruiter_one', 'recruiter_two'] as const) {
    it(`completes the other team once ${target} has eleven, legally, deterministically and through the ledger`, () => {
      const game = early(target, 'auto-1')
      expect(complete(game, target)).toBe(true)
      expect(game.phase).toBe('REVEAL_PLAYER')
      const taker = other(target)
      expect(canAutoComplete(game, taker)).toBe(true); expect(canAutoComplete(game, target)).toBe(false)
      const first = autoCompleteAll(game, taker, DRAFT_CATALOG); const again = autoCompleteAll(game, taker, DRAFT_CATALOG)
      expect(first).toEqual(again)
      const done = must(first)
      expect(done.phase).toBe('TEAMS_COMPLETED')
      expect(complete(done, taker)).toBe(true)
      // untouched: the completed team, its spending and every earlier ledger entry
      expect(done.teams[target]).toEqual(game.teams[target])
      expect(done.record.slice(0, game.record.length)).toEqual(game.record)
      const added = done.record.slice(game.record.length)
      expect(added.every((entry) => entry.type === 'award' && entry.winner === taker && entry.reason === 'auto_complete')).toBe(true)
      expect(added).toHaveLength(11 - Object.values(game.teams[taker].lineup).filter(Boolean).length)
      // exclusive players, budget respected, the match can be played
      const all = [...Object.values(done.teams.recruiter_one.lineup), ...Object.values(done.teams.recruiter_two.lineup)]
      expect(new Set(all).size).toBe(22); expect(done.teams[taker].spent).toBeLessThanOrEqual(100)
      expect(startDuelMatch(done, DRAFT_CATALOG).ok).toBe(true)
    })
  }
  it('previews exactly what confirming would do', () => {
    const game = early('recruiter_one', 'auto-2')
    const preview = previewAutoComplete(game, 'recruiter_two', DRAFT_CATALOG)
    if (!preview.ok) throw new Error(preview.error)
    const done = must(autoCompleteAll(game, 'recruiter_two', DRAFT_CATALOG))
    expect(preview.totalCost).toBe(done.teams.recruiter_two.spent - game.teams.recruiter_two.spent)
    expect(preview.finalBudget).toBe(100 - done.teams.recruiter_two.spent)
    expect(preview.items.map((item) => item.price).reduce((a, b) => a + b, 0)).toBe(preview.totalCost)
    for (const item of preview.items) expect(item.price).toBe(DRAFT_CATALOG.find((p) => p.id === item.playerId)!.price)
  })
  it('steps one card at a time and keeps shared discards untouched', () => {
    const game = early('recruiter_one', 'auto-3')
    const step = must(autoCompleteStep(game, 'recruiter_two', DRAFT_CATALOG))
    expect(step.roundIndex).toBe(game.roundIndex + 1)
    expect(step.discardsRemaining).toBe(game.discardsRemaining)
    expect(step.discardedPlayerIds).toEqual(game.discardedPlayerIds)
  })
  it('refuses while the rival is incomplete, mid-bid, or after the auctions, and leaves the state alone', () => {
    const created = createRecruiterDuel(DRAFT_CATALOG, 'auto-4')
    if (!created.ok) throw new Error(created.error)
    const start = must(beginBidding(must(revealCoinToss(must(startCoinToss(created.game, 'heads'))))))
    expect(canAutoComplete(start, 'recruiter_one')).toBe(false)
    expect(autoCompleteStep(start, 'recruiter_one', DRAFT_CATALOG)).toEqual({ ok: false, error: 'rival_incomplete' })
    const game = early('recruiter_one', 'auto-4')
    const bidding = must(beginBidding(game))
    const a = auctionAvailability(bidding, bidding.activeParticipant!, DRAFT_CATALOG)
    const withBid = bidding.activeParticipant === 'recruiter_two' && a.bid.enabled ? must(placeBid(bidding, 'recruiter_two', a.minimum, DRAFT_CATALOG)) : null
    if (withBid) expect(canAutoComplete(withBid, 'recruiter_two')).toBe(false)
    const done = must(autoCompleteAll(game, 'recruiter_two', DRAFT_CATALOG))
    expect(autoCompleteStep(done, 'recruiter_two', DRAFT_CATALOG).ok).toBe(false)
  })
  it('works from many seeds without ever producing an invalid result', () => {
    for (let seed = 0; seed < 40; seed++) {
      const target: RecruiterId = seed % 2 ? 'recruiter_one' : 'recruiter_two'
      const game = playUntilComplete(`auto-many-${seed}`, target)
      if (!complete(game, target) || game.phase !== 'REVEAL_PLAYER') continue
      const done = must(autoCompleteAll(game, other(target), DRAFT_CATALOG))
      expect(startDuelMatch(done, DRAFT_CATALOG).ok).toBe(true)
    }
  })
})
