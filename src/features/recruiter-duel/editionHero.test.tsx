import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { AuctionPage } from './AuctionPage'
import { EditionHero } from './EditionHero'
import { boardPoint, nearestHit } from '../local-match/shortName'

afterEach(() => { cleanup(); localStorage.clear(); vi.useRealTimers() })

describe('UX-ENTRY-011 selected edition block', () => {
  it.each(['es-AR', 'en', 'pt-BR'] as const)('shows one prominent block with name, edition and the real budget in %s', async (language) => {
    const i18n = await createI18n(language)
    const view = (budget: number) => <I18nextProvider i18n={i18n}><EditionHero mode="BRAZIL_CURRENT" budget={budget} reserve={8}><button>start</button></EditionHero></I18nextProvider>
    const { container, rerender } = render(view(160))
    expect(container.querySelector('.edition-label')!.textContent).toBe(i18n.t('editionHero.label'))
    expect(container.querySelector('.edition-title')!.textContent).toBe(i18n.t('categoryTree.groups.brazil'))
    expect(container.querySelector('.edition-name')!.textContent).toBe(i18n.t('editionHero.current'))
    expect(container.querySelector('.edition-meta')!.textContent).toBe(i18n.t('editionHero.meta', { top: 150, budget: 160, reserve: 8 }))
    expect(container.querySelector('.edition-meta')!.textContent).toMatch(/Top 150/)
    expect(screen.getByRole('button', { name: 'start' })).toBeInTheDocument()
    rerender(view(235))
    expect(container.querySelector('.edition-meta')!.textContent).toContain('235')
  })
  it('names legends, keeps the rival category apart and never repeats itself', async () => {
    const i18n = await createI18n('es-AR')
    const { container } = render(<I18nextProvider i18n={i18n}><EditionHero mode="ARGENTINA_LEGENDS" rivalMode="SPAIN_LEAGUE" budget={220} reserve={8}><span /></EditionHero></I18nextProvider>)
    expect(container.querySelector('.edition-name')!.textContent).toBe(i18n.t('editionHero.legends'))
    expect(container.querySelectorAll('.edition-title')).toHaveLength(1)
    expect(container.querySelector('.edition-rival')!.textContent).toContain(i18n.t('categoryTree.groups.spain'))
    expect(container.querySelector('.edition-rival')!.textContent).not.toContain(i18n.t('categoryTree.groups.argentina'))
  })
  it('appears once in the entry screen, follows the selection and no longer duplicates «selected edition»', async () => {
    const i18n = await createI18n('es-AR')
    render(<I18nextProvider i18n={i18n}><AuctionPage onDraftFree={vi.fn()} /></I18nextProvider>)
    fireEvent.click(screen.getByRole('button', { name: i18n.t('entry.cpu') }))
    expect(document.querySelectorAll('.edition-hero')).toHaveLength(1)
    expect(document.body.textContent).not.toContain('Edición seleccionada')
    const before = document.querySelector('.edition-title')!.textContent
    fireEvent.click(screen.getByRole('button', { name: new RegExp(i18n.t('categoryTree.groups.brazil')) }))
    fireEvent.click(screen.getByRole('button', { name: new RegExp(i18n.t('categoryTree.options.BRAZIL_LEGENDS')) }))
    expect(document.querySelector('.edition-title')!.textContent).toBe(i18n.t('categoryTree.groups.brazil'))
    expect(document.querySelector('.edition-title')!.textContent).not.toBe(before)
    expect(document.querySelector('.edition-name')!.textContent).toBe(i18n.t('editionHero.legends'))
    expect(document.querySelector('.edition-meta')!.textContent).toContain('220')
    expect(document.querySelector('.mode-card.is-selected')).not.toBeNull()
    expect(screen.getByRole('button', { name: i18n.t('duel.start') })).toBeEnabled()
    expect(document.querySelector('.edition-hero .edition-start')).not.toBeNull()
  })
})

describe('SIM-FIELD-001 board coordinates', () => {
  it('maps a pointer to the painted pixels under responsive scaling', () => {
    const rect = { left: 10, top: 20, width: 320, height: 207.4 }
    // The board was painted at 640 px wide but is displayed at 320 px: a tap at its centre lands at the painted centre.
    const point = boardPoint({ x: 10 + 160, y: 20 + 103.7 }, rect, { width: 640, height: 414.8 })
    expect(point.x).toBeCloseTo(320, 1); expect(point.y).toBeCloseTo(207.4, 1)
    expect(boardPoint({ x: 50, y: 50 }, { left: 0, top: 0, width: 0, height: 0 }, { width: 640, height: 400 })).toEqual({ x: 50, y: 50 })
    const hits = [{ x: 200, y: 100, r: 30, label: 'A' }, { x: 420, y: 100, r: 30, label: 'B' }]
    expect(nearestHit(hits, boardPoint({ x: 105, y: 52 }, { left: 0, top: 0, width: 320, height: 200 }, { width: 640, height: 400 }).x, 100)?.label).toBe('A')
    expect(nearestHit(hits, 320, 100)).toBeNull()
  })
  it.each(['es-AR', 'en', 'pt-BR'] as const)('opens on the Argentine league, Current edition, in %s', async (language) => {
    const i18n = await createI18n(language)
    render(<I18nextProvider i18n={i18n}><AuctionPage onDraftFree={vi.fn()} /></I18nextProvider>)
    fireEvent.click(screen.getByRole('button', { name: i18n.t('entry.cpu') }))
    expect(document.querySelector('.edition-title')!.textContent).toBe(i18n.t('categoryTree.groups.argentina'))
    expect(document.querySelector('.edition-name')!.textContent).toBe(i18n.t('editionHero.current'))
  })
  it.each(['es-AR', 'en', 'pt-BR'] as const)('tapping a category changes the title at once, with its Current edition, and announces it in %s', async (language) => {
    const i18n = await createI18n(language)
    const scroll = vi.fn(); window.HTMLElement.prototype.scrollIntoView = scroll
    render(<I18nextProvider i18n={i18n}><AuctionPage onDraftFree={vi.fn()} /></I18nextProvider>)
    fireEvent.click(screen.getByRole('button', { name: i18n.t('entry.cpu') }))
    fireEvent.click(screen.getByRole('button', { name: new RegExp(i18n.t('categoryTree.groups.mexico')) }))
    expect(document.querySelector('.edition-title')!.textContent).toBe(i18n.t('categoryTree.groups.mexico'))
    expect(document.querySelector('.edition-name')!.textContent).toBe(i18n.t('editionHero.current'))
    const live = document.querySelector('.mode-selector [aria-live="polite"]')!
    expect(live.textContent).toBe(i18n.t('categoryTree.selectedAnnounce', { name: `${i18n.t('categoryTree.groups.mexico')} · ${i18n.t('editionHero.current')}` }))
    expect(scroll).toHaveBeenCalled()
    // Tapping Legends inside the open category changes the edition line and the announcement.
    fireEvent.click(screen.getByRole('button', { name: new RegExp(i18n.t('categoryTree.options.MEXICO_LEGENDS')) }))
    expect(document.querySelector('.edition-name')!.textContent).toBe(i18n.t('editionHero.legends'))
    expect(live.textContent).toContain(i18n.t('editionHero.legends'))
    // Back to the list and tapping the same category keeps the edition already chosen.
    fireEvent.click(screen.getByRole('button', { name: i18n.t('categoryTree.back') }))
    fireEvent.click(screen.getByRole('button', { name: new RegExp(i18n.t('categoryTree.groups.mexico')) }))
    expect(document.querySelector('.edition-name')!.textContent).toBe(i18n.t('editionHero.legends'))
  })
  it('keeps the budget and the edition coherent when the category changes', async () => {
    const i18n = await createI18n('en')
    render(<I18nextProvider i18n={i18n}><AuctionPage onDraftFree={vi.fn()} /></I18nextProvider>)
    fireEvent.click(screen.getByRole('button', { name: i18n.t('entry.cpu') }))
    const meta = () => document.querySelector('.edition-meta')!.textContent
    fireEvent.click(screen.getByRole('button', { name: new RegExp(i18n.t('categoryTree.groups.brazil')) }))
    const brazil = meta()
    fireEvent.click(screen.getByRole('button', { name: new RegExp(i18n.t('categoryTree.options.BRAZIL_LEGENDS')) }))
    expect(meta()).not.toBe(brazil)
    expect(meta()).toContain('220')
  })
  it('the title always names the category you are standing on, also after leaving and coming back to the menu', async () => {
    const i18n = await createI18n('es-AR')
    render(<I18nextProvider i18n={i18n}><AuctionPage onDraftFree={vi.fn()} /></I18nextProvider>)
    const title = () => document.querySelector('.edition-title')!.textContent
    const open = () => fireEvent.click(screen.getByRole('button', { name: i18n.t('entry.cpu') }))
    const group = (id: string) => fireEvent.click(screen.getByRole('button', { name: new RegExp(i18n.t('categoryTree.groups.' + id)) }))
    open(); group('brazil'); expect(title()).toBe(i18n.t('categoryTree.groups.brazil'))
    fireEvent.click(screen.getByRole('button', { name: i18n.t('categoryTree.back') }))
    group('spain'); expect(title()).toBe(i18n.t('categoryTree.groups.spain'))
    fireEvent.click(screen.getByRole('button', { name: i18n.t('entry.back') }))
    open(); expect(title()).toBe(i18n.t('categoryTree.groups.spain'))
    group('mexico'); expect(title()).toBe(i18n.t('categoryTree.groups.mexico'))
    expect(document.querySelector('.mode-card.is-selected')).not.toBeNull()
  })
})
