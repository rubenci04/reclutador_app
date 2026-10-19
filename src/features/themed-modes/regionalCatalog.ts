import type { Player } from '../../types/player'
import { EUROPEAN_NATIONALITIES, LATIN_AMERICAN_ASSOCIATIONS } from './nationalityRegions'
import type { ThemedModeId } from './modeTypes'
import { ALL_CURRENT, ALL_GLOBAL_LEGENDS, capCollection } from '../player-catalog/globalCollection'

export const REGIONAL_MODE_IDS: readonly ThemedModeId[] = ['SOUTH_AMERICA_CURRENT', 'SOUTH_AMERICA_LEGENDS', 'EUROPE_CURRENT', 'EUROPE_LEGENDS']
const current = ALL_CURRENT
const legends = ALL_GLOBAL_LEGENDS
const scoped: Partial<Record<ThemedModeId, readonly Player[]>> = {
  SOUTH_AMERICA_CURRENT: current.filter((p) => LATIN_AMERICAN_ASSOCIATIONS.has(p.nationality)),
  SOUTH_AMERICA_LEGENDS: legends.filter((p) => LATIN_AMERICAN_ASSOCIATIONS.has(p.nationality)),
  EUROPE_CURRENT: current.filter((p) => EUROPEAN_NATIONALITIES.has(p.nationality)),
  EUROPE_LEGENDS: legends.filter((p) => EUROPEAN_NATIONALITIES.has(p.nationality)),
}
const capped = Object.fromEntries(Object.entries(scoped).map(([id, players]) => [id, capCollection(players, id.includes('LEGENDS'))]))
export const regionalPlayersForMode = (id: ThemedModeId) => capped[id]
