import { expect, it } from 'vitest'
import { DRAFT_CATALOG } from '../draft/catalog'
import { generateCpuTeam } from '../local-match/cpuTeam'
import { tacticalFeatures } from './tacticalModel'
import { selectCpuStrategy, strategyFit } from './cpuStrategy'

it('hard CPU consistently chooses one of the best fits without seeing the human strategy', () => {
  const lineup = generateCpuTeam(DRAFT_CATALOG, 'hard-fit').team.lineup
  const fits = strategyFit(tacticalFeatures(lineup, DRAFT_CATALOG))
  const best = Math.max(...Object.values(fits))
  for (let i = 0; i < 100; i++) {
    const seed = `hard:${i}`
    const choice = selectCpuStrategy(lineup, DRAFT_CATALOG, seed, 'HARD')
    expect(fits[choice]).toBeGreaterThanOrEqual(best - .015)
    expect(selectCpuStrategy(lineup, DRAFT_CATALOG, seed, 'HARD')).toBe(choice)
  }
})
