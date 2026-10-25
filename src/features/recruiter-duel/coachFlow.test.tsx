import { expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { AuctionPage } from './AuctionPage'
import * as engine from './auctionEngine'
import { GLOBAL_CURRENT } from '../player-catalog/globalCollection'
import { generateCpuTeam } from '../local-match/cpuTeam'
import { BENCH_SHOWCASE_V1, CLASSIC_CONFIG } from './matchConfig'
import * as draws from './drawHistory'

it('requires the coach decision before bench and ordering, then shows only power and tactics', async () => {
  const created = engine.createRecruiterDuel(GLOBAL_CURRENT, 'flow-fixture', undefined, { ...CLASSIC_CONFIG, budget: 120, coaches: true, coachReserve: 8 })
  if (!created.ok) throw new Error(created.error)
  const one = generateCpuTeam(GLOBAL_CURRENT, 'flow-one').team.lineup
  const used = new Set(Object.values(one))
  const two = generateCpuTeam(GLOBAL_CURRENT.filter((p) => !used.has(p.id)), 'flow-two').team.lineup
  const teams = { recruiter_one: { lineup: one, spent: 60 }, recruiter_two: { lineup: two, spent: 60 } }
  const create = vi.spyOn(engine, 'createRecruiterDuel').mockReturnValue({ ok: true, game: { ...created.game, phase: 'TEAMS_COMPLETED', teams } })
  const seed = vi.spyOn(draws, 'newDrawSeed').mockReturnValue('flow-fixture')
  const i18n = await createI18n('en')
  try {
    render(<I18nextProvider i18n={i18n}><AuctionPage onDraftFree={() => {}} /></I18nextProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Two players on this device' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start duel' }))
    expect(screen.queryByRole('button', { name: 'Confirm eleven' })).toBeNull()
    const coachButton = document.querySelector('.coach-grid .primary-action')!
    expect(coachButton).toBeInTheDocument()
    fireEvent.click(coachButton)
    expect(screen.getByRole('button', { name: 'Confirm eleven' })).toBeEnabled()
    const market = document.querySelector('.substitute-market')!
    const organizer = document.querySelector('.lineup-organizer')!
    expect(market).toBeInTheDocument()
    expect(market.compareDocumentPosition(organizer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm eleven' }))
    expect(screen.queryByRole('button', { name: 'Confirm eleven' })).toBeNull()
    fireEvent.click(document.querySelector('.coach-grid .primary-action')!)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm eleven' }))
    expect(document.querySelector('.lineup-organizer')).toBeNull()
    expect(document.querySelector('.substitute-market')).toBeNull()
    expect(document.querySelector('.coach-market')).toBeNull()
    expect(screen.getByRole('button', { name: 'Confirm strategy' })).toBeInTheDocument()
    expect(document.querySelector('.team-power')).toBeInTheDocument()
  } finally { create.mockRestore(); seed.mockRestore() }
})

it.each(['es-AR', 'en', 'pt-BR'] as const)('shows both coaches before the shared showcase and tracks the three locker steps in %s', async language => {
  const created = engine.createRecruiterDuel(GLOBAL_CURRENT, 'locker-fixture', undefined, { ...CLASSIC_CONFIG, budget: 160, coaches: true, coachReserve: 8, bench: BENCH_SHOWCASE_V1 })
  if (!created.ok) throw Error(created.error)
  const one = generateCpuTeam(GLOBAL_CURRENT, 'locker-one').team.lineup
  const used = new Set(Object.values(one))
  const two = generateCpuTeam(GLOBAL_CURRENT.filter(player => !used.has(player.id)), 'locker-two').team.lineup
  const create = vi.spyOn(engine, 'createRecruiterDuel').mockReturnValue({ ok: true, game: { ...created.game, phase: 'TEAMS_COMPLETED', teams: { recruiter_one: { lineup: one, spent: 60 }, recruiter_two: { lineup: two, spent: 60 } } } })
  const seed = vi.spyOn(draws, 'newDrawSeed').mockReturnValue('locker-fixture')
  const i18n = await createI18n(language)
  try {
    const { container } = render(<I18nextProvider i18n={i18n}><AuctionPage onDraftFree={() => {}} /></I18nextProvider>)
    fireEvent.click(screen.getByRole('button', { name: i18n.t('entry.local') }))
    fireEvent.click(screen.getByRole('button', { name: i18n.t('duel.start') }))
    const steps = screen.getByRole('list', { name: i18n.t('locker.stepsLabel') })
    expect(steps.children).toHaveLength(3)
    expect(steps.children[0]).toHaveAttribute('aria-current', 'step')
    const coaches = container.querySelectorAll('.coach-market')
    expect(coaches).toHaveLength(2)
    const showcase = container.querySelector('.bench-showcase')!
    for (const coach of coaches) expect(coach.compareDocumentPosition(showcase) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(showcase).toHaveTextContent(i18n.t('showcase.waiting'))
    expect(showcase.querySelectorAll('.showcase-card,.market-line')).toHaveLength(0)
    fireEvent.click(container.querySelector('.coach-grid .primary-action')!)
    // Choosing one coach must not announce the substitutes step while the other still waits.
    expect(steps.children[0]).toHaveAttribute('aria-current', 'step')
    expect(container.querySelectorAll('.showcase-card')).toHaveLength(0)
    fireEvent.click(container.querySelector('.coach-grid .primary-action')!)
    expect(steps.children[1]).toHaveAttribute('aria-current', 'step')
    expect(showcase.querySelectorAll('.showcase-card')).toHaveLength(10)
    const organizer = container.querySelector('.lineup-organizer')!
    expect(showcase.compareDocumentPosition(organizer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: i18n.t('showcase.finish') }))
    fireEvent.click(screen.getByRole('button', { name: i18n.t('showcase.finish') }))
    expect(steps.children[2]).toHaveAttribute('aria-current', 'step')
    expect(screen.getByRole('button', { name: i18n.t('lineup.confirm') })).toBeEnabled()
  } finally { create.mockRestore(); seed.mockRestore() }
})
