import { writeFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import type { Player } from '../../types/player'
import { DRAFT_CATALOG } from '../draft/catalog'
import { createEmptyLineup } from '../draft/draftModel'
import { DRAFT_SLOTS } from '../draft/draftTypes'
import { MATCH_RULES_VERSION } from './matchTypes'
import { simulateMatch } from './simulator'

/** Synthetic attribute-controlled squads, never inserted into the sporting catalog. */
function fixture(gap: number) {
  const catalog: Player[] = []
  const a = createEmptyLineup(); const b = createEmptyLineup()
  for (const [side, lineup] of [['a', a], ['b', b]] as const) {
    DRAFT_SLOTS.forEach((slot, index) => {
      const extra = side === 'a' ? gap : 0
      const player: Player = { ...DRAFT_CATALOG.find((candidate) => candidate.position === slot.position)!, id: `fixture_${side}_${index}`, name: `Fixture ${side} ${index}`, position: slot.position, price: 4, overall_rating: 80, att_rating: 80 + extra, def_rating: 70 + extra, phy_rating: 75 + extra, men_rating: 75 + extra }
      catalog.push(player); lineup[slot.id] = player.id
    })
  }
  return { catalog, a, b }
}

it('calibrates 1,000 seeds per equivalent, moderate and clear scenario in both orientations', () => {
  const scenarios = []
  for (const gap of [0, 5, 15]) {
    const { catalog, a, b } = fixture(gap)
    const orientations = []
    for (const swapped of [false, true]) {
      let wins = 0; let draws = 0; let losses = 0; let goalsA = 0; let goalsB = 0
      const scorelines: Record<string, number> = {}
      let strengths
      for (let index = 0; index < 1000; index++) {
        const result = simulateMatch({ localLineup: swapped ? b : a, cpuLineup: swapped ? a : b, catalog, catalogVersion: 'catalog_v1', rulesVersion: MATCH_RULES_VERSION, seed: `005G-B-calibration-${index}` })
        const sideA = swapped ? 'cpu' : 'local'; const sideB = swapped ? 'local' : 'cpu'
        const left = result.score[sideA]; const right = result.score[sideB]
        wins += Number(left > right); draws += Number(left === right); losses += Number(left < right)
        goalsA += left; goalsB += right
        const key = `${left}-${right}`; scorelines[key] = (scorelines[key] ?? 0) + 1
        strengths = { a: result.strengths[sideA], b: result.strengths[sideB] }
        for (const side of ['local', 'cpu'] as const) {
          expect(result.blocks.flatMap((block) => block.events).filter((event) => event.type === 'goal' && event.side === side).length).toBe(result.score[side])
        }
      }
      orientations.push({ swapped, matches: 1000, winsA: wins, draws, lossesA: losses, meanGoalsA: goalsA / 1000, meanGoalsB: goalsB / 1000, scorelines, strengths })
    }
    scenarios.push({ attributeGap: gap, orientations })
  }
  const report = { rulesVersion: MATCH_RULES_VERSION, seedPattern: '005G-B-calibration-0..999', fixture: 'synthetic disjoint 4-3-3 squads, rating 80, price 4M each; ATT/DEF/PHY/MEN gaps 0/5/15; no catalog changes', totalMatches: 6000, scenarios }
  const phase = process.env.MATCH_CALIBRATION
  if (phase === 'before' || phase === 'after') {
    if (phase === 'before' && String(MATCH_RULES_VERSION) !== 'local-match-v1') throw new Error('baseline_requires_original_v1_simulator')
    if (process.env.WRITE_QA === '1') writeFileSync(`docs/qa/CODEX-005G-B-${phase}.json`, JSON.stringify(report, null, 2) + '\n')
  }
  expect(scenarios).toHaveLength(3)
  if (String(MATCH_RULES_VERSION) !== 'local-match-v1') {
    for (const scenario of scenarios) {
      expect(Math.abs(scenario.orientations[0].winsA - scenario.orientations[1].winsA)).toBeLessThan(80)
      if (scenario.attributeGap > 0) for (const orientation of scenario.orientations) expect(orientation.winsA).toBeGreaterThan(orientation.lossesA)
    }
  }
}, 30_000)
