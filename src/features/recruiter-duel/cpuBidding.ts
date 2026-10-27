import { catalogForMode } from '../themed-modes/modeCatalog'
import { ENGINE_VERSION } from '../local-match/engine/engineConstants'
import { resolveSeries } from '../local-match/matchSeries'
import { auctionBudgetOf, startDuelMatch } from './auctionEngine'
import type { RecruiterDuelGame } from './auctionTypes'
import type { CpuDifficulty, CpuStrategy } from './cpuPolicy'
import { playMeasured, type HumanPolicy } from './cpuSimulation'

/** Sprint 7: how hard the CPU fights for a card, measured on whole auctions plus the series the player actually plays. */
const catalog = catalogForMode('GLOBAL_CLASSIC')
const price = new Map(catalog.map((player) => [player.id, player.price] as const))
const ovr = (game: RecruiterDuelGame, side: 'recruiter_one' | 'recruiter_two') => { const ids = Object.values(game.teams[side].lineup); return ids.reduce((sum, id) => sum + catalog.find((p) => p.id === id)!.overall_rating, 0) / ids.length }

export interface RoundFight { readonly humanBids: number; readonly cpuBids: number; readonly cpuRaises: number; readonly winner: 'recruiter_one' | 'recruiter_two' | null; readonly overprice: number }

/** Per card with at least one bid: bids of each side, the CPU's raises over a human offer, who won and how far above the base price. */
export function fights(game: RecruiterDuelGame): RoundFight[] {
  const rounds = new Map<number, { humanBids: number; cpuBids: number; cpuRaises: number; last: 'human' | 'cpu' | null; winner: RoundFight['winner']; overprice: number }>()
  const get = (round: number) => { let entry = rounds.get(round); if (!entry) { entry = { humanBids: 0, cpuBids: 0, cpuRaises: 0, last: null, winner: null, overprice: 0 }; rounds.set(round, entry) } return entry }
  for (const record of game.record) {
    if (record.type === 'bid') {
      const entry = get(record.round)
      if (record.participant === 'recruiter_two') { entry.cpuBids++; if (entry.last === 'human') entry.cpuRaises++; entry.last = 'cpu' } else { entry.humanBids++; entry.last = 'human' }
    } else if (record.type === 'award' && record.reason === 'voluntary_bid') {
      const entry = get(record.round); entry.winner = record.winner; entry.overprice = record.price - (price.get(record.playerId) ?? record.price)
    }
  }
  return [...rounds.values()]
}

export function measureBidding(difficulty: CpuDifficulty, strategy: CpuStrategy, human: HumanPolicy, seeds: number) {
  const total = { contested: 0, raises: 0, threeOrMore: 0, cpuWonContested: 0, overpriceCpuWon: 0, overpriceHumanWon: 0, humanWonCount: 0, overpriceAll: 0, cpuBids: 0, spendPct: 0, discards: 0, cpuOvr: 0, humanOvr: 0, cpuSeriesWins: 0, cpuSingleWins: 0 }
  for (let index = 0; index < seeds; index++) {
    const game = playMeasured(`s1-${index}`, strategy, difficulty, human)
    for (const fight of fights(game)) {
      total.cpuBids += fight.cpuBids
      if (!fight.humanBids || !fight.cpuBids) continue
      total.contested++; total.raises += fight.cpuRaises; total.threeOrMore += Number(fight.cpuRaises >= 3); total.overpriceAll += fight.overprice
      if (fight.winner === 'recruiter_two') { total.cpuWonContested++; total.overpriceCpuWon += fight.overprice } else if (fight.winner === 'recruiter_one') { total.overpriceHumanWon += fight.overprice; total.humanWonCount++ }
    }
    total.spendPct += game.teams.recruiter_two.spent / auctionBudgetOf(game) * 100
    total.discards += 5 - game.discardsRemaining
    total.cpuOvr += ovr(game, 'recruiter_two'); total.humanOvr += ovr(game, 'recruiter_one')
    const first = startDuelMatch(game, catalog, undefined, true, ENGINE_VERSION); if (!first.ok) throw new Error(first.error)
    total.cpuSeriesWins += Number(resolveSeries(first.game.matchResult!, catalog).winner === 'cpu')
    const single = startDuelMatch(game, catalog); if (single.ok) total.cpuSingleWins += Number(single.game.matchResult!.winner === 'cpu')
  }
  const round = (value: number, digits = 2) => Math.round(value * 10 ** digits) / 10 ** digits
  const per = (value: number, count: number) => count ? round(value / count) : 0
  return {
    human, difficulty, strategy, games: seeds,
    contestedCards: total.contested, contestedPerGame: round(total.contested / seeds),
    cpuRaisesPerContested: per(total.raises, total.contested), pctContestedWith3PlusRaises: per(total.threeOrMore * 100, total.contested),
    cpuWinsContestedPct: per(total.cpuWonContested * 100, total.contested),
    overpriceContestedAvg: per(total.overpriceAll, total.contested), overpriceWhenCpuWins: per(total.overpriceCpuWon, total.cpuWonContested), overpriceWhenHumanWins: per(total.overpriceHumanWon, total.humanWonCount),
    cpuBidsPerGame: round(total.cpuBids / seeds), cpuSpendPct: round(total.spendPct / seeds, 1), discardsPerGame: round(total.discards / seeds),
    cpuOvr: round(total.cpuOvr / seeds), humanOvr: round(total.humanOvr / seeds),
    cpuSeriesWinPct: round(total.cpuSeriesWins * 100 / seeds, 1), cpuSingleMatchWinPct: round(total.cpuSingleWins * 100 / seeds, 1),
  }
}
export type BiddingCell = ReturnType<typeof measureBidding>

/** Seeds per cell: 100 for BALANCED, 40 for the other two profiles (NORMAL and HARD only). CPU_QUICK uses 30 seeds for fast iteration. */
export const biddingCells = (): readonly { difficulty: CpuDifficulty; strategy: CpuStrategy; seeds: number }[] => process.env.CPU_QUICK
  ? (['EASY', 'NORMAL', 'HARD'] as const).map((difficulty) => ({ difficulty, strategy: 'BALANCED' as const, seeds: 30 }))
  : [
    ...(['EASY', 'NORMAL', 'HARD'] as const).map((difficulty) => ({ difficulty, strategy: 'BALANCED' as const, seeds: 100 })),
    ...(['NORMAL', 'HARD'] as const).flatMap((difficulty) => (['CONSERVATIVE', 'AGGRESSIVE'] as const).map((strategy) => ({ difficulty, strategy, seeds: 40 }))),
  ]
