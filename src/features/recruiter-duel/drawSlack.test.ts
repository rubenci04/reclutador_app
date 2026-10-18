import { describe, expect, it } from 'vitest'
import { DRAFT_CATALOG } from '../draft/catalog'
import { ARGENTINA_PLAYERS } from '../themed-modes/modeCatalog'
import { auctionAvailability, createRecruiterDuel, DRAW_BASE_SHARE } from './auctionEngine'

describe('the draw leaves room to bid', () => {
  it('keeps the base prices of the 22 cards well under the two budgets, with stars still appearing', () => {
    const price = new Map(DRAFT_CATALOG.map((player) => [player.id, player.price]))
    let stars = 0
    for (let index = 0; index < 120; index++) {
      const created = createRecruiterDuel(DRAFT_CATALOG, `slack-${index}`)
      if (!created.ok) throw new Error(created.error)
      const total = created.game.rounds.reduce((sum, round) => sum + price.get(round.playerId)!, 0)
      expect(total).toBeLessThanOrEqual(Math.floor(DRAW_BASE_SHARE[2] * 200))
      if (created.game.drawDiagnostics?.attempts === 1) expect(total).toBeLessThanOrEqual(Math.floor(DRAW_BASE_SHARE[0] * 200))
      stars += created.game.rounds.filter((round) => price.get(round.playerId)! >= 15).length
    }
    expect(stars / 120).toBeGreaterThan(0.8)
  })
  it('lets the first bidder offer well above the base price at the start of the auction', () => {
    const margins: number[] = []
    for (let index = 0; index < 60; index++) {
      const created = createRecruiterDuel(DRAFT_CATALOG, `margin-${index}`)
      if (!created.ok) throw new Error(created.error)
      const game = { ...created.game, phase: 'BIDDING' as const, activeParticipant: 'recruiter_one' as const }
      const availability = auctionAvailability(game, 'recruiter_one', DRAFT_CATALOG)
      margins.push(availability.maximum - availability.minimum)
    }
    margins.sort((a, b) => a - b)
    expect(margins[Math.floor(margins.length / 2)]).toBeGreaterThanOrEqual(35)
    expect(margins[0]).toBeGreaterThanOrEqual(20)
  })
  it('also works for the Argentine collection', () => {
    const created = createRecruiterDuel(ARGENTINA_PLAYERS, 'argentina-slack')
    expect(created.ok).toBe(true)
  })
})
