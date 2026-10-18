import { describe, expect, it } from 'vitest'
import { DRAFT_CATALOG } from '../draft/catalog'
import { generateCpuTeam } from '../local-match/cpuTeam'
import { ROSTER_BONUS_CAP, rosterAdvantage } from '../local-match/simulator'
import { autoBuySubstitutes, buySubstitute, createRecruiterDuel, rosterIds, startDuelMatch, substituteMarket } from './auctionEngine'
import type { RecruiterDuelGame } from './auctionTypes'

function completedGame(budget?: number): RecruiterDuelGame {
  const created = createRecruiterDuel(DRAFT_CATALOG, 'market')
  if (!created.ok) throw new Error(created.error)
  const one = generateCpuTeam(DRAFT_CATALOG, 'market-one').team.lineup
  const used = new Set(Object.values(one))
  const two = generateCpuTeam(DRAFT_CATALOG.filter((player) => !used.has(player.id)), 'market-two').team.lineup
  const spent = (lineup: typeof one) => Object.values(lineup).reduce((total, id) => total + DRAFT_CATALOG.find((player) => player.id === id)!.price, 0)
  const game: RecruiterDuelGame = { ...created.game, phase: 'TEAMS_COMPLETED', teams: { recruiter_one: { lineup: one, spent: spent(one) }, recruiter_two: { lineup: two, spent: spent(two) } } }
  return budget ? { ...game, config: { ...(game.config ?? { version: 1, names: { recruiter_one: 'A', recruiter_two: 'B' }, substitutes: false }), budget } as RecruiterDuelGame['config'] } : game
}

describe('roster advantage (extra for the better global power)', () => {
  it('is proportional, bounded, and absent when the powers are level', () => {
    expect(rosterAdvantage(80, 80.3)).toEqual({ side: null, bonus: 0, difference: 0.3 })
    expect(rosterAdvantage(82.7, 81.3)).toMatchObject({ side: 'local', bonus: 1.1, difference: 1.4 })
    expect(rosterAdvantage(70, 80)).toMatchObject({ side: 'cpu', bonus: ROSTER_BONUS_CAP })
  })
  it('is recorded in a duel result and favours the stronger side only', () => {
    const game = completedGame()
    const played = startDuelMatch(game, DRAFT_CATALOG)
    if (!played.ok || !played.game.matchResult) throw new Error('match')
    const { rosterAdvantage: advantage, strengths } = played.game.matchResult
    expect(advantage).toBeDefined()
    if (advantage?.side) expect(strengths[advantage.side].global).toBeGreaterThan(strengths[advantage.side === 'local' ? 'cpu' : 'local'].global)
  })
})

describe('substitutes bought with the money left', () => {
  it('lists only unowned DEF/MED/DEL players the recruiter can pay, best rated first', () => {
    const game = completedGame()
    const left = 100 - game.teams.recruiter_one.spent
    const market = substituteMarket(game, 'recruiter_one', DRAFT_CATALOG)
    const owned = new Set([...rosterIds(game.teams.recruiter_one), ...rosterIds(game.teams.recruiter_two)])
    expect(market.length).toBeGreaterThan(0)
    for (const player of market) { expect(owned.has(player.id)).toBe(false); expect(player.price).toBeLessThanOrEqual(left); expect(player.position).not.toBe('ARQ') }
    for (let index = 1; index < market.length; index++) expect(market[index - 1].overall_rating).toBeGreaterThanOrEqual(market[index].overall_rating)
    expect(substituteMarket({ ...game, phase: 'BIDDING' }, 'recruiter_one', DRAFT_CATALOG)).toEqual([])
  })
  it('charges the price once, allows one per line, and rejects what is unaffordable or taken', () => {
    const game = completedGame()
    const pick = substituteMarket(game, 'recruiter_one', DRAFT_CATALOG)[0]
    const bought = buySubstitute(game, 'recruiter_one', pick.id, DRAFT_CATALOG)
    if (!bought.ok) throw new Error(bought.error)
    expect(bought.game.teams.recruiter_one.spent).toBe(game.teams.recruiter_one.spent + pick.price)
    expect(bought.game.teams.recruiter_one.bench).toEqual([{ position: pick.position, playerId: pick.id }])
    expect(substituteMarket(bought.game, 'recruiter_one', DRAFT_CATALOG).some((player) => player.position === pick.position)).toBe(false)
    expect(substituteMarket(bought.game, 'recruiter_two', DRAFT_CATALOG).some((player) => player.id === pick.id)).toBe(false)
    expect(buySubstitute(bought.game, 'recruiter_one', pick.id, DRAFT_CATALOG)).toEqual({ ok: false, error: 'invalid_substitute' })
    expect(buySubstitute(game, 'recruiter_one', 'plr_001', DRAFT_CATALOG)).toEqual({ ok: false, error: 'invalid_substitute' })
  })
  it('never lets a recruiter go over budget, and the CPU spends deterministically', () => {
    const game = completedGame()
    const once = autoBuySubstitutes(game, 'recruiter_two', DRAFT_CATALOG)
    const twice = autoBuySubstitutes(game, 'recruiter_two', DRAFT_CATALOG)
    expect(once).toEqual(twice)
    expect(once.teams.recruiter_two.spent).toBeLessThanOrEqual(100)
    expect(autoBuySubstitutes(once, 'recruiter_two', DRAFT_CATALOG)).toBe(once)
  })
  it('puts the bought substitutes on the bench of the match', () => {
    const game = completedGame()
    const withBench = autoBuySubstitutes(autoBuySubstitutes(game, 'recruiter_one', DRAFT_CATALOG), 'recruiter_two', DRAFT_CATALOG)
    const played = startDuelMatch(withBench, DRAFT_CATALOG)
    if (!played.ok || !played.game.matchResult) throw new Error('match')
    const benches = played.game.matchResult.benches
    expect(benches?.local.map((player) => player.id)).toEqual((withBench.teams.recruiter_one.bench ?? []).map((slot) => slot.playerId))
    const without = startDuelMatch(game, DRAFT_CATALOG)
    if (!without.ok) throw new Error('match')
    expect(without.game.matchResult?.benches).toBeUndefined()
  })
})
