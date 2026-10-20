import { expect, it } from 'vitest'
import { DRAFT_SLOTS } from '../draft/draftTypes'
import { catalogForMode } from '../themed-modes/modeCatalog'
import { CLASSIC_CONFIG } from './matchConfig'
import { auctionAvailability, beginBidding, createRecruiterDuel, currentRound, nextAuctionRound, passAuction, placeBid, revealCoinToss, revealDiscardReplacement, revealNextAuctionRound, startCoinToss } from './auctionEngine'
import type { AuctionTransition } from './auctionTypes'

const must = (result: AuctionTransition) => { if (!result.ok) throw new Error(result.error); return result.game }

it('draws only unfilled starter lines before benches, including after the CPU eleven is complete', () => {
  const catalog = catalogForMode('ARGENTINA_CURRENT')
  let lateCards = 0
  for (let seed = 0; seed < 40; seed++) {
    const creation = createRecruiterDuel(catalog, `remaining:${seed}`, undefined, { ...CLASSIC_CONFIG, budget: 300, substitutes: true })
    if (!creation.ok) throw new Error(creation.error)
    let game = must(revealCoinToss(must(startCoinToss(creation.game, 'tails'))))
    const seen = new Set<string>()
    for (let guard = 0; game.phase !== 'TEAMS_COMPLETED' && guard < 250; guard++) {
      if (game.phase === 'REVEAL_PLAYER') {
        const missing = new Set(Object.values(game.teams).flatMap((team) => DRAFT_SLOTS.filter((slot) => !team.lineup[slot.id]).map((slot) => slot.position)))
        if (missing.size) expect(missing.has(currentRound(game).position)).toBe(true)
        if (Object.values(game.teams.recruiter_two.lineup).every(Boolean) && missing.size) lateCards++
        seen.add(currentRound(game).playerId)
        game = must(beginBidding(game))
      } else if (game.phase === 'BIDDING') {
        const available = auctionAvailability(game, game.activeParticipant!, catalog)
        // CPU claims any affordable eligible player; the human passes.
        game = must(game.activeParticipant === 'recruiter_two' && !game.currentBid && available.bid.enabled
          ? placeBid(game, game.activeParticipant!, available.minimum, catalog) : passAuction(game, game.activeParticipant!, catalog))
      } else if (game.phase === 'DISCARD_RESULT') game = must(revealDiscardReplacement(game))
      else if (game.phase === 'ROUND_RESULT') game = must(nextAuctionRound(game, catalog))
      else if (game.phase === 'NEXT_ROUND') game = must(revealNextAuctionRound(game))
      else throw new Error(game.phase)
    }
    expect(game.phase).toBe('TEAMS_COMPLETED')
    const owned = Object.values(game.teams).flatMap((team) => [...Object.values(team.lineup), ...team.bench!.map((p) => p.playerId)])
    expect(owned).toHaveLength(28)
    expect(new Set(owned).size).toBe(28)
    expect(owned.every((id) => id && seen.has(id))).toBe(true)
  }
  expect(lateCards).toBeGreaterThan(0)
})
