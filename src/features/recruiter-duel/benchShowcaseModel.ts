import type { Player } from '../../types/player'
import { createSeededRandom, shuffleSeeded } from '../local-match/seededRandom'
import { benchLimitOf, isShowcaseBench } from './matchConfig'
import { budgetOf } from './auctionEngine'
import type { AuctionTransition, BenchPick, RecruiterDuelGame, RecruiterId, RecruiterTeam } from './auctionTypes'

/**
 * bench-showcase-v1: after the eleven (and the coach) every participant buys up to five optional substitutes from ONE fixed showcase of
 * ten cards: 1 ARQ, 3 DEF, 3 MED and 3 DEL, chosen once from the seed. Nothing is ever added after a purchase: a bought card is SOLD.
 * Turns follow a snake (A-B-B-A-A-B-B-A-A-B); a participant who is finished (five bought, declared done, or nothing affordable) hands
 * the remaining chances to the other. Online keeps the previous contract (bench-5-v1) until a coordinated migration.
 */
export const SHOWCASE_LINES = { ARQ: 1, DEF: 3, MED: 3, DEL: 3 } as const
export const SHOWCASE_SIZE = 10
const SNAKE = [0, 1, 1, 0, 0, 1, 1, 0, 0, 1] as const
const IDS: readonly RecruiterId[] = ['recruiter_one', 'recruiter_two']
const other = (id: RecruiterId): RecruiterId => id === 'recruiter_one' ? 'recruiter_two' : 'recruiter_one'

/** Who takes the first chance: the participant who did NOT open the auction (a small compensation). */
export const showcaseFirst = (game: Pick<RecruiterDuelGame, 'openingOrder'>): RecruiterId => game.openingOrder[0] === 'recruiter_one' ? 'recruiter_two' : 'recruiter_one'

/** Pure function of the seed and of what was auctioned: purchases never change it. Discarded cards come first, then seeded extras nobody won. */
export function benchShowcase(game: RecruiterDuelGame, catalog: readonly Player[]): Player[] {
  const won = new Set(game.record.flatMap((entry) => entry.type === 'award' ? [entry.playerId] : []))
  const byId = new Map(catalog.map((player) => [player.id, player]))
  const random = createSeededRandom(`${game.seed}:bench-showcase-v1`)
  const cards: Player[] = []
  for (const position of ['ARQ', 'DEF', 'MED', 'DEL'] as const) {
    const wanted = SHOWCASE_LINES[position]
    const discarded = game.discardedPlayerIds.flatMap((id) => { const player = byId.get(id); return player && player.position === position && !won.has(id) ? [player] : [] }).slice(0, wanted)
    const used = new Set(discarded.map((player) => player.id))
    const extras = shuffleSeeded(catalog.filter((player) => player.position === position && !won.has(player.id) && !used.has(player.id)).sort((a, b) => a.id.localeCompare(b.id)), random).slice(0, wanted - discarded.length)
    cards.push(...discarded, ...extras)
  }
  return cards
}

const picksOf = (game: RecruiterDuelGame): readonly BenchPick[] => game.benchPicks ?? []
const boughtBy = (game: RecruiterDuelGame, participant: RecruiterId) => picksOf(game).filter((pick) => pick.participant === participant && pick.action === 'BUY').length
export const soldTo = (game: RecruiterDuelGame, playerId: string): RecruiterId | null => picksOf(game).find((pick) => pick.action === 'BUY' && pick.playerId === playerId)?.participant ?? null
const coachesResolved = (game: RecruiterDuelGame) => !game.config?.coaches || IDS.every((id) => game.teams[id].coachId || game.teams[id].coachDeclined)
const left = (game: RecruiterDuelGame, participant: RecruiterId) => budgetOf(game) - game.teams[participant].spent

export function showcaseDone(game: RecruiterDuelGame, participant: RecruiterId, catalog: readonly Player[]): boolean {
  if (boughtBy(game, participant) >= benchLimitOf(game.config) || picksOf(game).some((pick) => pick.participant === participant && pick.action === 'FINISH')) return true
  return !benchShowcase(game, catalog).some((card) => !soldTo(game, card.id) && card.price <= left(game, participant))
}

/** The participant who may decide now, or null when the showcase has not opened yet or is closed. */
export function showcaseTurn(game: RecruiterDuelGame, catalog: readonly Player[]): RecruiterId | null {
  if (!isShowcaseBench(game.config) || game.phase !== 'TEAMS_COMPLETED' || !coachesResolved(game)) return null
  const used = picksOf(game).filter((pick) => pick.action !== 'FINISH').length
  if (used >= SHOWCASE_SIZE) return null
  const nominal = SNAKE[used] === 0 ? showcaseFirst(game) : other(showcaseFirst(game))
  if (!showcaseDone(game, nominal, catalog)) return nominal
  return showcaseDone(game, other(nominal), catalog) ? null : other(nominal)
}
export const showcaseClosed = (game: RecruiterDuelGame, catalog: readonly Player[]) => isShowcaseBench(game.config) && game.phase === 'TEAMS_COMPLETED' && coachesResolved(game) && showcaseTurn(game, catalog) === null
/** Chances consumed so far (a purchase or a pass), out of ten. */
export const showcaseUsed = (game: RecruiterDuelGame) => picksOf(game).filter((pick) => pick.action !== 'FINISH').length

const withPick = (game: RecruiterDuelGame, pick: BenchPick, team?: RecruiterTeam): AuctionTransition => ({ ok: true, game: { ...game, benchPicks: [...picksOf(game), pick], ...(team ? { teams: { ...game.teams, [pick.participant]: team } } : {}) } })

export function buyShowcaseCard(game: RecruiterDuelGame, participant: RecruiterId, playerId: string, catalog: readonly Player[]): AuctionTransition {
  if (showcaseTurn(game, catalog) !== participant) return { ok: false, error: 'not_your_turn' }
  const card = benchShowcase(game, catalog).find((candidate) => candidate.id === playerId)
  if (!card || soldTo(game, card.id) || card.price > left(game, participant)) return { ok: false, error: 'invalid_substitute' }
  const team = game.teams[participant]
  return withPick(game, { participant, action: 'BUY', playerId }, { ...team, bench: [...(team.bench ?? []), { position: card.position, playerId: card.id }], spent: team.spent + card.price })
}
export function passShowcaseTurn(game: RecruiterDuelGame, participant: RecruiterId, catalog: readonly Player[]): AuctionTransition {
  return showcaseTurn(game, catalog) === participant ? withPick(game, { participant, action: 'PASS' }) : { ok: false, error: 'not_your_turn' }
}
/** «I am done»: the remaining chances go to the other participant. Allowed at any time while the showcase is open. */
export function finishShowcase(game: RecruiterDuelGame, participant: RecruiterId, catalog: readonly Player[]): AuctionTransition {
  if (!isShowcaseBench(game.config) || game.phase !== 'TEAMS_COMPLETED' || showcaseDone(game, participant, catalog)) return { ok: false, error: 'invalid_transition' }
  return withPick(game, { participant, action: 'FINISH' })
}

/** The CPU decides only on its own chances: the best rated affordable card, or a pass when none is. Repeats while it is still its turn. Deterministic. */
export function cpuShowcase(game: RecruiterDuelGame, cpu: RecruiterId, catalog: readonly Player[]): RecruiterDuelGame {
  let current = game
  for (let guard = 0; guard < SHOWCASE_SIZE && showcaseTurn(current, catalog) === cpu; guard++) {
    const pick = benchShowcase(current, catalog).filter((card) => !soldTo(current, card.id) && card.price <= left(current, cpu)).sort((a, b) => b.overall_rating - a.overall_rating || a.price - b.price || a.id.localeCompare(b.id))[0]
    const step = pick ? buyShowcaseCard(current, cpu, pick.id, catalog) : passShowcaseTurn(current, cpu, catalog)
    if (!step.ok) break
    current = step.game
  }
  return current
}
