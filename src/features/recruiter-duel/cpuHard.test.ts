import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { catalogForMode } from '../themed-modes/modeCatalog'
import { createRecruiterDuel } from './auctionEngine'
import { CLASSIC_CONFIG } from './matchConfig'
import { CPU_DIFFICULTIES, decideCpu, privateValuation } from './cpuPolicy'
import { measureCell, playMeasured } from './cpuSimulation'

const catalog = catalogForMode('GLOBAL_CLASSIC')
const baseline = (JSON.parse(readFileSync('docs/qa/SPRINT-1-cpu-baseline.json', 'utf8')) as { cells: ReturnType<typeof measureCell>[] }).cells
const easy = (JSON.parse(readFileSync('docs/qa/SPRINT-4-cpu-easy.json', 'utf8')) as { cells: ReturnType<typeof measureCell>[] }).cells
const pick = (cells: typeof baseline, human: string, difficulty: string) => cells.find((cell) => cell.human === human && cell.difficulty === difficulty && cell.strategy === 'BALANCED')!
// NORMAL is pinned to the sprint 1 measurement; EASY was deliberately changed in sprint 4 and is pinned to its own measurement.
const baselineCell = (human: string, difficulty: string) => pick(difficulty === 'EASY' ? easy : baseline, human, difficulty)

describe('HARD CPU (sprint 1)', () => {
  it('is deterministic per seed', () => {
    for (const difficulty of CPU_DIFFICULTIES) {
      const first = playMeasured('hard-det', 'BALANCED', difficulty, 'value_buyer')
      const second = playMeasured('hard-det', 'BALANCED', difficulty, 'value_buyer')
      expect(second.record).toEqual(first.record)
    }
  })

  it('keeps NORMAL as measured in sprint 1, EASY as measured in sprint 4, and ignores the standing offer', () => {
    for (const difficulty of ['EASY', 'NORMAL'] as const) {
      const before = baselineCell('naive', difficulty)
      expect(measureCell(difficulty, 'BALANCED', 'naive', before.games)).toEqual(before)
    }
    const created = createRecruiterDuel(catalog, 'ignore-bid', undefined, CLASSIC_CONFIG)
    if (!created.ok) throw new Error(created.error)
    const context = { seed: 'ignore-bid', roundIndex: 3, player: catalog[5], team: created.game.teams.recruiter_two, publicCatalog: catalog, acquiredIds: [] }
    for (const difficulty of ['EASY', 'NORMAL'] as const) for (const strategy of ['CONSERVATIVE', 'BALANCED', 'AGGRESSIVE'] as const) {
      expect(privateValuation({ ...context, difficulty, currentBid: 9 }, strategy)).toBe(privateValuation({ ...context, difficulty }, strategy))
    }
  })

  it('orders the difficulties by what the CPU is willing to pay and HARD builds the best eleven', () => {
    const created = createRecruiterDuel(catalog, 'order', undefined, CLASSIC_CONFIG)
    if (!created.ok) throw new Error(created.error)
    const sums = { EASY: 0, NORMAL: 0, HARD: 0 }
    for (let index = 0; index < 150; index++) for (const difficulty of CPU_DIFFICULTIES) {
      sums[difficulty] += privateValuation({ seed: `order-${index}`, roundIndex: 0, player: catalog[index], team: created.game.teams.recruiter_two, publicCatalog: catalog, acquiredIds: [], difficulty }, 'BALANCED')
    }
    expect(sums.EASY).toBeLessThan(sums.NORMAL)
    expect(sums.NORMAL).toBeLessThan(sums.HARD)
    const ovr = { NORMAL: 0, HARD: 0 }
    for (const difficulty of ['NORMAL', 'HARD'] as const) ovr[difficulty] = measureCell(difficulty, 'BALANCED', 'value_buyer', 20).cpuOvr
    expect(ovr.HARD).toBeGreaterThan(ovr.NORMAL + .5)
  })

  it('never offers above the private maximum or the maximum safe bid', () => {
    for (const human of ['naive', 'star_hunter', 'value_buyer'] as const) {
      const game = playMeasured(`hard-safe-${human}`, 'AGGRESSIVE', 'HARD', human)
      // playMeasured throws on any unsafe_bid; the audited decisions must also respect the private ceiling.
      for (const entry of game.record) if (entry.type === 'cpu_decision' && entry.action === 'bid') expect(entry.amount).toBeLessThanOrEqual(entry.privateMaximum)
    }
    const created = createRecruiterDuel(catalog, 'tech-cap', undefined, CLASSIC_CONFIG)
    if (!created.ok) throw new Error(created.error)
    const context = { seed: 'tech-cap', roundIndex: 0, player: catalog[0], team: created.game.teams.recruiter_two, publicCatalog: catalog, acquiredIds: [], difficulty: 'HARD' as const }
    for (const cap of [catalog[0].price, catalog[0].price + 1, catalog[0].price + 5]) {
      const decision = decideCpu(context, 'AGGRESSIVE', null, cap)
      if (decision.action === 'bid') expect(decision.amount).toBeLessThanOrEqual(cap)
    }
  })
})

describe('EASY CPU (sprint 4)', () => {
  it('builds a clearly weaker eleven than NORMAL against the three simulated humans, with the same seeds', () => {
    for (const human of ['naive', 'star_hunter', 'value_buyer'] as const) {
      const weak = measureCell('EASY', 'BALANCED', human, 40); const normal = measureCell('NORMAL', 'BALANCED', human, 40)
      // Measured gap over all cells is 1.0-1.7 OVR; the 40-seed BALANCED slice keeps a margin over the 0.8 target.
      expect(normal.cpuOvr - weak.cpuOvr).toBeGreaterThanOrEqual(.8)
    }
  })
  it('is not absurd: it completes a legal eleven and spends part of the budget', () => {
    const cell = measureCell('EASY', 'AGGRESSIVE', 'star_hunter', 20)
    expect(cell.cpuOvr).toBeGreaterThan(84)
    expect(cell.cpuLeft).toBeLessThan(110) // budget 160: it signs 11 players and spends at least 50
    for (const strategy of ['CONSERVATIVE', 'BALANCED', 'AGGRESSIVE'] as const) {
      const game = playMeasured('easy-legal', strategy, 'EASY', 'value_buyer')
      expect(new Set(Object.values(game.teams.recruiter_two.lineup)).size).toBe(11)
    }
  })
  it('never offers above the private maximum or the maximum safe bid, and keeps seeded determinism', () => {
    const first = playMeasured('easy-safe', 'AGGRESSIVE', 'EASY', 'naive'); const second = playMeasured('easy-safe', 'AGGRESSIVE', 'EASY', 'naive')
    expect(second.record).toEqual(first.record)
    for (const entry of first.record) if (entry.type === 'cpu_decision' && entry.action === 'bid') expect(entry.amount).toBeLessThanOrEqual(entry.privateMaximum)
  })
  it('orders the average valuation EASY < NORMAL < HARD for the cards of the pool', () => {
    const created = createRecruiterDuel(catalog, 'easy-order', undefined, CLASSIC_CONFIG)
    if (!created.ok) throw new Error(created.error)
    const sums = { EASY: 0, NORMAL: 0, HARD: 0 }
    for (let index = 0; index < 150; index++) for (const difficulty of CPU_DIFFICULTIES) sums[difficulty] += privateValuation({ seed: `easy-order-${index}`, roundIndex: 0, player: catalog[index], team: created.game.teams.recruiter_two, publicCatalog: catalog, acquiredIds: [], difficulty }, 'BALANCED')
    expect(sums.EASY).toBeLessThan(sums.NORMAL); expect(sums.NORMAL).toBeLessThan(sums.HARD)
  })
})
