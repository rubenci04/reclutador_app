import { expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { AuctionPage } from './AuctionPage'
import * as engine from './auctionEngine'
import { GLOBAL_CURRENT } from '../player-catalog/globalCollection'
import { generateCpuTeam } from '../local-match/cpuTeam'
import { CLASSIC_CONFIG } from './matchConfig'
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
