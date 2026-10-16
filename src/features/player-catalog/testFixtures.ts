import { POSITION_QUOTAS, TIER_RULES } from '../../data/catalogRules'
import { POSITIONS, type Position } from '../../types/football'
import { PLAYER_TIERS, type Player } from '../../types/player'
import { calculatePlayerPrice } from './calculatePlayerPrice'

// Synthetic test-only records. This file is never imported by the application.
export function syntheticPlayer(index: number, position: Position = 'MED', rating = 75): Player {
  return {
    id: `plr_${String(index + 1).padStart(3, '0')}`, name: `Synthetic Footballer ${index + 1}`,
    position, era: '1950s', nationality: 'ARG', club_tag: 'synthetic_club',
    overall_rating: rating, att_rating: 60, def_rating: 60, phy_rating: 60, men_rating: 60,
    price: calculatePlayerPrice(rating),
  }
}

export function syntheticCatalog(): Player[] {
  const positions = POSITIONS.flatMap((position) => Array<Position>(POSITION_QUOTAS[position]).fill(position))
  const ratings = PLAYER_TIERS.flatMap((tier) => Array<number>(TIER_RULES[tier].count).fill(TIER_RULES[tier].min))
  return positions.map((position, index) => syntheticPlayer(index, position, ratings[index]))
}

export function syntheticEleven(rating = 75): Player[] {
  const positions: Position[] = ['ARQ', 'DEF', 'DEF', 'DEF', 'DEF', 'MED', 'MED', 'MED', 'DEL', 'DEL', 'DEL']
  return positions.map((position, index) => syntheticPlayer(index, position, rating))
}
