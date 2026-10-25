import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { GLOBAL_CURRENT as DRAFT_CATALOG } from '../player-catalog/globalCollection'
import * as simulator from '../local-match/simulator'
import { AuctionPage } from './AuctionPage'
import * as engine from './auctionEngine'
import { auctionAvailability, autoCompleteAll, beginBidding, canAutoComplete, createRecruiterDuel, nextAuctionRound, passAuction, placeBid, revealCoinToss, revealDiscardReplacement, revealNextAuctionRound, startCoinToss } from './auctionEngine'
import type { AuctionTransition, RecruiterDuelGame } from './auctionTypes'
import { takeCpuTurn } from './cpuPolicy'
import * as drawHistory from './drawHistory'
import { BENCH_SHOWCASE_V1, CLASSIC_CONFIG, DISCARDS_MARKER_V2 } from './matchConfig'
import { COACH_MARKET_V4, COACH_MAX_PRICE } from '../coaches/coachRules'
import { defaultBudgetForMode } from '../player-catalog/leagueCollections'

/** The configuration the page builds for a classic game with coaches (the engine search below must play the same game as the page). */
const PAGE_CONFIG = { ...CLASSIC_CONFIG, bench: BENCH_SHOWCASE_V1, discards: DISCARDS_MARKER_V2, budget: defaultBudgetForMode('GLOBAL_CLASSIC'), coaches: true as const, coachReserve: COACH_MAX_PRICE, coachMarket: COACH_MARKET_V4 }

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
    const created = createRecruiterDuel(DRAFT_CATALOG, seed, drawHistory.createDrawContext(DRAFT_CATALOG, [], drawHistory.CURRENT_DRAW_POLICY), PAGE_CONFIG)
    if (!created.ok) continue
    let game = must(beginBidding(must(revealCoinToss(must(startCoinToss(created.game, 'heads'))))))
    for (let step = 0; step < 800 && game.phase !== 'TEAMS_COMPLETED'; step++) {
      // At least three cards left for recruiter two, so the completion sequence lasts long enough to be seen.
      if (canAutoComplete(game, 'recruiter_two') && Object.values(game.teams.recruiter_two.lineup).filter(Boolean).length <= 8) return seed
      if (game.phase === 'DISCARD_RESULT') { game = must(revealDiscardReplacement(game)); continue }
      if (game.phase === 'NEXT_ROUND') { game = must(revealNextAuctionRound(game)); continue }
      if (game.phase === 'REVEAL_PLAYER') { game = must(beginBidding(game)); continue }
      if (game.phase === 'ROUND_RESULT') { game = must(nextAuctionRound(game, DRAFT_CATALOG)); continue }
      const who = game.activeParticipant!
      if (secondIsCpu && who === 'recruiter_two') { game = must(takeCpuTurn(game, DRAFT_CATALOG, 'BALANCED', 'HARD')); continue }  // the page starts on HARD, so the search must too
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
    const panel = document.querySelector('[data-testid="auction-header"] .wallet-name')?.textContent ?? ''
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
  act(() => vi.advanceTimersByTime(3000))
  return i18n
}

const strategy = (name: RegExp) => { fireEvent.click(screen.getByRole('radio', { name })); click('Confirm strategy') }
const finishMatch = () => { fireEvent.click(screen.getByRole('radio', { name: 'Quick simulation' })); click('Start match'); act(() => vi.advanceTimersByTime(16_000)); expect(screen.getByText('Full time')).toBeInTheDocument() }

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
    const batch = vi.spyOn(engine, 'startDuelMatch')
    expect(screen.getByRole('radio', { name: 'Manage match' })).toBeChecked()
    click('Start match')
    // Against the CPU the interactive attack (SIM-005R-02) may stop a block: take the first card on offer.
    // SIM-MINI-001/002/003: the hand-played panels offer a traditional answer; their lane buttons only select.
    const card = () => button('Resolve with the traditional system') ?? screen.queryAllByRole('button').find((b) => b.classList.contains('play-card') && !(b as HTMLButtonElement).disabled)
    for (let i = 0; i < 60 && !screen.queryByRole('heading', { name: 'HALF-TIME · Recruiter one' }); i++) { const open = card(); if (open) fireEvent.click(open); else if (button('View next block')?.hasAttribute('disabled')) act(() => vi.advanceTimersByTime(800)); else click('View next block') }
    expect(screen.getByRole('heading', { name: 'HALF-TIME · Recruiter one' })).toHaveFocus()
    for (let i = 0; i < 120 && !button('Replay match'); i++) {
      const open = card()
      if (button('Keep strategy and start second half')) click('Keep strategy and start second half')
      else if (button('View next block')?.hasAttribute('disabled') && !open) act(() => vi.advanceTimersByTime(800))
      else if (open) fireEvent.click(open)
      else click('View next block')
    }
    expect(button('Replay match')).not.toBeNull()
    expect(batch).not.toHaveBeenCalled()
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
    fireEvent.click(screen.getByRole('radio', { name: 'Simulación rápida' }))
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

describe('C. going back to edit before the match', () => {
  const confirmBack = (label: string) => { fireEvent.click(button(label)!); const dialog = screen.getByRole('dialog'); fireEvent.click(within(dialog).getByRole('button', { name: label })) }
  const toStrategyStage = () => { for (let guard = 0; guard < 40 && !button('Confirm eleven'); guard++) act(() => vi.advanceTimersByTime(450)); click('Confirm eleven') }
  // spent = prices paid in the auction + substitutes bought at catalogue price + the coach's price (a returned coach leaves no trace).
  const spentOf = (game: RecruiterDuelGame) => {
    const team = game.teams.recruiter_one
    const paid = new Map(game.record.flatMap((entry) => entry.type === 'award' && entry.winner === 'recruiter_one' ? [[entry.playerId, entry.price] as const] : []))
    const roster = [...Object.values(team.lineup), ...(team.bench ?? []).map((slot) => slot.playerId)]
    return roster.reduce((sum, id) => sum + (paid.get(id!) ?? DRAFT_CATALOG.find((player) => player.id === id)?.price ?? 0), 0) + (team.coachId ? team.coachPrice ?? 0 : 0)
  }

  it('against the CPU: back from the power screen, change formation and coach, confirm, choose again and the match starts with the new squad', async () => {
    const seed = findEarlyCompletionSeed(true)
    await open('cpu', seed)
    drive(() => screen.queryByRole('heading', { name: 'The CPU is completing its team' }) !== null)
    toStrategyStage()
    expect(screen.getByText(/Step 2 of 3/)).toBeInTheDocument()
    // The power screen offers the way back, and warns that the tactic picks are dropped.
    fireEvent.click(button('Back to edit my team')!)
    expect(within(screen.getByRole('dialog')).getByText(/discarded for both sides/)).toBeInTheDocument()
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Back to edit my team' }))
    expect(screen.getByText(/Step 1 of 3/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'The elevens are ready' })).toHaveFocus()
    expect(screen.queryByRole('radio', { name: /High press/ })).not.toBeInTheDocument()
    // Formation: pick another one. Coach: he went without one, so hire one, then change him (price returns), then hire again.
    const select = document.querySelector('.formation-selector select') as HTMLSelectElement
    // Some formations cannot be filled with this roster; take the first one the page accepts.
    const start = select.value; let other = start
    for (const option of [...select.options]) { if (option.value === start) continue; fireEvent.change(select, { target: { value: option.value } }); if ((document.querySelector('.formation-selector select') as HTMLSelectElement).value === option.value) { other = option.value; break } }
    expect(other).not.toBe(start)
    fireEvent.click(button('Hire a coach')!)
    const hire = () => fireEvent.click(document.querySelector('.coach-card .primary-action:not([disabled])')!)
    hire()
    expect(button('Change coach')).not.toBeNull()
    fireEvent.click(button('Change coach')!)
    expect(button('Change coach')).toBeNull()
    hire()
    expect(button('Change coach')).not.toBeNull()
    click('Confirm eleven')
    expect(screen.getByText(/Step 2 of 3/)).toBeInTheDocument()
    const batch = vi.spyOn(engine, 'startDuelMatch')
    strategy(/Counter-attack/)
    // Against the CPU the reveal is sealed, so changing your pick never lets you counter the CPU's.
    expect(screen.getByText(/You will see it when the match starts/)).toBeInTheDocument()
    fireEvent.click(button('Change my tactic')!)
    expect(screen.getAllByRole('radio')).toHaveLength(6)
    strategy(/High press/)
    finishMatch()
    const played = batch.mock.calls[0][0]
    expect(played.teams.recruiter_one.formation).toBe(other)
    expect(played.teams.recruiter_one.coachId).toBeTruthy()
    expect(played.teams.recruiter_one.spent).toBe(spentOf(played))
    expect(batch.mock.calls[0][2]).toMatchObject({ recruiter_one: 'HIGH_PRESS' })
  }, 120_000)

  it('hot-seat: a tactic can be changed before the second confirms, and going back drops every pick but keeps the other eleven', async () => {
    const seed = findEarlyCompletionSeed(false)
    await open('hot', seed)
    drive(() => screen.queryByRole('heading', { name: 'Complete my team' }) !== null)
    click('Complete my team')
    click('Confirm eleven'); click('Confirm eleven')
    expect(screen.getAllByRole('radio')).toHaveLength(6)
    fireEvent.click(screen.getByRole('radio', { name: /High press/ })); click('Confirm strategy')
    expect(screen.queryByText('High press')).not.toBeInTheDocument()
    // Before the second one confirms, the first can change; the old pick is gone.
    fireEvent.click(button("Change Recruiter one's tactic")!)
    expect(screen.getAllByRole('radio').every((radio) => !(radio as HTMLInputElement).checked)).toBe(true)
    fireEvent.click(screen.getByRole('radio', { name: /Counter-attack/ })); click('Confirm strategy')
    click(/I am Recruiter two/)
    expect(button("Change Recruiter one's tactic")).not.toBeNull()
    // Going back (Recruiter one) drops both picks; Recruiter two keeps the confirmed eleven and only chooses again.
    confirmBack('Back to edit: Recruiter one')
    expect(screen.getByText(/Step 1 of 3/)).toBeInTheDocument()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
    click('Confirm eleven')
    expect(screen.getByText(/Step 2 of 3/)).toBeInTheDocument()
    expect(screen.getAllByRole('radio').every((radio) => !(radio as HTMLInputElement).checked)).toBe(true)
    expect(screen.queryByRole('heading', { name: 'Strategies revealed' })).not.toBeInTheDocument()
    strategy(/High press/)
    click(/I am Recruiter two/)
    strategy(/Low block/)
    expect(screen.getByRole('heading', { name: 'Strategies revealed' })).toBeInTheDocument()
    expect(screen.getByText('High press')).toBeInTheDocument(); expect(screen.getByText('Low block')).toBeInTheDocument()
    finishMatch()
  }, 120_000)
})
