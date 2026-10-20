import { DOMINANT_FEET, type DominantFoot, type Player } from '../../types/player'

export function isDominantFoot(value: unknown): value is DominantFoot {
  return DOMINANT_FEET.some((foot) => foot === value)
}

/** No inference from names, positions, nationality or saved player ids. */
export function dominantFoot(player: Player): DominantFoot {
  return isDominantFoot(player.dominantFoot) ? player.dominantFoot : 'UNKNOWN'
}
