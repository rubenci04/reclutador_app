import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import type { ReactNode } from 'react'
import { createI18n } from '../../i18n'
import { DRAFT_CATALOG } from '../draft/catalog'
import { auctionAvailability, beginBidding, createRecruiterDuel, passAuction, placeBid, revealCoinToss, startCoinToss } from './auctionEngine'
import type { AuctionTransition, RecruiterDuelGame } from './auctionTypes'
import { NoticeToasts } from './NoticeToasts'
import { useAuctionNotices } from './useAuctionNotices'

const must = (result: AuctionTransition): RecruiterDuelGame => { if (!result.ok) throw new Error(result.error); return result.game }
const names = { recruiter_one: 'Ana', recruiter_two: 'Beto' }
let wrapper: (props: { children: ReactNode }) => ReactNode

beforeEach(async () => {
  vi.useFakeTimers()
  const i18n = await createI18n('en')
  wrapper = ({ children }) => <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
})
afterEach(() => { vi.useRealTimers() })

function started(): RecruiterDuelGame {
  const created = createRecruiterDuel(DRAFT_CATALOG, 'notices')
  if (!created.ok) throw new Error(created.error)
  return must(beginBidding(must(revealCoinToss(must(startCoinToss(created.game, 'heads'))))))
}

describe('auction notices', () => {
  it('says nothing about what was already there, then reports a bid, a pass and the award', () => {
    const first = started()
    const hook = renderHook(({ game }) => useAuctionNotices(game, DRAFT_CATALOG, names, null), { wrapper, initialProps: { game: first as RecruiterDuelGame | null } })
    act(() => { vi.advanceTimersByTime(50) })
    expect(hook.result.current.notices).toEqual([])
    const opener = first.activeParticipant!
    const bid = must(placeBid(first, opener, auctionAvailability(first, opener, DRAFT_CATALOG).minimum, DRAFT_CATALOG))
    hook.rerender({ game: bid }); act(() => { vi.advanceTimersByTime(50) })
    expect(hook.result.current.notices.at(-1)?.text).toMatch(/bid \d+M for/)
    const other = bid.activeParticipant!
    const awarded = must(passAuction(bid, other, DRAFT_CATALOG))
    hook.rerender({ game: awarded }); act(() => { vi.advanceTimersByTime(50) })
    expect(hook.result.current.notices.map((notice) => notice.text).join(' ')).toMatch(/gets .* for \d+M\./)
  })
  it('explains a block once per turn, lets the person dismiss it, and removes it by itself', () => {
    const game = started()
    const hook = renderHook(({ message }) => useAuctionNotices(game, DRAFT_CATALOG, names, message ? { key: 'turn-1', message } : null), { wrapper, initialProps: { message: 'You cannot bid: position full.' as string | null } })
    act(() => { vi.advanceTimersByTime(50) })
    expect(hook.result.current.notices).toMatchObject([{ tone: 'warning', text: 'You cannot bid: position full.' }])
    hook.rerender({ message: 'You cannot bid: position full.' }); act(() => { vi.advanceTimersByTime(50) })
    expect(hook.result.current.notices).toHaveLength(1)
    act(() => hook.result.current.push('warning', 'Another reason'))
    expect(hook.result.current.notices).toHaveLength(2)
    act(() => hook.result.current.dismiss(hook.result.current.notices[0].id))
    expect(hook.result.current.notices.map((notice) => notice.text)).toEqual(['Another reason'])
    act(() => { vi.advanceTimersByTime(13000) })
    expect(hook.result.current.notices).toEqual([])
  })
  it('renders warnings as alerts with a close button', () => {
    const onDismiss = vi.fn()
    render(wrapper({ children: <NoticeToasts notices={[{ id: 1, tone: 'warning', text: 'Blocked because…' }, { id: 2, tone: 'info', text: 'Ana passed.' }]} onDismiss={onDismiss} /> }) as ReactNode as never)
    expect(screen.getByRole('alert')).toHaveTextContent('Blocked because…')
    expect(screen.getByRole('status')).toHaveTextContent('Ana passed.')
    fireEvent.click(screen.getAllByRole('button', { name: 'Close notice' })[0])
    expect(onDismiss).toHaveBeenCalledWith(1)
  })
})
