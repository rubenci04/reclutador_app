import { writeFileSync } from 'node:fs'
import { describe, it } from 'vitest'
import { CPU_DIFFICULTIES, CPU_STRATEGIES } from './cpuPolicy'
import { HUMANS, measureCell, seedsFor, simulationConfig } from './cpuSimulation'

/**
 * Sprint 1 measurement (opt-in): CPU_MEASURE=<label> writes docs/qa/SPRINT-1-cpu-<label>.json.
 * CPU_QUICK=1 uses 30 seeds per cell and CPU_OUT redirects the file, for fast iteration.
 */
describe.skipIf(!process.env.CPU_MEASURE)('sprint 1 CPU measurement', () => {
  it('measures every human policy against the nine CPU profiles', () => {
    const cells = []
    for (const human of HUMANS) for (const difficulty of CPU_DIFFICULTIES) for (const strategy of CPU_STRATEGIES) cells.push(measureCell(difficulty, strategy, human, seedsFor(difficulty, strategy)))
    writeFileSync(process.env.CPU_OUT ?? `docs/qa/SPRINT-1-cpu-${process.env.CPU_MEASURE}.json`, JSON.stringify({ mode: 'GLOBAL_CLASSIC', budget: simulationConfig.budget, humans: HUMANS, cells }, null, 2) + '\n')
  }, 1_800_000)
})
