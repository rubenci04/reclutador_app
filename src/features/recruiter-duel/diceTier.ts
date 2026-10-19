import { getPlayerTier } from '../player-catalog/getPlayerTier'

/** S+ is a display tier for the very top ratings; the catalogue itself only defines S to D. */
export const diceTier = (rating: number) => (rating >= 98 ? 'S+' as const : getPlayerTier(rating))
