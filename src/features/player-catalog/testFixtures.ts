import { CATEGORY_POSITION_QUOTAS, TIER_RULES } from '../../data/catalogRules'
import { POSITIONS, type Position } from '../../types/football'
import { PLAYER_CATEGORIES, PLAYER_TIERS, type Player } from '../../types/player'
import { calculatePlayerPrice } from './calculatePlayerPrice'

// Synthetic test-only records. This file is never imported by the application.
export function syntheticPlayer(index: number, position: Position = 'MED', rating = 75): Player {
  return {
    id: `plr_${String(index + 1).padStart(3, '0')}`, name: `Synthetic Footballer ${index + 1}`,
    position, category: 'contemporary', reference_year: 2018, era: '2010s', nationality: 'ARG', club_tag: 'synthetic_club',
    overall_rating: rating, att_rating: 60, def_rating: 60, phy_rating: 60, men_rating: 60,
    price: calculatePlayerPrice(rating),
  }
}

export function syntheticCatalog(): Player[] {
  const slots = PLAYER_CATEGORIES.flatMap((category) => POSITIONS.flatMap((position) =>
    Array.from({ length: CATEGORY_POSITION_QUOTAS[category][position] }, () => ({ category, position })),
  ))
  const ratings = PLAYER_TIERS.flatMap((tier) => Array<number>(TIER_RULES[tier].count).fill(TIER_RULES[tier].min))
  return slots.map(({ category, position }, index) => ({
    ...syntheticPlayer(index, position, ratings[index]), category,
    reference_year: category === 'contemporary' ? 2018 : 1986,
    era: category === 'contemporary' ? '2010s' : '1980s',
  }))
}

export function syntheticEleven(rating = 75): Player[] {
  const positions: Position[] = ['ARQ', 'DEF', 'DEF', 'DEF', 'DEF', 'MED', 'MED', 'MED', 'DEL', 'DEL', 'DEL']
  return positions.map((position, index) => syntheticPlayer(index, position, rating))
}
