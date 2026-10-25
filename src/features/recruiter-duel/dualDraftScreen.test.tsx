import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { audio } from '../audio/audioEngine'
import { AuctionPage } from './AuctionPage'
import * as drawHistory from './drawHistory'

beforeEach(() => { localStorage.clear(); vi.spyOn(drawHistory, 'newDrawSeed').mockReturnValue('dual-ui-1'); vi.spyOn(audio, 'play').mockReturnValue(false) })
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); localStorage.clear() })

describe('live draw screen for two categories', () => {
  it('shows both draws at once, lets the person sign and discard, and the computer decides on its own', async () => {
    vi.useFakeTimers()
    const i18n = await createI18n('en')
    render(<I18nextProvider i18n={i18n}><AuctionPage onDraftFree={vi.fn()} /></I18nextProvider>)
    fireEvent.click(screen.getByRole('button', { name: i18n.t('entry.local') }))
    fireEvent.click(screen.getByText(i18n.t('entry.customize')))
    fireEvent.change(screen.getByLabelText('Opponent'), { target: { value: 'cpu' } })
    fireEvent.change(screen.getByLabelText('Second team category'), { target: { value: 'EUROPE_CURRENT' } })
    fireEvent.click(screen.getByRole('button', { name: 'Start duel' }))
    expect(screen.getByRole('region', { name: 'LIVE DRAW · TWO TEAMS' })).toBeInTheDocument()
    expect(document.querySelectorAll('.dual-column')).toHaveLength(2)
    expect(screen.getAllByText(/signed$/).length).toBeGreaterThan(0)
    const sign = screen.getByRole('button', { name: /^Sign for \d+M$/ })
    fireEvent.click(sign)
    expect(screen.getByText('1/11 signed')).toBeInTheDocument()
    // New crossed-category games start with 5 discards per side, shown as 5 pips and as text.
    expect(screen.getAllByText(/5\/5/).length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: /^Discard \(5 left\)$/ }))
    expect(screen.getByRole('button', { name: /^Discard \(4 left\)$/ })).toBeInTheDocument()
    expect(screen.getByText('CPU is deciding…')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(1200))
    expect(screen.queryByText('CPU is deciding…')).toBeInTheDocument()
    expect(screen.getAllByText(/^CPU (signed|discarded) /).length).toBeGreaterThan(0)
  })
  it('lets two people draw independently on the same screen (hot-seat)', async () => {
    const i18n = await createI18n('en')
    render(<I18nextProvider i18n={i18n}><AuctionPage onDraftFree={vi.fn()} /></I18nextProvider>)
    fireEvent.click(screen.getByRole('button', { name: i18n.t('entry.local') }))
    fireEvent.click(screen.getByText(i18n.t('entry.customize')))
    fireEvent.change(screen.getByLabelText('Second team category'), { target: { value: 'EUROPE_CURRENT' } })
    fireEvent.click(screen.getByRole('button', { name: 'Start duel' }))
    expect(screen.getAllByRole('button', { name: /^Sign for \d+M$/ })).toHaveLength(2)
    fireEvent.click(screen.getAllByRole('button', { name: /^Sign for \d+M$/ })[1])
    expect(screen.getByText('1/11 signed')).toBeInTheDocument()
    expect(screen.getByText('0/11 signed')).toBeInTheDocument()
  })
})
