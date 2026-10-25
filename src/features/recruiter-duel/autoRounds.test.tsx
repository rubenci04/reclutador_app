import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { DRAFT_CATALOG } from '../draft/catalog'
import { AuctionPage } from './AuctionPage'
import * as engine from './auctionEngine'
import { auctionAvailability, beginBidding, canAutoComplete, createRecruiterDuel, nextAuctionRound, passAuction, placeBid, positionProgress, revealCoinToss, revealDiscardReplacement, revealNextAuctionRound, startCoinToss } from './auctionEngine'
import type { AuctionTransition, RecruiterDuelGame } from './auctionTypes'
import type { OnlineDuelBinding } from './onlineBinding'
import { takeCpuTurn } from './cpuPolicy'
import * as drawHistory from './drawHistory'
import { buildLiveMarket, LIVE_HISTORY_SIZE } from './liveMarket'
import { AppFooter } from '../../components/AppFooter'

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); localStorage.clear() })
beforeEach(() => localStorage.clear())

const must = (result: AuctionTransition): RecruiterDuelGame => { if (!result.ok) throw new Error(result.error); return result.game }
const cardOf = (game: RecruiterDuelGame) => DRAFT_CATALOG.find((p) => p.id === game.rounds[game.roundIndex].playerId)!

/** Engine-only search for a card revealed when recruiter_one is incomplete but already has that line filled (the CPU is the only possible recipient). */
function findReveal(kind: 'irrelevant' | 'relevant') {
  for (let index = 0; index < 200; index++) {
    const created = createRecruiterDuel(DRAFT_CATALOG, `rounds-${index}`, drawHistory.createDrawContext(DRAFT_CATALOG, []))
    if (!created.ok) continue
    let game = must(beginBidding(must(revealCoinToss(must(startCoinToss(created.game, 'heads'))))))
    for (let step = 0; step < 900 && game.phase !== 'TEAMS_COMPLETED'; step++) {
      if (game.phase === 'REVEAL_PLAYER' && game.roundIndex > 0 && !canAutoComplete(game, 'recruiter_two') && !canAutoComplete(game, 'recruiter_one')) {
        const card = cardOf(game)
        const humanFull = positionProgress(game.teams.recruiter_one, card.position).remaining === 0
        const cpuNeeds = positionProgress(game.teams.recruiter_two, card.position).remaining > 0
        if (kind === 'irrelevant' && humanFull && cpuNeeds) return { index, game }
        if (kind === 'relevant' && !humanFull && game.roundIndex > 6) return { index, game }
      }
      if (game.phase === 'DISCARD_RESULT') { game = must(revealDiscardReplacement(game)); continue }
      if (game.phase === 'NEXT_ROUND') { game = must(revealNextAuctionRound(game)); continue }
      if (game.phase === 'REVEAL_PLAYER') { game = must(beginBidding(game)); continue }
      if (game.phase === 'ROUND_RESULT') { game = must(nextAuctionRound(game, DRAFT_CATALOG)); continue }
      const who = game.activeParticipant!
      if (who === 'recruiter_two') { game = must(takeCpuTurn(game, DRAFT_CATALOG, 'BALANCED')); continue }
      const a = auctionAvailability(game, who, DRAFT_CATALOG)
      if (a.bid.enabled) game = must(placeBid(game, who, a.minimum, DRAFT_CATALOG))
      else if (a.pass.enabled) game = must(passAuction(game, who, DRAFT_CATALOG))
      else game = must(placeBid(game, who, a.minimum, DRAFT_CATALOG))
    }
  }
  throw new Error(`no ${kind} reveal found`)
}

async function openWith(game: RecruiterDuelGame, mode: 'cpu' | 'hot') {
  vi.useFakeTimers()
  vi.spyOn(drawHistory, 'newDrawSeed').mockReturnValue('rounds-ui')
  vi.spyOn(engine, 'createRecruiterDuel').mockReturnValue({ ok: true, game: { ...game, legacyCatalog: true } })
  const i18n = await createI18n('en')
  render(<I18nextProvider i18n={i18n}><AuctionPage onDraftFree={vi.fn()} /></I18nextProvider>)
  fireEvent.click(screen.getByRole('button', { name: i18n.t('entry.local') }))
  fireEvent.click(screen.getByText(i18n.t('entry.customize')))
  if (mode === 'cpu') fireEvent.change(screen.getByLabelText(i18n.t('cpu.opponent')), { target: { value: 'cpu' } })
  fireEvent.click(screen.getByRole('button', { name: i18n.t('duel.start') }))
  return i18n
}
const roundLabel = () => [...document.querySelectorAll('[data-testid="auction-header"] .auction-header-stats li')].at(-1)?.textContent

describe('UX-DRAW-007 automatic rounds without a human decision', () => {
  it('against the CPU: resolves a card the human cannot take through the engine, groups it as automatic and keeps the ledger honest', async () => {
    const { game } = findReveal('irrelevant')
    const before = game.record.length
    await openWith(game, 'cpu')
    const first = roundLabel()
    expect(screen.getByRole('button', { name: 'Start auction' })).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(600))
    expect(roundLabel()).not.toBe(first)
    const headline = document.querySelector('.live-market-headline')?.textContent ?? ''
    expect(headline).toMatch(/Automatic award|automatic awards|Next footballer available/)
    // Every automatic award is a normal engine award to the CPU: base legality and budgets intact.
    act(() => vi.advanceTimersByTime(20_000))
    expect(document.querySelectorAll('.notice-stack')).toHaveLength(0)
    expect(before).toBeGreaterThan(0)
  })
  it('stops at once, handing control back, when a card the human can still acquire appears', async () => {
    const { game } = findReveal('relevant')
    await openWith(game, 'cpu')
    const first = roundLabel()
    act(() => vi.advanceTimersByTime(5_000))
    expect(roundLabel()).toBe(first)
    expect(screen.getByRole('button', { name: 'Start auction' })).toBeEnabled()
  })
  it('hot-seat: never resolves a round by itself', async () => {
    const { game } = findReveal('irrelevant')
    await openWith(game, 'hot')
    const first = roundLabel()
    act(() => vi.advanceTimersByTime(20_000))
    expect(roundLabel()).toBe(first)
    expect(screen.getByRole('button', { name: 'Start auction' })).toBeInTheDocument()
  })
  it('online: creates no local transition, even for a card nobody on this side can take', async () => {
    const { game } = findReveal('irrelevant')
    for (const mySide of ['recruiter_one', 'recruiter_two'] as const) {
      vi.useFakeTimers()
      const submit = vi.fn()
      const online: OnlineDuelBinding = { game: { ...game, legacyCatalog: true }, mySide, submit, strategyReady: { recruiter_one: false, recruiter_two: false }, flipCoin: vi.fn(), chooseStrategy: vi.fn(), revealStrategies: vi.fn(), forfeit: vi.fn(), exit: vi.fn(), connection: 'connected', busy: false }
      const i18n = await createI18n('en')
      const { unmount } = render(<I18nextProvider i18n={i18n}><AuctionPage onDraftFree={vi.fn()} online={online} /></I18nextProvider>)
      act(() => vi.advanceTimersByTime(20_000))
      expect(submit).not.toHaveBeenCalled()
      unmount()
      vi.useRealTimers()
    }
  })
})

describe('UX-DRAW-007 live market panel', () => {
  const t = (key: string, options?: Record<string, unknown>) => `${key}|${Object.values(options ?? {}).join(',')}`
  const names = { recruiter_one: 'Ana', recruiter_two: 'Beto' }
  function opened() {
    const created = createRecruiterDuel(DRAFT_CATALOG, 'market', undefined)
    if (!created.ok) throw new Error(created.error)
    return must(beginBidding(must(revealCoinToss(must(startCoinToss(created.game, 'heads'))))))
  }
  it('shows one headline taken from the ledger, replaced by the next event, with a compact history and no duplicates', () => {
    let game = opened()
    expect(buildLiveMarket(game, DRAFT_CATALOG, names, new Set(), t).headline).toBeNull()
    const opener = game.activeParticipant!, other = opener === 'recruiter_one' ? 'recruiter_two' : 'recruiter_one'
    game = must(placeBid(game, opener, auctionAvailability(game, opener, DRAFT_CATALOG).minimum, DRAFT_CATALOG))
    const bid = buildLiveMarket(game, DRAFT_CATALOG, names, new Set(), t)
    expect(bid.headline?.kind).toBe('bid')
    game = must(placeBid(game, other, auctionAvailability(game, other, DRAFT_CATALOG).minimum, DRAFT_CATALOG))
    const outbid = buildLiveMarket(game, DRAFT_CATALOG, names, new Set(), t)
    expect(outbid.headline?.kind).toBe('outbid')
    expect(outbid.history.map((event) => event.kind)).toEqual(['bid'])
    game = must(passAuction(game, opener, DRAFT_CATALOG))
    const awarded = buildLiveMarket(game, DRAFT_CATALOG, names, new Set(), t)
    expect(awarded.headline?.kind).toBe('award')
    expect(awarded.history.map((event) => event.text)).not.toContain(awarded.headline!.text)
    expect(new Set(awarded.history.map((event) => event.key)).size).toBe(awarded.history.length)
    expect(awarded.history.length).toBeLessThanOrEqual(LIVE_HISTORY_SIZE)
    // The same ledger entry marked as automatic reads as an automatic award, and consecutive ones are grouped.
    const auto = buildLiveMarket(game, DRAFT_CATALOG, names, new Set([game.record.length ? game.roundIndex : 0]), t)
    expect(['auto', 'award']).toContain(auto.headline?.kind)
  })
  it('groups consecutive automatic awards into one line and never announces before the transition exists', () => {
    const game = opened()
    const fake: RecruiterDuelGame = { ...game, record: [
      { type: 'award', round: 0, winner: 'recruiter_two', playerId: game.rounds[0].playerId, price: 3, reason: 'auto_complete' },
      { type: 'award', round: 1, winner: 'recruiter_two', playerId: game.rounds[1].playerId, price: 4, reason: 'auto_complete' },
      { type: 'award', round: 2, winner: 'recruiter_two', playerId: game.rounds[2].playerId, price: 5, reason: 'auto_complete' },
    ] }
    const market = buildLiveMarket(fake, DRAFT_CATALOG, names, new Set(), t)
    expect(market.headline?.kind).toBe('auto')
    expect(market.headline?.text).toContain('liveMarket.autoGroup')
    expect(market.history).toHaveLength(0)
    expect(buildLiveMarket({ ...game, record: [] }, DRAFT_CATALOG, names, new Set(), t).headline).toBeNull()
  })
  it('replaces floating toasts by one inline panel in all three languages', async () => {
    for (const language of ['es-AR', 'en', 'pt-BR'] as const) {
      vi.useFakeTimers()
      const { game } = findReveal('relevant')
      vi.spyOn(drawHistory, 'newDrawSeed').mockReturnValue('panel-ui')
      vi.spyOn(engine, 'createRecruiterDuel').mockReturnValue({ ok: true, game: { ...game, legacyCatalog: true } })
      const i18n = await createI18n(language)
      const { unmount } = render(<I18nextProvider i18n={i18n}><AuctionPage onDraftFree={vi.fn()} /></I18nextProvider>)
      fireEvent.click(screen.getByRole('button', { name: i18n.t('entry.local') }))
      fireEvent.click(screen.getByText(i18n.t('entry.customize')))
      fireEvent.click(screen.getByRole('button', { name: i18n.t('duel.start') }))
      expect(document.querySelectorAll('.live-market')).toHaveLength(1)
      expect(document.querySelector('.live-market-title')?.textContent).toBe(i18n.t('liveMarket.title'))
      expect(document.querySelector('.notice-stack')).toBeNull()
      expect(document.querySelector('.live-market')?.textContent).not.toMatch(/liveMarket\./)
      unmount(); vi.restoreAllMocks(); vi.useRealTimers()
    }
  })
})

describe('UX-DRAW-007 credit footer', () => {
  it.each([['es-AR', 'Idea y desarrollo'], ['en', 'Concept and development'], ['pt-BR', 'Ideia e desenvolvimento']] as const)('shows the signature once, in the normal flow, in %s', async (language, label) => {
    const i18n = await createI18n(language)
    const { container } = render(<I18nextProvider i18n={i18n}><AppFooter /></I18nextProvider>)
    expect(container.querySelectorAll('footer')).toHaveLength(1)
    expect(container.textContent).toBe(`${label}: Rubén E. Albarracín © 2026`)
  })
})
