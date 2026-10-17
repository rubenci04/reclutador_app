import { describe, expect, it } from 'vitest'
import { DRAFT_CATALOG } from '../draft/catalog'
import { auctionAvailability, beginBidding, canFinishRounds, createRecruiterDuel, currentRound, discardReplacement, nextAuctionRound, passAuction, placeBid, revealCoinToss, revealDiscardReplacement, revealNextAuctionRound, startCoinToss } from './auctionEngine'
import { createDrawContext } from './drawHistory'
import type { AuctionCreation, AuctionTransition } from './auctionTypes'

function get(result: AuctionCreation | AuctionTransition) { if (!result.ok) throw new Error(result.error); return result.game }
function initial() { return get(beginBidding(get(revealCoinToss(get(startCoinToss(get(createRecruiterDuel(DRAFT_CATALOG, 'discards', createDrawContext(DRAFT_CATALOG))), 'heads')))))) }
const doublePass = (game: ReturnType<typeof initial>) => { const first = get(passAuction(game, game.activeParticipant!, DRAFT_CATALOG)); return get(passAuction(first, first.activeParticipant!, DRAFT_CATALOG)) }

describe('three shared discards', () => {
  it('does not discard on a single pass or on accepting an existing bid', () => {
    const game = initial()
    const one = get(passAuction(game, game.activeParticipant!, DRAFT_CATALOG))
    expect(one.discardsRemaining).toBe(3); expect(one.roundIndex).toBe(game.roundIndex)
    const price = DRAFT_CATALOG.find((player) => player.id === currentRound(one).playerId)!.price
    const awarded = get(placeBid(one, one.activeParticipant!, price, DRAFT_CATALOG))
    expect(awarded.phase).toBe('ROUND_RESULT'); expect(awarded.discardsRemaining).toBe(3)
    expect(awarded.record.some((entry) => entry.type === 'discard')).toBe(false)
  })
  it('preserves position, priority, squads, budget and round; rejects duplicate transitions', () => {
    let game = initial()
    const price = DRAFT_CATALOG.find((player) => player.id === currentRound(game).playerId)!.price
    game = get(placeBid(game, game.activeParticipant!, price, DRAFT_CATALOG))
    game = get(passAuction(game, game.activeParticipant!, DRAFT_CATALOG))
    game = get(beginBidding(get(revealNextAuctionRound(get(nextAuctionRound(game, DRAFT_CATALOG))))))
    const before = game
    const predicted = discardReplacement(game, DRAFT_CATALOG)
    game = doublePass(game)
    expect(game.phase).toBe('DISCARD_RESULT')
    expect(game.teams).toBe(before.teams)
    expect(game.roundIndex).toBe(before.roundIndex)
    expect(game.openingOrder).toBe(before.openingOrder)
    expect(currentRound(game)).toEqual(predicted)
    expect(currentRound(game).position).toBe(currentRound(before).position)
    expect(game.discardsRemaining).toBe(2)
    expect(passAuction(game, 'recruiter_one', DRAFT_CATALOG)).toMatchObject({ ok: false, error: 'invalid_transition' })
    expect(nextAuctionRound(game, DRAFT_CATALOG)).toMatchObject({ ok: false, error: 'invalid_transition' })
    const revealed = get(revealDiscardReplacement(game))
    expect(revealDiscardReplacement(revealed)).toMatchObject({ ok: false, error: 'invalid_transition' })
    expect(get(beginBidding(revealed)).activeParticipant).toBe(before.openingOrder[before.roundIndex])
  })
  it('reveals at most 25 exclusive candidates and ends with 22 awards after three discards', () => {
    let game = initial()
    const seen = new Set<string>()
    let accepted = 0
    while (game.phase !== 'TEAMS_COMPLETED') {
      const candidate = currentRound(game).playerId
      expect(seen.has(candidate)).toBe(false); seen.add(candidate)
      const before = game
      game = doublePass(game)
      if (game.phase === 'DISCARD_RESULT') {
        expect(game.roundIndex).toBe(before.roundIndex)
        expect(game.teams).toBe(before.teams)
        expect(game.discardsRemaining).toBe(before.discardsRemaining - 1)
        game = get(beginBidding(get(revealDiscardReplacement(game))))
      } else {
        accepted++
        expect(game.discardsRemaining).toBe(0)
        game = get(nextAuctionRound(game, DRAFT_CATALOG))
        if (game.phase === 'NEXT_ROUND') game = get(beginBidding(get(revealNextAuctionRound(game))))
      }
    }
    expect(accepted).toBe(22); expect(seen.size).toBe(25)
    expect(game.record.filter((entry) => entry.type === 'discard')).toHaveLength(3)
    const all = Object.values(game.teams).flatMap((team) => Object.values(team.lineup))
    expect(new Set(all).size).toBe(22)
    expect(game.discardedPlayerIds.some((id) => all.includes(id))).toBe(false)
    for (const team of Object.values(game.teams)) expect(team.spent).toBeLessThanOrEqual(100)
  })
  it('reproduces replacements with the original context and ignores catalog ordering', () => {
    const game = initial()
    expect(discardReplacement(game, [...DRAFT_CATALOG].reverse())).toEqual(discardReplacement(game, DRAFT_CATALOG))
    expect(doublePass(initial())).toEqual(doublePass(game))
    const replacement = discardReplacement(game, DRAFT_CATALOG)!
    const excluded = { ...game, discardedPlayerIds: [replacement.playerId] }
    expect(discardReplacement(excluded, DRAFT_CATALOG)?.playerId).not.toBe(replacement.playerId)
    const discarded = doublePass(game)
    expect(canFinishRounds(discarded.rounds, discarded.roundIndex, discarded.teams, new Map(DRAFT_CATALOG.map((player) => [player.id, player])))).toBe(true)
  })
  it('does not consume a discard without a viable replacement and announces the legal fallback', () => {
    const game = initial()
    const pool = game.rounds.map((round) => DRAFT_CATALOG.find((player) => player.id === round.playerId)!)
    expect(discardReplacement(game, pool)).toBeNull()
    const first = get(passAuction(game, game.activeParticipant!, pool))
    const diagnostic = auctionAvailability(first, first.activeParticipant!, pool)
    expect(diagnostic.discardReason).toBe('NO_LEGAL_REPLACEMENT')
    expect(diagnostic.assignmentCode).toBe('MANDATORY_ASSIGNMENT')
    const awarded = get(passAuction(first, first.activeParticipant!, pool))
    expect(awarded.lastAward).toEqual(diagnostic.passAward)
    expect(awarded.discardsRemaining).toBe(3)
    const expensive = [...pool, { ...pool[0], id: 'expensive-replacement', position: currentRound(game).position, price: 300 }]
    expect(discardReplacement(game, expensive)).toBeNull()
  })
  it('blocks an impossible assignment without changing funds or discard count', () => {
    const game = initial()
    const impossible = { ...game, discardsRemaining: 0, teams: { recruiter_one: { ...game.teams.recruiter_one, spent: 100 }, recruiter_two: { ...game.teams.recruiter_two, spent: 100 } } }
    const passed = get(passAuction(impossible, impossible.activeParticipant!, DRAFT_CATALOG))
    expect(auctionAvailability(passed, passed.activeParticipant!, DRAFT_CATALOG).pass.reason).toBe('NO_LEGAL_ASSIGNMENT')
    expect(passAuction(passed, passed.activeParticipant!, DRAFT_CATALOG)).toMatchObject({ ok: false, error: 'no_legal_assignment' })
    expect(passed.teams.recruiter_one.spent).toBe(100); expect(passed.discardsRemaining).toBe(0)
  })
})
