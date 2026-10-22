import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { DRAFT_CATALOG } from '../draft/catalog'
import { generateCpuTeam } from '../local-match/cpuTeam'
import { defaultBudgetForMode, legacyOnlineBudgetForMode } from '../player-catalog/leagueCollections'
import { buildInitialDuel } from '../online/onlineDuel'
import { autoBuySubstitutes, benchStatus, beginBidding, buySubstitute, createRecruiterDuel, maximumSafeBid, revealCoinToss, rosterIds, startCoinToss, startDuelMatch, substituteMarket, swapBenchWithStarter } from './auctionEngine'
import type { RecruiterDuelGame } from './auctionTypes'
import { BENCH_MARKET_V2, BUDGET_PRESETS, MATCH_CONFIG_VERSION, benchLimitOf, parseMatchConfig, type MatchConfig } from './matchConfig'
import { SubstituteMarket } from './SubstituteMarket'
import { Wallet } from './Wallet'

const config = (budget: number, bench = true): MatchConfig => ({ version: MATCH_CONFIG_VERSION, budget, names: { recruiter_one: null, recruiter_two: null }, substitutes: false, ...(bench ? { bench: BENCH_MARKET_V2 } : {}) })

/** Both elevens complete, as in substituteMarket.test: only the money and the bench rules differ. */
function completedGame(budget: number, bench = true): RecruiterDuelGame {
  const created = createRecruiterDuel(DRAFT_CATALOG, 'roster-005', undefined, config(budget, bench))
  if (!created.ok) throw new Error(created.error)
  const one = generateCpuTeam(DRAFT_CATALOG, 'r5-one').team.lineup
  const used = new Set(Object.values(one))
  const two = generateCpuTeam(DRAFT_CATALOG.filter((player) => !used.has(player.id)), 'r5-two').team.lineup
  const spent = (lineup: typeof one) => Object.values(lineup).reduce((total, id) => total + DRAFT_CATALOG.find((player) => player.id === id)!.price, 0)
  return { ...created.game, manualBench: true, phase: 'TEAMS_COMPLETED', teams: { recruiter_one: { lineup: one, spent: spent(one) }, recruiter_two: { lineup: two, spent: spent(two) } } }
}
const must = <T extends { ok: boolean }>(result: T): Extract<T, { ok: true }> => { if (!result.ok) throw new Error(JSON.stringify(result)); return result as Extract<T, { ok: true }> }
const buyAll = (game: RecruiterDuelGame, count: number, position?: string) => {
  let current = game
  for (let index = 0; index < count; index++) {
    const pick = substituteMarket(current, 'recruiter_one', DRAFT_CATALOG).find((player) => !position || player.position === position)
    if (!pick) break
    current = must(buySubstitute(current, 'recruiter_one', pick.id, DRAFT_CATALOG)).game
  }
  return current
}

describe('ROSTER-005 budgets', () => {
  it('uses 160M for current categories, 220M for legends and the larger one for crossings', () => {
    expect(defaultBudgetForMode('SPAIN_LEAGUE')).toBe(160)
    expect(defaultBudgetForMode('GLOBAL_CLASSIC')).toBe(160)
    expect(defaultBudgetForMode('EUROPE_LEGENDS')).toBe(220)
    expect(defaultBudgetForMode('LEGENDS_ONLY')).toBe(220)
    expect(Math.max(defaultBudgetForMode('GLOBAL_CLASSIC'), defaultBudgetForMode('EUROPE_LEGENDS'))).toBe(220)
    expect(BUDGET_PRESETS).toContain(220)
  })
  it('keeps online rooms on their previous budgets and three-substitute rules (coordinated migration pending)', () => {
    expect(legacyOnlineBudgetForMode('GLOBAL_CLASSIC')).toBe(150)
    expect(legacyOnlineBudgetForMode('EUROPE_LEGENDS')).toBe(200)
    const room = buildInitialDuel({ host: 'A', guest: 'B' })
    expect(room.config?.budget).toBe(150)
    expect(room.config?.bench).toBeUndefined()
    expect(benchLimitOf(room.config)).toBe(3)
  })
  it('versions the bench in the stored configuration and preserves earlier ones', () => {
    expect(parseMatchConfig(config(200))?.bench).toBe(BENCH_MARKET_V2)
    expect(parseMatchConfig(config(150, false))?.bench).toBeUndefined()
    expect(parseMatchConfig({ ...config(200), bench: 'bench-9' })).toBeNull()
    expect(benchLimitOf(config(200))).toBe(5)
    expect(benchLimitOf(config(200, false))).toBe(3)
    expect(must(createRecruiterDuel(DRAFT_CATALOG, 'same', undefined, config(200))).game.rounds.length).toBe(22)
  })
})

describe('ROSTER-005 optional bench of five', () => {
  it('allows zero to five substitutes in any position, never repeats a player and never exceeds the balance', () => {
    const game = completedGame(250)
    expect(benchStatus(game, 'recruiter_one')).toEqual({ filled: 0, limit: 5 })
    expect(substituteMarket(game, 'recruiter_one', DRAFT_CATALOG).some((player) => player.position === 'ARQ')).toBe(true)
    const full = buyAll(game, 8)
    expect(benchStatus(full, 'recruiter_one')).toEqual({ filled: 5, limit: 5 })
    const ids = rosterIds(full.teams.recruiter_one)
    expect(new Set(ids).size).toBe(ids.length)
    expect(full.teams.recruiter_one.spent).toBeLessThanOrEqual(250)
    expect(substituteMarket(full, 'recruiter_one', DRAFT_CATALOG)).toEqual([])
    expect(buySubstitute(full, 'recruiter_one', substituteMarket(game, 'recruiter_one', DRAFT_CATALOG)[0].id, DRAFT_CATALOG)).toEqual({ ok: false, error: 'invalid_substitute' })
    // The rival cannot sign what the first recruiter owns.
    const taken = new Set(rosterIds(full.teams.recruiter_one))
    expect(substituteMarket(full, 'recruiter_two', DRAFT_CATALOG).every((player) => !taken.has(player.id))).toBe(true)
    // A tight balance only offers what can be paid, and buying none is a valid way to play.
    const tight = completedGame(game.teams.recruiter_one.spent + 3)
    expect(substituteMarket(tight, 'recruiter_one', DRAFT_CATALOG).every((player) => player.price <= 3)).toBe(true)
    expect(startDuelMatch(tight, DRAFT_CATALOG).ok).toBe(true)
    expect(startDuelMatch(full, DRAFT_CATALOG).ok).toBe(true)
  })
  it('lets the bench hold a goalkeeper that can only replace the goalkeeper', () => {
    const game = buyAll(completedGame(250), 1, 'ARQ')
    expect(game.teams.recruiter_one.bench?.[0].position).toBe('ARQ')
    const outfield = Object.entries(game.teams.recruiter_one.lineup).find(([slot]) => slot !== 'GK')![0]
    expect(swapBenchWithStarter(game, 'recruiter_one', 0, outfield)).toEqual({ ok: false, error: 'invalid_substitute' })
    const swapped = must(swapBenchWithStarter(game, 'recruiter_one', 0, 'GK')).game
    expect(swapped.teams.recruiter_one.spent).toBe(game.teams.recruiter_one.spent)
  })
  it('keeps the three-substitute rules for games without the marker', () => {
    const game = completedGame(250, false)
    expect(substituteMarket(game, 'recruiter_one', DRAFT_CATALOG).some((player) => player.position === 'ARQ')).toBe(false)
    expect(benchStatus(buyAll(game, 8), 'recruiter_one').filled).toBeLessThanOrEqual(3)
  })
  it('makes the CPU buy only what it can pay, up to the same limit', () => {
    const rich = autoBuySubstitutes(completedGame(250), 'recruiter_two', DRAFT_CATALOG)
    expect(benchStatus(rich, 'recruiter_two').filled).toBe(5)
    expect(rich.teams.recruiter_two.spent).toBeLessThanOrEqual(250)
    const base = completedGame(250)
    const poor = autoBuySubstitutes({ ...base, config: config(base.teams.recruiter_two.spent + 4) }, 'recruiter_two', DRAFT_CATALOG)
    expect(poor.teams.recruiter_two.spent).toBeLessThanOrEqual(base.teams.recruiter_two.spent + 4)
    expect(benchStatus(poor, 'recruiter_two').filled).toBeLessThanOrEqual(5)
  })
})

describe('ROSTER-005 wallet and bench interface', () => {
  const withI18n = async (ui: React.ReactElement) => render(<I18nextProvider i18n={await createI18n('en')}>{ui}</I18nextProvider>)
  it('shows the engine balance, updates on every purchase and shows the counter, finish and reopen', async () => {
    const game = completedGame(250)
    function Harness() {
      const [current, setCurrent] = useState(game)
      return <><Wallet game={current} catalog={DRAFT_CATALOG} side="recruiter_one" name="Pasto" /><SubstituteMarket game={current} participant="recruiter_one" name="Pasto" catalog={DRAFT_CATALOG} locked={false} onBuy={(id) => setCurrent((state) => must(buySubstitute(state, 'recruiter_one', id, DRAFT_CATALOG)).game)} /></>
    }
    await withI18n(<Harness />)
    const wallet = screen.getByTestId('wallet')
    expect(wallet).toHaveTextContent(`${250 - game.teams.recruiter_one.spent} M`)
    expect(wallet).toHaveTextContent('Pasto')
    expect(screen.getByRole('status', { name: 'Substitutes 0 of 5' })).toHaveTextContent('0/5')
    const option = screen.getAllByRole('button').find((button) => /GRL/.test(button.textContent ?? ''))!
    fireEvent.click(option)
    expect(screen.getByRole('status', { name: 'Substitutes 1 of 5' })).toHaveTextContent('1/5')
    expect(wallet).not.toHaveTextContent(`${250 - game.teams.recruiter_one.spent} M`)
    fireEvent.click(screen.getByRole('button', { name: 'Finish substitutes' }))
    expect(screen.queryAllByRole('button').some((button) => /GRL/.test(button.textContent ?? ''))).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Reopen substitutes' }))
    expect(screen.getAllByRole('button').some((button) => /GRL/.test(button.textContent ?? ''))).toBe(true)
  })
  it('distinguishes the balance from the engine maximum bid and reserve while bidding', async () => {
    const created = must(createRecruiterDuel(DRAFT_CATALOG, 'wallet-bid', undefined, { ...config(200), coaches: true, coachReserve: 8 })).game
    const tossed = must(startCoinToss(created, 'heads')).game
    const bidding = must(beginBidding(must(revealCoinToss(tossed)).game)).game
    await withI18n(<Wallet game={bidding} catalog={DRAFT_CATALOG} side={bidding.activeParticipant!} name="Pasto" />)
    const wallet = screen.getByTestId('wallet')
    const ceiling = maximumSafeBid(bidding, bidding.activeParticipant!, DRAFT_CATALOG)
    expect(wallet).toHaveTextContent('200 M')
    expect(wallet).toHaveTextContent(`Max bid ${ceiling} M`)
    expect(wallet).toHaveTextContent('Coach reserve 8 M')
    expect(ceiling).toBeLessThan(200)
  })
  it.each(['es-AR', 'pt-BR'] as const)('has wallet and bench texts in %s', async (language) => {
    const i18n = await createI18n(language)
    for (const key of ['wallet.label', 'wallet.maxBid', 'wallet.reserve', 'wallet.details', 'wallet.showHud', 'market.counter', 'market.leftV2', 'market.finish', 'market.reopen', 'market.finished', 'market.full']) expect(i18n.exists(key), key).toBe(true)
  })
})
