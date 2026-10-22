import type { Player } from '../../types/player'
import { EUROPEAN_NATIONALITIES, LATIN_AMERICAN_ASSOCIATIONS } from './nationalityRegions'
import type { ThemedModeId } from './modeTypes'
import { ALL_LEGENDS, capCollection } from '../player-catalog/globalCollection'
import { EUROPE_CURRENT_POOL } from '../player-catalog/europeTop150'
import { SOUTH_AMERICA_CURRENT_POOL } from '../player-catalog/southAmericaTop150'

export const REGIONAL_MODE_IDS: readonly ThemedModeId[] = ['SOUTH_AMERICA_CURRENT', 'SOUTH_AMERICA_LEGENDS', 'EUROPE_CURRENT', 'EUROPE_LEGENDS']
const legends = ALL_LEGENDS
const scoped: Partial<Record<ThemedModeId, readonly Player[]>> = {
  SOUTH_AMERICA_LEGENDS: legends.filter((p) => LATIN_AMERICAN_ASSOCIATIONS.has(p.nationality)),
  EUROPE_LEGENDS: legends.filter((p) => EUROPEAN_NATIONALITIES.has(p.nationality)),
}
const collections: Partial<Record<ThemedModeId, readonly Player[]>> = { ...Object.fromEntries(Object.entries(scoped).map(([id, players]) => [id, capCollection(players)])), /** europe-top-150-v1: the editorial Top 150, not every European national. */ EUROPE_CURRENT: EUROPE_CURRENT_POOL, /** south-america-mexico-top-150-v1: the editorial Top 150, not every Latin American national. */ SOUTH_AMERICA_CURRENT: SOUTH_AMERICA_CURRENT_POOL }
export const regionalPlayersForMode = (id: ThemedModeId) => collections[id]
