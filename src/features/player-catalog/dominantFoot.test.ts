import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import input from '../../../docs/reclutador_pie_dominante_1200_importacion.json'
import baseline from '../../../docs/qa/DATA-FOOT-001-baseline.json'
import { DOMINANT_FEET, type Player } from '../../types/player'
import { dominantFoot } from './dominantFoot'
import { LEAGUE_PLAYERS, LEAGUE_PROVENANCE, IMPORTED_MODE_IDS } from './leagueCollections'
import { catalogForMode } from '../themed-modes/modeCatalog'
import { validatePlayer } from './validatePlayer'
import { ROLE_PROFILES } from '../tactics/roleProfiles'
import { simulateMatch } from '../local-match/simulator'
import { MATCH_RULES_VERSION } from '../local-match/matchTypes'
import type { ThemedModeId } from '../themed-modes/modeTypes'
import { DRAFT_SLOTS, type DraftLineup } from '../draft/draftTypes'

const stripFoot = (value: unknown) => JSON.stringify(value, (key, value: unknown) => key === 'dominantFoot' ? undefined : value)
const hash = (value: unknown) => createHash('sha256').update(stripFoot(value)).digest('hex')
const key = (row: { league: string; sourceId: string }) => JSON.stringify([row.league, row.sourceId])

describe('DATA-FOOT-001 metadata import', () => {
  it('matches exactly 1,200 unique origin keys and original labels without name matching', () => {
    expect(input.records).toHaveLength(1200)
    expect(LEAGUE_PROVENANCE).toHaveLength(1200)
    const sources = new Map(LEAGUE_PROVENANCE.map((row) => [key(row), row]))
    expect(sources.size).toBe(1200)
    expect(new Set(input.records.map(key)).size).toBe(1200)
    const labels: Record<string, string> = { Diestro: 'RIGHT', Zurdo: 'LEFT', Ambidiestro: 'BOTH', 'Sin información': 'UNKNOWN' }
    for (const record of input.records) {
      const source = sources.get(key(record))!
      expect(source, key(record)).toBeDefined()
      expect(source.dominantFoot).toBe(labels[record.dominantFootOriginal])
      expect(source.dominantFoot).toBe(record.dominantFoot)
      expect(source.fullName).toBe(record.fullName)
      expect(source.sourceRating).toBe(record.sourceRating)
      expect(LEAGUE_PLAYERS.find((player) => player.id === source.id)?.dominantFoot).toBe(record.dominantFoot)
    }
    expect(Object.fromEntries(DOMINANT_FEET.map((foot) => [foot, LEAGUE_PLAYERS.filter((p) => p.dominantFoot === foot).length]))).toEqual({ RIGHT: 914, LEFT: 275, BOTH: 11, UNKNOWN: 0 })
    for (const league of ['ARG', 'ENG', 'BRA', 'ESP']) expect(LEAGUE_PROVENANCE.filter((p) => p.league === league)).toHaveLength(300)
  })

  it('preserves every original field, including id, OVR, price, position and source codes', () => {
    expect(hash(LEAGUE_PROVENANCE)).toBe(baseline.provenanceHash)
    expect(hash(LEAGUE_PLAYERS)).toBe(baseline.playersHash)
    const lowRatings = LEAGUE_PROVENANCE.filter((p) => p.sourceRating < 75)
    expect(lowRatings).toHaveLength(87)
    for (const row of lowRatings) expect(LEAGUE_PLAYERS.find((p) => p.id === row.id)?.overall_rating).toBe(75)
    expect(ROLE_PROFILES).toEqual({})
  })

  it('accepts omitted legacy metadata and all canonical values, rejects invalid supplied data', () => {
    const { dominantFoot: _foot, ...legacy } = LEAGUE_PLAYERS[0]
    expect(_foot).toBe('LEFT')
    expect(validatePlayer(legacy, [legacy.id]).valid).toBe(true)
    expect(dominantFoot(legacy)).toBe('UNKNOWN')
    expect(dominantFoot({ ...legacy, dominantFoot: 'UNKNOWN' })).toBe('UNKNOWN')
    for (const foot of DOMINANT_FEET) expect(validatePlayer({ ...legacy, dominantFoot: foot }, [legacy.id]).valid).toBe(true)
    for (const foot of [null, '', 'right', 'Diestro', 1, {}, []]) {
      expect(validatePlayer({ ...legacy, dominantFoot: foot }, [legacy.id])).toMatchObject({ valid: false, issues: [{ code: 'invalid_dominant_foot', field: 'dominantFoot' }] })
    }
    const restored: Player = JSON.parse(JSON.stringify(legacy)) as Player
    expect(restored).toEqual(legacy)
    expect(validatePlayer(restored, [legacy.id]).valid).toBe(true)
  })

  it.each(['GLOBAL_CLASSIC', ...IMPORTED_MODE_IDS] as const)('carries imported metadata through %s without inferring legacy editions', (mode) => {
    const catalog = catalogForMode(mode)
    const imported = new Map(LEAGUE_PLAYERS.map((p) => [p.id, p]))
    expect(catalog.some((p) => imported.has(p.id))).toBe(true)
    for (const player of catalog) {
      const source = imported.get(player.id)
      expect(dominantFoot(player)).toBe(source?.dominantFoot ?? 'UNKNOWN')
    }
  })

  it('reproduces 240 pre-change full simulation results across Global, leagues and four engines', () => {
    const fixtures = new Map<string, { catalog: readonly Player[]; localLineup: DraftLineup; cpuLineup: DraftLineup }>()
    for (const sample of baseline.simulations) {
      let fixture = fixtures.get(sample.mode)
      if (!fixture) {
        // This fixture measures DATA-FOOT-001 against its original source balance.
        // The later, explicit Argentina editorial edition is tested separately.
        const catalog = sample.mode === 'ARGENTINA_CURRENT'
          ? LEAGUE_PLAYERS.filter((p) => p.id.startsWith('import_arg_') && p.category === 'contemporary')
          : catalogForMode(sample.mode as ThemedModeId)
        const used = new Set<string>()
        const lineup = () => Object.fromEntries(DRAFT_SLOTS.map((slot) => {
          const player = catalog.filter((p) => p.position === slot.position && !used.has(p.id)).sort((a, b) => a.price - b.price || a.id.localeCompare(b.id))[0]
          used.add(player.id)
          return [slot.id, player.id]
        })) as DraftLineup
        fixture = { catalog, localLineup: lineup(), cpuLineup: lineup() }
        fixtures.set(sample.mode, fixture)
      }
      const actionModel = sample.actionModel as 'action-v1' | 'action-v2' | 'action-v3' | null
      const simulate = (catalog: readonly Player[]) => simulateMatch({ ...fixture, catalog, budget: 150, catalogVersion: 'catalog_v1', rulesVersion: MATCH_RULES_VERSION, seed: sample.seed, actionModel: actionModel ?? undefined, rosterBonus: true })
      expect(hash(simulate(fixture.catalog)), `${sample.mode}/${sample.actionModel}/${sample.seed}`).toBe(sample.hash)
      // Every canonical value, including UNKNOWN, has no effect on events or RNG.
      for (const foot of DOMINANT_FEET) expect(hash(simulate(fixture.catalog.map((p) => ({ ...p, dominantFoot: foot }))))).toBe(sample.hash)
    }
    expect(baseline.simulations).toHaveLength(240)
  })
})
