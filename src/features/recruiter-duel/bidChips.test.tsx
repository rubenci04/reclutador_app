import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { audio } from '../audio/audioEngine'
import { AuctionPage, COIN_TOSS_MS } from './AuctionPage'
import * as drawHistory from './drawHistory'

beforeEach(() => { localStorage.clear(); vi.spyOn(drawHistory, 'newDrawSeed').mockReturnValue('coin-seed-1'); vi.spyOn(audio, 'play').mockReturnValue(false) })
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); localStorage.clear() })

describe('quick bid chips', () => {
  it('fill the offer, respect the safe maximum and mark the active recruiter', async () => {
    vi.useFakeTimers()
    const i18n = await createI18n('en')
    render(<I18nextProvider i18n={i18n}><AuctionPage onDraftFree={vi.fn()} /></I18nextProvider>)
    fireEvent.click(screen.getByRole('button', { name: i18n.t('entry.local') }))
    fireEvent.click(screen.getByText(i18n.t('entry.customize')))
    fireEvent.click(screen.getByRole('button', { name: 'Start duel' }))
    fireEvent.click(screen.getByRole('button', { name: 'Heads' }))
    act(() => vi.advanceTimersByTime(COIN_TOSS_MS))
    fireEvent.click(screen.getByRole('button', { name: 'Start auction' }))
    const input = screen.getByLabelText('Bid amount') as HTMLInputElement
    const minimum = Number(input.min)
    expect(document.querySelector('.bid-panel')?.className).toMatch(/bid-panel-recruiter_(one|two)/)
    fireEvent.click(screen.getByRole('button', { name: '+2M' }))
    expect(Number(input.value)).toBe(minimum + 2)
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^Min\\. ${minimum}M$`) }))
    expect(Number(input.value)).toBe(minimum)
    const max = Number(input.max)
    fireEvent.click(screen.getByRole('button', { name: `Safe max ${max}M` }))
    expect(Number(input.value)).toBe(max)
    expect(screen.getByRole('button', { name: '+1M' })).toBeDisabled()
    expect(screen.getByRole('img', { name: /Budget risk/ })).toBeInTheDocument()
  })
})
