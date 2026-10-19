import { describe, expect, it } from 'vitest'
import { DRAFT_CATALOG } from '../draft/catalog'
import { generateCpuTeam } from './cpuTeam'
import { MATCH_RULES_VERSION } from './matchTypes'
import { simulateMatch } from './simulator'
import { changeSeriesFormation, nextSeriesMatch, seriesSetup } from './matchSeries'

const localLineup = generateCpuTeam(DRAFT_CATALOG, 'prep-local').team.lineup
const cpuLineup = generateCpuTeam(DRAFT_CATALOG, 'prep-cpu').team.lineup
const outside = DRAFT_CATALOG.filter((p) => ![...Object.values(localLineup), ...Object.values(cpuLineup)].includes(p.id))
const bench = [outside.find((p) => p.position === 'MED')!.id, outside.find((p) => p.position === 'DEF')!.id, outside.find((p) => p.position === 'DEL')!.id]
const first = simulateMatch({ benches: { local: bench, cpu: [] }, localLineup, cpuLineup, catalog: DRAFT_CATALOG, catalogVersion: 'catalog_v1', rulesVersion: MATCH_RULES_VERSION, seed: 'prep', actionModel: 'action-v3', seriesFormat: 'home-away', rosterBonus: true, formations: { local: '4-3-3', cpu: '4-3-3' }, tactics: { version: 'tactics-v1', local: 'NEUTRAL', cpu: 'NEUTRAL' } })

describe('series setup between games', () => {
  it('reads the previous setup and, unchanged, reproduces the old behaviour', () => {
    const setup = seriesSetup(first)
    expect(setup.tactics).toEqual({ local: 'NEUTRAL', cpu: 'NEUTRAL' })
    expect(nextSeriesMatch(first, 2, DRAFT_CATALOG, setup)).toEqual(nextSeriesMatch(first, 2, DRAFT_CATALOG))
  })
  it('changes formation with the same players and plays the next game with the new formation and strategy', () => {
    const changed = changeSeriesFormation(seriesSetup(first), 'local', '4-4-2', DRAFT_CATALOG)
    expect(changed).not.toBeNull()
    expect(changed?.formations).toEqual({ local: '4-4-2', cpu: '4-3-3' })
    const all = (ids: readonly (string | null)[]) => new Set(ids)
    expect(all([...Object.values(changed!.lineups.local), ...changed!.benches!.local])).toEqual(all([...Object.values(localLineup), ...bench]))
    expect(changed!.lineups.cpu).toEqual(cpuLineup)
    const next = nextSeriesMatch(first, 2, DRAFT_CATALOG, { ...changed!, tactics: { local: 'COUNTER_ATTACK', cpu: 'NEUTRAL' } })
    expect(next.formations?.local).toBe('4-4-2')
    expect(next.tactics?.selection.local).toBe('COUNTER_ATTACK')
  })
  it('refuses a formation the roster cannot fill', () => {
    expect(changeSeriesFormation(seriesSetup(first), 'cpu', '4-4-2', DRAFT_CATALOG)).toBeNull()
  })
})
