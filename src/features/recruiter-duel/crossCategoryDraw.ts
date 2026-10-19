import { catalogForMode } from '../themed-modes/modeCatalog'
import type { ThemedModeId } from '../themed-modes/modeTypes'
import { generateCpuTeam } from '../local-match/cpuTeam'
import { createSeededRandom } from '../local-match/seededRandom'
import { personKey } from '../player-catalog/globalCollection'
import { coachReserveFor } from '../coaches/coachRules'
import { createRecruiterDuel } from './auctionEngine'
import type { MatchConfig } from './matchConfig'
import type { AuctionCreation } from './auctionTypes'

export function crossCategoryCatalog(first: ThemedModeId, second: ThemedModeId) {
  return [...new Map([...catalogForMode(first), ...catalogForMode(second)].map((p) => [p.id, p])).values()]
}

/** Separate seeded draws: never pretend a shared auction can enforce incompatible pools. */
export function createCrossCategoryDraw(first: ThemedModeId, second: ThemedModeId, seed: string, config: MatchConfig): AuctionCreation {
  const catalog = crossCategoryCatalog(first, second)
  const base = createRecruiterDuel(catalog, seed, undefined, config)
  if (!base.ok) return base
  try {
    const budget = config.budget - (config.coaches ? coachReserveFor(config) : 0)
    const random = createSeededRandom(`${seed}:rarity`)
    const eligible = (mode: ThemedModeId) => catalogForMode(mode).filter((p) => p.overall_rating < 98 || random() < .25)
    const one = generateCpuTeam(eligible(first), `${seed}:one`, budget).team
    const used = new Set(one.players.map(personKey))
    const two = generateCpuTeam(eligible(second).filter((p) => !used.has(personKey(p))), `${seed}:two`, budget).team
    const deals = [one, two].flatMap((team, side) => team.players.map((p) => ({ player: p, winner: side === 0 ? 'recruiter_one' as const : 'recruiter_two' as const })))
    return { ok: true, game: { ...base.game, phase: 'TEAMS_COMPLETED', manualBench: true, categoryPair: { recruiter_one: first, recruiter_two: second },
      rounds: deals.map(({ player }) => ({ position: player.position, playerId: player.id })),
      record: deals.map(({ player, winner }, round) => ({ type: 'award' as const, round, winner, playerId: player.id, price: player.price, reason: 'auto_complete' as const })),
      coachMode: first, teams: { recruiter_one: { lineup: one.lineup, spent: one.spent, bench: [] }, recruiter_two: { lineup: two.lineup, spent: two.spent, bench: [] } } } }
  } catch { return { ok: false, error: 'auction_pool_unavailable' } }
}
