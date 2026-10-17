import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { AuctionPage } from './AuctionPage'
import { PlayerIdentity } from './PlayerIdentity'
import { DRAFT_CATALOG } from '../draft/catalog'

afterEach(() => vi.useRealTimers())

describe('single-player auction interface', () => {
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
