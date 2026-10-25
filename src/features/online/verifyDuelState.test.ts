import { describe, expect, it } from 'vitest'
import { auctionAvailability, autoBuySubstitutes, autoCompleteStep, beginBidding, canAutoComplete, completeDuelMatch, nextAuctionRound, passAuction, placeBid, revealCoinToss, revealDiscardReplacement, revealNextAuctionRound, startCoinToss, startDuelMatch } from '../recruiter-duel/auctionEngine'
import type { AuctionTransition, RecruiterDuelGame, RecruiterId } from '../recruiter-duel/auctionTypes'
import { autoChooseCoach } from '../recruiter-duel/coachHiring'
import { buildInitialDuel, parseDuel, slimDuel } from './onlineDuel'
import { duelCatalog, verifyDuelState } from './verifyDuelState'

const must = (value: AuctionTransition): RecruiterDuelGame => { if (!value.ok) throw new Error(value.error); return value.game }
/** What a browser receives: the state as JSON, without the draw context. */
const roundTrip = (game: RecruiterDuelGame) => parseDuel(JSON.parse(JSON.stringify(slimDuel(game))))!

/** Two scripted people through the auctions as the browsers play them, up to the squads being ready. */
function auctions(seed: string, grab: Readonly<Record<RecruiterId, number>>, toss: 'heads' | 'tails' = 'heads', quick = false): RecruiterDuelGame {
  const initial = buildInitialDuel({ host: 'Ana', guest: 'Beto' }, 'GLOBAL_CLASSIC', 'GLOBAL_CLASSIC', seed)
  const catalog = duelCatalog(initial)
  let game = must(beginBidding(must(revealCoinToss(must(startCoinToss(initial, toss))))))
  for (let step = 0; step < 2000 && game.phase !== 'TEAMS_COMPLETED'; step++) {
    if (game.phase === 'DISCARD_RESULT') { game = must(revealDiscardReplacement(game)); continue }
    if (game.phase === 'NEXT_ROUND') { game = must(revealNextAuctionRound(game)); continue }
    if (game.phase === 'REVEAL_PLAYER') { game = must(beginBidding(game)); continue }
    if (game.phase === 'ROUND_RESULT') { game = must(nextAuctionRound(game, catalog)); continue }
    const side = game.activeParticipant!
    if (quick && canAutoComplete(game, side)) { game = must(autoCompleteStep(game, side, catalog)); continue }
    const availability = auctionAvailability(game, side, catalog)
    const price = catalog.find((player) => player.id === game.rounds[game.roundIndex].playerId)!.price
    game = availability.bid.enabled && availability.minimum <= price + grab[side] ? must(placeBid(game, side, availability.minimum, catalog)) : must(passAuction(game, side, catalog))
  }
  expect(game.phase).toBe('TEAMS_COMPLETED')
  return game
}
/** Coaches, substitutes, strategies and the match, as the online squad stage does. */
function finished(game: RecruiterDuelGame): RecruiterDuelGame {
  const catalog = duelCatalog(game)
  const hired = autoBuySubstitutes(autoBuySubstitutes(autoChooseCoach(autoChooseCoach(game, 'recruiter_one'), 'recruiter_two'), 'recruiter_one', catalog), 'recruiter_two', catalog)
  return must(completeDuelMatch(must(startDuelMatch(hired, catalog, { recruiter_one: 'HIGH_PRESS', recruiter_two: 'LOW_BLOCK' }, true))))
}
const games = [
  ['two cautious bidders', 'verify-1', { recruiter_one: 1, recruiter_two: 1 }, 'heads', false],
  ['a cautious bidder against a big spender, with the quick finish', 'verify-2', { recruiter_one: 0, recruiter_two: 6 }, 'tails', true],
  ['two big spenders', 'verify-3', { recruiter_one: 5, recruiter_two: 5 }, 'heads', false],
] as const

describe('verifyDuelState', () => {
  it.each(games)('accepts a real complete game: %s', (_name, seed, grab, toss, quick) => {
    const squads = auctions(seed, grab, toss, quick)
    expect(squads.record.filter((entry) => entry.type === 'award')).toHaveLength(squads.rounds.length)
    expect(verifyDuelState(roundTrip(squads))).toEqual({ ok: true, coverage: 'full' })
    const done = finished(squads)
    expect(done.matchResult).not.toBeNull()
    expect(verifyDuelState(roundTrip(done))).toEqual({ ok: true, coverage: 'full' })
  })
  it('accepts every intermediate state of a game in progress', () => {
    const initial = buildInitialDuel({ host: 'Ana', guest: 'Beto' }, 'GLOBAL_CLASSIC', 'GLOBAL_CLASSIC', 'verify-steps')
    const catalog = duelCatalog(initial)
    let game = must(startCoinToss(initial, 'heads'))
    expect(verifyDuelState(roundTrip(initial))).toEqual({ ok: true, coverage: 'full' })
    expect(verifyDuelState(roundTrip(game))).toEqual({ ok: true, coverage: 'full' })
    game = must(revealCoinToss(game))
    let checked = 0
    for (let step = 0; step < 400 && game.phase !== 'TEAMS_COMPLETED'; step++) {
      expect(verifyDuelState(roundTrip(game))).toMatchObject({ ok: true })
      checked++
      if (game.phase === 'DISCARD_RESULT') game = must(revealDiscardReplacement(game))
      else if (game.phase === 'NEXT_ROUND') game = must(revealNextAuctionRound(game))
      else if (game.phase === 'REVEAL_PLAYER') game = must(beginBidding(game))
      else if (game.phase === 'ROUND_RESULT') game = must(nextAuctionRound(game, catalog))
      else {
        const side = game.activeParticipant!; const availability = auctionAvailability(game, side, catalog)
        game = availability.bid.enabled && side === 'recruiter_one' ? must(placeBid(game, side, availability.minimum, catalog)) : must(passAuction(game, side, catalog))
      }
    }
    expect(checked).toBeGreaterThan(60)
  })

  const tamper = (state: RecruiterDuelGame, change: (game: RecruiterDuelGame) => RecruiterDuelGame) => verifyDuelState(roundTrip(change(state)))
  const edit = (game: RecruiterDuelGame, index: number, patch: Record<string, unknown>) => ({ ...game, record: game.record.map((entry, at) => at === index ? { ...entry, ...patch } : entry) } as RecruiterDuelGame)

  it('rejects an altered price, round winner, balance, coin and match result', () => {
    const squads = auctions('verify-1', { recruiter_one: 1, recruiter_two: 1 })
    const done = finished(squads)
    const index = squads.record.findIndex((entry) => entry.type === 'award' && entry.reason === 'voluntary_bid')
    const award = squads.record[index] as Extract<RecruiterDuelGame['record'][number], { type: 'award' }>
    const other: RecruiterId = award.winner === 'recruiter_one' ? 'recruiter_two' : 'recruiter_one'
    expect(tamper(squads, (game) => edit(game, index, { price: award.price - 1 }))).toEqual({ ok: false, reason: 'replay' })
    expect(tamper(squads, (game) => edit(game, index, { winner: other }))).toEqual({ ok: false, reason: 'replay' })
    expect(tamper(squads, (game) => ({ ...game, teams: { ...game.teams, [award.winner]: { ...game.teams[award.winner], spent: game.teams[award.winner].spent - 3 } } })).ok).toBe(false)
    expect(tamper(done, (game) => ({ ...game, teams: { ...game.teams, recruiter_one: { ...game.teams.recruiter_one, spent: game.teams.recruiter_one.spent - 2 } } }))).toEqual({ ok: false, reason: 'spent' })
    expect(tamper(squads, (game) => ({ ...game, coinTossWinner: game.coinTossWinner === 'recruiter_one' ? 'recruiter_two' : 'recruiter_one' }))).toEqual({ ok: false, reason: 'coin' })
    expect(tamper(squads, (game) => ({ ...game, coinResult: game.coinResult === 'heads' ? 'tails' : 'heads' })).ok).toBe(false)
    expect(tamper(done, (game) => ({ ...game, matchResult: { ...game.matchResult!, score: { local: game.matchResult!.score.local + 3, cpu: game.matchResult!.score.cpu } } }))).toEqual({ ok: false, reason: 'match_result' })
    expect(tamper(done, (game) => ({ ...game, matchResult: { ...game.matchResult!, winner: game.matchResult!.winner === 'local' ? 'cpu' : 'local' } }))).toEqual({ ok: false, reason: 'match_result' })
  })
  it('rejects a squad that does not match what was won, and edits made while the auctions are running', () => {
    const squads = auctions('verify-3', { recruiter_one: 5, recruiter_two: 5 })
    const stolen = Object.values(squads.teams.recruiter_two.lineup)[0]!
    const slot = Object.keys(squads.teams.recruiter_one.lineup)[0]
    expect(tamper(squads, (game) => ({ ...game, teams: { ...game.teams, recruiter_one: { ...game.teams.recruiter_one, lineup: { ...game.teams.recruiter_one.lineup, [slot]: stolen } } } })).ok).toBe(false)
    const initial = buildInitialDuel({ host: 'Ana', guest: 'Beto' }, 'GLOBAL_CLASSIC', 'GLOBAL_CLASSIC', 'verify-live')
    const catalog = duelCatalog(initial)
    let game = must(beginBidding(must(revealCoinToss(must(startCoinToss(initial, 'heads'))))))
    game = must(placeBid(game, game.activeParticipant!, auctionAvailability(game, game.activeParticipant!, catalog).minimum, catalog))
    expect(verifyDuelState(roundTrip(game))).toMatchObject({ ok: true })
    const bidding = game.record.findIndex((entry) => entry.type === 'bid')
    expect(tamper(game, (state) => edit(state, bidding, { amount: 1 }))).toEqual({ ok: false, reason: 'replay' })
    expect(tamper(game, (state) => ({ ...state, currentBid: { participant: state.currentBid!.participant, amount: state.currentBid!.amount + 4 } }))).toEqual({ ok: false, reason: 'teams' })
  })
  it('accepts the same state when the database returns the keys in another order (jsonb)', () => {
    const reorder = (value: unknown): unknown => Array.isArray(value) ? value.map(reorder) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).reverse().map(([key, entry]) => [key, reorder(entry)])) : value
    const done = finished(auctions('verify-1', { recruiter_one: 1, recruiter_two: 1 }))
    expect(verifyDuelState(reorder(roundTrip(done)) as RecruiterDuelGame)).toEqual({ ok: true, coverage: 'full' })
  })
})
