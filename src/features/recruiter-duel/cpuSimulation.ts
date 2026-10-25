import { expect } from 'vitest'
import { catalogForMode } from '../themed-modes/modeCatalog'
import { defaultBudgetForMode } from '../player-catalog/leagueCollections'
import { CLASSIC_CONFIG, DISCARDS_MARKER_V2 } from './matchConfig'
import { takeCpuTurn, type CpuDifficulty, type CpuStrategy } from './cpuPolicy'
import { auctionAvailability, auctionBudgetOf, beginBidding, createRecruiterDuel, nextAuctionRound, passAuction, placeBid, positionProgress, revealCoinToss, revealDiscardReplacement, revealNextAuctionRound, startCoinToss, startDuelMatch } from './auctionEngine'
import type { AuctionTransition, RecruiterDuelGame } from './auctionTypes'

/** Sprint 1 simulation harness: three simulated humans against the CPU on GLOBAL_CLASSIC. */
export const HUMANS = ['naive', 'star_hunter', 'value_buyer'] as const
/** Sprint 7: raises by +1 while the minimum is within 6M of the base price (and up to the safe maximum on stars), so every card can be fought for. */
export const BID_HUMANS = [...HUMANS, 'insistent'] as const
export type HumanPolicy = (typeof BID_HUMANS)[number]

const catalog = catalogForMode('GLOBAL_CLASSIC')
export const simulationConfig = { ...CLASSIC_CONFIG, budget: defaultBudgetForMode('GLOBAL_CLASSIC'), discards: DISCARDS_MARKER_V2 }
const must = (value: AuctionTransition): RecruiterDuelGame => { if (!value.ok) throw new Error(value.error); return value.game }
const POSITIONS = ['ARQ', 'DEF', 'MED', 'DEL'] as const

export function playMeasured(seed: string, strategy: CpuStrategy, difficulty: CpuDifficulty, human: HumanPolicy): RecruiterDuelGame {
  const created = createRecruiterDuel(catalog, seed, undefined, simulationConfig)
  if (!created.ok) throw new Error(created.error)
  let game = must(beginBidding(must(revealCoinToss(must(startCoinToss(created.game, 'heads'))))))
  for (let step = 0; step < 1500 && game.phase !== 'TEAMS_COMPLETED'; step++) {
    if (game.phase === 'DISCARD_RESULT') { game = must(revealDiscardReplacement(game)); continue }
    if (game.phase === 'NEXT_ROUND') { game = must(revealNextAuctionRound(game)); continue }
    if (game.phase === 'REVEAL_PLAYER') { game = must(beginBidding(game)); continue }
    if (game.phase === 'ROUND_RESULT') { game = must(nextAuctionRound(game, catalog)); continue }
    if (game.activeParticipant === 'recruiter_two') { game = must(takeCpuTurn(game, catalog, strategy, difficulty)); continue }
    const availability = auctionAvailability(game, 'recruiter_one', catalog)
    const player = catalog.find((record) => record.id === game.rounds[game.roundIndex].playerId)!
    const team = game.teams.recruiter_one
    const slotsLeft = POSITIONS.reduce((total, position) => total + positionProgress(team, position).remaining, 0)
    const balance = auctionBudgetOf(game) - team.spent
    const min = availability.minimum
    let wants: boolean
    if (human === 'naive') wants = min <= player.price + 2
    else if (human === 'insistent') wants = player.overall_rating >= 91 ? true : min <= player.price + 6
    else if (human === 'star_hunter') wants = player.overall_rating >= 91 ? true : min <= player.price + 1
    else wants = min <= Math.min(availability.maximum, player.price + Math.max(0, player.overall_rating - 84) * .6 + 1) && min <= 1.6 * (balance / Math.max(1, slotsLeft))
    game = availability.bid.enabled && wants ? must(placeBid(game, 'recruiter_one', min, catalog)) : must(passAuction(game, 'recruiter_one', catalog))
  }
  expect(game.phase).toBe('TEAMS_COMPLETED')
  return game
}

const ratingOf = (id: string | null) => catalog.find((player) => player.id === id)!.overall_rating
const stats = (game: RecruiterDuelGame, side: 'recruiter_one' | 'recruiter_two') => {
  const ratings = Object.values(game.teams[side].lineup).map(ratingOf)
  return { ovr: ratings.reduce((a, b) => a + b, 0) / ratings.length, left: auctionBudgetOf(game) - game.teams[side].spent, stars: ratings.filter((r) => r >= 91).length }
}

export function measureCell(difficulty: CpuDifficulty, strategy: CpuStrategy, human: HumanPolicy, seeds: number) {
  const cell = { human, difficulty, strategy, games: seeds, cpuOvr: 0, humanOvr: 0, cpuLeft: 0, humanLeft: 0, cpuStars: 0, humanStars: 0, cpuWins: 0, draws: 0, cpuLosses: 0 }
  for (let index = 0; index < seeds; index++) {
    const game = playMeasured(`s1-${index}`, strategy, difficulty, human)
    const cpu = stats(game, 'recruiter_two'); const me = stats(game, 'recruiter_one')
    cell.cpuOvr += cpu.ovr; cell.humanOvr += me.ovr; cell.cpuLeft += cpu.left; cell.humanLeft += me.left; cell.cpuStars += cpu.stars; cell.humanStars += me.stars
    const winner = must(startDuelMatch(game, catalog)).matchResult!.winner
    if (winner === 'cpu') cell.cpuWins++; else if (winner === 'local') cell.cpuLosses++; else cell.draws++
  }
  const mean = (value: number) => Math.round(value / seeds * 100) / 100
  return { ...cell, cpuOvr: mean(cell.cpuOvr), humanOvr: mean(cell.humanOvr), cpuLeft: mean(cell.cpuLeft), humanLeft: mean(cell.humanLeft), cpuStars: mean(cell.cpuStars), humanStars: mean(cell.humanStars) }
}

export const seedsFor = (difficulty: CpuDifficulty, strategy: CpuStrategy) => process.env.CPU_QUICK ? 30 : strategy === 'BALANCED' && difficulty !== 'EASY' ? 100 : 40

