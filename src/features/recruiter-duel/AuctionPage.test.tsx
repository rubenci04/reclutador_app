import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { AuctionPage, COIN_TOSS_MS } from './AuctionPage'
import { PlayerIdentity } from './PlayerIdentity'
import { DRAFT_CATALOG } from '../draft/catalog'
import * as drawHistory from './drawHistory'
import * as engine from './auctionEngine'
import { beginBidding, createRecruiterDuel, maximumSafeBid, nextAuctionRound, passAuction, positionProgress, revealCoinToss, revealDiscardReplacement, revealNextAuctionRound, startCoinToss } from './auctionEngine'
import type { AuctionCreation, AuctionTransition } from './auctionTypes'

beforeEach(() => { localStorage.clear(); vi.spyOn(drawHistory, 'newDrawSeed').mockReturnValue('hot-seat-001') })
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); localStorage.clear() })

describe('single-player auction interface', () => {
  it.each([false, true])('confirms one toss on double click and preserves the result with reduced motion=%s', async (reduced) => {
    vi.useFakeTimers()
    vi.stubGlobal('matchMedia', () => ({ matches: reduced, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
    const i18n = await createI18n('en')
    render(<I18nextProvider i18n={i18n}><AuctionPage onDraftFree={vi.fn()} /></I18nextProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Start duel' }))
    const toss = vi.spyOn(engine, 'startCoinToss')
    const heads = screen.getByRole('button', { name: 'Heads' })
    act(() => { heads.click(); heads.click() })
    expect(toss).toHaveBeenCalledTimes(1)
    if (!reduced) expect(screen.getByRole('heading', { name: 'Coin toss' })).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(reduced ? 0 : COIN_TOSS_MS))
    expect(screen.getByRole('img', { name: 'Coin: Heads' })).toBeInTheDocument()
    expect(screen.getByText('The coin landed on Heads. Recruiter one starts recruiting.')).toBeVisible()
    act(() => vi.advanceTimersByTime(2000))
    expect(toss).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Start auction' })).toBeInTheDocument()
  })
  it('explains an excessive bid and resets a stale amount when the round changes', async () => {
    vi.useFakeTimers()
    const i18n = await createI18n('en')
    render(<I18nextProvider i18n={i18n}><AuctionPage onDraftFree={vi.fn()} /></I18nextProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Start duel' }))
    fireEvent.click(screen.getByRole('button', { name: 'Heads' }))
    act(() => vi.advanceTimersByTime(COIN_TOSS_MS))
    fireEvent.click(screen.getByRole('button', { name: 'Start auction' }))
    const input = screen.getByLabelText('Bid amount') as HTMLInputElement
    const minimum = Number(input.min)
    fireEvent.change(input, { target: { value: String(minimum - 1) } })
    expect(input).toHaveValue(minimum - 1)
    expect(screen.getByRole('button', { name: 'Bid' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Bid' })).toHaveAccessibleDescription(/whole amount/)
    fireEvent.change(input, { target: { value: String(minimum + .5) } })
    expect(screen.getByRole('button', { name: 'Bid' })).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Bid amount'), { target: { value: '101' } })
    const bid = screen.getByRole('button', { name: 'Bid' })
    expect(bid).toBeDisabled()
    expect(bid).toHaveAccessibleDescription(/remaining budget cannot cover/)
    fireEvent.click(screen.getByRole('button', { name: 'Pass' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm shared discard' }))
    act(() => vi.advanceTimersByTime(350))
    fireEvent.click(screen.getByRole('button', { name: 'Start auction' }))
    expect(screen.getByLabelText('Bid amount')).not.toHaveValue(101)
  })
  it('explains full slots, keeps passing legal, replays the match and draws a fresh rematch', async () => {
    vi.useFakeTimers()
    const get = (result: AuctionCreation | AuctionTransition) => { if (!result.ok) throw new Error(result.error); return result.game }
    const i18n = await createI18n('en')
    render(<I18nextProvider i18n={i18n}><AuctionPage onDraftFree={vi.fn()} /></I18nextProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Start duel' }))
    let expected = get(createRecruiterDuel(DRAFT_CATALOG, 'hot-seat-001', drawHistory.createDrawContext(DRAFT_CATALOG)))
    fireEvent.click(screen.getByRole('button', { name: 'Heads' }))
    act(() => vi.advanceTimersByTime(COIN_TOSS_MS))
    expected = get(revealCoinToss(get(startCoinToss(expected, 'heads'))))
    let checkedFull = false; let checkedOneDefender = false
    while (expected.phase !== 'TEAMS_COMPLETED') {
      fireEvent.click(screen.getByRole('button', { name: 'Start auction' }))
      expected = get(beginBidding(expected))
      for (let turn = 0; turn < 2; turn++) {
        const participant = expected.activeParticipant!
        const position = expected.rounds[expected.roundIndex].position
        const progress = positionProgress(expected.teams[participant], position)
        if (progress.remaining === 0) {
          expect(screen.getByRole('button', { name: 'Bid' })).toBeDisabled()
          expect(document.getElementById('position-capacity')).toHaveTextContent('position full')
          checkedFull = true
        }
        if (position === 'DEF' && progress.filled === 1 && maximumSafeBid(expected, participant, DRAFT_CATALOG) > 0) {
          expect(screen.getByRole('button', { name: 'Bid' })).toBeEnabled(); checkedOneDefender = true
        }
        const passAction = screen.getByRole('button', { name: turn ? (engine.auctionAvailability(expected, participant, DRAFT_CATALOG).replacement ? 'Confirm shared discard' : 'Confirm mandatory assignment') : 'Pass' })
        expect(passAction).toBeEnabled()
        fireEvent.click(passAction)
        expected = get(passAuction(expected, participant, DRAFT_CATALOG))
      }
      if (expected.phase === 'DISCARD_RESULT') {
        act(() => vi.advanceTimersByTime(350))
        expected = get(revealDiscardReplacement(expected))
        continue
      }
      fireEvent.click(screen.getByRole('button', { name: /^(Next round|Confirm signing and continue)$/ }))
      expected = get(nextAuctionRound(expected, DRAFT_CATALOG))
      if (expected.phase === 'NEXT_ROUND') expected = get(revealNextAuctionRound(expected))
    }
    expect(checkedFull).toBe(true); expect(checkedOneDefender).toBe(true)
    expect(screen.getAllByText('11/11')).toHaveLength(2)
    expect(screen.queryByRole('button', { name: 'Start match' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm eleven' }))
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm eleven' }))
    // Secret strategy choice: first recruiter picks, device is handed over, second picks, then both are revealed.
    expect(screen.getByRole('radiogroup')).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(6)
    expect(screen.getByRole('button', { name: 'Confirm strategy' })).toBeDisabled()
    fireEvent.click(screen.getByRole('radio', { name: /High press/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm strategy' }))
    expect(screen.getByRole('heading', { name: 'Hand the device to Recruiter two' })).toBeInTheDocument()
    expect(screen.queryByText('High press')).not.toBeInTheDocument()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Confirm strategy' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit again' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /I am Recruiter two/ }))
    expect(screen.getAllByRole('radio').every((radio) => !(radio as HTMLInputElement).checked)).toBe(true)
    fireEvent.click(screen.getByRole('radio', { name: /Low block/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm strategy' }))
    expect(screen.getByRole('heading', { name: 'Strategies revealed' })).toBeInTheDocument()
    expect(screen.getByText('High press')).toBeInTheDocument(); expect(screen.getByText('Low block')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Confirm strategy' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Start match' }))
    act(() => vi.advanceTimersByTime(15000))
    fireEvent.click(screen.getByRole('button', { name: 'Replay match' }))
    expect(drawHistory.newDrawSeed).toHaveBeenCalledTimes(1)
    act(() => vi.advanceTimersByTime(15000))
    vi.mocked(drawHistory.newDrawSeed).mockReturnValue('fresh-rematch')
    fireEvent.click(screen.getByRole('button', { name: 'Rematch' }))
    expect(drawHistory.newDrawSeed).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('button', { name: 'Heads' })).toBeInTheDocument()
    expect(JSON.parse((screen.getByLabelText('Original seed and context') as HTMLTextAreaElement).value).seed).toBe('fresh-rematch')
  }, 30_000)
  it('starts fresh games only on actions and persists exactly the last five contexts', async () => {
    const i18n = await createI18n('en')
    for (let index = 0; index < 7; index++) {
      vi.mocked(drawHistory.newDrawSeed).mockReturnValue(`new-game-${index}`)
      const view = render(<I18nextProvider i18n={i18n}><AuctionPage onDraftFree={vi.fn()} /></I18nextProvider>)
      view.rerender(<I18nextProvider i18n={i18n}><AuctionPage onDraftFree={vi.fn()} /></I18nextProvider>)
      expect(drawHistory.newDrawSeed).toHaveBeenCalledTimes(index)
      fireEvent.click(screen.getByRole('button', { name: 'Start duel' }))
      expect(drawHistory.newDrawSeed).toHaveBeenCalledTimes(index + 1)
      const exported = JSON.parse((screen.getByLabelText('Original seed and context') as HTMLTextAreaElement).value)
      expect(exported.seed).toBe(`new-game-${index}`)
      expect(exported.context.recent).toHaveLength(Math.min(5, index))
      view.unmount()
    }
    const saved = drawHistory.readDrawHistory(localStorage, DRAFT_CATALOG)
    expect(saved.warning).toBe(false)
    expect(saved.history.games.map((entry) => entry.seed)).toEqual(['new-game-2', 'new-game-3', 'new-game-4', 'new-game-5', 'new-game-6'])
  })
  it('reproduces an imported context without generating entropy or changing history', async () => {
    const i18n = await createI18n('en')
    const context = drawHistory.createDrawContext(DRAFT_CATALOG, [['plr_001']])
    render(<I18nextProvider i18n={i18n}><AuctionPage onDraftFree={vi.fn()} /></I18nextProvider>)
    fireEvent.click(screen.getByText('Reproduce draw', { selector: 'summary' }))
    fireEvent.change(screen.getByLabelText('Original seed and context'), { target: { value: JSON.stringify({ seed: 'imported', context }) } })
    fireEvent.click(screen.getByRole('button', { name: 'Reproduce draw' }))
    expect(drawHistory.newDrawSeed).not.toHaveBeenCalled()
    expect(localStorage.getItem(drawHistory.DRAW_HISTORY_KEY)).toBeNull()
    expect(JSON.parse((screen.getByLabelText('Original seed and context') as HTMLTextAreaElement).value)).toEqual({ seed: 'imported', context })
    expect(createRecruiterDuel(DRAFT_CATALOG, 'imported', context).ok).toBe(true)
  })
  it('continues when saving history fails and reports invalid replay input', async () => {
    const i18n = await createI18n('en')
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
    render(<I18nextProvider i18n={i18n}><AuctionPage onDraftFree={vi.fn()} /></I18nextProvider>)
    fireEvent.click(screen.getByText('Reproduce draw', { selector: 'summary' }))
    fireEvent.change(screen.getByLabelText('Original seed and context'), { target: { value: '{}' } })
    fireEvent.click(screen.getByRole('button', { name: 'Reproduce draw' }))
    expect(screen.getByRole('alert')).toHaveTextContent('context is invalid')
    fireEvent.click(screen.getByRole('button', { name: 'Start duel' }))
    expect(screen.getByRole('button', { name: 'Heads' })).toBeInTheDocument()
    expect(screen.getByText(/Recent history could not be restored or saved/)).toHaveAttribute('role', 'status')
  })
  it('labels a shared discard and announces mandatory assignment after exhaustion', async () => {
    vi.useFakeTimers()
    const i18n = await createI18n('en')
    render(<I18nextProvider i18n={i18n}><AuctionPage onDraftFree={vi.fn()} /></I18nextProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Start duel' }))
    fireEvent.click(screen.getByRole('button', { name: 'Heads' }))
    act(() => vi.advanceTimersByTime(COIN_TOSS_MS))
    fireEvent.click(screen.getByRole('button', { name: 'Start auction' }))
    fireEvent.click(screen.getByRole('button', { name: 'Pass' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm shared discard' }))
    expect(screen.getByRole('heading', { name: 'NEW DRAW' })).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(350))
    for (let remaining = 2; remaining > 0; remaining--) {
      fireEvent.click(screen.getByRole('button', { name: 'Start auction' }))
      fireEvent.click(screen.getByRole('button', { name: 'Pass' }))
      fireEvent.click(screen.getByRole('button', { name: 'Confirm shared discard' }))
      act(() => vi.advanceTimersByTime(350))
    }
    expect(screen.getByText('Discards 0/3')).toBeVisible()
    expect(screen.getByText(/No discards left/)).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Start auction' }))
    fireEvent.click(screen.getByRole('button', { name: 'Pass' }))
    expect(screen.getByText(/Mandatory assignment:/)).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm mandatory assignment' }))
    expect(screen.getByRole('heading', { name: 'Player assigned under completion rules' })).toBeInTheDocument()
  })
  it('shows a verified photograph and recovers locally if its file fails', async () => {
    const i18n = await createI18n('en')
    render(<I18nextProvider i18n={i18n}><PlayerIdentity player={DRAFT_CATALOG.find((player) => player.id === 'plr_038')!} /></I18nextProvider>)
    const photo = screen.getByRole('img', { name: 'Photograph of Lionel Messi' })
    fireEvent.error(photo)
    expect(screen.getByRole('img', { name: 'Avatar for Lionel Messi' })).toBeInTheDocument()
  })
  it('offers CPU profiles, pauses its action and leaves the human controls available afterwards', async () => {
    vi.useFakeTimers()
    const i18n = await createI18n('en')
    render(<I18nextProvider i18n={i18n}><AuctionPage onDraftFree={vi.fn()} /></I18nextProvider>)
    fireEvent.change(screen.getByLabelText('Opponent'), { target: { value: 'cpu' } })
    expect(screen.getByLabelText('CPU strategy')).toHaveValue('BALANCED')
    fireEvent.click(screen.getByRole('button', { name: 'Start duel' }))
    fireEvent.click(screen.getByRole('button', { name: 'Tails' }))
    act(() => vi.advanceTimersByTime(COIN_TOSS_MS))
    fireEvent.click(screen.getByRole('button', { name: 'Start auction' }))
    expect(screen.getByText(/CPU evaluating…/)).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(650))
    expect(screen.queryByText(/CPU evaluating…/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pass' })).toBeEnabled()
  })
  it('lets the player choose a coin side before revealing and bidding', async () => {
    vi.useFakeTimers()
    const i18n = await createI18n('en')
    render(<I18nextProvider i18n={i18n}><AuctionPage onDraftFree={vi.fn()} /></I18nextProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Start duel' }))
    expect(screen.getByRole('button', { name: 'Heads' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Heads' }))
    expect(screen.getByRole('heading', { name: 'Coin toss' })).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(COIN_TOSS_MS))
    fireEvent.click(screen.getByRole('button', { name: 'Start auction' }))
    expect(screen.getByRole('button', { name: 'Bid' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Pass' })).toBeEnabled()
  })
})
