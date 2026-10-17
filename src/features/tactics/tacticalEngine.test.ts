import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { DRAFT_CATALOG } from '../draft/catalog'
import { DRAFT_SLOTS } from '../draft/draftTypes'
import { generateCpuTeam } from '../local-match/cpuTeam'
import { MATCH_RULES_VERSION, MATCH_MINUTES } from '../local-match/matchTypes'
import { isValidOrganizedLineup, simulateMatch } from '../local-match/simulator'
import { createRecruiterDuel, startDuelMatch } from '../recruiter-duel/auctionEngine'
import type { RecruiterDuelGame } from '../recruiter-duel/auctionTypes'
import { selectCpuStrategy } from './cpuStrategy'
import { swapWithinLine } from './lineupOrdering'
import { NEUTRAL_SELECTION, STRATEGY_IDS, STRATEGY_PROFILES, TACTICS_VERSION, parseStrategySelection, type StrategyId } from './strategies'
import { ADJUSTMENT_LIMIT, tacticalAdjustment, tacticalFeatures } from './tacticalModel'

const lineupOf = (seed: string) => generateCpuTeam(DRAFT_CATALOG, seed).team.lineup
const run = (local: ReturnType<typeof lineupOf>, cpu: ReturnType<typeof lineupOf>, seed: string, tactics?: { local: StrategyId; cpu: StrategyId }) =>
  simulateMatch({ localLineup: local, cpuLineup: cpu, catalog: DRAFT_CATALOG, catalogVersion: 'catalog_v1', rulesVersion: MATCH_RULES_VERSION, seed, ...(tactics ? { tactics: { version: TACTICS_VERSION, ...tactics } } : {}) })
const fingerprint = (r: ReturnType<typeof run>) => createHash('sha256').update(JSON.stringify({ b: r.blocks, s: r.stats, sc: r.score, st: r.strengths, w: r.winner })).digest('hex').slice(0, 16)

describe('NEUTRAL compatibility with local-match-v2', () => {
  it('reproduces 300 recorded v2 results when no strategy or NEUTRAL vs NEUTRAL is supplied', () => {
    const golden = JSON.parse(readFileSync('src/features/tactics/v2-golden.json', 'utf8')) as { pairs: string[][]; hashes: string[] }
    let index = 0
    for (const [a, b] of golden.pairs) {
      const local = lineupOf(a); const cpu = lineupOf(b)
      for (let i = 0; i < 150; i++, index++) {
        const legacy = run(local, cpu, `golden-${a}-${i}`)
        expect(fingerprint(legacy)).toBe(golden.hashes[index])
        expect(fingerprint(run(local, cpu, `golden-${a}-${i}`, { local: 'NEUTRAL', cpu: 'NEUTRAL' }))).toBe(golden.hashes[index])
        expect(legacy.tactics).toEqual({ version: TACTICS_VERSION, selection: { local: 'NEUTRAL', cpu: 'NEUTRAL' }, adjustments: { local: { attack: 0, defense: 0, midfield: 0 }, cpu: { attack: 0, defense: 0, midfield: 0 } } })
      }
    }
    expect(index).toBe(golden.hashes.length)
  })
})

describe('strategy contracts', () => {
  it('has six documented stable identifiers and rejects invalid selections', () => {
    expect(STRATEGY_IDS).toEqual(['NEUTRAL', 'MIDFIELD_CONTROL', 'WIDE_PLAY', 'COUNTER_ATTACK', 'HIGH_PRESS', 'LOW_BLOCK'])
    for (const id of STRATEGY_IDS) for (const text of ['objective', 'favorable', 'advantages', 'risks'] as const) expect(STRATEGY_PROFILES[id][text].length).toBeGreaterThan(3)
    expect(parseStrategySelection(NEUTRAL_SELECTION)).toEqual(NEUTRAL_SELECTION)
    for (const bad of [null, 'NEUTRAL', {}, { version: 'tactics-v0', local: 'NEUTRAL', cpu: 'NEUTRAL' }, { version: TACTICS_VERSION, local: 'TIKI_TAKA', cpu: 'NEUTRAL' }, { version: TACTICS_VERSION, local: 'NEUTRAL' }]) expect(parseStrategySelection(bad)).toBeNull()
    const local = lineupOf('c-a'); const cpu = lineupOf('c-b')
    expect(() => simulateMatch({ localLineup: local, cpuLineup: cpu, catalog: DRAFT_CATALOG, catalogVersion: 'catalog_v1', rulesVersion: MATCH_RULES_VERSION, seed: 's', tactics: { version: TACTICS_VERSION, local: 'BOGUS' as StrategyId, cpu: 'NEUTRAL' } })).toThrow('invalid_strategy')
  })
})

describe('tactical model', () => {
  const teams = Array.from({ length: 24 }, (_, index) => tacticalFeatures(lineupOf(`model-${index}`), DRAFT_CATALOG))
  it('keeps every adjustment bounded and gives each non-neutral strategy both gains and costs', () => {
    for (const strategy of STRATEGY_IDS) {
      let gain = false; let cost = false
      for (const own of teams) for (const opponent of teams.slice(0, 6)) for (const rival of STRATEGY_IDS) for (let block = 0; block < MATCH_MINUTES.length; block++) {
        const adjustment = tacticalAdjustment(strategy, own, opponent, rival, block)
        for (const value of Object.values(adjustment)) {
          expect(Math.abs(value)).toBeLessThanOrEqual(ADJUSTMENT_LIMIT)
          gain ||= value > 0.5; cost ||= value < -0.5
        }
      }
      if (strategy === 'NEUTRAL') expect({ gain, cost }).toEqual({ gain: false, cost: false })
      else expect({ strategy, gain, cost }).toEqual({ strategy, gain: true, cost: true })
    }
  })
  it('depends on both squads and on the rival strategy, with no fixed winner table', () => {
    const [own, opponent] = [teams[0], teams[1]]
    const attackVs = (rival: StrategyId) => tacticalAdjustment('COUNTER_ATTACK', own, opponent, rival, 0).attack
    expect(attackVs('HIGH_PRESS')).toBeGreaterThan(attackVs('NEUTRAL'))
    expect(attackVs('LOW_BLOCK')).toBe(0)
    const control = (rival: StrategyId) => tacticalAdjustment('MIDFIELD_CONTROL', own, opponent, rival, 0).midfield
    expect(control('LOW_BLOCK')).toBeLessThan(control('NEUTRAL'))
    expect(control('HIGH_PRESS')).toBeLessThan(control('NEUTRAL'))
    const press = (rival: typeof opponent) => tacticalAdjustment('HIGH_PRESS', own, rival, 'NEUTRAL', 0).midfield
    const secure = { ...opponent, midfieldControl: 95 }; const loose = { ...opponent, midfieldControl: 72 }
    expect(press(secure)).toBeLessThan(press(loose))
    // The high press fades through the match for a low-stamina squad, and not for a fit one.
    const tired = { ...own, stamina: 78 }; const fit = { ...own, stamina: 95 }
    expect(tacticalAdjustment('HIGH_PRESS', tired, opponent, 'NEUTRAL', 5).midfield).toBeLessThan(tacticalAdjustment('HIGH_PRESS', tired, opponent, 'NEUTRAL', 0).midfield)
    expect(tacticalAdjustment('HIGH_PRESS', fit, opponent, 'NEUTRAL', 5).midfield).toBeCloseTo(tacticalAdjustment('HIGH_PRESS', fit, opponent, 'NEUTRAL', 0).midfield, 5)
  })
  it('uses the organised slots: moving the best winger to the striker slot changes WIDE_PLAY', () => {
    const lineup = lineupOf('organise')
    const features = tacticalFeatures(lineup, DRAFT_CATALOG)
    const swapped = swapWithinLine(lineup, 'LW', 'ST')
    if (!swapped.ok) throw new Error(swapped.error)
    const moved = tacticalFeatures(swapped.lineup, DRAFT_CATALOG)
    expect(swapped.lineup.LW).toBe(lineup.ST)
    expect(moved.flankThreat).not.toBeCloseTo(features.flankThreat, 6)
  })
})

describe('match integration', () => {
  const local = lineupOf('int-a'); const cpu = lineupOf('int-b')
  it('is deterministic, keeps events and score coherent and records the strategies', () => {
    for (const a of STRATEGY_IDS) for (const b of STRATEGY_IDS) {
      const first = run(local, cpu, `int-${a}-${b}`, { local: a, cpu: b }); const second = run(local, cpu, `int-${a}-${b}`, { local: a, cpu: b })
      expect(second).toEqual(first)
      expect(first.tactics?.selection).toEqual({ local: a, cpu: b })
      expect(first.blocks).toHaveLength(6); expect(first.local.players).toHaveLength(11)
      for (const side of ['local', 'cpu'] as const) expect(first.blocks.flatMap((block) => block.events).filter((event) => event.type === 'goal' && event.side === side)).toHaveLength(first.score[side])
      expect(first.stats.local.possession + first.stats.cpu.possession).toBe(100)
    }
  })
  it('changes the sectoral base only through the reported adjustment, never the base strengths', () => {
    const neutral = run(local, cpu, 'int-base'); const tactical = run(local, cpu, 'int-base', { local: 'LOW_BLOCK', cpu: 'WIDE_PLAY' })
    expect(tactical.strengths).toEqual(neutral.strengths)
    expect(tactical.tactics?.adjustments.local.attack).toBeLessThan(0)
  })
})

describe('boundary validation', () => {
  const created = createRecruiterDuel(DRAFT_CATALOG, 'c2')
  if (!created.ok) throw new Error(created.error)
  const one = lineupOf('bv-one')
  const used = new Set(Object.values(one))
  const two = generateCpuTeam(DRAFT_CATALOG.filter((player) => !used.has(player.id)), 'bv-two').team.lineup
  const cost = (lineup: typeof one) => Object.values(lineup).reduce((total, id) => total + DRAFT_CATALOG.find((player) => player.id === id)!.price, 0)
  const game: RecruiterDuelGame = { ...created.game, phase: 'TEAMS_COMPLETED', teams: { recruiter_one: { lineup: one, spent: cost(one) }, recruiter_two: { lineup: two, spent: cost(two) } } }
  it('accepts organised elevens and rejects extra keys, cross-line placement and duplicates', () => {
    expect(isValidOrganizedLineup(one, DRAFT_CATALOG)).toBe(true)
    const swapped = swapWithinLine(one, 'LCB', 'RB'); if (!swapped.ok) throw new Error(swapped.error)
    expect(isValidOrganizedLineup(swapped.lineup, DRAFT_CATALOG)).toBe(true)
    expect(isValidOrganizedLineup({ ...one, EXTRA: one.GK } as never, DRAFT_CATALOG)).toBe(false)
    expect(isValidOrganizedLineup({ ...one, GK: one.LB, LB: one.GK }, DRAFT_CATALOG)).toBe(false)
    expect(isValidOrganizedLineup({ ...one, RB: one.LB }, DRAFT_CATALOG)).toBe(false)
    expect(isValidOrganizedLineup({ ...one, RB: null }, DRAFT_CATALOG)).toBe(false)
  })
  it('startDuelMatch returns controlled errors instead of throwing and stores the chosen strategies', () => {
    expect(startDuelMatch({ ...game, teams: { ...game.teams, recruiter_one: { ...game.teams.recruiter_one, lineup: { ...one, GK: one.LB, LB: one.GK } } } }, DRAFT_CATALOG)).toEqual({ ok: false, error: 'teams_invalid' })
    expect(startDuelMatch(game, DRAFT_CATALOG, { recruiter_one: 'TIKI_TAKA', recruiter_two: 'NEUTRAL' })).toEqual({ ok: false, error: 'invalid_strategy' })
    const legacy = startDuelMatch(game, DRAFT_CATALOG); const chosen = startDuelMatch(game, DRAFT_CATALOG, { recruiter_one: 'HIGH_PRESS', recruiter_two: 'LOW_BLOCK' })
    if (!legacy.ok || !chosen.ok) throw new Error('start')
    expect(legacy.game.strategies).toEqual({ recruiter_one: 'NEUTRAL', recruiter_two: 'NEUTRAL' })
    expect(chosen.game.matchResult?.tactics?.selection).toEqual({ local: 'HIGH_PRESS', cpu: 'LOW_BLOCK' })
    expect(DRAFT_SLOTS).toHaveLength(11)
  })
})

describe('CPU strategy selection', () => {
  it('is fixed before knowing the rival: only its own eleven and a seed are inputs', () => {
    expect(selectCpuStrategy.length).toBe(3)
    const lineup = lineupOf('cpu-s')
    expect(selectCpuStrategy(lineup, DRAFT_CATALOG, 'seed-1')).toBe(selectCpuStrategy(lineup, DRAFT_CATALOG, 'seed-1'))
  })
  it('chooses valid strategies with variety across seeds and squads', () => {
    const seen = new Set<StrategyId>()
    for (let index = 0; index < 120; index++) seen.add(selectCpuStrategy(lineupOf(`cpu-${index % 12}`), DRAFT_CATALOG, `seed-${index}`))
    for (const id of seen) expect(STRATEGY_IDS).toContain(id)
    expect(seen.size).toBeGreaterThanOrEqual(4)
  })
})
