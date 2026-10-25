import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { DRAFT_CATALOG } from '../draft/catalog'
import { AuctionBidPanel } from './AuctionBidPanel'
import { auctionAvailability, beginBidding, budgetOf, createRecruiterDuel, revealCoinToss, startCoinToss } from './auctionEngine'
import { buildHudModel } from './hudModel'
import { CLASSIC_CONFIG } from './matchConfig'
import type { AuctionTransition } from './auctionTypes'

const must = (result: AuctionTransition) => { if (!result.ok) throw Error(result.error); return result.game }
const created = createRecruiterDuel(DRAFT_CATALOG, 'budget-explanation', undefined, { ...CLASSIC_CONFIG, budget: 160, coaches: true, coachReserve: 8 })
if (!created.ok) throw Error(created.error)
const game = must(beginBidding(must(revealCoinToss(must(startCoinToss(created.game, 'heads'))))))
const side = game.activeParticipant!
const footballer = DRAFT_CATALOG.find(player => player.id === game.rounds[game.roundIndex].playerId)!
const availability = auctionAvailability(game, side, DRAFT_CATALOG)
const hud = buildHudModel(game, DRAFT_CATALOG)

async function view(language: 'es-AR' | 'en' | 'pt-BR', special: boolean, withHud = true) {
  const i18n = await createI18n(language), onPass = vi.fn()
  const result = render(<I18nextProvider i18n={i18n}><AuctionBidPanel game={game} side={side} footballer={footballer} names={{ recruiter_one: 'Academia', recruiter_two: 'Rival' }} availability={availability} offer={availability.minimum} minimum={availability.minimum} onOffer={vi.fn()} blockedMessage={null} progress={null} hud={withHud ? hud : null} passLabel={i18n.t('duel.pass')} assignment={<p id="auction-assignment">Consequence</p>} assignmentSpecial={special} onBid={vi.fn()} onPass={onPass} /></I18nextProvider>)
  return { ...result, i18n, onPass }
}

describe('always visible auction economy', () => {
  it.each(['es-AR', 'en', 'pt-BR'] as const)('explains balance, reserves and the engine maximum without opening details in %s', async language => {
    const { container, i18n } = await view(language, false)
    const remaining = budgetOf(game) - game.teams[side].spent
    expect(availability.maximum).toBeLessThan(remaining)
    const row = container.querySelector('.budget-breakdown')!
    for (const text of [i18n.t('budgetBreakdown.balance', { remaining }), i18n.t('budgetBreakdown.reserved', { reserved: remaining - availability.maximum }), i18n.t('budgetBreakdown.offerable', { maximum: availability.maximum })]) expect(row).toHaveTextContent(text)
    expect(row).toBeVisible()
    expect(row.closest('details')).toBeNull()
    expect(container.querySelector('.bid-details')).not.toHaveAttribute('open')
    expect(container.querySelector('.risk-row')!.nextElementSibling).toBe(row)
  })
  it('keeps the explanation visible when the optional HUD is absent', async () => {
    const { container, i18n } = await view('en', false, false)
    expect(container.querySelector('.budget-breakdown')).toHaveTextContent(i18n.t('budgetBreakdown.balance', { remaining: budgetOf(game) - game.teams[side].spent }))
  })
  it.each([true, false])('highlights only exceptional passes (special=%s) and preserves the pass action', async special => {
    const { container, i18n, onPass } = await view('en', special)
    const pass = screen.getByRole('button', { name: i18n.t('duel.pass') })
    expect(pass.classList.contains('bid-pass-special')).toBe(special)
    expect(pass).toHaveAttribute('aria-describedby', 'auction-assignment')
    expect(container.querySelector('#auction-assignment')!.closest('details') !== null).toBe(!special)
    fireEvent.click(pass)
    expect(onPass).toHaveBeenCalledOnce()
  })
  it.each([['es-AR', 'Seguro', 'Cuidado', 'Peligro'], ['en', 'Safe', 'Careful', 'Danger'], ['pt-BR', 'Seguro', 'Cuidado', 'Perigo']] as const)('names the risk level in words and with a symbol in %s, not only with colour', async (language, safe, warn, danger) => {
    const i18n = await createI18n(language)
    for (const level of ['safe', 'warn', 'danger'] as const) expect(i18n.t(`bidTable.riskText.${level}`)).toBe({ safe, warn, danger }[level])
    const { container } = await view(language, false)
    const label = container.querySelector('.risk-text')!
    expect(label).toBeVisible()
    expect(label.textContent).toMatch(/^[✓!✕] S/)
    expect(container.querySelector('.risk-meter')).toHaveAttribute('aria-label')
  })
  it('uses a different symbol for each level', async () => {
    const symbols = new Set<string>()
    for (const offer of [availability.minimum, Math.ceil(availability.maximum * .75), availability.maximum]) {
      const i18n = await createI18n('en')
      const { container, unmount } = render(<I18nextProvider i18n={i18n}><AuctionBidPanel game={game} side={side} footballer={footballer} names={{ recruiter_one: 'Academia', recruiter_two: 'Rival' }} availability={availability} offer={offer} minimum={availability.minimum} onOffer={vi.fn()} blockedMessage={null} progress={null} hud={hud} passLabel="Pass" assignment={null} assignmentSpecial={false} onBid={vi.fn()} onPass={vi.fn()} /></I18nextProvider>)
      symbols.add(container.querySelector('.risk-symbol')!.textContent!)
      unmount()
    }
    expect(symbols.size).toBeGreaterThan(1)
  })
  it.each(['es-AR', 'en', 'pt-BR'] as const)('explains the reserved-budget block without revealing the sum of the remaining cards in %s', async language => {
    const i18n = await createI18n(language)
    const text = i18n.t('auctionBanner.blocked.FUTURE_BUDGET_RESERVED', { player: 'Messi', price: 44, maximum: 30, need: 987, total: 654 })
    expect(text).toContain('Messi'); expect(text).toContain('44'); expect(text).toContain('30')
    expect(text).not.toContain('987'); expect(text).not.toContain('654')
    expect(i18n.getResource(language, 'common', 'auctionBanner.blocked.FUTURE_BUDGET_RESERVED')).not.toMatch(/{{(need|total)}}/)
  })
})
