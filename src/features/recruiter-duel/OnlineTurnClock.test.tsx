import { act, fireEvent, render, renderHook, screen, within } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createI18n, type Language } from '../../i18n'
import { OnlineError, type RoomSnapshot } from '../online/contracts'
import type { OnlineGateway } from '../online/onlineGateway'
import { useOnlineSync } from '../online/useOnlineSync'
import type { RecruiterDuelGame, RecruiterId } from './auctionTypes'
import type { OnlineDuelBinding } from './onlineBinding'
import { OnlineTurnClock } from './OnlineTurnClock'
import { formatClock, pendingSide } from './turnClock'

const NOW = Date.parse('2026-10-25T12:00:00Z')
const names = { recruiter_one: 'Ana', recruiter_two: 'Beto' }
const game = (phase: string, active: RecruiterId | null = null) => ({ phase, activeParticipant: active }) as unknown as RecruiterDuelGame
function binding(over: Partial<OnlineDuelBinding> & { secondsLeft: number }): OnlineDuelBinding {
  const { secondsLeft, ...rest } = over
  return { mySide: 'recruiter_one', strategyReady: { recruiter_one: false, recruiter_two: false }, deadlineAt: new Date(NOW + secondsLeft * 1000).toISOString(), clockOffsetMs: 0, claimTimeout: vi.fn(), ...rest } as unknown as OnlineDuelBinding
}
async function show(current: RecruiterDuelGame, online: OnlineDuelBinding, language: Language = 'en') {
  const i18n = await createI18n(language)
  const view = render(<I18nextProvider i18n={i18n}><OnlineTurnClock game={current} online={online} names={names} /></I18nextProvider>)
  return { i18n, ...view }
}

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW) })
afterEach(() => { vi.useRealTimers() })

describe('turn countdown', () => {
  it('formats minutes and seconds and knows who the server is waiting for', () => {
    expect(formatClock(125)).toBe('02:05'); expect(formatClock(0.2)).toBe('00:01'); expect(formatClock(-4)).toBe('00:00')
    expect(pendingSide(game('BIDDING', 'recruiter_two'), binding({ secondsLeft: 9 }))).toBe('recruiter_two')
    expect(pendingSide(game('ROUND_RESULT'), binding({ secondsLeft: 9 }))).toBeNull()
    const arranging = game('TEAMS_COMPLETED')
    expect(pendingSide(arranging, binding({ secondsLeft: 9 }))).toBe('recruiter_one')
    expect(pendingSide(arranging, binding({ secondsLeft: 9, strategyReady: { recruiter_one: true, recruiter_two: false } }))).toBe('recruiter_two')
    expect(pendingSide(arranging, binding({ secondsLeft: 9, strategyReady: { recruiter_one: true, recruiter_two: true } }))).toBeNull()
  })
  it.each([['en', 'You have 01:30 left', "Beto's turn: 01:30"], ['es-AR', 'Te quedan 01:30', 'Turno de Beto: 01:30'], ['pt-BR', 'Você tem 01:30', 'Vez de Beto: 01:30']] as const)('shows the remaining time in both roles in %s and counts down', async (language, mine, theirs) => {
    const own = await show(game('BIDDING', 'recruiter_one'), binding({ secondsLeft: 90 }), language)
    expect(screen.getByRole('timer')).toHaveTextContent(mine)
    await act(async () => { vi.advanceTimersByTime(3000) })
    expect(screen.getByRole('timer')).toHaveTextContent(mine.replace('01:30', '01:27'))
    own.unmount()
    await show(game('BIDDING', 'recruiter_two'), binding({ secondsLeft: 93 }), language)
    expect(screen.getByRole('timer')).toHaveTextContent(theirs)
  })
  it('uses the server clock offset instead of the device clock', async () => {
    await show(game('BIDDING', 'recruiter_one'), binding({ secondsLeft: 90, clockOffsetMs: 30000 }))
    expect(screen.getByRole('timer')).toHaveTextContent('You have 01:00 left')
  })
  it('renders nothing without a deadline or when nobody is pending', async () => {
    const { container } = await show(game('BIDDING', 'recruiter_one'), binding({ secondsLeft: 9, deadlineAt: null }))
    expect(container).toBeEmptyDOMElement()
    const none = await show(game('ROUND_RESULT'), binding({ secondsLeft: 9 }))
    expect(none.container.querySelector('.turn-clock')).toBeNull()
  })
  it('announces politely only at 30 and 10 seconds, never every second', async () => {
    await show(game('BIDDING', 'recruiter_one'), binding({ secondsLeft: 40 }))
    const live = () => document.querySelector('[aria-live="polite"]')!.textContent
    expect(live()).toBe('')
    expect(screen.getByRole('timer')).not.toHaveAttribute('aria-live', 'polite')
    await act(async () => { vi.advanceTimersByTime(10000) })
    expect(live()).toBe('30 seconds left for your turn.')
    await act(async () => { vi.advanceTimersByTime(5000) })
    expect(live()).toBe('30 seconds left for your turn.')
    await act(async () => { vi.advanceTimersByTime(20000) })
    expect(live()).toBe('10 seconds left for your turn.')
  })
  it('offers the claim only to the player who waits, only after the deadline and its grace, and asks before claiming', async () => {
    const online = binding({ secondsLeft: 10 })
    const view = await show(game('BIDDING', 'recruiter_two'), online)
    expect(screen.queryByRole('button', { name: /Claim victory/ })).not.toBeInTheDocument()
    await act(async () => { vi.advanceTimersByTime(10000) })
    expect(screen.getByRole('timer')).toHaveTextContent("Beto's time is up")
    expect(screen.queryByRole('button', { name: /Claim victory/ })).not.toBeInTheDocument()
    await act(async () => { vi.advanceTimersByTime(5000) })
    const claim = screen.getByRole('button', { name: 'Claim victory: Beto did not respond' })
    expect(screen.getByRole('alert')).toHaveTextContent('If you claim the win, the match ends now.')
    fireEvent.click(claim)
    const dialog = screen.getByRole('dialog')
    expect(online.claimTimeout).not.toHaveBeenCalled()
    expect(dialog).toHaveTextContent('Claiming ends the match and Ana wins.')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Claim victory: Beto did not respond' }))
    expect(online.claimTimeout).toHaveBeenCalledTimes(1)
    view.unmount()
    // The one who is late keeps control and gets no claim button.
    await show(game('BIDDING', 'recruiter_one'), binding({ secondsLeft: -60 }))
    expect(screen.getByRole('timer')).toHaveTextContent('Your time is up')
    expect(screen.queryByRole('button', { name: /Claim victory/ })).not.toBeInTheDocument()
  })
  it('works while strategies are pending: the player who already chose can claim', async () => {
    await show(game('TEAMS_COMPLETED'), binding({ secondsLeft: -30, strategyReady: { recruiter_one: true, recruiter_two: false } }))
    expect(screen.getByRole('button', { name: 'Claim victory: Beto did not respond' })).toBeEnabled()
  })
})

describe('claim errors', () => {
  const room = { roomId: crypto.randomUUID(), version: 4 } as RoomSnapshot
  const gatewayFailing = (error: OnlineError) => ({ claimTimeout: vi.fn(async () => { throw error }) }) as unknown as OnlineGateway
  it.each([['BACKEND_OUTDATED'], ['INVALID_PHASE']] as const)('reports %s without breaking the duel', async (code) => {
    vi.useRealTimers()
    const setError = vi.fn()
    const gateway = gatewayFailing(new OnlineError(code))
    const { result } = renderHook(() => useOnlineSync(gateway, room, vi.fn(), setError))
    await act(async () => { result.current.claimTimeout(); await Promise.resolve(); await Promise.resolve() })
    expect(gateway.claimTimeout).toHaveBeenCalledWith(room.roomId, expect.any(String))
    expect(setError).toHaveBeenCalledWith(code)
  })
  it('has a clear BACKEND_OUTDATED message in every language that names the new migration', async () => {
    for (const language of ['es-AR', 'en', 'pt-BR'] as const) {
      const i18n = await createI18n(language)
      expect(i18n.t('online.errors.BACKEND_OUTDATED')).toContain('202610250002_online_turn_timer.sql')
    }
  })
})
