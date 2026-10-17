import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { AuctionPage } from './AuctionPage'

afterEach(() => vi.useRealTimers())

describe('single-player auction interface', () => {
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
