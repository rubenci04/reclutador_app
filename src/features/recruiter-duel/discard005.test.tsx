import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { DRAFT_CATALOG } from '../draft/catalog'
import { buildInitialDuel } from '../online/onlineDuel'
import { auctionAvailability, beginBidding, createRecruiterDuel, currentRound, nextAuctionRound, passAuction, placeBid, revealCoinToss, revealDiscardReplacement, revealNextAuctionRound, startCoinToss } from './auctionEngine'
import { AuctionHud } from './AuctionHud'
import { createDrawContext, CURRENT_DRAW_POLICY } from './drawHistory'
import { buildHudModel } from './hudModel'
import { CLASSIC_CONFIG, DISCARDS_MARKER_V2, discardLimitOf, parseMatchConfig, type MatchConfig } from './matchConfig'
import type { AuctionCreation, AuctionTransition, RecruiterDuelGame } from './auctionTypes'

const get = <T extends AuctionCreation | AuctionTransition>(result: T): RecruiterDuelGame => { if (!result.ok) throw new Error(result.error); return result.game }
const five: MatchConfig = { ...CLASSIC_CONFIG, budget: 200, discards: DISCARDS_MARKER_V2 }
const three: MatchConfig = { ...CLASSIC_CONFIG, budget: 200 }
const start = (config: MatchConfig, seed = 'd5') => get(beginBidding(get(revealCoinToss(get(startCoinToss(get(createRecruiterDuel(DRAFT_CATALOG, seed, createDrawContext(DRAFT_CATALOG, [], CURRENT_DRAW_POLICY), config)), 'heads'))))))
const doublePass = (game: RecruiterDuelGame) => { const first = get(passAuction(game, game.activeParticipant!, DRAFT_CATALOG)); return get(passAuction(first, first.activeParticipant!, DRAFT_CATALOG)) }

/** Discards the card on the table until the engine stops offering a replacement; returns the replacement ids. */
function discardAll(game: RecruiterDuelGame) {
  const ids: string[] = []
  let current = game
  for (let step = 0; step < 10; step++) {
    const next = doublePass(current)
    if (next.phase !== 'DISCARD_RESULT') return { game: current, ids, final: next }
    ids.push(currentRound(next).playerId)
    current = get(beginBidding(get(revealDiscardReplacement(next))))
  }
  throw new Error('discards never ended')
}

describe('DISCARD-005 five shared discards', () => {
  it('gives new local and online games five and keeps three for earlier games', () => {
    expect(discardLimitOf(five)).toBe(5)
    expect(start(five).discardsRemaining).toBe(5)
    expect(start(three).discardsRemaining).toBe(3)
    expect(start(CLASSIC_CONFIG).discardsRemaining).toBe(3)
    const room = buildInitialDuel({ host: 'A', guest: 'B' })
    expect(room.discardsRemaining).toBe(5)
    expect(room.config?.discards).toBe(DISCARDS_MARKER_V2)
    expect(parseMatchConfig(five)?.discards).toBe(DISCARDS_MARKER_V2)
    expect(parseMatchConfig(three)?.discards).toBeUndefined()
    expect(parseMatchConfig({ ...five, discards: 'discards-9' })).toBeNull()
  })
  it('replaces five times with unique, reproducible cards that were never drawn, discarded or awarded, then stops without wasting a discard', () => {
    const first = discardAll(start(five))
    expect(first.ids).toHaveLength(5)
    expect(new Set(first.ids).size).toBe(5)
    const game = start(five)
    const drawn = new Set(game.rounds.map((round) => round.playerId))
    for (const id of first.ids) expect(drawn.has(id) && id !== currentRound(game).playerId).toBe(false)
    expect(first.game.discardsRemaining).toBe(0)
    expect(first.game.discardedPlayerIds).toHaveLength(5)
    // Position and quotas are those of the card that was replaced.
    for (const id of first.ids) expect(DRAFT_CATALOG.find((p) => p.id === id)!.position).toBe(currentRound(game).position)
    // The sixth double pass is the existing mandatory assignment, not a discard.
    expect(first.final.phase).not.toBe('DISCARD_RESULT')
    expect(first.final.discardsRemaining).toBe(0)
    expect(discardAll(start(five)).ids).toEqual(first.ids)
    expect(discardAll(start(five, 'd5-other')).ids).not.toEqual(first.ids)
    // Earlier games exhaust after three, with their original random stream.
    expect(discardAll(start(three)).ids).toHaveLength(3)
  })
  it('keeps the auction finishable with every discard spent', () => {
    let game = discardAll(start(five)).game
    for (let step = 0; step < 1200 && game.phase !== 'TEAMS_COMPLETED'; step++) {
      if (game.phase === 'DISCARD_RESULT') { game = get(revealDiscardReplacement(game)); continue }
      if (game.phase === 'NEXT_ROUND') { game = get(revealNextAuctionRound(game)); continue }
      if (game.phase === 'REVEAL_PLAYER') { game = get(beginBidding(game)); continue }
      if (game.phase === 'ROUND_RESULT') { game = get(nextAuctionRound(game, DRAFT_CATALOG)); continue }
      const who = game.activeParticipant!
      const a = auctionAvailability(game, who, DRAFT_CATALOG)
      game = a.pass.enabled && !(who === 'recruiter_one' && a.bid.enabled) ? get(passAuction(game, who, DRAFT_CATALOG)) : get(placeBid(game, who, a.minimum, DRAFT_CATALOG))
    }
    expect(game.phase).toBe('TEAMS_COMPLETED')
    expect(game.teams.recruiter_one.spent).toBeLessThanOrEqual(200)
  })
  it('shows the right total in the scoreboard, with five dots for the new rule and three for the old one', async () => {
    const i18n = await createI18n('en')
    for (const [config, total] of [[five, 5], [three, 3]] as const) {
      const game = doublePass(start(config))
      const hud = buildHudModel(game, DRAFT_CATALOG)
      expect(hud).toMatchObject({ discardsRemaining: total - 1, discardsTotal: total })
      const { container, unmount } = render(<I18nextProvider i18n={i18n}><AuctionHud hud={hud} names={{ recruiter_one: 'A', recruiter_two: 'B' }} /></I18nextProvider>)
      expect(container.querySelectorAll('.hud-discards i')).toHaveLength(total)
      expect(container.querySelectorAll('.hud-discards i.on')).toHaveLength(total - 1)
      expect(container.querySelector('.hud-discards')).toHaveTextContent(`Discards ${total - 1}/${total}`)
      unmount()
    }
  })
})
