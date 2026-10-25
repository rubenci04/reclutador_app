import { writeFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { DRAFT_CATALOG } from '../draft/catalog'
import { TIER_RULES } from '../../data/catalogRules'
import { createRecruiterDuel, canFinishRounds } from './auctionEngine'
import { createDrawContext, DRAW_HISTORY_KEY, newDrawSeed, parseReplay, readDrawHistory } from './drawHistory'
import type { RecruiterDuelGame } from './auctionTypes'

function draw(seed: string, recent?: readonly (readonly string[])[], catalog = DRAFT_CATALOG): RecruiterDuelGame {
  const result = createRecruiterDuel(catalog, seed, recent ? createDrawContext(catalog, recent) : undefined)
  if (!result.ok) throw new Error(`Unavailable draw ${seed}`)
  return result.game
}
const ids = (game: RecruiterDuelGame) => game.rounds.map((round) => round.playerId)

describe('versioned auction draw context', () => {
  it('gets fresh entropy on every explicit request', () => {
    const entropy = vi.spyOn(crypto, 'getRandomValues')
    const seeds = new Set(Array.from({ length: 100 }, () => newDrawSeed()))
    expect(seeds.size).toBe(100)
    expect(entropy).toHaveBeenCalledTimes(100)
    entropy.mockRestore()
  })
  it('exports and imports the exact draw without local history, and ignores catalog order', () => {
    const initial = draw('initial', [])
    const game = draw('replay', [ids(initial)])
    const replay = parseReplay(JSON.stringify({ seed: game.seed, context: game.drawContext }), DRAFT_CATALOG)!
    localStorage.clear()
    const recreated = createRecruiterDuel([...DRAFT_CATALOG].reverse(), replay.seed, replay.context)
    expect(recreated.ok && recreated.game.rounds).toEqual(game.rounds)
    expect(recreated.ok && recreated.game.coinResult).toEqual(game.coinResult)
    expect(draw('replay', []).rounds).not.toEqual(game.rounds)
  })
  it('rejects incompatible, oversized, duplicate and unknown historical entries', () => {
    const context = createDrawContext(DRAFT_CATALOG)
    for (const candidate of [{ ...context, version: 2 }, { ...context, catalogKey: 'changed' }, { ...context, recent: [['unknown']] }, { ...context, recent: [['plr_001', 'plr_001']] }, { ...context, recent: Array(6).fill([]) }]) {
      expect(parseReplay(JSON.stringify({ seed: 's', context: candidate }), DRAFT_CATALOG)).toBeNull()
      expect(createRecruiterDuel(DRAFT_CATALOG, 's', candidate as typeof context).ok).toBe(false)
    }
    expect(parseReplay('{broken', DRAFT_CATALOG)).toBeNull()
    expect(readDrawHistory({ getItem: () => { throw new Error('blocked') } }, DRAFT_CATALOG)).toMatchObject({ warning: true, history: { games: [] } })
    for (const raw of ['{}', '{broken', JSON.stringify({ version: 1, games: Array(6).fill({}) })]) {
      localStorage.setItem(DRAW_HISTORY_KEY, raw)
      expect(readDrawHistory(localStorage, DRAFT_CATALOG).warning).toBe(true)
    }
    localStorage.clear()
  })
  it('relaxes scarce pools without excluding recent players and terminates infeasible pools', () => {
    const pool = draw('small', []).rounds.map((round) => DRAFT_CATALOG.find((player) => player.id === round.playerId)!)
    const game = draw('scarce', Array(5).fill(pool.map((player) => player.id)), pool)
    expect(new Set(ids(game))).toEqual(new Set(pool.map((player) => player.id)))
    expect(game.drawDiagnostics?.smallPoolPositions).toEqual(['ARQ', 'DEF', 'MED', 'DEL'])
    expect(game.drawDiagnostics!.attempts).toBeLessThanOrEqual(48)
    const expensive = pool.map((player) => ({ ...player, price: 100 }))
    expect(createRecruiterDuel(expensive, 'impossible', createDrawContext(expensive)).ok).toBe(false)
    expect(createRecruiterDuel([...pool, pool[0]], 'duplicates').ok).toBe(false)
  })
})

it('diagnoses 1,000 reproducible draws per policy, including quotas, budgets, frequencies and overlaps', () => {
  const catalog = new Map(DRAFT_CATALOG.map((player) => [player.id, player]))
  function sample(weighted: boolean) {
    const recent: string[][] = []
    const frequencies = Object.fromEntries(DRAFT_CATALOG.map((player) => [player.id, 0]))
    const tiers = Object.fromEntries(Object.keys(TIER_RULES).map((tier) => [tier, 0]))
    const overlaps: number[] = []; const recentOverlaps: number[] = []; const fourWay: number[] = []
    let maxAttempts = 0; let relaxed = 0; let totalBaseCost = 0
    for (let index = 0; index < 1000; index++) {
      const game = draw(`005F-sample-${index}`, weighted ? recent : undefined)
      const selected = ids(game)
      expect(new Set(selected).size).toBe(22)
      expect(Object.fromEntries(['ARQ', 'DEF', 'MED', 'DEL'].map((position) => [position, game.rounds.filter((round) => round.position === position).length]))).toEqual({ ARQ: 2, DEF: 8, MED: 6, DEL: 6 })
      expect(canFinishRounds(game.rounds, 0, game.teams, catalog)).toBe(true)
      expect(game.drawDiagnostics!.attempts).toBeLessThanOrEqual(48)
      maxAttempts = Math.max(maxAttempts, game.drawDiagnostics!.attempts)
      if (game.drawDiagnostics!.relaxation < 1) relaxed++
      if (weighted && index % 100 === 0) expect(createRecruiterDuel(DRAFT_CATALOG, game.seed, game.drawContext)).toMatchObject({ ok: true, game: { rounds: game.rounds } })
      if (recent.length) {
        overlaps.push(selected.filter((id) => recent.at(-1)!.includes(id)).length)
        recentOverlaps.push(selected.filter((id) => recent.some((prior) => prior.includes(id))).length)
      }
      if (recent.length >= 3) fourWay.push(selected.filter((id) => recent.slice(-3).every((prior) => prior.includes(id))).length)
      for (const id of selected) {
        const player = catalog.get(id)!
        frequencies[id]++
        const tier = Object.entries(TIER_RULES).find(([, rule]) => player.overall_rating >= rule.min && player.overall_rating <= rule.max)![0]
        tiers[tier]++; totalBaseCost += player.price
      }
      recent.push(selected); if (recent.length > 5) recent.shift()
    }
    const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length
    return { draws: 1000, meanAdjacentOverlap: mean(overlaps), adjacentAtLeastFive: overlaps.filter((value) => value >= 5).length, meanLastFiveOverlap: mean(recentOverlaps), fourGameCommonAtLeastFive: fourWay.filter((value) => value >= 5).length, maxFourGameCommon: Math.max(...fourWay), maxAttempts, relaxed, meanBaseCost: totalBaseCost / 1000, tiers, frequencies }
  }
  const before = sample(false); const after = sample(true)
  expect(after.meanAdjacentOverlap).toBeLessThan(before.meanAdjacentOverlap)
  expect(after.meanLastFiveOverlap).toBeLessThan(before.meanLastFiveOverlap)
  expect(Math.min(...Object.values(after.frequencies))).toBeGreaterThan(0)
  const expectedTiersWithoutBudget = Object.fromEntries(Object.entries(TIER_RULES).map(([tier, rule]) => [tier, Object.entries({ ARQ: 2, DEF: 8, MED: 6, DEL: 6 }).reduce((total, [position, quota]) => {
    const players = DRAFT_CATALOG.filter((player) => player.position === position)
    return total + quota * players.filter((player) => player.overall_rating >= rule.min && player.overall_rating <= rule.max).length / players.length
  }, 0)]))
  const report = { seedPattern: '005F-sample-0..999', expectedTiersWithoutBudget, theoreticalUniformPairOverlap: 4 / 18 + 64 / 48 + 36 / 45 + 36 / 39, before, after }
  console.info('CODEX-005F draw diagnostic', JSON.stringify({ ...report, before: { ...before, frequencies: undefined }, after: { ...after, frequencies: undefined } }))
  if (process.env.DRAW_DIAGNOSTICS === '1' && process.env.WRITE_QA === '1') writeFileSync('docs/qa/CODEX-005F-draws.json', JSON.stringify(report, null, 2) + '\n')
}, 30_000)
