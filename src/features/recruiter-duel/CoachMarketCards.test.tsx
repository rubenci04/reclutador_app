import { fireEvent, render } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { describe, expect, it, vi } from 'vitest'
import { createI18n } from '../../i18n'
import { CoachMarket } from './CoachMarket'
import { createRecruiterDuel } from './auctionEngine'
import { CLASSIC_CONFIG } from './matchConfig'
import { catalogForMode } from '../themed-modes/modeCatalog'
import { COACH_MARKET_V2, coachEffect } from '../coaches/coachRules'
import { coachOffersFor } from './coachHiring'
import type { RecruiterDuelGame } from './auctionTypes'
import type { ThemedModeId } from '../themed-modes/modeTypes'

function marketGame(mode: ThemedModeId): RecruiterDuelGame {
  const created = createRecruiterDuel(catalogForMode(mode), 'cards-1', undefined, { ...CLASSIC_CONFIG, budget: 200, coaches: true, coachReserve: 8, coachMarket: COACH_MARKET_V2 })
  if (!created.ok) throw new Error(created.error)
  const team = (spent: number) => ({ ...created.game.teams.recruiter_one, spent })
  return { ...created.game, coachMode: mode, phase: 'TEAMS_COMPLETED', teams: { recruiter_one: team(150), recruiter_two: team(150) } }
}

describe('coach market cards', () => {
  it.each(['es-AR', 'en', 'pt-BR'] as const)('shows six compact cards with club, years, specialty, price and bonus in %s', async (language) => {
    const i18n = await createI18n(language)
    for (const mode of ['ITALY_CURRENT', 'ITALY_LEGENDS', 'MEXICO_CURRENT', 'MEXICO_LEGENDS'] as const) {
      const game = marketGame(mode)
      const onHire = vi.fn()
      const { container, unmount } = render(<I18nextProvider i18n={i18n}><CoachMarket game={game} participant="recruiter_one" name="One" locked={false} onHire={onHire} onDecline={vi.fn()} /></I18nextProvider>)
      const cards = [...container.querySelectorAll('.coach-card')]
      expect(cards, mode).toHaveLength(6)
      expect(container.querySelector('.coach-grid-six')).not.toBeNull()
      const offers = coachOffersFor(game, 'recruiter_one')
      cards.forEach((card, index) => {
        const coach = offers[index]
        const text = card.textContent ?? ''
        expect(text).toContain(`${coach.name} ${coach.surname}`)
        if (coach.period) expect(text).toContain(String(coach.period[0]))
        expect(text).toContain(coach.team)
        expect(card.querySelectorAll('.coach-stats li')).toHaveLength(3)
        const effect = coachEffect(coach)
        expect(card.querySelector('.coach-stats')?.textContent).toContain(effect.attack.toFixed(1))
        expect(card.getAttribute('data-tier')).toBe(coach.tier)
        expect(text).not.toMatch(/coach\.|playtest\.|collections\./)
        if (/^coach_(ita|mex)_/.test(coach.id)) expect(card.querySelector('img.coach-photo'), coach.id).toBeNull()
        const button = card.querySelector('button.primary-action') as HTMLButtonElement
        expect(button.disabled).toBe(false)
        expect(button.getAttribute('aria-label')).toContain(`${coach.surname}`)
      })
      fireEvent.click(cards[0].querySelector('button.primary-action')!)
      expect(onHire).toHaveBeenCalledWith(offers[0].id)
      unmount()
    }
  })
})
