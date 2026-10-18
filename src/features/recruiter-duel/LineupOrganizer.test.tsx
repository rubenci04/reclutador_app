import { describe, expect, it } from 'vitest'
import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { DRAFT_CATALOG } from '../draft/catalog'
import { generateCpuTeam } from '../local-match/cpuTeam'
import { MATCH_RULES_VERSION } from '../local-match/matchTypes'
import { simulateMatch } from '../local-match/simulator'
import { createRecruiterDuel, reorderTeamLineup, startDuelMatch } from './auctionEngine'
import type { RecruiterDuelGame } from './auctionTypes'
import { LineupOrganizer } from './LineupOrganizer'

function completedGame(): RecruiterDuelGame {
  const created = createRecruiterDuel(DRAFT_CATALOG, 'organize')
  if (!created.ok) throw new Error(created.error)
  const one = generateCpuTeam(DRAFT_CATALOG, 'organize-one').team.lineup
  const used = new Set(Object.values(one))
  const two = generateCpuTeam(DRAFT_CATALOG.filter((player) => !used.has(player.id)), 'organize-two').team.lineup
  const spent = (lineup: typeof one) => Object.values(lineup).reduce((total, id) => total + DRAFT_CATALOG.find((player) => player.id === id)!.price, 0)
  return { ...created.game, phase: 'TEAMS_COMPLETED', teams: { recruiter_one: { lineup: one, spent: spent(one) }, recruiter_two: { lineup: two, spent: spent(two) } } }
}
const nameOf = (id: string | null) => DRAFT_CATALOG.find((player) => player.id === id)!.name

describe('reorderTeamLineup', () => {
  it('swaps inside a line, keeping players, spent and the other team untouched', () => {
    const game = completedGame()
    const result = reorderTeamLineup(game, 'recruiter_one', 'LCB', 'RB')
    if (!result.ok) throw new Error(result.error)
    const { lineup } = game.teams.recruiter_one; const after = result.game.teams.recruiter_one
    expect(after.lineup.LCB).toBe(lineup.RB); expect(after.lineup.RB).toBe(lineup.LCB)
    expect(after.spent).toBe(game.teams.recruiter_one.spent)
    expect(result.game.teams.recruiter_two).toBe(game.teams.recruiter_two)
    expect(new Set(Object.values(after.lineup))).toEqual(new Set(Object.values(lineup)))
  })
  it('refuses other lines and any phase except TEAMS_COMPLETED', () => {
    const game = completedGame()
    expect(reorderTeamLineup(game, 'recruiter_one', 'GK', 'LB')).toEqual({ ok: false, error: 'different_line' })
    expect(reorderTeamLineup({ ...game, phase: 'BIDDING' }, 'recruiter_one', 'LB', 'RB')).toEqual({ ok: false, error: 'invalid_transition' })
  })
  it('keeps the match deterministic for the same lineup and context', () => {
    const game = completedGame()
    const first = startDuelMatch(game, DRAFT_CATALOG); const second = startDuelMatch(game, DRAFT_CATALOG)
    if (!first.ok || !second.ok) throw new Error('match')
    expect(first.game.matchResult).toEqual(second.game.matchResult)
    const direct = simulateMatch({ localLineup: game.teams.recruiter_one.lineup, cpuLineup: game.teams.recruiter_two.lineup, catalog: DRAFT_CATALOG, catalogVersion: 'catalog_v1', rulesVersion: MATCH_RULES_VERSION, seed: `${game.seed}:match` })
    expect(first.game.matchResult).toEqual(direct)
  })
})

function Harness() {
  const [game, setGame] = useState(completedGame)
  const [confirmed, setConfirmed] = useState(false)
  return <>
    <LineupOrganizer game={game} participant="recruiter_one" name="One" catalog={DRAFT_CATALOG} confirmed={confirmed}
      onSwap={(a, b) => { const r = reorderTeamLineup(game, 'recruiter_one', a, b); if (r.ok) setGame(r.game); return r.ok ? null : r.error }}
      onConfirm={() => setConfirmed(true)} onEdit={() => setConfirmed(false)} />
    <span data-testid="start" data-enabled={confirmed} />
  </>
}

describe('LineupOrganizer', () => {
  it('swaps two defenders on the board, rejects cross-line swaps and confirms', async () => {
    const i18n = await createI18n('en')
    const start = completedGame().teams.recruiter_one.lineup
    const view = render(<I18nextProvider i18n={i18n}><Harness /></I18nextProvider>)
    const slotButton = (slot: string) => view.container.querySelector(`[data-slot="${slot}"] button`) as HTMLButtonElement
    // Review mode: shirts open details, nothing can be swapped until the editing mode is turned on.
    expect(screen.getByText(/turn on EDIT FORMATION/)).toBeInTheDocument()
    expect(slotButton('LCB')).not.toHaveAttribute('aria-pressed')
    fireEvent.click(screen.getByRole('button', { name: 'EDIT FORMATION' }))
    expect(screen.getByRole('button', { name: 'DONE: LEAVE EDITING' })).toHaveAttribute('aria-pressed', 'true')
    expect(slotButton('LCB')).toHaveAccessibleName(`${nameOf(start.LCB)}, Left centre-back, tap to choose`)
    fireEvent.click(slotButton('LCB'))
    expect(slotButton('LCB')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(/Selected: .* \(Left centre-back\)\. Highlighted shirts/)).toBeInTheDocument()
    expect(slotButton('RB')).toHaveClass('swap-target'); expect(slotButton('ST')).toHaveClass('swap-dim')
    fireEvent.click(slotButton('ST'))
    expect(screen.getByRole('alert')).toHaveTextContent('Only footballers in the same line can be swapped')
    fireEvent.click(slotButton('RB'))
    expect(slotButton('LCB')).toHaveAccessibleName(`${nameOf(start.RB)}, Left centre-back, tap to choose`)
    expect(slotButton('RB')).toHaveAccessibleName(`${nameOf(start.LCB)}, Right back, tap to choose`)
    expect(screen.getByRole('status')).toHaveTextContent('swapped places')
    expect(screen.getByTestId('start')).toHaveAttribute('data-enabled', 'false')
    fireEvent.click(screen.getByRole('button', { name: 'Confirm eleven' }))
    expect(screen.getByTestId('start')).toHaveAttribute('data-enabled', 'true')
    expect(screen.getByText('Eleven confirmed')).toBeInTheDocument()
  })

  it('swaps by dragging within a line, rejects dragging across lines and the goalkeeper, and shows the aptitude legend', async () => {
    const i18n = await createI18n('en')
    const start = completedGame().teams.recruiter_one.lineup
    const view = render(<I18nextProvider i18n={i18n}><Harness /></I18nextProvider>)
    const slotButton = (slot: string) => view.container.querySelector(`[data-slot="${slot}"] button`) as HTMLButtonElement
    fireEvent.click(screen.getByRole('button', { name: 'EDIT FORMATION' }))
    expect(screen.getByText('Role not documented')).toBeInTheDocument(); expect(screen.getByText('Verified role')).toBeInTheDocument()
    expect(slotButton('LW')).toHaveAttribute('data-aptitude', 'UNKNOWN')
    const data = new Map<string, string>()
    const transfer = { setData: (k: string, v: string) => data.set(k, v), getData: (k: string) => data.get(k) ?? '' }
    fireEvent.dragStart(slotButton('LW'), { dataTransfer: transfer }); fireEvent.drop(slotButton('RW'), { dataTransfer: transfer })
    expect(slotButton('LW')).toHaveAccessibleName(`${nameOf(start.RW)}, Left winger, tap to choose`)
    expect(slotButton('RW')).toHaveAccessibleName(`${nameOf(start.LW)}, Right winger, tap to choose`)
    fireEvent.dragStart(slotButton('GK'), { dataTransfer: transfer }); fireEvent.drop(slotButton('LB'), { dataTransfer: transfer })
    expect(screen.getByRole('alert')).toHaveTextContent('goalkeeper always stays in goal')
    expect(slotButton('GK')).toHaveAccessibleName(`${nameOf(start.GK)}, Goalkeeper, tap to choose`)
  })
})
