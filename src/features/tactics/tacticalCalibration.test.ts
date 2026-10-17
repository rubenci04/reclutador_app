import { writeFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { DRAFT_CATALOG } from '../draft/catalog'
import { STRATEGY_IDS } from './strategies'
import { runTacticalCalibration } from './tacticalCalibration'

const full = process.env.TACTICS_CALIBRATION === 'write'
const options = full
  ? { equivalentTeams: 3, seedsPerEquivalentCell: 500, seedsPerStrengthCell: 1000, poolSize: 40 }
  : { equivalentTeams: 1, seedsPerEquivalentCell: 150, seedsPerStrengthCell: 200, poolSize: 12 }

it('keeps every strategy within bounded, non-dominant balance on equivalent and unequal squads', () => {
  const report = runTacticalCalibration(DRAFT_CATALOG, options)
  if (full) writeFileSync('docs/qa/CODEX-005G-C2-calibration.json', JSON.stringify(report, null, 2) + '\n')
  const margin = full ? .06 : .12
  // No strategy beats or loses to a strategy so reliably that it becomes a guaranteed result.
  expect(report.equivalent.minShare).toBeGreaterThan(.5 - (margin + .24))
  expect(report.equivalent.maxShare).toBeLessThan(.5 + (margin + .24))
  // No strategy dominates the field: average points against all opponents stay near parity.
  for (const id of STRATEGY_IDS) expect(Math.abs(report.equivalent.scores[id] - .5)).toBeLessThan(margin + .05)
  // Swapping sides and tactics keeps the statistics symmetric (sampling noise only).
  expect(report.equivalent.maxSymmetryGap).toBeLessThan(full ? .08 : .16)
  // Identical squads and identical strategy show no order bias.
  const mirror = report.equivalent.neutralMirror
  expect(Math.abs(mirror.wins - mirror.losses) / mirror.matches).toBeLessThan(full ? .06 : .16)
  // A clearly stronger squad keeps a statistical edge whatever either side chooses, and never a certainty.
  expect(report.strength.strongLocal.maxShare).toBeLessThan(.97)
  expect(report.strength.strongLocal.scores.NEUTRAL).toBeGreaterThan(.5)
  for (const id of STRATEGY_IDS) expect(report.strength.strongLocal.scores[id]).toBeGreaterThan(.5)
}, 120_000)
