import { DRAFT_CATALOG } from '../draft/catalog'
import { ARG_RECORDS } from '../player-catalog/argentinaBatches'
import type { Player } from '../../types/player'
import { eligiblePlayers } from './filterEngine'
import { EMPTY_METADATA, type MetadataIndex } from './metadata'
import { THEMED_MODES } from './modes'
import type { ThemedModeId } from './modeTypes'
import { importedPlayersForMode, IMPORTED_MODE_IDS } from '../player-catalog/leagueCollections'
import { regionalPlayersForMode, REGIONAL_MODE_IDS } from './regionalCatalog'
import { GLOBAL_CURRENT, GLOBAL_LEGENDS } from '../player-catalog/globalCollection'

/** Modes a player can actually start. The rest of the list stays a foundation ("coming soon"). */
export const PLAYABLE_MODES: ReadonlySet<ThemedModeId> = new Set<ThemedModeId>(['GLOBAL_CLASSIC', 'ARGENTINA_CLUBS', ...IMPORTED_MODE_IDS, ...REGIONAL_MODE_IDS])

/** Plain Player records of the Argentine collection (arg_* ids): no extra fields travel into a game. */
export const ARGENTINA_PLAYERS: readonly Player[] = ARG_RECORDS.map((record) => ({
  id: record.id, name: record.name, position: record.position, era: record.era, category: record.category, reference_year: record.reference_year, nationality: record.nationality,
  club_tag: record.club_tag, overall_rating: record.overall_rating, att_rating: record.att_rating, def_rating: record.def_rating, phy_rating: record.phy_rating, men_rating: record.men_rating, price: record.price,
}))

/** Verified careers in Argentina, taken from each record; nothing is inferred from nationality. */
export const ARGENTINA_METADATA: MetadataIndex = Object.fromEntries(ARG_RECORDS.map((record) => [record.id, { playerId: record.id, careers: record.careers }]))

export interface ModeCatalog { readonly players: readonly Player[]; readonly metadata: MetadataIndex; /** Ids the validator accepts; undefined means catalog_v1 (plr_*). */ readonly allowedIds?: readonly string[] }

/** Source players and evidence for a mode; the engine then plays with the eligible subset. */
export function modeSource(id: ThemedModeId): ModeCatalog {
  if (id === 'GLOBAL_CLASSIC' || id === 'LEGENDS_ONLY') { const players = id === 'GLOBAL_CLASSIC' ? GLOBAL_CURRENT : GLOBAL_LEGENDS; return { players, metadata: EMPTY_METADATA, allowedIds: players.map((p) => p.id) } }
  const imported = importedPlayersForMode(id) ?? regionalPlayersForMode(id)
  if (imported) return { players: imported, metadata: EMPTY_METADATA, allowedIds: imported.map((player) => player.id) }
  return id === 'ARGENTINA_CLUBS' || id === 'ARGENTINA_LEGENDS' || id === 'ARGENTINA_CURRENT' ? { players: ARGENTINA_PLAYERS, metadata: ARGENTINA_METADATA, allowedIds: ARGENTINA_PLAYERS.map((player) => player.id) } : { players: DRAFT_CATALOG, metadata: EMPTY_METADATA }
}

/** Eligible category pool; deterministic draws select their own cards independently of pool size. */
export function catalogForMode(id: ThemedModeId): readonly Player[] {
  if (id === 'GLOBAL_CLASSIC') return GLOBAL_CURRENT
  if (id === 'LEGENDS_ONLY') return GLOBAL_LEGENDS
  const imported = importedPlayersForMode(id) ?? regionalPlayersForMode(id)
  if (imported) return imported
  const definition = THEMED_MODES.find((mode) => mode.id === id)
  if (!definition || !PLAYABLE_MODES.has(id)) return DRAFT_CATALOG
  const source = modeSource(id)
  return eligiblePlayers(source.players, definition, source.metadata)
}
