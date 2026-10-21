import rows from '../../data/league-collections/players.json'
import italianRows from '../../data/league-collections/italy.json'
import mexicanRows from '../../data/league-collections/mexico.json'
import type { Player } from '../../types/player'
import type { Position } from '../../types/football'
import type { ThemedModeId } from '../themed-modes/modeTypes'
import { calculatePlayerPrice } from './calculatePlayerPrice'
import { isDominantFoot } from './dominantFoot'
import { balanceArgentinaCurrent } from './argentinaCurrentBalance'
import { balancedRatings, BALANCED_LEGEND_MODES, isBalancedLegendMode } from './legendBalance'

/** Source OVR is editorial input, not an independently verified current-club claim.
 * The existing economy accepts 75–99. Values below 75 retain their source value
 * in the provenance, and enter gameplay at the floor. Sector profiles are game
 * design estimates by position, not researched individual attributes.
 */
export type LeagueSource = Omit<typeof rows[number], 'sourceUrl'> & { readonly sourceUrl: string | null } & Partial<Pick<typeof italianRows[number], 'abbreviation' | 'sourceNationality' | 'sourceFoot' | 'sourceClassification' | 'sourceClubPeriod' | 'sourceLine' | 'sourceSha256'>>
export const LEAGUE_PROVENANCE: readonly LeagueSource[] = [...rows, ...italianRows, ...mexicanRows]
/** Builds an edition at a given OVR; price and derived ratings always follow the effective OVR. `id` lets a separate edition (e.g. a world edition) reuse the source row. */
function buildPlayer(row: LeagueSource, effectiveRating = row.sourceRating, id = row.id): Player {
  if (!isDominantFoot(row.dominantFoot)) throw new Error(`invalid_imported_dominant_foot:${row.league}:${row.sourceId}`)
  const rating = Math.max(75, Math.min(99, effectiveRating))
  const position = row.position as Position
  const bounded = (offset: number) => Math.max(40, Math.min(99, rating + offset))
  return {
    id, name: row.name, position, category: row.category as Player['category'],
    // A technical era bucket for compatibility, NOT a biographical peak-year claim.
    reference_year: row.category === 'contemporary' ? 2026 : 2000,
    era: row.category === 'contemporary' ? '2020s' : '2000s',
    nationality: row.nationality, club_tag: row.club_tag, overall_rating: rating,
    att_rating: bounded(position === 'DEL' ? 3 : position === 'MED' ? 0 : position === 'DEF' ? -18 : -35),
    def_rating: bounded(position === 'ARQ' ? 3 : position === 'DEF' ? 2 : position === 'MED' ? -8 : -25),
    phy_rating: bounded(-3), men_rating: bounded(-1), price: calculatePlayerPrice(rating),
    dominantFoot: row.dominantFoot,
  }
}
export const LEAGUE_PLAYERS: readonly Player[] = LEAGUE_PROVENANCE.map((row) => buildPlayer(row))

const modes: Partial<Record<ThemedModeId, readonly [string, Player['category']]>> = {
  ARGENTINA_CURRENT: ['ARG', 'contemporary'], ARGENTINA_LEGENDS: ['ARG', 'legend'],
  BRAZIL_CURRENT: ['BRA', 'contemporary'], BRAZIL_LEGENDS: ['BRA', 'legend'],
  SPAIN_LEAGUE: ['ESP', 'contemporary'], SPAIN_LEGENDS: ['ESP', 'legend'],
  ENGLAND_LEAGUE: ['ENG', 'contemporary'], ENGLAND_LEGENDS: ['ENG', 'legend'],
  ITALY_CURRENT: ['ITA', 'contemporary'], ITALY_LEGENDS: ['ITA', 'legend'],
  MEXICO_CURRENT: ['MEX', 'contemporary'], MEXICO_LEGENDS: ['MEX', 'legend'],
}
export const IMPORTED_MODE_IDS = [...Object.keys(modes), 'LEGENDS_ONLY'] as ThemedModeId[]
export const defaultBudgetForMode = (id: ThemedModeId) => id.includes('LEGENDS') || id === 'LEGENDS_ONLY' ? 200 : 150
const sourceById = new Map(LEAGUE_PROVENANCE.map((row) => [row.id, row]))
/** Master sources keep every supplied row (Italy supplies 200 per edition). New games draw only from each league's first ELIGIBLE_TOP_RANK editorial positions. */
export const ELIGIBLE_TOP_RANK = 150
export const isEligibleEdition = (id: string) => (sourceById.get(id)?.sourceRank ?? 0) <= ELIGIBLE_TOP_RANK
/** Eligible catalogue: master rows filtered by sourceRank, never by OVR. */
export const ELIGIBLE_LEAGUE_PLAYERS: readonly Player[] = LEAGUE_PLAYERS.filter((player) => isEligibleEdition(player.id))
const scopedPlayers = new Map(Object.entries(modes).map(([id, scope]) => [id, ELIGIBLE_LEAGUE_PLAYERS.filter((player) => sourceById.get(player.id)!.league === scope[0] && player.category === scope[1])]))
const argentinaCurrent = scopedPlayers.get('ARGENTINA_CURRENT')!.map((player) => balanceArgentinaCurrent(player, sourceById.get(player.id)!.sourceRank))
/** Versioned effective editions of league legends (legend-balance-v1): same ids, new OVR/price/attributes, source rows untouched. */
const balancedLegends = new Map(BALANCED_LEGEND_MODES.map((mode) => {
  const players = scopedPlayers.get(mode)!
  const ratings = balancedRatings(mode, players.map((player) => sourceById.get(player.id)!))
  return [mode, players.map((player) => buildPlayer(sourceById.get(player.id)!, ratings.get(player.id)))] as const
}))
export const BALANCED_LEGEND_EDITIONS = new Map([...balancedLegends.values()].flat().map((player) => [player.id, player]))
/** Stable id of the unbalanced (source-OVR) edition used by Global Legends when a league edition is rebalanced. */
export const worldEditionId = (id: string) => `world_${id}`
export const WORLD_EDITION_PREFIX = 'world_'
export const WORLD_EDITIONS: readonly Player[] = [...BALANCED_LEGEND_EDITIONS.values()].flatMap((balanced) => {
  const row = sourceById.get(balanced.id)!
  const original = LEAGUE_PLAYERS.find((player) => player.id === balanced.id)!
  return original.overall_rating === balanced.overall_rating ? [] : [buildPlayer(row, row.sourceRating, worldEditionId(row.id))]
})
export function importedPlayersForMode(id: ThemedModeId): readonly Player[] | undefined {
  if (id === 'ARGENTINA_CURRENT') return argentinaCurrent
  if (isBalancedLegendMode(id)) return balancedLegends.get(id)
  return scopedPlayers.get(id)
}

export function importedClub(playerId: string): string | undefined {
  return sourceById.get(playerId.replace(/^world_/, ''))?.club
}
