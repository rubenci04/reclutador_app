import { describe, expect, it } from 'vitest'
import { DRAFT_CATALOG } from '../draft/catalog'
import { auctionAvailability, beginBidding, buySubstitute, createRecruiterDuel, nextAuctionRound, passAuction, placeBid, revealCoinToss, revealDiscardReplacement, revealNextAuctionRound, rosterIds, startCoinToss, substituteMarket, substitutePool, swapBenchWithStarter } from './auctionEngine'
import type { AuctionTransition, RecruiterDuelGame } from './auctionTypes'
import { chooseCoach, coachMarket, declineCoach } from './coachHiring'
import { takeCpuTurn } from './cpuPolicy'
import { CLASSIC_CONFIG } from './matchConfig'
import { teamPower } from './teamPower'

const must = (result: AuctionTransition): RecruiterDuelGame => { if (!result.ok) throw new Error(result.error); return result.game }

/** Cheap auctions: the human only ever offers the minimum, so money is left over. */
function play(seed: string, coaches: boolean) {
  const created = createRecruiterDuel(DRAFT_CATALOG, seed, undefined, coaches ? { ...CLASSIC_CONFIG, coaches: true } : CLASSIC_CONFIG)
  if (!created.ok) throw new Error(created.error)
  let game = must(beginBidding(must(revealCoinToss(must(startCoinToss(created.game, 'heads'))))))
  for (let step = 0; step < 1200 && game.phase !== 'TEAMS_COMPLETED'; step++) {
    if (game.phase === 'DISCARD_RESULT') { game = must(revealDiscardReplacement(game)); continue }
    if (game.phase === 'NEXT_ROUND') { game = must(revealNextAuctionRound(game)); continue }
    if (game.phase === 'REVEAL_PLAYER') { game = must(beginBidding(game)); continue }
    if (game.phase === 'ROUND_RESULT') { game = must(nextAuctionRound(game, DRAFT_CATALOG)); continue }
    const who = game.activeParticipant!
    if (who === 'recruiter_two') { game = must(takeCpuTurn(game, DRAFT_CATALOG, 'CONSERVATIVE')); continue }
    const a = auctionAvailability(game, who, DRAFT_CATALOG)
    if (a.bid.enabled && !game.currentBid) game = must(placeBid(game, who, a.minimum, DRAFT_CATALOG))
    else if (a.pass.enabled) game = must(passAuction(game, who, DRAFT_CATALOG))
    else game = must(placeBid(game, who, a.minimum, DRAFT_CATALOG))
  }
  return game
}

describe('substitute pool and order', () => {
  it('puts discarded players first, tops lines up from the same catalog and never offers owned players', () => {
    const base = play('bench-1', false)
    const owned = new Set([...rosterIds(base.teams.recruiter_one), ...rosterIds(base.teams.recruiter_two)])
    const free = DRAFT_CATALOG.find((player) => player.position === 'DEF' && !owned.has(player.id))!
    const game = { ...base, discardedPlayerIds: [free.id] }
    const pool = substitutePool(game, DRAFT_CATALOG)
    expect(pool[0].id).toBe(free.id)
    expect(pool.filter((player) => player.position === 'DEF')).toHaveLength(3)
    expect(pool.filter((player) => player.position === 'MED')).toHaveLength(3)
    expect(pool.some((player) => owned.has(player.id) || player.position === 'ARQ')).toBe(false)
    expect(substitutePool(game, DRAFT_CATALOG)).toEqual(pool)
  })
  it('buys at most three, one per line, only from the pool and within the money left', () => {
    let game = play('bench-1', false)
    for (let round = 0; round < 6; round++) {
      const options = substituteMarket(game, 'recruiter_one', DRAFT_CATALOG)
      if (!options.length) break
      const pool = new Set(substitutePool(game, DRAFT_CATALOG).map((player) => player.id))
      expect(options.every((player) => pool.has(player.id) && player.price <= 100 - game.teams.recruiter_one.spent)).toBe(true)
      game = must(buySubstitute(game, 'recruiter_one', options[0].id, DRAFT_CATALOG))
    }
    expect(game.teams.recruiter_one.bench?.length ?? 0).toBeLessThanOrEqual(3)
  })
  it('opens only after the coach step when coaches are on', () => {
    const game = play('bench-2', true)
    expect(substituteMarket(game, 'recruiter_one', DRAFT_CATALOG)).toEqual([])
    const pick = coachMarket(game, 'recruiter_one').at(-1)!
    const hired = must(chooseCoach(game, 'recruiter_one', pick.id))
    const declined = must(declineCoach(game, 'recruiter_one'))
    for (const next of [hired, declined]) expect(next.teams.recruiter_one.coachId !== undefined || next.teams.recruiter_one.coachDeclined).toBe(true)
    expect(must(declineCoach(game, 'recruiter_one')).teams.recruiter_one.coachDeclined).toBe(true)
    expect(declineCoach(hired, 'recruiter_one')).toEqual({ ok: false, error: 'invalid_transition' })
    expect(substituteMarket(declined, 'recruiter_two', DRAFT_CATALOG)).toEqual([])
  })
  it('stays closed when the rival has no money left', () => {
    const game = play('bench-1', false)
    const broke = { ...game, teams: { ...game.teams, recruiter_two: { ...game.teams.recruiter_two, spent: 100 } } }
    expect(substituteMarket(broke, 'recruiter_one', DRAFT_CATALOG)).toEqual([])
  })
})

describe('substitute in the eleven and team power', () => {
  it('swaps a substitute with a starter of the same line, keeping money and ownership', () => {
    let game = play('bench-1', false)
    const pick = substituteMarket(game, 'recruiter_one', DRAFT_CATALOG)[0]
    game = must(buySubstitute(game, 'recruiter_one', pick.id, DRAFT_CATALOG))
    const team = game.teams.recruiter_one
    const slot = Object.entries(team.lineup).find(([id]) => DRAFT_CATALOG.find((player) => player.id === team.lineup[id as keyof typeof team.lineup])?.position === pick.position)!
    const swapped = must(swapBenchWithStarter(game, 'recruiter_one', 0, slot[0]))
    expect(swapped.teams.recruiter_one.lineup[slot[0] as keyof typeof team.lineup]).toBe(pick.id)
    expect(swapped.teams.recruiter_one.bench?.[0].playerId).toBe(slot[1])
    expect(swapped.teams.recruiter_one.spent).toBe(team.spent)
    expect(new Set(rosterIds(swapped.teams.recruiter_one)).size).toBe(rosterIds(team).length)
    const goalkeeper = swapBenchWithStarter(game, 'recruiter_one', 0, 'GK')
    expect(goalkeeper).toEqual({ ok: false, error: 'invalid_substitute' })
    expect(swapBenchWithStarter(game, 'recruiter_one', 2, slot[0])).toEqual({ ok: false, error: 'invalid_substitute' })
  })
  it('reports the global power the match uses, including the coach', () => {
    const game = play('bench-2', true)
    const bare = teamPower(game, 'recruiter_one', DRAFT_CATALOG)!
    expect(bare.coach).toBeNull(); expect(bare.total.global).toBe(bare.base.global)
    const pick = coachMarket(game, 'recruiter_one').at(-1)!
    const hired = teamPower(must(chooseCoach(game, 'recruiter_one', pick.id)), 'recruiter_one', DRAFT_CATALOG)!
    expect(hired.coach?.id).toBe(pick.id)
    expect(hired.total.attack).toBeCloseTo(hired.base.attack + hired.coachBonus.attack, 5)
    expect(hired.total.global).toBeGreaterThan(bare.total.global)
    expect(['S', 'A', 'B', 'C', 'D']).toContain(hired.tier)
  })
})
