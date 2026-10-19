import { COACH_MAX_PRICE } from '../coaches/coachRules'
import { DRAFT_CATALOG } from '../draft/catalog'
import { createRecruiterDuel } from '../recruiter-duel/auctionEngine'
import type { RecruiterDuelGame, RecruiterId } from '../recruiter-duel/auctionTypes'
import { createDrawContext, newDrawSeed } from '../recruiter-duel/drawHistory'
import { CLASSIC_CONFIG } from '../recruiter-duel/matchConfig'
import type { HistoryEntry, HistoryOutcome } from '../history/matchHistory'
import { resolveSeries } from '../local-match/matchSeries'

export const seatSide = (seat: 1 | 2): RecruiterId => (seat === 1 ? 'recruiter_one' : 'recruiter_two')
export const otherSide = (side: RecruiterId): RecruiterId => (side === 'recruiter_one' ? 'recruiter_two' : 'recruiter_one')

/** The shared state stays small: the 150-player catalogue key of the draw context is the same for everyone. */
export const slimDuel = (game: RecruiterDuelGame): RecruiterDuelGame => ({ ...game, drawContext: undefined, drawDiagnostics: undefined })

/** The host builds the deal once; the seed is random per room and stored with the state. */
export function buildInitialDuel(names: { readonly host: string; readonly guest: string }): RecruiterDuelGame {
  const config = { ...CLASSIC_CONFIG, coaches: true, coachReserve: COACH_MAX_PRICE, names: { recruiter_one: names.host, recruiter_two: names.guest } }
  const created = createRecruiterDuel(DRAFT_CATALOG, newDrawSeed(), createDrawContext(DRAFT_CATALOG, []), config)
  if (!created.ok) throw new Error(created.error)
  return slimDuel({ ...created.game, coachMode: 'GLOBAL_CLASSIC' })
}

/** Structural check of what comes from the server; anything else is treated as "no game yet". */
export function parseDuel(state: unknown): RecruiterDuelGame | null {
  if (!state || typeof state !== 'object' || Array.isArray(state)) return null
  const value = state as Record<string, unknown>
  const teams = value.teams as Record<string, unknown> | undefined
  if (typeof value.phase !== 'string' || typeof value.seed !== 'string' || !Array.isArray(value.rounds) || !Array.isArray(value.record) || !teams || !teams.recruiter_one || !teams.recruiter_two) return null
  return value as unknown as RecruiterDuelGame
}

export const forfeitOf = (state: unknown): RecruiterSideOrNull => {
  const by = state && typeof state === 'object' ? (state as { forfeitBy?: unknown }).forfeitBy : null
  return by === 'recruiter_one' || by === 'recruiter_two' ? by : null
}
type RecruiterSideOrNull = RecruiterId | null

/** History entry from this browser's point of view: recruiter one in the entry is always "me". */
export function onlineHistoryEntry(game: RecruiterDuelGame, mySide: RecruiterId, forfeitBy: RecruiterId | null): HistoryEntry | null {
  const names = { recruiter_one: game.config?.names.recruiter_one ?? '', recruiter_two: game.config?.names.recruiter_two ?? '' }
  const mine = names[mySide] || '—'; const theirs = names[otherSide(mySide)] || '—'
  const mapped = (side: RecruiterId): HistoryOutcome => (side === mySide ? 'recruiter_one' : 'recruiter_two')
  if (forfeitBy) return { id: `online:${game.seed}`, at: new Date().toISOString(), mode: 'GLOBAL_CLASSIC', opponent: 'online', names: { recruiter_one: mine, recruiter_two: theirs }, outcome: mapped(otherSide(forfeitBy)), score: null, abandonedBy: forfeitBy === mySide ? 'recruiter_one' : 'recruiter_two' }
  const played = game.matchResult
  if (!played) return null
  if (played.actionModel === 'action-v1') {
    const series = resolveSeries(played, DRAFT_CATALOG)
    const winningSide = series.winner === 'local' ? 'recruiter_one' : 'recruiter_two'
    const wins = { recruiter_one: series.wins.local, recruiter_two: series.wins.cpu }
    return { id: `online:${game.seed}`, at: new Date().toISOString(), mode: 'GLOBAL_CLASSIC', opponent: 'online', names: { recruiter_one: mine, recruiter_two: theirs }, outcome: mapped(winningSide), score: { recruiter_one: wins[mySide], recruiter_two: wins[otherSide(mySide)] }, abandonedBy: null }
  }
  const outcome: HistoryOutcome = played.winner === 'draw' ? 'draw' : mapped(played.winner === 'local' ? 'recruiter_one' : 'recruiter_two')
  const mineScore = mySide === 'recruiter_one' ? played.score.local : played.score.cpu
  const theirScore = mySide === 'recruiter_one' ? played.score.cpu : played.score.local
  return { id: `online:${game.seed}`, at: new Date().toISOString(), mode: 'GLOBAL_CLASSIC', opponent: 'online', names: { recruiter_one: mine, recruiter_two: theirs }, outcome, score: { recruiter_one: mineScore, recruiter_two: theirScore }, abandonedBy: null }
}
