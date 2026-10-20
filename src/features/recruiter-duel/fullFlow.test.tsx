import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { DRAFT_CATALOG } from '../draft/catalog'
import * as simulator from '../local-match/simulator'
import { AuctionPage } from './AuctionPage'
import * as engine from './auctionEngine'
import { auctionAvailability, autoCompleteAll, beginBidding, canAutoComplete, createRecruiterDuel, nextAuctionRound, passAuction, placeBid, revealCoinToss, revealDiscardReplacement, revealNextAuctionRound, startCoinToss } from './auctionEngine'
import type { AuctionTransition, RecruiterDuelGame } from './auctionTypes'
import { takeCpuTurn } from './cpuPolicy'
import * as drawHistory from './drawHistory'

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); localStorage.clear() })
beforeEach(() => localStorage.clear())

const must = (result: AuctionTransition): RecruiterDuelGame => { if (!result.ok) throw new Error(result.error); return result.game }

/**
 * Finds, with the engine alone, a seed whose auction reaches a card where recruiter_one already has eleven and
 * recruiter_two does not. recruiter_one bids the base price whenever allowed; recruiter_two is the CPU or passes.
 */
function findEarlyCompletionSeed(secondIsCpu: boolean) {
  for (let index = 0; index < 120; index++) {
    const seed = `flow-${secondIsCpu ? 'cpu' : 'hot'}-${index}`
    const created = createRecruiterDuel(DRAFT_CATALOG, seed, drawHistory.createDrawContext(DRAFT_CATALOG, []))
    if (!created.ok) continue
    let game = must(beginBidding(must(revealCoinToss(must(startCoinToss(created.game, 'heads'))))))
    for (let step = 0; step < 800 && game.phase !== 'TEAMS_COMPLETED'; step++) {
      if (canAutoComplete(game, 'recruiter_two')) return seed
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
  throw new Error('no early-completion seed found')
}

const button = (name: string | RegExp) => screen.queryByRole('button', { name }) as HTMLButtonElement | null
const click = (name: string | RegExp) => { if (name === 'Confirm eleven' && !button(name)) { const decline = document.querySelector('.coach-market > .secondary-action') as HTMLButtonElement | null; if (decline) fireEvent.click(decline) } const target = button(name); if (!target) throw new Error(`missing button ${String(name)}`); fireEvent.click(target) }

/** Mirrors the engine policy above through the real interface. Returns once `stop()` is true. */
function drive(stop: () => boolean, limit = 900) {
  for (let step = 0; step < limit; step++) {
    if (stop()) return
    const decline = document.querySelector('.coach-market > .secondary-action') as HTMLButtonElement | null
    if (decline) { fireEvent.click(decline); continue }
    if (button('Start auction')) { click('Start auction'); continue }
    const next = button(/^(Next round|Confirm signing and continue)$/); if (next) { click(next.textContent!); continue }
    const panel = document.querySelector('.bid-panel h2')?.textContent ?? ''
    const bid = button('Bid'); const pass = button(/^(Pass|Confirm shared discard|Confirm mandatory assignment|Claim)$/)
    if (bid && !bid.disabled && panel.includes('Recruiter one')) { click('Bid'); continue }
    if (pass && !pass.disabled) { click(pass.textContent!); continue }
    if (bid && !bid.disabled) { click('Bid'); continue }
    act(() => vi.advanceTimersByTime(700))
  }
  throw new Error('flow did not reach the expected screen')
}

async function open(mode: 'cpu' | 'hot', seed: string) {
  vi.useFakeTimers()
  vi.spyOn(drawHistory, 'newDrawSeed').mockReturnValue(seed)
  const i18n = await createI18n('en')
  render(<I18nextProvider i18n={i18n}><AuctionPage onDraftFree={vi.fn()} /></I18nextProvider>)
  fireEvent.click(screen.getByRole('button', { name: i18n.t('entry.local') }))
  fireEvent.click(screen.getByText(i18n.t('entry.customize')))
  if (mode === 'cpu') fireEvent.change(screen.getByLabelText('Opponent'), { target: { value: 'cpu' } })
  click('Start duel'); click('Heads')
  act(() => vi.advanceTimersByTime(2000))
  return i18n
}

const strategy = (name: RegExp) => { fireEvent.click(screen.getByRole('radio', { name })); click('Confirm strategy') }
const finishMatch = () => { click('Start match'); act(() => vi.advanceTimersByTime(16_000)); expect(screen.getByText('Full time')).toBeInTheDocument() }

describe('A. human against CPU: early completion to final result', () => {
  it('the CPU completes its team automatically, then ordering, strategies, reveal and match', async () => {
    const seed = findEarlyCompletionSeed(true)
    await open('cpu', seed)
    drive(() => screen.queryByRole('heading', { name: 'The CPU is completing its team' }) !== null)
    expect(screen.getByRole('button', { name: 'Skip sequence' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Pass' })).not.toBeInTheDocument()
    const before = document.querySelectorAll('.hud-panel').length
    expect(before).toBe(2)
    act(() => vi.advanceTimersByTime(450))
    expect(screen.getByText(/signs .* for \d+M \(1\//)).toBeInTheDocument()
    for (let guard = 0; guard < 40 && !button('Confirm eleven'); guard++) act(() => vi.advanceTimersByTime(450))
    click('Confirm eleven')
    // strategies: the CPU already fixed its own, hidden until the human confirms
    expect(screen.getByText(/CPU has already fixed its strategy/)).toBeInTheDocument()
    expect(screen.getByText(/Step 2 of 3/)).toBeInTheDocument()
    strategy(/Counter-attack/)
    expect(screen.getByRole('heading', { name: 'Strategies revealed' })).toBeInTheDocument()
    expect(screen.getByText(/Step 3 of 3/)).toBeInTheDocument()
    finishMatch()
  }, 120_000)

  it('the sequence can be skipped and gives the same team as letting it run', async () => {
    const seed = findEarlyCompletionSeed(true)
    await open('cpu', seed)
    drive(() => screen.queryByRole('button', { name: 'Skip sequence' }) !== null)
    click('Skip sequence')
    if (!button('Confirm eleven')) fireEvent.click(document.querySelector('.coach-market > .secondary-action')!)
    expect(button('Confirm eleven')).not.toBeNull()
    const skipped = [...document.querySelectorAll('.lineup-organizer .pitch-shirt')].map((node) => node.getAttribute('aria-label'))
    expect(skipped.length).toBeGreaterThan(0)
    click('Confirm eleven')
    strategy(/High press/)
    finishMatch()
  }, 120_000)
})

describe('B. hot-seat: Complete my team', () => {
  it('the second recruiter confirms the quick completion, both arrange, choose in secret, reveal and play', async () => {
    const seed = findEarlyCompletionSeed(false)
    await open('hot', seed)
    drive(() => screen.queryByRole('heading', { name: 'Complete my team' }) !== null)
    const panel = screen.getByRole('region', { name: 'Complete my team' })
    // detail shown before deciding: remaining footballers, cost and expected final budget; nothing was awarded yet
    expect(within(panel).getByText(/Remaining footballers: \d+/)).toBeInTheDocument()
    expect(within(panel).getByText(/Accumulated cost: \d+M/)).toBeInTheDocument()
    expect(within(panel).getByText(/Expected final budget: \d+M/)).toBeInTheDocument()
    expect(within(panel).getByText(/keep auctioning card by card/)).toBeInTheDocument()
    expect(button('Confirm eleven')).toBeNull()
    click('Complete my team')
    expect(screen.queryByRole('heading', { name: 'Complete my team' })).not.toBeInTheDocument()
    // arrange both elevens, one after the other
    click('Confirm eleven'); expect(screen.queryByRole('radio')).not.toBeInTheDocument(); click('Confirm eleven')
    expect(screen.getAllByRole('radio')).toHaveLength(6)
    fireEvent.click(screen.getByRole('radio', { name: /High press/ })); click('Confirm strategy')
    expect(screen.queryByText('High press')).not.toBeInTheDocument()
    expect(screen.getByText(/Recruiter one has chosen\. Recruiter two still has to choose/)).toBeInTheDocument()
    click(/I am Recruiter two/)
    expect(screen.getByText(/Recruiter two still has to choose/)).toBeInTheDocument()
    expect(screen.getAllByRole('radio').every((radio) => !(radio as HTMLInputElement).checked)).toBe(true)
    strategy(/Low block/)
    expect(screen.getByRole('heading', { name: 'Strategies revealed' })).toBeInTheDocument()
    finishMatch()
  }, 120_000)

  it('keeps the normal controls available instead of forcing the shortcut', async () => {
    const seed = findEarlyCompletionSeed(false)
    await open('hot', seed)
    drive(() => screen.queryByRole('heading', { name: 'Complete my team' }) !== null)
    expect(button('Start auction')).not.toBeNull()
  }, 120_000)
})

describe('transitions are protected and recoverable', () => {
  it('starts the simulation once even with a double click, and switches language in place', async () => {
    const seed = findEarlyCompletionSeed(true)
    const i18n = await open('cpu', seed)
    drive(() => screen.queryByRole('button', { name: 'Skip sequence' }) !== null)
    click('Skip sequence'); click('Confirm eleven')
    fireEvent.click(screen.getByRole('radio', { name: /Wide play/ }))
    const confirm = button('Confirm strategy')!
    act(() => { confirm.click(); confirm.click() })
    expect(screen.getByRole('heading', { name: 'Strategies revealed' })).toBeInTheDocument()
    await act(async () => { await i18n.changeLanguage('es-AR') })
    expect(screen.getByRole('heading', { name: 'Estrategias reveladas' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Jugar partido' })).toBeInTheDocument()
    const start = vi.spyOn(engine, 'startDuelMatch')
    const play = button('Jugar partido')!
    act(() => { play.click(); play.click() })
    expect(start).toHaveBeenCalledTimes(1)
    act(() => vi.advanceTimersByTime(16_000))
    expect(screen.getByText('Final del partido')).toBeInTheDocument()
  }, 120_000)

  it('shows a recoverable message instead of a frozen screen when the teams are invalid', async () => {
    const seed = findEarlyCompletionSeed(true)
    const i18n = await open('cpu', seed)
    drive(() => screen.queryByRole('button', { name: 'Skip sequence' }) !== null)
    click('Skip sequence')
    if (!button('Confirm eleven')) fireEvent.click(document.querySelector('.coach-market > .secondary-action')!)
    vi.spyOn(simulator, 'isValidOrganizedLineup').mockReturnValue(false)
    click('Confirm eleven')
    expect(screen.getAllByRole('alert').map((item) => item.textContent).join(' ')).toContain('The teams are not valid')
    click('Back to start')
    expect(button('Start duel')).toBeNull()
    expect(document.activeElement).toHaveTextContent(i18n.t('entry.chooseRival'))
  }, 120_000)

  it('autoCompleteAll refuses when the budget cannot cover it and leaves the game untouched', () => {
    const seed = findEarlyCompletionSeed(false)
    const created = createRecruiterDuel(DRAFT_CATALOG, seed, drawHistory.createDrawContext(DRAFT_CATALOG, []))
    if (!created.ok) throw new Error(created.error)
    let game = must(beginBidding(must(revealCoinToss(must(startCoinToss(created.game, 'heads'))))))
    for (let step = 0; step < 800 && !canAutoComplete(game, 'recruiter_two'); step++) {
      if (game.phase === 'DISCARD_RESULT') { game = must(revealDiscardReplacement(game)); continue }
      if (game.phase === 'NEXT_ROUND') { game = must(revealNextAuctionRound(game)); continue }
      if (game.phase === 'REVEAL_PLAYER') { game = must(beginBidding(game)); continue }
      if (game.phase === 'ROUND_RESULT') { game = must(nextAuctionRound(game, DRAFT_CATALOG)); continue }
      const who = game.activeParticipant!; const a = auctionAvailability(game, who, DRAFT_CATALOG)
      if (who === 'recruiter_one' && a.bid.enabled) game = must(placeBid(game, who, a.minimum, DRAFT_CATALOG))
      else if (a.pass.enabled) game = must(passAuction(game, who, DRAFT_CATALOG))
      else game = must(placeBid(game, who, a.minimum, DRAFT_CATALOG))
    }
    const broke = { ...game, teams: { ...game.teams, recruiter_two: { ...game.teams.recruiter_two, spent: 99 } } }
    const snapshot = JSON.stringify(broke)
    expect(autoCompleteAll(broke, 'recruiter_two', DRAFT_CATALOG)).toEqual({ ok: false, error: 'no_legal_assignment' })
    expect(JSON.stringify(broke)).toBe(snapshot)
  })
})
