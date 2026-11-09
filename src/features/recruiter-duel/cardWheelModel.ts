import type { Player } from '../../types/player'
import { createSeededRandom } from '../local-match/seededRandom'
import { currentRound } from './auctionEngine'
import type { RecruiterDuelGame } from './auctionTypes'

/** Positions on the first wheel; the second one lists names of the winning position. Internal codes, labels are translated. */
export const WHEEL_POSITIONS = ['ARQ', 'DEF', 'MED', 'DEL'] as const
export const WHEEL_NAMES = 8

/** One spin per card: a discard that replaces the card, or the next round, is a new key. */
export const cardWheelKey = (game: RecruiterDuelGame) => `${game.seed}:${game.roundIndex}:${currentRound(game)?.playerId ?? ''}`

/**
 * The card is already fixed by the draw. The wheel only presents it: the real player plus other players of the same position, in a seeded order.
 * Same seed and round always give the same wheel; nothing here reads or spends the game's randomness.
 */
export function wheelNames(catalog: readonly Player[], player: Player, seed: string, roundIndex: number): { readonly names: readonly Player[]; readonly index: number } {
  const random = createSeededRandom(`${seed}:card-wheel:${roundIndex}`)
  const seen = new Set([player.name])
  const pool = catalog.filter((candidate) => candidate.position === player.position && !seen.has(candidate.name) && seen.add(candidate.name))
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]] }
  const names = pool.slice(0, WHEEL_NAMES - 1)
  const index = Math.floor(random() * (names.length + 1))
  names.splice(index, 0, player)
  return { names, index }
}
