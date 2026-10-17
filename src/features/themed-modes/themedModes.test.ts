import { describe, expect, it } from 'vitest'
import type { Player } from '../../types/player'
import { calculatePlayerPrice } from '../player-catalog/calculatePlayerPrice'
import { DRAFT_SLOTS } from '../draft/draftTypes'
import { evaluateMode, eligiblePlayers } from './filterEngine'
import { validateMetadata, type MetadataIndex } from './metadata'
import { THEMED_MODES } from './modes'

function eleven(): Player[] {
  return DRAFT_SLOTS.map((slot, index) => ({ id: `plr_${String(index + 1).padStart(3, '0')}`, name: `Player ${index}`, position: slot.position, era: '2010s', category: 'contemporary', reference_year: 2018, nationality: 'ARG', club_tag: 'test_club', overall_rating: 80, att_rating: 80, def_rating: 80, phy_rating: 80, men_rating: 80, price: calculatePlayerPrice(80) }))
}
const definition = (id: string) => THEMED_MODES.find((mode) => mode.id === id)!

describe('themed mode foundation', () => {
  it('keeps Global playable and checks a complete affordable XI', () => {
    const result = evaluateMode(eleven(), definition('GLOBAL_CLASSIC'), {})
    expect(result.diagnostic.availability).toBe('available')
    expect(result.diagnostic.minimumCost).toBeLessThanOrEqual(100)
    expect(result.diagnostic.cpuCompatible).toBe(true)
  })
  it('filters nationality from canonical Player data without inferring a league career', () => {
    const players = [...eleven(), { ...eleven()[0], id: 'plr_099', nationality: 'BRA' }]
    expect(eligiblePlayers(players, definition('ARGENTINA_NATIONALITY'), {})).toHaveLength(11)
    const league = evaluateMode(players, definition('ARGENTINA_LEAGUE'), {})
    expect(league.players).toHaveLength(0)
    expect(league.diagnostic.availability).toBe('metadata_pending')
  })
  it('uses only verified league and competition appearances, including their exact edition year', () => {
    const players = eleven()
    const metadata: MetadataIndex = Object.fromEntries(players.map((player) => [player.id, { playerId: player.id, careers: [{ clubId: 'club', leagueId: 'arg_primera', source: { provider: 'editorial', verification: 'verified' } }], competitions: [{ competitionId: 'fifa_world_cup', year: 1986, source: { provider: 'editorial', verification: 'verified' } }] }]))
    expect(evaluateMode(players, definition('ARGENTINA_LEAGUE'), metadata).diagnostic.availability).toBe('available')
    expect(evaluateMode(players, definition('WORLD_CUP_EDITION'), metadata).players).toHaveLength(11)
    const wrongYear: MetadataIndex = { ...metadata, [players[0].id]: { ...metadata[players[0].id]!, competitions: [{ competitionId: 'fifa_world_cup', year: 2022, source: { provider: 'editorial', verification: 'verified' } }] } }
    expect(evaluateMode(players, definition('WORLD_CUP_EDITION'), wrongYear).players).toHaveLength(10)
  })
  it('requires verified career evidence for a European league, never just European nationality', () => {
    const players = eleven().map((player) => ({ ...player, nationality: 'ESP' }))
    expect(eligiblePlayers(players, definition('EUROPEAN_LEAGUE'), {})).toHaveLength(0)
    const metadata: MetadataIndex = { [players[0].id]: { playerId: players[0].id, careers: [{ clubId: 'club', leagueConfederation: 'UEFA', startedYear: 2018, endedYear: 2020, source: { provider: 'editorial', verification: 'verified' } }] } }
    expect(eligiblePlayers(players, definition('EUROPEAN_LEAGUE'), metadata)).toEqual([players[0]])
  })
  it('does not enable a mode with position or economic insufficiency', () => {
    expect(evaluateMode(eleven().filter((player) => player.position !== 'ARQ'), definition('GLOBAL_CLASSIC'), {}).diagnostic.availability).toBe('insufficient_players')
    const expensive = eleven().map((player) => ({ ...player, overall_rating: 99, price: calculatePlayerPrice(99) }))
    expect(evaluateMode(expensive, definition('GLOBAL_CLASSIC'), {}).diagnostic.availability).toBe('over_budget')
  })
  it('validates additive metadata against canonical player IDs while allowing unknown evidence', () => {
    const players = eleven(); const ids = new Set(players.map((player) => player.id))
    expect(validateMetadata({ [players[0].id]: { playerId: players[0].id, careers: [], canonicalExternalIds: [{ provider: 'wikidata', verification: 'unknown' }] } }, ids).valid).toBe(true)
    expect(validateMetadata({ plr_999: { playerId: 'plr_999' } }, ids).valid).toBe(false)
  })
})
