import type { Player } from '../../types/player'
import { createSeededRandom } from '../local-match/seededRandom'
import { currentRound } from './auctionEngine'
import type { RecruiterDuelGame } from './auctionTypes'

/** Positions on the first wheel; the second one lists names of the winning position. Internal codes, labels are translated. */
export const WHEEL_POSITIONS = ['ARQ', 'DEF', 'MED', 'DEL'] as const
export const WHEEL_NAMES = 8
/** One colour per position, so the position being drawn is recognisable at a glance. */
export const POSITION_COLORS: Readonly<Record<Player['position'], string>> = { ARQ: '#d99a1c', DEF: '#2f7fd1', MED: '#2f9e5b', DEL: '#d6453d' }
/** Segment colours of the wheel of names: varied on purpose, so the wheel never looks like one flat colour. */
export const NAME_COLORS = ['#c0392b', '#d35400', '#b7950b', '#1e8449', '#117a8b', '#1f5fa6', '#6c3fb5', '#a8336f'] as const

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
