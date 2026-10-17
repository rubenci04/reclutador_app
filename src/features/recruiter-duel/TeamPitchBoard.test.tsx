import { afterEach, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { DRAFT_CATALOG } from '../draft/catalog'
import { DRAFT_SLOTS } from '../draft/draftTypes'
import { createEmptyLineup } from '../draft/draftModel'
import { TeamPitchBoard } from './TeamPitchBoard'
import { createRecruiterDuel } from './auctionEngine'

const originalShow = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal')
const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close')
afterEach(() => {
  vi.restoreAllMocks()
  for (const [name, descriptor] of [['showModal', originalShow], ['close', originalClose]] as const) {
    if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, name, descriptor)
    else Reflect.deleteProperty(HTMLDialogElement.prototype, name)
  }
})
it('renders 11 neutral positions, authoritative paid price and opens verified details', async () => {
  const created = createRecruiterDuel(DRAFT_CATALOG, 'pitch')
  if (!created.ok) throw new Error(created.error)
  const i18n = await createI18n('en')
  const game = created.game
  const view = render(<I18nextProvider i18n={i18n}><TeamPitchBoard game={game} participant="recruiter_one" catalog={DRAFT_CATALOG} /></I18nextProvider>)
  expect(screen.getAllByRole('button', { name: /^Vacant:/ })).toHaveLength(11)
  for (const slot of DRAFT_SLOTS) expect(view.container.querySelector(`[data-slot="${slot.id}"]`)).toHaveAttribute('data-position', slot.position)
  const messi = DRAFT_CATALOG.find((player) => player.id === 'plr_038')!
  const slot = DRAFT_SLOTS.find((item) => item.position === messi.position)!
  const updated = { ...game, teams: { ...game.teams, recruiter_one: { lineup: { ...createEmptyLineup(), [slot.id]: messi.id }, spent: messi.price + 2 } }, record: [{ type: 'award' as const, winner: 'recruiter_one' as const, playerId: messi.id, price: messi.price + 2, reason: 'voluntary_bid' as const, round: 0 }] }
  view.rerender(<I18nextProvider i18n={i18n}><TeamPitchBoard game={updated} participant="recruiter_one" catalog={DRAFT_CATALOG} /></I18nextProvider>)
  const shirt = screen.getByRole('button', { name: /View Lionel Messi/ })
  expect(shirt.closest('[data-slot]')).toHaveAttribute('data-slot', slot.id)
  expect(screen.getByText(`Paid: ${messi.price + 2}M`)).toBeInTheDocument()
  // jsdom has no native modal implementation; exercise open/close state via a shim.
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function (this: HTMLDialogElement) { this.setAttribute('open', '') } })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function (this: HTMLDialogElement) { this.removeAttribute('open'); this.dispatchEvent(new Event('close')) } })
  fireEvent.click(shirt)
  expect(screen.getByRole('dialog', { name: 'Details for Lionel Messi' })).toBeInTheDocument()
  expect(screen.getByRole('img', { name: 'Photograph of Lionel Messi' })).toBeInTheDocument()
  expect(screen.getByText(/Reference club/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Close details' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})
