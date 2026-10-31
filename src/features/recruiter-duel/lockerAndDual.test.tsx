import { afterEach, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { AuctionPage } from './AuctionPage'
import * as engine from './auctionEngine'
import * as draws from './drawHistory'
import { GLOBAL_CURRENT } from '../player-catalog/globalCollection'
import { generateCpuTeam } from '../local-match/cpuTeam'
import { CLASSIC_CONFIG } from './matchConfig'
import { matchHistory } from '../history/matchHistory'

afterEach(() => { vi.restoreAllMocks(); localStorage.clear() })

it('TECH-004 BUG-06: closing the teams summary never hides the locker room', async () => {
  const created = engine.createRecruiterDuel(GLOBAL_CURRENT, 'locker-details', undefined, CLASSIC_CONFIG)
  if (!created.ok) throw new Error(created.error)
  const one = generateCpuTeam(GLOBAL_CURRENT, 'details-one').team.lineup
  const used = new Set(Object.values(one))
  const two = generateCpuTeam(GLOBAL_CURRENT.filter((player) => !used.has(player.id)), 'details-two').team.lineup
  vi.spyOn(engine, 'createRecruiterDuel').mockReturnValue({ ok: true, game: { ...created.game, phase: 'TEAMS_COMPLETED', teams: { recruiter_one: { lineup: one, spent: 60 }, recruiter_two: { lineup: two, spent: 60 } } } })
  vi.spyOn(draws, 'newDrawSeed').mockReturnValue('locker-details')
  const i18n = await createI18n('en')
  render(<I18nextProvider i18n={i18n}><AuctionPage onDraftFree={() => {}} /></I18nextProvider>)
  fireEvent.click(screen.getByRole('button', { name: 'Two players on this device' }))
  fireEvent.click(screen.getByRole('button', { name: /^Global/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Start duel' }))
  const recap = document.querySelector<HTMLDetailsElement>('details.lineup-recap')!
  expect(recap.querySelector('.team-comparison')).not.toBeNull()
  for (const selector of ['.locker-steps', '.lineup-organizer']) expect(document.querySelector(selector)?.closest('details.lineup-recap'), selector).toBeNull()
  fireEvent.click(screen.getByText(i18n.t('stages.showTeams')))
  recap.open = false
  expect(document.querySelector('.locker-steps')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Confirm eleven' })).toBeVisible()
})

it('TECH-004 BUG-07: the live dual draw offers five discards and records an abandonment', async () => {
  vi.spyOn(draws, 'newDrawSeed').mockReturnValue('dual-abandon')
  const record = vi.spyOn(matchHistory, 'record').mockImplementation(() => {})
  const i18n = await createI18n('en')
  render(<I18nextProvider i18n={i18n}><AuctionPage onDraftFree={() => {}} /></I18nextProvider>)
  fireEvent.click(screen.getByRole('button', { name: i18n.t('entry.cpu') }))
  fireEvent.click(screen.getByRole('button', { name: /^Global/ }))
  fireEvent.click(screen.getByText(i18n.t('entry.customize')))
  const second = screen.getByLabelText(i18n.t('playtest.opponentCategory')) as HTMLSelectElement
  fireEvent.change(second, { target: { value: [...second.options].map((option) => option.value).find((value) => value !== 'same' && value !== 'GLOBAL_CLASSIC')! } })
  fireEvent.click(screen.getByRole('button', { name: 'Start duel' }))
  expect(screen.getAllByText(i18n.t('hud.discards', { count: 5, total: 5 })).length).toBeGreaterThan(0)
  fireEvent.click(screen.getByRole('button', { name: i18n.t('abandon.open') }))
  fireEvent.click(screen.getByRole('button', { name: i18n.t('abandon.confirm') }))
  expect(record).toHaveBeenCalledWith(expect.objectContaining({ id: 'dual-abandon', outcome: 'recruiter_two', abandonedBy: 'recruiter_one', opponent: 'cpu', score: null }))
  expect(screen.getByRole('button', { name: i18n.t('entry.cpu') })).toBeInTheDocument()
})
