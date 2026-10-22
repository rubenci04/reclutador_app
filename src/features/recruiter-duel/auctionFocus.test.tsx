import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { DRAFT_CATALOG } from '../draft/catalog'
import { AuctionPage } from './AuctionPage'
import { auctionAvailability, autoCompleteAll, autoCompleteStep, beginBidding, budgetOf, canAutoComplete, createRecruiterDuel, nextAuctionRound, passAuction, placeBid, revealCoinToss, revealDiscardReplacement, revealNextAuctionRound, startCoinToss } from './auctionEngine'
import type { AuctionTransition, RecruiterDuelGame } from './auctionTypes'
import type { OnlineDuelBinding } from './onlineBinding'
import { takeCpuTurn } from './cpuPolicy'
import * as drawHistory from './drawHistory'

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); localStorage.clear() })
beforeEach(() => localStorage.clear())

const must = (result: AuctionTransition): RecruiterDuelGame => { if (!result.ok) throw new Error(result.error); return result.game }
const button = (name: string | RegExp) => screen.queryByRole('button', { name }) as HTMLButtonElement | null

/** First point of an engine-only auction where recruiter_one already has eleven and recruiter_two does not (same policy as fullFlow.test). */
function earlyCompletion(secondIsCpu: boolean) {
  for (let index = 0; index < 120; index++) {
    const seed = `focus-${secondIsCpu ? 'cpu' : 'hot'}-${index}`
    const created = createRecruiterDuel(DRAFT_CATALOG, seed, drawHistory.createDrawContext(DRAFT_CATALOG, []))
    if (!created.ok) continue
    let game = must(beginBidding(must(revealCoinToss(must(startCoinToss(created.game, 'heads'))))))
    for (let step = 0; step < 800 && game.phase !== 'TEAMS_COMPLETED'; step++) {
      if (canAutoComplete(game, 'recruiter_two')) return { seed, game }
      if (game.phase === 'DISCARD_RESULT') { game = must(revealDiscardReplacement(game)); continue }
      if (game.phase === 'NEXT_ROUND') { game = must(revealNextAuctionRound(game)); continue }
      if (game.phase === 'REVEAL_PLAYER') { game = must(beginBidding(game)); continue }
      if (game.phase === 'ROUND_RESULT') { game = must(nextAuctionRound(game, DRAFT_CATALOG)); continue }
      const who = game.activeParticipant!
      if (secondIsCpu && who === 'recruiter_two') { game = must(takeCpuTurn(game, DRAFT_CATALOG, 'BALANCED')); continue }
      const a = auctionAvailability(game, who, DRAFT_CATALOG)
      if (who === 'recruiter_one' && a.bid.enabled) game = must(placeBid(game, who, a.minimum, DRAFT_CATALOG))
      else if (a.pass.enabled) game = must(passAuction(game, who, DRAFT_CATALOG))
      else game = must(placeBid(game, who, a.minimum, DRAFT_CATALOG))
    }
  }
  throw new Error('no early completion found')
}

async function openLocal(mode: 'cpu' | 'hot', seed: string, language: 'es-AR' | 'en' | 'pt-BR' = 'en', teamName?: string) {
  vi.useFakeTimers()
  vi.spyOn(drawHistory, 'newDrawSeed').mockReturnValue(seed)
  const i18n = await createI18n(language)
  render(<I18nextProvider i18n={i18n}><AuctionPage onDraftFree={vi.fn()} teamName={teamName} /></I18nextProvider>)
  fireEvent.click(screen.getByRole('button', { name: i18n.t('entry.local') }))
  fireEvent.click(screen.getByText(i18n.t('entry.customize')))
  if (mode === 'cpu') fireEvent.change(screen.getByLabelText(i18n.t('cpu.opponent')), { target: { value: 'cpu' } })
  fireEvent.click(screen.getByRole('button', { name: i18n.t('duel.start') }))
  fireEvent.click(screen.getByRole('button', { name: i18n.t('duel.heads') }))
  act(() => vi.advanceTimersByTime(2000))
  fireEvent.click(screen.getByRole('button', { name: i18n.t('duel.beginBidding') }))
  return i18n
}

describe('UX-AUCTION-006 footballer and offer stay together', () => {
  it.each(['es-AR', 'en', 'pt-BR'] as const)('keeps the footballer, the four amounts and both actions in one panel in %s', async (language) => {
    const i18n = await openLocal('hot', 'focus-panel', language, 'Los Pibes de Barrio')
    const panel = document.querySelector('.bid-panel') as HTMLElement
    // UX-AUCTION-007: ONE card of the footballer (no second bar), with the key facts visible and the rest under «full card».
    const card = document.querySelector('.auction-candidate') as HTMLElement
    expect(document.querySelectorAll('.single-player-card')).toHaveLength(1)
    expect(document.querySelector('.auction-player-bar')).toBeNull()
    expect(card.querySelector('h2')!.textContent!.length).toBeGreaterThan(2)
    expect(card.querySelector('.player-avatar b')?.textContent).toMatch(/^\d+$/)
    expect(card.querySelector('.pos-pill')).not.toBeNull()
    expect(card.querySelector('.base-price-chip')?.textContent).toMatch(/\d/)
    expect(card.querySelector('.player-club')?.textContent?.length).toBeGreaterThan(3)
    // RANK-REVEAL-009: the position is a reward after the signing, never shown while the footballer is on sale.
    expect(document.querySelector('.rank-chip')).toBeNull()
    expect(card.querySelector('.player-full-card')).not.toBeNull()
    // The balance and the maximum bid are not repeated: balance only in the header, maximum only as the offer action.
    expect(panel.querySelectorAll('.bid-figures dt')).toHaveLength(2)
    expect([...panel.querySelectorAll('.bid-figures dt')].map((el) => el.textContent)).toEqual([i18n.t('auctionFocus.current'), i18n.t('auctionFocus.minimum')])
    expect(document.querySelectorAll('[data-testid="auction-header"]')).toHaveLength(1)
    expect(document.querySelector('[data-testid="wallet"]')).toBeNull()
    expect(document.querySelector('.wallet-chip')).toBeNull()
    const bid = within(panel, i18n.t('duel.bid')), pass = within(panel, i18n.t('duel.pass'))
    expect(bid.classList.contains('bid-primary')).toBe(true)
    expect(pass.classList.contains('bid-pass')).toBe(true)
    for (const id of (bid.getAttribute('aria-describedby') ?? '').split(' ')) expect(document.getElementById(id), id).not.toBeNull()
    expect(panel.querySelector('.bid-details')).not.toBeNull()
    expect(panel.textContent).not.toMatch(/auctionFocus\.|auctionBanner\./)
    // The amount field and quick chips live in the same panel as the Bid button.
    expect(panel.querySelector('.bid-amount input')).not.toBeNull()
    expect(panel.querySelectorAll('.bid-chip').length).toBeGreaterThanOrEqual(4)
  })
  it('highlights the personalised team name as the turn owner', async () => {
    await openLocal('hot', 'focus-name', 'es-AR', 'Los Pibes de Barrio')
    const header = document.querySelector('[data-testid="auction-header"]')!
    expect(header.querySelector('.wallet-name')?.textContent).toBe('Los Pibes de Barrio')
    expect(header.textContent).toMatch(/\d+ M/)
    expect(document.querySelector('.hud-recruiter_one header strong')?.textContent).toBe('Los Pibes de Barrio')
    expect(document.querySelector('.hud-recruiter_two header strong')?.textContent).not.toContain('Los Pibes')
    expect(document.querySelector('.hud-rival')?.textContent).not.toContain('Los Pibes')
    expect(document.querySelector('.bid-panel .team-turn-name')).toBeNull()
  })
})

function within(panel: HTMLElement, label: string) {
  const found = [...panel.querySelectorAll('button')].find((candidate) => candidate.textContent === label)
  if (!found) throw new Error(`missing ${label}`)
  return found as HTMLButtonElement
}

describe('UX-AUCTION-006 automatic close', () => {
  it('against the CPU: states the team is complete, signs only through the ledger at base price, then lists the signings', async () => {
    const { seed, game } = earlyCompletion(true)
    const before = game.record.length
    const finished = must(autoCompleteAll(game, 'recruiter_two', DRAFT_CATALOG))
    const added = finished.record.slice(before).filter((entry) => entry.type === 'award')
    expect(added.length).toBeGreaterThan(0)
    for (const entry of added) {
      expect(entry.type === 'award' && entry.winner).toBe('recruiter_two')
      expect(entry.type === 'award' && entry.reason).toBe('auto_complete')
      if (entry.type === 'award') expect(entry.price).toBe(DRAFT_CATALOG.find((p) => p.id === entry.playerId)!.price)
    }
    expect(finished.teams.recruiter_one).toEqual(game.teams.recruiter_one)
    expect(finished.teams.recruiter_two.spent).toBeLessThanOrEqual(budgetOf(finished))
    expect(new Set(finished.record.flatMap((entry) => entry.type === 'award' ? [entry.playerId] : [])).size).toBe(22)
    expect(finished.phase).toBe('TEAMS_COMPLETED')

    await openLocal('cpu', seed)
    for (let guard = 0; guard < 400 && !screen.queryByText(/Your team is complete/); guard++) {
      const bid = button('Bid'); const pass = button(/^(Pass|Confirm shared discard|Confirm mandatory assignment|Claim)$/); const next = button(/^(Next round|Confirm signing and continue)$/); const start = button('Start auction')
      if (start) fireEvent.click(start)
      else if (next) fireEvent.click(next)
      else if (bid && !bid.disabled && document.querySelector('[data-testid="auction-header"] .wallet-name')?.textContent?.includes('Recruiter one')) fireEvent.click(bid)
      else if (pass && !pass.disabled) fireEvent.click(pass)
      else if (bid && !bid.disabled) fireEvent.click(bid)
      else act(() => vi.advanceTimersByTime(700))
    }
    expect(screen.getByText('Your team is complete. The rival finishes signing players.')).toBeInTheDocument()
    for (let guard = 0; guard < 80 && !document.querySelector('.cpu-signings'); guard++) act(() => vi.advanceTimersByTime(600))
    const summary = document.querySelector('.cpu-signings')!
    expect(summary).not.toBeNull()
    expect(summary.querySelectorAll('li').length).toBeGreaterThan(0)
    expect(summary.textContent).toMatch(/\d+M/)
  }, 120_000)

  it('keeps the human in control when a position is still missing (no automatic award for the human)', () => {
    const { game } = earlyCompletion(false)
    // recruiter_two is the human who still needs players; the engine will not award without a call from the interface.
    const after = autoCompleteStep({ ...game, phase: 'REVEAL_PLAYER' }, 'recruiter_one', DRAFT_CATALOG)
    expect(after.ok).toBe(false)
    expect(game.record.length).toBe(game.record.length)
  })

  it('hot-seat: never closes by itself, it offers the explicit «complete my team» confirmation', async () => {
    const { seed } = earlyCompletion(false)
    await openLocal('hot', seed)
    for (let guard = 0; guard < 400 && !screen.queryByRole('heading', { name: 'Complete my team' }); guard++) {
      const bid = button('Bid'); const pass = button(/^(Pass|Confirm shared discard|Confirm mandatory assignment|Claim)$/); const next = button(/^(Next round|Confirm signing and continue)$/); const start = button('Start auction')
      if (start) fireEvent.click(start)
      else if (next) fireEvent.click(next)
      else if (bid && !bid.disabled && document.querySelector('[data-testid="auction-header"] .wallet-name')?.textContent?.includes('Recruiter one')) fireEvent.click(bid)
      else if (pass && !pass.disabled) fireEvent.click(pass)
      else if (bid && !bid.disabled) fireEvent.click(bid)
      else act(() => vi.advanceTimersByTime(700))
    }
    expect(screen.getByRole('heading', { name: 'Complete my team' })).toBeInTheDocument()
    const awards = document.querySelectorAll('.cpu-signings').length
    act(() => vi.advanceTimersByTime(10_000))
    expect(screen.getByRole('heading', { name: 'Complete my team' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Skip sequence' })).toBeNull()
    expect(document.querySelectorAll('.cpu-signings').length).toBe(awards)
  }, 120_000)

  it('online: never creates local automatic steps, even when the engine could complete the opponent', async () => {
    const { game } = earlyCompletion(false)
    for (const mySide of ['recruiter_one', 'recruiter_two'] as const) {
      vi.useFakeTimers()
      const submit = vi.fn()
      const online: OnlineDuelBinding = { game, mySide, submit, strategyReady: { recruiter_one: false, recruiter_two: false }, chooseStrategy: vi.fn(), revealStrategies: vi.fn(), forfeit: vi.fn(), exit: vi.fn(), connection: 'connected', busy: false }
      const i18n = await createI18n('en')
      const { unmount } = render(<I18nextProvider i18n={i18n}><AuctionPage onDraftFree={vi.fn()} online={online} /></I18nextProvider>)
      act(() => vi.advanceTimersByTime(20_000))
      expect(screen.queryByRole('button', { name: 'Skip sequence' })).toBeNull()
      expect(document.querySelector('.cpu-completion')).toBeNull()
      expect(submit).not.toHaveBeenCalled()
      unmount()
      vi.useRealTimers()
    }
  })
})

describe('UX-AUCTION-006 rounds without a human decision', () => {
  /** Engine-only search for a closed round where the CPU took a card of a line the human had already filled. */
  function cpuTookFullLineCard() {
    for (let index = 0; index < 200; index++) {
      const created = createRecruiterDuel(DRAFT_CATALOG, `skip-${index}`, drawHistory.createDrawContext(DRAFT_CATALOG, []))
      if (!created.ok) continue
      let game = must(beginBidding(must(revealCoinToss(must(startCoinToss(created.game, 'heads'))))))
      for (let step = 0; step < 900 && game.phase !== 'TEAMS_COMPLETED'; step++) {
        if (game.phase === 'ROUND_RESULT' && game.lastAward?.winner === 'recruiter_two' && game.lastAward.reason !== 'auto_complete') {
          const card = DRAFT_CATALOG.find((p) => p.id === game.lastAward!.playerId)!
          const filled = game.teams.recruiter_one.lineup
          const full = Object.keys(filled).filter((slot) => DRAFT_CATALOG.find((p) => p.id === (filled as Record<string, string>)[slot])?.position === card.position).length
          if (full > 0 && !canAutoComplete(game, 'recruiter_two') && auctionAvailability !== undefined && game.roundIndex < game.rounds.length - 1) {
            const progressFull = game.lastAward.reason === 'forced_viability' || full >= ({ ARQ: 1, DEF: 4, MED: 3, DEL: 3 } as const)[card.position]
            if (progressFull) return { index, game }
          }
        }
        if (game.phase === 'DISCARD_RESULT') { game = must(revealDiscardReplacement(game)); continue }
        if (game.phase === 'NEXT_ROUND') { game = must(revealNextAuctionRound(game)); continue }
        if (game.phase === 'REVEAL_PLAYER') { game = must(beginBidding(game)); continue }
        if (game.phase === 'ROUND_RESULT') { game = must(nextAuctionRound(game, DRAFT_CATALOG)); continue }
        const who = game.activeParticipant!
        if (who === 'recruiter_two') { game = must(takeCpuTurn(game, DRAFT_CATALOG, 'BALANCED')); continue }
        const a = auctionAvailability(game, who, DRAFT_CATALOG)
        if (a.pass.enabled && !a.bid.enabled) game = must(passAuction(game, who, DRAFT_CATALOG))
        else if (a.bid.enabled) game = must(placeBid(game, who, a.minimum, DRAFT_CATALOG))
        else game = must(passAuction(game, who, DRAFT_CATALOG))
      }
    }
    return null
  }
  it('continues by itself after a CPU award on a line the human had already filled', async () => {
    const found = cpuTookFullLineCard()
    expect(found).not.toBeNull()
    if (!found) return
    vi.useFakeTimers()
    vi.spyOn(drawHistory, 'newDrawSeed').mockReturnValue('skip-ui')
    const engine = await import('./auctionEngine')
    vi.spyOn(engine, 'createRecruiterDuel').mockReturnValue({ ok: true, game: { ...found.game, legacyCatalog: true } })
    const i18n = await createI18n('en')
    render(<I18nextProvider i18n={i18n}><AuctionPage onDraftFree={vi.fn()} /></I18nextProvider>)
    fireEvent.click(screen.getByRole('button', { name: i18n.t('entry.local') }))
    fireEvent.click(screen.getByText(i18n.t('entry.customize')))
    fireEvent.change(screen.getByLabelText(i18n.t('cpu.opponent')), { target: { value: 'cpu' } })
    fireEvent.click(screen.getByRole('button', { name: i18n.t('duel.start') }))
    const round = () => [...document.querySelectorAll('[data-testid="auction-header"] .auction-header-stats li')].at(-1)?.textContent
    const before = round()
    expect(document.querySelector('.award-result')).not.toBeNull()
    act(() => vi.advanceTimersByTime(3000))
    expect(round()).not.toBe(before)
  })
})
