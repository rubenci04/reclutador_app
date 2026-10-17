import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { AuctionPage } from './AuctionPage'
import { PlayerIdentity } from './PlayerIdentity'
import { DRAFT_CATALOG } from '../draft/catalog'
import * as drawHistory from './drawHistory'
import { beginBidding, createRecruiterDuel, maximumSafeBid, nextAuctionRound, passAuction, positionProgress, revealCoinToss, revealNextAuctionRound, startCoinToss } from './auctionEngine'
import type { AuctionCreation, AuctionTransition } from './auctionTypes'

beforeEach(() => { localStorage.clear(); vi.spyOn(drawHistory, 'newDrawSeed').mockReturnValue('hot-seat-001') })
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); localStorage.clear() })

describe('single-player auction interface', () => {
  it('explains full slots, keeps passing legal, replays the match and draws a fresh rematch', async () => {
    vi.useFakeTimers()
    const get = (result: AuctionCreation | AuctionTransition) => { if (!result.ok) throw new Error(result.error); return result.game }
    const i18n = await createI18n('en')
    render(<I18nextProvider i18n={i18n}><AuctionPage onDraftFree={vi.fn()} /></I18nextProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Start duel' }))
    let expected = get(createRecruiterDuel(DRAFT_CATALOG, 'hot-seat-001', drawHistory.createDrawContext(DRAFT_CATALOG)))
    fireEvent.click(screen.getByRole('button', { name: 'Heads' }))
    act(() => vi.advanceTimersByTime(850))
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
        expect(screen.getByRole('button', { name: 'Pass' })).toBeEnabled()
        fireEvent.click(screen.getByRole('button', { name: 'Pass' }))
        expected = get(passAuction(expected, participant, DRAFT_CATALOG))
      }
      fireEvent.click(screen.getByRole('button', { name: 'Next round' }))
      expected = get(nextAuctionRound(expected, DRAFT_CATALOG))
      if (expected.phase === 'NEXT_ROUND') expected = get(revealNextAuctionRound(expected))
    }
    expect(checkedFull).toBe(true); expect(checkedOneDefender).toBe(true)
    expect(screen.getAllByText('11/11')).toHaveLength(2)
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
  })
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
    expect(screen.getByRole('status')).toHaveTextContent('Recent history could not be restored or saved')
  })
  it('labels a double-pass assignment separately from a voluntary bid', async () => {
    vi.useFakeTimers()
    const i18n = await createI18n('en')
    render(<I18nextProvider i18n={i18n}><AuctionPage onDraftFree={vi.fn()} /></I18nextProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Start duel' }))
    fireEvent.click(screen.getByRole('button', { name: 'Heads' }))
    act(() => vi.advanceTimersByTime(850))
    fireEvent.click(screen.getByRole('button', { name: 'Start auction' }))
    fireEvent.click(screen.getByRole('button', { name: 'Pass' }))
    fireEvent.click(screen.getByRole('button', { name: 'Pass' }))
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
    act(() => vi.advanceTimersByTime(850))
    fireEvent.click(screen.getByRole('button', { name: 'Start auction' }))
    expect(screen.getByText('CPU evaluating…')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(650))
    expect(screen.queryByText('CPU evaluating…')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pass' })).toBeEnabled()
  })
  it('lets the player choose a coin side before revealing and bidding', async () => {
    vi.useFakeTimers()
    const i18n = await createI18n('en')
    render(<I18nextProvider i18n={i18n}><AuctionPage onDraftFree={vi.fn()} /></I18nextProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Start duel' }))
    expect(screen.getByRole('button', { name: 'Heads' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Heads' }))
    expect(screen.getByText('Coin toss')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(850))
    fireEvent.click(screen.getByRole('button', { name: 'Start auction' }))
    expect(screen.getByRole('button', { name: 'Bid' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Pass' })).toBeEnabled()
  })
})
