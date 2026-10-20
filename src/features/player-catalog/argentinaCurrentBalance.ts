import type { Player } from '../../types/player'
import { calculatePlayerPrice } from './calculatePlayerPrice'

/** Editorial game balance, not a correction of the supplied factual provenance.
 * Only the Argentina current edition uses it. Existing sourceRank breaks the
 * source's 74/75 plateau into documented bands; explicit user choices override it.
 */
export const ARGENTINA_CURRENT_RATINGS: Readonly<Record<string, number>> = {
  import_arg_act_002: 85, import_arg_act_001: 84,
  import_arg_act_005: 83, import_arg_act_006: 80,
  import_arg_act_018: 80, import_arg_act_031: 81,
  import_arg_act_070: 80, import_arg_act_089: 82, import_arg_act_111: 80,
}

export function balanceArgentinaCurrent(player: Player, sourceRank: number): Player {
  const rating = ARGENTINA_CURRENT_RATINGS[player.id] ?? 75 + Math.floor((150 - sourceRank) / 20)
  const delta = rating - player.overall_rating
  const shift = (value: number) => Math.max(40, Math.min(99, value + delta))
  return { ...player, overall_rating: rating, att_rating: shift(player.att_rating), def_rating: shift(player.def_rating), phy_rating: shift(player.phy_rating), men_rating: shift(player.men_rating), price: calculatePlayerPrice(rating) }
}
