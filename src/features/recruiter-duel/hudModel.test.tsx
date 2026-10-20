import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { DRAFT_CATALOG } from '../draft/catalog'
import { AuctionHud } from './AuctionHud'
import { beginBidding, createRecruiterDuel, currentRound, maximumSafeBid, nextAuctionRound, passAuction, placeBid, revealCoinToss, revealDiscardReplacement, revealNextAuctionRound, startCoinToss } from './auctionEngine'
import type { AuctionTransition, RecruiterDuelGame } from './auctionTypes'
import { buildHudModel } from './hudModel'

const must = (result: AuctionTransition) => { if (!result.ok) throw new Error(result.error); return result.game }
function atBidding(seed: string) {
  const created = createRecruiterDuel(DRAFT_CATALOG, seed)
  if (!created.ok) throw new Error(created.error)
  return must(beginBidding(must(revealCoinToss(must(startCoinToss(created.game, 'heads'))))))
}
/** Opener bids the base price, the other passes: one voluntary award. */
function awardOne(game: RecruiterDuelGame) {
  const opener = game.activeParticipant!; const rival = opener === 'recruiter_one' ? 'recruiter_two' : 'recruiter_one'
  const bid = must(placeBid(game, opener, currentRound(game) ? DRAFT_CATALOG.find((p) => p.id === currentRound(game).playerId)!.price : 0, DRAFT_CATALOG))
  const awarded = must(passAuction(bid, rival, DRAFT_CATALOG))
  const next = must(nextAuctionRound(awarded, DRAFT_CATALOG))
  return next.phase === 'NEXT_ROUND' ? must(revealNextAuctionRound(next)) : next
}
const bidding = (game: RecruiterDuelGame) => must(beginBidding(game))

describe('buildHudModel', () => {
  it('starts from the stored state: 100M each, nothing signed, three discards, no awards', () => {
    const hud = buildHudModel(atBidding('hud-start'), DRAFT_CATALOG)
    expect(hud).toMatchObject({ budget: 100, awards: 0, totalAwards: 22, discardsRemaining: 3, discardsTotal: 3, teamSize: 11 })
    for (const side of Object.values(hud.participants)) {
      expect(side).toMatchObject({ spent: 0, remaining: 100, signed: 0 })
      expect(side.positions.map((p) => `${p.position}:${p.filled}/${p.capacity}`)).toEqual(['ARQ:0/1', 'DEF:0/4', 'MED:0/3', 'DEL:0/3'])
    }
  })

  it('follows every award: spent, remaining, signings, positions and award count stay in sync with the game', () => {
    let game = atBidding('hud-sync')
    for (let round = 1; round <= 5; round++) {
      game = awardOne(game); if (game.phase !== 'REVEAL_PLAYER') break
      const hud = buildHudModel(game, DRAFT_CATALOG)
      expect(hud.awards).toBe(round)
      for (const id of ['recruiter_one', 'recruiter_two'] as const) {
        const paid = game.record.filter((e) => e.type === 'award' && e.winner === id).reduce((total, e) => total + (e.type === 'award' ? e.price : 0), 0)
        const side = hud.participants[id]
        expect(side.spent).toBe(paid); expect(side.remaining).toBe(100 - paid)
        expect(side.signed).toBe(Object.values(game.teams[id].lineup).filter(Boolean).length)
        expect(side.positions.reduce((total, p) => total + p.filled, 0)).toBe(side.signed)
      }
      game = bidding(game)
    }
  })

  it('exposes the engine ceiling, not a rederived one, and separates it from the total remaining budget', () => {
    const game = atBidding('hud-ceiling')
    const hud = buildHudModel(game, DRAFT_CATALOG)
    for (const id of ['recruiter_one', 'recruiter_two'] as const) {
      const engineCeiling = maximumSafeBid(game, id, DRAFT_CATALOG)
      expect(hud.participants[id].bidCeiling).toBe(engineCeiling)
      expect(hud.participants[id].reserved).toBe(100 - engineCeiling)
      expect(hud.participants[id].bidCeiling).toBeLessThan(hud.participants[id].remaining)
    }
    expect(hud.turn).toBe(game.activeParticipant)
    // Outside bidding there is no card to bid on, so no ceiling is claimed.
    const idle = buildHudModel({ ...game, phase: 'ROUND_RESULT' }, DRAFT_CATALOG)
    expect(idle.participants.recruiter_one.bidCeiling).toBeNull(); expect(idle.participants.recruiter_one.reserved).toBeNull()
  })

  it('marks a line as forced only when the rival has completed it, and tracks shared discards', () => {
    const game = atBidding('hud-forced')
    expect(buildHudModel(game, DRAFT_CATALOG).participants.recruiter_one.positions.some((p) => p.forced)).toBe(false)
    const full = { ...game.teams.recruiter_two, lineup: { ...game.teams.recruiter_two.lineup, GK: 'plr_001' } }
    const forced = buildHudModel({ ...game, teams: { ...game.teams, recruiter_two: full } }, DRAFT_CATALOG)
    expect(forced.participants.recruiter_one.positions.find((p) => p.position === 'ARQ')?.forced).toBe(true)
    expect(forced.participants.recruiter_two.positions.find((p) => p.position === 'ARQ')?.forced).toBe(false)
    // A shared discard from a real double pass reduces the counter and consumes no award.
    const first = game.activeParticipant!; const second = first === 'recruiter_one' ? 'recruiter_two' : 'recruiter_one'
    const afterFirstPass = must(passAuction(game, first, DRAFT_CATALOG))
    const discard = must(passAuction(afterFirstPass, second, DRAFT_CATALOG))
    const revealed = discard.phase === 'DISCARD_RESULT' ? must(revealDiscardReplacement(discard)) : discard
    const hud = buildHudModel(revealed, DRAFT_CATALOG)
    expect(hud.discardsRemaining).toBe(revealed.discardsRemaining)
    expect(hud.discardsRemaining).toBe(2); expect(hud.awards).toBe(0)
  })

  it('is deterministic for the same game', () => {
    const game = atBidding('hud-repro')
    expect(buildHudModel(game, DRAFT_CATALOG)).toEqual(buildHudModel(game, DRAFT_CATALOG))
  })
})

describe('AuctionHud', () => {
  it('renders both recruiters, the turn, budgets, line quotas, discards and the safe ceiling accessibly', async () => {
    const i18n = await createI18n('en')
    const game = atBidding('hud-view')
    const hud = buildHudModel(game, DRAFT_CATALOG)
    render(<I18nextProvider i18n={i18n}><AuctionHud hud={hud} names={{ recruiter_one: 'Ana', recruiter_two: 'Beto' }} onShowPitches={() => undefined} /></I18nextProvider>)
    const region = screen.getByRole('region', { name: 'Duel scoreboard' })
    expect(within(region).getByText('Awards 0/22')).toBeInTheDocument()
    expect(within(region).getByText('Discards 3/3')).toBeInTheDocument()
    expect(within(region).getAllByText('100M left')).toHaveLength(2)
    expect(within(region).getAllByText('Signings 0/11')).toHaveLength(2)
    expect(within(region).getByRole('img', { name: 'Ana budget: 100M left of 100M' })).toBeInTheDocument()
    expect(within(region).getAllByLabelText('Goalkeeper: 0 of 1')).toHaveLength(2)
    expect(within(region).getByRole('article', { name: game.activeParticipant === 'recruiter_one' ? 'Ana' : 'Beto' })).toHaveAttribute('aria-current', 'true')
    expect(within(region).queryByText(/Max safe bid \d+M/)).toBeNull()
    expect(region.querySelectorAll('.hud-details')).toHaveLength(2)
    expect(within(region).getByRole('button', { name: 'Show pitches' })).toBeInTheDocument()
  })
})
