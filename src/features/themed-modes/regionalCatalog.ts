import type { Player } from '../../types/player'
import type { ThemedModeId } from './modeTypes'
import { EUROPE_CURRENT_POOL } from '../player-catalog/europeTop150'
import { SOUTH_AMERICA_CURRENT_POOL } from '../player-catalog/southAmericaTop150'
import { EUROPE_LEGENDS_POOL, SOUTH_AMERICA_LEGENDS_POOL } from '../player-catalog/legendTops'

export const REGIONAL_MODE_IDS: readonly ThemedModeId[] = ['SOUTH_AMERICA_CURRENT', 'SOUTH_AMERICA_LEGENDS', 'EUROPE_CURRENT', 'EUROPE_LEGENDS']
const collections: Partial<Record<ThemedModeId, readonly Player[]>> = { /** europe-top-150-v1: the editorial Top 150, not every European national. */ EUROPE_CURRENT: EUROPE_CURRENT_POOL, /** south-america-mexico-top-150-v1: the editorial Top 150, not every Latin American national. */ SOUTH_AMERICA_CURRENT: SOUTH_AMERICA_CURRENT_POOL, /** *-legends-150-v1: editorial Top 150 of historical figures, not a nationality filter. */ SOUTH_AMERICA_LEGENDS: SOUTH_AMERICA_LEGENDS_POOL, EUROPE_LEGENDS: EUROPE_LEGENDS_POOL }
export const regionalPlayersForMode = (id: ThemedModeId) => collections[id]
