import { expect, it } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { TeamPowerPanel } from './TeamPowerPanel'
import { teamPower } from './teamPower'
import { generateCpuTeam } from '../local-match/cpuTeam'
import { DRAFT_CATALOG } from '../draft/catalog'
import { createRecruiterDuel } from './auctionEngine'
import { defaultBudgetForMode } from '../player-catalog/leagueCollections'
import { CATEGORY_GROUPS } from '../themed-modes/categoryTree'

it('uses 200/250 for new edition defaults (roster-budget-v2)', () => {
  for (const id of CATEGORY_GROUPS.flatMap((g) => g.modes)) expect(defaultBudgetForMode(id)).toBe(id.includes('LEGENDS') ? 250 : 200)
})

it.each(['es-AR', 'en', 'pt-BR'] as const)('distinguishes base and effective strength and shows the goalkeeper without changing power in %s', async (language) => {
  const created = createRecruiterDuel(DRAFT_CATALOG, 'ux-four')
  if (!created.ok) throw new Error(created.error)
  const lineup = generateCpuTeam(DRAFT_CATALOG, 'ux-four').team.lineup
  const game = { ...created.game, teams: { ...created.game.teams, recruiter_one: { lineup, spent: 90 } } }
  const before = teamPower(game, 'recruiter_one', DRAFT_CATALOG)!
  const keeper = DRAFT_CATALOG.find((p) => p.id === lineup.GK)!
  const i18n = await createI18n(language)
  const view = render(<I18nextProvider i18n={i18n}><TeamPowerPanel game={game} catalog={DRAFT_CATALOG} sides={['recruiter_one']} names={{ recruiter_one: 'A', recruiter_two: 'B' }} /></I18nextProvider>)
  expect(screen.getByText(i18n.t('auctionUX.effective'))).toBeVisible()
  expect(screen.getByText(i18n.t('auctionUX.base', { value: before.base.global.toFixed(1) }))).toBeVisible()
  expect(screen.getByText(i18n.t('auctionUX.keeper', { name: keeper.name, rating: keeper.overall_rating }))).toBeVisible()
  expect(view.container.querySelector('.power-details')).not.toHaveAttribute('open')
  fireEvent.click(screen.getByText(i18n.t('auctionUX.bonuses')))
  expect(view.container.querySelector('.power-details')).toHaveAttribute('open')
  expect(teamPower(game, 'recruiter_one', DRAFT_CATALOG)).toEqual(before)
})
