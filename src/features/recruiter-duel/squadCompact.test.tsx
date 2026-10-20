import { expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { catalogForMode } from '../themed-modes/modeCatalog'
import { generateCpuTeam } from '../local-match/cpuTeam'
import { createRecruiterDuel } from './auctionEngine'
import { CLASSIC_CONFIG } from './matchConfig'
import { LineupOrganizer } from './LineupOrganizer'
import { CoachMarket } from './CoachMarket'
import type { RecruiterDuelGame } from './auctionTypes'

it.each(['es-AR', 'en', 'pt-BR'] as const)('keeps swaps and coach decisions available with secondary details folded in %s', async (language) => {
  const catalog = catalogForMode('ARGENTINA_CURRENT')
  const creation = createRecruiterDuel(catalog, 'compact', undefined, { ...CLASSIC_CONFIG, coaches: true, coachReserve: 8 })
  if (!creation.ok) throw new Error(creation.error)
  const lineup = generateCpuTeam(catalog, 'compact').team.lineup
  const used = new Set(Object.values(lineup))
  const player = catalog.find((p) => p.position === 'DEF' && !used.has(p.id))!
  const game: RecruiterDuelGame = { ...creation.game, phase: 'TEAMS_COMPLETED', manualBench: true, coachMode: 'ARGENTINA_CURRENT', teams: { ...creation.game.teams, recruiter_one: { lineup, spent: 60, bench: [{ position: 'DEF', playerId: player.id }] } } }
  const i18n = await createI18n(language)
  const onSwap = vi.fn(() => true); const hire = vi.fn()
  const view = render(<I18nextProvider i18n={i18n}>
    <LineupOrganizer game={game} participant="recruiter_one" name="One" catalog={catalog} confirmed={false} onSwap={() => null} onBenchSwap={onSwap} onConfirm={vi.fn()} onEdit={vi.fn()} />
    <CoachMarket game={game} participant="recruiter_one" name="One" locked={false} onHire={hire} onDecline={vi.fn()} />
  </I18nextProvider>)
  expect(screen.queryByRole('button', { name: i18n.t('lineup.editMode') })).toBeNull()
  expect(view.container.querySelector('.bench-swap')).not.toHaveAttribute('open')
  fireEvent.click(view.container.querySelector('[data-bench="0"]')!)
  fireEvent.click(view.container.querySelector('[data-slot="LB"] button')!)
  expect(onSwap).toHaveBeenCalledWith(0, 'LB')
  fireEvent.click(screen.getByText(i18n.t('squad.listChanges')))
  expect(screen.getByRole('button', { name: i18n.t('lineup.benchSwap.action') })).toBeVisible()
  const details = view.container.querySelectorAll('.coach-details')
  expect(details).toHaveLength(3)
  expect([...details].every((element) => !element.hasAttribute('open'))).toBe(true)
  fireEvent.click(details[0].querySelector('summary')!)
  expect(details[0]).toHaveAttribute('open')
  fireEvent.click(view.container.querySelector('.coach-grid .primary-action')!)
  expect(hire).toHaveBeenCalledOnce()
})
