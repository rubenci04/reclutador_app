import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { DRAFT_CATALOG } from '../draft/catalog'
import { DRAFT_SLOTS } from '../draft/draftTypes'
import { TeamProgressBoard } from './TeamProgressBoard'
import { beginBidding, createRecruiterDuel, maximumSafeBid, nextAuctionRound, passAuction, placeBid, positionProgress, revealCoinToss, revealDiscardReplacement, revealNextAuctionRound, startCoinToss } from './auctionEngine'
import { createDrawContext } from './drawHistory'
import { RECRUITERS, type AuctionCreation, type AuctionTransition, type RecruiterDuelGame } from './auctionTypes'

const names = { recruiter_one: 'A', recruiter_two: 'B' }
function get(result: AuctionCreation | AuctionTransition) { if (!result.ok) throw new Error(result.error); return result.game }
function initial() { const game = get(createRecruiterDuel(DRAFT_CATALOG, 'board', createDrawContext(DRAFT_CATALOG))); return get(beginBidding(get(revealCoinToss(get(startCoinToss(game, 'heads')))))) }
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('live authoritative team progress', () => {
  it.each(['es-AR', 'en', 'pt-BR'] as const)('renders 22 slots and updates actual awards in %s', async (language) => {
    const i18n = await createI18n(language)
    let game = initial()
    const element = (current: RecruiterDuelGame) => <I18nextProvider i18n={i18n}><TeamProgressBoard game={current} catalog={DRAFT_CATALOG} names={names} /></I18nextProvider>
    const view = render(element(game))
    expect(screen.getAllByText('0/11')).toHaveLength(2)
    for (const name of ['A', 'B']) expect(within(screen.getByRole('article', { name })).getAllByRole('listitem')).toHaveLength(4)
    const candidate = DRAFT_CATALOG.find((player) => player.id === game.rounds[0].playerId)!
    const participant = game.activeParticipant!
    const maximum = maximumSafeBid(game, participant, DRAFT_CATALOG)
    expect(maximum).toBeGreaterThan(candidate.price)
    game = get(placeBid(game, participant, candidate.price + 1, DRAFT_CATALOG))
    game = get(passAuction(game, game.activeParticipant!, DRAFT_CATALOG))
    view.rerender(element(game))
    const team = within(screen.getByRole('article', { name: names[participant] }))
    expect(team.getByRole('button', { name: new RegExp(candidate.name) })).toBeInTheDocument()
    expect(team.getByText(i18n.t('teamProgress.paid', { amount: candidate.price + 1 }))).toBeInTheDocument()
    expect(team.getByText(i18n.t('duel.balance', { amount: 99 - candidate.price }))).toBeInTheDocument()
    expect(team.getByText('1/11')).toBeInTheDocument()
    expect(team.getByText(i18n.t('teamProgress.rating', { rating: candidate.overall_rating }))).toBeInTheDocument()
    expect(screen.queryByText('teamProgress.empty')).not.toBeInTheDocument()
    while (game.phase !== 'TEAMS_COMPLETED') {
      if (game.phase === 'BIDDING') game = get(passAuction(game, game.activeParticipant!, DRAFT_CATALOG))
      else if (game.phase === 'ROUND_RESULT') game = get(nextAuctionRound(game, DRAFT_CATALOG))
      else if (game.phase === 'DISCARD_RESULT') game = get(revealDiscardReplacement(game))
      else if (game.phase === 'NEXT_ROUND') game = get(revealNextAuctionRound(game))
      else game = get(beginBidding(game))
    }
    view.rerender(element(game))
    expect(screen.getAllByText('11/11')).toHaveLength(2)
    expect(screen.queryByText(i18n.t('teamProgress.empty'))).not.toBeInTheDocument()
    for (const participant of RECRUITERS) {
      const panel = within(screen.getByRole('article', { name: names[participant] }))
      expect(panel.getByText(i18n.t('duel.balance', { amount: 100 - game.teams[participant].spent }))).toBeInTheDocument()
      for (const id of Object.values(game.teams[participant].lineup)) expect(panel.getByRole('button', { name: new RegExp(DRAFT_CATALOG.find((player) => player.id === id)!.name) })).toBeInTheDocument()
    }
  })
  it('collapses on mobile, exposes accessible controls and responds to viewport changes', async () => {
    let matches = true
    let notify = () => {}
    vi.stubGlobal('matchMedia', () => ({ get matches() { return matches }, addEventListener: (_: string, listener: () => void) => { notify = listener }, removeEventListener: vi.fn() }))
    const i18n = await createI18n('en')
    const view = render(<I18nextProvider i18n={i18n}><TeamProgressBoard game={initial()} catalog={DRAFT_CATALOG} names={names} /></I18nextProvider>)
    const toggle = screen.getByRole('button', { name: 'Live teams' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('article', { name: 'A' })).not.toBeInTheDocument()
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('article', { name: 'A' })).toBeVisible()
    expect(screen.queryByRole('article', { name: 'B' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'B' }))
    expect(screen.getByRole('button', { name: 'B' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('article', { name: 'B' })).toBeVisible()
    expect(screen.queryByRole('article', { name: 'A' })).not.toBeInTheDocument()
    fireEvent.click(toggle)
    matches = false
    act(() => notify())
    expect(screen.getByRole('article', { name: 'A' })).toBeVisible()
    view.unmount(); vi.unstubAllGlobals()
  })
  it('keeps all four DEF slots, refuses full positions and legally completes both budgets', () => {
    let game = initial(); let checkedOneDefender = false; let checkedFull = false
    while (game.phase !== 'TEAMS_COMPLETED') {
      const position = game.rounds[game.roundIndex].position
      for (const participant of RECRUITERS) {
        const progress = positionProgress(game.teams[participant], position)
        if (position === 'DEF' && progress.filled === 1) {
          expect(progress.remaining).toBe(3); checkedOneDefender = true
        }
        if (!progress.remaining) {
          expect(maximumSafeBid(game, participant, DRAFT_CATALOG)).toBe(0)
          expect(placeBid({ ...game, activeParticipant: participant }, participant, 100, DRAFT_CATALOG)).toMatchObject({ ok: false, error: 'unsafe_bid' })
          checkedFull = true
        }
      }
      game = get(passAuction(game, game.activeParticipant!, DRAFT_CATALOG))
      game = get(passAuction(game, game.activeParticipant!, DRAFT_CATALOG))
      if (game.phase === 'DISCARD_RESULT') { game = get(beginBidding(get(revealDiscardReplacement(game)))); continue }
      game = get(nextAuctionRound(game, DRAFT_CATALOG))
      if (game.phase === 'NEXT_ROUND') game = get(beginBidding(get(revealNextAuctionRound(game))))
    }
    expect(checkedOneDefender).toBe(true); expect(checkedFull).toBe(true)
    for (const team of Object.values(game.teams)) {
      expect(team.spent).toBeLessThanOrEqual(100)
      expect(DRAFT_SLOTS.every((slot) => !!team.lineup[slot.id])).toBe(true)
    }
  })
})
