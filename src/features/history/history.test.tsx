import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { AuctionPage, COIN_TOSS_MS } from '../recruiter-duel/AuctionPage'
import { HELP_KEY } from '../onboarding/helpStore'
import { HISTORY_KEY, matchHistory, parseHistory, summarize, type HistoryEntry } from './matchHistory'

const entry = (id: string, outcome: HistoryEntry['outcome'], opponent: HistoryEntry['opponent'] = 'cpu', abandonedBy: HistoryEntry['abandonedBy'] = null): HistoryEntry =>
  ({ id, at: '2026-10-19T10:00:00.000Z', mode: 'GLOBAL_CLASSIC', opponent, names: { recruiter_one: 'Ana', recruiter_two: 'CPU' }, outcome, score: abandonedBy ? null : { recruiter_one: 2, recruiter_two: 1 }, abandonedBy })

beforeEach(() => { localStorage.clear(); matchHistory.forgetMemory(); localStorage.setItem(HELP_KEY, JSON.stringify({ tutorialSeen: true, hints: false, dismissed: [] })) })
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); localStorage.clear(); matchHistory.forgetMemory() })

describe('match history store', () => {
  it('records newest first, never twice, and totals by opponent', () => {
    matchHistory.record(entry('a', 'recruiter_one')); matchHistory.record(entry('b', 'recruiter_two', 'cpu', 'recruiter_one')); matchHistory.record(entry('a', 'draw'))
    const all = matchHistory.getSnapshot()
    expect(all.map((item) => item.id)).toEqual(['b', 'a'])
    expect(summarize(all, 'cpu')).toEqual({ played: 2, wins: 1, draws: 0, losses: 1, abandoned: 1 })
    expect(summarize(all, 'hotseat').played).toBe(0)
  })
  it('ignores malformed or oversized stored data and survives blocked storage', () => {
    expect(parseHistory('{"x":1}')).toEqual([])
    expect(parseHistory(JSON.stringify([{ id: 'x' }, entry('ok', 'draw')]))).toHaveLength(1)
    expect(parseHistory('not json')).toEqual([])
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    matchHistory.record(entry('mem', 'draw'))
    expect(matchHistory.getSnapshot().map((item) => item.id)).toEqual(['mem'])
  })
  it('clears the history', () => {
    matchHistory.record(entry('a', 'draw')); matchHistory.clear()
    expect(matchHistory.getSnapshot()).toEqual([])
    expect(localStorage.getItem(HISTORY_KEY)).toBeNull()
  })
})

async function startGame(versusCpu: boolean) {
  vi.useFakeTimers()
  const i18n = await createI18n('en')
  render(<I18nextProvider i18n={i18n}><AuctionPage onDraftFree={vi.fn()} /></I18nextProvider>)
  fireEvent.click(screen.getByRole('button', { name: i18n.t('entry.local') }))
  fireEvent.click(screen.getByText(i18n.t('entry.customize')))
  if (versusCpu) fireEvent.change(screen.getByLabelText('Opponent'), { target: { value: 'cpu' } })
  fireEvent.click(screen.getByRole('button', { name: 'Start duel' }))
  fireEvent.click(screen.getByRole('button', { name: 'Heads' }))
  act(() => vi.advanceTimersByTime(COIN_TOSS_MS))
}

describe('abandoning a match', () => {
  it('asks for confirmation, then records a defeat against the CPU and returns to the start', async () => {
    await startGame(true)
    fireEvent.click(screen.getByRole('button', { name: 'Abandon match' }))
    fireEvent.click(screen.getByRole('button', { name: 'Keep playing' }))
    expect(matchHistory.getSnapshot()).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: 'Abandon match' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, abandon and lose' }))
    const [saved] = matchHistory.getSnapshot()
    expect(saved).toMatchObject({ opponent: 'cpu', outcome: 'recruiter_two', abandonedBy: 'recruiter_one', score: null })
    expect(screen.getByRole('button', { name: 'Start duel' })).toBeInTheDocument()
    expect(screen.getByText(/1 played · 0 won · 0 drawn · 1 lost/)).toBeInTheDocument()
  })
  it('lets hot-seat players choose who gives up', async () => {
    await startGame(false)
    fireEvent.click(screen.getByRole('button', { name: 'Abandon match' }))
    fireEvent.click(screen.getByRole('button', { name: 'Recruiter two abandons' }))
    expect(matchHistory.getSnapshot()[0]).toMatchObject({ opponent: 'hotseat', outcome: 'recruiter_one', abandonedBy: 'recruiter_two' })
  })
})
