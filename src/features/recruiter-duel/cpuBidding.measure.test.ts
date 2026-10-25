import { writeFileSync } from 'node:fs'
import { describe, it } from 'vitest'
import { BID_HUMANS } from './cpuSimulation'
import { biddingCells, measureBidding } from './cpuBidding'

/** Sprint 7 measurement (opt-in): CPU_BIDDING=<file> writes the fights / overprice / spend / series report to that path. */
const humans = BID_HUMANS.filter((human) => human !== 'naive')
describe.skipIf(!process.env.CPU_BIDDING)('sprint 7 bidding measurement', () => {
  it('measures every simulated human against the CPU profiles', () => {
    const cells = humans.flatMap((human) => biddingCells().map((cell) => measureBidding(cell.difficulty, cell.strategy, human, cell.seeds)))
    writeFileSync(process.env.CPU_BIDDING!, JSON.stringify({ mode: 'GLOBAL_CLASSIC', humans, note: 'raises = CPU bids placed over a human bid; contested = both sides bid on the card; overprice = award price minus base price', cells }, null, 2) + '\n')
  }, 1_800_000)
})
