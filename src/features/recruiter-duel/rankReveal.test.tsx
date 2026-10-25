import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { AuctionPage } from './AuctionPage'
import * as drawHistory from './drawHistory'
import { SigningReveal } from './SigningReveal'
import { rankBracket } from '../player-catalog/categoryRanking'

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); localStorage.clear() })
beforeEach(() => localStorage.clear())

async function open(language: 'es-AR' | 'en' | 'pt-BR') {
  vi.useFakeTimers()
  vi.spyOn(drawHistory, 'newDrawSeed').mockReturnValue('rank-reveal')
  const i18n = await createI18n(language)
  render(<I18nextProvider i18n={i18n}><AuctionPage onDraftFree={vi.fn()} /></I18nextProvider>)
  fireEvent.click(screen.getByRole('button', { name: i18n.t('entry.local') }))
  fireEvent.click(screen.getByText(i18n.t('entry.customize')))
  fireEvent.click(screen.getByRole('button', { name: i18n.t('duel.start') }))
  fireEvent.click(screen.getByRole('button', { name: i18n.t('duel.heads') }))
  act(() => vi.advanceTimersByTime(3000))
  // REVEAL_PLAYER: the candidate is visible, but its rank is still private.
  expect(document.querySelector('.auction-candidate h2')).not.toBeNull()
  expect(document.querySelector('.rank-chip')).toBeNull()
  expect(document.querySelector('.signing-reveal')).toBeNull()
  expect(document.body.textContent).not.toMatch(/#\d+\s*\/\s*150/)
  expect(document.querySelector('[aria-label*="150"]')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: i18n.t('duel.beginBidding') }))
  return i18n
}

describe('RANK-REVEAL-009 the ranking is a reward after the signing', () => {
  it.each(['es-AR', 'en', 'pt-BR'] as const)('hides the position while on sale and reveals it once the award is confirmed in %s', async (language) => {
    const i18n = await open(language)
    // On sale: no chip, no position in the text, no accessible label that anticipates it.
    expect(document.querySelector('.rank-chip')).toBeNull()
    expect(document.querySelector('.signing-reveal')).toBeNull()
    expect(document.body.textContent).not.toMatch(/#\d+\s*\/\s*150/)
    expect(document.querySelector('[aria-label*="150"]')).toBeNull()
    const name = document.querySelector('.auction-candidate h2')!.textContent!
    // Confirm the award: the first participant bids and the second passes.
    fireEvent.click(document.querySelector('.bid-primary') as HTMLElement)
    fireEvent.click(document.querySelector('.bid-pass') as HTMLElement)
    const reveal = document.querySelector('.signing-reveal') as HTMLElement
    expect(reveal).not.toBeNull()
    expect(reveal.textContent).toContain(i18n.t('ranking.signed'))
    expect(reveal.textContent).toMatch(/TOP \d+ · #\d+\/150/)
    expect(reveal.querySelector('b')!.getAttribute('aria-label')).toMatch(/\d+/)
    expect(name.length).toBeGreaterThan(2)
    // Afterwards the position stays with the signing in the squad board.
    fireEvent.click(screen.getByRole('button', { name: i18n.t('auctionBanner.confirmSigning') }))
    expect([...document.querySelectorAll('.team-pitch')].map((pitch) => pitch.textContent).join(' ')).toMatch(/ · #\d+/)
  })
  it('brackets the position without inventing one, and shows nothing without a recoverable ranking', () => {
    expect([1, 3, 4, 10, 11, 25, 26, 50, 51, 150].map((rank) => rankBracket({ rank, total: 150 }))).toEqual([3, 3, 10, 10, 25, 25, 50, 50, 150, 150])
    expect(rankBracket({ rank: 2, total: 3 })).toBe(3)
    const { container } = render(<SigningReveal rank={null} />)
    expect(container.innerHTML).toBe('')
  })
})
